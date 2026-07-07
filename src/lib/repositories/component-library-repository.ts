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
import { getCloudflareD1Database, type D1DatabaseLike, type D1Value } from "@/lib/cloudflare/d1";
import type { Json } from "@/lib/types/json";
import { isUuid } from "@/lib/ids";
import type { LibraryFolderKind } from "@/lib/component-library/library-folder-reorder";
import { ensureDefaultWorkspace } from "./workspace-repository";

export type ComponentLibrarySupplier = {
  id: string;
  name: string;
  normalized_name: string;
  sort_order: number;
};
export type ComponentLibraryBrand = {
  id: string;
  name: string;
  normalized_name: string;
  sort_order: number;
};
export type ComponentLibraryFolder = {
  id: string;
  workspace_id: string;
  parent_id: string | null;
  name: string;
  sort_order: number;
  source_category_node_id: string | null;
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
  isPartial?: boolean;
  loadedComponentCount?: number;
  totalComponentCount?: number;
};

type EstimateTemplateRow = {
  id: string;
  workspace_id: string;
  name: string;
  description: string;
  category: string;
  sort_order: number;
  metadata: Json | string;
  created_by: string | null;
  created_at: string;
  updated_at: string;
};
type EstimateTemplateNodeRow = {
  id: string;
  template_id: string;
  parent_id: string | null;
  kind: "group" | "area" | string;
  name: string;
  sort_order: number;
  metadata: Json | string;
  created_at: string;
  updated_at: string;
};
type EstimateTemplateRowItemRow = {
  id: string;
  template_id: string;
  template_node_id: string;
  sort_order: number;
  source_library_item_id: string | null;
  source_snapshot: Json | string | null;
  category_node_id: string | null;
  supplier_id: string | null;
  material: string;
  description: string;
  supplier: string;
  unit: string;
  quantity: number | string;
  unit_cost: number | string;
  misc_cost: number | string;
  contingency_percentage: number | string | null;
  adjustment_percentage?: number | string | null;
  discipline: string;
  designation: string;
  link_state: EstimateRowItem["linkState"] | string;
  metadata: Json | string;
  created_at: string;
  updated_at: string;
};
type CostLibraryLifecycleState = "draft" | "in_production" | "available" | "discontinued" | "archived";
type CostLibraryItemRow = {
  id: string;
  workspace_id: string;
  name: string;
  description: string;
  supplier: string | null;
  supplier_id: string | null;
  brand: string | null;
  brand_id: string | null;
  category: string;
  category_node_id: string | null;
  library_folder_id: string | null;
  unit: string;
  unit_cost: number | string;
  misc_cost: number | string;
  pricing_source: string | null;
  pricing_date: string | null;
  confidence: string | null;
  metadata: Json | string;
  thumbnail_path: string | null;
  active_price_option_id: string | null;
  current_version_number: number;
  lifecycle_state: CostLibraryLifecycleState;
  lifecycle_state_changed_at: string | null;
  created_at: string;
  updated_at: string;
};
type ComponentPriceOptionRow = {
  id: string;
  workspace_id: string;
  item_id: string;
  label: string;
  sku?: string | null;
  variant_description?: string | null;
  variant_sort_order?: number | string | null;
  unit: string;
  unit_cost: number | string;
  misc_cost: number | string;
  currency: string;
  pricing_source: string | null;
  pricing_date?: string | null;
  confidence: string | null;
  source_url?: string | null;
  notes?: string | null;
  supplier_id: string | null;
  active_cost_entry_id?: string | null;
  package_quantity?: number | string | null;
  package_unit?: string | null;
  dimension_length?: number | string | null;
  dimension_width?: number | string | null;
  dimension_height?: number | string | null;
  dimension_unit?: string | null;
  mass?: number | string | null;
  mass_unit?: string | null;
  image_bucket?: string | null;
  image_path?: string | null;
  thumbnail_path?: string | null;
  image_metadata?: Json | string | null;
  variant_metadata?: Json | string | null;
  metadata_json?: Json | string | null;
  is_active: boolean | number;
  is_default: boolean | number;
  created_at: string;
  updated_at: string;
};
type ComponentVersionRow = {
  id: string;
  item_id: string;
  workspace_id: string;
  version_number: number;
  snapshot_json: Json | string;
  change_summary: string;
  change_reason: string;
  effective_at: string;
  created_by: string | null;
  created_at: string;
};
type ComponentPriceHistoryRow = {
  id: string;
  price_option_id: string;
  item_id: string;
  workspace_id: string;
  operation_key: string;
  old_snapshot: Json | string | null;
  new_snapshot: Json | string;
  change_reason: string;
  effective_at: string;
  created_by: string | null;
  created_at: string;
};
type ComponentStateHistoryRow = {
  id: string;
  item_id: string;
  workspace_id: string;
  from_state: CostLibraryLifecycleState | string | null;
  to_state: CostLibraryLifecycleState | string;
  operation_key: string;
  effective_at: string;
  change_reason: string;
  created_by: string | null;
  created_at: string;
};
type ComponentVariantCostEntryRow = {
  id: string;
  workspace_id: string;
  item_id: string;
  price_option_id: string;
  unit_cost: number | string;
  misc_cost: number | string;
  currency: string;
  pricing_source: string | null;
  pricing_date: string | null;
  confidence: string | null;
  source_url: string | null;
  notes: string;
  is_current: boolean | number;
  deleted_at: string | null;
  metadata_json: Json | string;
  created_at: string;
  updated_at: string;
};
type ComponentVariantAttachmentRow = {
  id: string;
  price_option_id: string | null;
  item_id: string | null;
  workspace_id: string;
  storage_bucket: string;
  storage_path: string;
  file_name: string;
  content_type: string;
  size_bytes: number | string;
  attachment_kind: "pdf" | "excel" | string | null;
  metadata_json: Json | string;
  created_at: string;
};

type BuildEstimateTemplatesInput = {
  templates: EstimateTemplateRow[];
  nodes: EstimateTemplateNodeRow[];
  rowItems: EstimateTemplateRowItemRow[];
};
type LibraryTemplatesSeedPayload = BuildEstimateTemplatesInput;

const COMPONENT_LIBRARY_ITEMS_QUERY_PAGE_SIZE = 1000;
export const SIDEBAR_COMPONENT_LIBRARY_DEFAULT_LIMIT = 50;
export const SIDEBAR_COMPONENT_LIBRARY_MAX_LIMIT = 100;
export const SIDEBAR_COMPONENT_LIBRARY_ITEM_COLUMNS =
  "id, workspace_id, name, description, supplier, supplier_id, brand, brand_id, category, category_node_id, library_folder_id, unit, unit_cost, misc_cost, pricing_source, pricing_date, confidence, metadata, thumbnail_path, active_price_option_id, current_version_number, lifecycle_state, lifecycle_state_changed_at, created_at, updated_at";

const COST_LIBRARY_ITEM_D1_COLUMNS =
  "id, workspace_id, name, description, supplier, supplier_id, brand, brand_id, category, category_node_id, library_folder_id, unit, unit_cost, misc_cost, pricing_source, pricing_date, confidence, metadata_json AS metadata, thumbnail_path, active_price_option_id, current_version_number, lifecycle_state, lifecycle_state_changed_at, created_at, updated_at";

type ComponentRowsLibraryLoadOptions = {
  includeDetailGraph?: boolean;
  itemLimit?: number;
  itemIds?: string[];
};

function placeholders(valuesOrCount: number | readonly unknown[]) {
  const count = typeof valuesOrCount === "number" ? valuesOrCount : valuesOrCount.length;
  return new Array(count).fill("?").join(", ");
}

function bindValues(values: readonly unknown[]): D1Value[] {
  return values.map((value) => {
    if (value === undefined) return null;
    if (typeof value === "string" || typeof value === "number" || typeof value === "boolean" || value === null || value instanceof ArrayBuffer) {
      return value;
    }
    return JSON.stringify(value);
  });
}

async function requireComponentLibraryRepositoryD1Database(): Promise<D1DatabaseLike> {
  const database = await getCloudflareD1Database();
  if (!database) {
    throw new Error("Cloudflare D1 binding ARCH_DB is required for component library reads.");
  }
  return database;
}

async function all<T>(database: D1DatabaseLike, sql: string, values: readonly unknown[] = []): Promise<T[]> {
  const result = await database.prepare(sql).bind(...bindValues(values)).all<T>();
  return result.results ?? [];
}

async function first<T>(database: D1DatabaseLike, sql: string, values: readonly unknown[] = []): Promise<T | null> {
  return database.prepare(sql).bind(...bindValues(values)).first<T>();
}

function readJson(value: Json | string | null | undefined): Json {
  if (typeof value !== "string") return value ?? null;
  try {
    return JSON.parse(value) as Json;
  } catch {
    return null;
  }
}

function readMetadataRecord(metadata: Json | string | null | undefined): Record<string, Json> {
  metadata = readJson(metadata);
  if (!metadata || typeof metadata !== "object" || Array.isArray(metadata)) return {};
  return metadata as Record<string, Json>;
}

function readString(value: Json | undefined | null): string | undefined {
  return typeof value === "string" && value.trim() ? value : undefined;
}

async function collectComponentLibraryWorkspaceRowsForItems<T extends { item_id: string | null }>(
  database: D1DatabaseLike,
  tableName: string,
  workspaceId: string,
  itemIds: string[],
  orderBy: string,
  extraWhere = "",
  extraValues: readonly unknown[] = [],
): Promise<T[]> {
  const data: T[] = [];
  const itemIdSet = new Set(itemIds);

  for (let offset = 0;; offset += COMPONENT_LIBRARY_ITEMS_QUERY_PAGE_SIZE) {
    const pageRows = await all<T>(
      database,
      `SELECT * FROM ${tableName}
       WHERE workspace_id = ?${extraWhere}
       ${orderBy}
       LIMIT ? OFFSET ?`,
      [workspaceId, ...extraValues, COMPONENT_LIBRARY_ITEMS_QUERY_PAGE_SIZE, offset],
    );
    data.push(...pageRows.filter((row) => row.item_id !== null && itemIdSet.has(row.item_id)));
    if (pageRows.length < COMPONENT_LIBRARY_ITEMS_QUERY_PAGE_SIZE) return data;
  }
}

async function collectComponentLibraryRowsForSelectedItems<T extends { item_id?: string | null }>(
  database: D1DatabaseLike,
  tableName: string,
  itemIds: string[],
  orderBy: string,
  extraWhere = "",
  extraValues: readonly unknown[] = [],
): Promise<T[]> {
  if (itemIds.length === 0) return [];
  return all<T>(
    database,
    `SELECT * FROM ${tableName}
     WHERE item_id IN (${placeholders(itemIds)})${extraWhere}
     ${orderBy}`,
    [...itemIds, ...extraValues],
  );
}

function normalizeComponentLibraryItemLimit(limit: number | undefined): number | undefined {
  if (limit === undefined) return undefined;
  if (!Number.isFinite(limit)) return SIDEBAR_COMPONENT_LIBRARY_DEFAULT_LIMIT;
  return Math.max(1, Math.min(SIDEBAR_COMPONENT_LIBRARY_MAX_LIMIT, Math.floor(limit)));
}

async function loadWorkspaceCostLibraryItemRows({
  database,
  workspaceId,
  itemLimit,
  itemIds,
}: {
  database: D1DatabaseLike;
  workspaceId: string;
  itemLimit?: number;
  itemIds?: string[];
}): Promise<CostLibraryItemRow[]> {
  const selectedItemIds = itemIds ? [...new Set(itemIds.filter(isUuid))] : [];
  if (itemIds && selectedItemIds.length === 0) return [];
  if (selectedItemIds.length > 0) {
    return all<CostLibraryItemRow>(
      database,
      `SELECT ${COST_LIBRARY_ITEM_D1_COLUMNS}
       FROM cost_library_items
       WHERE workspace_id = ?
         AND lifecycle_state <> 'archived'
         AND id IN (${placeholders(selectedItemIds)})
       ORDER BY category ASC, name ASC`,
      [workspaceId, ...selectedItemIds],
    );
  }

  const limit = normalizeComponentLibraryItemLimit(itemLimit);
  if (limit !== undefined) {
    return all<CostLibraryItemRow>(
      database,
      `SELECT ${COST_LIBRARY_ITEM_D1_COLUMNS}
       FROM cost_library_items
       WHERE workspace_id = ?
         AND lifecycle_state <> 'archived'
       ORDER BY updated_at DESC, id ASC
       LIMIT ?`,
      [workspaceId, limit],
    );
  }

  const rows: CostLibraryItemRow[] = [];

  for (let offset = 0;; offset += COMPONENT_LIBRARY_ITEMS_QUERY_PAGE_SIZE) {
    const pageRows = await all<CostLibraryItemRow>(
      database,
      `SELECT ${COST_LIBRARY_ITEM_D1_COLUMNS}
       FROM cost_library_items
       WHERE workspace_id = ?
         AND lifecycle_state <> 'archived'
       ORDER BY category ASC, name ASC
       LIMIT ? OFFSET ?`,
      [workspaceId, COMPONENT_LIBRARY_ITEMS_QUERY_PAGE_SIZE, offset],
    );
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

function readNullableNumber(value: unknown): number | null {
  if (value === null || value === undefined || value === "") return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function readBoolean(value: boolean | number | null | undefined): boolean {
  return value === true || value === 1;
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
  row: CostLibraryItemRow,
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
    lifecycleStateChangedAt: row.lifecycle_state_changed_at ?? undefined,
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
    pricingDate: row.pricing_date ?? row.created_at.slice(0, 10),
    confidence: row.confidence,
    sourceUrl: sanitizeComponentSourceUrl(row.source_url) ?? null,
    notes: row.notes,
    isCurrent: readBoolean(row.is_current),
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
    metadata: readMetadataRecord(row.metadata_json),
    createdAt: row.created_at,
  };
}

function normalizePriceOption(
  row: ComponentPriceOptionRow,
  costEntries: ComponentVariantCostEntry[] = [],
  attachments: ComponentVariantAttachment[] = [],
): ComponentPriceOption {
  const currentCostEntry = costEntries.find((entry) => entry.isCurrent) ?? costEntries[0];
  const metadata = readMetadataRecord(row.metadata_json);
  const imageMetadata = readMetadataRecord(row.image_metadata ?? metadata.imageMetadata);
  const variantMetadata = readMetadataRecord(row.variant_metadata ?? metadata.variantMetadata);
  const sku = row.sku ?? readString(metadata.sku) ?? null;
  const variantDescription = row.variant_description ?? readString(metadata.variantDescription) ?? null;
  const variantSortOrder = readNumber(row.variant_sort_order as Json | undefined) ?? readNumber(metadata.variantSortOrder) ?? 0;
  const pricingDate = currentCostEntry?.pricingDate ?? row.pricing_date ?? readString(metadata.pricingDate) ?? null;
  const sourceUrl = currentCostEntry?.sourceUrl ?? row.source_url ?? readString(metadata.sourceUrl) ?? null;
  const notes = currentCostEntry?.notes ?? row.notes ?? readString(metadata.notes) ?? "";
  return {
    id: row.id,
    label: row.label,
    sku,
    variantDescription,
    variantSortOrder,
    unit: row.unit,
    unitCost: Number(currentCostEntry?.unitCost ?? row.unit_cost),
    miscCost: Number(currentCostEntry?.miscCost ?? row.misc_cost),
    currency: row.currency,
    pricingSource: currentCostEntry?.pricingSource ?? row.pricing_source,
    pricingDate,
    confidence: currentCostEntry?.confidence ?? row.confidence,
    sourceUrl: sanitizeComponentSourceUrl(sourceUrl) ?? null,
    notes,
    supplierId: row.supplier_id,
    activeCostEntryId: row.active_cost_entry_id ?? readString(metadata.activeCostEntryId) ?? null,
    costEntries,
    packageQuantity: readNullableNumber(row.package_quantity ?? metadata.packageQuantity),
    packageUnit: row.package_unit ?? readString(metadata.packageUnit) ?? null,
    dimensionLength: readNullableNumber(row.dimension_length ?? metadata.dimensionLength),
    dimensionWidth: readNullableNumber(row.dimension_width ?? metadata.dimensionWidth),
    dimensionHeight: readNullableNumber(row.dimension_height ?? metadata.dimensionHeight),
    dimensionUnit: row.dimension_unit ?? readString(metadata.dimensionUnit) ?? null,
    mass: readNullableNumber(row.mass ?? metadata.mass),
    massUnit: row.mass_unit ?? readString(metadata.massUnit) ?? null,
    imageBucket: row.image_bucket ?? readString(metadata.imageBucket) ?? null,
    imagePath: row.image_path ?? readString(metadata.imagePath) ?? null,
    thumbnailPath: row.thumbnail_path ?? readString(metadata.thumbnailPath) ?? null,
    imageMetadata,
    attachments,
    variantMetadata,
    isActive: readBoolean(row.is_active),
    isDefault: readBoolean(row.is_default),
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
  ComponentLibraryFolder,
  "id" | "workspace_id" | "parent_id" | "name" | "sort_order" | "source_category_node_id" | "folder_kind"
>): ComponentLibraryFolder {
  return {
    ...folder,
    folder_kind: folder.folder_kind === "taxonomy" ? "taxonomy" : "custom",
  };
}

async function fetchLibraryFolders(
  database: D1DatabaseLike,
  workspaceId: string,
): Promise<ComponentLibraryFolder[]> {
  const rows = await all<ComponentLibraryFolder>(
    database,
    `SELECT id, workspace_id, parent_id, name, sort_order, source_category_node_id, folder_kind
     FROM library_folders
     WHERE workspace_id = ?
       AND folder_kind = 'custom'
     ORDER BY sort_order ASC, name ASC`,
    [workspaceId],
  );
  return sortFolders(rows.map(normalizeComponentLibraryFolder));
}

type ComponentRowsLibrarySeedPayload = {
  componentCount?: number;
  categoryRows: ComponentLibraryCategoryRow[];
  suppliers: ComponentLibrarySupplier[];
  brands: ComponentLibraryBrand[];
  libraryFolders: ComponentLibraryFolder[];
  itemRows: CostLibraryItemRow[];
  priceOptions: ComponentPriceOptionRow[];
  costEntries: ComponentVariantCostEntryRow[];
};

function readLibraryComponentRowsSeedArray<T>(
  payload: Record<string, unknown>,
  key: keyof ComponentRowsLibrarySeedPayload,
): T[] {
  const value = payload[key];
  if (!Array.isArray(value)) throw new Error(`library_component_rows_seed invalid shape: ${key} is not an array`);
  value.forEach((item, index) => {
    if (!isRecord(item)) throw new Error(`library_component_rows_seed invalid array element: ${key}[${index}] is not an object`);
  });
  return value as T[];
}

export function parseLibraryComponentRowsSeedPayload(value: unknown): ComponentRowsLibrarySeedPayload {
  if (!isRecord(value)) throw new Error("library_component_rows_seed invalid payload");
  const componentCount = value.componentCount === undefined
    ? undefined
    : assertLibraryOverviewRpcNumber(value.componentCount, "componentCount");
  return {
    componentCount,
    categoryRows: readLibraryComponentRowsSeedArray<ComponentLibraryCategoryRow>(value, "categoryRows"),
    suppliers: readLibraryComponentRowsSeedArray<ComponentLibrarySupplier>(value, "suppliers"),
    brands: readLibraryComponentRowsSeedArray<ComponentLibraryBrand>(value, "brands"),
    libraryFolders: readLibraryComponentRowsSeedArray<ComponentLibraryFolder>(value, "libraryFolders"),
    itemRows: readLibraryComponentRowsSeedArray<CostLibraryItemRow>(value, "itemRows"),
    priceOptions: readLibraryComponentRowsSeedArray<ComponentPriceOptionRow>(value, "priceOptions"),
    costEntries: readLibraryComponentRowsSeedArray<ComponentVariantCostEntryRow>(value, "costEntries"),
  };
}

function readLibraryTemplatesSeedArray<T>(
  payload: Record<string, unknown>,
  key: keyof LibraryTemplatesSeedPayload,
  guard: (value: Record<string, unknown>, path: string) => T,
): T[] {
  const value = payload[key];
  if (!Array.isArray(value)) throw new Error(`library_templates_seed invalid shape: ${key} is not an array`);
  return value.map((item, index) => {
    if (!isRecord(item)) throw new Error(`library_templates_seed invalid array element: ${key}[${index}] is not an object`);
    try {
      return guard(item, `${key}[${index}]`);
    } catch (error) {
      if (error instanceof Error) throw new Error(`library_templates_seed invalid row shape: ${error.message}`);
      throw error;
    }
  });
}

export function parseLibraryTemplatesSeedPayload(value: unknown): LibraryTemplatesSeedPayload {
  if (!isRecord(value)) throw new Error("library_templates_seed invalid payload");
  return {
    templates: readLibraryTemplatesSeedArray(value, "templates", assertLibraryOverviewTemplateRow),
    nodes: readLibraryTemplatesSeedArray(value, "nodes", assertLibraryOverviewTemplateNodeRow),
    rowItems: readLibraryTemplatesSeedArray(value, "rowItems", assertLibraryOverviewTemplateRowItemRow),
  };
}

function buildComponentRowsLibraryDataset({
  workspaceId,
  categoryRows,
  suppliers,
  persistedBrands,
  libraryFolders,
  itemRows,
  priceOptionRows,
  costEntryRows,
  includeVariantDetails = true,
  isPartial = false,
  totalComponentCount,
  versionRows = [],
  priceHistoryRows = [],
  stateHistoryRows = [],
  attachmentRows = [],
}: {
  workspaceId: string;
  categoryRows: ComponentLibraryCategoryRow[];
  suppliers: ComponentLibrarySupplier[];
  persistedBrands: ComponentLibraryBrand[];
  libraryFolders: ComponentLibraryFolder[];
  itemRows: CostLibraryItemRow[];
  priceOptionRows: ComponentPriceOptionRow[];
  costEntryRows: ComponentVariantCostEntryRow[];
  includeVariantDetails?: boolean;
  isPartial?: boolean;
  totalComponentCount?: number;
  versionRows?: ComponentVersionRow[];
  priceHistoryRows?: ComponentPriceHistoryRow[];
  stateHistoryRows?: ComponentStateHistoryRow[];
  attachmentRows?: ComponentVariantAttachmentRow[];
}): ComponentRowsLibraryDataset {
  const categoryTree = buildComponentCategoryTreeFromRows(categoryRows);
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

  const costEntriesByPriceOptionId = new Map<string, ComponentVariantCostEntry[]>();
  for (const row of costEntryRows) {
    const entries = costEntriesByPriceOptionId.get(row.price_option_id) ?? [];
    entries.push(normalizeCostEntry(row));
    costEntriesByPriceOptionId.set(row.price_option_id, entries);
  }

  const attachmentsByPriceOptionId = new Map<string, ComponentVariantAttachment[]>();
  for (const row of attachmentRows) {
    if (!row.price_option_id) continue;
    const attachments = attachmentsByPriceOptionId.get(row.price_option_id) ?? [];
    attachments.push(normalizeAttachment(row));
    attachmentsByPriceOptionId.set(row.price_option_id, attachments);
  }

  const priceOptionsByItemId = new Map<string, ComponentPriceOption[]>();
  for (const row of priceOptionRows) {
    const options = priceOptionsByItemId.get(row.item_id) ?? [];
    options.push(normalizePriceOption(
      row,
      costEntriesByPriceOptionId.get(row.id) ?? [],
      attachmentsByPriceOptionId.get(row.id) ?? [],
    ));
    priceOptionsByItemId.set(row.item_id, options);
  }

  const versionsByItemId = new Map<string, ComponentVersionRow[]>();
  for (const row of versionRows) {
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
  for (const row of versionRows) {
    addHistory(row.item_id, normalizeVersionHistory(row));
  }
  for (const row of priceHistoryRows) {
    addHistory(row.item_id, normalizePriceHistory(row));
  }
  for (const row of stateHistoryRows) {
    addHistory(row.item_id, normalizeStateHistory(row));
  }

  const categoryById = new Map(flattenCategoryTree(categoryTree).map((node) => [node.id, node]));
  const supplierById = new Map(suppliers.map((supplier) => [supplier.id, supplier]));
  const brandById = new Map(brands.map((brand) => [brand.id, brand]));
  const libraryItems = itemRows.map((row) => {
    const history = [...(historyByItemId.get(row.id) ?? [])].sort((left, right) => (
      right.effectiveAt.localeCompare(left.effectiveAt) || right.createdAt.localeCompare(left.createdAt)
    ));
    const item = normalizeComponentLibraryItem(
      row,
      categoryById,
      supplierById,
      brandById,
      categoryTree,
      priceOptionsByItemId.get(row.id) ?? [],
      history,
      versionsByItemId.get(row.id)?.[0],
    );
    if (includeVariantDetails) return item;

    const browseItem: EstimateRowItem = { ...item };
    delete browseItem.componentVersionId;
    delete browseItem.history;
    delete browseItem.notes;
    delete browseItem.priceOptions;
    delete browseItem.sourceUrl;
    return browseItem;
  });

  return {
    workspaceId,
    categoryTree,
    suppliers,
    brands,
    libraryFolders,
    libraryItems,
    isPartial,
    loadedComponentCount: libraryItems.length,
    totalComponentCount: totalComponentCount ?? (isPartial ? undefined : libraryItems.length),
  };
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
  const legacyAdjustmentPercentage = Number(row.contingency_percentage ?? 0);
  const adjustmentPercentage = row.adjustment_percentage === undefined
    ? legacyAdjustmentPercentage
    : Number(row.adjustment_percentage ?? 0);
  const contingencyPercentage = 0;
  const miscCost = Number(row.misc_cost);
  const subTotal = itemCost * quantity;
  const contingencyValue = 0;
  const adjustmentValue = (subTotal * adjustmentPercentage) / 100;
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
    adjustmentPercentage,
    adjustmentValue,
    miscCost,
    miscCostDefault: miscCost,
    totalItemCosts: subTotal + miscCost + contingencyValue + adjustmentValue,
    imageUrl: readString(sourceSnapshot.imageUrl),
    category: readString(sourceSnapshot.category) ?? "General",
    categoryNodeId: categoryNodeId ?? undefined,
    brand: readString(sourceSnapshot.brand),
    brandId: readString(sourceSnapshot.brandId),
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
  database,
  workspaceId,
  includeDetailGraph = true,
  itemLimit,
  itemIds,
}: {
  database: D1DatabaseLike;
  workspaceId: string;
  // U18: the in-estimate panel renders only the slim EstimateRowItem fields and
  // never reads the per-item versions / price history / state history /
  // attachments. When false, those 4 audit/attachment queries are skipped
  // (the bulk of the cold-load waterfall + the unbounded-growth tables). The
  // cost-determining price-options + cost-entries queries are still loaded so
  // the panel cost stays byte-identical to the full loader. Callers that need
  // audit history / attachments pass true, while browse-first surfaces can
  // hydrate a selected row on demand.
  includeDetailGraph?: boolean;
  itemLimit?: number;
  itemIds?: string[];
}): Promise<ComponentRowsLibraryDataset> {
  return loadCurrentWorkspaceComponentRowsLibraryAppPath({
    database,
    workspaceId,
    includeDetailGraph,
    itemLimit,
    itemIds,
  });
}

async function loadCurrentWorkspaceComponentRowsLibraryAppPath({
  database,
  workspaceId,
  includeDetailGraph = true,
  itemLimit,
  itemIds,
}: {
  database: D1DatabaseLike;
  workspaceId: string;
  includeDetailGraph?: boolean;
  itemLimit?: number;
  itemIds?: string[];
}): Promise<ComponentRowsLibraryDataset> {
  const boundedItemLimit = normalizeComponentLibraryItemLimit(itemLimit);
  const selectedItemIds = itemIds ? [...new Set(itemIds.filter(isUuid))] : [];
  const [categoryRows, suppliers, persistedBrands, libraryFolders, itemRows] = await Promise.all([
    all<ComponentLibraryCategoryRow>(
      database,
      "SELECT * FROM component_category_nodes ORDER BY sort_order ASC, label ASC",
    ),
    all<ComponentLibrarySupplier>(
      database,
      `SELECT id, name, normalized_name, sort_order
       FROM component_suppliers
       WHERE workspace_id = ?
       ORDER BY sort_order ASC, name ASC`,
      [workspaceId],
    ),
    all<ComponentLibraryBrand>(
      database,
      `SELECT id, name, normalized_name, sort_order
       FROM component_brands
       WHERE workspace_id = ?
       ORDER BY sort_order ASC, name ASC`,
      [workspaceId],
    ),
    fetchLibraryFolders(database, workspaceId),
    loadWorkspaceCostLibraryItemRows({
      database,
      workspaceId,
      itemLimit: boundedItemLimit,
      itemIds: itemIds === undefined ? undefined : selectedItemIds,
    }),
  ]);

  const loadedItemIds = itemRows.map((row) => row.id);
  const isBoundedItemPage = boundedItemLimit !== undefined || selectedItemIds.length > 0;
  // U18 cost fidelity: the slim EstimateRowItem cost derives from the default
  // price option and its current cost entry (normalizeComponentLibraryItem +
  // normalizePriceOption). These two queries are ALWAYS loaded so the lite panel
  // dataset is byte-identical to the full one — never reconstructed from the
  // (potentially lagging) denormalized cost_library_items columns alone.
  const [priceOptionRows, costEntryRows] = loadedItemIds.length > 0
    ? await Promise.all([
        isBoundedItemPage
          ? collectComponentLibraryRowsForSelectedItems<ComponentPriceOptionRow>(
              database,
              "cost_library_item_price_options",
              loadedItemIds,
              "ORDER BY is_default DESC, COALESCE(json_extract(metadata_json, '$.variantSortOrder'), 0) ASC, created_at ASC",
              " AND workspace_id = ?",
              [workspaceId],
            )
          : collectComponentLibraryWorkspaceRowsForItems<ComponentPriceOptionRow>(
              database,
              "cost_library_item_price_options",
              workspaceId,
              loadedItemIds,
              "ORDER BY is_default DESC, COALESCE(json_extract(metadata_json, '$.variantSortOrder'), 0) ASC, created_at ASC",
            ),
        isBoundedItemPage
          ? collectComponentLibraryRowsForSelectedItems<ComponentVariantCostEntryRow>(
              database,
              "cost_library_item_variant_cost_entries",
              loadedItemIds,
              "ORDER BY is_current DESC, pricing_date DESC, created_at DESC",
              " AND workspace_id = ? AND deleted_at IS NULL",
              [workspaceId],
            )
          : collectComponentLibraryWorkspaceRowsForItems<ComponentVariantCostEntryRow>(
              database,
              "cost_library_item_variant_cost_entries",
              workspaceId,
              loadedItemIds,
              "ORDER BY is_current DESC, pricing_date DESC, created_at DESC",
              " AND deleted_at IS NULL",
            ),
      ])
    : [
        [],
        [],
      ];
  // U18: the audit + attachment graph (versions / price history / state history
  // / variant attachments) is never read by list/card/table browse views — and
  // these are the unbounded-growth tables. Browse loaders skip them; selected
  // component detail loaders use includeDetailGraph: true for the full set.
  const [versionRows, priceHistoryRows, stateHistoryRows, attachmentRows] = (loadedItemIds.length > 0 && includeDetailGraph)
    ? await Promise.all([
        isBoundedItemPage
          ? collectComponentLibraryRowsForSelectedItems<ComponentVersionRow>(
              database,
              "cost_library_item_versions",
              loadedItemIds,
              "ORDER BY version_number DESC",
              " AND workspace_id = ?",
              [workspaceId],
            )
          : collectComponentLibraryWorkspaceRowsForItems<ComponentVersionRow>(
              database,
              "cost_library_item_versions",
              workspaceId,
              loadedItemIds,
              "ORDER BY version_number DESC",
            ),
        isBoundedItemPage
          ? collectComponentLibraryRowsForSelectedItems<ComponentPriceHistoryRow>(
              database,
              "cost_library_item_price_history",
              loadedItemIds,
              "ORDER BY effective_at DESC",
              " AND workspace_id = ?",
              [workspaceId],
            )
          : collectComponentLibraryWorkspaceRowsForItems<ComponentPriceHistoryRow>(
              database,
              "cost_library_item_price_history",
              workspaceId,
              loadedItemIds,
              "ORDER BY effective_at DESC",
            ),
        isBoundedItemPage
          ? collectComponentLibraryRowsForSelectedItems<ComponentStateHistoryRow>(
              database,
              "cost_library_item_state_history",
              loadedItemIds,
              "ORDER BY effective_at DESC",
              " AND workspace_id = ?",
              [workspaceId],
            )
          : collectComponentLibraryWorkspaceRowsForItems<ComponentStateHistoryRow>(
              database,
              "cost_library_item_state_history",
              workspaceId,
              loadedItemIds,
              "ORDER BY effective_at DESC",
            ),
        isBoundedItemPage
          ? collectComponentLibraryRowsForSelectedItems<ComponentVariantAttachmentRow>(
              database,
              "cost_library_item_variant_attachments",
              loadedItemIds,
              "ORDER BY created_at DESC",
              " AND workspace_id = ?",
              [workspaceId],
            )
          : collectComponentLibraryWorkspaceRowsForItems<ComponentVariantAttachmentRow>(
              database,
              "cost_library_item_variant_attachments",
              workspaceId,
              loadedItemIds,
              "ORDER BY created_at DESC",
            ),
      ])
    : [
        [],
        [],
        [],
        [],
      ];

  return buildComponentRowsLibraryDataset({
    workspaceId,
    categoryRows,
    suppliers,
    persistedBrands,
    libraryFolders,
    itemRows,
    priceOptionRows,
    costEntryRows,
    includeVariantDetails: includeDetailGraph,
    isPartial: boundedItemLimit !== undefined && itemRows.length >= boundedItemLimit,
    versionRows,
    priceHistoryRows,
    stateHistoryRows,
    attachmentRows,
  });
}

async function loadCurrentWorkspaceEstimateTemplatesAppPath({
  database,
  workspaceId,
  templateId,
}: {
  database: D1DatabaseLike;
  workspaceId: string;
  templateId?: string | null;
}): Promise<EstimateTemplate[]> {
  const persistedTemplateRows = await all<EstimateTemplateRow>(
    database,
    `SELECT *
     FROM estimate_templates
     WHERE workspace_id = ?${templateId ? " AND id = ?" : ""}
     ORDER BY sort_order ASC, name ASC`,
    templateId ? [workspaceId, templateId] : [workspaceId],
  );
  let libraryTemplates = getTemplateTableFallbackTemplates({ isTemplateTableMissing: false });

  if (persistedTemplateRows.length > 0) {
    const templateIds = persistedTemplateRows.map((template) => template.id);
    const [templateNodes, templateRowItems] = await Promise.all([
      all<EstimateTemplateNodeRow>(
        database,
        `SELECT *
         FROM estimate_template_nodes
         WHERE template_id IN (${placeholders(templateIds)})
         ORDER BY sort_order ASC`,
        templateIds,
      ),
      all<EstimateTemplateRowItemRow>(
        database,
        `SELECT *
         FROM estimate_template_row_items
         WHERE template_id IN (${placeholders(templateIds)})
         ORDER BY sort_order ASC`,
        templateIds,
      ),
    ]);

    libraryTemplates = buildEstimateTemplatesFromRows({
      templates: persistedTemplateRows,
      nodes: templateNodes,
      rowItems: templateRowItems,
    });
  }

  return libraryTemplates;
}

async function loadCurrentWorkspaceEstimateTemplates({
  database,
  workspaceId,
  templateId,
}: {
  database: D1DatabaseLike;
  workspaceId: string;
  templateId?: string | null;
}): Promise<EstimateTemplate[]> {
  return loadCurrentWorkspaceEstimateTemplatesAppPath({ database, workspaceId, templateId });
}

export async function getCurrentWorkspaceComponentRowsLibrary(options: ComponentRowsLibraryLoadOptions = {}): Promise<ComponentRowsLibraryDataset> {
  const { workspace } = await ensureDefaultWorkspace();
  const database = await requireComponentLibraryRepositoryD1Database();
  return loadCurrentWorkspaceComponentRowsLibrary({
    database,
    workspaceId: workspace.id,
    includeDetailGraph: options.includeDetailGraph,
    itemLimit: options.itemLimit,
    itemIds: options.itemIds,
  });
}

export async function getCurrentWorkspaceComponentRowDetail(itemId: string): Promise<EstimateRowItem | null> {
  if (!isUuid(itemId)) return null;
  const library = await getCurrentWorkspaceComponentRowsLibrary({
    includeDetailGraph: true,
    itemIds: [itemId],
  });
  return library.libraryItems[0] ?? null;
}

export type CurrentWorkspaceEstimateTemplatesSeed = {
  templates: EstimateTemplate[];
  userId: string;
  workspaceId: string;
};

export async function getCurrentWorkspaceEstimateTemplatesSeed(): Promise<CurrentWorkspaceEstimateTemplatesSeed> {
  const { workspace, profile } = await ensureDefaultWorkspace();
  const database = await requireComponentLibraryRepositoryD1Database();
  return {
    templates: await loadCurrentWorkspaceEstimateTemplates({ database, workspaceId: workspace.id }),
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
  brand: string;
  supplier: string;
  unit: string;
  unitCost: number;
  imageUrl?: string;
  pricingSource?: string | null;
  pricingDate?: string | null;
  confidence?: string | null;
  lifecycleState: CostLibraryLifecycleState;
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
  "id, name, category, brand, supplier, unit, unit_cost, thumbnail_path, pricing_source, pricing_date, confidence, lifecycle_state, updated_at";

type LibraryOverviewComponentRow = Pick<
  CostLibraryItemRow,
  | "id"
  | "name"
  | "category"
  | "brand"
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
    brand: row.brand ?? "",
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

type LibraryOverviewSummaryPayload = {
  componentCount: number;
  categoryCount: number;
  supplierCount: number;
  brandCount: number;
  templateCount: number;
  templateCategories: string[];
  recentComponents: LibraryOverviewComponentRow[];
  recentTemplateRows: EstimateTemplateRow[];
  recentTemplateNodes: EstimateTemplateNodeRow[];
  recentTemplateRowItems: EstimateTemplateRowItemRow[];
  health: LibraryOverviewHealth;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function assertLibraryOverviewRpcString(value: unknown, path: string): string {
  if (typeof value !== "string") {
    throw new Error(`library overview RPC invalid shape: ${path} must be a string`);
  }
  return value;
}

function assertLibraryOverviewRpcOptionalString(value: unknown, path: string): string | null {
  if (value === null || value === undefined) return null;
  if (typeof value !== "string") {
    throw new Error(`library overview RPC invalid shape: ${path} must be a string or null`);
  }
  return value;
}

function assertLibraryOverviewRpcNumber(value: unknown, path: string): number {
  if (typeof value !== "number") {
    throw new Error(`library overview RPC invalid shape: ${path} must be a number`);
  }
  return value;
}

function assertLibraryOverviewRpcOptionalNumber(value: unknown, path: string): number | null {
  if (value === null || value === undefined) return null;
  return assertLibraryOverviewRpcNumber(value, path);
}

function assertLibraryOverviewRpcJson(value: unknown, path: string): Json {
  if (value === undefined) {
    throw new Error(`library overview RPC invalid shape: ${path} must be JSON`);
  }
  return value as Json;
}

function readLibraryOverviewRpcArray<T>(
  payload: Record<string, unknown>,
  key: string,
  guard: (value: Record<string, unknown>, path: string) => T,
): T[] {
  const value = payload[key];
  if (!Array.isArray(value)) throw new Error(`library_overview_summary invalid shape: ${key} is not an array`);
  return value.map((item, index) => {
    if (!isRecord(item)) throw new Error(`library_overview_summary invalid array element: ${key}[${index}] is not an object`);
    return guard(item, `${key}[${index}]`);
  });
}

function assertLibraryOverviewComponentRow(value: Record<string, unknown>, path: string): LibraryOverviewComponentRow {
  return {
    id: assertLibraryOverviewRpcString(value.id, `${path}.id`),
    name: assertLibraryOverviewRpcString(value.name, `${path}.name`),
    category: assertLibraryOverviewRpcString(value.category, `${path}.category`),
    brand: assertLibraryOverviewRpcOptionalString(value.brand, `${path}.brand`),
    supplier: assertLibraryOverviewRpcOptionalString(value.supplier, `${path}.supplier`),
    unit: assertLibraryOverviewRpcString(value.unit, `${path}.unit`),
    unit_cost: assertLibraryOverviewRpcNumber(value.unit_cost, `${path}.unit_cost`),
    thumbnail_path: assertLibraryOverviewRpcOptionalString(value.thumbnail_path, `${path}.thumbnail_path`),
    pricing_source: assertLibraryOverviewRpcOptionalString(value.pricing_source, `${path}.pricing_source`),
    pricing_date: assertLibraryOverviewRpcOptionalString(value.pricing_date, `${path}.pricing_date`),
    confidence: assertLibraryOverviewRpcOptionalString(value.confidence, `${path}.confidence`),
    lifecycle_state: assertLibraryOverviewRpcString(value.lifecycle_state, `${path}.lifecycle_state`) as LibraryOverviewComponentRow["lifecycle_state"],
    updated_at: assertLibraryOverviewRpcString(value.updated_at, `${path}.updated_at`),
  };
}

function assertLibraryOverviewTemplateRow(value: Record<string, unknown>, path: string): EstimateTemplateRow {
  return {
    id: assertLibraryOverviewRpcString(value.id, `${path}.id`),
    workspace_id: assertLibraryOverviewRpcString(value.workspace_id, `${path}.workspace_id`),
    name: assertLibraryOverviewRpcString(value.name, `${path}.name`),
    description: assertLibraryOverviewRpcString(value.description, `${path}.description`),
    category: assertLibraryOverviewRpcString(value.category, `${path}.category`),
    sort_order: assertLibraryOverviewRpcNumber(value.sort_order, `${path}.sort_order`),
    metadata: assertLibraryOverviewRpcJson(value.metadata, `${path}.metadata`),
    created_by: assertLibraryOverviewRpcOptionalString(value.created_by, `${path}.created_by`),
    created_at: assertLibraryOverviewRpcString(value.created_at, `${path}.created_at`),
    updated_at: assertLibraryOverviewRpcString(value.updated_at, `${path}.updated_at`),
  };
}

function assertLibraryOverviewTemplateNodeRow(value: Record<string, unknown>, path: string): EstimateTemplateNodeRow {
  return {
    id: assertLibraryOverviewRpcString(value.id, `${path}.id`),
    template_id: assertLibraryOverviewRpcString(value.template_id, `${path}.template_id`),
    parent_id: assertLibraryOverviewRpcOptionalString(value.parent_id, `${path}.parent_id`),
    kind: assertLibraryOverviewRpcString(value.kind, `${path}.kind`) as EstimateTemplateNodeRow["kind"],
    name: assertLibraryOverviewRpcString(value.name, `${path}.name`),
    sort_order: assertLibraryOverviewRpcNumber(value.sort_order, `${path}.sort_order`),
    metadata: assertLibraryOverviewRpcJson(value.metadata, `${path}.metadata`),
    created_at: assertLibraryOverviewRpcString(value.created_at, `${path}.created_at`),
    updated_at: assertLibraryOverviewRpcString(value.updated_at, `${path}.updated_at`),
  };
}

function assertLibraryOverviewTemplateRowItemRow(value: Record<string, unknown>, path: string): EstimateTemplateRowItemRow {
  return {
    id: assertLibraryOverviewRpcString(value.id, `${path}.id`),
    template_id: assertLibraryOverviewRpcString(value.template_id, `${path}.template_id`),
    template_node_id: assertLibraryOverviewRpcString(value.template_node_id, `${path}.template_node_id`),
    sort_order: assertLibraryOverviewRpcNumber(value.sort_order, `${path}.sort_order`),
    source_library_item_id: assertLibraryOverviewRpcOptionalString(value.source_library_item_id, `${path}.source_library_item_id`),
    source_snapshot: assertLibraryOverviewRpcJson(value.source_snapshot, `${path}.source_snapshot`),
    category_node_id: assertLibraryOverviewRpcOptionalString(value.category_node_id, `${path}.category_node_id`),
    supplier_id: assertLibraryOverviewRpcOptionalString(value.supplier_id, `${path}.supplier_id`),
    material: assertLibraryOverviewRpcString(value.material, `${path}.material`),
    description: assertLibraryOverviewRpcString(value.description, `${path}.description`),
    supplier: assertLibraryOverviewRpcString(value.supplier, `${path}.supplier`),
    unit: assertLibraryOverviewRpcString(value.unit, `${path}.unit`),
    quantity: assertLibraryOverviewRpcNumber(value.quantity, `${path}.quantity`),
    unit_cost: assertLibraryOverviewRpcNumber(value.unit_cost, `${path}.unit_cost`),
    misc_cost: assertLibraryOverviewRpcNumber(value.misc_cost, `${path}.misc_cost`),
    contingency_percentage: assertLibraryOverviewRpcNumber(value.contingency_percentage, `${path}.contingency_percentage`),
    adjustment_percentage: assertLibraryOverviewRpcOptionalNumber(value.adjustment_percentage, `${path}.adjustment_percentage`)
      ?? assertLibraryOverviewRpcNumber(value.contingency_percentage, `${path}.contingency_percentage`),
    discipline: assertLibraryOverviewRpcString(value.discipline, `${path}.discipline`),
    designation: assertLibraryOverviewRpcString(value.designation, `${path}.designation`),
    link_state: assertLibraryOverviewRpcString(value.link_state, `${path}.link_state`) as EstimateTemplateRowItemRow["link_state"],
    metadata: assertLibraryOverviewRpcJson(value.metadata, `${path}.metadata`),
    created_at: assertLibraryOverviewRpcString(value.created_at, `${path}.created_at`),
    updated_at: assertLibraryOverviewRpcString(value.updated_at, `${path}.updated_at`),
  };
}

function assertLibraryOverviewHealth(value: unknown): LibraryOverviewHealth {
  if (!isRecord(value)) throw new Error("library_overview_summary invalid shape: health is not an object");
  return {
    staleComponentCount: assertLibraryOverviewRpcNumber(value.staleComponentCount, "health.staleComponentCount"),
    discontinuedInUseCount: assertLibraryOverviewRpcNumber(value.discontinuedInUseCount, "health.discontinuedInUseCount"),
    missingBrandCount: assertLibraryOverviewRpcNumber(value.missingBrandCount, "health.missingBrandCount"),
    lastLibraryUpdate: assertLibraryOverviewRpcOptionalString(value.lastLibraryUpdate, "health.lastLibraryUpdate"),
  };
}

export function parseLibraryOverviewSummaryPayload(value: unknown): LibraryOverviewSummaryPayload {
  if (!isRecord(value)) throw new Error("library_overview_summary invalid payload");
  const templateCategories = value.templateCategories;
  if (!Array.isArray(templateCategories)) {
    throw new Error("library_overview_summary invalid shape: templateCategories is not an array");
  }
  return {
    componentCount: assertLibraryOverviewRpcNumber(value.componentCount, "componentCount"),
    categoryCount: assertLibraryOverviewRpcNumber(value.categoryCount, "categoryCount"),
    supplierCount: assertLibraryOverviewRpcNumber(value.supplierCount, "supplierCount"),
    brandCount: assertLibraryOverviewRpcNumber(value.brandCount, "brandCount"),
    templateCount: assertLibraryOverviewRpcNumber(value.templateCount, "templateCount"),
    templateCategories: templateCategories.map((category, index) =>
      assertLibraryOverviewRpcString(category, `templateCategories[${index}]`),
    ),
    recentComponents: readLibraryOverviewRpcArray(value, "recentComponents", assertLibraryOverviewComponentRow),
    recentTemplateRows: readLibraryOverviewRpcArray(value, "recentTemplateRows", assertLibraryOverviewTemplateRow),
    recentTemplateNodes: readLibraryOverviewRpcArray(value, "recentTemplateNodes", assertLibraryOverviewTemplateNodeRow),
    recentTemplateRowItems: readLibraryOverviewRpcArray(value, "recentTemplateRowItems", assertLibraryOverviewTemplateRowItemRow),
    health: assertLibraryOverviewHealth(value.health),
  };
}

function buildLibraryOverviewFromSummaryPayload(payload: LibraryOverviewSummaryPayload): LibraryOverview {
  const builtById = new Map(
    buildEstimateTemplatesFromRows({
      templates: payload.recentTemplateRows,
      nodes: payload.recentTemplateNodes,
      rowItems: payload.recentTemplateRowItems,
    }).map((template) => [template.id, template]),
  );
  const templateCategorySet = new Set(payload.templateCategories);

  return {
    componentCount: payload.componentCount,
    categoryCount: payload.categoryCount,
    supplierCount: payload.supplierCount,
    brandCount: payload.brandCount,
    templateCount: payload.templateCount,
    templateGroupCount: templateCategorySet.size,
    templateCategories: [...templateCategorySet].sort((left, right) => left.localeCompare(right)),
    recentComponents: payload.recentComponents.map(toLibraryOverviewComponent),
    recentTemplates: payload.recentTemplateRows
      .map((row) => builtById.get(row.id))
      .filter((template): template is EstimateTemplate => Boolean(template))
      .map(toLibraryOverviewTemplate),
    health: payload.health,
  };
}

export async function getLibraryOverview(): Promise<LibraryOverview> {
  return getLibraryOverviewAppPath();
}

type CountRow = { count: number };

async function getLibraryOverviewAppPath(): Promise<LibraryOverview> {
  const { workspace } = await ensureDefaultWorkspace();
  const database = await requireComponentLibraryRepositoryD1Database();
  const workspaceId = workspace.id;
  const stalePricingCutoff = new Date(Date.now() - LIBRARY_OVERVIEW_STALE_PRICING_DAYS * 24 * 60 * 60 * 1000)
    .toISOString()
    .slice(0, 10);

  const [
    componentCountRow,
    categoryCountRow,
    supplierCountRow,
    brandCountRow,
    recentComponentRows,
    recentTemplateRows,
    templateCategoryRows,
    staleCountRow,
    missingBrandCountRow,
    lastUpdateRow,
    discontinuedRows,
  ] = await Promise.all([
    first<CountRow>(
      database,
      "SELECT COUNT(*) AS count FROM cost_library_items WHERE workspace_id = ? AND lifecycle_state <> 'archived'",
      [workspaceId],
    ),
    first<CountRow>(
      database,
      "SELECT COUNT(*) AS count FROM component_category_nodes WHERE parent_id IS NULL",
    ),
    first<CountRow>(
      database,
      "SELECT COUNT(*) AS count FROM component_suppliers WHERE workspace_id = ?",
      [workspaceId],
    ),
    first<CountRow>(
      database,
      "SELECT COUNT(*) AS count FROM component_brands WHERE workspace_id = ?",
      [workspaceId],
    ),
    all<LibraryOverviewComponentRow>(
      database,
      `SELECT ${LIBRARY_DASHBOARD_RECENT_COMPONENT_COLUMNS}
       FROM cost_library_items
       WHERE workspace_id = ?
         AND lifecycle_state <> 'archived'
       ORDER BY updated_at DESC
       LIMIT 6`,
      [workspaceId],
    ),
    all<EstimateTemplateRow>(
      database,
      `SELECT *
       FROM estimate_templates
       WHERE workspace_id = ?
       ORDER BY updated_at DESC
       LIMIT 5`,
      [workspaceId],
    ),
    all<Pick<EstimateTemplateRow, "category">>(
      database,
      "SELECT category FROM estimate_templates WHERE workspace_id = ?",
      [workspaceId],
    ),
    first<CountRow>(
      database,
      `SELECT COUNT(*) AS count
       FROM cost_library_items
       WHERE workspace_id = ?
         AND lifecycle_state <> 'archived'
         AND pricing_date IS NOT NULL
         AND pricing_date < ?`,
      [workspaceId, stalePricingCutoff],
    ),
    first<CountRow>(
      database,
      `SELECT COUNT(*) AS count
       FROM cost_library_items
       WHERE workspace_id = ?
         AND lifecycle_state <> 'archived'
         AND brand_id IS NULL
         AND (brand IS NULL OR brand = '')`,
      [workspaceId],
    ),
    first<Pick<CostLibraryItemRow, "updated_at">>(
      database,
      `SELECT updated_at
       FROM cost_library_items
       WHERE workspace_id = ?
       ORDER BY updated_at DESC
       LIMIT 1`,
      [workspaceId],
    ),
    all<Pick<CostLibraryItemRow, "id">>(
      database,
      "SELECT id FROM cost_library_items WHERE workspace_id = ? AND lifecycle_state = 'discontinued'",
      [workspaceId],
    ),
  ]);

  const recentComponents: LibraryOverviewComponent[] = recentComponentRows.map(toLibraryOverviewComponent);

  // Templates: counts need nodes + rows, fetched for just the 5 recent ids.
  let recentTemplates: LibraryOverviewTemplate[] = [];
  if (recentTemplateRows.length > 0) {
    const recentTemplateIds = recentTemplateRows.map((template) => template.id);
    const [templateNodes, templateRowItems] = await Promise.all([
      all<EstimateTemplateNodeRow>(
        database,
        `SELECT *
         FROM estimate_template_nodes
         WHERE template_id IN (${placeholders(recentTemplateIds)})
         ORDER BY sort_order ASC`,
        recentTemplateIds,
      ),
      all<EstimateTemplateRowItemRow>(
        database,
        `SELECT *
         FROM estimate_template_row_items
         WHERE template_id IN (${placeholders(recentTemplateIds)})
         ORDER BY sort_order ASC`,
        recentTemplateIds,
      ),
    ]);

    const builtById = new Map(
      buildEstimateTemplatesFromRows({
        templates: recentTemplateRows,
        nodes: templateNodes,
        rowItems: templateRowItems,
      }).map((template) => [template.id, template]),
    );
    // buildEstimateTemplatesFromRows sorts by sort_order; restore recency order.
    recentTemplates = recentTemplateRows
      .map((row) => builtById.get(row.id))
      .filter((template): template is EstimateTemplate => Boolean(template))
      .map(toLibraryOverviewTemplate);
  } else {
    recentTemplates = getTemplateTableFallbackTemplates({ isTemplateTableMissing: false })
      .slice(0, 5)
      .map(toLibraryOverviewTemplate);
  }

  const templateCategorySet = new Set(
    templateCategoryRows.map((row) => row.category),
  );
  const templateCount = templateCategoryRows.length;

  // Discontinued items still referenced by template or estimate rows. The
  // discontinued id list is small, so two indexed .in() lookups stay cheap.
  let discontinuedInUseCount = 0;
  const discontinuedIds = discontinuedRows.map((row) => row.id);
  if (discontinuedIds.length > 0) {
    const [templateRefs, estimateRefs] = await Promise.all([
      all<Pick<EstimateTemplateRowItemRow, "source_library_item_id">>(
        database,
        `SELECT source_library_item_id
         FROM estimate_template_row_items
         WHERE source_library_item_id IN (${placeholders(discontinuedIds)})`,
        discontinuedIds,
      ),
      all<{ source_library_item_id: string | null }>(
        database,
        `SELECT source_library_item_id
         FROM estimate_row_items
         WHERE source_library_item_id IN (${placeholders(discontinuedIds)})`,
        discontinuedIds,
      ),
    ]);

    const inUseIds = new Set<string>();
    for (const row of templateRefs) {
      if (row.source_library_item_id) inUseIds.add(row.source_library_item_id);
    }
    for (const row of estimateRefs) {
      if (row.source_library_item_id) inUseIds.add(row.source_library_item_id);
    }
    discontinuedInUseCount = inUseIds.size;
  }

  return {
    componentCount: componentCountRow?.count ?? 0,
    categoryCount: categoryCountRow?.count ?? 0,
    supplierCount: supplierCountRow?.count ?? 0,
    brandCount: brandCountRow?.count ?? 0,
    templateCount,
    templateGroupCount: templateCategorySet.size,
    templateCategories: [...templateCategorySet].sort((left, right) => left.localeCompare(right)),
    recentComponents,
    recentTemplates,
    health: {
      staleComponentCount: staleCountRow?.count ?? 0,
      discontinuedInUseCount,
      missingBrandCount: missingBrandCountRow?.count ?? 0,
      lastLibraryUpdate: lastUpdateRow?.updated_at ?? null,
    },
  };
}

export async function getLibraryDashboardSpotlight(): Promise<LibraryDashboardSpotlight | null> {
  const { workspace } = await ensureDefaultWorkspace();
  const database = await requireComponentLibraryRepositoryD1Database();
  const workspaceId = workspace.id;

  const [componentCountRow, recentComponentRows, templateCountRow] = await Promise.all([
    first<CountRow>(
      database,
      "SELECT COUNT(*) AS count FROM cost_library_items WHERE workspace_id = ? AND lifecycle_state <> 'archived'",
      [workspaceId],
    ),
    all<LibraryOverviewComponentRow>(
      database,
      `SELECT ${LIBRARY_DASHBOARD_RECENT_COMPONENT_COLUMNS}
       FROM cost_library_items
       WHERE workspace_id = ?
         AND lifecycle_state <> 'archived'
       ORDER BY updated_at DESC
       LIMIT 5`,
      [workspaceId],
    ),
    first<CountRow>(
      database,
      "SELECT COUNT(*) AS count FROM estimate_templates WHERE workspace_id = ?",
      [workspaceId],
    ),
  ]);

  return {
    componentCount: componentCountRow?.count ?? 0,
    templateCount: templateCountRow?.count ?? 0,
    recentComponents: recentComponentRows.map((row) => {
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
  const database = await requireComponentLibraryRepositoryD1Database();
  const templates = await loadCurrentWorkspaceEstimateTemplates({
    database,
    workspaceId: workspace.id,
    templateId,
  });
  return templates[0] ?? null;
}

export async function getCurrentWorkspaceComponentLibrary(): Promise<ComponentLibraryDataset> {
  const { workspace } = await ensureDefaultWorkspace();
  const database = await requireComponentLibraryRepositoryD1Database();
  const [componentRows, templates] = await Promise.all([
    loadCurrentWorkspaceComponentRowsLibrary({ database, workspaceId: workspace.id }),
    loadCurrentWorkspaceEstimateTemplates({ database, workspaceId: workspace.id }),
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
 * reads. Do NOT use this combined, capped helper for the Components management
 * route: that surface needs all component rows, so it uses the rows-only browse
 * loader plus selected-row detail hydration instead.
 */
export async function getCurrentWorkspaceComponentLibraryLite(): Promise<ComponentLibraryDataset> {
  const { workspace } = await ensureDefaultWorkspace();
  const database = await requireComponentLibraryRepositoryD1Database();
  const [componentRows, templates] = await Promise.all([
    loadCurrentWorkspaceComponentRowsLibrary({
      database,
      workspaceId: workspace.id,
      includeDetailGraph: false,
      itemLimit: SIDEBAR_COMPONENT_LIBRARY_DEFAULT_LIMIT,
    }),
    loadCurrentWorkspaceEstimateTemplates({ database, workspaceId: workspace.id }),
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
