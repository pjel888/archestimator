import type { EstimateTreeScope, EstimateTreeSubtreePayload } from "@/lib/estimates/estimate-tree-lazy";

export const ESTIMATE_TREE_REALTIME_CONTRACT_VERSION = 2;

export type EstimateTreeRealtimeEventType =
  | "estimate_tree.subtree_requested"
  | "estimate_tree.subtree_loaded"
  | "estimate_tree.branch_changed"
  | "estimate_tree.full_refetch_requested";

type EstimateTreeRealtimeBaseEvent = {
  schemaVersion: typeof ESTIMATE_TREE_REALTIME_CONTRACT_VERSION;
  type: EstimateTreeRealtimeEventType;
  scope: EstimateTreeScope;
  senderId: string;
  eventId: string;
  sentAt: string;
};

export type EstimateTreeSubtreeRequestedEvent = EstimateTreeRealtimeBaseEvent & {
  type: "estimate_tree.subtree_requested";
  nodeId: string;
  requestId: string;
};

export type EstimateTreeSubtreeLoadedEvent = EstimateTreeRealtimeBaseEvent & {
  type: "estimate_tree.subtree_loaded";
  payload: EstimateTreeSubtreePayload;
};

export type EstimateTreeBranchChangedEvent = EstimateTreeRealtimeBaseEvent & {
  type: "estimate_tree.branch_changed";
  nodeId: string;
  treeRevision?: number;
  mutationId?: string;
  mergeStrategy: "last-write-wins";
  payload?: EstimateTreeSubtreePayload;
};

export type EstimateTreeFullRefetchRequestedEvent = EstimateTreeRealtimeBaseEvent & {
  type: "estimate_tree.full_refetch_requested";
  reason: "unknown_branch" | "limit_exceeded" | "mutation_conflict" | "schema_mismatch";
};

export type EstimateTreeRealtimeEvent =
  | EstimateTreeSubtreeRequestedEvent
  | EstimateTreeSubtreeLoadedEvent
  | EstimateTreeBranchChangedEvent
  | EstimateTreeFullRefetchRequestedEvent;

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === "object" && !Array.isArray(value));
}

function hasBaseContractFields(value: Record<string, unknown>): value is EstimateTreeRealtimeBaseEvent {
  const scope = value.scope;
  return (
    value.schemaVersion === ESTIMATE_TREE_REALTIME_CONTRACT_VERSION &&
    typeof value.type === "string" &&
    isRecord(scope) &&
    typeof scope.estimateId === "string" &&
    (scope.tabId === undefined || scope.tabId === null || typeof scope.tabId === "string") &&
    typeof value.senderId === "string" &&
    typeof value.eventId === "string" &&
    typeof value.sentAt === "string"
  );
}

export function isEstimateTreeRealtimeEvent(value: unknown): value is EstimateTreeRealtimeEvent {
  if (!isRecord(value) || !hasBaseContractFields(value)) return false;
  const event = value as EstimateTreeRealtimeBaseEvent & Record<string, unknown>;

  switch (event.type) {
    case "estimate_tree.subtree_requested":
      return typeof event.nodeId === "string" && typeof event.requestId === "string";
    case "estimate_tree.subtree_loaded": {
      const payload = event.payload;
      return isRecord(payload) && payload.schemaVersion === 1 && typeof payload.rootNodeId === "string";
    }
    case "estimate_tree.branch_changed":
      return typeof event.nodeId === "string" && event.mergeStrategy === "last-write-wins";
    case "estimate_tree.full_refetch_requested":
      return (
        event.reason === "unknown_branch" ||
        event.reason === "limit_exceeded" ||
        event.reason === "mutation_conflict" ||
        event.reason === "schema_mismatch"
      );
    default:
      return false;
  }
}

export const ESTIMATE_CONTRIBUTION_REALTIME_CONTRACT_VERSION = 1;
export const ESTIMATE_CONTRIBUTION_BROADCAST_EVENT = "contribution-update";

const MAX_CONTRIBUTION_CHANGED_IDS = 250;
const MAX_CONTRIBUTION_ID_LENGTH = 200;

export type EstimateContributionRealtimeScope = {
  estimateId: string;
  tabId: string;
  contributionScopeId: string;
};

type EstimateContributionChangedIds = {
  rowIds: string[];
  groupIds: string[];
  edgeIds: string[];
};

export type EstimateContributionRealtimeEvent = {
  schemaVersion: typeof ESTIMATE_CONTRIBUTION_REALTIME_CONTRACT_VERSION;
  type: "estimate_contribution.changed";
  scope: EstimateContributionRealtimeScope;
  scopeRevision: number;
  changed: EstimateContributionChangedIds;
  mutationId: string;
  sentAt: string;
};

export type EstimateContributionBroadcastReceipt = {
  delivery: "server_mutation" | "outbox_delivery";
  changed: boolean;
  scopeRevision: number;
  mutationId: string;
  changedRowIds?: readonly string[];
  changedGroupIds?: readonly string[];
  changedEdgeIds?: readonly string[];
};

export type EstimateContributionRealtimeDecision =
  | { action: "apply"; event: EstimateContributionRealtimeEvent }
  | {
      action: "refetch";
      reason: "revision_gap" | "schema_mismatch";
      event?: EstimateContributionRealtimeEvent;
    }
  | { action: "ignore"; reason: "duplicate" | "cross_scope" | "unrelated" };

function isBoundedIdentifier(value: unknown): value is string {
  return typeof value === "string" && value.length > 0 && value.length <= MAX_CONTRIBUTION_ID_LENGTH;
}

function isBoundedIdentifierList(value: unknown): value is string[] {
  return Array.isArray(value)
    && value.length <= MAX_CONTRIBUTION_CHANGED_IDS
    && value.every(isBoundedIdentifier)
    && new Set(value).size === value.length;
}

function hasOnlyKeys(value: Record<string, unknown>, allowedKeys: readonly string[]) {
  return Object.keys(value).every((key) => allowedKeys.includes(key));
}

function isEstimateContributionScope(value: unknown): value is EstimateContributionRealtimeScope {
  return isRecord(value)
    && hasOnlyKeys(value, ["estimateId", "tabId", "contributionScopeId"])
    && isBoundedIdentifier(value.estimateId)
    && isBoundedIdentifier(value.tabId)
    && isBoundedIdentifier(value.contributionScopeId);
}

function matchesEstimateContributionScope(
  value: unknown,
  expectedScope: EstimateContributionRealtimeScope,
) {
  return isEstimateContributionScope(value)
    && value.estimateId === expectedScope.estimateId
    && value.tabId === expectedScope.tabId
    && value.contributionScopeId === expectedScope.contributionScopeId;
}

function hasValidRealtimeEventEnvelope(value: Record<string, unknown>) {
  return value.schemaVersion === ESTIMATE_CONTRIBUTION_REALTIME_CONTRACT_VERSION
    && hasOnlyKeys(value, ["schemaVersion", "type", "scope", "scopeRevision", "changed", "mutationId", "sentAt"])
    && value.type === "estimate_contribution.changed"
    && isEstimateContributionScope(value.scope)
    && Number.isSafeInteger(value.scopeRevision)
    && (value.scopeRevision as number) >= 1
    && isBoundedIdentifier(value.mutationId)
    && typeof value.sentAt === "string"
    && Number.isFinite(Date.parse(value.sentAt));
}

function hasValidRealtimeChangedIdentifiers(value: unknown) {
  return isRecord(value)
    && hasOnlyKeys(value, ["rowIds", "groupIds", "edgeIds"])
    && isBoundedIdentifierList(value.rowIds)
    && isBoundedIdentifierList(value.groupIds)
    && isBoundedIdentifierList(value.edgeIds)
    && value.rowIds.length + value.groupIds.length + value.edgeIds.length > 0;
}

export function isEstimateContributionRealtimeEvent(
  value: unknown,
  expectedScope?: EstimateContributionRealtimeScope,
): value is EstimateContributionRealtimeEvent {
  if (!isRecord(value) || !hasValidRealtimeEventEnvelope(value)) return false;
  if (expectedScope && !matchesEstimateContributionScope(value.scope, expectedScope)) return false;
  return hasValidRealtimeChangedIdentifiers(value.changed);
}

export function createEstimateContributionRealtimeEvent(
  scope: EstimateContributionRealtimeScope,
  receipt: EstimateContributionBroadcastReceipt,
  sentAt = new Date().toISOString(),
): EstimateContributionRealtimeEvent | null {
  if (!receipt.changed || (receipt.delivery !== "server_mutation" && receipt.delivery !== "outbox_delivery")) return null;
  const event: EstimateContributionRealtimeEvent = {
    schemaVersion: ESTIMATE_CONTRIBUTION_REALTIME_CONTRACT_VERSION,
    type: "estimate_contribution.changed",
    scope,
    scopeRevision: receipt.scopeRevision,
    changed: {
      rowIds: [...(receipt.changedRowIds ?? [])],
      groupIds: [...(receipt.changedGroupIds ?? [])],
      edgeIds: [...(receipt.changedEdgeIds ?? [])],
    },
    mutationId: receipt.mutationId,
    sentAt,
  };
  return isEstimateContributionRealtimeEvent(event, scope) ? event : null;
}

function receiptRowIdentifiers(value: Record<string, unknown>) {
  if (value.kind === "alternative_group_configured") return value.rowItemIds;
  if (value.kind === "optional_row_marked" || value.kind === "optional_row_unmarked") return [value.rowItemId];
  if (value.kind === "alternative_group_removed") return value.removedRowItemIds;
  if (value.kind === "accessory_edge_created" || value.kind === "accessory_edge_updated") {
    return [value.parentRowItemId, value.childRowItemId];
  }
  return value.changedRowItemIds;
}

function receiptGroupIdentifiers(value: Record<string, unknown>) {
  return value.kind === "alternative_group_configured" || value.kind === "alternative_group_removed"
    ? [value.groupId]
    : value.changedGroupIds;
}

function receiptEdgeIdentifiers(value: Record<string, unknown>) {
  return value.kind === "accessory_edge_created"
    || value.kind === "accessory_edge_updated"
    || value.kind === "accessory_edge_deleted"
    ? [value.edgeId]
    : value.changedEdgeIds;
}

function receiptIdentifiers(value: Record<string, unknown>) {
  return {
    rows: receiptRowIdentifiers(value),
    groups: receiptGroupIdentifiers(value),
    edges: receiptEdgeIdentifiers(value),
  };
}

function identifiersAreCommitted(actual: string[], committed: unknown) {
  if (actual.length === 0 && committed === undefined) return true;
  return Array.isArray(committed)
    && committed.every(isBoundedIdentifier)
    && actual.every((identifier) => committed.includes(identifier));
}

export function matchesCommittedEstimateContributionReceipt(
  event: EstimateContributionRealtimeEvent,
  result: unknown,
  currentScopeRevision: number,
) {
  if (!isRecord(result) || result.changed !== true) return false;
  if (result.contributionScopeId !== event.scope.contributionScopeId) return false;
  if (result.contributionRevision !== event.scopeRevision) return false;
  if (!Number.isSafeInteger(currentScopeRevision) || currentScopeRevision < event.scopeRevision) return false;
  const committed = receiptIdentifiers(result);
  return identifiersAreCommitted(event.changed.rowIds, committed.rows)
    && identifiersAreCommitted(event.changed.groupIds, committed.groups)
    && identifiersAreCommitted(event.changed.edgeIds, committed.edges);
}

export function decideEstimateContributionRealtimeEvent({
  payload,
  expectedScope,
  currentRevision,
  seenMutationIds,
}: {
  payload: unknown;
  expectedScope: EstimateContributionRealtimeScope;
  currentRevision: number;
  seenMutationIds?: ReadonlySet<string>;
}): EstimateContributionRealtimeDecision {
  if (!isRecord(payload) || payload.type !== "estimate_contribution.changed") {
    return { action: "ignore", reason: "unrelated" };
  }
  if (!matchesEstimateContributionScope(payload.scope, expectedScope)) {
    return { action: "ignore", reason: "cross_scope" };
  }
  if (!isEstimateContributionRealtimeEvent(payload, expectedScope)) {
    return { action: "refetch", reason: "schema_mismatch" };
  }
  if (seenMutationIds?.has(payload.mutationId) || payload.scopeRevision <= currentRevision) {
    return { action: "ignore", reason: "duplicate" };
  }
  if (payload.scopeRevision === currentRevision + 1) {
    return { action: "apply", event: payload };
  }
  return { action: "refetch", reason: "revision_gap", event: payload };
}
