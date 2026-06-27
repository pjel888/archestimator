import type { EstimateRowItem, EstimateTreeNode } from "@/lib/estimates/types";

export type MoveEstimateRowItemInTreeInput = {
  tree: EstimateTreeNode[];
  rowItemId: string;
  sourceNodeId: string;
  targetNodeId: string;
  targetIndex: number;
};

export type EstimateRowItemMoveUpdate = {
  rowId: string;
  nodeId: string;
  sortOrder: number;
  expectedRowRevision: number;
};

export type EstimateRowItemMoveResultUpdate = {
  rowId: string;
  nodeId: string;
  sortOrder: number;
  rowRevision?: number;
};

export type MoveEstimateRowItemInTreeResult = {
  status: "moved" | "noop" | "not-found" | "invalid-target";
  tree: EstimateTreeNode[];
  movedRow?: EstimateRowItem;
  sourceNodeId?: string;
  targetNodeId?: string;
  affectedRowUpdates: EstimateRowItemMoveUpdate[];
};

type LocatedNode = {
  node: EstimateTreeNode;
};

type RowLocation = {
  nodeId: string;
  sortOrder: number;
};

function emptyResult(status: MoveEstimateRowItemInTreeResult["status"], tree: EstimateTreeNode[]): MoveEstimateRowItemInTreeResult {
  return { status, tree, affectedRowUpdates: [] };
}

function isOptimisticId(id: string) {
  return id.startsWith("optimistic-") || id.startsWith("temp-");
}

function findNode(nodes: EstimateTreeNode[], nodeId: string): LocatedNode | null {
  for (const node of nodes) {
    if (node.id === nodeId) return { node };
    const child = findNode(node.children ?? [], nodeId);
    if (child) return child;
  }
  return null;
}

function boundedIndex(index: number, length: number) {
  if (!Number.isFinite(index)) return null;
  return Math.max(0, Math.min(Math.trunc(index), length));
}

function rowRevision(row: EstimateRowItem) {
  return typeof row.rowRevision === "number" && Number.isFinite(row.rowRevision) ? row.rowRevision : 1;
}

function storedSortOrder(row: EstimateRowItem, fallback: number) {
  return typeof row.sortOrder === "number" && Number.isFinite(row.sortOrder) ? row.sortOrder : fallback;
}

function withSortOrder(row: EstimateRowItem, sortOrder: number): EstimateRowItem {
  return row.sortOrder === sortOrder ? row : { ...row, sortOrder };
}

function originalLocationMap(nodeId: string, rows: EstimateRowItem[], existing = new Map<string, RowLocation>()) {
  rows.forEach((row, index) => {
    existing.set(row.id, { nodeId, sortOrder: storedSortOrder(row, index) });
  });
  return existing;
}

function buildAffectedUpdates({
  orderedNodeIds,
  finalRowsByNode,
  originalLocations,
}: {
  orderedNodeIds: string[];
  finalRowsByNode: Map<string, EstimateRowItem[]>;
  originalLocations: Map<string, RowLocation>;
}) {
  const updates: EstimateRowItemMoveUpdate[] = [];

  for (const nodeId of orderedNodeIds) {
    const rows = finalRowsByNode.get(nodeId) ?? [];
    rows.forEach((row, sortOrder) => {
      const original = originalLocations.get(row.id);
      if (original?.nodeId === nodeId && original.sortOrder === sortOrder) return;
      updates.push({
        rowId: row.id,
        nodeId,
        sortOrder,
        expectedRowRevision: rowRevision(row),
      });
    });
  }

  return updates;
}

function replaceNodeRows(nodes: EstimateTreeNode[], replacements: Map<string, EstimateRowItem[]>): EstimateTreeNode[] {
  let didChange = false;

  const nextNodes = nodes.map((node) => {
    const replacementRows = replacements.get(node.id);
    let nextChildren = node.children;

    if (node.children?.length) {
      const replacedChildren = replaceNodeRows(node.children, replacements);
      if (replacedChildren !== node.children) nextChildren = replacedChildren;
    }

    if (replacementRows === undefined && nextChildren === node.children) return node;
    didChange = true;
    return {
      ...node,
      estimateRowItems: replacementRows ?? node.estimateRowItems,
      children: nextChildren,
    };
  });

  return didChange ? nextNodes : nodes;
}

function stripMoveResultRows(
  nodes: EstimateTreeNode[],
  updateByRowId: Map<string, EstimateRowItemMoveResultUpdate>,
  rowById: Map<string, EstimateRowItem>,
): EstimateTreeNode[] {
  let didChange = false;
  const nextNodes = nodes.map((node) => {
    let nextChildren = node.children;
    if (node.children?.length) {
      const strippedChildren = stripMoveResultRows(node.children, updateByRowId, rowById);
      if (strippedChildren !== node.children) nextChildren = strippedChildren;
    }

    const currentRows = node.estimateRowItems ?? [];
    const remainingRows = currentRows.filter((row) => {
      const update = updateByRowId.get(row.id);
      if (!update) return true;
      rowById.set(row.id, {
        ...row,
        ...(typeof update.rowRevision === "number" ? { rowRevision: update.rowRevision } : {}),
        sortOrder: update.sortOrder,
      });
      return false;
    });

    if (remainingRows.length === currentRows.length && nextChildren === node.children) return node;
    didChange = true;
    return {
      ...node,
      estimateRowItems: remainingRows,
      children: nextChildren,
    };
  });

  return didChange ? nextNodes : nodes;
}

function insertMoveResultRows(
  nodes: EstimateTreeNode[],
  updatesByNodeId: Map<string, EstimateRowItemMoveResultUpdate[]>,
  rowById: Map<string, EstimateRowItem>,
): EstimateTreeNode[] {
  let didChange = false;
  const nextNodes = nodes.map((node) => {
    let nextChildren = node.children;
    if (node.children?.length) {
      const insertedChildren = insertMoveResultRows(node.children, updatesByNodeId, rowById);
      if (insertedChildren !== node.children) nextChildren = insertedChildren;
    }

    const nodeUpdates = updatesByNodeId.get(node.id) ?? [];
    const rowsToInsert = nodeUpdates
      .map((update) => ({ update, row: rowById.get(update.rowId) }))
      .filter((entry): entry is { update: EstimateRowItemMoveResultUpdate; row: EstimateRowItem } => Boolean(entry.row));

    if (rowsToInsert.length === 0 && nextChildren === node.children) return node;

    const existingRows = node.estimateRowItems ?? [];
    const orderedRows = [
      ...existingRows.map((row, index) => ({ row, sortOrder: index, tieBreaker: index })),
      ...rowsToInsert.map(({ row, update }, index) => ({ row, sortOrder: update.sortOrder, tieBreaker: -rowsToInsert.length + index })),
    ]
      .sort((left, right) => left.sortOrder - right.sortOrder || left.tieBreaker - right.tieBreaker)
      .map(({ row }) => row);

    didChange = true;
    return {
      ...node,
      estimateRowItems: orderedRows,
      children: nextChildren,
    };
  });

  return didChange ? nextNodes : nodes;
}

export function applyEstimateRowItemMoveResultToTree(
  tree: EstimateTreeNode[],
  updates: EstimateRowItemMoveResultUpdate[],
): EstimateTreeNode[] {
  if (updates.length === 0) return tree;

  const updateByRowId = new Map<string, EstimateRowItemMoveResultUpdate>();
  const updatesByNodeId = new Map<string, EstimateRowItemMoveResultUpdate[]>();
  for (const update of updates) {
    if (isOptimisticId(update.rowId) || isOptimisticId(update.nodeId)) continue;
    updateByRowId.set(update.rowId, update);
    const nodeUpdates = updatesByNodeId.get(update.nodeId) ?? [];
    nodeUpdates.push(update);
    updatesByNodeId.set(update.nodeId, nodeUpdates);
  }

  if (updateByRowId.size === 0) return tree;

  const rowById = new Map<string, EstimateRowItem>();
  const strippedTree = stripMoveResultRows(tree, updateByRowId, rowById);
  if (rowById.size === 0) return tree;

  return insertMoveResultRows(strippedTree, updatesByNodeId, rowById);
}

export function moveEstimateRowItemInTree(input: MoveEstimateRowItemInTreeInput): MoveEstimateRowItemInTreeResult {
  const { tree, rowItemId, sourceNodeId, targetNodeId } = input;

  if (isOptimisticId(rowItemId) || isOptimisticId(sourceNodeId) || isOptimisticId(targetNodeId)) {
    return emptyResult("invalid-target", tree);
  }

  const source = findNode(tree, sourceNodeId);
  if (!source) return emptyResult("not-found", tree);

  const target = findNode(tree, targetNodeId);
  if (!target) return emptyResult("invalid-target", tree);

  const sourceRows = source.node.estimateRowItems ?? [];
  const sourceIndex = sourceRows.findIndex((row) => row.id === rowItemId);
  if (sourceIndex === -1) return emptyResult("not-found", tree);

  const movedRow = sourceRows[sourceIndex];

  if (sourceNodeId === targetNodeId) {
    const targetIndex = boundedIndex(input.targetIndex, sourceRows.length);
    if (targetIndex === null) return emptyResult("invalid-target", tree);
    const adjustedTargetIndex = sourceIndex < targetIndex ? targetIndex - 1 : targetIndex;
    if (sourceIndex === adjustedTargetIndex) {
      return { ...emptyResult("noop", tree), movedRow, sourceNodeId, targetNodeId };
    }

    const nextRows = sourceRows.slice();
    nextRows.splice(sourceIndex, 1);
    nextRows.splice(adjustedTargetIndex, 0, movedRow);
    const normalizedRows = nextRows.map(withSortOrder);

    const originalLocations = originalLocationMap(sourceNodeId, sourceRows);
    const finalRowsByNode = new Map([[sourceNodeId, normalizedRows]]);
    const affectedRowUpdates = buildAffectedUpdates({
      orderedNodeIds: [sourceNodeId],
      finalRowsByNode,
      originalLocations,
    });

    return {
      status: "moved",
      tree: replaceNodeRows(tree, finalRowsByNode),
      movedRow,
      sourceNodeId,
      targetNodeId,
      affectedRowUpdates,
    };
  }

  const targetRows = target.node.estimateRowItems ?? [];
  const targetIndex = boundedIndex(input.targetIndex, targetRows.length);
  if (targetIndex === null) return emptyResult("invalid-target", tree);

  const nextSourceRows = sourceRows.filter((row) => row.id !== rowItemId);
  const nextTargetRows = targetRows.slice();
  nextTargetRows.splice(targetIndex, 0, movedRow);
  const normalizedSourceRows = nextSourceRows.map(withSortOrder);
  const normalizedTargetRows = nextTargetRows.map(withSortOrder);

  const originalLocations = originalLocationMap(targetNodeId, targetRows, originalLocationMap(sourceNodeId, sourceRows));
  const finalRowsByNode = new Map([
    [sourceNodeId, normalizedSourceRows],
    [targetNodeId, normalizedTargetRows],
  ]);
  const affectedRowUpdates = buildAffectedUpdates({
    orderedNodeIds: [sourceNodeId, targetNodeId],
    finalRowsByNode,
    originalLocations,
  });

  return {
    status: "moved",
    tree: replaceNodeRows(tree, finalRowsByNode),
    movedRow,
    sourceNodeId,
    targetNodeId,
    affectedRowUpdates,
  };
}
