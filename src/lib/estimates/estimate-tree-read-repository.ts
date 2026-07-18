import "server-only";

import type { D1DatabaseLike, D1Value } from "@/lib/cloudflare/d1";
import { readEstimateRowMetadata } from "@/lib/estimates/express-components";
import {
  buildEstimateTreeSubtreePayload,
  type EstimateTreeSubtreeCompleteness,
  type EstimateTreeSubtreePayload,
} from "@/lib/estimates/estimate-tree-lazy";
import { normalizeEstimateRowImageUrl } from "@/lib/estimates/image-url";
import { readEstimateRowPriceOptionsSnapshot } from "@/lib/estimates/source-snapshot-price-options";
import { normalizeEstimateTreeNodeKind } from "@/lib/estimates/tree-hierarchy";
import type {
  EstimateRowItem,
  EstimateRowLinkState,
  EstimateSheetAdjustment,
  EstimateTabSummary,
  EstimateTreeNode,
} from "@/lib/estimates/types";
import type { EstimateTemplateLinkProjection } from "@/lib/component-library/template-link-types";
import { traced } from "@/lib/perf/server-timing";
import {
  normalizeEstimateRecord,
  type EstimateRecordWithLegacy,
} from "@/lib/repositories/estimate-schema-compat";
import type { Json } from "@/lib/types/json";

type EstimateNodeKind = "assembly" | "lot" | "structure" | "level" | "area" | "group" | "general";

type EstimateTabQueryRow = {
  id: string;
  estimate_id: string;
  name: string;
  sort_order: number;
  is_default: boolean | number;
  archived_at: string | null;
  metadata: Json;
  created_at: string;
  updated_at: string;
};

type EstimateSheetAdjustmentQueryRow = {
  estimate_id: string;
  mode: "contingency" | "discount";
  percentage: number;
  row_revision: number;
  updated_at: string | undefined;
  updated_by: string | null;
};

export type EstimateTreeNodeQueryRow = {
  id: string;
  kind: EstimateNodeKind;
  name: string;
  parent_id: string | null;
  sort_order: number;
};

export type EstimateTreeRowItemQueryRow = {
  id: string;
  node_id: string;
  sort_order: number;
  material: string;
  description: string;
  supplier: string;
  supplier_id: string | null;
  unit: string;
  unit_cost: number;
  quantity: number;
  quantity_base: number | null;
  quantity_contingency_amount: number | null;
  contingency_percentage: number;
  adjustment_percentage: number;
  misc_cost: number;
  row_revision: number;
  category_node_id: string | null;
  discipline: string | null;
  designation: string | null;
  source_library_item_id: string | null;
  link_state: EstimateRowLinkState | "linked";
  source_snapshot: Json | null;
  metadata: Json;
  created_at: string;
};

export type EstimateTreeLoadOptions = {
  maxNodeCount?: number;
  maxRowItemCount?: number;
  /**
   * Opt-in read-only fallback for reusable-source and export reads when the
   * estimate-tabs schema is not yet present.
   */
  allowLegacyFallback?: boolean;
};

export type EstimateTreeLoadLimitState = {
  maxNodeCount: number | null;
  maxRowItemCount: number | null;
  fetchedNodeCount: number;
  fetchedRowItemCount: number;
  didExceedNodeLimit: boolean;
  didExceedRowItemLimit: boolean;
};

export type EstimateTabTreePayloadD1 = {
  estimate: ReturnType<typeof normalizeEstimateRecord>;
  selectedNodeId: string | null;
  tree: EstimateTreeNode[];
  sheetAdjustment?: EstimateSheetAdjustment;
  loadLimitState?: EstimateTreeLoadLimitState;
};

export type EstimateTabTreeD1Result = EstimateTabTreePayloadD1 & {
  tab: EstimateTabSummary | null;
};

export type EstimateNodeSubtreeD1Result = {
  estimate: ReturnType<typeof normalizeEstimateRecord>;
  tab: EstimateTabSummary | null;
  selectedNodeId: string | null;
  tree: EstimateTreeNode[];
  payload: EstimateTreeSubtreePayload | null;
};

export type EstimateTabTree = {
  tab: EstimateTabSummary;
  tree: EstimateTreeNode[];
};

export type EstimateTreesForTabsD1Result = {
  estimate: ReturnType<typeof normalizeEstimateRecord>;
  sheetAdjustment?: EstimateSheetAdjustment;
  tabs: EstimateTabTree[];
  loadLimitState?: EstimateTreeLoadLimitState;
};

const ESTIMATE_TREE_ROW_NODE_BATCH_SIZE = 64;
const LEGACY_MAIN_TAB_ID = "legacy-main";
const ESTIMATE_TREE_NODE_COLUMNS = "id, kind, name, parent_id, sort_order";
const ESTIMATE_TREE_ROW_ITEM_COLUMNS =
  "id, node_id, sort_order, material, description, supplier, supplier_id, unit, unit_cost, quantity, quantity_base, quantity_contingency_amount, contingency_percentage, adjustment_percentage, misc_cost, row_revision, category_node_id, discipline, designation, source_library_item_id, link_state, source_snapshot_json AS source_snapshot, metadata_json AS metadata, created_at";

function placeholders(valuesOrCount: number | readonly unknown[]) {
  const count = typeof valuesOrCount === "number" ? valuesOrCount : valuesOrCount.length;
  if (count <= 0) throw new Error("Cannot build SQL placeholders for an empty value list.");
  return new Array(count).fill("?").join(", ");
}

function bindValues(values: readonly unknown[]): D1Value[] {
  return values.map((value) => {
    if (value === undefined) return null;
    if (
      typeof value === "string" ||
      typeof value === "number" ||
      typeof value === "boolean" ||
      value === null ||
      value instanceof ArrayBuffer
    ) {
      return value;
    }
    return JSON.stringify(value);
  });
}

async function all<T>(database: D1DatabaseLike, sql: string, values: readonly unknown[] = []): Promise<T[]> {
  const result = await database.prepare(sql).bind(...bindValues(values)).all<T>();
  return result.results ?? [];
}

async function first<T>(database: D1DatabaseLike, sql: string, values: readonly unknown[] = []): Promise<T | null> {
  return database.prepare(sql).bind(...bindValues(values)).first<T>();
}

function readD1Json(value: Json | string | null | undefined): Json {
  if (typeof value !== "string") return value ?? null;
  try {
    return JSON.parse(value) as Json;
  } catch {
    return null;
  }
}

function readD1Boolean(value: boolean | number | string | null | undefined, fallback = false): boolean {
  if (typeof value === "boolean") return value;
  if (typeof value === "number") return value !== 0;
  if (typeof value === "string") return value === "1" || value.toLowerCase() === "true";
  return fallback;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === "object" && !Array.isArray(value));
}

function isMissingD1TableError(error: unknown, tableName?: string) {
  const message = error instanceof Error
    ? error.message.toLowerCase()
    : isRecord(error) && typeof error.message === "string"
      ? error.message.toLowerCase()
      : "";
  return message.includes("no such table") && (!tableName || message.includes(tableName.toLowerCase()));
}

function isMissingOptionalTable(error: unknown) {
  if (!error || typeof error !== "object") return false;
  const code = "code" in error && typeof error.code === "string" ? error.code : "";
  const message = "message" in error && typeof error.message === "string" ? error.message.toLowerCase() : "";
  return code === "42P01" || message.includes("does not exist") || message.includes("schema cache") || message.includes("no such table");
}

function normalizeEstimateTabRow(row: EstimateTabQueryRow & { metadata?: Json | string | null }): EstimateTabQueryRow {
  return {
    ...row,
    is_default: readD1Boolean(row.is_default),
    metadata: readD1Json(row.metadata),
  };
}

function normalizeEstimateTreeNodeRow(row: EstimateTreeNodeQueryRow): EstimateTreeNodeQueryRow {
  return {
    ...row,
    kind: normalizeEstimateTreeNodeKind(row.kind) ?? row.kind,
  };
}

function normalizeEstimateTreeRowItem(row: EstimateTreeRowItemQueryRow): EstimateTreeRowItemQueryRow {
  return {
    ...row,
    node_id: row.node_id ?? "",
    supplier: row.supplier ?? "",
    supplier_id: row.supplier_id ?? null,
    unit: row.unit ?? "",
    unit_cost: Number(row.unit_cost ?? 0),
    quantity: Number(row.quantity ?? 0),
    quantity_base: row.quantity_base === null || row.quantity_base === undefined ? null : Number(row.quantity_base),
    quantity_contingency_amount: row.quantity_contingency_amount === null || row.quantity_contingency_amount === undefined
      ? null
      : Number(row.quantity_contingency_amount),
    contingency_percentage: Number(row.contingency_percentage ?? 0),
    adjustment_percentage: Number(row.adjustment_percentage ?? 0),
    misc_cost: Number(row.misc_cost ?? 0),
    row_revision: Number(row.row_revision ?? 0),
    category_node_id: row.category_node_id ?? null,
    discipline: row.discipline ?? "",
    designation: row.designation ?? "",
    source_library_item_id: row.source_library_item_id ?? null,
    link_state: row.link_state ?? "unlinked",
    source_snapshot: readD1Json(row.source_snapshot),
    metadata: readD1Json(row.metadata),
  };
}

async function readEstimateNodes(
  database: D1DatabaseLike,
  estimateId: string,
  options: { tabId?: string | null; nodeIds?: string[]; parentIds?: string[]; limit?: number | null } = {},
): Promise<EstimateTreeNodeQueryRow[]> {
  const filters: string[] = ["estimate_id = ?"];
  const values: unknown[] = [estimateId];
  if (options.tabId) {
    filters.push("estimate_tab_id = ?");
    values.push(options.tabId);
  }
  if (options.nodeIds?.length) {
    filters.push(`id IN (${placeholders(options.nodeIds)})`);
    values.push(...options.nodeIds);
  }
  if (options.parentIds?.length) {
    filters.push(`parent_id IN (${placeholders(options.parentIds)})`);
    values.push(...options.parentIds);
  }
  const limitSql = options.limit ? " LIMIT ?" : "";
  if (options.limit) values.push(options.limit);
  const rows = await all<EstimateTreeNodeQueryRow>(
    database,
    `SELECT ${ESTIMATE_TREE_NODE_COLUMNS}
     FROM estimate_nodes
     WHERE ${filters.join(" AND ")}
     ORDER BY sort_order ASC, id ASC${limitSql}`,
    values,
  );
  return rows.map(normalizeEstimateTreeNodeRow);
}

async function readEstimateRows(
  database: D1DatabaseLike,
  estimateId: string,
  options: { nodeIds?: string[]; limit?: number | null } = {},
): Promise<EstimateTreeRowItemQueryRow[]> {
  const nodeIdBatches = options.nodeIds?.length
    ? Array.from({ length: Math.ceil(options.nodeIds.length / ESTIMATE_TREE_ROW_NODE_BATCH_SIZE) }, (_, index) =>
        options.nodeIds!.slice(index * ESTIMATE_TREE_ROW_NODE_BATCH_SIZE, (index + 1) * ESTIMATE_TREE_ROW_NODE_BATCH_SIZE),
      )
    : [undefined];
  const batches = await Promise.all(nodeIdBatches.map(async (nodeIds) => {
    const filters: string[] = ["estimate_id = ?", "node_id IS NOT NULL"];
    const values: unknown[] = [estimateId];
    if (nodeIds) {
      filters.push(`node_id IN (${placeholders(nodeIds)})`);
      values.push(...nodeIds);
    }
    return all<EstimateTreeRowItemQueryRow>(
      database,
      `SELECT ${ESTIMATE_TREE_ROW_ITEM_COLUMNS}
       FROM estimate_row_items
       WHERE ${filters.join(" AND ")}
       ORDER BY sort_order ASC, id ASC`,
      values,
    );
  }));
  const rows = batches.flat()
    .sort((left, right) => left.sort_order - right.sort_order || left.id.localeCompare(right.id));
  return (options.limit ? rows.slice(0, options.limit) : rows).map(normalizeEstimateTreeRowItem);
}

type EstimateTemplateLinkProjectionRow = {
  estimate_node_id: string;
  instance_id: string;
  template_id: string;
  template_name: string;
  link_state: "linked" | "updating" | "failed";
  applied_version_number: number | string;
  target_version_number: number | string;
  failure_class: EstimateTemplateLinkProjection["failureClass"];
  retryable: boolean | number | string | null;
  root_ordinal: number | string | null;
  root_count: number | string;
};

async function readEstimateTemplateLinkProjections(
  database: D1DatabaseLike,
  estimateId: string,
  nodeIds: string[],
) {
  if (nodeIds.length === 0) return new Map<string, EstimateTemplateLinkProjection>();
  try {
    const rows = await all<EstimateTemplateLinkProjectionRow>(
      database,
      `WITH active_mappings AS (
         SELECT mapping.instance_id, mapping.estimate_node_id, mapping.template_node_id,
                instance.template_id, instance.target_parent_node_id,
                instance.link_state, instance.applied_version_number,
                instance.target_version_number, template.name AS template_name
         FROM estimate_template_instance_nodes AS mapping
         INNER JOIN estimate_template_instances AS instance
           ON instance.id = mapping.instance_id
          AND instance.workspace_id = mapping.workspace_id
          AND instance.estimate_id = mapping.estimate_id
         INNER JOIN estimate_templates AS template
           ON template.id = instance.template_id
          AND template.workspace_id = instance.workspace_id
         WHERE instance.estimate_id = ?
           AND instance.link_state IN ('linked', 'updating', 'failed')
       ), instance_roots AS (
         SELECT mapping.instance_id, mapping.estimate_node_id,
                ROW_NUMBER() OVER (
                  PARTITION BY mapping.instance_id
                  ORDER BY node.sort_order ASC, mapping.template_node_id ASC
                ) AS root_ordinal,
                COUNT(*) OVER (PARTITION BY mapping.instance_id) AS root_count
         FROM active_mappings AS mapping
         INNER JOIN estimate_nodes AS node
           ON node.id = mapping.estimate_node_id AND node.estimate_id = ?
         WHERE node.parent_id IS mapping.target_parent_node_id
       )
       SELECT mapping.estimate_node_id, mapping.instance_id, mapping.template_id,
              mapping.template_name, mapping.link_state,
              mapping.applied_version_number, mapping.target_version_number,
              job.failure_class, job.retryable,
              root.root_ordinal,
              COALESCE(root.root_count, counts.root_count, 0) AS root_count
       FROM active_mappings AS mapping
       LEFT JOIN instance_roots AS root
         ON root.instance_id = mapping.instance_id
        AND root.estimate_node_id = mapping.estimate_node_id
       LEFT JOIN (
         SELECT instance_id, COUNT(*) AS root_count
         FROM instance_roots GROUP BY instance_id
       ) AS counts ON counts.instance_id = mapping.instance_id
       LEFT JOIN estimate_template_propagation_jobs AS job
         ON job.instance_id = mapping.instance_id
       WHERE mapping.estimate_node_id IN (
         SELECT value FROM json_each(?)
       )`,
      [estimateId, estimateId, JSON.stringify(nodeIds)],
    );
    return new Map(rows.map((row) => [row.estimate_node_id, {
      instanceId: row.instance_id,
      templateId: row.template_id,
      templateName: row.template_name,
      linkState: row.link_state,
      appliedVersionNumber: Number(row.applied_version_number),
      targetVersionNumber: Number(row.target_version_number),
      failureClass: row.failure_class ?? null,
      retryable: readD1Boolean(row.retryable),
      isInstanceRoot: row.root_ordinal !== null,
      rootOrdinal: row.root_ordinal === null ? null : Number(row.root_ordinal),
      rootCount: Number(row.root_count),
      isPrimaryRoot: Number(row.root_ordinal) === 1,
    } satisfies EstimateTemplateLinkProjection]));
  } catch (error) {
    if (isMissingOptionalTable(error)) return new Map<string, EstimateTemplateLinkProjection>();
    throw error;
  }
}

async function readEstimateTab(database: D1DatabaseLike, estimateId: string, tabId: string): Promise<EstimateTabQueryRow | null> {
  const row = await first<EstimateTabQueryRow>(
    database,
    `SELECT id, estimate_id, name, sort_order, is_default, archived_at, '{}' AS metadata, created_at, updated_at
     FROM estimate_tabs
     WHERE id = ?
       AND estimate_id = ?
       AND archived_at IS NULL
     LIMIT 1`,
    [tabId, estimateId],
  );
  return row ? normalizeEstimateTabRow(row) : null;
}

function formatPeso(value: number) {
  return new Intl.NumberFormat("en-PH", { style: "currency", currency: "PHP", minimumFractionDigits: 2 }).format(value);
}

function readJsonRecord(value: unknown): Record<string, unknown> {
  const parsed = typeof value === "string" ? readD1Json(value) : value;
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return {};
  return parsed as Record<string, unknown>;
}

function createDefaultEstimateSheetAdjustment(estimateId: string): EstimateSheetAdjustment {
  return {
    estimateId,
    mode: "contingency",
    percentage: 0,
    rowRevision: 0,
    updatedAt: undefined,
    updatedBy: null,
  };
}

function toEstimateSheetAdjustment(row: EstimateSheetAdjustmentQueryRow): EstimateSheetAdjustment {
  return {
    estimateId: row.estimate_id,
    mode: row.mode,
    percentage: Number(row.percentage ?? 0),
    rowRevision: row.row_revision,
    updatedAt: row.updated_at,
    updatedBy: row.updated_by,
  };
}

async function readOptionalEstimateSheetAdjustment(
  database: D1DatabaseLike,
  estimateId: string,
): Promise<EstimateSheetAdjustment> {
  try {
    const data = await first<EstimateSheetAdjustmentQueryRow>(
      database,
      `SELECT estimate_id, mode, percentage, row_revision, updated_at, updated_by
       FROM estimate_sheet_adjustments
       WHERE estimate_id = ?
       LIMIT 1`,
      [estimateId],
    );
    return data ? toEstimateSheetAdjustment(data) : createDefaultEstimateSheetAdjustment(estimateId);
  } catch (error) {
    if (isMissingOptionalTable(error)) return createDefaultEstimateSheetAdjustment(estimateId);
    throw error;
  }
}

function toUiRow(row: EstimateTreeRowItemQueryRow): EstimateRowItem {
  const quantity = Number(row.quantity);
  const quantityBase = row.quantity_base === null || row.quantity_base === undefined ? null : Number(row.quantity_base);
  const quantityContingencyAmount = quantityBase === null ? null : Number(row.quantity_contingency_amount ?? 0);
  const itemCost = Number(row.unit_cost);
  const miscCost = Number(row.misc_cost);
  const subTotal = itemCost * quantity;
  const legacyAdjustmentPercentage = quantityBase === null ? Number(row.contingency_percentage ?? 0) : 0;
  const contingencyPercentage = quantityBase === null
    ? 0
    : quantityBase > 0 ? ((quantityContingencyAmount ?? 0) / quantityBase) * 100 : 0;
  const contingencyValue = 0;
  const adjustmentPercentage = Number(row.adjustment_percentage ?? legacyAdjustmentPercentage);
  const adjustmentValue = (subTotal * adjustmentPercentage) / 100;
  const sourceSnapshot = readJsonRecord(row.source_snapshot);
  const priceOptions = readEstimateRowPriceOptionsSnapshot(sourceSnapshot.priceOptions);
  const metadata = readJsonRecord(row.metadata);
  const category = typeof sourceSnapshot.category === "string" && sourceSnapshot.category
    ? sourceSnapshot.category
    : "General";
  const categoryId = typeof sourceSnapshot.categoryId === "string" ? sourceSnapshot.categoryId : undefined;
  const categoryNodeId = row.category_node_id ?? (typeof sourceSnapshot.categoryNodeId === "string" ? sourceSnapshot.categoryNodeId : undefined);
  const categoryPath = Array.isArray(sourceSnapshot.categoryPath)
    ? sourceSnapshot.categoryPath.filter((value): value is string => typeof value === "string" && value.trim().length > 0)
    : undefined;
  const categoryPathIds = Array.isArray(sourceSnapshot.categoryPathIds)
    ? sourceSnapshot.categoryPathIds.filter((value): value is string => typeof value === "string" && value.trim().length > 0)
    : undefined;
  const supplierId = row.supplier_id ?? (typeof sourceSnapshot.supplierId === "string" ? sourceSnapshot.supplierId : undefined);
  const tags = Array.isArray(metadata.tags) ? metadata.tags.filter((tag): tag is string => typeof tag === "string") : undefined;
  const componentVersionNumber = typeof sourceSnapshot.componentVersionNumber === "number" ? sourceSnapshot.componentVersionNumber : undefined;
  const scopeStatus = typeof metadata.scopeStatus === "string" && metadata.scopeStatus.trim() ? metadata.scopeStatus : undefined;

  return {
    id: row.id,
    sortOrder: row.sort_order,
    material: row.material,
    scopeStatus,
    description: row.description,
    supplier: row.supplier || "No supplier",
    supplierId: supplierId ?? undefined,
    source: row.source_library_item_id && row.link_state !== "detached" && row.link_state !== "unlinked" ? "library" : "project",
    unit: row.unit,
    itemCost,
    quantity,
    quantityBase,
    quantityContingencyAmount,
    subTotal,
    contingencyPercentage,
    contingencyValue,
    adjustmentPercentage,
    adjustmentValue,
    miscCost,
    totalItemCosts: subTotal + miscCost + contingencyValue + adjustmentValue,
    rowRevision: row.row_revision,
    category,
    categoryId,
    categoryNodeId: categoryNodeId ?? undefined,
    categoryPath,
    categoryPathIds,
    brand: typeof sourceSnapshot.brand === "string" ? sourceSnapshot.brand : undefined,
    brandId: typeof sourceSnapshot.brandId === "string" ? sourceSnapshot.brandId : undefined,
    discipline: row.discipline ?? undefined,
    designation: row.designation ?? undefined,
    tags,
    imageUrl: normalizeEstimateRowImageUrl(sourceSnapshot.imageUrl) ?? undefined,
    sourceUrl: typeof sourceSnapshot.sourceUrl === "string" ? sourceSnapshot.sourceUrl : undefined,
    sourceLibraryItemId: row.source_library_item_id,
    metadata: readEstimateRowMetadata(row.metadata),
    linkState: row.link_state as EstimateRowLinkState,
    componentVersionId: typeof sourceSnapshot.componentVersionId === "string" ? sourceSnapshot.componentVersionId : undefined,
    componentVersionNumber,
    priceOptionId: typeof sourceSnapshot.priceOptionId === "string" ? sourceSnapshot.priceOptionId : undefined,
    priceOptionLabel: typeof sourceSnapshot.priceOptionLabel === "string" ? sourceSnapshot.priceOptionLabel : undefined,
    priceOptions,
    lifecycleState: typeof sourceSnapshot.lifecycleState === "string" ? sourceSnapshot.lifecycleState as EstimateRowItem["lifecycleState"] : undefined,
    updatedAt: typeof sourceSnapshot.sourceUpdatedAt === "string" ? sourceSnapshot.sourceUpdatedAt : undefined,
    pricingSource: typeof sourceSnapshot.pricingSource === "string" ? sourceSnapshot.pricingSource : "Estimate row snapshot",
    pricingDate: typeof sourceSnapshot.pricingDate === "string" ? sourceSnapshot.pricingDate : "",
  };
}

function normalizeTreeLoadLimit(value: number | undefined): number | null {
  return typeof value === "number" && Number.isInteger(value) && value > 0 ? value : null;
}

function limitTreeRows<T>(rows: T[], limit: number | null): { rows: T[]; didExceedLimit: boolean } {
  if (!limit) return { rows, didExceedLimit: false };
  return {
    rows: rows.slice(0, limit),
    didExceedLimit: rows.length > limit,
  };
}

function toEstimateTabSummary(row: EstimateTabQueryRow): EstimateTabSummary {
  return {
    id: row.id,
    name: row.name,
    sortOrder: row.sort_order,
    isDefault: readD1Boolean(row.is_default),
  };
}

function syntheticMainTab(): EstimateTabSummary {
  return { id: LEGACY_MAIN_TAB_ID, name: "Main", sortOrder: 0, isDefault: true };
}

export function isEstimateTabsSchemaMissing(error: unknown) {
  const message = error instanceof Error
    ? error.message.toLowerCase()
    : isRecord(error) && typeof error.message === "string"
      ? error.message.toLowerCase()
      : "";
  return (
    isMissingD1TableError(error, "estimate_tabs") ||
    message.includes("no such column: estimate_tab_id") ||
    message.includes("no such column: archived_at")
  );
}

export function buildEstimateTree(
  nodes: EstimateTreeNodeQueryRow[],
  rows: EstimateTreeRowItemQueryRow[],
  templateLinkByNodeId: ReadonlyMap<string, EstimateTemplateLinkProjection> = new Map(),
): EstimateTreeNode[] {
  const rowItemsByNode = new Map<string, EstimateRowItem[]>();
  for (const row of rows) {
    const current = rowItemsByNode.get(row.node_id) ?? [];
    current.push(toUiRow(row));
    rowItemsByNode.set(row.node_id, current);
  }

  const nodeMap = new Map<string, EstimateTreeNode>();
  for (const node of nodes) {
    const kind = normalizeEstimateTreeNodeKind(node.kind);
    if (!kind) continue;
    nodeMap.set(node.id, {
      id: node.id,
      name: node.name,
      kind,
      sortOrder: node.sort_order,
      total: formatPeso(0),
      children: [],
      estimateRowItems: rowItemsByNode.get(node.id) ?? [],
      templateLink: templateLinkByNodeId.get(node.id),
    });
  }

  const roots: EstimateTreeNode[] = [];
  for (const node of nodes) {
    const uiNode = nodeMap.get(node.id);
    if (!uiNode) continue;
    const parent = node.parent_id ? nodeMap.get(node.parent_id) : undefined;
    if (parent) parent.children = [...(parent.children ?? []), uiNode];
    else roots.push(uiNode);
  }

  function computeTotals(node: EstimateTreeNode): number {
    const rowTotal = (node.estimateRowItems ?? []).reduce((total, row) => total + row.totalItemCosts, 0);
    const childTotal = (node.children ?? []).reduce((total, child) => total + computeTotals(child), 0);
    const total = rowTotal + childTotal;
    node.total = formatPeso(total);
    return total;
  }

  roots.forEach(computeTotals);
  return roots;
}

function annotateEstimateSubtreeCompleteness(
  nodes: EstimateTreeNode[],
  completeness: EstimateTreeSubtreeCompleteness,
): EstimateTreeNode[] {
  return nodes.map((node) => ({
    ...node,
    childrenLoaded: completeness.childrenLoaded,
    rowItemsLoaded: completeness.rowItemsLoaded,
    children: node.children?.length ? annotateEstimateSubtreeCompleteness(node.children, completeness) : node.children,
  }));
}

export async function readEstimateTabsD1(
  database: D1DatabaseLike,
  estimateId: string,
  options: { maxTabCount?: number } = {},
): Promise<EstimateTabSummary[]> {
  const maxTabCount = normalizeTreeLoadLimit(options.maxTabCount);
  const rows = await all<EstimateTabQueryRow>(
    database,
    `SELECT id, estimate_id, name, sort_order, is_default, archived_at, '{}' AS metadata, created_at, updated_at
     FROM estimate_tabs
     WHERE estimate_id = ?
       AND archived_at IS NULL
     ORDER BY sort_order ASC, id ASC${maxTabCount ? " LIMIT ?" : ""}`,
    maxTabCount ? [estimateId, maxTabCount + 1] : [estimateId],
  );
  return rows.map(normalizeEstimateTabRow).map(toEstimateTabSummary);
}

export async function readDefaultEstimateTabD1(
  database: D1DatabaseLike,
  estimateId: string,
): Promise<EstimateTabSummary | null> {
  const data = await first<EstimateTabQueryRow>(
    database,
    `SELECT id, estimate_id, name, sort_order, is_default, archived_at, '{}' AS metadata, created_at, updated_at
     FROM estimate_tabs
     WHERE estimate_id = ?
       AND is_default = 1
       AND archived_at IS NULL
     LIMIT 1`,
    [estimateId],
  );
  return data ? toEstimateTabSummary(normalizeEstimateTabRow(data)) : null;
}

export async function readLegacyEstimateTreeD1(
  database: D1DatabaseLike,
  estimate: EstimateRecordWithLegacy,
  preferredNodeId: string | null,
  options: EstimateTreeLoadOptions = {},
): Promise<EstimateTabTreePayloadD1> {
  const maxNodeCount = normalizeTreeLoadLimit(options.maxNodeCount);
  const maxRowItemCount = normalizeTreeLoadLimit(options.maxRowItemCount);
  const [rawNodes, rawRows, sheetAdjustment] = await Promise.all([
    readEstimateNodes(database, estimate.id, { limit: maxNodeCount ? maxNodeCount + 1 : null }),
    readEstimateRows(database, estimate.id, { limit: maxRowItemCount ? maxRowItemCount + 1 : null }),
    readOptionalEstimateSheetAdjustment(database, estimate.id),
  ]);
  const limitedNodes = limitTreeRows(rawNodes, maxNodeCount);
  const limitedRows = limitTreeRows(rawRows, maxRowItemCount);
  const templateLinks = await readEstimateTemplateLinkProjections(
    database,
    estimate.id,
    limitedNodes.rows.map((node) => node.id),
  );
  const loadLimitState = maxNodeCount || maxRowItemCount
    ? {
        maxNodeCount,
        maxRowItemCount,
        fetchedNodeCount: rawNodes.length,
        fetchedRowItemCount: rawRows.length,
        didExceedNodeLimit: limitedNodes.didExceedLimit,
        didExceedRowItemLimit: limitedRows.didExceedLimit,
      }
    : undefined;
  const nodes = limitedNodes.rows;
  const tree = buildEstimateTree(nodes, limitedRows.rows, templateLinks);
  const selectedNodeId = preferredNodeId && rawNodes.some((node) => node.id === preferredNodeId)
    ? preferredNodeId
    : tree[0]?.id ?? null;
  return {
    estimate: normalizeEstimateRecord(estimate),
    selectedNodeId,
    tree,
    sheetAdjustment,
    loadLimitState,
  };
}

export async function readEstimateTabTreePayloadD1(
  database: D1DatabaseLike,
  estimate: EstimateRecordWithLegacy,
  tabId: string,
  options: EstimateTreeLoadOptions = {},
): Promise<EstimateTabTreePayloadD1> {
  const maxNodeCount = normalizeTreeLoadLimit(options.maxNodeCount);
  const maxRowItemCount = normalizeTreeLoadLimit(options.maxRowItemCount);
  const [rawNodes, sheetAdjustment] = await Promise.all([
    traced("estimate-tab-tree.nodes", () =>
      readEstimateNodes(database, estimate.id, {
        tabId,
        limit: maxNodeCount ? maxNodeCount + 1 : null,
      }),
    ),
    readOptionalEstimateSheetAdjustment(database, estimate.id),
  ]);
  const limitedNodes = limitTreeRows(rawNodes, maxNodeCount);
  const nodeIds = limitedNodes.rows.map((node) => node.id);
  const [rawRows, templateLinks] = await Promise.all([
    nodeIds.length > 0
      ? readEstimateRows(database, estimate.id, {
          nodeIds,
          limit: maxRowItemCount ? maxRowItemCount + 1 : null,
        })
      : Promise.resolve([]),
    readEstimateTemplateLinkProjections(database, estimate.id, nodeIds),
  ]);
  const limitedRows = limitTreeRows(rawRows, maxRowItemCount);
  const loadLimitState = maxNodeCount || maxRowItemCount
    ? {
        maxNodeCount,
        maxRowItemCount,
        fetchedNodeCount: rawNodes.length,
        fetchedRowItemCount: rawRows.length,
        didExceedNodeLimit: limitedNodes.didExceedLimit,
        didExceedRowItemLimit: limitedRows.didExceedLimit,
      }
    : undefined;
  const tree = await traced("estimate-tab-tree.build", async () =>
    buildEstimateTree(limitedNodes.rows, limitedRows.rows, templateLinks),
  );
  return {
    estimate: normalizeEstimateRecord(estimate),
    selectedNodeId: tree[0]?.id ?? null,
    tree,
    sheetAdjustment,
    loadLimitState,
  };
}

export async function readEstimateTabTreeD1(
  database: D1DatabaseLike,
  estimate: EstimateRecordWithLegacy,
  tabId: string,
  options: EstimateTreeLoadOptions = {},
): Promise<EstimateTabTreeD1Result> {
  if (options.allowLegacyFallback && tabId === LEGACY_MAIN_TAB_ID) {
    return {
      ...await readLegacyEstimateTreeD1(database, estimate, null, options),
      tab: syntheticMainTab(),
    };
  }

  try {
    const tab = await readEstimateTab(database, estimate.id, tabId);
    if (!tab) {
      return {
        estimate: normalizeEstimateRecord(estimate),
        tab: null,
        selectedNodeId: null,
        tree: [],
      };
    }
    return {
      ...await readEstimateTabTreePayloadD1(database, estimate, tab.id, options),
      tab: toEstimateTabSummary(tab),
    };
  } catch (error) {
    if (options.allowLegacyFallback && isEstimateTabsSchemaMissing(error)) {
      return {
        ...await readLegacyEstimateTreeD1(database, estimate, null, options),
        tab: syntheticMainTab(),
      };
    }
    throw error;
  }
}

export async function readEstimateNodeSubtreeD1(
  database: D1DatabaseLike,
  estimate: EstimateRecordWithLegacy,
  nodeId: string,
  input: {
    tabId?: string | null;
    requestId: string;
    options?: EstimateTreeLoadOptions;
  },
): Promise<EstimateNodeSubtreeD1Result> {
  const options = input.options ?? {};
  const normalizedEstimate = normalizeEstimateRecord(estimate);
  const requestedTabId = input.tabId ?? null;
  const tabScopedId = requestedTabId && requestedTabId !== LEGACY_MAIN_TAB_ID ? requestedTabId : null;
  let tab: EstimateTabSummary | null = null;

  if (tabScopedId) {
    try {
      const tabRow = await readEstimateTab(database, estimate.id, tabScopedId);
      if (!tabRow) {
        return { estimate: normalizedEstimate, tab: null, selectedNodeId: null, tree: [], payload: null };
      }
      tab = toEstimateTabSummary(tabRow);
    } catch (error) {
      if (options.allowLegacyFallback && isEstimateTabsSchemaMissing(error)) tab = syntheticMainTab();
      else throw error;
    }
  } else if (requestedTabId === LEGACY_MAIN_TAB_ID) {
    tab = syntheticMainTab();
  }

  const rootNode = (await readEstimateNodes(database, estimate.id, {
    tabId: tabScopedId,
    nodeIds: [nodeId],
    limit: 1,
  }))[0] ?? null;
  if (!rootNode) {
    return { estimate: normalizedEstimate, tab, selectedNodeId: null, tree: [], payload: null };
  }

  const maxNodeCount = normalizeTreeLoadLimit(options.maxNodeCount);
  const maxRowItemCount = normalizeTreeLoadLimit(options.maxRowItemCount);
  const nodeRows: EstimateTreeNodeQueryRow[] = [rootNode];
  let frontierIds = [rootNode.id];

  while (frontierIds.length > 0) {
    const remainingNodeBudget = maxNodeCount ? (maxNodeCount + 1) - nodeRows.length : null;
    if (remainingNodeBudget !== null && remainingNodeBudget <= 0) break;
    const childRows = await readEstimateNodes(database, estimate.id, {
      tabId: tabScopedId,
      parentIds: frontierIds,
      limit: remainingNodeBudget,
    });
    if (childRows.length === 0) break;
    nodeRows.push(...childRows);
    frontierIds = childRows.map((node) => node.id);
  }

  const limitedNodes = limitTreeRows(nodeRows, maxNodeCount);
  const nodeIds = limitedNodes.rows.map((node) => node.id);
  const [rawRows, templateLinks] = await Promise.all([
    nodeIds.length > 0
      ? readEstimateRows(database, estimate.id, {
          nodeIds,
          limit: maxRowItemCount ? maxRowItemCount + 1 : null,
        })
      : Promise.resolve([]),
    readEstimateTemplateLinkProjections(database, estimate.id, nodeIds),
  ]);
  const limitedRows = limitTreeRows(rawRows, maxRowItemCount);
  const completeness: EstimateTreeSubtreeCompleteness = {
    childrenLoaded: !limitedNodes.didExceedLimit,
    rowItemsLoaded: !limitedRows.didExceedLimit,
    didExceedNodeLimit: limitedNodes.didExceedLimit,
    didExceedRowItemLimit: limitedRows.didExceedLimit,
  };
  const subtree = annotateEstimateSubtreeCompleteness(
    buildEstimateTree(limitedNodes.rows, limitedRows.rows, templateLinks),
    completeness,
  );
  const payload = buildEstimateTreeSubtreePayload({
    estimateId: estimate.id,
    tabId: requestedTabId,
    rootNodeId: rootNode.id,
    parentNodeId: rootNode.parent_id,
    requestId: input.requestId,
    tree: subtree,
    completeness,
  });
  return {
    estimate: normalizedEstimate,
    tab,
    selectedNodeId: subtree[0]?.id ?? null,
    tree: subtree,
    payload,
  };
}

export function groupEstimateTabTrees(
  tabs: EstimateTabSummary[],
  nodes: Array<EstimateTreeNodeQueryRow & { estimate_tab_id?: string | null }>,
  rows: EstimateTreeRowItemQueryRow[],
  templateLinkByNodeId: ReadonlyMap<string, EstimateTemplateLinkProjection> = new Map(),
): EstimateTabTree[] {
  const nodesByTab = new Map<string, EstimateTreeNodeQueryRow[]>();
  const nodeIdToTab = new Map<string, string>();
  for (const node of nodes) {
    const tabId = node.estimate_tab_id;
    if (!tabId) continue;
    nodeIdToTab.set(node.id, tabId);
    const list = nodesByTab.get(tabId) ?? [];
    list.push(node);
    nodesByTab.set(tabId, list);
  }
  const rowsByTab = new Map<string, EstimateTreeRowItemQueryRow[]>();
  for (const row of rows) {
    const tabId = nodeIdToTab.get(row.node_id);
    if (!tabId) continue;
    const list = rowsByTab.get(tabId) ?? [];
    list.push(row);
    rowsByTab.set(tabId, list);
  }
  return tabs.map((tab) => ({
    tab,
    tree: buildEstimateTree(nodesByTab.get(tab.id) ?? [], rowsByTab.get(tab.id) ?? [], templateLinkByNodeId),
  }));
}

export async function readEstimateTreesForTabsD1(
  database: D1DatabaseLike,
  estimate: EstimateRecordWithLegacy,
  tabs: EstimateTabSummary[],
  options: EstimateTreeLoadOptions = {},
): Promise<EstimateTreesForTabsD1Result> {
  const tabIds = tabs.map((tab) => tab.id);
  const maxNodeCount = normalizeTreeLoadLimit(options.maxNodeCount);
  const maxRowItemCount = normalizeTreeLoadLimit(options.maxRowItemCount);
  const [rawNodes, sheetAdjustment] = await Promise.all([
    tabIds.length > 0
      ? all<EstimateTreeNodeQueryRow & { estimate_tab_id: string | null }>(
          database,
          `SELECT ${ESTIMATE_TREE_NODE_COLUMNS}, estimate_tab_id
           FROM estimate_nodes
           WHERE estimate_id = ?
             AND estimate_tab_id IN (${placeholders(tabIds)})
           ORDER BY sort_order ASC, id ASC${maxNodeCount ? " LIMIT ?" : ""}`,
          maxNodeCount ? [estimate.id, ...tabIds, maxNodeCount + 1] : [estimate.id, ...tabIds],
        )
      : Promise.resolve([]),
    readOptionalEstimateSheetAdjustment(database, estimate.id),
  ]);
  const limitedNodes = limitTreeRows(rawNodes, maxNodeCount);
  const nodeIds = limitedNodes.rows.map((node) => node.id);
  const [rawRows, templateLinks] = await Promise.all([
    nodeIds.length > 0
      ? readEstimateRows(database, estimate.id, {
          nodeIds,
          limit: maxRowItemCount ? maxRowItemCount + 1 : null,
        })
      : Promise.resolve([]),
    readEstimateTemplateLinkProjections(database, estimate.id, nodeIds),
  ]);
  const limitedRows = limitTreeRows(rawRows, maxRowItemCount);
  const loadLimitState = maxNodeCount || maxRowItemCount
    ? {
        maxNodeCount,
        maxRowItemCount,
        fetchedNodeCount: rawNodes.length,
        fetchedRowItemCount: rawRows.length,
        didExceedNodeLimit: limitedNodes.didExceedLimit,
        didExceedRowItemLimit: limitedRows.didExceedLimit,
      }
    : undefined;
  return {
    estimate: normalizeEstimateRecord(estimate),
    sheetAdjustment,
    tabs: groupEstimateTabTrees(tabs, limitedNodes.rows, limitedRows.rows, templateLinks),
    loadLimitState,
  };
}
