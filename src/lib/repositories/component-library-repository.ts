import type {
  ComponentHistoryEntry,
  ComponentPriceOption,
  ComponentVariantAttachment,
  ComponentVariantCostEntry,
  EstimateRowItem,
  EstimateRowItemSource,
  EstimateTreeNode,
} from "@/lib/estimates/types";
import {
  estimateTemplates,
  summarizeEstimateTemplate,
  type EstimateTemplate,
} from "@/lib/component-library/estimate-templates";
import { getTemplateSourceTrustChips, type SourceTrustChipSpec } from "@/components/workshop/library/source-trust-model";
import { sanitizeComponentSourceUrl } from "@/lib/component-library/source-url";
import {
  buildComponentCategoryTreeFromRows,
  componentCategoryTree,
  componentCategoryTaxonomyVersion,
  findComponentCategoryPath,
  type ComponentLibraryCategoryRow,
  type ComponentLibraryTaxonomyNode,
} from "@/lib/component-library/taxonomy";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { Json, Tables } from "@/lib/supabase/types";
import { isUuid } from "@/lib/ids";
import type { LibraryFolderKind } from "@/lib/component-library/library-folder-reorder";
import { isMissingRelationError } from "./estimate-schema-compat";
import { ensureDefaultWorkspace } from "./workspace-repository";

export type ComponentLibrarySupplier = Pick<Tables<"component_suppliers">, "id" | "name" | "normalized_name" | "sort_order">;
export type ComponentLibraryBrand = Pick<Tables<"component_brands">, "id" | "name" | "normalized_name" | "sort_order">;
export type ComponentLibraryFolder = Pick<
  Tables<"library_folders">,
  "id" | "workspace_id" | "parent_id" | "name" | "sort_order" | "source_category_node_id" | "folder_kind"
> & {
  folder_kind: LibraryFolderKind;
};

export type ComponentLibraryDataset = {
  categoryTree: ComponentLibraryTaxonomyNode[];
  suppliers: ComponentLibrarySupplier[];
  brands: ComponentLibraryBrand[];
  libraryFolders: ComponentLibraryFolder[];
  libraryItems: EstimateRowItem[];
  templates: EstimateTemplate[];
};

export type ComponentRowsLibraryDataset = Omit<ComponentLibraryDataset, "templates"> & {
  workspaceId: string;
};

type EstimateTemplateRow = Tables<"estimate_templates">;
type EstimateTemplateNodeRow = Tables<"estimate_template_nodes">;
type EstimateTemplateRowItemRow = Tables<"estimate_template_row_items">;
type CostLibraryItemRow = Tables<"cost_library_items">;
type ComponentPriceOptionRow = Tables<"cost_library_item_price_options">;
type ComponentVersionRow = Tables<"cost_library_item_versions">;
type ComponentPriceHistoryRow = Tables<"cost_library_item_price_history">;
type ComponentStateHistoryRow = Tables<"cost_library_item_state_history">;
type ComponentVariantCostEntryRow = Tables<"cost_library_item_variant_cost_entries">;
type ComponentVariantAttachmentRow = Tables<"cost_library_item_variant_attachments">;
type ComponentLibraryChunkedResult<T> = {
  data: T[];
  error: { code?: string | null; message?: string | null } | null;
};

type BuildEstimateTemplatesInput = {
  templates: EstimateTemplateRow[];
  nodes: EstimateTemplateNodeRow[];
  rowItems: EstimateTemplateRowItemRow[];
};

type ComponentLibraryRepositoryClient = Awaited<ReturnType<typeof createSupabaseServerClient>>;

const COMPONENT_LIBRARY_ITEMS_QUERY_PAGE_SIZE = 1000;
export const SIDEBAR_COMPONENT_LIBRARY_DEFAULT_LIMIT = 50;
export const SIDEBAR_COMPONENT_LIBRARY_MAX_LIMIT = 100;
export const SIDEBAR_COMPONENT_LIBRARY_ITEM_COLUMNS =
  "id, workspace_id, name, description, supplier, supplier_id, brand, brand_id, category, category_node_id, library_folder_id, unit, unit_cost, misc_cost, pricing_source, pricing_date, confidence, metadata, thumbnail_path, active_price_option_id, current_version_number, lifecycle_state, lifecycle_state_changed_at, created_at, updated_at";

type ComponentRowsLibraryLoadOptions = {
  includeDetailGraph?: boolean;
  itemLimit?: number;
};

function readMetadataRecord(metadata: Json): Record<string, Json> {
  if (!metadata || typeof metadata !== "object" || Array.isArray(metadata)) return {};
  return metadata as Record<string, Json>;
}

function readString(value: Json | undefined): string | undefined {
  return typeof value === "string" && value.trim() ? value : undefined;
}

async function collectComponentLibraryWorkspaceRowsForItems<T extends { item_id: string }>(
  itemIds: string[],
  loadPage: (from: number, to: number) => PromiseLike<{ data: T[] | null; error: { code?: string | null; message?: string | null } | null }>,
): Promise<ComponentLibraryChunkedResult<T>> {
  const data: T[] = [];
  const itemIdSet = new Set(itemIds);

  for (let from = 0;; from += COMPONENT_LIBRARY_ITEMS_QUERY_PAGE_SIZE) {
    const to = from + COMPONENT_LIBRARY_ITEMS_QUERY_PAGE_SIZE - 1;
    const result = await loadPage(from, to);
    if (result.error) return { data: [], error: result.error };

    const pageRows = result.data ?? [];
    data.push(...pageRows.filter((row) => itemIdSet.has(row.item_id)));
    if (pageRows.length < COMPONENT_LIBRARY_ITEMS_QUERY_PAGE_SIZE) return { data, error: null };
  }
}

async function collectComponentLibraryRowsForSelectedItems<T>(
  itemIds: string[],
  loadRows: (itemIds: string[]) => PromiseLike<{ data: T[] | null; error: { code?: string | null; message?: string | null } | null }>,
): Promise<ComponentLibraryChunkedResult<T>> {
  if (itemIds.length === 0) return { data: [], error: null };

  const result = await loadRows(itemIds);
  if (result.error) return { data: [], error: result.error };
  return { data: result.data ?? [], error: null };
}

function normalizeComponentLibraryItemLimit(limit: number | undefined): number | undefined {
  if (limit === undefined) return undefined;
  if (!Number.isFinite(limit)) return SIDEBAR_COMPONENT_LIBRARY_DEFAULT_LIMIT;
  return Math.max(1, Math.min(SIDEBAR_COMPONENT_LIBRARY_MAX_LIMIT, Math.floor(limit)));
}

async function loadWorkspaceCostLibraryItemRows({
  supabase,
  workspaceId,
  itemLimit,
}: {
  supabase: ComponentLibraryRepositoryClient;
  workspaceId: string;
  itemLimit?: number;
}): Promise<CostLibraryItemRow[]> {
  const limit = normalizeComponentLibraryItemLimit(itemLimit);
  if (limit !== undefined) {
    const result = await supabase
      .from("cost_library_items")
      .select(SIDEBAR_COMPONENT_LIBRARY_ITEM_COLUMNS)
      .eq("workspace_id", workspaceId)
      .neq("lifecycle_state", "archived")
      .order("updated_at", { ascending: false })
      .order("id", { ascending: true })
      .limit(limit);

    if (result.error) throw result.error;
    return (result.data ?? []) as CostLibraryItemRow[];
  }

  const rows: CostLibraryItemRow[] = [];

  for (let from = 0;; from += COMPONENT_LIBRARY_ITEMS_QUERY_PAGE_SIZE) {
    const to = from + COMPONENT_LIBRARY_ITEMS_QUERY_PAGE_SIZE - 1;
    const result = await supabase
      .from("cost_library_items")
      .select("*")
      .eq("workspace_id", workspaceId)
      .neq("lifecycle_state", "archived")
      .order("category", { ascending: true })
      .order("name", { ascending: true })
      .range(from, to);

    if (result.error) throw result.error;

    const pageRows = (result.data ?? []) as CostLibraryItemRow[];
    rows.push(...pageRows);
    if (pageRows.length < COMPONENT_LIBRARY_ITEMS_QUERY_PAGE_SIZE) return rows;
  }
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

function normalizeLibraryName(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, " ").replace(/\s+/g, " ").trim();
}

function formatPeso(value: number) {
  return new Intl.NumberFormat("en-PH", { style: "currency", currency: "PHP", minimumFractionDigits: 2 }).format(value);
}

function normalizeComponentLibraryItem(
  row: Tables<"cost_library_items">,
  categoryById: Map<string, ComponentLibraryTaxonomyNode>,
  supplierById: Map<string, ComponentLibrarySupplier>,
  brandById: Map<string, ComponentLibraryBrand>,
  categoryTree: ComponentLibraryTaxonomyNode[],
  priceOptions: ComponentPriceOption[] = [],
  history: ComponentHistoryEntry[] = [],
  latestVersion?: ComponentVersionRow,
): EstimateRowItem {
  const metadata = readMetadataRecord(row.metadata);
  const categoryNode = row.category_node_id ? categoryById.get(row.category_node_id) : undefined;
  const supplier = row.supplier_id ? supplierById.get(row.supplier_id) : undefined;
  const brand = row.brand_id ? brandById.get(row.brand_id) : undefined;
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
    contingencyPercentage: 0,
    contingencyValue: 0,
    miscCost,
    miscCostDefault: miscCost,
    totalItemCosts: itemCost + miscCost,
    imageUrl: defaultPriceOption?.thumbnailPath ?? row.thumbnail_path ?? readString(metadata.imageUrl),
    category: categoryNode?.label ?? row.category,
    categoryNodeId: row.category_node_id ?? undefined,
    categoryPath: row.category_node_id ? findComponentCategoryPath(categoryTree, row.category_node_id) ?? undefined : undefined,
    libraryFolderId: row.library_folder_id ?? undefined,
    brand: brand?.name ?? row.brand ?? undefined,
    brandId: row.brand_id ?? undefined,
    discipline: readString(metadata.discipline),
    designation: readString(metadata.designation),
    tags: readStringArray(metadata.tags),
    sku: defaultPriceOption?.sku ?? undefined,
    sourceUrl: sanitizeComponentSourceUrl(readString(metadata.sourceUrl)) ?? undefined,
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

function normalizeCostEntry(row: ComponentVariantCostEntryRow): ComponentVariantCostEntry {
  return {
    id: row.id,
    unitCost: Number(row.unit_cost),
    miscCost: Number(row.misc_cost),
    currency: row.currency,
    pricingSource: row.pricing_source,
    pricingDate: row.pricing_date,
    confidence: row.confidence,
    sourceUrl: sanitizeComponentSourceUrl(row.source_url) ?? null,
    notes: row.notes,
    isCurrent: row.is_current,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function normalizeAttachment(row: ComponentVariantAttachmentRow): ComponentVariantAttachment {
  return {
    id: row.id,
    bucket: row.storage_bucket,
    path: row.storage_path,
    fileName: row.file_name,
    contentType: row.content_type,
    sizeBytes: Number(row.size_bytes),
    kind: row.attachment_kind === "pdf" ? "pdf" : "excel",
    metadata: row.metadata,
    createdAt: row.created_at,
  };
}

function normalizePriceOption(
  row: ComponentPriceOptionRow,
  costEntries: ComponentVariantCostEntry[] = [],
  attachments: ComponentVariantAttachment[] = [],
): ComponentPriceOption {
  const currentCostEntry = costEntries.find((entry) => entry.isCurrent) ?? costEntries[0];
  return {
    id: row.id,
    label: row.label,
    sku: row.sku,
    variantDescription: row.variant_description,
    variantSortOrder: row.variant_sort_order,
    unit: row.unit,
    unitCost: Number(currentCostEntry?.unitCost ?? row.unit_cost),
    miscCost: Number(currentCostEntry?.miscCost ?? row.misc_cost),
    currency: row.currency,
    pricingSource: currentCostEntry?.pricingSource ?? row.pricing_source,
    pricingDate: currentCostEntry?.pricingDate ?? row.pricing_date,
    confidence: currentCostEntry?.confidence ?? row.confidence,
    sourceUrl: sanitizeComponentSourceUrl(currentCostEntry?.sourceUrl ?? row.source_url) ?? null,
    notes: currentCostEntry?.notes ?? row.notes,
    supplierId: row.supplier_id,
    activeCostEntryId: row.active_cost_entry_id,
    costEntries,
    packageQuantity: row.package_quantity === null ? null : Number(row.package_quantity),
    packageUnit: row.package_unit,
    dimensionLength: row.dimension_length === null ? null : Number(row.dimension_length),
    dimensionWidth: row.dimension_width === null ? null : Number(row.dimension_width),
    dimensionHeight: row.dimension_height === null ? null : Number(row.dimension_height),
    dimensionUnit: row.dimension_unit,
    mass: row.mass === null ? null : Number(row.mass),
    massUnit: row.mass_unit,
    imageBucket: row.image_bucket,
    imagePath: row.image_path,
    thumbnailPath: row.thumbnail_path,
    imageMetadata: row.image_metadata,
    attachments,
    variantMetadata: row.variant_metadata,
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

function normalizeComponentLibraryFolder(folder: Pick<
  Tables<"library_folders">,
  "id" | "workspace_id" | "parent_id" | "name" | "sort_order" | "source_category_node_id" | "folder_kind"
>): ComponentLibraryFolder {
  return {
    ...folder,
    folder_kind: folder.folder_kind === "taxonomy" ? "taxonomy" : "custom",
  };
}

async function fetchLibraryFolders(
  supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>,
  workspaceId: string,
): Promise<ComponentLibraryFolder[]> {
  const { data, error } = await supabase
    .from("library_folders")
    .select("id, workspace_id, parent_id, name, sort_order, source_category_node_id, folder_kind")
    .eq("workspace_id", workspaceId)
    .eq("folder_kind", "custom")
    .order("sort_order", { ascending: true })
    .order("name", { ascending: true });

  if (error) throw error;
  return sortFolders((data ?? []).map(normalizeComponentLibraryFolder));
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
  const contingencyPercentage = Number(row.contingency_percentage ?? 0);
  const miscCost = Number(row.misc_cost);
  const subTotal = itemCost * quantity;
  const contingencyValue = (subTotal * contingencyPercentage) / 100;
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
    subTotal,
    contingencyPercentage,
    contingencyValue,
    miscCost,
    miscCostDefault: miscCost,
    totalItemCosts: subTotal + miscCost + contingencyValue,
    imageUrl: readString(sourceSnapshot.imageUrl),
    category: readString(sourceSnapshot.category) ?? "General",
    categoryNodeId: categoryNodeId ?? undefined,
    discipline: row.discipline || readString(sourceSnapshot.discipline),
    designation: row.designation || readString(sourceSnapshot.designation),
    tags: readStringArray(metadata.tags) ?? readStringArray(sourceSnapshot.tags),
    sku: readString(sourceSnapshot.sku),
    sourceUrl: sanitizeComponentSourceUrl(readString(sourceSnapshot.sourceUrl)) ?? undefined,
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
        workspaceId: template.workspace_id,
        name: template.name,
        description: template.description,
        category: template.category,
        nodes: roots,
        updatedAt: template.updated_at,
        sortOrder: template.sort_order,
      };
    });
}

export function getTemplateTableFallbackTemplates({ isTemplateTableMissing }: { isTemplateTableMissing: boolean }): EstimateTemplate[] {
  return isTemplateTableMissing ? estimateTemplates : [];
}

async function loadCurrentWorkspaceComponentRowsLibrary({
  supabase,
  workspaceId,
  includeDetailGraph = true,
  itemLimit,
}: {
  supabase: ComponentLibraryRepositoryClient;
  workspaceId: string;
  // U18: the in-estimate panel renders only the slim EstimateRowItem fields and
  // never reads the per-item versions / price history / state history /
  // attachments. When false, those 4 audit/attachment queries are skipped
  // (the bulk of the cold-load waterfall + the unbounded-growth tables). The
  // cost-determining price-options + cost-entries queries are still loaded so
  // the panel cost stays byte-identical to the full loader. The Library
  // management surfaces pass true for the complete graph.
  includeDetailGraph?: boolean;
  itemLimit?: number;
}): Promise<ComponentRowsLibraryDataset> {
  const boundedItemLimit = normalizeComponentLibraryItemLimit(itemLimit);
  const [categoriesResult, suppliersResult, brandsResult, itemRows] = await Promise.all([
    supabase.from("component_category_nodes").select("*").order("sort_order", { ascending: true }),
    supabase
      .from("component_suppliers")
      .select("id, name, normalized_name, sort_order")
      .eq("workspace_id", workspaceId)
      .order("sort_order", { ascending: true })
      .order("name", { ascending: true }),
    supabase
      .from("component_brands")
      .select("id, name, normalized_name, sort_order")
      .eq("workspace_id", workspaceId)
      .order("sort_order", { ascending: true })
      .order("name", { ascending: true }),
    loadWorkspaceCostLibraryItemRows({ supabase, workspaceId, itemLimit: boundedItemLimit }),
  ]);

  if (categoriesResult.error) throw categoriesResult.error;
  if (suppliersResult.error) throw suppliersResult.error;
  if (brandsResult.error && !isMissingRelationError(brandsResult.error, "component_brands")) throw brandsResult.error;

  const categoryRows = (categoriesResult.data ?? []) as ComponentLibraryCategoryRow[];
  const categoryTree = buildComponentCategoryTreeFromRows(categoryRows);
  const libraryFolders = await fetchLibraryFolders(supabase, workspaceId);
  const suppliers = suppliersResult.data ?? [];
  const persistedBrands = (brandsResult.error ? [] : (brandsResult.data ?? [])) as ComponentLibraryBrand[];
  const fallbackBrandMap = new Map<string, ComponentLibraryBrand>();
  for (const row of itemRows) {
    const brandName = row.brand?.trim();
    if (!brandName) continue;
    const normalizedName = normalizeLibraryName(brandName);
    if (!normalizedName || fallbackBrandMap.has(normalizedName)) continue;
    fallbackBrandMap.set(normalizedName, {
      id: `brand:${normalizedName}`,
      name: brandName,
      normalized_name: normalizedName,
      sort_order: fallbackBrandMap.size + 1,
    });
  }
  const brands = persistedBrands.length > 0
    ? persistedBrands
    : [...fallbackBrandMap.values()].sort((left, right) => left.sort_order - right.sort_order || left.name.localeCompare(right.name));
  const itemIds = itemRows.map((row) => row.id);
  const isBoundedItemPage = boundedItemLimit !== undefined;
  // U18 cost fidelity: the slim EstimateRowItem cost derives from the default
  // price option and its current cost entry (normalizeComponentLibraryItem +
  // normalizePriceOption). These two queries are ALWAYS loaded so the lite panel
  // dataset is byte-identical to the full one — never reconstructed from the
  // (potentially lagging) denormalized cost_library_items columns alone.
  const [priceOptionsResult, costEntriesResult] = itemIds.length > 0
    ? await Promise.all([
        isBoundedItemPage
          ? collectComponentLibraryRowsForSelectedItems<ComponentPriceOptionRow>(itemIds, (itemIds) =>
              supabase
                .from("cost_library_item_price_options")
                .select("*")
                .eq("workspace_id", workspaceId)
                .in("item_id", itemIds)
                .order("is_default", { ascending: false })
                .order("variant_sort_order", { ascending: true })
                .order("created_at", { ascending: true }),
            )
          : collectComponentLibraryWorkspaceRowsForItems<ComponentPriceOptionRow>(itemIds, (from, to) =>
              supabase
                .from("cost_library_item_price_options")
                .select("*")
                .eq("workspace_id", workspaceId)
                .order("is_default", { ascending: false })
                .order("variant_sort_order", { ascending: true })
                .order("created_at", { ascending: true })
                .range(from, to),
            ),
        isBoundedItemPage
          ? collectComponentLibraryRowsForSelectedItems<ComponentVariantCostEntryRow>(itemIds, (itemIds) =>
              supabase
                .from("cost_library_item_variant_cost_entries")
                .select("*")
                .eq("workspace_id", workspaceId)
                .in("item_id", itemIds)
                .is("deleted_at", null)
                .order("is_current", { ascending: false })
                .order("pricing_date", { ascending: false })
                .order("created_at", { ascending: false }),
            )
          : collectComponentLibraryWorkspaceRowsForItems<ComponentVariantCostEntryRow>(itemIds, (from, to) =>
              supabase
                .from("cost_library_item_variant_cost_entries")
                .select("*")
                .eq("workspace_id", workspaceId)
                .is("deleted_at", null)
                .order("is_current", { ascending: false })
                .order("pricing_date", { ascending: false })
                .order("created_at", { ascending: false })
                .range(from, to),
            ),
      ])
    : [
        { data: [], error: null },
        { data: [], error: null },
      ];
  // U18: the audit + attachment graph (versions / price history / state history
  // / variant attachments) is never read by the in-estimate panel — and these
  // are the unbounded-growth tables. The lite loader skips them; the Library
  // management surfaces (includeDetailGraph: true) keep the full set.
  const [versionsResult, priceHistoryResult, stateHistoryResult, attachmentsResult] = (itemIds.length > 0 && includeDetailGraph)
    ? await Promise.all([
        isBoundedItemPage
          ? collectComponentLibraryRowsForSelectedItems<ComponentVersionRow>(itemIds, (itemIds) =>
              supabase
                .from("cost_library_item_versions")
                .select("*")
                .eq("workspace_id", workspaceId)
                .in("item_id", itemIds)
                .order("version_number", { ascending: false }),
            )
          : collectComponentLibraryWorkspaceRowsForItems<ComponentVersionRow>(itemIds, (from, to) =>
              supabase
                .from("cost_library_item_versions")
                .select("*")
                .eq("workspace_id", workspaceId)
                .order("version_number", { ascending: false })
                .range(from, to),
            ),
        isBoundedItemPage
          ? collectComponentLibraryRowsForSelectedItems<ComponentPriceHistoryRow>(itemIds, (itemIds) =>
              supabase
                .from("cost_library_item_price_history")
                .select("*")
                .eq("workspace_id", workspaceId)
                .in("item_id", itemIds)
                .order("effective_at", { ascending: false }),
            )
          : collectComponentLibraryWorkspaceRowsForItems<ComponentPriceHistoryRow>(itemIds, (from, to) =>
              supabase
                .from("cost_library_item_price_history")
                .select("*")
                .eq("workspace_id", workspaceId)
                .order("effective_at", { ascending: false })
                .range(from, to),
            ),
        isBoundedItemPage
          ? collectComponentLibraryRowsForSelectedItems<ComponentStateHistoryRow>(itemIds, (itemIds) =>
              supabase
                .from("cost_library_item_state_history")
                .select("*")
                .eq("workspace_id", workspaceId)
                .in("item_id", itemIds)
                .order("effective_at", { ascending: false }),
            )
          : collectComponentLibraryWorkspaceRowsForItems<ComponentStateHistoryRow>(itemIds, (from, to) =>
              supabase
                .from("cost_library_item_state_history")
                .select("*")
                .eq("workspace_id", workspaceId)
                .order("effective_at", { ascending: false })
                .range(from, to),
            ),
        isBoundedItemPage
          ? collectComponentLibraryRowsForSelectedItems<ComponentVariantAttachmentRow>(itemIds, (itemIds) =>
              supabase
                .from("cost_library_item_variant_attachments")
                .select("*")
                .eq("workspace_id", workspaceId)
                .in("item_id", itemIds)
                .order("created_at", { ascending: false }),
            )
          : collectComponentLibraryWorkspaceRowsForItems<ComponentVariantAttachmentRow>(itemIds, (from, to) =>
              supabase
                .from("cost_library_item_variant_attachments")
                .select("*")
                .eq("workspace_id", workspaceId)
                .order("created_at", { ascending: false })
                .range(from, to),
            ),
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
  if (costEntriesResult.error && !isMissingRelationError(costEntriesResult.error, "cost_library_item_variant_cost_entries")) throw costEntriesResult.error;
  if (attachmentsResult.error && !isMissingRelationError(attachmentsResult.error, "cost_library_item_variant_attachments")) throw attachmentsResult.error;

  const costEntriesByPriceOptionId = new Map<string, ComponentVariantCostEntry[]>();
  for (const row of (costEntriesResult.error ? [] : (costEntriesResult.data ?? [])) as ComponentVariantCostEntryRow[]) {
    const entries = costEntriesByPriceOptionId.get(row.price_option_id) ?? [];
    entries.push(normalizeCostEntry(row));
    costEntriesByPriceOptionId.set(row.price_option_id, entries);
  }

  const attachmentsByPriceOptionId = new Map<string, ComponentVariantAttachment[]>();
  for (const row of (attachmentsResult.error ? [] : (attachmentsResult.data ?? [])) as ComponentVariantAttachmentRow[]) {
    const attachments = attachmentsByPriceOptionId.get(row.price_option_id) ?? [];
    attachments.push(normalizeAttachment(row));
    attachmentsByPriceOptionId.set(row.price_option_id, attachments);
  }

  const priceOptionsByItemId = new Map<string, ComponentPriceOption[]>();
  for (const row of (priceOptionsResult.error ? [] : (priceOptionsResult.data ?? [])) as ComponentPriceOptionRow[]) {
    const options = priceOptionsByItemId.get(row.item_id) ?? [];
    options.push(normalizePriceOption(
      row,
      costEntriesByPriceOptionId.get(row.id) ?? [],
      attachmentsByPriceOptionId.get(row.id) ?? [],
    ));
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
  const brandById = new Map(brands.map((brand) => [brand.id, brand]));
  const libraryItems = itemRows.map((row) => {
    const history = [...(historyByItemId.get(row.id) ?? [])].sort((left, right) => (
      right.effectiveAt.localeCompare(left.effectiveAt) || right.createdAt.localeCompare(left.createdAt)
    ));
    return normalizeComponentLibraryItem(
      row,
      categoryById,
      supplierById,
      brandById,
      categoryTree,
      priceOptionsByItemId.get(row.id) ?? [],
      history,
      versionsByItemId.get(row.id)?.[0],
    );
  });

  return {
    workspaceId,
    categoryTree,
    suppliers,
    brands,
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

export async function getCurrentWorkspaceComponentRowsLibrary(options: ComponentRowsLibraryLoadOptions = {}): Promise<ComponentRowsLibraryDataset> {
  const { workspace } = await ensureDefaultWorkspace();
  const supabase = await createSupabaseServerClient();
  return loadCurrentWorkspaceComponentRowsLibrary({
    supabase,
    workspaceId: workspace.id,
    includeDetailGraph: options.includeDetailGraph,
    itemLimit: options.itemLimit,
  });
}

export type CurrentWorkspaceEstimateTemplatesSeed = {
  templates: EstimateTemplate[];
  userId: string;
  workspaceId: string;
};

export async function getCurrentWorkspaceEstimateTemplatesSeed(): Promise<CurrentWorkspaceEstimateTemplatesSeed> {
  const { workspace, profile } = await ensureDefaultWorkspace();
  const supabase = await createSupabaseServerClient();
  return {
    templates: await loadCurrentWorkspaceEstimateTemplates({ supabase, workspaceId: workspace.id }),
    userId: profile.id,
    workspaceId: workspace.id,
  };
}

export async function getCurrentWorkspaceEstimateTemplates(): Promise<EstimateTemplate[]> {
  const { templates } = await getCurrentWorkspaceEstimateTemplatesSeed();
  return templates;
}

/** Pricing-date age beyond which a component price counts as stale on the Overview health line. */
const LIBRARY_OVERVIEW_STALE_PRICING_DAYS = 90;

export type LibraryOverviewComponent = {
  id: string;
  name: string;
  category: string;
  supplier: string;
  unit: string;
  unitCost: number;
  imageUrl?: string;
  pricingSource?: string | null;
  pricingDate?: string | null;
  confidence?: string | null;
  lifecycleState: Tables<"cost_library_items">["lifecycle_state"];
  updatedAt: string;
};

export type LibraryOverviewTemplate = {
  id: string;
  name: string;
  category: string;
  updatedAt?: string;
  groupCount: number;
  areaCount: number;
  rowCount: number;
  total: number;
  sourceTrustChips: SourceTrustChipSpec[];
};

export type LibraryOverviewHealth = {
  staleComponentCount: number;
  discontinuedInUseCount: number;
  missingBrandCount: number;
  lastLibraryUpdate: string | null;
};

export type LibraryOverview = {
  componentCount: number;
  categoryCount: number;
  supplierCount: number;
  brandCount: number;
  templateCount: number;
  templateGroupCount: number;
  templateCategories: string[];
  recentComponents: LibraryOverviewComponent[];
  recentTemplates: LibraryOverviewTemplate[];
  health: LibraryOverviewHealth;
};

export type LibraryDashboardSpotlight = {
  componentCount: number;
  templateCount: number;
  recentComponents: Array<Pick<LibraryOverviewComponent, "id" | "name" | "category" | "updatedAt">>;
  recentTemplates: [];
};

function toLibraryOverviewTemplate(template: EstimateTemplate): LibraryOverviewTemplate {
  const summary = summarizeEstimateTemplate(template);
  return {
    id: template.id,
    name: template.name,
    category: template.category,
    updatedAt: template.updatedAt,
    groupCount: summary.groupCount,
    areaCount: summary.areaCount,
    rowCount: summary.rowCount,
    total: summary.total,
    sourceTrustChips: getTemplateSourceTrustChips(template),
  };
}

const LIBRARY_DASHBOARD_RECENT_COMPONENT_COLUMNS =
  "id, name, category, supplier, unit, unit_cost, thumbnail_path, pricing_source, pricing_date, confidence, lifecycle_state, updated_at";

type LibraryOverviewComponentRow = Pick<
  Tables<"cost_library_items">,
  | "id"
  | "name"
  | "category"
  | "supplier"
  | "unit"
  | "unit_cost"
  | "thumbnail_path"
  | "pricing_source"
  | "pricing_date"
  | "confidence"
  | "lifecycle_state"
  | "updated_at"
>;

function toLibraryOverviewComponent(row: LibraryOverviewComponentRow): LibraryOverviewComponent {
  return {
    id: row.id,
    name: row.name,
    category: row.category,
    supplier: row.supplier ?? "",
    unit: row.unit,
    unitCost: Number(row.unit_cost),
    imageUrl: row.thumbnail_path ?? undefined,
    pricingSource: row.pricing_source,
    pricingDate: row.pricing_date,
    confidence: row.confidence,
    lifecycleState: row.lifecycle_state,
    updatedAt: row.updated_at,
  };
}

/**
 * One lightweight payload for the Library Overview home: header counts,
 * 6 most recently updated components, 5 most recently updated templates,
 * and the health-line stats. Indexed lookups only — never the full
 * component or template datasets.
 */
export async function getLibraryOverview(): Promise<LibraryOverview> {
  const { workspace } = await ensureDefaultWorkspace();
  const supabase = await createSupabaseServerClient();
  const workspaceId = workspace.id;
  const stalePricingCutoff = new Date(Date.now() - LIBRARY_OVERVIEW_STALE_PRICING_DAYS * 24 * 60 * 60 * 1000)
    .toISOString()
    .slice(0, 10);

  const [
    componentCountResult,
    categoryCountResult,
    supplierCountResult,
    brandCountResult,
    recentComponentsResult,
    recentTemplatesResult,
    templateCategoriesResult,
    staleCountResult,
    missingBrandCountResult,
    lastUpdateResult,
    discontinuedIdsResult,
  ] = await Promise.all([
    supabase
      .from("cost_library_items")
      .select("id", { count: "exact", head: true })
      .eq("workspace_id", workspaceId)
      .neq("lifecycle_state", "archived"),
    supabase
      .from("component_category_nodes")
      .select("id", { count: "exact", head: true })
      .is("parent_id", null),
    supabase
      .from("component_suppliers")
      .select("id", { count: "exact", head: true })
      .eq("workspace_id", workspaceId),
    supabase
      .from("component_brands")
      .select("id", { count: "exact", head: true })
      .eq("workspace_id", workspaceId),
    supabase
      .from("cost_library_items")
      .select(LIBRARY_DASHBOARD_RECENT_COMPONENT_COLUMNS)
      .eq("workspace_id", workspaceId)
      .neq("lifecycle_state", "archived")
      .order("updated_at", { ascending: false })
      .limit(6),
    supabase
      .from("estimate_templates")
      .select("*")
      .eq("workspace_id", workspaceId)
      .order("updated_at", { ascending: false })
      .limit(5),
    supabase
      .from("estimate_templates")
      .select("category")
      .eq("workspace_id", workspaceId),
    supabase
      .from("cost_library_items")
      .select("id", { count: "exact", head: true })
      .eq("workspace_id", workspaceId)
      .neq("lifecycle_state", "archived")
      .not("pricing_date", "is", null)
      .lt("pricing_date", stalePricingCutoff),
    supabase
      .from("cost_library_items")
      .select("id", { count: "exact", head: true })
      .eq("workspace_id", workspaceId)
      .neq("lifecycle_state", "archived")
      .is("brand_id", null)
      .or('brand.is.null,brand.eq.""'),
    supabase
      .from("cost_library_items")
      .select("updated_at")
      .eq("workspace_id", workspaceId)
      .order("updated_at", { ascending: false })
      .limit(1),
    supabase
      .from("cost_library_items")
      .select("id")
      .eq("workspace_id", workspaceId)
      .eq("lifecycle_state", "discontinued"),
  ]);

  if (componentCountResult.error) throw componentCountResult.error;
  if (categoryCountResult.error) throw categoryCountResult.error;
  if (supplierCountResult.error) throw supplierCountResult.error;
  if (brandCountResult.error && !isMissingRelationError(brandCountResult.error, "component_brands")) throw brandCountResult.error;
  if (recentComponentsResult.error) throw recentComponentsResult.error;
  if (recentTemplatesResult.error && !isMissingRelationError(recentTemplatesResult.error, "estimate_templates")) throw recentTemplatesResult.error;
  if (templateCategoriesResult.error && !isMissingRelationError(templateCategoriesResult.error, "estimate_templates")) throw templateCategoriesResult.error;
  if (staleCountResult.error) throw staleCountResult.error;
  if (missingBrandCountResult.error) throw missingBrandCountResult.error;
  if (lastUpdateResult.error) throw lastUpdateResult.error;
  if (discontinuedIdsResult.error) throw discontinuedIdsResult.error;

  const recentComponents: LibraryOverviewComponent[] = (recentComponentsResult.data ?? []).map(toLibraryOverviewComponent);

  // Templates: counts need nodes + rows, fetched for just the 5 recent ids.
  // A missing templates table falls back to the seed list (same behavior as
  // the Templates browse tab).
  const isTemplateTableMissing = Boolean(recentTemplatesResult.error);
  const recentTemplateRows = recentTemplatesResult.error ? [] : (recentTemplatesResult.data ?? []);
  let recentTemplates: LibraryOverviewTemplate[] = [];
  if (recentTemplateRows.length > 0) {
    const recentTemplateIds = recentTemplateRows.map((template) => template.id);
    const [templateNodesResult, templateRowItemsResult] = await Promise.all([
      supabase
        .from("estimate_template_nodes")
        .select("*")
        .in("template_id", recentTemplateIds)
        .order("sort_order", { ascending: true }),
      supabase
        .from("estimate_template_row_items")
        .select("*")
        .in("template_id", recentTemplateIds)
        .order("sort_order", { ascending: true }),
    ]);
    if (templateNodesResult.error) throw templateNodesResult.error;
    if (templateRowItemsResult.error) throw templateRowItemsResult.error;

    const builtById = new Map(
      buildEstimateTemplatesFromRows({
        templates: recentTemplateRows,
        nodes: templateNodesResult.data ?? [],
        rowItems: templateRowItemsResult.data ?? [],
      }).map((template) => [template.id, template]),
    );
    // buildEstimateTemplatesFromRows sorts by sort_order; restore recency order.
    recentTemplates = recentTemplateRows
      .map((row) => builtById.get(row.id))
      .filter((template): template is EstimateTemplate => Boolean(template))
      .map(toLibraryOverviewTemplate);
  } else {
    recentTemplates = getTemplateTableFallbackTemplates({ isTemplateTableMissing })
      .slice(0, 5)
      .map(toLibraryOverviewTemplate);
  }

  const templateCategoryRows = templateCategoriesResult.error ? [] : (templateCategoriesResult.data ?? []);
  const templateCategorySet = new Set(
    isTemplateTableMissing
      ? getTemplateTableFallbackTemplates({ isTemplateTableMissing }).map((template) => template.category)
      : templateCategoryRows.map((row) => row.category),
  );
  const templateCount = isTemplateTableMissing
    ? getTemplateTableFallbackTemplates({ isTemplateTableMissing }).length
    : templateCategoryRows.length;

  // Discontinued items still referenced by template or estimate rows. The
  // discontinued id list is small, so two indexed .in() lookups stay cheap.
  let discontinuedInUseCount = 0;
  const discontinuedIds = (discontinuedIdsResult.data ?? []).map((row) => row.id);
  if (discontinuedIds.length > 0) {
    const [templateRefsResult, estimateRefsResult] = await Promise.all([
      supabase
        .from("estimate_template_row_items")
        .select("source_library_item_id")
        .in("source_library_item_id", discontinuedIds),
      supabase
        .from("estimate_row_items")
        .select("source_library_item_id")
        .in("source_library_item_id", discontinuedIds),
    ]);
    if (templateRefsResult.error && !isMissingRelationError(templateRefsResult.error, "estimate_template_row_items")) {
      throw templateRefsResult.error;
    }
    if (estimateRefsResult.error) throw estimateRefsResult.error;

    const inUseIds = new Set<string>();
    for (const row of templateRefsResult.error ? [] : (templateRefsResult.data ?? [])) {
      if (row.source_library_item_id) inUseIds.add(row.source_library_item_id);
    }
    for (const row of estimateRefsResult.data ?? []) {
      if (row.source_library_item_id) inUseIds.add(row.source_library_item_id);
    }
    discontinuedInUseCount = inUseIds.size;
  }

  return {
    componentCount: componentCountResult.count ?? 0,
    categoryCount: categoryCountResult.count ?? 0,
    supplierCount: supplierCountResult.count ?? 0,
    brandCount: brandCountResult.error ? 0 : (brandCountResult.count ?? 0),
    templateCount,
    templateGroupCount: templateCategorySet.size,
    templateCategories: [...templateCategorySet].sort((left, right) => left.localeCompare(right)),
    recentComponents,
    recentTemplates,
    health: {
      staleComponentCount: staleCountResult.count ?? 0,
      discontinuedInUseCount,
      missingBrandCount: missingBrandCountResult.count ?? 0,
      lastLibraryUpdate: lastUpdateResult.data?.[0]?.updated_at ?? null,
    },
  };
}

export async function getLibraryDashboardSpotlight(): Promise<LibraryDashboardSpotlight | null> {
  const { workspace } = await ensureDefaultWorkspace();
  const supabase = await createSupabaseServerClient();
  const workspaceId = workspace.id;

  const [componentCountResult, recentComponentsResult, templateCountResult] = await Promise.all([
    supabase
      .from("cost_library_items")
      .select("id", { count: "exact", head: true })
      .eq("workspace_id", workspaceId)
      .neq("lifecycle_state", "archived"),
    supabase
      .from("cost_library_items")
      .select(LIBRARY_DASHBOARD_RECENT_COMPONENT_COLUMNS)
      .eq("workspace_id", workspaceId)
      .neq("lifecycle_state", "archived")
      .order("updated_at", { ascending: false })
      .limit(5),
    supabase
      .from("estimate_templates")
      .select("id", { count: "exact", head: true })
      .eq("workspace_id", workspaceId),
  ]);

  if (componentCountResult.error) throw componentCountResult.error;
  if (recentComponentsResult.error) throw recentComponentsResult.error;
  if (templateCountResult.error && !isMissingRelationError(templateCountResult.error, "estimate_templates")) {
    throw templateCountResult.error;
  }

  return {
    componentCount: componentCountResult.count ?? 0,
    templateCount: templateCountResult.error ? 0 : (templateCountResult.count ?? 0),
    recentComponents: (recentComponentsResult.data ?? []).map((row) => {
      const component = toLibraryOverviewComponent(row);
      return {
        id: component.id,
        name: component.name,
        category: component.category,
        updatedAt: component.updatedAt,
      };
    }),
    recentTemplates: [],
  };
}

/**
 * Single-template fetch for the template editor route. Returns null when the
 * template does not exist in the current workspace (RLS keeps cross-workspace
 * ids invisible, so a stale link 404s instead of leaking).
 */
export async function getEstimateTemplateById(templateId: string): Promise<EstimateTemplate | null> {
  if (!isUuid(templateId)) return null;
  const { workspace } = await ensureDefaultWorkspace();
  const supabase = await createSupabaseServerClient();

  const templateResult = await supabase
    .from("estimate_templates")
    .select("*")
    .eq("workspace_id", workspace.id)
    .eq("id", templateId)
    .maybeSingle();

  if (templateResult.error) {
    if (isMissingRelationError(templateResult.error, "estimate_templates")) return null;
    throw templateResult.error;
  }
  if (!templateResult.data) return null;

  const [templateNodesResult, templateRowItemsResult] = await Promise.all([
    supabase
      .from("estimate_template_nodes")
      .select("*")
      .eq("template_id", templateResult.data.id)
      .order("sort_order", { ascending: true }),
    supabase
      .from("estimate_template_row_items")
      .select("*")
      .eq("template_id", templateResult.data.id)
      .order("sort_order", { ascending: true }),
  ]);

  if (templateNodesResult.error) throw templateNodesResult.error;
  if (templateRowItemsResult.error) throw templateRowItemsResult.error;

  const [template] = buildEstimateTemplatesFromRows({
    templates: [templateResult.data],
    nodes: templateNodesResult.data ?? [],
    rowItems: templateRowItemsResult.data ?? [],
  });

  return template ?? null;
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

/**
 * U18: lite library load for the in-estimate Templates panel. Produces an
 * EstimateRowItem[] byte-identical to {@link getCurrentWorkspaceComponentLibrary}
 * for every field the panel reads — it still loads price options + current cost
 * entries (which drive the displayed cost) and only skips the per-item
 * versions / price history / state history / attachments graph the panel never
 * reads. Do NOT use this for the Library management surfaces (template editor /
 * component manager), which edit variants and need the full attachment/history graph.
 */
export async function getCurrentWorkspaceComponentLibraryLite(): Promise<ComponentLibraryDataset> {
  const { workspace } = await ensureDefaultWorkspace();
  const supabase = await createSupabaseServerClient();
  const [componentRows, templates] = await Promise.all([
    loadCurrentWorkspaceComponentRowsLibrary({
      supabase,
      workspaceId: workspace.id,
      includeDetailGraph: false,
      itemLimit: SIDEBAR_COMPONENT_LIBRARY_DEFAULT_LIMIT,
    }),
    loadCurrentWorkspaceEstimateTemplates({ supabase, workspaceId: workspace.id }),
  ]);

  return {
    ...componentRows,
    templates,
  };
}

export const fallbackComponentRowsLibraryDataset: ComponentRowsLibraryDataset = {
  workspaceId: "fallback",
  categoryTree: componentCategoryTree,
  suppliers: [],
  brands: [],
  libraryFolders: [],
  libraryItems: [],
};

export const fallbackComponentLibraryDataset: ComponentLibraryDataset = {
  ...fallbackComponentRowsLibraryDataset,
  templates: [],
};

const componentLibraryDatasetVersion = componentCategoryTaxonomyVersion;
