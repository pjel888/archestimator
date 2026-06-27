export const REQUEST_ESTIMATE_TREE_NODE_CREATE_EVENT = "archestimator:request-estimate-tree-node-create";
export const REQUEST_ESTIMATE_ROW_ITEM_MOVE_EVENT = "archestimator:request-estimate-row-item-move";

export type RequestEstimateTreeNodeCreateEventDetail = {
  kind: "group" | "area";
};

export type RequestEstimateRowItemMoveEventDetail = {
  rowItemId: string;
  targetNodeId: string;
  targetIndex: number;
};

export function readRequestEstimateRowItemMoveEventDetail(value: unknown): RequestEstimateRowItemMoveEventDetail | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const record = value as Record<string, unknown>;
  if (typeof record.rowItemId !== "string" || record.rowItemId.length === 0) return null;
  if (typeof record.targetNodeId !== "string" || record.targetNodeId.length === 0) return null;
  if (typeof record.targetIndex !== "number" || !Number.isFinite(record.targetIndex) || record.targetIndex < 0) return null;
  return {
    rowItemId: record.rowItemId,
    targetNodeId: record.targetNodeId,
    targetIndex: Math.trunc(record.targetIndex),
  };
}
