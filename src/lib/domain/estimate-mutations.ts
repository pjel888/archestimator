import { canNodeReceiveRows, getNodeById, type EstimateTree } from "./estimate-tree";

export type MoveEstimateRowItemInput = {
  rowId: string;
  targetNodeId: string;
  newSortOrder: number;
};

export function moveEstimateRowItem(tree: EstimateTree, input: MoveEstimateRowItemInput): EstimateTree {
  const targetNode = getNodeById(tree.nodes, input.targetNodeId);
  if (!targetNode) throw new Error("Target estimate node not found.");
  if (!canNodeReceiveRows(targetNode.kind)) throw new Error("Only Area Nodes may receive estimate row items.");

  return {
    ...tree,
    rows: tree.rows.map((row) =>
      row.id === input.rowId ? { ...row, nodeId: input.targetNodeId, sortOrder: input.newSortOrder } : row,
    ),
  };
}
