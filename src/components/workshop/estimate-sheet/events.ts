export const REQUEST_ESTIMATE_TREE_NODE_CREATE_EVENT = "archestimator:request-estimate-tree-node-create";
export const REQUEST_ESTIMATE_ROW_ITEM_MOVE_EVENT = "archestimator:request-estimate-row-item-move";
export const ESTIMATE_EXTERNAL_DROP_SCHEMA_VERSION = 1 as const;

export type EstimateExternalDropTarget = {
  projectId: string;
  estimateId: string;
  tabId: string | null;
  nodeId: string;
};

export type EstimateExternalDropAcknowledgement = {
  accepted: boolean;
  reason?: string;
};

export type EstimateExternalDropEnvelope<T> = {
  schemaVersion: typeof ESTIMATE_EXTERNAL_DROP_SCHEMA_VERSION;
  intentId: string;
  target: EstimateExternalDropTarget;
  payload: T;
  claim: () => ((acknowledgement: EstimateExternalDropAcknowledgement) => void) | null;
};

export function dispatchEstimateExternalDrop<T>(input: {
  eventName: string;
  intentId: string;
  target: EstimateExternalDropTarget;
  payload: T;
  onAcknowledged?: (acknowledgement: EstimateExternalDropAcknowledgement) => void;
}) {
  let claimed = false;
  let settled = false;
  const acknowledge = (acknowledgement: EstimateExternalDropAcknowledgement) => {
    if (settled) return;
    settled = true;
    input.onAcknowledged?.(acknowledgement);
  };
  const detail: EstimateExternalDropEnvelope<T> = {
    schemaVersion: ESTIMATE_EXTERNAL_DROP_SCHEMA_VERSION,
    intentId: input.intentId,
    target: input.target,
    payload: input.payload,
    claim: () => {
      if (claimed) return null;
      claimed = true;
      return acknowledge;
    },
  };
  window.dispatchEvent(new CustomEvent<EstimateExternalDropEnvelope<T>>(input.eventName, { detail, cancelable: true }));
  if (!claimed) acknowledge({ accepted: false, reason: "unhandled" });
  return claimed;
}

export function readEstimateExternalDropEnvelope<T>(
  value: unknown,
  expected: Pick<EstimateExternalDropTarget, "projectId" | "estimateId" | "tabId">,
) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const envelope = value as Partial<EstimateExternalDropEnvelope<T>>;
  const target = envelope.target;
  if (
    envelope.schemaVersion !== ESTIMATE_EXTERNAL_DROP_SCHEMA_VERSION
    || typeof envelope.intentId !== "string"
    || !envelope.intentId
    || !target
    || target.projectId !== expected.projectId
    || target.estimateId !== expected.estimateId
    || target.tabId !== expected.tabId
    || typeof target.nodeId !== "string"
    || !target.nodeId
    || typeof envelope.claim !== "function"
  ) return null;
  const acknowledge = envelope.claim();
  if (!acknowledge) return null;
  return {
    intentId: envelope.intentId,
    target,
    payload: envelope.payload as T,
    acknowledge,
  };
}

export type RequestEstimateTreeNodeCreateEventDetail = {
  kind: "group" | "area";
};

export type RequestEstimateRowItemMoveEventDetail = {
  rowItemId: string;
  targetNodeId: string;
  targetIndex: number;
  targetPlacement?: "index" | "end";
};

export function readRequestEstimateRowItemMoveEventDetail(value: unknown): RequestEstimateRowItemMoveEventDetail | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const record = value as Record<string, unknown>;
  if (typeof record.rowItemId !== "string" || record.rowItemId.length === 0) return null;
  if (typeof record.targetNodeId !== "string" || record.targetNodeId.length === 0) return null;
  if (typeof record.targetIndex !== "number" || !Number.isFinite(record.targetIndex) || record.targetIndex < 0) return null;
  if (
    record.targetPlacement !== undefined
    && record.targetPlacement !== "index"
    && record.targetPlacement !== "end"
  ) return null;
  return {
    rowItemId: record.rowItemId,
    targetNodeId: record.targetNodeId,
    targetIndex: Math.trunc(record.targetIndex),
    ...(record.targetPlacement ? { targetPlacement: record.targetPlacement } : {}),
  };
}
