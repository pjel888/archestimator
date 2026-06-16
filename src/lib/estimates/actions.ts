"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { requireCurrentUserContext } from "@/lib/auth/session";
import type { EstimateTabSummary, EstimateTreeNode, EstimateRowItem } from "@/lib/estimates/types";
import { LEGACY_BLANK_ROW_TAG, isExpressComponentRow, readEstimateRowMetadata, withCopiedExpressComponentMetadata } from "@/lib/estimates/express-components";
import { sanitizeEstimateRowSourceSnapshot } from "@/lib/estimates/image-url";
import {
  normalizeEstimateTreeNodeKind,
  selectFirstEstimateNodeIds,
} from "@/lib/estimates/tree-hierarchy";
import {
  buildProjectEstimateListRow,
  projectEstimateListRowSource,
} from "@/lib/estimates/project-estimate-list-row";
import { sumEstimateRowLineTotals } from "@/lib/estimates/estimate-row-total";
import { planEstimateTreeDelete } from "@/lib/estimates/estimate-tree-edit";
import { dedupeSelectedRoots, type TreeSelectionNode } from "@/lib/bulk-selection/tree-selection";
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
import { getCurrentWorkspaceProject, getEstimateTabTree, getEstimateTabs, getProjectEstimateTreeByEstimate } from "@/lib/repositories/workspace-repository";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { Json, Tables, TablesInsert, TablesUpdate } from "@/lib/supabase/types";

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
  contingencyPercentage?: number;
  miscCost?: number;
  sourceSnapshot?: Json | null;
  metadata?: Json;
  mutationId?: string;
  expectedRowRevision?: number;
};

type DetachEstimateRowItemInput = {
  projectId: string;
  estimateId: string;
  rowId: string;
  reason?: string;
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
  itemCost: number;
  contingencyPercentage: number;
  contingencyValue: number;
  miscCost: number;
  sourceSnapshot: Json | null;
  metadata: Json;
  linkState: Tables<"estimate_row_items">["link_state"];
  rowRevision: number;
};

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
    unitCost?: unknown;
    contingencyPercentage?: unknown;
    contingencyValue?: unknown;
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
    itemCost: readNumber(row.unitCost),
    contingencyPercentage: readNumber(row.contingencyPercentage),
    contingencyValue: readNumber(row.contingencyValue),
    miscCost: readNumber(row.miscCost),
    sourceSnapshot: readJsonValue(row.sourceSnapshot, null) as Json | null,
    metadata: readJsonValue(row.metadata, {}),
    linkState: row.linkState as Tables<"estimate_row_items">["link_state"],
    rowRevision: readNumber(row.rowRevision, 1),
  } satisfies UpdateEstimateRowItemResult;
}

async function assertCanEditEstimate(supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>, estimateId: string) {
  const { data, error } = await supabase.rpc("can_edit_estimate", { target_estimate_id: estimateId });
  if (error) throw error;
  if (data !== true) throw new Error("Estimate edit access denied.");
}

// Project-scoped edit guard for sheet creation (no estimate id exists yet). RLS
// still backstops the insert; this returns a clean app-level denial first so a
// read-only collaborator never sees a raw RLS error (F15 / P3-3).
async function assertCanEditProject(supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>, projectId: string) {
  const { data, error } = await supabase.rpc("can_edit_project", { target_project_id: projectId });
  if (error) throw error;
  if (data !== true) throw new Error("Project edit access denied.");
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

function buildHistoryEventPageRows(rows: Tables<"estimate_sheet_events">[], limit: number) {
  const filteredRows = rows.filter((row) => !DORMANT_NAMED_VERSION_EVENT_TYPES.includes(row.event_type as (typeof DORMANT_NAMED_VERSION_EVENT_TYPES)[number]));
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
  const eventTypes = Array.from(new Set((input.eventTypes ?? []).map((eventType) => eventType.trim()).filter(Boolean)));
  for (const eventType of eventTypes) {
    if (!/^[a-z0-9_]+$/.test(eventType)) throw new Error("Activity event type filter contains unsupported characters.");
    if (DORMANT_NAMED_VERSION_EVENT_TYPES.includes(eventType as (typeof DORMANT_NAMED_VERSION_EVENT_TYPES)[number])) {
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

async function getValidatedEstimateNode(projectId: string, estimateId: string, nodeId: string) {
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
    misc_cost: libraryItem.miscCost,
    currency: libraryItem.currency ?? "PHP",
  }) as Json;
}

function readJsonObject(value: unknown): Record<string, Json | undefined> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? { ...(value as Record<string, Json | undefined>) }
    : {};
}

function mergeJsonObject(value: unknown, patch: Record<string, Json | undefined>): Json {
  return {
    ...readJsonObject(value),
    ...patch,
  } as Json;
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
    .filter((estimate) => estimate.id !== excludedEstimateId)
    .map((estimate) => estimate.sheetCode.trim())
    .filter(Boolean);
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

async function createEstimateWithDefaultTree({
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

  const defaultTabId = defaultTab.id;

  const projectGroupInsert: TablesInsert<"estimate_nodes"> = {
    estimate_id: estimate.id,
    estimate_tab_id: defaultTabId,
    parent_id: null,
    kind: "group",
    name: "Project Scope",
    sort_order: 0,
  };

  const { data: projectGroupNode, error: projectGroupError } = await supabase
    .from("estimate_nodes")
    .insert(projectGroupInsert)
    .select("id")
    .single();

  if (projectGroupError) throw projectGroupError;
  if (!projectGroupNode?.id) throw new Error("Default estimate root group was not created.");

  const generalNodeInserts: TablesInsert<"estimate_nodes">[] = [
    {
      estimate_id: estimate.id,
      estimate_tab_id: defaultTabId,
      parent_id: projectGroupNode.id,
      kind: "group",
      name: "General Requirements",
      sort_order: 0,
    },
    {
      estimate_id: estimate.id,
      estimate_tab_id: defaultTabId,
      parent_id: projectGroupNode.id,
      kind: "group",
      name: "Site Works",
      sort_order: 10,
    },
  ];

  const { error: generalNodesError } = await supabase.from("estimate_nodes").insert(generalNodeInserts);

  if (generalNodesError) throw generalNodesError;

  const buildingGroupInsert: TablesInsert<"estimate_nodes"> = {
    estimate_id: estimate.id,
    estimate_tab_id: defaultTabId,
    parent_id: projectGroupNode.id,
    kind: "group",
    name: project.name,
    sort_order: 20,
  };

  const { data: buildingGroupNode, error: buildingGroupError } = await supabase
    .from("estimate_nodes")
    .insert(buildingGroupInsert)
    .select("id")
    .single();

  if (buildingGroupError) throw buildingGroupError;
  if (!buildingGroupNode?.id) throw new Error("Default estimate building group was not created.");

  const levelGroupInsert: TablesInsert<"estimate_nodes"> = {
    estimate_id: estimate.id,
    estimate_tab_id: defaultTabId,
    parent_id: buildingGroupNode.id,
    kind: "group",
    name: "Ground Floor",
    sort_order: 0,
  };

  const { data: levelGroupNode, error: levelGroupError } = await supabase
    .from("estimate_nodes")
    .insert(levelGroupInsert)
    .select("id")
    .single();

  if (levelGroupError) throw levelGroupError;
  if (!levelGroupNode?.id) throw new Error("Default estimate level group was not created.");

  const areaNodeInsert: TablesInsert<"estimate_nodes"> = {
    estimate_id: estimate.id,
    estimate_tab_id: defaultTabId,
    parent_id: levelGroupNode.id,
    kind: "area",
    name: "Project-wide",
    sort_order: 0,
  };

  const { data: areaNode, error: areaError } = await supabase
    .from("estimate_nodes")
    .insert(areaNodeInsert)
    .select("id")
    .single();

  if (areaError) throw areaError;
  if (!areaNode?.id) throw new Error("Default estimate area was not created.");

  // project group + general groups + building group + level group + area
  const nodeCount = 1 + generalNodeInserts.length + 1 + 1 + 1;
  return { estimate, areaNodeId: areaNode.id, nodeCount };
}

function revalidateProjectEstimatePaths(projectId: string) {
  revalidatePath(`/workshop/projects/${projectId}`);
  revalidatePath(`/workshop/projects/${projectId}/estimates`);
  revalidatePath(`/workshop/projects/${projectId}/data`);
}

export async function fetchEstimateTree({ projectId, estimateId }: FetchEstimateTreeInput) {
  const { project, estimate, tree } = await getProjectEstimateTreeByEstimate(projectId, estimateId);
  if (!project || !estimate) throw new Error("Estimate not found in the current project.");
  return tree;
}

export async function fetchEstimateTabs({ projectId, estimateId }: FetchEstimateTreeInput) {
  return getEstimateTabs(projectId, estimateId);
}

export async function fetchEstimateTabTree({ projectId, estimateId, tabId }: FetchEstimateTabTreeInput) {
  const { project, estimate, tab, tree } = await getEstimateTabTree(projectId, estimateId, tabId);
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
  if (!input.updates.length) throw new Error("At least one estimate tree node update is required.");

  const updateIds = new Set<string>();
  for (const update of input.updates) {
    if (updateIds.has(update.id)) throw new Error(`Duplicate estimate tree node update: ${update.id}.`);
    updateIds.add(update.id);
    assertNotOptimisticEstimateNodeId(update.id, "Estimate tree update node");
    if (update.parentId) assertNotOptimisticEstimateNodeId(update.parentId, "Estimate tree update parent");
    if (!Number.isInteger(update.sortOrder) || update.sortOrder < 0) throw new Error("Estimate tree node sort order must be a non-negative integer.");
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

  const { project: refreshedProject, estimate: refreshedEstimate, tree } = await getProjectEstimateTreeByEstimate(project.id, estimate.id);
  if (!refreshedProject || !refreshedEstimate) throw new Error("Estimate not found after reordering the tree.");
  return { tree };
}

export async function createEstimate(projectId: string, formData: FormData) {
  const { project } = await getCurrentWorkspaceProject(projectId);
  if (!project) throw new Error("Project not found in the current workspace.");

  const supabase = await createSupabaseServerClient();
  const currentUser = await requireCurrentUserContext();
  const name = readRequiredText(formData, "name");
  const requestedSheetCode = readOptionalText(formData, "sheetCode") ?? readOptionalText(formData, "revisionLabel");
  const sheetCode = requestedSheetCode ?? (await generateNextEstimateSheetCode(supabase, project.id));

  const { areaNodeId } = await createEstimateWithDefaultTree({
    supabase,
    project,
    name,
    sheetCode,
    createdBy: currentUser.userId,
  });

  revalidateProjectEstimatePaths(project.id);
  redirect(`/workshop/projects/${project.id}/estimates/${areaNodeId}`);
}

export async function createEstimateSheetDraft(projectId: string) {
  const { project } = await getCurrentWorkspaceProject(projectId);
  if (!project) throw new Error("Project not found in the current workspace.");

  const supabase = await createSupabaseServerClient();
  await assertCanEditProject(supabase, project.id);
  const currentUser = await requireCurrentUserContext();
  const sheetCode = await generateNextEstimateSheetCode(supabase, project.id);

  const { estimate, areaNodeId, nodeCount } = await createEstimateWithDefaultTree({
    supabase,
    project,
    name: `${sheetCode} Estimate`,
    sheetCode,
    createdBy: currentUser.userId,
  });

  revalidateProjectEstimatePaths(project.id);
  // Return the canonical list row so the client store can reconcile its
  // optimistic placeholder without a full re-render (P-1.2 / P0-3).
  const row = buildProjectEstimateListRow(estimate, {
    firstNodeId: areaNodeId,
    nodeCount,
    rowItemCount: 0,
    totalProjectCost: 0,
    isFavorite: false,
    favoriteCreatedAt: null,
  });
  return { row, estimateId: estimate.id, areaNodeId, sheetCode };
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
    const nextIndex = pendingNodes.findIndex((node) => node.parent_id === null || nodeIdBySourceId.has(node.parent_id));
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
      misc_cost: row.misc_cost,
      node_id: nodeId,
      quantity: row.quantity,
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

  const currentUser = await requireCurrentUserContext();
  return { project, estimate, supabase, currentUser };
}

export async function createEstimateTab(input: CreateEstimateTabInput): Promise<EstimateTabMutationResult> {
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
  const maxSiblingSortOrder = siblingRows.reduce((max, sibling) => Math.max(max, sibling.sort_order), -1);
  const createNodePayload = {
    target_project_id: project.id,
    target_estimate_id: estimate.id,
    parent_node_id: parentId,
    node_kind: kind,
    node_name: name,
    initial_sort_order: maxSiblingSortOrder + 1,
    acting_user_id: currentUser.userId,
    correlation_id: randomUUID(),
    ...(estimateTabId ? { target_tab_id: estimateTabId } : {}),
  };
  const { data: nodeResult, error: rpcError } = await supabase.rpc("create_estimate_node_with_history", createNodePayload);
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
  const { estimate, supabase, node } = await getValidatedEstimateNode(projectId, estimateId, nodeId);
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
): Promise<DeleteEstimateNodeResult> {
  const { project, estimate, supabase, node } = await getValidatedEstimateNode(projectId, estimateId, nodeId);
  const currentUser = await requireCurrentUserContext();
  const { project: currentProject, estimate: currentEstimate, tree: currentTree } = await getProjectEstimateTreeByEstimate(project.id, estimate.id);
  if (!currentProject || !currentEstimate) throw new Error("Estimate not found before deleting the tree node.");

  const deletePlan = planEstimateTreeDelete(currentTree, node.id, node.id);
  const { error } = await supabase.rpc("delete_estimate_node_with_history", {
    target_project_id: project.id,
    target_estimate_id: estimate.id,
    target_node_id: node.id,
    acting_user_id: currentUser.userId,
    correlation_id: randomUUID(),
  });

  if (error) throw new Error(`Could not delete estimate tree node: ${error.message}`);

  const { project: refreshedProject, estimate: refreshedEstimate, tree } = await getProjectEstimateTreeByEstimate(project.id, estimate.id);
  if (!refreshedProject || !refreshedEstimate) throw new Error("Estimate not found after deleting the tree node.");

  return {
    tree,
    deletedNodeIds: Array.from(deletePlan.deletedNodeIds),
    fallbackNodeId: deletePlan.fallbackNodeId,
  };
}

export async function deleteEstimateNodesBulk(
  projectId: string,
  estimateId: string,
  nodeIds: string[],
): Promise<DeleteEstimateNodeResult> {
  const requestedNodeIds = [...new Set(nodeIds.map((nodeId) => nodeId.trim()).filter(Boolean))];
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
  const { project: currentProject, estimate: currentEstimate, tree: currentTree } = await getProjectEstimateTreeByEstimate(project.id, estimate.id);
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

  for (const rootNodeId of rootNodeIds) {
    const { error } = await supabase.rpc("delete_estimate_node_with_history", {
      target_project_id: project.id,
      target_estimate_id: estimate.id,
      target_node_id: rootNodeId,
      acting_user_id: currentUser.userId,
      correlation_id: randomUUID(),
    });

    if (error) throw new Error(`Could not delete selected estimate tree nodes: ${error.message}`);
  }

  const { project: refreshedProject, estimate: refreshedEstimate, tree } = await getProjectEstimateTreeByEstimate(project.id, estimate.id);
  if (!refreshedProject || !refreshedEstimate) throw new Error("Estimate not found after deleting the selected tree nodes.");

  return {
    tree,
    deletedNodeIds: Array.from(deletedNodeIds),
    fallbackNodeId,
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

type TemplateSubtreeNodeRow = {
  id: string;
  parent_id: string | null;
  kind: "group" | "area";
  name: string;
  sort_order: number;
};

/**
 * Inserts one node of a template — a group or area inside it — and its whole
 * subtree under a target node. Unlike whole-template insertion (a single
 * RPC), this loops the history-aware node/row RPCs so every created node and
 * row lands in the estimate's event history; a mid-way failure leaves the
 * already-created nodes visible and deletable rather than rolling back.
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

  const { data: targetParent, error: parentError } = await supabase
    .from("estimate_nodes")
    .select("id, kind, estimates!inner(project_id)")
    .eq("id", targetParentNodeId)
    .eq("estimate_id", estimateId)
    .eq("estimates.project_id", project.id)
    .maybeSingle();
  if (parentError) throw parentError;
  if (!targetParent) throw new Error("Target node not found in the current project.");

  const { data: template, error: templateError } = await supabase
    .from("estimate_templates")
    .select("id")
    .eq("id", templateId)
    .eq("workspace_id", project.workspace_id)
    .maybeSingle();
  if (templateError) throw templateError;
  if (!template) throw new Error("Estimate template not found in the current workspace.");

  const [nodesResult, rowsResult] = await Promise.all([
    supabase
      .from("estimate_template_nodes")
      .select("id, parent_id, kind, name, sort_order")
      .eq("template_id", templateId)
      .order("sort_order", { ascending: true }),
    supabase
      .from("estimate_template_row_items")
      .select(
        "id, template_node_id, sort_order, source_library_item_id, source_snapshot, category_node_id, supplier_id, material, description, supplier, unit, quantity, unit_cost, contingency_percentage, misc_cost, discipline, designation, link_state, metadata",
      )
      .eq("template_id", templateId)
      .order("sort_order", { ascending: true }),
  ]);
  if (nodesResult.error) throw nodesResult.error;
  if (rowsResult.error) throw rowsResult.error;

  const allTemplateNodes = (nodesResult.data ?? []) as TemplateSubtreeNodeRow[];
  const sourceNode = allTemplateNodes.find((node) => node.id === templateNodeId);
  if (!sourceNode) throw new Error("Template node not found in the current workspace.");

  // Collect the subtree breadth-first so parents are created before children.
  const childrenByParentId = new Map<string | null, TemplateSubtreeNodeRow[]>();
  for (const node of allTemplateNodes) {
    const siblings = childrenByParentId.get(node.parent_id) ?? [];
    siblings.push(node);
    childrenByParentId.set(node.parent_id, siblings);
  }
  const subtreeNodes: TemplateSubtreeNodeRow[] = [];
  const queue: TemplateSubtreeNodeRow[] = [sourceNode];
  while (queue.length > 0) {
    const node = queue.shift();
    if (!node) break;
    subtreeNodes.push(node);
    queue.push(...(childrenByParentId.get(node.id) ?? []));
  }

  const { data: siblingRows, error: siblingError } = await supabase
    .from("estimate_nodes")
    .select("sort_order")
    .eq("estimate_id", estimateId)
    .eq("parent_id", targetParentNodeId)
    .order("sort_order", { ascending: false })
    .limit(1);
  if (siblingError) throw siblingError;
  const rootSortOrder = (siblingRows?.[0]?.sort_order ?? -1) + 1;

  const createdNodeIdByTemplateNodeId = new Map<string, string>();
  for (const node of subtreeNodes) {
    const parentEstimateNodeId =
      node.id === sourceNode.id ? targetParentNodeId : createdNodeIdByTemplateNodeId.get(node.parent_id ?? "");
    if (!parentEstimateNodeId) throw new Error("Template node structure is inconsistent.");

    const { data: createResult, error: createError } = await supabase.rpc("create_estimate_node_with_history", {
      target_project_id: project.id,
      target_estimate_id: estimateId,
      parent_node_id: parentEstimateNodeId,
      node_kind: node.kind,
      node_name: node.name,
      initial_sort_order: node.id === sourceNode.id ? rootSortOrder : node.sort_order,
      acting_user_id: currentUser.userId,
      correlation_id: randomUUID(),
    });
    if (createError) throw new Error(`Could not copy the template node: ${createError.message}`);
    const createRecord = readJsonRecord(createResult);
    const createPayload = readJsonRecord(createRecord.payload);
    const createdNodeId = typeof createRecord.nodeId === "string"
      ? createRecord.nodeId
      : typeof createPayload.nodeId === "string"
        ? createPayload.nodeId
        : "";
    if (!createdNodeId) throw new Error("Estimate node history RPC did not return the created node id.");
    createdNodeIdByTemplateNodeId.set(node.id, createdNodeId);
  }

  const subtreeNodeIds = new Set(subtreeNodes.map((node) => node.id));
  const subtreeRows = (rowsResult.data ?? []).filter((row) => subtreeNodeIds.has(row.template_node_id));
  for (const row of subtreeRows) {
    const targetNodeId = createdNodeIdByTemplateNodeId.get(row.template_node_id);
    if (!targetNodeId) continue;
    const copyProvenance = {
      sourceTemplateId: templateId,
      sourceTemplateNodeId: row.template_node_id,
      sourceTemplateRowId: row.id,
      sourceKind: "template",
    } satisfies Record<string, Json>;

    const { error: rowInsertError } = await supabase.rpc("insert_estimate_row_item_with_history", {
      target_project_id: project.id,
      target_estimate_id: estimateId,
      target_node_id: targetNodeId,
      row_payload: {
        id: randomUUID(),
        sortOrder: row.sort_order,
        sourceLibraryItemId: row.source_library_item_id,
        sourceSnapshot: mergeJsonObject(row.source_snapshot, copyProvenance),
        categoryNodeId: row.category_node_id,
        supplierId: row.supplier_id,
        material: row.material,
        description: row.description,
        supplier: row.supplier,
        unit: row.unit,
        quantity: Number(row.quantity),
        unitCost: Number(row.unit_cost),
        contingencyPercentage: Number(row.contingency_percentage ?? 0),
        miscCost: Number(row.misc_cost),
        discipline: row.discipline,
        designation: row.designation,
        metadata: withCopiedExpressComponentMetadata(row.metadata, copyProvenance, randomUUID),
        linkState: row.link_state ?? (row.source_library_item_id ? "linked-clean" : "unlinked"),
      },
      acting_user_id: currentUser.userId,
      correlation_id: randomUUID(),
    });
    if (rowInsertError) throw new Error(`Could not copy the template rows: ${rowInsertError.message}`);
  }

  const insertedRootNodeId = createdNodeIdByTemplateNodeId.get(sourceNode.id);
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

  const quantity = libraryItem.quantity || 1;
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
      unitCost: libraryItem.itemCost,
      contingencyPercentage: libraryItem.contingencyPercentage ?? 0,
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

export async function updateEstimateRowItem({ projectId, estimateId, rowId, material, description, supplier, unit, unitCost, quantity, contingencyPercentage, miscCost, sourceSnapshot, metadata, mutationId, expectedRowRevision }: UpdateEstimateRowItemInput): Promise<UpdateEstimateRowItemResult> {
  const { project, supabase, row } = await getValidatedEstimateRow(projectId, estimateId, rowId, { requireEdit: true });
  const currentUser = await requireCurrentUserContext();
  const sourceSnapshotPatch = sourceSnapshot === undefined
    ? undefined
    : sourceSnapshot === null
      ? null
      : mergeJsonObject(row.source_snapshot, readJsonObject(sourceSnapshot));
  const rowPatch = {
    ...(material !== undefined ? { material } : {}),
    ...(description !== undefined ? { description } : {}),
    ...(supplier !== undefined ? { supplier } : {}),
    ...(unit !== undefined ? { unit } : {}),
    ...(unitCost !== undefined ? { unitCost } : {}),
    ...(quantity !== undefined ? { quantity } : {}),
    ...(contingencyPercentage !== undefined ? { contingencyPercentage } : {}),
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
  if (error) throw error;

  const updatedRow = readHistoryRowResult(data);
  return updatedRow;
}

export async function replaceEstimateRowItemWithLibrary({ projectId, estimateId, rowId, libraryItem, mutationId, expectedRowRevision }: ReplaceEstimateRowItemInput) {
  const { project, supabase, row } = await getValidatedEstimateRow(projectId, estimateId, rowId, { requireEdit: true });
  if (isExpressComponentRow({ metadata: row.metadata })) {
    throw new Error("Express component rows cannot be replaced with library components yet. Delete the express row or promote it before replacing.");
  }
  const currentUser = await requireCurrentUserContext();
  const quantity = libraryItem.quantity || 1;
  const sourceLibraryItemId = getSourceLibraryItemId(libraryItem);
  const { error } = await supabase.rpc("replace_estimate_row_item_with_history", {
    target_project_id: project.id,
    target_estimate_id: estimateId,
    target_row_id: row.id,
    expected_row_revision: expectedRowRevision ?? row.row_revision,
    replacement_payload: {
      sourceLibraryItemId,
      sourceSnapshot: getSourceSnapshot(libraryItem),
      categoryNodeId: libraryItem.categoryNodeId ?? null,
      supplierId: libraryItem.supplierId ?? null,
      material: libraryItem.material,
      description: libraryItem.description,
      supplier: libraryItem.supplier,
      unit: libraryItem.unit,
      quantity,
      unitCost: libraryItem.itemCost,
      contingencyPercentage: libraryItem.contingencyPercentage ?? 0,
      miscCost: libraryItem.miscCost,
      discipline: libraryItem.discipline,
      designation: libraryItem.designation,
      metadata: getEstimateRowMetadata(libraryItem),
      linkState: sourceLibraryItemId ? "linked-clean" : "unlinked",
    },
    acting_user_id: currentUser.userId,
    correlation_id: getMutationCorrelationId(mutationId),
  });

  if (error) throw error;
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

  if (error) throw error;

  const detachedRow = readHistoryRowResult(data);
  return detachedRow;
}

export async function deleteEstimateRowItem({ projectId, estimateId, rowId, mutationId, expectedRowRevision }: DeleteEstimateRowItemInput) {
  const { project, supabase, row } = await getValidatedEstimateRow(projectId, estimateId, rowId, { requireEdit: true });
  const currentUser = await requireCurrentUserContext();
  const { error } = await supabase.rpc("delete_estimate_row_item_with_history", {
    target_project_id: project.id,
    target_estimate_id: estimateId,
    target_row_id: row.id,
    expected_row_revision: expectedRowRevision ?? row.row_revision,
    acting_user_id: currentUser.userId,
    correlation_id: getMutationCorrelationId(mutationId),
  });
  if (error) throw error;
}
