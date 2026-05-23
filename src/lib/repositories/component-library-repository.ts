import { randomUUID } from "node:crypto";

import type {
  ComponentHistoryEntry,
  ComponentPriceOption,
  EstimateRowItem,
  EstimateRowItemSource,
  EstimateTreeNode,
} from "@/lib/estimates/types";
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

export type ComponentRowsLibraryDataset = Omit<ComponentLibraryDataset, "templates">;

type EstimateTemplateRow = Tables<"estimate_templates">;
type EstimateTemplateNodeRow = Tables<"estimate_template_nodes">;
type EstimateTemplateRowItemRow = Tables<"estimate_template_row_items">;
type ComponentPriceOptionRow = Tables<"cost_library_item_price_options">;
type ComponentVersionRow = Tables<"cost_library_item_versions">;
type ComponentPriceHistoryRow = Tables<"cost_library_item_price_history">;
type ComponentStateHistoryRow = Tables<"cost_library_item_state_history">;

type BuildEstimateTemplatesInput = {
  templates: EstimateTemplateRow[];
  nodes: EstimateTemplateNodeRow[];
  rowItems: EstimateTemplateRowItemRow[];
};

type ComponentLibraryRepositoryClient = Awaited<ReturnType<typeof createSupabaseServerClient>>;

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

function readNumber(value: Json | undefined): number | undefined {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim()) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : undefined;
  }
  return undefined;
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
  priceOptions: ComponentPriceOption[] = [],
  history: ComponentHistoryEntry[] = [],
  latestVersion?: ComponentVersionRow,
): EstimateRowItem {
  const metadata = readMetadataRecord(row.metadata);
  const categoryNode = row.category_node_id ? categoryById.get(row.category_node_id) : undefined;
  const supplier = row.supplier_id ? supplierById.get(row.supplier_id) : undefined;
  const defaultPriceOption = priceOptions.find((option) => option.isDefault && option.isActive) ?? priceOptions.find((option) => option.isActive);
  const itemCost = Number(defaultPriceOption?.unitCost ?? row.unit_cost);
  const miscCost = Number(defaultPriceOption?.miscCost ?? row.misc_cost);
  const unit = defaultPriceOption?.unit ?? row.unit;
  const pricingDate = defaultPriceOption?.pricingDate ?? row.pricing_date ?? row.created_at.slice(0, 10);
  const pricingSource = defaultPriceOption?.pricingSource ?? row.pricing_source ?? supplier?.name ?? "Component library";

  return {
    id: row.id,
    material: row.name,
    name: row.name,
    description: row.description,
    supplier: supplier?.name ?? row.supplier ?? "",
    supplierId: row.supplier_id ?? undefined,
    source: readSource(metadata.source),
    unit,
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
    sourceLibraryItemId: row.id,
    componentVersionId: latestVersion?.id ?? undefined,
    componentVersionNumber: row.current_version_number,
    priceOptionId: defaultPriceOption?.id ?? row.active_price_option_id ?? undefined,
    priceOptionLabel: defaultPriceOption?.label,
    priceOptions,
    lifecycleState: row.lifecycle_state,
    lifecycleStateChangedAt: row.lifecycle_state_changed_at,
    history,
    notes: readString(metadata.notes),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    pricingSource,
    pricingDate,
    confidence: defaultPriceOption?.confidence ?? row.confidence ?? undefined,
    isCustom: metadata.isCustom === true || metadata.source === "project" || metadata.folderKind === "custom",
  };
}

function normalizePriceOption(row: ComponentPriceOptionRow): ComponentPriceOption {
  return {
    id: row.id,
    label: row.label,
    unit: row.unit,
    unitCost: Number(row.unit_cost),
    miscCost: Number(row.misc_cost),
    currency: row.currency,
    pricingSource: row.pricing_source,
    pricingDate: row.pricing_date,
    confidence: row.confidence,
    sourceUrl: row.source_url,
    notes: row.notes,
    supplierId: row.supplier_id,
    isActive: row.is_active,
    isDefault: row.is_default,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function normalizeVersionHistory(row: ComponentVersionRow): ComponentHistoryEntry {
  return {
    id: row.id,
    type: "version",
    label: `v${row.version_number}`,
    summary: row.change_summary || "Component version recorded",
    effectiveAt: row.effective_at,
    createdAt: row.created_at,
    versionNumber: row.version_number,
  };
}

function normalizePriceHistory(row: ComponentPriceHistoryRow): ComponentHistoryEntry {
  const newSnapshot = readMetadataRecord(row.new_snapshot);
  const label = readString(newSnapshot.label) ?? "Price option";
  const unitCost = readNumber(newSnapshot.unitCost);
  const miscCost = readNumber(newSnapshot.miscCost);
  const priceText = unitCost === undefined ? "" : ` (${formatPeso(unitCost + (miscCost ?? 0))})`;
  return {
    id: row.id,
    type: "price",
    label,
    summary: `Price option changed${priceText}`,
    effectiveAt: row.effective_at,
    createdAt: row.created_at,
  };
}

function normalizeStateHistory(row: ComponentStateHistoryRow): ComponentHistoryEntry {
  const fromState = row.from_state ? row.from_state.replaceAll("_", " ") : "created";
  const toState = row.to_state.replaceAll("_", " ");
  return {
    id: row.id,
    type: "state",
    label: "State",
    summary: `${fromState} -> ${toState}`,
    effectiveAt: row.effective_at,
    createdAt: row.created_at,
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
    componentVersionId: readString(sourceSnapshot.componentVersionId),
    componentVersionNumber: readNumber(sourceSnapshot.componentVersionNumber),
    priceOptionId: readString(sourceSnapshot.priceOptionId),
    priceOptionLabel: readString(sourceSnapshot.priceOptionLabel),
    lifecycleState: readString(sourceSnapshot.lifecycleState) as EstimateRowItem["lifecycleState"],
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

async function loadCurrentWorkspaceComponentRowsLibrary({
  supabase,
  workspaceId,
}: {
  supabase: ComponentLibraryRepositoryClient;
  workspaceId: string;
}): Promise<ComponentRowsLibraryDataset> {
  const [categoriesResult, suppliersResult, itemsResult] = await Promise.all([
    supabase.from("component_category_nodes").select("*").order("sort_order", { ascending: true }),
    supabase
      .from("component_suppliers")
      .select("id, name, normalized_name, sort_order")
      .eq("workspace_id", workspaceId)
      .order("sort_order", { ascending: true })
      .order("name", { ascending: true }),
    supabase
      .from("cost_library_items")
      .select("*")
      .eq("workspace_id", workspaceId)
      .order("category", { ascending: true })
      .order("name", { ascending: true }),
  ]);

  if (categoriesResult.error) throw categoriesResult.error;
  if (suppliersResult.error) throw suppliersResult.error;
  if (itemsResult.error) throw itemsResult.error;

  const categoryRows = (categoriesResult.data ?? []) as ComponentLibraryCategoryRow[];
  const categoryTree = buildComponentCategoryTreeFromRows(categoryRows);
  const libraryFolders = await ensureWorkspaceLibraryFolders({ supabase, workspaceId, categoryRows });
  const suppliers = suppliersResult.data ?? [];
  const itemRows = itemsResult.data ?? [];
  const itemIds = itemRows.map((row) => row.id);
  const [priceOptionsResult, versionsResult, priceHistoryResult, stateHistoryResult] = itemIds.length > 0
    ? await Promise.all([
        supabase
          .from("cost_library_item_price_options")
          .select("*")
          .eq("workspace_id", workspaceId)
          .in("item_id", itemIds)
          .order("is_default", { ascending: false })
          .order("created_at", { ascending: true }),
        supabase
          .from("cost_library_item_versions")
          .select("*")
          .eq("workspace_id", workspaceId)
          .in("item_id", itemIds)
          .order("version_number", { ascending: false }),
        supabase
          .from("cost_library_item_price_history")
          .select("*")
          .eq("workspace_id", workspaceId)
          .in("item_id", itemIds)
          .order("effective_at", { ascending: false }),
        supabase
          .from("cost_library_item_state_history")
          .select("*")
          .eq("workspace_id", workspaceId)
          .in("item_id", itemIds)
          .order("effective_at", { ascending: false }),
      ])
    : [
        { data: [], error: null },
        { data: [], error: null },
        { data: [], error: null },
        { data: [], error: null },
      ];

  if (priceOptionsResult.error && !isMissingRelationError(priceOptionsResult.error, "cost_library_item_price_options")) throw priceOptionsResult.error;
  if (versionsResult.error && !isMissingRelationError(versionsResult.error, "cost_library_item_versions")) throw versionsResult.error;
  if (priceHistoryResult.error && !isMissingRelationError(priceHistoryResult.error, "cost_library_item_price_history")) throw priceHistoryResult.error;
  if (stateHistoryResult.error && !isMissingRelationError(stateHistoryResult.error, "cost_library_item_state_history")) throw stateHistoryResult.error;

  const priceOptionsByItemId = new Map<string, ComponentPriceOption[]>();
  for (const row of (priceOptionsResult.error ? [] : (priceOptionsResult.data ?? [])) as ComponentPriceOptionRow[]) {
    const options = priceOptionsByItemId.get(row.item_id) ?? [];
    options.push(normalizePriceOption(row));
    priceOptionsByItemId.set(row.item_id, options);
  }

  const versionsByItemId = new Map<string, ComponentVersionRow[]>();
  for (const row of (versionsResult.error ? [] : (versionsResult.data ?? [])) as ComponentVersionRow[]) {
    const versions = versionsByItemId.get(row.item_id) ?? [];
    versions.push(row);
    versionsByItemId.set(row.item_id, versions);
  }

  const historyByItemId = new Map<string, ComponentHistoryEntry[]>();
  function addHistory(itemId: string, entry: ComponentHistoryEntry) {
    const entries = historyByItemId.get(itemId) ?? [];
    entries.push(entry);
    historyByItemId.set(itemId, entries);
  }
  for (const row of (versionsResult.error ? [] : (versionsResult.data ?? [])) as ComponentVersionRow[]) {
    addHistory(row.item_id, normalizeVersionHistory(row));
  }
  for (const row of (priceHistoryResult.error ? [] : (priceHistoryResult.data ?? [])) as ComponentPriceHistoryRow[]) {
    addHistory(row.item_id, normalizePriceHistory(row));
  }
  for (const row of (stateHistoryResult.error ? [] : (stateHistoryResult.data ?? [])) as ComponentStateHistoryRow[]) {
    addHistory(row.item_id, normalizeStateHistory(row));
  }

  const categoryById = new Map(flattenCategoryTree(categoryTree).map((node) => [node.id, node]));
  const supplierById = new Map(suppliers.map((supplier) => [supplier.id, supplier]));
  const libraryItems = itemRows.map((row) => {
    const history = [...(historyByItemId.get(row.id) ?? [])].sort((left, right) => (
      right.effectiveAt.localeCompare(left.effectiveAt) || right.createdAt.localeCompare(left.createdAt)
    ));
    return normalizeComponentLibraryItem(
      row,
      categoryById,
      supplierById,
      categoryTree,
      priceOptionsByItemId.get(row.id) ?? [],
      history,
      versionsByItemId.get(row.id)?.[0],
    );
  });

  return {
    categoryTree,
    suppliers,
    libraryFolders,
    libraryItems,
  };
}

async function loadCurrentWorkspaceEstimateTemplates({
  supabase,
  workspaceId,
}: {
  supabase: ComponentLibraryRepositoryClient;
  workspaceId: string;
}): Promise<EstimateTemplate[]> {
  const templatesResult = await supabase
    .from("estimate_templates")
    .select("*")
    .eq("workspace_id", workspaceId)
    .order("sort_order", { ascending: true })
    .order("name", { ascending: true });

  if (templatesResult.error && !isMissingRelationError(templatesResult.error, "estimate_templates")) throw templatesResult.error;

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

  return libraryTemplates;
}

export async function getCurrentWorkspaceComponentRowsLibrary(): Promise<ComponentRowsLibraryDataset> {
  const { workspace } = await ensureDefaultWorkspace();
  const supabase = await createSupabaseServerClient();
  return loadCurrentWorkspaceComponentRowsLibrary({ supabase, workspaceId: workspace.id });
}

export async function getCurrentWorkspaceEstimateTemplates(): Promise<EstimateTemplate[]> {
  const { workspace } = await ensureDefaultWorkspace();
  const supabase = await createSupabaseServerClient();
  return loadCurrentWorkspaceEstimateTemplates({ supabase, workspaceId: workspace.id });
}

export async function getCurrentWorkspaceComponentLibrary(): Promise<ComponentLibraryDataset> {
  const { workspace } = await ensureDefaultWorkspace();
  const supabase = await createSupabaseServerClient();
  const [componentRows, templates] = await Promise.all([
    loadCurrentWorkspaceComponentRowsLibrary({ supabase, workspaceId: workspace.id }),
    loadCurrentWorkspaceEstimateTemplates({ supabase, workspaceId: workspace.id }),
  ]);

  return {
    ...componentRows,
    templates,
  };
}

export const fallbackComponentRowsLibraryDataset: ComponentRowsLibraryDataset = {
  categoryTree: componentCategoryTree,
  suppliers: [],
  libraryFolders: [],
  libraryItems: [],
};

export const fallbackComponentLibraryDataset: ComponentLibraryDataset = {
  ...fallbackComponentRowsLibraryDataset,
  templates: [],
};

export const componentLibraryDatasetVersion = componentCategoryTaxonomyVersion;
