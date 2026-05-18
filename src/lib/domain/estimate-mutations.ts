import { canNodeReceiveRows, getNodeById, isDescendantNode, type EstimateTree } from "./estimate-tree";

export type MoveEstimateNodeInput = {
  nodeId: string;
  newParentId: string | null;
  newSortOrder: number;
};

export type MoveEstimateRowItemInput = {
  rowId: string;
  targetNodeId: string;
  newSortOrder: number;
};

export function moveEstimateNode(tree: EstimateTree, input: MoveEstimateNodeInput): EstimateTree {
  const node = getNodeById(tree.nodes, input.nodeId);
  if (!node) throw new Error("Estimate node not found.");
  if (input.newParentId === input.nodeId) throw new Error("Cannot move a node into itself.");
  if (input.newParentId && isDescendantNode(tree.nodes, input.newParentId, input.nodeId)) {
    throw new Error("Cannot move a node into one of its descendants.");
  }

  return {
    ...tree,
    nodes: tree.nodes.map((candidate) =>
      candidate.id === input.nodeId
        ? { ...candidate, parentId: input.newParentId, sortOrder: input.newSortOrder }
        : candidate,
    ),
  };
}

export function moveEstimateRowItem(tree: EstimateTree, input: MoveEstimateRowItemInput): EstimateTree {
  const targetNode = getNodeById(tree.nodes, input.targetNodeId);
  if (!targetNode) throw new Error("Target estimate node not found.");
  if (!canNodeReceiveRows(targetNode.kind)) throw new Error("Only Area Groups may receive estimate row items.");

  return {
    ...tree,
    rows: tree.rows.map((row) =>
      row.id === input.rowId ? { ...row, nodeId: input.targetNodeId, sortOrder: input.newSortOrder } : row,
    ),
  };
}
