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
