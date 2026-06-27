"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { requireAuth, requireCurrentUserContext } from "@/lib/auth/session";
import { assertEstimateActionRateLimit } from "@/lib/estimates/action-rate-limit";
import type { EstimateSheetAdjustment, EstimateSheetAdjustmentMode, EstimateTabSummary, EstimateTreeNode, EstimateRowItem } from "@/lib/estimates/types";
import { LEGACY_BLANK_ROW_TAG, isExpressComponentRow, readEstimateRowMetadata } from "@/lib/estimates/express-components";
import { ESTIMATE_SHEET_TREE_LOAD_LIMITS } from "@/lib/estimates/load-limits";
import { normalizeEstimateRowImageUrl, sanitizeEstimateRowSourceSnapshot } from "@/lib/estimates/image-url";
import {
  normalizeEstimateTreeNodeKind,
  selectFirstEstimateNodeIds,
} from "@/lib/estimates/tree-hierarchy";
import {
  buildProjectEstimateListRow,
  projectEstimateListRowSource,
} from "@/lib/estimates/project-estimate-list-row";
import {
  EstimateRowRevisionConflictError,
  isEstimateRowRevisionConflict,
} from "@/lib/estimates/row-revision-conflict";
import { sumEstimateRowLineTotals } from "@/lib/estimates/estimate-row-total";
import { planEstimateTreeDelete } from "@/lib/estimates/estimate-tree-edit";
import { ESTIMATE_TREE_SORT_ORDER_STEP } from "@/lib/estimates/estimate-tree-reorder";
import { dedupeSelectedRoots, type TreeSelectionNode } from "@/lib/bulk-selection/tree-selection";
import { sanitizeComponentSourceUrl } from "@/lib/component-library/source-url";
import { isUuid } from "@/lib/ids";
import {
  buildRejectedPreviewResult,
  coerceBulkExecutionResult,
  coerceBulkPreviewResult,
  normalizeBulkActionIds,
  type BulkActionExecutionResult,
  type BulkActionPreviewResult,
} from "@/lib/mass-deletion/bulk-action";
import { isMissingColumnError, normalizeEstimateRecord, type EstimateRecordWithLegacy } from "@/lib/repositories/estimate-schema-compat";
import { clearEstimateRouteContextProcessCache, getCurrentWorkspaceProject, getEstimateTabTree, getEstimateTabs, getProjectEstimateTreeByEstimate } from "@/lib/repositories/workspace-repository";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { Database, Json, Tables, TablesInsert, TablesUpdate } from "@/lib/supabase/types";

type CreateEstimateNodeWithHistoryArgs = Omit<
  Database["public"]["Functions"]["create_estimate_node_with_history"]["Args"],
  "parent_node_id"
> & {
  parent_node_id: string | null;
};

function throwEstimateRowMutationError(error: unknown): never {
  if (isEstimateRowRevisionConflict(error)) throw new EstimateRowRevisionConflictError();
  if (error instanceof Error) throw error;
  throw new Error("Could not save the estimate row.");
}

function readRequiredText(formData: FormData, key: string) {
  const value = String(formData.get(key) ?? "").trim();
  if (!value) throw new Error(`${key} is required.`);
  return value;
}

function readOptionalText(formData: FormData, key: string) {
  const value = String(formData.get(key) ?? "").trim();
  return value || null;
}

type InsertEstimateRowItemFromLibraryInput = {
  projectId: string;
  estimateId: string;
  targetNodeId: string;
  rowId: string;
  libraryItem: EstimateRowItem;
  mutationId?: string;
};

type InsertEstimateTemplateIntoEstimateInput = {
  projectId: string;
  estimateId: string;
  targetParentNodeId: string;
  templateId: string;
  // RS-1: the tab the insert targets. When set, the refreshed tree is loaded
  // for THIS tab (not the default one), so a non-default-tab insert returns the
  // tab the user is actually editing. Omitted for legacy (no-tab) estimates.
  targetTabId?: string;
};

type InsertEstimateTemplateIntoEstimateResult = {
  tree: EstimateTreeNode[];
  insertedRootNodeIds: string[];
};

type InsertEstimateTemplatesIntoEstimateInput = {
  projectId: string;
  estimateId: string;
  targetParentNodeId: string;
  templateIds: string[];
  // RS-1: see InsertEstimateTemplateIntoEstimateInput.targetTabId.
  targetTabId?: string;
};

type UpdateEstimateRowItemInput = {
  projectId: string;
  estimateId: string;
  rowId: string;
  material?: string;
  description?: string;
  supplier?: string;
  unit?: string;
  unitCost?: number;
  quantity?: number;
  quantityBase?: number | null;
  quantityContingencyAmount?: number | null;
  contingencyPercentage?: number;
  adjustmentPercentage?: number;
  miscCost?: number;
  sourceSnapshot?: Json | null;
  metadata?: Json;
  mutationId?: string;
  expectedRowRevision?: number;
};

type EstimateRowImageAssetDescriptor = {
  kind: "upload-asset";
  schemaVersion: 1;
  assetId: string;
  uploadSessionId: string;
  bucket: string;
  path: string;
  thumbnailPath?: string | null;
  fileName?: string | null;
  contentType: string;
  sizeBytes: number;
  scanStatus: string;
  width?: number | null;
  height?: number | null;
  thumbnailWidth?: number | null;
  thumbnailHeight?: number | null;
};

type UploadAssetValidationRpc = (
  functionName: string,
  args: Record<string, unknown>,
) => PromiseLike<{ data: unknown; error: { message?: string | null } | null }>;

type DetachEstimateRowItemInput = {
  projectId: string;
  estimateId: string;
  rowId: string;
  reason?: string;
  mutationId?: string;
  expectedRowRevision?: number;
};

type UpdateEstimateSheetAdjustmentInput = {
  projectId: string;
  estimateId: string;
  mode: EstimateSheetAdjustmentMode;
  percentage: number;
  mutationId?: string;
  expectedRowRevision?: number;
};

export type UpdateEstimateRowItemResult = {
  rowId: string;
  nodeId: string;
  material: string;
  description: string;
  supplier: string;
  unit: string;
  quantity: number;
  quantityBase: number | null;
  quantityContingencyAmount: number | null;
  itemCost: number;
  contingencyPercentage: number;
  contingencyValue: number;
  adjustmentPercentage: number;
  adjustmentValue: number;
  miscCost: number;
  sourceSnapshot: Json | null;
  metadata: Json;
  linkState: Tables<"estimate_row_items">["link_state"];
  rowRevision: number;
};

export type UpdateEstimateSheetAdjustmentResult = EstimateSheetAdjustment;

type ReplaceEstimateRowItemInput = {
  projectId: string;
  estimateId: string;
  rowId: string;
  libraryItem: EstimateRowItem;
  mutationId?: string;
  expectedRowRevision?: number;
};

type DeleteEstimateRowItemInput = {
  projectId: string;
  estimateId: string;
  rowId: string;
  mutationId?: string;
  expectedRowRevision?: number;
};

export type DeleteEstimateRowItemResult = {
  eventId: string;
  deletedRowId: string;
  deletedRow: UpdateEstimateRowItemResult;
};

type MoveEstimateRowComponentInput = {
  projectId: string;
  estimateId: string;
  sourceRowId: string;
  targetRowId: string;
  sourceLibraryItem: EstimateRowItem;
  targetLibraryItem: EstimateRowItem;
  mutationId?: string;
  expectedSourceRowRevision?: number;
  expectedTargetRowRevision?: number;
};

export type MoveEstimateRowComponentResult = {
  sourceRow: UpdateEstimateRowItemResult;
  targetRow: UpdateEstimateRowItemResult;
};

export type MoveEstimateRowItemUpdateInput = {
  rowId: string;
  nodeId: string;
  sortOrder: number;
  expectedRowRevision: number;
};

type MoveEstimateRowItemWithHistoryInput = {
  projectId: string;
  estimateId: string;
  activeTabId?: string | null;
  movedRowId: string;
  sourceNodeId: string;
  targetNodeId: string;
  updates: MoveEstimateRowItemUpdateInput[];
  mutationId?: string;
};

export type MoveEstimateRowItemWithHistoryResultRow = {
  rowId: string;
  nodeId: string;
  sortOrder: number;
  rowRevision: number;
};

export type MoveEstimateRowItemWithHistoryResult = {
  eventId: string;
  updatedRowCount: number;
  rows: MoveEstimateRowItemWithHistoryResultRow[];
};

type DeleteEstimateRowItemsBulkInput = {
  projectId: string;
  estimateId: string;
  rowIds: string[];
  mutationId?: string;
  expectedRowRevisions?: Record<string, number>;
};

export type DeleteEstimateRowItemsBulkResult = {
  eventId: string;
  deletedRowIds: string[];
  deletedRowCount: number;
};

type RestoreDeletedEstimateRowsInput = {
  projectId: string;
  estimateId: string;
  sourceEventId: string;
  rowIds?: string[];
  mutationId?: string;
};

export type RestoreDeletedEstimateRowsResult = {
  eventId: string;
  sourceEventId: string;
  restoredRowIds: string[];
  restoredRowCount: number;
  restoredRows: UpdateEstimateRowItemResult[];
};

type RestoreDeletedEstimateNodesInput = {
  projectId: string;
  estimateId: string;
  sourceEventId: string;
  nodeIds?: string[];
  targetTabId?: string;
  mutationId?: string;
};

export type RestoreDeletedEstimateNodesResult = {
  eventId: string;
  sourceEventId: string;
  restoredNodeIds: string[];
  restoredRootNodeIds: string[];
  restoredNodeCount: number;
  restoredRowIds: string[];
  restoredRowCount: number;
  tree: EstimateTreeNode[];
};

export type BulkDeleteEstimateSheetsInput = {
  projectId: string;
  estimateIds: string[];
};

export type ExecuteBulkDeleteEstimateSheetsInput = BulkDeleteEstimateSheetsInput & {
  expectedPreviewHash: string;
  correlationId?: string;
};

export type DeleteEstimateSheetInput = {
  projectId: string;
  estimateId: string;
  expectedPreviewHash: string;
  correlationId?: string;
};

export type EstimateSheetHistoryCursor = {
  createdAt: string;
  id: string;
};

type EstimateSheetHistoryReadScope = "sheet" | "row" | "node" | "both";

type FetchEstimateSheetVersionControlInput = {
  projectId: string;
  estimateId: string;
  rowId?: string;
  nodeId?: string;
  includeDescendants?: boolean;
  eventTypes?: string[];
  dateFrom?: string;
  dateTo?: string;
  search?: string;
  eventLimit?: number;
  sheetCursor?: EstimateSheetHistoryCursor | null;
  rowCursor?: EstimateSheetHistoryCursor | null;
  nodeCursor?: EstimateSheetHistoryCursor | null;
  scope?: EstimateSheetHistoryReadScope;
};

export type EstimateSheetHistoryEvent = {
  id: string;
  eventType: string;
  eventSource: string;
  createdAt: string;
  actorUserId: string | null;
  actorLabel: string;
  estimateTabId: string | null;
  targetRowId: string | null;
  estimateNodeId: string | null;
  rowContext: Record<string, unknown>;
  oldSnapshot: Json | null;
  newSnapshot: Json | null;
  changedFields: string[];
  totalDelta: number | null;
  payload: Record<string, unknown>;
  correlationId: string;
};

export type EstimateSheetVersionControlData = {
  events: EstimateSheetHistoryEvent[];
  rowEvents: EstimateSheetHistoryEvent[];
  nodeEvents: EstimateSheetHistoryEvent[];
  nextCursor: EstimateSheetHistoryCursor | null;
  rowNextCursor: EstimateSheetHistoryCursor | null;
  nodeNextCursor: EstimateSheetHistoryCursor | null;
};

export type EstimateActivityRetentionMetrics = {
  workspaceEventBytes: number;
  workspaceVersionBytes: number;
  largestEventPayloadBytes: number;
  maxEstimateEventCount: number;
  estimatesOverEventThreshold: number;
  workspaceStorageOverThreshold: boolean;
};

type FetchEstimateTreeInput = {
  projectId: string;
  estimateId: string;
};

type FetchEstimateTabTreeInput = FetchEstimateTreeInput & {
  tabId: string;
};

type EstimateTabActionInput = FetchEstimateTreeInput & {
  tabId: string;
  correlationId?: string;
};

type CreateEstimateTabInput = FetchEstimateTreeInput & {
  name: string;
  correlationId?: string;
};

type RenameEstimateTabInput = EstimateTabActionInput & {
  name: string;
};

type ReorderEstimateTabsInput = FetchEstimateTreeInput & {
  updates: Array<{ id: string; sortOrder: number }>;
  correlationId?: string;
};

type DuplicateEstimateTabInput = EstimateTabActionInput & {
  name?: string;
};

type EstimateTabMutationResult = {
  estimateTabId: string;
  replacementTabId?: string | null;
  tabs?: EstimateTabSummary[];
};

type ReorderEstimateTreeNodeUpdate = {
  id: string;
  parentId: string | null;
  sortOrder: number;
};

type ReorderEstimateTreeNodesInput = {
  updates: ReorderEstimateTreeNodeUpdate[];
  targetTabId?: string;
};

type ReorderEstimateTreeNodesResult = {
  tree: EstimateTreeNode[];
};

type ReorderEstimateNodeRow = {
  id: string;
  estimate_id: string;
  estimate_tab_id?: string | null;
  parent_id: string | null;
  kind: string;
};

type ValidatedEstimateNodeRow = {
  id: string;
  estimate_id: string;
  estimate_tab_id?: string | null;
  parent_id: string | null;
  kind: string;
};

type RenameEstimateNodeResult = {
  nodeId: string;
  name: string;
};

type CreateEstimateNodeResult = {
  nodeId: string;
  name: string;
  kind: CreateEstimateNodeKind;
  parentId: string | null;
  estimateTabId?: string | null;
};

type DeleteEstimateNodeResult = {
  eventId: string;
  tree: EstimateTreeNode[];
  deletedNodeIds: string[];
  fallbackNodeId: string | null;
};

type CreateEstimateNodeKind = "group" | "area";

type CreateEstimateNodeSiblingRow = {
  id: string;
  kind: string;
  sort_order: number;
};

function readInsertedRootNodeIds(value: unknown): string[] {
  if (!value || typeof value !== "object" || Array.isArray(value)) return [];
  const rootNodeIds = (value as { inserted_root_node_ids?: unknown }).inserted_root_node_ids;
  if (!Array.isArray(rootNodeIds)) return [];
  return rootNodeIds.filter((id): id is string => typeof id === "string" && id.length > 0);
}

function getMutationCorrelationId(mutationId: string | undefined) {
  return mutationId && isUuid(mutationId) ? mutationId : randomUUID();
}

function assertNotOptimisticEstimateNodeId(nodeId: string, label: string) {
  if (nodeId.startsWith("optimistic-")) throw new Error(`${label} id is invalid.`);
}

function assertPersistedUuid(value: string, label: string) {
  const id = value.trim();
  if (!isUuid(id) || id.startsWith("optimistic-") || id.startsWith("temp-")) throw new Error(`${label} id is invalid.`);
  return id;
}

function readNumber(value: unknown, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

type EstimateHistoryRowRpcResult = {
  rowId?: unknown;
  row?: {
    id?: unknown;
    nodeId?: unknown;
    material?: unknown;
    description?: unknown;
    supplier?: unknown;
    unit?: unknown;
    quantity?: unknown;
    quantityBase?: unknown;
    quantityContingencyAmount?: unknown;
    unitCost?: unknown;
    contingencyPercentage?: unknown;
    contingencyValue?: unknown;
    adjustmentPercentage?: unknown;
    adjustmentValue?: unknown;
    miscCost?: unknown;
    sourceSnapshot?: unknown;
    metadata?: unknown;
    linkState?: unknown;
    rowRevision?: unknown;
  };
};

function isJsonObject(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === "object" && !Array.isArray(value));
}

function readJsonValue(value: unknown, fallback: Json): Json {
  if (value === null || typeof value === "string" || typeof value === "number" || typeof value === "boolean" || Array.isArray(value) || isJsonObject(value)) return value as Json;
  return fallback;
}

function readHistoryRowResult(value: unknown) {
  if (!value || typeof value !== "object") throw new Error("Estimate row history RPC returned an invalid result.");
  const result = value as EstimateHistoryRowRpcResult;
  const row = result.row;
  if (!row || typeof row !== "object") throw new Error("Estimate row history RPC did not return the canonical row.");

  const rowId = typeof result.rowId === "string" ? result.rowId : typeof row.id === "string" ? row.id : "";
  const nodeId = typeof row.nodeId === "string" ? row.nodeId : "";
  if (!rowId || !nodeId) throw new Error("Estimate row history RPC returned an incomplete row.");

  return {
    rowId,
    nodeId,
    material: typeof row.material === "string" ? row.material : "",
    description: typeof row.description === "string" ? row.description : "",
    supplier: typeof row.supplier === "string" ? row.supplier : "",
    unit: typeof row.unit === "string" ? row.unit : "unit",
    quantity: readNumber(row.quantity),
    quantityBase: row.quantityBase === null || row.quantityBase === undefined ? null : readNumber(row.quantityBase),
    quantityContingencyAmount: row.quantityContingencyAmount === null || row.quantityContingencyAmount === undefined ? null : readNumber(row.quantityContingencyAmount),
    itemCost: readNumber(row.unitCost),
    contingencyPercentage: readNumber(row.contingencyPercentage),
    contingencyValue: readNumber(row.contingencyValue),
    adjustmentPercentage: readNumber(row.adjustmentPercentage),
    adjustmentValue: readNumber(row.adjustmentValue),
    miscCost: readNumber(row.miscCost),
    sourceSnapshot: readJsonValue(row.sourceSnapshot, null) as Json | null,
    metadata: readJsonValue(row.metadata, {}),
    linkState: row.linkState as Tables<"estimate_row_items">["link_state"],
    rowRevision: readNumber(row.rowRevision, 1),
  } satisfies UpdateEstimateRowItemResult;
}

function readMovedRowResult(value: unknown): MoveEstimateRowComponentResult {
  if (!value || typeof value !== "object") throw new Error("Estimate row move RPC returned an invalid result.");
  const result = value as Record<string, unknown>;
  const payload = result.payload && typeof result.payload === "object" ? result.payload as Record<string, unknown> : {};
  const sourceRow = result.sourceRow ?? payload.sourceRow;
  const targetRow = result.targetRow ?? payload.targetRow;

  return {
    sourceRow: readHistoryRowResult({ row: sourceRow }),
    targetRow: readHistoryRowResult({ row: targetRow }),
  };
}

function readMovedRowItemResultRow(value: unknown): MoveEstimateRowItemWithHistoryResultRow {
  if (!value || typeof value !== "object") throw new Error("Row reorganization RPC returned an invalid row result.");
  const row = value as Record<string, unknown>;
  const rowId = typeof row.rowId === "string" ? row.rowId : typeof row.id === "string" ? row.id : "";
  const nodeId = typeof row.nodeId === "string" ? row.nodeId : typeof row.node_id === "string" ? row.node_id : "";
  const sortOrder = readNumber(row.sortOrder ?? row.sort_order, Number.NaN);
  const rowRevision = readNumber(row.rowRevision ?? row.row_revision, Number.NaN);
  if (!rowId || !nodeId || !Number.isInteger(sortOrder) || sortOrder < 0 || !Number.isInteger(rowRevision) || rowRevision < 1) {
    throw new Error("Row reorganization RPC returned an incomplete row result.");
  }

  return { rowId, nodeId, sortOrder, rowRevision };
}

function readMovedRowItemResult(value: unknown): MoveEstimateRowItemWithHistoryResult {
  if (!value || typeof value !== "object") throw new Error("Row reorganization RPC returned an invalid result.");
  const result = value as Record<string, unknown>;
  const payload = result.payload && typeof result.payload === "object" ? result.payload as Record<string, unknown> : {};
  const rowsValue = result.rows ?? payload.rows;
  const rows = Array.isArray(rowsValue) ? rowsValue.map(readMovedRowItemResultRow) : [];

  return {
    eventId: readStringResult(result.eventId ?? payload.eventId, "Row reorganization RPC did not return a history event id."),
    updatedRowCount: readNumber(result.updatedRowCount ?? payload.updatedRowCount, rows.length),
    rows,
  };
}

function readStringResult(value: unknown, message: string) {
  if (typeof value === "string" && value.length > 0) return value;
  throw new Error(message);
}

function readBulkDeletedRowIds(value: unknown): string[] {
  if (Array.isArray(value)) return value.filter((id): id is string => typeof id === "string" && id.length > 0);
  return [];
}

function readDeletedRowResult(value: unknown): DeleteEstimateRowItemResult {
  if (!value || typeof value !== "object") throw new Error("Row delete RPC returned an invalid result.");
  const result = value as Record<string, unknown>;
  const payload = result.payload && typeof result.payload === "object" ? result.payload as Record<string, unknown> : {};
  const deletedRow = result.deletedRow ?? payload.deletedRow;
  const deletedRowId = readStringResult(result.rowId ?? payload.rowId, "Row delete RPC returned an incomplete result.");

  return {
    eventId: readStringResult(result.eventId ?? payload.eventId, "Row delete RPC did not return a history event id."),
    deletedRowId,
    deletedRow: readHistoryRowResult({ rowId: deletedRowId, row: deletedRow }),
  };
}

function readDeleteRowsBulkResult(value: unknown): DeleteEstimateRowItemsBulkResult {
  if (!value || typeof value !== "object") throw new Error("Bulk row delete RPC returned an invalid result.");
  const result = value as Record<string, unknown>;
  const payload = result.payload && typeof result.payload === "object" ? result.payload as Record<string, unknown> : {};
  const deletedRowIds = readBulkDeletedRowIds(result.deletedRowIds ?? payload.deletedRowIds);

  return {
    eventId: readStringResult(result.eventId ?? payload.eventId, "Bulk row delete RPC did not return a history event id."),
    deletedRowIds,
    deletedRowCount: readNumber(result.deletedRowCount ?? payload.deletedRowCount, deletedRowIds.length),
  };
}

function readRestoreDeletedRowsResult(value: unknown): RestoreDeletedEstimateRowsResult {
  if (!value || typeof value !== "object") throw new Error("Deleted row restore RPC returned an invalid result.");
  const result = value as Record<string, unknown>;
  const payload = result.payload && typeof result.payload === "object" ? result.payload as Record<string, unknown> : {};
  const restoredRowsValue = result.restoredRows ?? payload.restoredRows;
  const restoredRows = Array.isArray(restoredRowsValue)
    ? restoredRowsValue.map((row) => readHistoryRowResult({ row }))
    : [];
  const restoredRowIds = readBulkDeletedRowIds(result.restoredRowIds ?? payload.restoredRowIds);

  return {
    eventId: readStringResult(result.eventId ?? payload.eventId, "Deleted row restore RPC did not return a history event id."),
    sourceEventId: readStringResult(result.sourceEventId ?? payload.sourceEventId, "Deleted row restore RPC did not return the source event id."),
    restoredRowIds: restoredRowIds.length > 0 ? restoredRowIds : restoredRows.map((row) => row.rowId),
    restoredRowCount: readNumber(result.restoredRowCount ?? payload.restoredRowCount, restoredRows.length),
    restoredRows,
  };
}

function readRestoreDeletedNodesResult(value: unknown): Omit<RestoreDeletedEstimateNodesResult, "tree"> {
  if (!value || typeof value !== "object") throw new Error("Deleted node restore RPC returned an invalid result.");
  const result = value as Record<string, unknown>;
  const payload = result.payload && typeof result.payload === "object" ? result.payload as Record<string, unknown> : {};
  const restoredNodeIds = readBulkDeletedRowIds(result.restoredNodeIds ?? payload.restoredNodeIds);
  const restoredRootNodeIds = readBulkDeletedRowIds(result.restoredRootNodeIds ?? payload.restoredRootNodeIds);
  const restoredRowIds = readBulkDeletedRowIds(result.restoredRowIds ?? payload.restoredRowIds);

  return {
    eventId: readStringResult(result.eventId ?? payload.eventId, "Deleted node restore RPC did not return a history event id."),
    sourceEventId: readStringResult(result.sourceEventId ?? payload.sourceEventId, "Deleted node restore RPC did not return the source event id."),
    restoredNodeIds,
    restoredRootNodeIds,
    restoredNodeCount: readNumber(result.restoredNodeCount ?? payload.restoredNodeCount, restoredNodeIds.length),
    restoredRowIds,
    restoredRowCount: readNumber(result.restoredRowCount ?? payload.restoredRowCount, restoredRowIds.length),
  };
}

async function assertCanEditEstimate(supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>, estimateId: string) {
  const { data, error } = await supabase.rpc("can_edit_estimate", { target_estimate_id: estimateId });
  if (error) throw error;
  if (data !== true) throw new Error("Estimate edit access denied.");
  const currentUser = await requireCurrentUserContext();
  assertEstimateActionRateLimit({
    resourceId: estimateId,
    surface: "estimate-mutation",
    userId: currentUser.userId,
  });
}

function normalizeEstimateSheetAdjustmentMode(value: EstimateSheetAdjustmentMode): EstimateSheetAdjustmentMode {
  if (value === "contingency" || value === "discount") return value;
  throw new Error("Estimate adjustment mode is invalid.");
}

function normalizeEstimateSheetAdjustmentPercentage(value: number) {
  const percentage = Number(value);
  if (!Number.isFinite(percentage) || percentage < 0 || percentage > 100) {
    throw new Error("Estimate adjustment percentage must be between 0 and 100.");
  }
  return percentage;
}

function readEstimateSheetAdjustmentRpcResult(value: unknown): EstimateSheetAdjustment {
  const result = readJsonRecord(value);
  const payload = readJsonRecord(result.payload);
  const adjustment = readJsonRecord(result.adjustment ?? result.row ?? payload.adjustment);
  const estimateId = typeof adjustment.estimateId === "string"
    ? adjustment.estimateId
    : typeof adjustment.estimate_id === "string"
      ? adjustment.estimate_id
      : "";
  if (!estimateId) throw new Error("Estimate sheet adjustment RPC returned an invalid result.");

  const mode = normalizeEstimateSheetAdjustmentMode(
    typeof adjustment.mode === "string" ? adjustment.mode as EstimateSheetAdjustmentMode : "contingency",
  );
  const updatedAt = typeof adjustment.updatedAt === "string"
    ? adjustment.updatedAt
    : typeof adjustment.updated_at === "string"
      ? adjustment.updated_at
      : undefined;
  const updatedBy = typeof adjustment.updatedBy === "string"
    ? adjustment.updatedBy
    : typeof adjustment.updated_by === "string"
      ? adjustment.updated_by
      : null;

  return {
    estimateId,
    mode,
    percentage: readNumber(adjustment.percentage),
    rowRevision: readNumber(adjustment.rowRevision ?? adjustment.row_revision, 0),
    updatedAt,
    updatedBy,
  };
}

// Project-scoped edit guard for sheet creation (no estimate id exists yet). RLS
// still backstops the insert; this returns a clean app-level denial first so a
// read-only collaborator never sees a raw RLS error (F15 / P3-3).
async function assertCanEditProject(supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>, projectId: string) {
  const { data, error } = await supabase.rpc("can_edit_project", { target_project_id: projectId });
  if (error) throw error;
  if (data !== true) throw new Error("Project edit access denied.");
  const currentUser = await requireCurrentUserContext();
  assertEstimateActionRateLimit({
    resourceId: projectId,
    surface: "project-estimate-create",
    userId: currentUser.userId,
  });
}

function readEstimateNodeKind(formData: FormData): CreateEstimateNodeKind {
  const value = readRequiredText(formData, "kind");
  if (value === "group") return "group";
  if (value === "area") return "area";
  throw new Error("Estimate node kind must be group or area.");
}

function readJsonRecord(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  return value as Record<string, unknown>;
}

function readStringArray(value: unknown) {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];
}

function readDeleteEstimateNodeRpcResult(
  value: unknown,
  fallbackDeletedNodeIds: string[],
  fallbackNodeId: string | null,
): Pick<DeleteEstimateNodeResult, "eventId" | "deletedNodeIds" | "fallbackNodeId"> {
  if (!value || typeof value !== "object") {
    throw new Error("Tree delete RPC returned an invalid result.");
  }

  const result = value as Record<string, unknown>;
  const payload = readJsonRecord(result.payload);
  const deletedNodeIds = readStringArray(result.deletedNodeIds ?? payload.deletedNodeIds);
  const nextFallbackNodeId = result.fallbackNodeId ?? payload.fallbackNodeId;

  return {
    eventId: readStringResult(result.eventId ?? payload.eventId, "Tree delete RPC did not return a history event id."),
    deletedNodeIds: deletedNodeIds.length ? deletedNodeIds : fallbackDeletedNodeIds,
    fallbackNodeId: typeof nextFallbackNodeId === "string" ? nextFallbackNodeId : fallbackNodeId,
  };
}

function getFallbackActorLabel(actorUserId: string | null) {
  return actorUserId ? "Unknown user" : "System/backfill";
}

function readProfileActorLabel(value: unknown) {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed || null;
}

function readProfileEmailActorLabel(value: unknown) {
  const email = readProfileActorLabel(value)?.toLowerCase();
  if (!email) return null;
  if (email === "philipjonlewis@gmail.com") return "Philip Lewis";

  const [localPart] = email.split("@");
  const spacedLocalPart = localPart?.replace(/[._-]+/g, " ").trim();
  if (!spacedLocalPart) return null;
  if (!spacedLocalPart.includes(" ")) return email;

  return spacedLocalPart
    .split(/\s+/)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function normalizeHistoryEvent(row: Tables<"estimate_sheet_events">, actorLabels = new Map<string, string>()): EstimateSheetHistoryEvent {
  const actorUserId = row.actor_user_id;
  return {
    id: row.id,
    eventType: row.event_type,
    eventSource: row.event_source,
    createdAt: row.created_at,
    actorUserId,
    actorLabel: actorUserId ? actorLabels.get(actorUserId) ?? getFallbackActorLabel(actorUserId) : getFallbackActorLabel(null),
    estimateTabId: row.estimate_tab_id ?? null,
    targetRowId: row.target_row_id,
    estimateNodeId: row.estimate_node_id,
    rowContext: readJsonRecord(row.row_context),
    oldSnapshot: row.old_snapshot,
    newSnapshot: row.new_snapshot,
    changedFields: readStringArray(row.changed_fields),
    totalDelta: row.total_delta === null ? null : Number(row.total_delta),
    payload: readJsonRecord(row.payload),
    correlationId: row.correlation_id,
  };
}

function normalizeHistoryCursor(cursor: EstimateSheetHistoryCursor | null | undefined, label: string): EstimateSheetHistoryCursor | null {
  if (!cursor) return null;
  if (!isUuid(cursor.id)) throw new Error(`${label} cursor id is invalid.`);

  const createdAt = new Date(cursor.createdAt);
  if (Number.isNaN(createdAt.getTime())) throw new Error(`${label} cursor timestamp is invalid.`);

  return {
    id: cursor.id,
    createdAt: cursor.createdAt,
  };
}

function buildHistoryCursorFilter(cursor: EstimateSheetHistoryCursor) {
  return `created_at.lt.${cursor.createdAt},and(created_at.eq.${cursor.createdAt},id.lt.${cursor.id})`;
}

const DORMANT_NAMED_VERSION_EVENT_TYPES = ["sheet_version_created", "sheet_restored_as_copy"] as const;

function isDormantNamedVersionEventType(eventType: string) {
  return eventType === "sheet_version_created" || eventType === "sheet_restored_as_copy";
}

function buildHistoryEventPageRows(rows: Tables<"estimate_sheet_events">[], limit: number) {
  const filteredRows = rows.filter((row) => !isDormantNamedVersionEventType(row.event_type));
  const pageRows = filteredRows.slice(0, limit);
  const lastRow = pageRows.at(-1);

  return {
    rows: pageRows,
    nextCursor: filteredRows.length > limit && lastRow ? { createdAt: lastRow.created_at, id: lastRow.id } : null,
  };
}

function applySupportedActivityEventFilter<TQuery extends { not: (column: string, operator: string, value: string) => TQuery }>(query: TQuery) {
  return query.not("event_type", "in", `(${DORMANT_NAMED_VERSION_EVENT_TYPES.join(",")})`);
}

type ActivityReadFilters = {
  eventTypes: string[];
  dateFrom: string | null;
  dateTo: string | null;
  searchTerm: string | null;
  searchPattern: string | null;
};

type ActivityReadFilterQuery<TSelf> = {
  not: (column: string, operator: string, value: string) => TSelf;
  in: (column: string, values: string[]) => TSelf;
  gte: (column: string, value: string) => TSelf;
  lte: (column: string, value: string) => TSelf;
  or: (filters: string) => TSelf;
};

function normalizeActivityDate(value: string | undefined, label: string) {
  const trimmed = value?.trim();
  if (!trimmed) return null;
  if (Number.isNaN(new Date(trimmed).getTime())) throw new Error(`${label} is invalid.`);
  return trimmed;
}

function normalizeActivitySearch(value: string | undefined) {
  const trimmed = value?.trim().replace(/\s+/g, " ");
  if (!trimmed) return null;
  if (trimmed.length > 80) throw new Error("Activity search must be 80 characters or less.");
  if (!/^[A-Za-z0-9 _./:#-]+$/.test(trimmed)) throw new Error("Activity search contains unsupported characters.");
  return trimmed;
}

function normalizeActivityReadFilters(input: FetchEstimateSheetVersionControlInput): ActivityReadFilters {
  const eventTypes = Array.from(new Set((input.eventTypes ?? []).flatMap((eventType) => {
    const trimmed = eventType.trim();
    return trimmed ? [trimmed] : [];
  })));
  for (const eventType of eventTypes) {
    if (!/^[a-z0-9_]+$/.test(eventType)) throw new Error("Activity event type filter contains unsupported characters.");
    if (isDormantNamedVersionEventType(eventType)) {
      throw new Error("Dormant named-version events are not supported in Activity.");
    }
  }

  return {
    eventTypes,
    dateFrom: normalizeActivityDate(input.dateFrom, "Activity start date"),
    dateTo: normalizeActivityDate(input.dateTo, "Activity end date"),
    searchTerm: normalizeActivitySearch(input.search),
    searchPattern: normalizeActivitySearch(input.search)?.replace(/\s+/g, "%") ?? null,
  };
}

function applyActivityReadFilters<TQuery extends ActivityReadFilterQuery<TQuery>>(query: TQuery, filters: ActivityReadFilters): TQuery {
  let filteredQuery = applySupportedActivityEventFilter(query);

  if (filters.eventTypes.length > 0) {
    filteredQuery = filteredQuery.in("event_type", filters.eventTypes) as TQuery;
  }

  if (filters.dateFrom) {
    filteredQuery = filteredQuery.gte("created_at", filters.dateFrom) as TQuery;
  }

  if (filters.dateTo) {
    filteredQuery = filteredQuery.lte("created_at", filters.dateTo) as TQuery;
  }

  if (filters.searchPattern) {
    const ilikePattern = `%${filters.searchPattern}%`;
    const searchFilters = [
      `event_type.ilike.${ilikePattern}`,
      `row_context->>material.ilike.${ilikePattern}`,
      `row_context->>supplier.ilike.${ilikePattern}`,
      `row_context->>category.ilike.${ilikePattern}`,
      `payload->>material.ilike.${ilikePattern}`,
      `payload->>name.ilike.${ilikePattern}`,
      `old_snapshot->>material.ilike.${ilikePattern}`,
      `new_snapshot->>material.ilike.${ilikePattern}`,
    ];

    if (filters.searchTerm && isUuid(filters.searchTerm)) {
      searchFilters.push(
        `id.eq.${filters.searchTerm}`,
        `correlation_id.eq.${filters.searchTerm}`,
        `target_row_id.eq.${filters.searchTerm}`,
        `estimate_node_id.eq.${filters.searchTerm}`,
      );
    }

    filteredQuery = filteredQuery.or(searchFilters.join(",")) as TQuery;
  }

  return filteredQuery;
}

async function resolveActivityActorLabels(
  supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>,
  rows: Tables<"estimate_sheet_events">[],
) {
  const actorUserIds = Array.from(new Set(rows.map((row) => row.actor_user_id).filter((id): id is string => typeof id === "string" && id.length > 0)));
  if (!actorUserIds.length) return new Map<string, string>();

  try {
    const { data, error } = await supabase
      .from("profiles")
      .select("id, display_name, email")
      .in("id", actorUserIds);

    if (error) return new Map<string, string>();

    return new Map(
      ((data ?? []) as Array<{ id: string; display_name: string | null; email: string | null }>)
        .map((profile) => [profile.id, readProfileActorLabel(profile.display_name) ?? readProfileEmailActorLabel(profile.email) ?? getFallbackActorLabel(profile.id)] as const),
    );
  } catch {
    return new Map<string, string>();
  }
}

type EstimateActivityNodeScope = {
  nodeIds: string[];
  rowIds: string[];
};

type EstimateActivityNodeRow = {
  id: string;
  estimate_id?: string;
  parent_id: string | null;
  kind: string;
};

type EstimateActivityRowScopeRow = {
  id: string;
};

function collectDescendantNodeIds(nodes: EstimateActivityNodeRow[], rootNodeId: string) {
  const childrenByParent = new Map<string | null, EstimateActivityNodeRow[]>();
  for (const node of nodes) {
    const children = childrenByParent.get(node.parent_id) ?? [];
    children.push(node);
    childrenByParent.set(node.parent_id, children);
  }

  const descendantIds: string[] = [];
  const queue = [rootNodeId];
  const seen = new Set<string>();
  while (queue.length) {
    const currentId = queue.shift();
    if (!currentId || seen.has(currentId)) continue;
    seen.add(currentId);
    descendantIds.push(currentId);
    for (const child of childrenByParent.get(currentId) ?? []) {
      queue.push(child.id);
    }
  }

  return descendantIds;
}

function buildNodeScopeEventFilter(scope: EstimateActivityNodeScope) {
  const nodeFilter = scope.nodeIds.length ? `estimate_node_id.in.(${scope.nodeIds.join(",")})` : "";
  const rowFilter = scope.rowIds.length ? `target_row_id.in.(${scope.rowIds.join(",")})` : "";
  return [nodeFilter, rowFilter].filter(Boolean).join(",");
}

async function resolveEstimateActivityNodeScope({
  supabase,
  estimateId,
  projectId,
  nodeId,
  includeDescendants,
}: {
  supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>;
  estimateId: string;
  projectId: string;
  nodeId: string;
  includeDescendants: boolean;
}): Promise<EstimateActivityNodeScope> {
  const { data: node, error: nodeError } = await supabase
    .from("estimate_nodes")
    .select("id, estimate_id, parent_id, kind, estimates!inner(project_id)")
    .eq("id", nodeId)
    .eq("estimate_id", estimateId)
    .eq("estimates.project_id", projectId)
    .maybeSingle();

  if (nodeError) throw nodeError;
  if (!node) throw new Error("Estimate activity node not found in the current estimate.");

  if (!includeDescendants) {
    return { nodeIds: [nodeId], rowIds: [] };
  }

  const { data: descendantNodes, error: descendantsError } = await supabase
    .from("estimate_nodes")
    .select("id, parent_id, kind")
    .eq("estimate_id", estimateId);

  if (descendantsError) throw descendantsError;

  const nodeIds = collectDescendantNodeIds((descendantNodes ?? []) as EstimateActivityNodeRow[], nodeId);
  if (!nodeIds.length) nodeIds.push(nodeId);
  const { data: rows, error: rowsError } = await supabase
    .from("estimate_row_items")
    .select("id")
    .eq("estimate_id", estimateId)
    .in("node_id", nodeIds);

  if (rowsError) throw rowsError;

  return {
    nodeIds,
    rowIds: ((rows ?? []) as EstimateActivityRowScopeRow[]).map((row) => row.id),
  };
}

async function getValidatedEstimateRow(projectId: string, estimateId: string, rowId: string, options?: { requireEdit?: boolean }) {
  const { project } = await getCurrentWorkspaceProject(projectId);
  if (!project) throw new Error("Project not found in the current workspace.");

  const supabase = await createSupabaseServerClient();
  if (options?.requireEdit) await assertCanEditEstimate(supabase, estimateId);
  const { data: row, error } = await supabase
    .from("estimate_row_items")
    .select("id, node_id, estimate_id, source_library_item_id, source_snapshot, metadata, link_state, row_revision, estimate_nodes!inner(id, kind, estimates!inner(project_id))")
    .eq("id", rowId)
    .eq("estimate_id", estimateId)
    .eq("estimate_nodes.estimates.project_id", project.id)
    .maybeSingle();

  if (error) throw error;
  if (!row) throw new Error("Estimate row item not found in the current project.");

  return { project, supabase, row };
}

async function getValidatedEstimateNode(
  projectId: string,
  estimateId: string,
  nodeId: string,
  options?: { requireEdit?: boolean },
) {
  const { project } = await getCurrentWorkspaceProject(projectId);
  if (!project) throw new Error("Project not found in the current workspace.");

  const supabase = await createSupabaseServerClient();
  const { data: estimate, error: estimateError } = await supabase
    .from("estimates")
    .select("id, project_id")
    .eq("id", estimateId)
    .eq("project_id", project.id)
    .maybeSingle();

  if (estimateError) throw estimateError;
  if (!estimate) throw new Error("Estimate not found in the current project.");
  if (options?.requireEdit) await assertCanEditEstimate(supabase, estimate.id);

  const { data: node, error: nodeError } = await supabase
    .from("estimate_nodes")
    .select("id, estimate_id, parent_id, kind, estimates!inner(project_id)")
    .eq("id", nodeId)
    .eq("estimate_id", estimate.id)
    .eq("estimates.project_id", project.id)
    .maybeSingle();

  if (nodeError) throw nodeError;
  if (!node) throw new Error("Estimate tree node not found in the current project.");

  return { project, estimate, supabase, node: node as ValidatedEstimateNodeRow };
}

function readEstimateNodeName(input: FormData | string) {
  if (typeof input === "string") return normalizeEditableText(input, "Estimate tree node name");
  return readRequiredText(input, "name");
}

function getSourceSnapshot(libraryItem: EstimateRowItem): Json {
  return sanitizeEstimateRowSourceSnapshot({
    category: libraryItem.category,
    categoryNodeId: libraryItem.categoryNodeId ?? null,
    categoryPath: libraryItem.categoryPath ?? [],
    brand: libraryItem.brand ?? null,
    brandId: libraryItem.brandId ?? null,
    componentVersionId: libraryItem.componentVersionId ?? null,
    componentVersionNumber: libraryItem.componentVersionNumber ?? null,
    imageUrl: libraryItem.imageUrl ?? null,
    lifecycleState: libraryItem.lifecycleState ?? null,
    priceOptionId: libraryItem.priceOptionId ?? null,
    priceOptionLabel: libraryItem.priceOptionLabel ?? null,
    pricingDate: libraryItem.pricingDate,
    pricingSource: libraryItem.pricingSource,
    sourceUrl: libraryItem.sourceUrl ?? null,
    sourceLibraryItemId: getSourceLibraryItemId(libraryItem),
    supplier: libraryItem.supplier ?? null,
    supplierId: libraryItem.supplierId ?? null,
    tags: libraryItem.tags ?? [],
    taxonomyVersion: "2026-05-22-draft-3",
    unit: libraryItem.unit,
    unit_cost: libraryItem.itemCost,
    contingency_percentage: libraryItem.contingencyPercentage ?? 0,
    adjustment_percentage: libraryItem.adjustmentPercentage ?? 0,
    misc_cost: libraryItem.miscCost,
    currency: libraryItem.currency ?? "PHP",
  }) as Json;
}

function isPlainRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function readJsonObject(value: unknown): Record<string, Json | undefined> {
  return isPlainRecord(value)
    ? { ...(value as Record<string, Json | undefined>) }
    : {};
}

function mergeJsonObject(value: unknown, patch: Record<string, Json | undefined>): Json {
  return {
    ...readJsonObject(value),
    ...patch,
  } as Json;
}

const SOURCE_SNAPSHOT_MAX_STRING_LENGTH = 2048;
const SOURCE_SNAPSHOT_MAX_ARRAY_ITEMS = 50;
const SOURCE_SNAPSHOT_ALLOWED_KEYS = new Set([
  "adjustment_percentage",
  "areaName",
  "brand",
  "brandId",
  "category",
  "categoryNodeId",
  "categoryPath",
  "componentVersionId",
  "componentVersionNumber",
  "confidence",
  "contingency_percentage",
  "currency",
  "description",
  "designation",
  "discipline",
  "generatedBy",
  "imageAsset",
  "imageUrl",
  "lifecycleState",
  "material",
  "misc_cost",
  "notes",
  "notSupplierPriced",
  "priceOptionId",
  "priceOptionLabel",
  "priceOptionUpdatedAt",
  "pricingDate",
  "pricingSource",
  "projectName",
  "sheetCode",
  "snapshotPreservedAt",
  "sku",
  "source",
  "sourceComponentId",
  "sourceEstimateId",
  "sourceEstimateRowId",
  "sourceLibraryItemId",
  "sourceProjectId",
  "sourceTemplateAreaName",
  "sourceTemplateId",
  "sourceTemplateName",
  "sourceTemplateRowId",
  "sourceType",
  "sourceUpdatedAt",
  "sourceUrl",
  "supplier",
  "supplierId",
  "tags",
  "taxonomyVersion",
  "templateAreaName",
  "templateName",
  "unit",
  "unit_cost",
  "untrustedDataNotice",
]);

function hasControlCharacters(value: string) {
  return /[\u0000-\u001f\u007f]/.test(value);
}

function sanitizeSourceSnapshotString(value: unknown): string | null | undefined {
  if (value === null) return null;
  if (typeof value !== "string") return undefined;
  const text = value.trim();
  if (!text) return null;
  if (text.length > SOURCE_SNAPSHOT_MAX_STRING_LENGTH || hasControlCharacters(text)) return undefined;
  return text;
}

function sanitizeSourceSnapshotNumber(value: unknown): number | undefined {
  return typeof value === "number" && Number.isFinite(value) ? value : undefined;
}

function sanitizeSourceSnapshotStringArray(value: unknown): string[] | undefined {
  if (!Array.isArray(value)) return undefined;
  const values = value
    .flatMap((item) => {
      const text = sanitizeSourceSnapshotString(item);
      return typeof text === "string" ? [text] : [];
    })
    .slice(0, SOURCE_SNAPSHOT_MAX_ARRAY_ITEMS);
  return values.length > 0 ? values : undefined;
}

function sanitizeEstimateRowImageAssetDescriptor(value: unknown): Json | undefined {
  if (value === null) return null;
  if (!isEstimateRowImageAssetDescriptor(value)) return undefined;

  const descriptor: Record<string, Json> = {
    kind: value.kind,
    schemaVersion: value.schemaVersion,
    assetId: value.assetId,
    uploadSessionId: value.uploadSessionId,
    bucket: value.bucket,
    path: value.path,
    contentType: value.contentType,
    sizeBytes: value.sizeBytes,
    scanStatus: value.scanStatus,
  };
  if (value.thumbnailPath !== undefined) descriptor.thumbnailPath = value.thumbnailPath;
  if (value.fileName !== undefined) descriptor.fileName = value.fileName;
  if (typeof value.width === "number" && Number.isFinite(value.width)) descriptor.width = value.width;
  if (typeof value.height === "number" && Number.isFinite(value.height)) descriptor.height = value.height;
  if (typeof value.thumbnailWidth === "number" && Number.isFinite(value.thumbnailWidth)) descriptor.thumbnailWidth = value.thumbnailWidth;
  if (typeof value.thumbnailHeight === "number" && Number.isFinite(value.thumbnailHeight)) descriptor.thumbnailHeight = value.thumbnailHeight;
  return descriptor;
}

function sanitizeEstimateRowSourceSnapshotForPersistence(value: unknown): Json | null {
  const sourceSnapshot = readJsonObject(value);
  const sanitized: Record<string, Json> = {};

  for (const [key, rawValue] of Object.entries(sourceSnapshot)) {
    if (!SOURCE_SNAPSHOT_ALLOWED_KEYS.has(key)) continue;

    if (key === "imageUrl") {
      sanitized.imageUrl = normalizeEstimateRowImageUrl(rawValue);
      continue;
    }
    if (key === "sourceUrl") {
      sanitized.sourceUrl = rawValue === null ? null : sanitizeComponentSourceUrl(rawValue);
      continue;
    }
    if (key === "imageAsset") {
      const descriptor = sanitizeEstimateRowImageAssetDescriptor(rawValue);
      if (descriptor !== undefined) sanitized.imageAsset = descriptor;
      continue;
    }
    if (key === "categoryPath" || key === "tags") {
      const values = sanitizeSourceSnapshotStringArray(rawValue);
      if (values !== undefined) sanitized[key] = values;
      continue;
    }
    if (key === "componentVersionNumber" || key === "unit_cost" || key === "contingency_percentage" || key === "adjustment_percentage" || key === "misc_cost") {
      const numberValue = sanitizeSourceSnapshotNumber(rawValue);
      if (numberValue !== undefined) sanitized[key] = numberValue;
      continue;
    }
    if (key === "notSupplierPriced") {
      if (typeof rawValue === "boolean") sanitized.notSupplierPriced = rawValue;
      continue;
    }

    const text = sanitizeSourceSnapshotString(rawValue);
    if (text !== undefined) sanitized[key] = text;
  }

  return Object.keys(sanitized).length > 0 ? sanitized : null;
}

function readDescriptorText(record: Record<string, unknown>, key: keyof EstimateRowImageAssetDescriptor) {
  const value = record[key];
  return typeof value === "string" && value.trim().length > 0 ? value : null;
}

function isEstimateRowImageAssetDescriptor(value: unknown): value is EstimateRowImageAssetDescriptor {
  if (!isPlainRecord(value)) return false;
  return (
    value.kind === "upload-asset"
    && value.schemaVersion === 1
    && readDescriptorText(value, "assetId") !== null
    && readDescriptorText(value, "uploadSessionId") !== null
    && readDescriptorText(value, "bucket") !== null
    && readDescriptorText(value, "path") !== null
    && readDescriptorText(value, "contentType") !== null
    && typeof value.sizeBytes === "number"
    && Number.isFinite(value.sizeBytes)
    && value.sizeBytes > 0
    && readDescriptorText(value, "scanStatus") !== null
  );
}

async function validateEstimateRowImageAssetPatch({
  supabase,
  projectId,
  estimateId,
  rowId,
  sourceSnapshotPatch,
}: {
  supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>;
  projectId: string;
  estimateId: string;
  rowId: string;
  sourceSnapshotPatch: Record<string, Json | undefined>;
}) {
  if (!Object.prototype.hasOwnProperty.call(sourceSnapshotPatch, "imageAsset")) return sourceSnapshotPatch;
  const candidate = sourceSnapshotPatch.imageAsset;
  if (candidate === null || candidate === undefined) return sourceSnapshotPatch;
  if (!isPlainRecord(candidate)) throw new Error("Reference image asset is invalid.");

  const assetId = readDescriptorText(candidate, "assetId");
  const uploadSessionId = readDescriptorText(candidate, "uploadSessionId");
  if (!assetId || !uploadSessionId) throw new Error("Reference image asset is invalid.");

  const rpc = supabase.rpc as UploadAssetValidationRpc;
  const { data, error } = await rpc("validate_estimate_row_image_asset", {
    target_asset_id: assetId,
    target_upload_session_id: uploadSessionId,
    target_project_id: projectId,
    target_estimate_id: estimateId,
    target_row_id: rowId,
  });

  if (error) throw new Error(error.message ?? "Could not validate reference image asset.");
  if (!isEstimateRowImageAssetDescriptor(data)) {
    throw new Error("Reference image asset is not valid for this estimate row.");
  }

  return {
    ...sourceSnapshotPatch,
    imageAsset: data as Json,
  };
}

async function removeUnvalidatedEstimateRowImageAsset({
  supabase,
  projectId,
  estimateId,
  rowId,
  sourceSnapshot,
}: {
  supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>;
  projectId: string;
  estimateId: string;
  rowId: string;
  sourceSnapshot: Record<string, Json | undefined>;
}) {
  if (!Object.prototype.hasOwnProperty.call(sourceSnapshot, "imageAsset")) return sourceSnapshot;
  const candidate = sourceSnapshot.imageAsset;
  if (candidate === null || candidate === undefined) return sourceSnapshot;

  const withoutImageAsset = { ...sourceSnapshot };
  delete withoutImageAsset.imageAsset;
  if (!isPlainRecord(candidate)) return withoutImageAsset;

  const assetId = readDescriptorText(candidate, "assetId");
  const uploadSessionId = readDescriptorText(candidate, "uploadSessionId");
  if (!assetId || !uploadSessionId) return withoutImageAsset;

  const rpc = supabase.rpc as UploadAssetValidationRpc;
  const { data, error } = await rpc("validate_estimate_row_image_asset", {
    target_asset_id: assetId,
    target_upload_session_id: uploadSessionId,
    target_project_id: projectId,
    target_estimate_id: estimateId,
    target_row_id: rowId,
  });

  if (error) throw new Error(error.message ?? "Could not validate reference image asset.");
  if (!isEstimateRowImageAssetDescriptor(data)) return withoutImageAsset;

  return {
    ...sourceSnapshot,
    imageAsset: data as Json,
  };
}

function getEstimateRowMetadata(libraryItem: EstimateRowItem): Json {
  const existingMetadata = readEstimateRowMetadata(libraryItem.metadata);
  const sourceLibraryItemId = getSourceLibraryItemId(libraryItem);
  const tags = (libraryItem.tags ?? (Array.isArray(existingMetadata.tags) ? existingMetadata.tags : []))
    .filter((tag): tag is string => typeof tag === "string");
  const metadata = {
    ...existingMetadata,
    categoryNodeId: libraryItem.categoryNodeId ?? null,
    categoryPath: libraryItem.categoryPath ?? [],
    brandId: libraryItem.brandId ?? null,
    supplierId: libraryItem.supplierId ?? null,
    sourceComponentId: sourceLibraryItemId,
    componentVersionId: libraryItem.componentVersionId ?? null,
    componentVersionNumber: libraryItem.componentVersionNumber ?? null,
    priceOptionId: libraryItem.priceOptionId ?? null,
    tags,
  };

  if (isExpressComponentRow({ metadata })) {
    return {
      ...metadata,
      sourceComponentId: null,
      tags: tags.filter((tag) => tag !== LEGACY_BLANK_ROW_TAG),
    } as Json;
  }

  return {
    ...metadata,
  } as Json;
}

function getSourceLibraryItemId(libraryItem: EstimateRowItem) {
  if (libraryItem.sourceLibraryItemId && isUuid(libraryItem.sourceLibraryItemId)) return libraryItem.sourceLibraryItemId;
  return libraryItem.source === "library" && isUuid(libraryItem.id) ? libraryItem.id : null;
}

function buildEstimateRowReplacementPayload(libraryItem: EstimateRowItem) {
  const quantity = libraryItem.quantity || 1;
  const quantityBase = libraryItem.quantityBase ?? null;
  const quantityContingencyAmount = quantityBase === null ? null : libraryItem.quantityContingencyAmount ?? 0;
  const sourceLibraryItemId = getSourceLibraryItemId(libraryItem);

  return {
    sourceLibraryItemId,
    sourceSnapshot: getSourceSnapshot(libraryItem),
    categoryNodeId: libraryItem.categoryNodeId ?? null,
    supplierId: libraryItem.supplierId ?? null,
    material: libraryItem.material,
    description: libraryItem.description,
    supplier: libraryItem.supplier,
    unit: libraryItem.unit,
    quantity,
    quantityBase,
    quantityContingencyAmount,
    unitCost: libraryItem.itemCost,
    contingencyPercentage: libraryItem.contingencyPercentage ?? 0,
    adjustmentPercentage: libraryItem.adjustmentPercentage ?? 0,
    miscCost: libraryItem.miscCost,
    discipline: libraryItem.discipline,
    designation: libraryItem.designation,
    metadata: getEstimateRowMetadata(libraryItem),
    linkState: sourceLibraryItemId ? "linked-clean" : "unlinked",
  };
}

async function assertCurrentLibrarySourceForEstimateCommit(
  supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>,
  libraryItem: EstimateRowItem,
) {
  const sourceLibraryItemId = getSourceLibraryItemId(libraryItem);
  if (!sourceLibraryItemId) return;

  const { data, error } = await supabase
    .from("cost_library_items")
    .select("id, updated_at, lifecycle_state")
    .eq("id", sourceLibraryItemId)
    .maybeSingle();

  if (error) throw error;
  if (!data) {
    throw new Error("Library source changed. Refresh the estimate before committing this component.");
  }
  if (data.lifecycle_state === "archived") {
    throw new Error("Library source is archived. Refresh the estimate before committing this component.");
  }
  const sourceUpdatedAt = typeof data.updated_at === "string" ? data.updated_at : null;
  if (libraryItem.updatedAt && sourceUpdatedAt && sourceUpdatedAt !== libraryItem.updatedAt) {
    throw new Error("Library source changed. Refresh the estimate before committing this component.");
  }
}

async function insertEstimateWithSheetCodeFallback(
  supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>,
  payload: TablesInsert<"estimates">,
  sheetCode: string,
) {
  // legacy "sheet_code" name kept for compatibility; see plan 2026-06-12 §01-17
  const nextPayload = { ...payload };

  for (let attempt = 0; attempt < 3; attempt += 1) {
    const currentResult = await supabase.from("estimates").insert(nextPayload).select("*").single();
    if (!currentResult.error) return normalizeEstimateRecord(currentResult.data as EstimateRecordWithLegacy);

    if (isMissingColumnError(currentResult.error, "sheet_code")) break;
    if (isMissingColumnError(currentResult.error, "notes") && "notes" in nextPayload) {
      delete nextPayload.notes;
      continue;
    }
    if (isMissingColumnError(currentResult.error, "project_budget") && "project_budget" in nextPayload) {
      delete nextPayload.project_budget;
      continue;
    }
    throw currentResult.error;
  }

  const currentResult = await supabase.from("estimates").insert(nextPayload).select("*").single();
  if (!currentResult.error) return normalizeEstimateRecord(currentResult.data as EstimateRecordWithLegacy);
  if (!isMissingColumnError(currentResult.error, "sheet_code")) throw currentResult.error;

  const legacyPayload = { ...nextPayload };
  delete legacyPayload.sheet_code;
  delete legacyPayload.project_budget;
  delete legacyPayload.notes;
  const legacyEstimatePayload = { ...legacyPayload, revision_label: sheetCode };
  const legacyResult = await supabase
    .from("estimates")
    .insert(legacyEstimatePayload as never)
    .select("*")
    .single();

  if (legacyResult.error) throw legacyResult.error;
  return normalizeEstimateRecord(legacyResult.data as EstimateRecordWithLegacy);
}

type ProjectEstimateCodeRow = {
  id: string;
  sheetCode: string;
};

function readLegacyEstimateCodeRows(value: unknown): ProjectEstimateCodeRow[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((item) => {
    if (!item || typeof item !== "object") return [];
    const record = item as Record<string, unknown>;
    const id = typeof record.id === "string" ? record.id : "";
    if (!id) return [];
    return [{
      id,
      sheetCode: typeof record.revision_label === "string" ? record.revision_label : "",
    }];
  });
}

type UpdateEstimateDetailsInput = {
  projectId: string;
  estimateId: string;
  name?: string;
  notes?: string | null;
  projectBudget?: number | null;
  sheetCode?: string;
};

type DuplicateEstimateSheetInput = {
  projectId: string;
  estimateId: string;
};

type DuplicateEstimateTabRow = Pick<Tables<"estimate_tabs">, "id" | "is_default" | "metadata" | "name" | "sort_order">;
type DuplicateEstimateNodeRow = Pick<Tables<"estimate_nodes">, "id" | "estimate_tab_id" | "kind" | "metadata" | "name" | "parent_id" | "sort_order">;
type DuplicateEstimateRowItemRow = Tables<"estimate_row_items">;

const GENERATED_SHEET_CODE_PREFIX = "ES";

function normalizeEditableText(value: string | undefined, label: string) {
  const text = String(value ?? "").trim();
  if (!text) throw new Error(`${label} is required.`);
  return text;
}

function normalizeEditableNotes(value: string | null | undefined) {
  if (value === undefined) return undefined;
  if (value === null) return null;
  return value.trim() || null;
}

function normalizeEditableBudget(value: number | null | undefined, label: string) {
  if (value === undefined) return undefined;
  if (value === null) return null;

  const budget = Number(value);
  if (!Number.isFinite(budget) || budget < 0) throw new Error(`${label} must be a valid positive number.`);
  return budget;
}

function readLegacyProjectBudget(metadata: Json): number | null {
  if (!metadata || typeof metadata !== "object" || Array.isArray(metadata)) return null;
  const value = (metadata as Record<string, Json>).projectBudget;
  return typeof value === "number" && Number.isFinite(value) && value >= 0 ? value : null;
}

async function listProjectEstimateCodes(
  supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>,
  projectId: string,
): Promise<ProjectEstimateCodeRow[]> {
  const currentResult = await supabase
    .from("estimates")
    .select("id, sheet_code")
    .eq("project_id", projectId);

  if (!currentResult.error) {
    return (currentResult.data ?? []).map((estimate) => ({
      id: estimate.id,
      sheetCode: estimate.sheet_code ?? "",
    }));
  }

  if (!isMissingColumnError(currentResult.error, "sheet_code")) throw currentResult.error;

  const legacyResult = await supabase
    .from("estimates")
    .select("id, revision_label")
    .eq("project_id", projectId);

  if (legacyResult.error) throw legacyResult.error;
  return readLegacyEstimateCodeRows(legacyResult.data);
}

function getNextGeneratedSheetCode(existingCodes: string[]) {
  const generatedCodePattern = new RegExp(`^${GENERATED_SHEET_CODE_PREFIX}-(\\d+)$`, "i");
  const nextNumber = existingCodes.reduce((highest, code) => {
    const match = code.trim().match(generatedCodePattern);
    if (!match) return highest;
    const parsed = Number(match[1]);
    return Number.isFinite(parsed) ? Math.max(highest, parsed) : highest;
  }, 0) + 1;

  return `${GENERATED_SHEET_CODE_PREFIX}-${String(nextNumber).padStart(3, "0")}`;
}

async function generateNextEstimateSheetCode(
  supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>,
  projectId: string,
  excludedEstimateId?: string,
) {
  const estimateCodes = await listProjectEstimateCodes(supabase, projectId);
  const existingCodes = estimateCodes
    .flatMap((estimate) => {
      if (estimate.id === excludedEstimateId) return [];
      const sheetCode = estimate.sheetCode.trim();
      return sheetCode ? [sheetCode] : [];
    });
  const existingCodeSet = new Set(existingCodes.map((code) => code.toLocaleLowerCase()));
  let candidate = getNextGeneratedSheetCode(existingCodes);

  while (existingCodeSet.has(candidate.toLocaleLowerCase())) {
    candidate = getNextGeneratedSheetCode([...existingCodes, candidate]);
  }

  return candidate;
}

async function assertEstimateSheetCodeIsAvailable(
  supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>,
  projectId: string,
  sheetCode: string,
  currentEstimateId?: string,
) {
  const estimateCodes = await listProjectEstimateCodes(supabase, projectId);
  const normalizedSheetCode = sheetCode.trim().toLocaleLowerCase();
  const duplicate = estimateCodes.find(
    (estimate) => estimate.id !== currentEstimateId && estimate.sheetCode.trim().toLocaleLowerCase() === normalizedSheetCode,
  );

  if (duplicate) throw new Error(`Estimate code ${sheetCode} already exists in this project.`);
}

async function getEstimateRecordAfterMutation(
  supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>,
  estimateId: string,
  projectId: string,
) {
  const currentResult = await supabase
    .from("estimates")
    .select("*")
    .eq("id", estimateId)
    .eq("project_id", projectId)
    .maybeSingle();

  if (!currentResult.error) {
    if (!currentResult.data) throw new Error("Estimate not found in the current project.");
    return normalizeEstimateRecord(currentResult.data as EstimateRecordWithLegacy);
  }

  if (!isMissingColumnError(currentResult.error, "sheet_code")) throw currentResult.error;

  const legacyResult = await supabase
    .from("estimates")
    .select("*")
    .eq("id", estimateId)
    .eq("project_id", projectId)
    .maybeSingle();

  if (legacyResult.error) throw legacyResult.error;
  if (!legacyResult.data) throw new Error("Estimate not found in the current project.");
  return normalizeEstimateRecord(legacyResult.data as EstimateRecordWithLegacy);
}

async function createEstimateWithDefaultTab({
  supabase,
  project,
  name,
  sheetCode,
  createdBy,
}: {
  supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>;
  project: Tables<"projects">;
  name: string;
  sheetCode: string;
  createdBy: string | null;
}) {
  await assertEstimateSheetCodeIsAvailable(supabase, project.id, sheetCode);

  const estimate = await insertEstimateWithSheetCodeFallback(
    supabase,
    {
      project_id: project.id,
      created_by: createdBy,
      name,
      notes: null,
      project_budget: readLegacyProjectBudget(project.metadata),
      sheet_code: sheetCode,
      currency_code: project.currency_code,
      metadata: {},
    },
    sheetCode,
  );

  const { data: defaultTab, error: defaultTabError } = await supabase
    .from("estimate_tabs")
    .insert({
      estimate_id: estimate.id,
      name: "Main",
      sort_order: 0,
      is_default: true,
      created_by: createdBy,
    })
    .select("id")
    .single();

  if (defaultTabError) throw defaultTabError;
  if (!defaultTab?.id) throw new Error("Default estimate tab was not created.");

  return { estimate, firstNodeId: null, nodeCount: 0 };
}

function revalidateProjectEstimatePaths(projectId: string) {
  clearEstimateRouteContextProcessCache(projectId);
  revalidatePath(`/workshop/projects/${projectId}`);
  revalidatePath(`/workshop/projects/${projectId}/estimates`);
  revalidatePath(`/workshop/projects/${projectId}/data`);
}

export async function fetchEstimateTree({ projectId, estimateId }: FetchEstimateTreeInput) {
  await requireAuth();
  const { project, estimate, tree } = await getProjectEstimateTreeByEstimate(projectId, estimateId, ESTIMATE_SHEET_TREE_LOAD_LIMITS);
  if (!project || !estimate) throw new Error("Estimate not found in the current project.");
  return tree;
}

export async function fetchEstimateTabs({ projectId, estimateId }: FetchEstimateTreeInput) {
  await requireAuth();
  return getEstimateTabs(projectId, estimateId);
}

export async function fetchEstimateEditCapability({ projectId, estimateId }: FetchEstimateTreeInput) {
  await requireAuth();
  const { project } = await getCurrentWorkspaceProject(projectId);
  if (!project) return false;

  const supabase = await createSupabaseServerClient();
  const { data: estimate, error: estimateError } = await supabase
    .from("estimates")
    .select("id")
    .eq("id", estimateId)
    .eq("project_id", project.id)
    .maybeSingle();

  if (estimateError || !estimate) return false;

  const { data, error } = await supabase.rpc("can_edit_estimate", { target_estimate_id: estimate.id });
  if (error) return false;
  return data === true;
}

export async function fetchEstimateTabTree({ projectId, estimateId, tabId }: FetchEstimateTabTreeInput) {
  await requireAuth();
  const { project, estimate, tab, tree } = await getEstimateTabTree(projectId, estimateId, tabId, ESTIMATE_SHEET_TREE_LOAD_LIMITS);
  if (!project || !estimate || !tab) throw new Error("Estimate tab not found in the current project.");
  return tree;
}

// legacy "fetchEstimateSheetVersionControl" name kept for compatibility; see plan 2026-06-12 §01-17
export async function fetchEstimateSheetVersionControl({
  projectId,
  estimateId,
  rowId,
  nodeId,
  includeDescendants = false,
  eventTypes,
  dateFrom,
  dateTo,
  search,
  eventLimit = 50,
  sheetCursor,
  rowCursor,
  nodeCursor,
  scope = "both",
}: FetchEstimateSheetVersionControlInput): Promise<EstimateSheetVersionControlData> {
  await requireAuth();
  const { project } = await getCurrentWorkspaceProject(projectId);
  if (!project) throw new Error("Project not found in the current workspace.");

  const supabase = await createSupabaseServerClient();
  const { data: estimate, error: estimateError } = await supabase
    .from("estimates")
    .select("id, project_id")
    .eq("id", estimateId)
    .eq("project_id", project.id)
    .maybeSingle();

  if (estimateError) throw estimateError;
  if (!estimate) throw new Error("Estimate not found in the current project.");

  const boundedEventLimit = Math.min(Math.max(Math.trunc(eventLimit), 1), 100);
  const activityFilters = normalizeActivityReadFilters({ projectId, estimateId, eventTypes, dateFrom, dateTo, search });
  const shouldFetchSheetEvents = scope === "sheet" || scope === "both";
  const shouldFetchRowEvents = Boolean(rowId) && (scope === "row" || scope === "both");
  const shouldFetchNodeEvents = Boolean(nodeId) && (scope === "node" || scope === "both");
  const targetRowId = shouldFetchRowEvents ? rowId : null;
  const targetNodeId = shouldFetchNodeEvents ? nodeId : null;
  const normalizedSheetCursor = shouldFetchSheetEvents ? normalizeHistoryCursor(sheetCursor, "Estimate activity") : null;
  const normalizedRowCursor = targetRowId ? normalizeHistoryCursor(rowCursor, "Row history") : null;
  const normalizedNodeCursor = targetNodeId ? normalizeHistoryCursor(nodeCursor, "Node activity") : null;
  const eventSelect = "id, event_type, event_source, created_at, actor_user_id, estimate_tab_id, target_row_id, estimate_node_id, row_context, old_snapshot, new_snapshot, changed_fields, total_delta, payload, correlation_id";
  const emptyEventsResult = Promise.resolve({ data: [], error: null });
  const sheetEventsPromise = shouldFetchSheetEvents
    ? (() => {
      let sheetEventsQuery = applyActivityReadFilters(supabase
        .from("estimate_sheet_events")
        .select(eventSelect)
        .eq("estimate_id", estimate.id), activityFilters)
        .order("created_at", { ascending: false })
        .order("id", { ascending: false })
        .limit(boundedEventLimit + 1);

      if (normalizedSheetCursor) {
        sheetEventsQuery = sheetEventsQuery.or(buildHistoryCursorFilter(normalizedSheetCursor));
      }

      return sheetEventsQuery;
    })()
    : emptyEventsResult;
  const rowEventsPromise = targetRowId
    ? (() => {
      let rowEventsQuery = applyActivityReadFilters(supabase
        .from("estimate_sheet_events")
        .select(eventSelect)
        .eq("estimate_id", estimate.id)
        .eq("target_row_id", targetRowId), activityFilters)
        .order("created_at", { ascending: false })
        .order("id", { ascending: false })
        .limit(boundedEventLimit + 1);

      if (normalizedRowCursor) {
        rowEventsQuery = rowEventsQuery.or(buildHistoryCursorFilter(normalizedRowCursor));
      }

      return rowEventsQuery;
    })()
    : emptyEventsResult;
  const nodeScopePromise = targetNodeId
    ? resolveEstimateActivityNodeScope({
      supabase,
      estimateId: estimate.id,
      projectId: project.id,
      nodeId: targetNodeId,
      includeDescendants,
    })
    : Promise.resolve<EstimateActivityNodeScope | null>(null);
  const nodeEventsPromise = targetNodeId
    ? (async () => {
      const nodeScope = await nodeScopePromise;
      if (!nodeScope) return emptyEventsResult;
      let nodeEventsQuery = applyActivityReadFilters(supabase
        .from("estimate_sheet_events")
        .select(eventSelect)
        .eq("estimate_id", estimate.id), activityFilters)
        .order("created_at", { ascending: false })
        .order("id", { ascending: false })
        .limit(boundedEventLimit + 1);

      if (includeDescendants) {
        const nodeScopeFilter = buildNodeScopeEventFilter(nodeScope);
        if (nodeScopeFilter) {
          nodeEventsQuery = nodeEventsQuery.or(nodeScopeFilter);
        }
      } else {
        nodeEventsQuery = nodeEventsQuery.eq("estimate_node_id", targetNodeId);
      }

      if (normalizedNodeCursor) {
        nodeEventsQuery = nodeEventsQuery.or(buildHistoryCursorFilter(normalizedNodeCursor));
      }

      return nodeEventsQuery;
    })()
    : emptyEventsResult;

  const [sheetEventsResult, rowEventsResult, nodeEventsResult] = await Promise.all([
    sheetEventsPromise,
    rowEventsPromise,
    nodeEventsPromise,
  ]);

  if (sheetEventsResult.error) throw sheetEventsResult.error;
  if (rowEventsResult.error) throw rowEventsResult.error;
  if (nodeEventsResult.error) throw nodeEventsResult.error;

  const sheetEventsPageRows = buildHistoryEventPageRows((sheetEventsResult.data ?? []) as Tables<"estimate_sheet_events">[], boundedEventLimit);
  const rowEventsPageRows = buildHistoryEventPageRows((rowEventsResult.data ?? []) as Tables<"estimate_sheet_events">[], boundedEventLimit);
  const nodeEventsPageRows = buildHistoryEventPageRows((nodeEventsResult.data ?? []) as Tables<"estimate_sheet_events">[], boundedEventLimit);
  const actorLabels = await resolveActivityActorLabels(supabase, [
    ...sheetEventsPageRows.rows,
    ...rowEventsPageRows.rows,
    ...nodeEventsPageRows.rows,
  ]);

  return {
    events: sheetEventsPageRows.rows.map((row) => normalizeHistoryEvent(row, actorLabels)),
    rowEvents: rowEventsPageRows.rows.map((row) => normalizeHistoryEvent(row, actorLabels)),
    nodeEvents: nodeEventsPageRows.rows.map((row) => normalizeHistoryEvent(row, actorLabels)),
    nextCursor: sheetEventsPageRows.nextCursor,
    rowNextCursor: rowEventsPageRows.nextCursor,
    nodeNextCursor: nodeEventsPageRows.nextCursor,
  };
}

function readRetentionMetricNumber(value: unknown) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

export async function fetchEstimateActivityRetentionMetrics({
  projectId,
}: {
  projectId: string;
}): Promise<EstimateActivityRetentionMetrics> {
  await requireAuth();
  const { project } = await getCurrentWorkspaceProject(projectId);
  if (!project) throw new Error("Project not found in the current workspace.");

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.rpc("get_estimate_activity_retention_metrics", {
    target_project_id: project.id,
  });

  if (error) throw error;

  const row = Array.isArray(data) ? readJsonRecord(data[0]) : readJsonRecord(data);
  return {
    workspaceEventBytes: readRetentionMetricNumber(row.workspace_event_bytes),
    workspaceVersionBytes: readRetentionMetricNumber(row.workspace_version_bytes),
    largestEventPayloadBytes: readRetentionMetricNumber(row.largest_event_payload_bytes),
    maxEstimateEventCount: readRetentionMetricNumber(row.max_estimate_event_count),
    estimatesOverEventThreshold: readRetentionMetricNumber(row.estimates_over_event_threshold),
    workspaceStorageOverThreshold: row.workspace_storage_over_threshold === true,
  };
}

export async function reorderEstimateTreeNodes(
  projectId: string,
  estimateId: string,
  input: ReorderEstimateTreeNodesInput,
): Promise<ReorderEstimateTreeNodesResult> {
  await requireAuth();
  if (!input.updates.length) throw new Error("At least one estimate tree node update is required.");

  const updateIds = new Set<string>();
  for (const update of input.updates) {
    if (updateIds.has(update.id)) throw new Error(`Duplicate estimate tree node update: ${update.id}.`);
    updateIds.add(update.id);
    assertNotOptimisticEstimateNodeId(update.id, "Estimate tree update node");
    if (update.parentId) assertNotOptimisticEstimateNodeId(update.parentId, "Estimate tree update parent");
    if (!Number.isFinite(update.sortOrder) || update.sortOrder < 0) throw new Error("Estimate tree node sort order must be a non-negative number.");
  }

  const { project } = await getCurrentWorkspaceProject(projectId);
  if (!project) throw new Error("Project not found in the current workspace.");

  const supabase = await createSupabaseServerClient();
  const { data: estimate, error: estimateError } = await supabase
    .from("estimates")
    .select("id, project_id")
    .eq("id", estimateId)
    .eq("project_id", project.id)
    .maybeSingle();

  if (estimateError) throw estimateError;
  if (!estimate) throw new Error("Estimate not found in the current project.");
  await assertCanEditEstimate(supabase, estimate.id);

  const referencedNodeIds = Array.from(new Set([
    ...input.updates.map((update) => update.id),
    ...input.updates.flatMap((update) => (update.parentId ? [update.parentId] : [])),
  ]));
  const tabScopedNodeResult = await supabase
    .from("estimate_nodes")
    .select("id, estimate_id, estimate_tab_id, parent_id, kind")
    .in("id", referencedNodeIds);
  let referencedNodes: unknown = tabScopedNodeResult.data;
  let nodeError = tabScopedNodeResult.error;

  if (nodeError && isMissingColumnError(nodeError, "estimate_tab_id")) {
    const legacyResult = await supabase
      .from("estimate_nodes")
      .select("id, estimate_id, parent_id, kind")
      .in("id", referencedNodeIds);
    referencedNodes = legacyResult.data;
    nodeError = legacyResult.error;
  }

  if (nodeError) throw nodeError;

  const referencedNodeRows = (referencedNodes ?? []) as ReorderEstimateNodeRow[];
  const nodesById = new Map(referencedNodeRows.map((node) => [node.id, node]));
  for (const update of input.updates) {
    const node = nodesById.get(update.id);
    if (!node || node.estimate_id !== estimate.id) throw new Error("Estimate tree update node not found in the current estimate.");

    const parentNode = update.parentId ? nodesById.get(update.parentId) : null;
    if (update.parentId && (!parentNode || parentNode.estimate_id !== estimate.id)) {
      throw new Error("Estimate tree update parent not found in the current estimate.");
    }
    if (parentNode && node.estimate_tab_id && parentNode.estimate_tab_id && node.estimate_tab_id !== parentNode.estimate_tab_id) {
      throw new Error("Estimate tree nodes cannot be moved across tabs.");
    }

    // P6 single-node model: any node may parent any node. The kind label is no
    // longer a nesting discriminant, so the only structural rules left here are
    // same-estimate ownership (above) and cross-tab isolation (above); cycle
    // detection is enforced by the DB reorder RPC.
    if (!normalizeEstimateTreeNodeKind(node.kind)) throw new Error("Unsupported estimate node kind.");
    if (parentNode && !normalizeEstimateTreeNodeKind(parentNode.kind)) throw new Error("Unsupported estimate node kind.");
  }

  const moveUpdates = input.updates.map((update) => ({
    id: update.id,
    parent_id: update.parentId,
    sort_order: update.sortOrder,
  }));
  const currentUser = await requireCurrentUserContext();
  const rpcPayload = {
    target_estimate_id: estimate.id,
    move_updates: moveUpdates,
    acting_user_id: currentUser.userId,
    correlation_id: randomUUID(),
  };
  const { error: rpcError } = await supabase.rpc("reorder_estimate_nodes_with_history", rpcPayload);
  if (rpcError) throw new Error(`Could not reorder estimate tree: ${rpcError.message}`);

  const { project: refreshedProject, estimate: refreshedEstimate, tree } = await refreshInsertedEstimateTree(project.id, estimate.id, input.targetTabId);
  if (!refreshedProject || !refreshedEstimate) throw new Error("Estimate not found after reordering the tree.");
  return { tree };
}

export async function createEstimate(projectId: string, formData: FormData) {
  const { project } = await getCurrentWorkspaceProject(projectId);
  if (!project) throw new Error("Project not found in the current workspace.");

  const supabase = await createSupabaseServerClient();
  await assertCanEditProject(supabase, project.id);
  const currentUser = await requireCurrentUserContext();
  const name = readRequiredText(formData, "name");
  const requestedSheetCode = readOptionalText(formData, "sheetCode") ?? readOptionalText(formData, "revisionLabel");
  const sheetCode = requestedSheetCode ?? (await generateNextEstimateSheetCode(supabase, project.id));

  const { estimate, firstNodeId } = await createEstimateWithDefaultTab({
    supabase,
    project,
    name,
    sheetCode,
    createdBy: currentUser.userId,
  });

  revalidateProjectEstimatePaths(project.id);
  redirect(`/workshop/projects/${project.id}/estimates/${firstNodeId ?? estimate.id}`);
}

export async function createEstimateSheetDraft(projectId: string, input?: { name?: string }) {
  const { project } = await getCurrentWorkspaceProject(projectId);
  if (!project) throw new Error("Project not found in the current workspace.");

  const supabase = await createSupabaseServerClient();
  await assertCanEditProject(supabase, project.id);
  const currentUser = await requireCurrentUserContext();
  const sheetCode = await generateNextEstimateSheetCode(supabase, project.id);
  const requestedName = typeof input?.name === "string" ? input.name.trim() : "";

  const { estimate, firstNodeId, nodeCount } = await createEstimateWithDefaultTab({
    supabase,
    project,
    name: requestedName || `${sheetCode} Estimate`,
    sheetCode,
    createdBy: currentUser.userId,
  });

  revalidateProjectEstimatePaths(project.id);
  // Return the canonical list row so the client store can reconcile its
  // optimistic placeholder without a full re-render (P-1.2 / P0-3).
  const row = buildProjectEstimateListRow(estimate, {
    firstNodeId,
    nodeCount,
    rowItemCount: 0,
    totalProjectCost: 0,
    isFavorite: false,
    favoriteCreatedAt: null,
  });
  return { row, estimateId: estimate.id, firstNodeId, sheetCode };
}

export async function duplicateEstimateSheet(input: DuplicateEstimateSheetInput) {
  const { project } = await getCurrentWorkspaceProject(input.projectId);
  if (!project) throw new Error("Project not found in the current workspace.");

  const supabase = await createSupabaseServerClient();
  await assertCanEditEstimate(supabase, input.estimateId);
  const currentUser = await requireCurrentUserContext();

  const { data: sourceEstimate, error: sourceEstimateError } = await supabase
    .from("estimates")
    .select("*")
    .eq("id", input.estimateId)
    .eq("project_id", project.id)
    .maybeSingle();

  if (sourceEstimateError) throw sourceEstimateError;
  if (!sourceEstimate) throw new Error("Estimate not found in the current project.");
  const normalizedSourceEstimate = normalizeEstimateRecord(sourceEstimate as EstimateRecordWithLegacy);

  const sheetCode = await generateNextEstimateSheetCode(supabase, project.id);
  const duplicatedEstimate = await insertEstimateWithSheetCodeFallback(
    supabase,
    {
      project_id: project.id,
      created_by: currentUser.userId,
      name: `${normalizedSourceEstimate.name} Copy`,
      notes: normalizedSourceEstimate.notes,
      project_budget: normalizedSourceEstimate.project_budget,
      sheet_code: sheetCode,
      currency_code: normalizedSourceEstimate.currency_code,
      metadata: normalizedSourceEstimate.metadata,
    },
    sheetCode,
  );

  const { data: sourceTabs, error: sourceTabsError } = await supabase
    .from("estimate_tabs")
    .select("id, is_default, metadata, name, sort_order")
    .eq("estimate_id", normalizedSourceEstimate.id)
    .is("archived_at", null)
    .order("sort_order", { ascending: true });

  if (sourceTabsError) throw sourceTabsError;

  const sourceTabRows = (sourceTabs ?? []) as DuplicateEstimateTabRow[];
  const sourceTabsToDuplicate: DuplicateEstimateTabRow[] = sourceTabRows.length > 0
    ? sourceTabRows
    : [{
        id: "__legacy_default_tab__",
        is_default: true,
        metadata: {},
        name: "Main",
        sort_order: 0,
      }];
  const defaultSourceTabId = sourceTabsToDuplicate.find((tab) => tab.is_default)?.id ?? sourceTabsToDuplicate[0]?.id;
  const tabIdBySourceId = new Map<string, string>();
  const duplicatedTabs = sourceTabsToDuplicate.map((tab) => {
    const nextTabId = randomUUID();
    tabIdBySourceId.set(tab.id, nextTabId);
    return {
      archived_at: null,
      created_by: currentUser.userId,
      estimate_id: duplicatedEstimate.id,
      id: nextTabId,
      is_default: tab.is_default,
      metadata: tab.metadata,
      name: tab.name,
      sort_order: tab.sort_order,
    } satisfies TablesInsert<"estimate_tabs">;
  });

  const { error: insertTabsError } = await supabase.from("estimate_tabs").insert(duplicatedTabs);
  if (insertTabsError) throw insertTabsError;

  const sourceNodeTabIds = sourceTabRows.map((tab) => tab.id);
  let sourceNodesQuery = supabase
    .from("estimate_nodes")
    .select("id, estimate_tab_id, kind, metadata, name, parent_id, sort_order")
    .eq("estimate_id", normalizedSourceEstimate.id);

  if (sourceNodeTabIds.length > 0) {
    sourceNodesQuery = sourceNodesQuery.in("estimate_tab_id", sourceNodeTabIds);
  }

  const { data: sourceNodes, error: sourceNodesError } = await sourceNodesQuery.order("sort_order", { ascending: true });

  if (sourceNodesError) throw sourceNodesError;

  const nodeIdBySourceId = new Map<string, string>();
  const pendingNodes = [...((sourceNodes ?? []) as DuplicateEstimateNodeRow[])];
  const fallbackDuplicatedTabId = defaultSourceTabId ? tabIdBySourceId.get(defaultSourceTabId) : duplicatedTabs[0]?.id;
  if (!fallbackDuplicatedTabId) throw new Error("Could not duplicate estimate tabs because no tab mapping was created.");

  while (pendingNodes.length > 0) {
    let nextIndex = -1;
    for (let index = 0; index < pendingNodes.length; index += 1) {
      const node = pendingNodes[index];
      if (node.parent_id === null || nodeIdBySourceId.has(node.parent_id)) {
        nextIndex = index;
        break;
      }
    }
    if (nextIndex === -1) throw new Error("Could not duplicate estimate tree because the source hierarchy is invalid.");

    const [node] = pendingNodes.splice(nextIndex, 1);
    const nextNodeId = randomUUID();
    const nextEstimateTabId = tabIdBySourceId.get(node.estimate_tab_id) ?? fallbackDuplicatedTabId;
    nodeIdBySourceId.set(node.id, nextNodeId);

    const { error: insertNodeError } = await supabase.from("estimate_nodes").insert({
      id: nextNodeId,
      estimate_id: duplicatedEstimate.id,
      estimate_tab_id: nextEstimateTabId,
      parent_id: node.parent_id ? nodeIdBySourceId.get(node.parent_id) ?? null : null,
      kind: node.kind,
      metadata: node.metadata,
      name: node.name,
      sort_order: node.sort_order,
    });

    if (insertNodeError) throw insertNodeError;
  }

  const { data: sourceRows, error: sourceRowsError } = await supabase
    .from("estimate_row_items")
    .select("*")
    .eq("estimate_id", normalizedSourceEstimate.id)
    .order("sort_order", { ascending: true });

  if (sourceRowsError) throw sourceRowsError;

  const duplicatedRows = ((sourceRows ?? []) as DuplicateEstimateRowItemRow[]).flatMap((row) => {
    const nodeId = nodeIdBySourceId.get(row.node_id);
    if (!nodeId) return [];

    return [{
      category_node_id: row.category_node_id,
      description: row.description,
      designation: row.designation,
      discipline: row.discipline,
      estimate_id: duplicatedEstimate.id,
      id: randomUUID(),
      link_state: row.link_state,
      material: row.material,
      metadata: row.metadata,
      contingency_percentage: row.contingency_percentage,
      adjustment_percentage: row.adjustment_percentage ?? 0,
      misc_cost: row.misc_cost,
      node_id: nodeId,
      quantity: row.quantity,
      quantity_base: row.quantity_base,
      quantity_contingency_amount: row.quantity_contingency_amount,
      sort_order: row.sort_order,
      source_library_item_id: row.source_library_item_id,
      source_snapshot: sanitizeEstimateRowSourceSnapshot(row.source_snapshot) as Json | null,
      supplier: row.supplier,
      supplier_id: row.supplier_id,
      unit: row.unit,
      unit_cost: row.unit_cost,
    } satisfies TablesInsert<"estimate_row_items">];
  });

  if (duplicatedRows.length > 0) {
    const { error: insertRowsError } = await supabase.from("estimate_row_items").insert(duplicatedRows);
    if (insertRowsError) throw insertRowsError;
  }

  revalidateProjectEstimatePaths(project.id);

  // Map the source nodes (in sort_order) onto their duplicated ids so the
  // landing node is chosen by the same depth-first, area-first oracle the list
  // route uses — not a flat "first inserted row" heuristic (ADV-011 parity).
  const duplicatedNodeRowsInOrder = (sourceNodes ?? []).flatMap((node) => {
    const id = nodeIdBySourceId.get(node.id);
    if (!id) return [];
    return [{
      id,
      estimate_id: duplicatedEstimate.id,
      kind: node.kind,
      parent_id: node.parent_id ? nodeIdBySourceId.get(node.parent_id) ?? null : null,
    }];
  });
  const firstNodeId = selectFirstEstimateNodeIds(duplicatedNodeRowsInOrder).get(duplicatedEstimate.id) ?? null;

  // Canonical list row for optimistic reconciliation (P-1.2 / P0-5). The total
  // mirrors the source estimate because the rows are copied verbatim.
  const row = buildProjectEstimateListRow(duplicatedEstimate, {
    firstNodeId,
    nodeCount: nodeIdBySourceId.size,
    rowItemCount: duplicatedRows.length,
    totalProjectCost: sumEstimateRowLineTotals(duplicatedRows),
    isFavorite: false,
    favoriteCreatedAt: null,
  });

  return { row, estimateId: duplicatedEstimate.id, firstNodeId, sheetCode };
}

export async function previewBulkDeleteEstimateSheets(input: BulkDeleteEstimateSheetsInput): Promise<BulkActionPreviewResult> {
  if (!isUuid(input.projectId)) {
    return buildRejectedPreviewResult("estimate_sheet", [], [{
      code: "invalid_id",
      id: input.projectId,
      message: "Project id is invalid.",
    }]);
  }

  const { ids, issues } = normalizeBulkActionIds(input.estimateIds, { label: "estimates", max: 100 });
  if (issues.length > 0) return buildRejectedPreviewResult("estimate_sheet", ids, issues);

  const { project } = await getCurrentWorkspaceProject(input.projectId);
  if (!project) {
    return buildRejectedPreviewResult("estimate_sheet", ids, [{
      code: "not_found",
      id: input.projectId,
      message: "Project not found in the current workspace.",
    }]);
  }

  const [supabase, currentUser] = await Promise.all([
    createSupabaseServerClient(),
    requireCurrentUserContext(),
  ]);
  const { data, error } = await supabase.rpc("preview_bulk_delete_estimate_sheets", {
    target_project_id: project.id,
    target_estimate_ids: ids,
    acting_user_id: currentUser.userId,
  });

  if (error) {
    return buildRejectedPreviewResult("estimate_sheet", ids, [{
      code: "rpc_error",
      message: `Could not preview estimate deletion: ${error.message}`,
    }]);
  }

  return coerceBulkPreviewResult(data, { targetType: "estimate_sheet", ids });
}

export async function executeBulkDeleteEstimateSheets(input: ExecuteBulkDeleteEstimateSheetsInput): Promise<BulkActionExecutionResult> {
  if (!isUuid(input.projectId)) {
    return {
      ok: false,
      targetType: "estimate_sheet",
      ids: [],
      deletedIds: [],
      summary: { requestedCount: 0, eligibleCount: 0, blockedCount: 1 },
      issues: [{ code: "invalid_id", id: input.projectId, message: "Project id is invalid." }],
    };
  }

  const { ids, issues } = normalizeBulkActionIds(input.estimateIds, { label: "estimates", max: 100 });
  if (issues.length > 0) {
    return {
      ...buildRejectedPreviewResult("estimate_sheet", ids, issues),
      deletedIds: [],
    };
  }

  const { project } = await getCurrentWorkspaceProject(input.projectId);
  if (!project) {
    return {
      ok: false,
      targetType: "estimate_sheet",
      ids,
      deletedIds: [],
      summary: { requestedCount: ids.length, eligibleCount: 0, blockedCount: 1 },
      issues: [{ code: "not_found", id: input.projectId, message: "Project not found in the current workspace." }],
    };
  }

  const [supabase] = await Promise.all([
    createSupabaseServerClient(),
    requireCurrentUserContext(),
  ]);
  const { data, error } = await supabase.rpc("execute_bulk_delete_estimate_sheets", {
    target_project_id: project.id,
    target_estimate_ids: ids,
    expected_preview_hash: input.expectedPreviewHash,
    correlation_id: getMutationCorrelationId(input.correlationId),
  });

  if (error) {
    return {
      ok: false,
      targetType: "estimate_sheet",
      ids,
      deletedIds: [],
      summary: { requestedCount: ids.length, eligibleCount: 0, blockedCount: 1 },
      issues: [{
        code: "rpc_error",
        message: `Could not delete estimates: ${error.message}`,
      }],
    };
  }

  const result = coerceBulkExecutionResult(data, { targetType: "estimate_sheet", ids });
  if (result.ok) {
    revalidateProjectEstimatePaths(project.id);
    for (const estimateId of result.deletedIds?.length ? result.deletedIds : ids) {
      revalidatePath(`/workshop/projects/${project.id}/estimates/${estimateId}`);
    }
  }
  return result;
}

export async function deleteEstimateSheet(input: DeleteEstimateSheetInput): Promise<BulkActionExecutionResult> {
  await requireAuth();
  return executeBulkDeleteEstimateSheets({
    projectId: input.projectId,
    estimateIds: [input.estimateId],
    expectedPreviewHash: input.expectedPreviewHash,
    correlationId: input.correlationId,
  });
}

export async function updateEstimateDetails(input: UpdateEstimateDetailsInput) {
  const { project } = await getCurrentWorkspaceProject(input.projectId);
  if (!project) throw new Error("Project not found in the current workspace.");

  const supabase = await createSupabaseServerClient();
  await assertCanEditEstimate(supabase, input.estimateId);
  const currentUser = await requireCurrentUserContext();
  const payload: TablesUpdate<"estimates"> = {};
  const estimatePatch: Record<string, Json | undefined> = {};

  if (input.name !== undefined) {
    const name = normalizeEditableText(input.name, "Estimate name");
    payload.name = name;
    estimatePatch.name = name;
  }
  if (input.sheetCode !== undefined) {
    const sheetCode = normalizeEditableText(input.sheetCode, "Estimate code");
    await assertEstimateSheetCodeIsAvailable(supabase, project.id, sheetCode, input.estimateId);
    payload.sheet_code = sheetCode;
    estimatePatch.sheetCode = sheetCode;
  }
  if (input.notes !== undefined) {
    const notes = normalizeEditableNotes(input.notes);
    payload.notes = notes;
    estimatePatch.notes = notes;
  }
  if (input.projectBudget !== undefined) {
    const projectBudget = normalizeEditableBudget(input.projectBudget, "Project budget");
    payload.project_budget = projectBudget;
    estimatePatch.projectBudget = projectBudget;
  }

  if (Object.keys(payload).length === 0) throw new Error("No estimate changes provided.");

  const { error } = await supabase.rpc("update_estimate_details_with_history", {
    target_project_id: project.id,
    target_estimate_id: input.estimateId,
    estimate_patch: estimatePatch,
    acting_user_id: currentUser.userId,
    correlation_id: randomUUID(),
  });
  if (error) throw new Error(`Could not update estimate details: ${error.message}`);

  const estimate = await getEstimateRecordAfterMutation(supabase, input.estimateId, project.id);
  revalidateProjectEstimatePaths(project.id);
  // Scalar-only canonical reconciliation payload: the client patches these
  // fields and keeps its existing summary (no sensitive columns shipped) — P-1.2.
  return { estimate: projectEstimateListRowSource(estimate) };
}

export async function regenerateEstimateSheetCode(input: { projectId: string; estimateId: string }) {
  const { project } = await getCurrentWorkspaceProject(input.projectId);
  if (!project) throw new Error("Project not found in the current workspace.");

  const supabase = await createSupabaseServerClient();
  await assertCanEditEstimate(supabase, input.estimateId);
  const currentUser = await requireCurrentUserContext();
  const sheetCode = await generateNextEstimateSheetCode(supabase, project.id, input.estimateId);
  const { error } = await supabase.rpc("update_estimate_details_with_history", {
    target_project_id: project.id,
    target_estimate_id: input.estimateId,
    estimate_patch: { sheetCode },
    acting_user_id: currentUser.userId,
    correlation_id: randomUUID(),
  });
  if (error) throw new Error(`Could not regenerate estimate code: ${error.message}`);

  const estimate = await getEstimateRecordAfterMutation(supabase, input.estimateId, project.id);
  revalidateProjectEstimatePaths(project.id);
  return { estimate: projectEstimateListRowSource(estimate) };
}

function readEstimateTabMutationResult(value: unknown, fallbackTabId?: string): EstimateTabMutationResult {
  const record = readJsonRecord(value);
  const estimateTabId = typeof record.estimateTabId === "string"
    ? record.estimateTabId
    : typeof record.tabId === "string"
      ? record.tabId
      : fallbackTabId ?? "";
  if (!estimateTabId) throw new Error("Estimate tab RPC did not return a tab id.");
  return {
    estimateTabId,
    replacementTabId: typeof record.replacementTabId === "string" ? record.replacementTabId : null,
  };
}

async function getProjectScopedEstimateActionContext(projectId: string, estimateId: string) {
  const { project } = await getCurrentWorkspaceProject(projectId);
  if (!project) throw new Error("Project not found in the current workspace.");

  const supabase = await createSupabaseServerClient();
  const { data: estimate, error: estimateError } = await supabase
    .from("estimates")
    .select("id, project_id")
    .eq("id", estimateId)
    .eq("project_id", project.id)
    .maybeSingle();

  if (estimateError) throw estimateError;
  if (!estimate) throw new Error("Estimate not found in the current project.");
  await assertCanEditEstimate(supabase, estimate.id);

  const currentUser = await requireCurrentUserContext();
  return { project, estimate, supabase, currentUser };
}

export async function createEstimateTab(input: CreateEstimateTabInput): Promise<EstimateTabMutationResult> {
  await requireAuth();
  const { project, estimate, supabase, currentUser } = await getProjectScopedEstimateActionContext(input.projectId, input.estimateId);
  const name = normalizeEditableText(input.name, "Estimate tab name");
  const { data, error } = await supabase.rpc("create_estimate_tab_with_history", {
    target_project_id: project.id,
    target_estimate_id: estimate.id,
    tab_name: name,
    acting_user_id: currentUser.userId,
    correlation_id: getMutationCorrelationId(input.correlationId),
  });
  if (error) throw new Error(`Could not create estimate tab: ${error.message}`);
  return { ...readEstimateTabMutationResult(data), tabs: await getEstimateTabs(project.id, estimate.id) };
}

export async function renameEstimateTab(input: RenameEstimateTabInput): Promise<EstimateTabMutationResult> {
  await requireAuth();
  const { project, estimate, supabase, currentUser } = await getProjectScopedEstimateActionContext(input.projectId, input.estimateId);
  const name = normalizeEditableText(input.name, "Estimate tab name");
  const { data, error } = await supabase.rpc("rename_estimate_tab_with_history", {
    target_project_id: project.id,
    target_estimate_id: estimate.id,
    target_tab_id: input.tabId,
    next_name: name,
    acting_user_id: currentUser.userId,
    correlation_id: getMutationCorrelationId(input.correlationId),
  });
  if (error) throw new Error(`Could not rename estimate tab: ${error.message}`);
  return { ...readEstimateTabMutationResult(data, input.tabId), tabs: await getEstimateTabs(project.id, estimate.id) };
}

export async function reorderEstimateTabs(input: ReorderEstimateTabsInput): Promise<EstimateTabMutationResult> {
  await requireAuth();
  if (input.updates.length === 0) throw new Error("At least one estimate tab update is required.");
  const seen = new Set<string>();
  for (const update of input.updates) {
    if (seen.has(update.id)) throw new Error(`Duplicate estimate tab update: ${update.id}.`);
    seen.add(update.id);
  }
  const { project, estimate, supabase, currentUser } = await getProjectScopedEstimateActionContext(input.projectId, input.estimateId);
  const { error } = await supabase.rpc("reorder_estimate_tabs_with_history", {
    target_project_id: project.id,
    target_estimate_id: estimate.id,
    sort_updates: input.updates.map((update) => ({ id: update.id, sort_order: update.sortOrder })),
    acting_user_id: currentUser.userId,
    correlation_id: getMutationCorrelationId(input.correlationId),
  });
  if (error) throw new Error(`Could not reorder estimate tabs: ${error.message}`);
  const tabs = await getEstimateTabs(project.id, estimate.id);
  return { estimateTabId: input.updates[0]?.id ?? estimate.id, tabs };
}

export async function duplicateEstimateTab(input: DuplicateEstimateTabInput): Promise<EstimateTabMutationResult> {
  await requireAuth();
  const { project, estimate, supabase, currentUser } = await getProjectScopedEstimateActionContext(input.projectId, input.estimateId);
  const nextName = input.name ? normalizeEditableText(input.name, "Estimate tab name") : undefined;
  const { data, error } = await supabase.rpc("duplicate_estimate_tab_with_history", {
    target_project_id: project.id,
    target_estimate_id: estimate.id,
    source_tab_id: input.tabId,
    next_name: nextName,
    acting_user_id: currentUser.userId,
    correlation_id: getMutationCorrelationId(input.correlationId),
  });
  if (error) throw new Error(`Could not duplicate estimate tab: ${error.message}`);
  return { ...readEstimateTabMutationResult(data), tabs: await getEstimateTabs(project.id, estimate.id) };
}

export async function archiveEstimateTab(input: EstimateTabActionInput): Promise<EstimateTabMutationResult> {
  await requireAuth();
  const { project, estimate, supabase, currentUser } = await getProjectScopedEstimateActionContext(input.projectId, input.estimateId);
  const { data, error } = await supabase.rpc("archive_estimate_tab_with_history", {
    target_project_id: project.id,
    target_estimate_id: estimate.id,
    target_tab_id: input.tabId,
    acting_user_id: currentUser.userId,
    correlation_id: getMutationCorrelationId(input.correlationId),
  });
  if (error) throw new Error(`Could not archive estimate tab: ${error.message}`);
  return { ...readEstimateTabMutationResult(data, input.tabId), tabs: await getEstimateTabs(project.id, estimate.id) };
}

export async function deleteEstimateTab(input: EstimateTabActionInput): Promise<EstimateTabMutationResult> {
  await requireAuth();
  const { project, estimate, supabase, currentUser } = await getProjectScopedEstimateActionContext(input.projectId, input.estimateId);
  const { data, error } = await supabase.rpc("delete_estimate_tab_with_history", {
    target_project_id: project.id,
    target_estimate_id: estimate.id,
    target_tab_id: input.tabId,
    acting_user_id: currentUser.userId,
    correlation_id: getMutationCorrelationId(input.correlationId),
  });
  if (error) throw new Error(`Could not delete estimate tab: ${error.message}`);
  return { ...readEstimateTabMutationResult(data, input.tabId), tabs: await getEstimateTabs(project.id, estimate.id) };
}

export async function createEstimateNode(projectId: string, estimateId: string, formData: FormData) {
  const { project } = await getCurrentWorkspaceProject(projectId);
  if (!project) throw new Error("Project not found in the current workspace.");

  const supabase = await createSupabaseServerClient();
  const currentUser = await requireCurrentUserContext();
  const name = readRequiredText(formData, "name");
  const kind = readEstimateNodeKind(formData);
  const parentId = readOptionalText(formData, "parentId");
  const estimateTabId = readOptionalText(formData, "estimateTabId");
  if (parentId) assertNotOptimisticEstimateNodeId(parentId, "Parent estimate node");

  const { data: estimate, error: estimateError } = await supabase
    .from("estimates")
    .select("id, project_id")
    .eq("id", estimateId)
    .eq("project_id", project.id)
    .maybeSingle();

  if (estimateError) throw estimateError;
  if (!estimate) throw new Error("Estimate not found in the current project.");
  await assertCanEditEstimate(supabase, estimate.id);

  if (parentId) {
    const { data: parentNode, error: parentError } = await supabase
      .from("estimate_nodes")
      .select("id, kind, estimate_id, estimates!inner(project_id)")
      .eq("id", parentId)
      .eq("estimate_id", estimate.id)
      .eq("estimates.project_id", project.id)
      .maybeSingle();

    if (parentError) throw parentError;
    if (!parentNode) throw new Error("Parent estimate node not found in the current project.");
    // P6 single-node model: any node may parent any node, so there is no
    // parent-kind nesting rule to enforce. We still normalize to reject a DB
    // row carrying an unknown/legacy-unmappable kind.
    if (!normalizeEstimateTreeNodeKind(parentNode.kind)) throw new Error("Unsupported estimate node kind.");
  }

  const siblingQuery = supabase
    .from("estimate_nodes")
    .select("id, kind, sort_order")
    .eq("estimate_id", estimate.id)
    .order("sort_order", { ascending: true });
  const scopedSiblingQuery = parentId
    ? siblingQuery.eq("parent_id", parentId)
    : siblingQuery.is("parent_id", null);
  const tabScopedSiblingQuery = !parentId && estimateTabId
    ? scopedSiblingQuery.eq("estimate_tab_id", estimateTabId)
    : scopedSiblingQuery;
  const { data: siblings, error: siblingsError } = await tabScopedSiblingQuery;

  if (siblingsError) throw siblingsError;

  const siblingRows = (siblings ?? []) as CreateEstimateNodeSiblingRow[];
  const maxSiblingSortOrder = siblingRows.reduce((max, sibling) => Math.max(max, sibling.sort_order), 0);
  const createNodePayload: CreateEstimateNodeWithHistoryArgs = {
    target_project_id: project.id,
    target_estimate_id: estimate.id,
    parent_node_id: parentId,
    node_kind: kind,
    node_name: name,
    initial_sort_order: maxSiblingSortOrder + ESTIMATE_TREE_SORT_ORDER_STEP,
    acting_user_id: currentUser.userId,
    correlation_id: randomUUID(),
    ...(estimateTabId ? { target_tab_id: estimateTabId } : {}),
  };
  const { data: nodeResult, error: rpcError } = await supabase.rpc(
    "create_estimate_node_with_history",
    createNodePayload as Database["public"]["Functions"]["create_estimate_node_with_history"]["Args"],
  );
  if (rpcError) {
    throw new Error(`Could not create estimate tree node: ${rpcError.message}`);
  }
  const nodeResultRecord = readJsonRecord(nodeResult);
  const nodeResultPayload = readJsonRecord(nodeResultRecord.payload);
  const nodeId = typeof nodeResultRecord.nodeId === "string"
    ? nodeResultRecord.nodeId
    : typeof nodeResultPayload.nodeId === "string"
      ? nodeResultPayload.nodeId
      : "";
  if (!nodeId) throw new Error("Estimate node history RPC did not return the created node id.");

  // No revalidatePath/redirect here: the client reconciles its optimistic node
  // with this id in place, so a server-driven navigation would remount the
  // whole workspace mid-edit.
  return {
    nodeId,
    name,
    kind,
    parentId: parentId ?? null,
    ...(estimateTabId ? { estimateTabId } : {}),
  } satisfies CreateEstimateNodeResult;
}

export async function renameEstimateNode(
  projectId: string,
  estimateId: string,
  nodeId: string,
  formDataOrName: FormData | string,
): Promise<RenameEstimateNodeResult> {
  assertNotOptimisticEstimateNodeId(nodeId, "Estimate node");
  const name = readEstimateNodeName(formDataOrName);
  const { estimate, supabase, node } = await getValidatedEstimateNode(projectId, estimateId, nodeId, { requireEdit: true });
  const currentUser = await requireCurrentUserContext();

  const { error } = await supabase.rpc("rename_estimate_node_with_history", {
    target_project_id: projectId,
    target_estimate_id: estimate.id,
    target_node_id: node.id,
    next_name: name,
    acting_user_id: currentUser.userId,
    correlation_id: randomUUID(),
  });

  if (error) throw error;

  return { nodeId: node.id, name };
}

export async function deleteEstimateNode(
  projectId: string,
  estimateId: string,
  nodeId: string,
  targetTabId?: string,
): Promise<DeleteEstimateNodeResult> {
  const { project, estimate, supabase, node } = await getValidatedEstimateNode(projectId, estimateId, nodeId, { requireEdit: true });
  const currentUser = await requireCurrentUserContext();
  const { project: currentProject, estimate: currentEstimate, tree: currentTree } = await refreshInsertedEstimateTree(project.id, estimate.id, targetTabId);
  if (!currentProject || !currentEstimate) throw new Error("Estimate not found before deleting the tree node.");

  const deletePlan = planEstimateTreeDelete(currentTree, node.id, node.id);
  const { data: deleteResult, error } = await supabase.rpc("delete_estimate_node_with_history", {
    target_project_id: project.id,
    target_estimate_id: estimate.id,
    target_node_id: node.id,
    acting_user_id: currentUser.userId,
    correlation_id: randomUUID(),
  });

  if (error) throw new Error(`Could not delete estimate tree node: ${error.message}`);

  const { project: refreshedProject, estimate: refreshedEstimate, tree } = await refreshInsertedEstimateTree(project.id, estimate.id, targetTabId);
  if (!refreshedProject || !refreshedEstimate) throw new Error("Estimate not found after deleting the tree node.");
  const authoritativeDelete = readDeleteEstimateNodeRpcResult(
    deleteResult,
    Array.from(deletePlan.deletedNodeIds),
    deletePlan.fallbackNodeId,
  );

  return {
    eventId: authoritativeDelete.eventId,
    tree,
    deletedNodeIds: authoritativeDelete.deletedNodeIds,
    fallbackNodeId: authoritativeDelete.fallbackNodeId,
  };
}

export async function deleteEstimateNodesBulk(
  projectId: string,
  estimateId: string,
  nodeIds: string[],
  targetTabId?: string,
): Promise<DeleteEstimateNodeResult> {
  await requireAuth();
  const requestedNodeIds = [...new Set(nodeIds.flatMap((nodeId) => {
    const trimmed = nodeId.trim();
    return trimmed ? [trimmed] : [];
  }))];
  if (requestedNodeIds.length === 0) throw new Error("At least one estimate tree node is required for bulk delete.");

  const { project } = await getCurrentWorkspaceProject(projectId);
  if (!project) throw new Error("Project not found in the current workspace.");

  const supabase = await createSupabaseServerClient();
  const { data: estimate, error: estimateError } = await supabase
    .from("estimates")
    .select("id, project_id")
    .eq("id", estimateId)
    .eq("project_id", project.id)
    .maybeSingle();

  if (estimateError) throw estimateError;
  if (!estimate) throw new Error("Estimate not found in the current project.");
  await assertCanEditEstimate(supabase, estimate.id);

  const { data: scopedNodes, error: nodeError } = await supabase
    .from("estimate_nodes")
    .select("id, estimate_id, parent_id, kind, estimates!inner(project_id)")
    .eq("estimate_id", estimate.id)
    .eq("estimates.project_id", project.id)
    .in("id", requestedNodeIds);

  if (nodeError) throw nodeError;
  const scopedNodeIds = new Set(((scopedNodes ?? []) as ValidatedEstimateNodeRow[]).map((node) => node.id));
  const missingNodeId = requestedNodeIds.find((requestedNodeId) => !scopedNodeIds.has(requestedNodeId));
  if (missingNodeId) throw new Error(`Estimate tree node not found in the current project: ${missingNodeId}.`);

  const currentUser = await requireCurrentUserContext();
  const { project: currentProject, estimate: currentEstimate, tree: currentTree } = await refreshInsertedEstimateTree(project.id, estimate.id, targetTabId);
  if (!currentProject || !currentEstimate) throw new Error("Estimate not found before deleting the selected tree nodes.");

  const rootNodeIds = dedupeSelectedRoots(currentTree as TreeSelectionNode[], new Set(requestedNodeIds));
  if (rootNodeIds.length === 0) throw new Error("No selectable estimate tree nodes were found for bulk delete.");

  let plannedTree = currentTree;
  let fallbackNodeId: string | null = rootNodeIds[0] ?? null;
  const deletedNodeIds = new Set<string>();
  for (const rootNodeId of rootNodeIds) {
    const deletePlan = planEstimateTreeDelete(plannedTree, rootNodeId, fallbackNodeId);
    deletePlan.deletedNodeIds.forEach((deletedNodeId) => deletedNodeIds.add(deletedNodeId));
    plannedTree = deletePlan.nextNodes;
    fallbackNodeId = deletePlan.fallbackNodeId;
  }

  const { data: deleteResult, error } = await supabase.rpc("delete_estimate_nodes_bulk_with_history", {
    target_project_id: project.id,
    target_estimate_id: estimate.id,
    target_node_ids: rootNodeIds,
    acting_user_id: currentUser.userId,
    correlation_id: randomUUID(),
  });

  if (error) throw new Error(`Could not delete selected estimate tree nodes: ${error.message}`);

  const { project: refreshedProject, estimate: refreshedEstimate, tree } = await refreshInsertedEstimateTree(project.id, estimate.id, targetTabId);
  if (!refreshedProject || !refreshedEstimate) throw new Error("Estimate not found after deleting the selected tree nodes.");
  const authoritativeDelete = readDeleteEstimateNodeRpcResult(deleteResult, Array.from(deletedNodeIds), fallbackNodeId);

  return {
    eventId: authoritativeDelete.eventId,
    tree,
    deletedNodeIds: authoritativeDelete.deletedNodeIds,
    fallbackNodeId: authoritativeDelete.fallbackNodeId,
  };
}

// RS-1: refresh the tree for the SPECIFIC tab an insert targeted. The estimate
// sheet's tree cache is keyed per tab, so returning the default tab's tree (the
// old behavior) replaced a non-default tab's view with the wrong content. When
// targetTabId is set we load that tab; legacy (no-tab) estimates pass undefined
// and fall back to the default/whole-estimate loader.
async function refreshInsertedEstimateTree(
  projectId: string,
  estimateId: string,
  targetTabId: string | undefined,
) {
  if (targetTabId) {
    const { project, estimate, tree } = await getEstimateTabTree(projectId, estimateId, targetTabId);
    return { project, estimate, tree };
  }
  const { project, estimate, tree } = await getProjectEstimateTreeByEstimate(projectId, estimateId);
  return { project, estimate, tree };
}

export async function insertEstimateTemplateIntoEstimate({
  projectId,
  estimateId,
  targetParentNodeId,
  templateId,
  targetTabId,
}: InsertEstimateTemplateIntoEstimateInput): Promise<InsertEstimateTemplateIntoEstimateResult> {
  const { project } = await getCurrentWorkspaceProject(projectId);
  if (!project) throw new Error("Project not found in the current workspace.");

  const supabase = await createSupabaseServerClient();
  const currentUser = await requireCurrentUserContext();
  // U4 (SEC-1): deny a workspace-member *viewer* on a restricted estimate before
  // any write. Defense-in-depth with the hardened RPC gate; the app gate ships
  // immediately even before the RPC migration applies.
  await assertCanEditEstimate(supabase, estimateId);
  const { data: copyResult, error: copyError } = await supabase.rpc("insert_estimate_template_into_estimate_with_history", {
    target_project_id: project.id,
    target_estimate_id: estimateId,
    target_parent_node_id: targetParentNodeId,
    source_template_id: templateId,
    acting_user_id: currentUser.userId,
    correlation_id: randomUUID(),
  });

  if (copyError) throw new Error(`Could not insert estimate template: ${copyError.message}`);

  const insertedRootNodeIds = readInsertedRootNodeIds(copyResult);
  const { project: refreshedProject, estimate: refreshedEstimate, tree } = await refreshInsertedEstimateTree(project.id, estimateId, targetTabId);
  if (!refreshedProject || !refreshedEstimate) throw new Error("Estimate not found after inserting the template.");

  return { tree, insertedRootNodeIds };
}

/**
 * INS-1: inserts several templates under one group in a SINGLE server action.
 * A category drop carries many template ids; dispatching one action per id ran
 * N concurrent inserts whose post-insert tree reads raced — a snapshot taken
 * before a sibling committed dropped that sibling from the view (last-writer
 * wins). Looping the RPC sequentially here (each awaits the previous, like the
 * area-wrap flow) and refreshing once means one coherent tree comes back.
 */
export async function insertEstimateTemplatesIntoEstimate({
  projectId,
  estimateId,
  targetParentNodeId,
  templateIds,
  targetTabId,
}: InsertEstimateTemplatesIntoEstimateInput): Promise<InsertEstimateTemplateIntoEstimateResult> {
  if (templateIds.length === 0) throw new Error("At least one estimate template is required.");

  const { project } = await getCurrentWorkspaceProject(projectId);
  if (!project) throw new Error("Project not found in the current workspace.");

  const supabase = await createSupabaseServerClient();
  const currentUser = await requireCurrentUserContext();
  await assertCanEditEstimate(supabase, estimateId);

  const insertedRootNodeIds: string[] = [];
  for (const templateId of templateIds) {
    const { data: copyResult, error: copyError } = await supabase.rpc("insert_estimate_template_into_estimate_with_history", {
      target_project_id: project.id,
      target_estimate_id: estimateId,
      target_parent_node_id: targetParentNodeId,
      source_template_id: templateId,
      acting_user_id: currentUser.userId,
      correlation_id: randomUUID(),
    });
    if (copyError) throw new Error(`Could not insert estimate template: ${copyError.message}`);
    insertedRootNodeIds.push(...readInsertedRootNodeIds(copyResult));
  }

  const { project: refreshedProject, estimate: refreshedEstimate, tree } = await refreshInsertedEstimateTree(project.id, estimateId, targetTabId);
  if (!refreshedProject || !refreshedEstimate) throw new Error("Estimate not found after inserting the templates.");

  return { tree, insertedRootNodeIds };
}

type InsertEstimateTemplateNodeIntoEstimateInput = {
  projectId: string;
  estimateId: string;
  targetParentNodeId: string;
  templateId: string;
  templateNodeId: string;
  // RS-1: see InsertEstimateTemplateIntoEstimateInput.targetTabId.
  targetTabId?: string;
};

type InsertEstimateTemplateNodeIntoEstimateResult = {
  tree: EstimateTreeNode[];
  insertedRootNodeId: string;
};

/**
 * Inserts one node of a template — a group or area inside it — and its whole
 * subtree under a target node. The history-aware RPC performs the copy inside
 * one database transaction so subtree inserts do not leave partial node/row
 * fragments if a later row fails.
 */
export async function insertEstimateTemplateNodeIntoEstimate({
  projectId,
  estimateId,
  targetParentNodeId,
  templateId,
  templateNodeId,
  targetTabId,
}: InsertEstimateTemplateNodeIntoEstimateInput): Promise<InsertEstimateTemplateNodeIntoEstimateResult> {
  const { project } = await getCurrentWorkspaceProject(projectId);
  if (!project) throw new Error("Project not found in the current workspace.");

  const supabase = await createSupabaseServerClient();
  const currentUser = await requireCurrentUserContext();
  // U4 (SEC-1): this path is invoked directly from the panel (not only via the
  // gated wrap flow), so it needs its own edit gate before any create/insert RPC
  // — otherwise a workspace-member viewer could insert a template-node subtree.
  await assertCanEditEstimate(supabase, estimateId);

  const { data: copyResult, error: copyError } = await supabase.rpc("insert_estimate_template_node_into_estimate_with_history", {
    target_project_id: project.id,
    target_estimate_id: estimateId,
    target_parent_node_id: targetParentNodeId,
    source_template_id: templateId,
    source_template_node_id: templateNodeId,
    acting_user_id: currentUser.userId,
    correlation_id: randomUUID(),
    ...(targetTabId ? { target_tab_id: targetTabId } : {}),
  });
  if (copyError) throw new Error(`Could not insert the template node: ${copyError.message}`);

  const copyRecord = readJsonRecord(copyResult);
  const insertedRootNodeId = typeof copyRecord.insertedRootNodeId === "string"
    ? copyRecord.insertedRootNodeId
    : typeof copyRecord.inserted_root_node_id === "string"
      ? copyRecord.inserted_root_node_id
      : "";
  if (!insertedRootNodeId) throw new Error("Template node insertion did not produce a root node.");

  const { project: refreshedProject, estimate: refreshedEstimate, tree } = await refreshInsertedEstimateTree(project.id, estimateId, targetTabId);
  if (!refreshedProject || !refreshedEstimate) throw new Error("Estimate not found after inserting the template node.");

  return { tree, insertedRootNodeId };
}

export async function insertEstimateRowItemFromLibrary({ projectId, estimateId, targetNodeId, rowId, libraryItem, mutationId }: InsertEstimateRowItemFromLibraryInput) {
  const { project } = await getCurrentWorkspaceProject(projectId);
  if (!project) throw new Error("Project not found in the current workspace.");

  const supabase = await createSupabaseServerClient();
  await assertCanEditEstimate(supabase, estimateId);
  const currentUser = await requireCurrentUserContext();
  // P6 single-node model: a row may be inserted into ANY node, not only the
  // former "area" kind. We still scope the target to a node that exists in this
  // estimate/project; the relaxed insert_estimate_row_item_with_history RPC
  // enforces the existence/orphan invariant server-side.
  const { data: targetNode, error: nodeError } = await supabase
    .from("estimate_nodes")
    .select("id, estimate_id, kind, estimates!inner(project_id)")
    .eq("id", targetNodeId)
    .eq("estimate_id", estimateId)
    .eq("estimates.project_id", project.id)
    .maybeSingle();

  if (nodeError) throw nodeError;
  if (!targetNode) throw new Error("Target estimate node not found in the current project.");

  await assertCurrentLibrarySourceForEstimateCommit(supabase, libraryItem);

  const quantity = libraryItem.quantity || 1;
  const quantityBase = libraryItem.quantityBase ?? null;
  const quantityContingencyAmount = quantityBase === null ? null : libraryItem.quantityContingencyAmount ?? 0;
  const sourceSnapshot = getSourceSnapshot(libraryItem);
  const sourceLibraryItemId = getSourceLibraryItemId(libraryItem);
  const persistedRowId = isUuid(rowId) ? rowId : randomUUID();

  const { data: insertData, error: insertError } = await supabase.rpc("insert_estimate_row_item_with_history", {
    target_project_id: project.id,
    target_estimate_id: estimateId,
    target_node_id: targetNodeId,
    row_payload: {
      id: persistedRowId,
      sourceLibraryItemId,
      sourceSnapshot,
      categoryNodeId: libraryItem.categoryNodeId ?? null,
      supplierId: libraryItem.supplierId ?? null,
      material: libraryItem.material,
      description: libraryItem.description,
      supplier: libraryItem.supplier,
      unit: libraryItem.unit,
      quantity,
      quantityBase,
      quantityContingencyAmount,
      unitCost: libraryItem.itemCost,
      contingencyPercentage: libraryItem.contingencyPercentage ?? 0,
      adjustmentPercentage: libraryItem.adjustmentPercentage ?? 0,
      miscCost: libraryItem.miscCost,
      discipline: libraryItem.discipline,
      designation: libraryItem.designation,
      metadata: getEstimateRowMetadata(libraryItem),
      linkState: sourceLibraryItemId ? "linked-clean" : "unlinked",
    },
    acting_user_id: currentUser.userId,
    correlation_id: getMutationCorrelationId(mutationId),
  });

  if (insertError) throw insertError;
  return insertData ? readHistoryRowResult(insertData) : undefined;
}

export async function updateEstimateSheetAdjustment({
  projectId,
  estimateId,
  mode,
  percentage,
  mutationId,
  expectedRowRevision,
}: UpdateEstimateSheetAdjustmentInput): Promise<UpdateEstimateSheetAdjustmentResult> {
  const { project } = await getCurrentWorkspaceProject(projectId);
  if (!project) throw new Error("Project not found in the current workspace.");

  const supabase = await createSupabaseServerClient();
  await assertCanEditEstimate(supabase, estimateId);
  const currentUser = await requireCurrentUserContext();
  const normalizedMode = normalizeEstimateSheetAdjustmentMode(mode);
  const normalizedPercentage = normalizeEstimateSheetAdjustmentPercentage(percentage);

  const { data: adjustmentResult, error } = await supabase.rpc("update_estimate_sheet_adjustment_with_history", {
    target_project_id: project.id,
    target_estimate_id: estimateId,
    adjustment_mode: normalizedMode,
    adjustment_percentage: normalizedPercentage,
    expected_row_revision: expectedRowRevision ?? null,
    acting_user_id: currentUser.userId,
    correlation_id: getMutationCorrelationId(mutationId),
  });
  if (error) throwEstimateRowMutationError(error);

  clearEstimateRouteContextProcessCache(project.id);
  revalidateProjectEstimatePaths(project.id);
  return readEstimateSheetAdjustmentRpcResult(adjustmentResult);
}

export async function updateEstimateRowItem({ projectId, estimateId, rowId, material, description, supplier, unit, unitCost, quantity, quantityBase, quantityContingencyAmount, contingencyPercentage, adjustmentPercentage, miscCost, sourceSnapshot, metadata, mutationId, expectedRowRevision }: UpdateEstimateRowItemInput): Promise<UpdateEstimateRowItemResult> {
  const { project, supabase, row } = await getValidatedEstimateRow(projectId, estimateId, rowId, { requireEdit: true });
  const currentUser = await requireCurrentUserContext();
  let sourceSnapshotPatch: Json | null | undefined;
  if (sourceSnapshot === null) {
    sourceSnapshotPatch = null;
  } else if (sourceSnapshot !== undefined) {
    const rawSourceSnapshotInput = readJsonObject(sourceSnapshot);
    const patchIncludesImageAsset = Object.prototype.hasOwnProperty.call(rawSourceSnapshotInput, "imageAsset");
    const sourceSnapshotInput = await validateEstimateRowImageAssetPatch({
      supabase,
      projectId: project.id,
      estimateId,
      rowId: row.id,
      sourceSnapshotPatch: rawSourceSnapshotInput,
    });
    let mergedSourceSnapshot = readJsonObject(mergeJsonObject(row.source_snapshot, sourceSnapshotInput));
    if (!patchIncludesImageAsset) {
      mergedSourceSnapshot = await removeUnvalidatedEstimateRowImageAsset({
        supabase,
        projectId: project.id,
        estimateId,
        rowId: row.id,
        sourceSnapshot: mergedSourceSnapshot,
      });
    }
    sourceSnapshotPatch = sanitizeEstimateRowSourceSnapshotForPersistence(mergedSourceSnapshot);
  }
  const rowPatch = {
    ...(material !== undefined ? { material } : {}),
    ...(description !== undefined ? { description } : {}),
    ...(supplier !== undefined ? { supplier } : {}),
    ...(unit !== undefined ? { unit } : {}),
    ...(unitCost !== undefined ? { unitCost } : {}),
    ...(quantity !== undefined ? { quantity } : {}),
    ...(quantityBase !== undefined ? { quantityBase } : {}),
    ...(quantityContingencyAmount !== undefined ? { quantityContingencyAmount } : {}),
    ...(contingencyPercentage !== undefined ? { contingencyPercentage } : {}),
    ...(adjustmentPercentage !== undefined ? { adjustmentPercentage } : {}),
    ...(miscCost !== undefined ? { miscCost } : {}),
    ...(sourceSnapshotPatch !== undefined ? { sourceSnapshot: sourceSnapshotPatch } : {}),
    ...(metadata !== undefined ? { metadata } : {}),
    ...(row.source_library_item_id ? { linkState: "linked-overridden" } : {}),
  };

  const { data, error } = await supabase.rpc("update_estimate_row_item_with_history", {
    target_project_id: project.id,
    target_estimate_id: estimateId,
    target_row_id: row.id,
    expected_row_revision: expectedRowRevision ?? row.row_revision,
    row_patch: rowPatch,
    acting_user_id: currentUser.userId,
    correlation_id: getMutationCorrelationId(mutationId),
  });
  if (error) throwEstimateRowMutationError(error);

  const updatedRow = readHistoryRowResult(data);
  return updatedRow;
}

export async function replaceEstimateRowItemWithLibrary({ projectId, estimateId, rowId, libraryItem, mutationId, expectedRowRevision }: ReplaceEstimateRowItemInput): Promise<UpdateEstimateRowItemResult> {
  const { project, supabase, row } = await getValidatedEstimateRow(projectId, estimateId, rowId, { requireEdit: true });
  const currentUser = await requireCurrentUserContext();
  await assertCurrentLibrarySourceForEstimateCommit(supabase, libraryItem);
  const { data, error } = await supabase.rpc("replace_estimate_row_item_with_history", {
    target_project_id: project.id,
    target_estimate_id: estimateId,
    target_row_id: row.id,
    expected_row_revision: expectedRowRevision ?? row.row_revision,
    replacement_payload: buildEstimateRowReplacementPayload(libraryItem),
    acting_user_id: currentUser.userId,
    correlation_id: getMutationCorrelationId(mutationId),
  });

  if (error) throwEstimateRowMutationError(error);
  return readHistoryRowResult(data);
}

export async function detachEstimateRowItemFromLibrary({
  projectId,
  estimateId,
  rowId,
  reason,
  mutationId,
  expectedRowRevision,
}: DetachEstimateRowItemInput): Promise<UpdateEstimateRowItemResult> {
  const { project, supabase, row } = await getValidatedEstimateRow(projectId, estimateId, rowId);
  await assertCanEditEstimate(supabase, estimateId);
  const currentUser = await requireCurrentUserContext();
  const trimmedReason = reason?.trim() || undefined;
  const { data, error } = await supabase.rpc("unlink_estimate_row_item_from_library_with_history", {
    target_project_id: project.id,
    target_estimate_id: estimateId,
    target_row_id: row.id,
    expected_row_revision: expectedRowRevision ?? row.row_revision,
    reason: trimmedReason,
    acting_user_id: currentUser.userId,
    correlation_id: getMutationCorrelationId(mutationId),
  });

  if (error) throwEstimateRowMutationError(error);

  const detachedRow = readHistoryRowResult(data);
  return detachedRow;
}

export async function deleteEstimateRowItem({ projectId, estimateId, rowId, mutationId, expectedRowRevision }: DeleteEstimateRowItemInput): Promise<DeleteEstimateRowItemResult> {
  const { project, supabase, row } = await getValidatedEstimateRow(projectId, estimateId, rowId, { requireEdit: true });
  const currentUser = await requireCurrentUserContext();
  const { data, error } = await supabase.rpc("delete_estimate_row_item_with_history", {
    target_project_id: project.id,
    target_estimate_id: estimateId,
    target_row_id: row.id,
    expected_row_revision: expectedRowRevision ?? row.row_revision,
    acting_user_id: currentUser.userId,
    correlation_id: getMutationCorrelationId(mutationId),
  });
  if (error) throwEstimateRowMutationError(error);
  return readDeletedRowResult(data);
}

export async function moveEstimateRowComponentWithHistory({
  projectId,
  estimateId,
  sourceRowId,
  targetRowId,
  sourceLibraryItem,
  targetLibraryItem,
  mutationId,
  expectedSourceRowRevision,
  expectedTargetRowRevision,
}: MoveEstimateRowComponentInput): Promise<MoveEstimateRowComponentResult> {
  if (sourceRowId === targetRowId) throw new Error("Source and target estimate rows must be different.");
  const sourceRow = await getValidatedEstimateRow(projectId, estimateId, sourceRowId, { requireEdit: true });
  const targetRow = await getValidatedEstimateRow(projectId, estimateId, targetRowId, { requireEdit: true });
  const currentUser = await requireCurrentUserContext();
  await assertCurrentLibrarySourceForEstimateCommit(targetRow.supabase, sourceLibraryItem);
  await assertCurrentLibrarySourceForEstimateCommit(targetRow.supabase, targetLibraryItem);

  const { data, error } = await targetRow.supabase.rpc("move_estimate_row_component_with_history", {
    target_project_id: targetRow.project.id,
    target_estimate_id: estimateId,
    source_row_id: sourceRowId,
    target_row_id: targetRowId,
    expected_source_row_revision: expectedSourceRowRevision ?? sourceRow.row.row_revision,
    expected_target_row_revision: expectedTargetRowRevision ?? targetRow.row.row_revision,
    source_replacement_payload: buildEstimateRowReplacementPayload(sourceLibraryItem) as Json,
    target_replacement_payload: buildEstimateRowReplacementPayload(targetLibraryItem) as Json,
    acting_user_id: currentUser.userId,
    correlation_id: getMutationCorrelationId(mutationId),
  });

  if (error) throwEstimateRowMutationError(error);
  return readMovedRowResult(data);
}

function normalizeEstimateRowMoveUpdates(updates: MoveEstimateRowItemUpdateInput[]) {
  if (!Array.isArray(updates) || updates.length === 0) throw new Error("At least one row order update is required.");
  if (updates.length > 1_000) throw new Error("Row reorganization is limited to 1000 affected rows at a time.");

  const seenRowIds = new Set<string>();
  return updates.map((update) => {
    const rowId = assertPersistedUuid(String(update.rowId ?? ""), "Estimate row");
    const nodeId = assertPersistedUuid(String(update.nodeId ?? ""), "Target node");
    const sortOrder = Number(update.sortOrder);
    const expectedRowRevision = Number(update.expectedRowRevision);
    if (seenRowIds.has(rowId)) throw new Error("Row reorganization updates must not contain duplicate row ids.");
    if (!Number.isInteger(sortOrder) || sortOrder < 0) throw new Error("Row reorganization sort order is invalid.");
    if (!Number.isInteger(expectedRowRevision) || expectedRowRevision < 1) throw new Error("Row reorganization row revision is invalid.");
    seenRowIds.add(rowId);
    return { rowId, nodeId, sortOrder, expectedRowRevision };
  });
}

export async function moveEstimateRowItemWithHistory({
  projectId,
  estimateId,
  activeTabId,
  movedRowId,
  sourceNodeId,
  targetNodeId,
  updates,
  mutationId,
}: MoveEstimateRowItemWithHistoryInput): Promise<MoveEstimateRowItemWithHistoryResult> {
  const moveUpdates = normalizeEstimateRowMoveUpdates(updates);
  const normalizedMovedRowId = assertPersistedUuid(movedRowId, "Moved estimate row");
  const normalizedSourceNodeId = assertPersistedUuid(sourceNodeId, "Source node");
  const normalizedTargetNodeId = assertPersistedUuid(targetNodeId, "Target node");
  const normalizedActiveTabId = activeTabId ? assertPersistedUuid(activeTabId, "Active tab") : null;

  if (!moveUpdates.some((update) => update.rowId === normalizedMovedRowId && update.nodeId === normalizedTargetNodeId)) {
    throw new Error("Moved estimate row must be included in the target row order updates.");
  }

  const { project } = await getCurrentWorkspaceProject(projectId);
  if (!project) throw new Error("Project not found in the current workspace.");

  const supabase = await createSupabaseServerClient();
  await assertCanEditEstimate(supabase, estimateId);

  const { data, error } = await supabase.rpc("move_estimate_row_item_with_history", {
    target_project_id: project.id,
    target_estimate_id: estimateId,
    target_active_tab_id: normalizedActiveTabId,
    move_updates: moveUpdates,
    moved_row_id: normalizedMovedRowId,
    source_node_id: normalizedSourceNodeId,
    target_node_id: normalizedTargetNodeId,
    correlation_id: getMutationCorrelationId(mutationId),
  });

  if (error) throwEstimateRowMutationError(error);
  const result = readMovedRowItemResult(data);
  clearEstimateRouteContextProcessCache(project.id);
  return result;
}

function normalizeEstimateRowIdSelection(rowIds: string[]) {
  const normalizedRowIds: string[] = [];
  const seen = new Set<string>();
  for (const rawRowId of rowIds) {
    const rowId = String(rawRowId ?? "").trim();
    if (!rowId || seen.has(rowId)) continue;
    seen.add(rowId);
    normalizedRowIds.push(rowId);
  }

  if (normalizedRowIds.length === 0) throw new Error("Select at least one estimate row.");
  if (normalizedRowIds.length > 100) throw new Error("Selected row delete is limited to 100 rows at a time.");
  return normalizedRowIds;
}

function normalizeEstimateNodeIdSelection(nodeIds: string[]) {
  const normalizedNodeIds: string[] = [];
  const seen = new Set<string>();
  for (const rawNodeId of nodeIds) {
    const nodeId = String(rawNodeId ?? "").trim();
    if (!nodeId || seen.has(nodeId)) continue;
    seen.add(nodeId);
    normalizedNodeIds.push(nodeId);
  }

  if (normalizedNodeIds.length === 0) throw new Error("Select at least one estimate tree node.");
  return normalizedNodeIds;
}

export async function deleteEstimateRowItemsBulk({
  projectId,
  estimateId,
  rowIds,
  mutationId,
  expectedRowRevisions,
}: DeleteEstimateRowItemsBulkInput): Promise<DeleteEstimateRowItemsBulkResult> {
  const normalizedRowIds = normalizeEstimateRowIdSelection(rowIds);
  const { project } = await getCurrentWorkspaceProject(projectId);
  if (!project) throw new Error("Project not found in the current workspace.");

  const supabase = await createSupabaseServerClient();
  await assertCanEditEstimate(supabase, estimateId);
  const currentUser = await requireCurrentUserContext();
  const { data: rows, error: rowsError } = await supabase
    .from("estimate_row_items")
    .select("id, row_revision, estimate_nodes!inner(estimates!inner(project_id))")
    .eq("estimate_id", estimateId)
    .eq("estimate_nodes.estimates.project_id", project.id)
    .in("id", normalizedRowIds);

  if (rowsError) throw rowsError;
  const rowRevisionById = new Map((rows ?? []).map((row) => [row.id, row.row_revision]));
  if (rowRevisionById.size !== normalizedRowIds.length) throw new Error("One or more estimate row items were not found in the current project.");
  const expectedRevisionPayload = Object.fromEntries(
    normalizedRowIds.map((rowId) => [rowId, expectedRowRevisions?.[rowId] ?? rowRevisionById.get(rowId)]),
  );

  const { data, error } = await supabase.rpc("delete_estimate_row_items_bulk_with_history", {
    target_project_id: project.id,
    target_estimate_id: estimateId,
    target_row_ids: normalizedRowIds,
    expected_row_revisions: expectedRevisionPayload,
    acting_user_id: currentUser.userId,
    correlation_id: getMutationCorrelationId(mutationId),
  });

  if (error) throwEstimateRowMutationError(error);
  return readDeleteRowsBulkResult(data);
}

export async function restoreDeletedEstimateRows({
  projectId,
  estimateId,
  sourceEventId,
  rowIds,
  mutationId,
}: RestoreDeletedEstimateRowsInput): Promise<RestoreDeletedEstimateRowsResult> {
  const { project } = await getCurrentWorkspaceProject(projectId);
  if (!project) throw new Error("Project not found in the current workspace.");

  const normalizedRowIds = rowIds && rowIds.length > 0 ? normalizeEstimateRowIdSelection(rowIds) : null;
  const supabase = await createSupabaseServerClient();
  await assertCanEditEstimate(supabase, estimateId);
  const currentUser = await requireCurrentUserContext();
  const { data, error } = await supabase.rpc("restore_deleted_estimate_rows_with_history", {
    target_project_id: project.id,
    target_estimate_id: estimateId,
    source_delete_event_id: sourceEventId,
    target_row_ids: normalizedRowIds,
    acting_user_id: currentUser.userId,
    correlation_id: getMutationCorrelationId(mutationId),
  });

  if (error) throwEstimateRowMutationError(error);
  return readRestoreDeletedRowsResult(data);
}

export async function restoreDeletedEstimateNodes({
  projectId,
  estimateId,
  sourceEventId,
  nodeIds,
  targetTabId,
  mutationId,
}: RestoreDeletedEstimateNodesInput): Promise<RestoreDeletedEstimateNodesResult> {
  const { project } = await getCurrentWorkspaceProject(projectId);
  if (!project) throw new Error("Project not found in the current workspace.");

  const normalizedNodeIds = nodeIds && nodeIds.length > 0 ? normalizeEstimateNodeIdSelection(nodeIds) : null;
  const supabase = await createSupabaseServerClient();
  await assertCanEditEstimate(supabase, estimateId);
  const currentUser = await requireCurrentUserContext();
  const { data, error } = await supabase.rpc("restore_deleted_estimate_nodes_with_history", {
    target_project_id: project.id,
    target_estimate_id: estimateId,
    source_delete_event_id: sourceEventId,
    target_node_ids: normalizedNodeIds,
    acting_user_id: currentUser.userId,
    correlation_id: getMutationCorrelationId(mutationId),
  });

  if (error) throw new Error(`Could not restore deleted estimate tree nodes: ${error.message}`);
  const restored = readRestoreDeletedNodesResult(data);
  const { project: refreshedProject, estimate: refreshedEstimate, tree } = await refreshInsertedEstimateTree(project.id, estimateId, targetTabId);
  if (!refreshedProject || !refreshedEstimate) throw new Error("Estimate not found after restoring the deleted tree nodes.");

  return { ...restored, tree };
}
