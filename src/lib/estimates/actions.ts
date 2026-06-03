"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { requireCurrentUserContext } from "@/lib/auth/session";
import type { EstimateTreeNode, EstimateRowItem } from "@/lib/estimates/types";
import {
  canNestEstimateNodeKind,
  getEstimateNodeNestingError,
  normalizeEstimateTreeNodeKind,
  type EstimateTreeNodeKind,
} from "@/lib/estimates/tree-hierarchy";
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
import { getCurrentWorkspaceProject, getProjectEstimateTreeByEstimate } from "@/lib/repositories/workspace-repository";
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
};

type InsertEstimateTemplateIntoEstimateResult = {
  tree: EstimateTreeNode[];
  insertedRootNodeIds: string[];
};

type UpdateEstimateRowItemInput = {
  projectId: string;
  estimateId: string;
  rowId: string;
  quantity?: number;
  contingencyPercentage?: number;
  miscCost?: number;
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
  quantity: number;
  itemCost: number;
  contingencyPercentage: number;
  contingencyValue: number;
  miscCost: number;
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
  parent_id: string | null;
  kind: string;
};

type ValidatedEstimateNodeRow = {
  id: string;
  estimate_id: string;
  parent_id: string | null;
  kind: string;
};

type RenameEstimateNodeResult = {
  nodeId: string;
  name: string;
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

function readNumber(value: unknown, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

type EstimateHistoryRowRpcResult = {
  rowId?: unknown;
  row?: {
    id?: unknown;
    nodeId?: unknown;
    quantity?: unknown;
    unitCost?: unknown;
    contingencyPercentage?: unknown;
    contingencyValue?: unknown;
    miscCost?: unknown;
    linkState?: unknown;
    rowRevision?: unknown;
  };
};

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
    quantity: readNumber(row.quantity),
    itemCost: readNumber(row.unitCost),
    contingencyPercentage: readNumber(row.contingencyPercentage),
    contingencyValue: readNumber(row.contingencyValue),
    miscCost: readNumber(row.miscCost),
    linkState: row.linkState as Tables<"estimate_row_items">["link_state"],
    rowRevision: readNumber(row.rowRevision, 1),
  } satisfies UpdateEstimateRowItemResult;
}

type RpcFunctionName =
  | "insert_estimate_row_item_with_history"
  | "update_estimate_row_item_with_history"
  | "replace_estimate_row_item_with_history"
  | "unlink_estimate_row_item_from_library_with_history"
  | "delete_estimate_row_item_with_history"
  | "reorder_estimate_nodes_with_history"
  | "create_estimate_node_with_history"
  | "rename_estimate_node_with_history"
  | "insert_estimate_template_into_estimate_with_history"
  | "update_estimate_details_with_history"
  | "delete_estimate_node_with_history";

type EstimateHistoryRpcClient = {
  rpc: (fn: RpcFunctionName, args: Record<string, unknown>) => Promise<{ data: unknown; error: { message: string } | null }>;
};

type EstimatePermissionRpcClient = {
  rpc: (fn: "can_edit_estimate", args: { target_estimate_id: string }) => Promise<{ data: boolean | null; error: { message: string } | null }>;
};

function asEstimateHistoryRpcClient(supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>) {
  return supabase as unknown as EstimateHistoryRpcClient;
}

async function assertCanEditEstimate(supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>, estimateId: string) {
  const { data, error } = await (supabase as unknown as EstimatePermissionRpcClient).rpc("can_edit_estimate", { target_estimate_id: estimateId });
  if (error) throw error;
  if (data !== true) throw new Error("Estimate edit access denied.");
}

type EstimateActivityRetentionMetricsRpcClient = {
  rpc: (
    fn: "get_estimate_activity_retention_metrics",
    args: { target_project_id: string },
  ) => Promise<{ data: unknown; error: { message: string } | null }>;
};

function asEstimateActivityRetentionMetricsRpcClient(supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>) {
  return supabase as unknown as EstimateActivityRetentionMetricsRpcClient;
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

async function getValidatedEstimateRow(projectId: string, estimateId: string, rowId: string) {
  const { project } = await getCurrentWorkspaceProject(projectId);
  if (!project) throw new Error("Project not found in the current workspace.");

  const supabase = await createSupabaseServerClient();
  const { data: row, error } = await supabase
    .from("estimate_row_items")
    .select("id, node_id, estimate_id, source_library_item_id, link_state, row_revision, estimate_nodes!inner(id, kind, estimates!inner(project_id))")
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

function getSourceSnapshot(libraryItem: EstimateRowItem) {
  return {
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
  };
}

function getEstimateRowMetadata(libraryItem: EstimateRowItem) {
  return {
    categoryNodeId: libraryItem.categoryNodeId ?? null,
    categoryPath: libraryItem.categoryPath ?? [],
    brandId: libraryItem.brandId ?? null,
    supplierId: libraryItem.supplierId ?? null,
    sourceComponentId: libraryItem.id,
    componentVersionId: libraryItem.componentVersionId ?? null,
    componentVersionNumber: libraryItem.componentVersionNumber ?? null,
    priceOptionId: libraryItem.priceOptionId ?? null,
    tags: libraryItem.tags ?? [],
  };
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
  return normalizeEstimateRecord(legacyResult.data as unknown as EstimateRecordWithLegacy);
}

type ProjectEstimateCodeRow = {
  id: string;
  sheetCode: string;
};

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

type DuplicateEstimateNodeRow = Pick<Tables<"estimate_nodes">, "id" | "kind" | "metadata" | "name" | "parent_id" | "sort_order">;
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
  return ((legacyResult.data ?? []) as unknown as Array<{ id: string; revision_label?: string | null }>).map((estimate) => ({
    id: estimate.id,
    sheetCode: estimate.revision_label ?? "",
  }));
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

  if (duplicate) throw new Error(`Sheet code ${sheetCode} already exists in this project.`);
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
  return normalizeEstimateRecord(legacyResult.data as unknown as EstimateRecordWithLegacy);
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

  const { data: projectGroupNode, error: projectGroupError } = await supabase
    .from("estimate_nodes")
    .insert({
      estimate_id: estimate.id,
      parent_id: null,
      kind: "group",
      name: "Project Scope",
      sort_order: 0,
    })
    .select("id")
    .single();

  if (projectGroupError) throw projectGroupError;

  const { error: generalNodesError } = await supabase.from("estimate_nodes").insert([
    {
      estimate_id: estimate.id,
      parent_id: projectGroupNode.id,
      kind: "group",
      name: "General Requirements",
      sort_order: 0,
    },
    {
      estimate_id: estimate.id,
      parent_id: projectGroupNode.id,
      kind: "group",
      name: "Site Works",
      sort_order: 10,
    },
  ]);

  if (generalNodesError) throw generalNodesError;

  const { data: buildingGroupNode, error: buildingGroupError } = await supabase
    .from("estimate_nodes")
    .insert({
      estimate_id: estimate.id,
      parent_id: projectGroupNode.id,
      kind: "group",
      name: project.name,
      sort_order: 20,
    })
    .select("id")
    .single();

  if (buildingGroupError) throw buildingGroupError;

  const { data: levelGroupNode, error: levelGroupError } = await supabase
    .from("estimate_nodes")
    .insert({
      estimate_id: estimate.id,
      parent_id: buildingGroupNode.id,
      kind: "group",
      name: "Ground Floor",
      sort_order: 0,
    })
    .select("id")
    .single();

  if (levelGroupError) throw levelGroupError;

  const { data: areaNode, error: areaError } = await supabase
    .from("estimate_nodes")
    .insert({
      estimate_id: estimate.id,
      parent_id: levelGroupNode.id,
      kind: "area",
      name: "Project-wide",
      sort_order: 0,
    })
    .select("id")
    .single();

  if (areaError) throw areaError;

  return { estimate, areaNodeId: areaNode.id };
}

function revalidateProjectEstimatePaths(projectId: string) {
  revalidatePath(`/workshop/projects/${projectId}`);
  revalidatePath(`/workshop/projects/${projectId}/estimates`);
  revalidatePath(`/workshop/projects/${projectId}/charts`);
}

export async function fetchEstimateTree({ projectId, estimateId }: FetchEstimateTreeInput) {
  const { project, estimate, tree } = await getProjectEstimateTreeByEstimate(projectId, estimateId);
  if (!project || !estimate) throw new Error("Estimate not found in the current project.");
  return tree;
}

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
  const normalizedSheetCursor = shouldFetchSheetEvents ? normalizeHistoryCursor(sheetCursor, "Sheet activity") : null;
  const normalizedRowCursor = targetRowId ? normalizeHistoryCursor(rowCursor, "Row history") : null;
  const normalizedNodeCursor = targetNodeId ? normalizeHistoryCursor(nodeCursor, "Node activity") : null;
  const eventSelect = "id, event_type, event_source, created_at, actor_user_id, target_row_id, estimate_node_id, row_context, old_snapshot, new_snapshot, changed_fields, total_delta, payload, correlation_id";
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
  const { data, error } = await asEstimateActivityRetentionMetricsRpcClient(supabase).rpc("get_estimate_activity_retention_metrics", {
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
  const { data: referencedNodes, error: nodeError } = await supabase
    .from("estimate_nodes")
    .select("id, estimate_id, parent_id, kind")
    .in("id", referencedNodeIds);

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

    const nodeKind = normalizeEstimateTreeNodeKind(node.kind);
    if (!nodeKind) throw new Error("Unsupported estimate node kind.");

    let parentKind: EstimateTreeNodeKind | null = null;
    if (parentNode) {
      parentKind = normalizeEstimateTreeNodeKind(parentNode.kind);
      if (!parentKind) throw new Error("Unsupported estimate node kind.");
    }

    if (!canNestEstimateNodeKind(nodeKind, parentKind)) throw new Error(getEstimateNodeNestingError(nodeKind, parentKind));
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
  const { error: rpcError } = await asEstimateHistoryRpcClient(supabase).rpc("reorder_estimate_nodes_with_history", rpcPayload);
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
  const currentUser = await requireCurrentUserContext();
  const sheetCode = await generateNextEstimateSheetCode(supabase, project.id);

  const { estimate, areaNodeId } = await createEstimateWithDefaultTree({
    supabase,
    project,
    name: `${sheetCode} Estimate Sheet`,
    sheetCode,
    createdBy: currentUser.userId,
  });

  revalidateProjectEstimatePaths(project.id);
  return { estimateId: estimate.id, areaNodeId, sheetCode };
}

export async function duplicateEstimateSheet(input: DuplicateEstimateSheetInput) {
  const { project } = await getCurrentWorkspaceProject(input.projectId);
  if (!project) throw new Error("Project not found in the current workspace.");

  const supabase = await createSupabaseServerClient();
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

  const { data: sourceNodes, error: sourceNodesError } = await supabase
    .from("estimate_nodes")
    .select("id, kind, metadata, name, parent_id, sort_order")
    .eq("estimate_id", normalizedSourceEstimate.id)
    .order("sort_order", { ascending: true });

  if (sourceNodesError) throw sourceNodesError;

  const nodeIdBySourceId = new Map<string, string>();
  const pendingNodes = [...((sourceNodes ?? []) as DuplicateEstimateNodeRow[])];

  while (pendingNodes.length > 0) {
    const nextIndex = pendingNodes.findIndex((node) => node.parent_id === null || nodeIdBySourceId.has(node.parent_id));
    if (nextIndex === -1) throw new Error("Could not duplicate estimate tree because the source hierarchy is invalid.");

    const [node] = pendingNodes.splice(nextIndex, 1);
    const nextNodeId = randomUUID();
    nodeIdBySourceId.set(node.id, nextNodeId);

    const { error: insertNodeError } = await supabase.from("estimate_nodes").insert({
      id: nextNodeId,
      estimate_id: duplicatedEstimate.id,
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

  const duplicatedRows = ((sourceRows ?? []) as DuplicateEstimateRowItemRow[]).map((row) => {
    const nodeId = nodeIdBySourceId.get(row.node_id);
    if (!nodeId) throw new Error("Could not duplicate estimate rows because a source row node is missing.");

    return {
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
      source_snapshot: row.source_snapshot,
      supplier: row.supplier,
      supplier_id: row.supplier_id,
      unit: row.unit,
      unit_cost: row.unit_cost,
    } satisfies TablesInsert<"estimate_row_items">;
  });

  if (duplicatedRows.length > 0) {
    const { error: insertRowsError } = await supabase.from("estimate_row_items").insert(duplicatedRows);
    if (insertRowsError) throw insertRowsError;
  }

  revalidateProjectEstimatePaths(project.id);

  return {
    estimateId: duplicatedEstimate.id,
    firstNodeId: duplicatedRows.length > 0 ? duplicatedRows[0]?.node_id ?? null : [...nodeIdBySourceId.values()][0] ?? null,
    sheetCode,
  };
}

export async function previewBulkDeleteEstimateSheets(input: BulkDeleteEstimateSheetsInput): Promise<BulkActionPreviewResult> {
  if (!isUuid(input.projectId)) {
    return buildRejectedPreviewResult("estimate_sheet", [], [{
      code: "invalid_id",
      id: input.projectId,
      message: "Project id is invalid.",
    }]);
  }

  const { ids, issues } = normalizeBulkActionIds(input.estimateIds, { label: "estimate sheets", max: 100 });
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
      message: `Could not preview estimate sheet deletion: ${error.message}`,
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

  const { ids, issues } = normalizeBulkActionIds(input.estimateIds, { label: "estimate sheets", max: 100 });
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
        message: `Could not delete estimate sheets: ${error.message}`,
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
  const currentUser = await requireCurrentUserContext();
  const payload: TablesUpdate<"estimates"> = {};
  const estimatePatch: Record<string, unknown> = {};

  if (input.name !== undefined) {
    const name = normalizeEditableText(input.name, "Estimate sheet name");
    payload.name = name;
    estimatePatch.name = name;
  }
  if (input.sheetCode !== undefined) {
    const sheetCode = normalizeEditableText(input.sheetCode, "Sheet code");
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

  const { error } = await asEstimateHistoryRpcClient(supabase).rpc("update_estimate_details_with_history", {
    target_project_id: project.id,
    target_estimate_id: input.estimateId,
    estimate_patch: estimatePatch,
    acting_user_id: currentUser.userId,
    correlation_id: randomUUID(),
  });
  if (error) throw new Error(`Could not update estimate details: ${error.message}`);

  const estimate = await getEstimateRecordAfterMutation(supabase, input.estimateId, project.id);
  revalidateProjectEstimatePaths(project.id);
  return estimate;
}

export async function regenerateEstimateSheetCode(input: { projectId: string; estimateId: string }) {
  const { project } = await getCurrentWorkspaceProject(input.projectId);
  if (!project) throw new Error("Project not found in the current workspace.");

  const supabase = await createSupabaseServerClient();
  const currentUser = await requireCurrentUserContext();
  const sheetCode = await generateNextEstimateSheetCode(supabase, project.id, input.estimateId);
  const { error } = await asEstimateHistoryRpcClient(supabase).rpc("update_estimate_details_with_history", {
    target_project_id: project.id,
    target_estimate_id: input.estimateId,
    estimate_patch: { sheetCode },
    acting_user_id: currentUser.userId,
    correlation_id: randomUUID(),
  });
  if (error) throw new Error(`Could not regenerate estimate sheet code: ${error.message}`);

  const estimate = await getEstimateRecordAfterMutation(supabase, input.estimateId, project.id);
  revalidateProjectEstimatePaths(project.id);
  return estimate;
}

export async function createEstimateNode(projectId: string, estimateId: string, formData: FormData) {
  const { project } = await getCurrentWorkspaceProject(projectId);
  if (!project) throw new Error("Project not found in the current workspace.");

  const supabase = await createSupabaseServerClient();
  const currentUser = await requireCurrentUserContext();
  const name = readRequiredText(formData, "name");
  const kind = readEstimateNodeKind(formData);
  const parentId = readOptionalText(formData, "parentId");
  let parentKind: EstimateTreeNodeKind | null = null;

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
    parentKind = normalizeEstimateTreeNodeKind(parentNode.kind);
    if (!parentKind) throw new Error("Unsupported estimate node kind.");
  }

  if (!canNestEstimateNodeKind(kind, parentKind)) {
    throw new Error(getEstimateNodeNestingError(kind, parentKind));
  }

  const siblingQuery = supabase
    .from("estimate_nodes")
    .select("id, kind, sort_order")
    .eq("estimate_id", estimate.id)
    .order("sort_order", { ascending: true });
  const { data: siblings, error: siblingsError } = parentId
    ? await siblingQuery.eq("parent_id", parentId)
    : await siblingQuery.is("parent_id", null);

  if (siblingsError) throw siblingsError;

  const siblingRows = (siblings ?? []) as CreateEstimateNodeSiblingRow[];
  const maxSiblingSortOrder = siblingRows.reduce((max, sibling) => Math.max(max, sibling.sort_order), -1);
  const { data: nodeResult, error: rpcError } = await asEstimateHistoryRpcClient(supabase).rpc("create_estimate_node_with_history", {
    target_project_id: project.id,
    target_estimate_id: estimate.id,
    parent_node_id: parentId,
    node_kind: kind,
    node_name: name,
    initial_sort_order: maxSiblingSortOrder + 1,
    acting_user_id: currentUser.userId,
    correlation_id: randomUUID(),
  });
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

  revalidatePath(`/workshop/projects/${project.id}/estimates`);
  revalidatePath(`/workshop/projects/${project.id}/estimates/${estimate.id}`);
  redirect(`/workshop/projects/${project.id}/estimates/${nodeId}`);
}

export async function renameEstimateNode(
  projectId: string,
  estimateId: string,
  nodeId: string,
  formDataOrName: FormData | string,
): Promise<RenameEstimateNodeResult> {
  const name = readEstimateNodeName(formDataOrName);
  const { estimate, supabase, node } = await getValidatedEstimateNode(projectId, estimateId, nodeId);
  const currentUser = await requireCurrentUserContext();

  const { error } = await asEstimateHistoryRpcClient(supabase).rpc("rename_estimate_node_with_history", {
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
  const { error } = await asEstimateHistoryRpcClient(supabase).rpc("delete_estimate_node_with_history", {
    target_project_id: project.id,
    target_estimate_id: estimate.id,
    target_node_id: node.id,
    acting_user_id: currentUser.userId,
    correlation_id: randomUUID(),
  });

  if (error) throw new Error(`Could not delete estimate tree node: ${error.message}`);

  const { project: refreshedProject, estimate: refreshedEstimate, tree } = await getProjectEstimateTreeByEstimate(project.id, estimate.id);
  if (!refreshedProject || !refreshedEstimate) throw new Error("Estimate not found after deleting the tree node.");

  revalidatePath(`/workshop/projects/${project.id}/estimates`);
  revalidatePath(`/workshop/projects/${project.id}/estimates/${estimate.id}`);
  revalidatePath(`/workshop/projects/${project.id}/estimates/${node.id}`);

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
    const { error } = await asEstimateHistoryRpcClient(supabase).rpc("delete_estimate_node_with_history", {
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

  revalidatePath(`/workshop/projects/${project.id}/estimates`);
  revalidatePath(`/workshop/projects/${project.id}/estimates/${estimate.id}`);

  return {
    tree,
    deletedNodeIds: Array.from(deletedNodeIds),
    fallbackNodeId,
  };
}

export async function insertEstimateTemplateIntoEstimate({
  projectId,
  estimateId,
  targetParentNodeId,
  templateId,
}: InsertEstimateTemplateIntoEstimateInput): Promise<InsertEstimateTemplateIntoEstimateResult> {
  const { project } = await getCurrentWorkspaceProject(projectId);
  if (!project) throw new Error("Project not found in the current workspace.");

  const supabase = await createSupabaseServerClient();
  const currentUser = await requireCurrentUserContext();
  const { data: copyResult, error: copyError } = await asEstimateHistoryRpcClient(supabase).rpc("insert_estimate_template_into_estimate_with_history", {
    target_project_id: project.id,
    target_estimate_id: estimateId,
    target_parent_node_id: targetParentNodeId,
    source_template_id: templateId,
    acting_user_id: currentUser.userId,
    correlation_id: randomUUID(),
  });

  if (copyError) throw new Error(`Could not insert estimate template: ${copyError.message}`);

  const insertedRootNodeIds = readInsertedRootNodeIds(copyResult);
  const { project: refreshedProject, estimate: refreshedEstimate, tree } = await getProjectEstimateTreeByEstimate(project.id, estimateId);
  if (!refreshedProject || !refreshedEstimate) throw new Error("Estimate not found after inserting the template.");

  revalidatePath(`/workshop/projects/${project.id}/estimates`);
  revalidatePath(`/workshop/projects/${project.id}/estimates/${targetParentNodeId}`);

  return { tree, insertedRootNodeIds };
}

export async function insertEstimateRowItemFromLibrary({ projectId, estimateId, targetNodeId, rowId, libraryItem, mutationId }: InsertEstimateRowItemFromLibraryInput) {
  const { project } = await getCurrentWorkspaceProject(projectId);
  if (!project) throw new Error("Project not found in the current workspace.");

  const supabase = await createSupabaseServerClient();
  const currentUser = await requireCurrentUserContext();
  const { data: targetNode, error: nodeError } = await supabase
    .from("estimate_nodes")
    .select("id, estimate_id, kind, estimates!inner(project_id)")
    .eq("id", targetNodeId)
    .eq("estimate_id", estimateId)
    .eq("kind", "area")
    .eq("estimates.project_id", project.id)
    .maybeSingle();

  if (nodeError) throw nodeError;
  if (!targetNode) throw new Error("Target estimate area not found in the current project.");

  const { data: existingRows, error: rowsError } = await supabase
    .from("estimate_row_items")
    .select("sort_order")
    .eq("estimate_id", estimateId)
    .eq("node_id", targetNodeId)
    .order("sort_order", { ascending: false })
    .limit(1);

  if (rowsError) throw rowsError;

  const nextSortOrder = (existingRows?.[0]?.sort_order ?? -1) + 1;
  const quantity = libraryItem.quantity || 1;
  const sourceSnapshot = getSourceSnapshot(libraryItem);
  const sourceLibraryItemId = getSourceLibraryItemId(libraryItem);
  const persistedRowId = isUuid(rowId) ? rowId : randomUUID();

  const { error: insertError } = await asEstimateHistoryRpcClient(supabase).rpc("insert_estimate_row_item_with_history", {
    target_project_id: project.id,
    target_estimate_id: estimateId,
    target_node_id: targetNodeId,
    row_payload: {
    id: persistedRowId,
      sortOrder: nextSortOrder,
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

  revalidatePath(`/workshop/projects/${project.id}/estimates/${targetNodeId}`);
  revalidatePath(`/workshop/projects/${project.id}/estimates`);
}

export async function updateEstimateRowItem({ projectId, estimateId, rowId, quantity, contingencyPercentage, miscCost, mutationId, expectedRowRevision }: UpdateEstimateRowItemInput): Promise<UpdateEstimateRowItemResult> {
  const { project, supabase, row } = await getValidatedEstimateRow(projectId, estimateId, rowId);
  const currentUser = await requireCurrentUserContext();
  const rowPatch = {
    ...(quantity !== undefined ? { quantity } : {}),
    ...(contingencyPercentage !== undefined ? { contingencyPercentage } : {}),
    ...(miscCost !== undefined ? { miscCost } : {}),
    ...(row.source_library_item_id ? { linkState: "linked-overridden" } : {}),
  };

  const { data, error } = await asEstimateHistoryRpcClient(supabase).rpc("update_estimate_row_item_with_history", {
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
  revalidatePath(`/workshop/projects/${project.id}/estimates/${row.node_id}`);
  return updatedRow;
}

export async function replaceEstimateRowItemWithLibrary({ projectId, estimateId, rowId, libraryItem, mutationId, expectedRowRevision }: ReplaceEstimateRowItemInput) {
  const { project, supabase, row } = await getValidatedEstimateRow(projectId, estimateId, rowId);
  const currentUser = await requireCurrentUserContext();
  const quantity = libraryItem.quantity || 1;
  const sourceLibraryItemId = getSourceLibraryItemId(libraryItem);
  const { error } = await asEstimateHistoryRpcClient(supabase).rpc("replace_estimate_row_item_with_history", {
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

  revalidatePath(`/workshop/projects/${project.id}/estimates/${row.node_id}`);
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
  const trimmedReason = reason?.trim() || null;
  const { data, error } = await asEstimateHistoryRpcClient(supabase).rpc("unlink_estimate_row_item_from_library_with_history", {
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
  revalidatePath(`/workshop/projects/${project.id}/estimates/${row.node_id}`);
  return detachedRow;
}

export async function deleteEstimateRowItem({ projectId, estimateId, rowId, mutationId, expectedRowRevision }: DeleteEstimateRowItemInput) {
  const { project, supabase, row } = await getValidatedEstimateRow(projectId, estimateId, rowId);
  const currentUser = await requireCurrentUserContext();
  const { error } = await asEstimateHistoryRpcClient(supabase).rpc("delete_estimate_row_item_with_history", {
    target_project_id: project.id,
    target_estimate_id: estimateId,
    target_row_id: row.id,
    expected_row_revision: expectedRowRevision ?? row.row_revision,
    acting_user_id: currentUser.userId,
    correlation_id: getMutationCorrelationId(mutationId),
  });
  if (error) throw error;

  revalidatePath(`/workshop/projects/${project.id}/estimates/${row.node_id}`);
}
