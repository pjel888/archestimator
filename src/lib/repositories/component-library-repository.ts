import { randomUUID } from "node:crypto";

import type { EstimateRowItem, EstimateRowItemSource, EstimateTreeNode } from "@/lib/estimates/types";
import { estimateTemplates, type EstimateTemplate } from "@/lib/component-library/estimate-templates";
import {
  buildComponentCategoryTreeFromRows,
  componentCategoryTree,
  componentCategoryTaxonomyVersion,
  findComponentCategoryPath,
  type ComponentLibraryCategoryRow,
  type ComponentLibraryTaxonomyNode,
} from "@/lib/component-library/taxonomy";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { Json, Tables, TablesInsert } from "@/lib/supabase/types";
import { isMissingRelationError } from "./estimate-schema-compat";
import { ensureDefaultWorkspace } from "./workspace-repository";

export type ComponentLibrarySupplier = Pick<Tables<"component_suppliers">, "id" | "name" | "normalized_name" | "sort_order">;
export type ComponentLibraryFolder = Pick<
  Tables<"library_folders">,
  "id" | "workspace_id" | "parent_id" | "name" | "sort_order" | "source_category_node_id" | "folder_kind"
>;

export type ComponentLibraryDataset = {
  categoryTree: ComponentLibraryTaxonomyNode[];
  suppliers: ComponentLibrarySupplier[];
  libraryFolders: ComponentLibraryFolder[];
  libraryItems: EstimateRowItem[];
  templates: EstimateTemplate[];
};

type EstimateTemplateRow = Tables<"estimate_templates">;
type EstimateTemplateNodeRow = Tables<"estimate_template_nodes">;
type EstimateTemplateRowItemRow = Tables<"estimate_template_row_items">;

type BuildEstimateTemplatesInput = {
  templates: EstimateTemplateRow[];
  nodes: EstimateTemplateNodeRow[];
  rowItems: EstimateTemplateRowItemRow[];
};

function readMetadataRecord(metadata: Json): Record<string, Json> {
  if (!metadata || typeof metadata !== "object" || Array.isArray(metadata)) return {};
  return metadata as Record<string, Json>;
}

function readString(value: Json | undefined): string | undefined {
  return typeof value === "string" && value.trim() ? value : undefined;
}

function readStringArray(value: Json | undefined): string[] | undefined {
  if (!Array.isArray(value)) return undefined;
  const strings = value.filter((entry): entry is string => typeof entry === "string" && entry.trim().length > 0);
  return strings.length ? strings : undefined;
}

function readSource(value: Json | undefined): EstimateRowItemSource {
  if (value === "project" || value === "supplier" || value === "library") return value;
  return "library";
}

function readOptionalSource(value: Json | undefined): EstimateRowItemSource | undefined {
  if (value === "project" || value === "supplier" || value === "library") return value;
  return undefined;
}

function formatPeso(value: number) {
  return new Intl.NumberFormat("en-PH", { style: "currency", currency: "PHP", minimumFractionDigits: 2 }).format(value);
}

function normalizeComponentLibraryItem(
  row: Tables<"cost_library_items">,
  categoryById: Map<string, ComponentLibraryTaxonomyNode>,
  supplierById: Map<string, ComponentLibrarySupplier>,
  categoryTree: ComponentLibraryTaxonomyNode[],
): EstimateRowItem {
  const metadata = readMetadataRecord(row.metadata);
  const categoryNode = row.category_node_id ? categoryById.get(row.category_node_id) : undefined;
  const supplier = row.supplier_id ? supplierById.get(row.supplier_id) : undefined;
  const itemCost = Number(row.unit_cost);
  const miscCost = Number(row.misc_cost);
  const pricingDate = row.pricing_date ?? row.created_at.slice(0, 10);

  return {
    id: row.id,
    material: row.name,
    name: row.name,
    description: row.description,
    supplier: supplier?.name ?? row.supplier ?? "",
    supplierId: row.supplier_id ?? undefined,
    source: readSource(metadata.source),
    unit: row.unit,
    itemCost,
    price: itemCost,
    currency: "PHP",
    quantity: 1,
    subTotal: itemCost,
    miscCost,
    miscCostDefault: miscCost,
    totalItemCosts: itemCost + miscCost,
    imageUrl: row.thumbnail_path ?? readString(metadata.imageUrl),
    category: categoryNode?.label ?? row.category,
    categoryNodeId: row.category_node_id ?? undefined,
    categoryPath: row.category_node_id ? findComponentCategoryPath(categoryTree, row.category_node_id) ?? undefined : undefined,
    libraryFolderId: row.library_folder_id ?? undefined,
    discipline: readString(metadata.discipline),
    designation: readString(metadata.designation),
    tags: readStringArray(metadata.tags),
    sku: row.sku ?? undefined,
    sourceUrl: readString(metadata.sourceUrl),
    notes: readString(metadata.notes),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    pricingSource: row.pricing_source ?? supplier?.name ?? "Component library",
    pricingDate,
    confidence: row.confidence ?? undefined,
    isCustom: metadata.isCustom === true || metadata.source === "project" || metadata.folderKind === "custom",
  };
}

function flattenCategoryTree(nodes: ComponentLibraryTaxonomyNode[]): ComponentLibraryTaxonomyNode[] {
  return nodes.flatMap((node) => [node, ...flattenCategoryTree(node.children ?? [])]);
}

function compareSortOrder(a: { sort_order: number; id: string }, b: { sort_order: number; id: string }) {
  if (a.sort_order !== b.sort_order) return a.sort_order - b.sort_order;
  return a.id.localeCompare(b.id);
}

function sortFolders(folders: ComponentLibraryFolder[]): ComponentLibraryFolder[] {
  return [...folders].sort((left, right) => {
    const leftParent = left.parent_id ?? "";
    const rightParent = right.parent_id ?? "";
    return leftParent.localeCompare(rightParent) || left.sort_order - right.sort_order || left.name.localeCompare(right.name);
  });
}

async function fetchLibraryFolders(
  supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>,
  workspaceId: string,
): Promise<ComponentLibraryFolder[]> {
  const { data, error } = await supabase
    .from("library_folders")
    .select("id, workspace_id, parent_id, name, sort_order, source_category_node_id, folder_kind")
    .eq("workspace_id", workspaceId)
    .order("sort_order", { ascending: true })
    .order("name", { ascending: true });

  if (error) throw error;
  return sortFolders(data ?? []);
}

export async function ensureWorkspaceLibraryFolders({
  supabase,
  workspaceId,
  categoryRows,
}: {
  supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>;
  workspaceId: string;
  categoryRows: ComponentLibraryCategoryRow[];
}): Promise<ComponentLibraryFolder[]> {
  const existingFolders = await fetchLibraryFolders(supabase, workspaceId);
  if (existingFolders.length > 0) return existingFolders;

  const rowsByParentId = new Map<string | null, ComponentLibraryCategoryRow[]>();
  for (const row of categoryRows) {
    const siblings = rowsByParentId.get(row.parent_id) ?? [];
    siblings.push(row);
    rowsByParentId.set(row.parent_id, siblings);
  }
  for (const siblings of rowsByParentId.values()) {
    siblings.sort((left, right) => left.sort_order - right.sort_order || left.label.localeCompare(right.label));
  }

  const folderIdByCategoryNodeId = new Map<string, string>();
  const inserts: TablesInsert<"library_folders">[] = [];

  function stage(parentCategoryNodeId: string | null, parentFolderId: string | null) {
    for (const row of rowsByParentId.get(parentCategoryNodeId) ?? []) {
      const folderId = randomUUID();
      folderIdByCategoryNodeId.set(row.id, folderId);
      inserts.push({
        id: folderId,
        workspace_id: workspaceId,
        parent_id: parentFolderId,
        name: row.label,
        sort_order: row.sort_order,
        source_category_node_id: row.id,
        folder_kind: "taxonomy",
      });
      stage(row.id, folderId);
    }
  }

  stage(null, null);
  if (inserts.length === 0) return [];

  const { error } = await supabase.from("library_folders").insert(inserts);
  if (error) throw error;

  return fetchLibraryFolders(supabase, workspaceId);
}

function getTemplateNodeKind(kind: EstimateTemplateNodeRow["kind"]): EstimateTreeNode["kind"] | null {
  if (kind === "group" || kind === "area") return kind;
  return null;
}

function normalizeTemplateRowItem(row: EstimateTemplateRowItemRow): EstimateRowItem {
  const sourceSnapshot = readMetadataRecord(row.source_snapshot ?? null);
  const metadata = readMetadataRecord(row.metadata);
  const quantity = Number(row.quantity);
  const itemCost = Number(row.unit_cost);
  const miscCost = Number(row.misc_cost);
  const source = readOptionalSource(sourceSnapshot.source) ?? readOptionalSource(metadata.source) ?? (row.source_library_item_id ? "library" : "project");
  const categoryNodeId = row.category_node_id ?? readString(sourceSnapshot.categoryNodeId);
  const supplierId = row.supplier_id ?? readString(sourceSnapshot.supplierId);

  return {
    id: row.id,
    material: row.material,
    name: row.material,
    description: row.description,
    supplier: row.supplier || "No supplier",
    supplierId: supplierId ?? undefined,
    source,
    unit: row.unit,
    itemCost,
    price: itemCost,
    currency: readString(sourceSnapshot.currency) ?? "PHP",
    quantity,
    subTotal: itemCost * quantity,
    miscCost,
    miscCostDefault: miscCost,
    totalItemCosts: itemCost * quantity + miscCost,
    imageUrl: readString(sourceSnapshot.imageUrl),
    category: readString(sourceSnapshot.category) ?? "General",
    categoryNodeId: categoryNodeId ?? undefined,
    discipline: row.discipline || readString(sourceSnapshot.discipline),
    designation: row.designation || readString(sourceSnapshot.designation),
    tags: readStringArray(metadata.tags) ?? readStringArray(sourceSnapshot.tags),
    sku: readString(sourceSnapshot.sku),
    sourceUrl: readString(sourceSnapshot.sourceUrl),
    sourceLibraryItemId: row.source_library_item_id,
    notes: readString(sourceSnapshot.notes),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    pricingSource: readString(sourceSnapshot.pricingSource) ?? "Template snapshot",
    pricingDate: readString(sourceSnapshot.pricingDate) ?? row.created_at.slice(0, 10),
    confidence: readString(sourceSnapshot.confidence),
  };
}

function setTemplateNodeTotals(node: EstimateTreeNode): number {
  const rowTotal = (node.estimateRowItems ?? []).reduce((sum, row) => sum + row.totalItemCosts, 0);
  const childTotal = (node.children ?? []).reduce((sum, child) => sum + setTemplateNodeTotals(child), 0);
  const total = rowTotal + childTotal;
  node.total = formatPeso(total);
  return total;
}

export function buildEstimateTemplatesFromRows(input: BuildEstimateTemplatesInput): EstimateTemplate[] {
  const rowsByNode = new Map<string, EstimateRowItem[]>();
  for (const row of [...input.rowItems].sort(compareSortOrder)) {
    const rows = rowsByNode.get(row.template_node_id) ?? [];
    rows.push(normalizeTemplateRowItem(row));
    rowsByNode.set(row.template_node_id, rows);
  }

  const nodeRowsByTemplate = new Map<string, EstimateTemplateNodeRow[]>();
  for (const node of [...input.nodes].sort(compareSortOrder)) {
    const nodes = nodeRowsByTemplate.get(node.template_id) ?? [];
    nodes.push(node);
    nodeRowsByTemplate.set(node.template_id, nodes);
  }

  return [...input.templates]
    .sort(compareSortOrder)
    .map((template) => {
      const nodeRows = nodeRowsByTemplate.get(template.id) ?? [];
      const nodeMap = new Map<string, EstimateTreeNode>();

      for (const nodeRow of nodeRows) {
        const kind = getTemplateNodeKind(nodeRow.kind);
        if (!kind) continue;

        nodeMap.set(nodeRow.id, {
          id: nodeRow.id,
          name: nodeRow.name,
          kind,
          total: formatPeso(0),
          children: [],
          estimateRowItems: rowsByNode.get(nodeRow.id) ?? [],
        });
      }

      const roots: EstimateTreeNode[] = [];
      for (const nodeRow of nodeRows) {
        const node = nodeMap.get(nodeRow.id);
        if (!node) continue;

        const parent = nodeRow.parent_id ? nodeMap.get(nodeRow.parent_id) : null;
        if (parent) {
          parent.children = [...(parent.children ?? []), node];
        } else {
          roots.push(node);
        }
      }

      roots.forEach(setTemplateNodeTotals);

      return {
        id: template.id,
        name: template.name,
        description: template.description,
        category: template.category,
        nodes: roots,
      };
    });
}

export function getTemplateTableFallbackTemplates({ isTemplateTableMissing }: { isTemplateTableMissing: boolean }): EstimateTemplate[] {
  return isTemplateTableMissing ? estimateTemplates : [];
}

export async function getCurrentWorkspaceComponentLibrary(): Promise<ComponentLibraryDataset> {
  const { workspace } = await ensureDefaultWorkspace();
  const supabase = await createSupabaseServerClient();

  const [categoriesResult, suppliersResult, itemsResult, templatesResult] = await Promise.all([
    supabase.from("component_category_nodes").select("*").order("sort_order", { ascending: true }),
    supabase
      .from("component_suppliers")
      .select("id, name, normalized_name, sort_order")
      .eq("workspace_id", workspace.id)
      .order("sort_order", { ascending: true })
      .order("name", { ascending: true }),
    supabase
      .from("cost_library_items")
      .select("*")
      .eq("workspace_id", workspace.id)
      .order("category", { ascending: true })
      .order("name", { ascending: true }),
    supabase
      .from("estimate_templates")
      .select("*")
      .eq("workspace_id", workspace.id)
      .order("sort_order", { ascending: true })
      .order("name", { ascending: true }),
  ]);

  if (categoriesResult.error) throw categoriesResult.error;
  if (suppliersResult.error) throw suppliersResult.error;
  if (itemsResult.error) throw itemsResult.error;
  if (templatesResult.error && !isMissingRelationError(templatesResult.error, "estimate_templates")) throw templatesResult.error;

  const categoryRows = (categoriesResult.data ?? []) as ComponentLibraryCategoryRow[];
  const categoryTree = buildComponentCategoryTreeFromRows(categoryRows);
  const libraryFolders = await ensureWorkspaceLibraryFolders({ supabase, workspaceId: workspace.id, categoryRows });
  const suppliers = suppliersResult.data ?? [];
  const categoryById = new Map(flattenCategoryTree(categoryTree).map((node) => [node.id, node]));
  const supplierById = new Map(suppliers.map((supplier) => [supplier.id, supplier]));
  const libraryItems = (itemsResult.data ?? []).map((row) => normalizeComponentLibraryItem(row, categoryById, supplierById, categoryTree));
  const persistedTemplateRows = templatesResult.error ? [] : (templatesResult.data ?? []);
  let libraryTemplates = getTemplateTableFallbackTemplates({ isTemplateTableMissing: Boolean(templatesResult.error) });

  if (persistedTemplateRows.length > 0) {
    const templateIds = persistedTemplateRows.map((template) => template.id);
    const [templateNodesResult, templateRowItemsResult] = await Promise.all([
      supabase
        .from("estimate_template_nodes")
        .select("*")
        .in("template_id", templateIds)
        .order("sort_order", { ascending: true }),
      supabase
        .from("estimate_template_row_items")
        .select("*")
        .in("template_id", templateIds)
        .order("sort_order", { ascending: true }),
    ]);

    if (templateNodesResult.error) throw templateNodesResult.error;
    if (templateRowItemsResult.error) throw templateRowItemsResult.error;

    libraryTemplates = buildEstimateTemplatesFromRows({
      templates: persistedTemplateRows,
      nodes: templateNodesResult.data ?? [],
      rowItems: templateRowItemsResult.data ?? [],
    });
  }

  return {
    categoryTree,
    suppliers,
    libraryFolders,
    libraryItems,
    templates: libraryTemplates,
  };
}

export const fallbackComponentLibraryDataset: ComponentLibraryDataset = {
  categoryTree: componentCategoryTree,
  suppliers: [],
  libraryFolders: [],
  libraryItems: [],
  templates: [],
};

export const componentLibraryDatasetVersion = componentCategoryTaxonomyVersion;
