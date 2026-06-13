import { getNodeById, type EstimateTree } from "./estimate-tree";

export type MoveEstimateRowItemInput = {
  rowId: string;
  targetNodeId: string;
  newSortOrder: number;
};

export function moveEstimateRowItem(tree: EstimateTree, input: MoveEstimateRowItemInput): EstimateTree {
  const targetNode = getNodeById(tree.nodes, input.targetNodeId);
  if (!targetNode) throw new Error("Target estimate node not found.");
  // Unification: any node may receive rows. Previously this threw "Only Area Nodes may
  // receive estimate row items", which crashed the optimistic row-drag onMutate when a
  // row was dropped on a non-area node — a worse failure than a miscount. Pre-migration
  // the DB still rejects such writes server-side, so this only removes the client crash.

  return {
    ...tree,
    rows: tree.rows.map((row) =>
      row.id === input.rowId ? { ...row, nodeId: input.targetNodeId, sortOrder: input.newSortOrder } : row,
    ),
  };
}
