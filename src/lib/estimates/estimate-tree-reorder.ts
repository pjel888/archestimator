import type { EstimateTreeNode } from "@/lib/estimates/types";

export const ESTIMATE_TREE_SORT_ORDER_STEP = 10;
export const ESTIMATE_TREE_SORT_ORDER_MIN_GAP = 0.0001;

export type EstimateTreeDropPosition = "before" | "after" | "inside";

export type EstimateTreeDropTarget = {
  targetNodeId: string;
  position: EstimateTreeDropPosition;
};

export type EstimateNodeReorderUpdate = {
  id: string;
  parentId: string | null;
  sortOrder: number;
};

export type EstimateNodeReorderPlan = {
  draggedNodeId: string;
  sourceParentId: string | null;
  targetParentId: string | null;
  targetIndex: number;
  nextNodes: EstimateTreeNode[];
  affectedParentIds: Array<string | null>;
  updates: EstimateNodeReorderUpdate[];
};

export type ReorderFailureCode =
  | "unknown-dragged-node"
  | "unknown-target-parent"
  | "multi-drag-unsupported"
  | "self-drop"
  | "cycle"
  | "no-op";

export type EstimateNodeReorderResult =
  | { ok: true; plan: EstimateNodeReorderPlan }
  | { ok: false; code: ReorderFailureCode; message: string };

export type EstimateTreeDropValidationResult =
  | {
      ok: true;
      draggedNodeId: string;
      targetParentId: string | null;
      targetIndex: number;
    }
  | { ok: false; code: ReorderFailureCode; message: string };

type NodeLocation = {
  node: EstimateTreeNode;
  parentId: string | null;
  index: number;
};

type RemoveNodeResult = {
  removed: EstimateTreeNode | null;
  nodes: EstimateTreeNode[];
};

function fail(code: ReorderFailureCode, message: string): { ok: false; code: ReorderFailureCode; message: string } {
  return { ok: false, code, message };
}

function cloneNode(node: EstimateTreeNode): EstimateTreeNode {
  return {
    ...node,
    children: node.children?.map(cloneNode),
    estimateRowItems: node.estimateRowItems ? [...node.estimateRowItems] : node.estimateRowItems,
  };
}

function findNodeLocation(nodes: EstimateTreeNode[], id: string, parentId: string | null = null): NodeLocation | null {
  for (let index = 0; index < nodes.length; index += 1) {
    const node = nodes[index];
    if (node.id === id) return { node, parentId, index };
    const childLocation = findNodeLocation(node.children ?? [], id, node.id);
    if (childLocation) return childLocation;
  }
  return null;
}

function getChildCount(nodes: EstimateTreeNode[], parentId: string | null): number | null {
  if (parentId === null) return nodes.length;
  const parent = findNodeLocation(nodes, parentId)?.node;
  if (!parent) return null;
  return parent.children?.length ?? 0;
}

function containsNodeId(node: EstimateTreeNode, id: string): boolean {
  if (node.id === id) return true;
  return (node.children ?? []).some((child) => containsNodeId(child, id));
}

function validateReorderPlacement({
  nodes,
  draggedNodeId,
  targetParentId,
  targetIndex,
}: {
  nodes: EstimateTreeNode[];
  draggedNodeId: string;
  targetParentId: string | null;
  targetIndex: number;
}): EstimateTreeDropValidationResult {
  const sourceLocation = findNodeLocation(nodes, draggedNodeId);
  if (!sourceLocation) return fail("unknown-dragged-node", "Dragged estimate tree node was not found.");
  if (targetParentId === draggedNodeId) return fail("self-drop", "An estimate tree node cannot be dropped inside itself.");

  const targetChildCount = getChildCount(nodes, targetParentId);
  if (targetChildCount === null) return fail("unknown-target-parent", "Drop target estimate tree node was not found.");

  if (targetParentId && containsNodeId(sourceLocation.node, targetParentId)) {
    return fail("cycle", "An estimate tree node cannot be dropped inside one of its descendants.");
  }

  const boundedTargetIndex = Math.max(0, Math.min(targetIndex, targetChildCount));
  const adjustedTargetIndex = sourceLocation.parentId === targetParentId && sourceLocation.index < boundedTargetIndex
    ? boundedTargetIndex - 1
    : boundedTargetIndex;

  if (sourceLocation.parentId === targetParentId && sourceLocation.index === adjustedTargetIndex) {
    return fail("no-op", "Estimate tree node is already in that position.");
  }

  return {
    ok: true,
    draggedNodeId,
    targetParentId,
    targetIndex: boundedTargetIndex,
  };
}

function removeNode(nodes: EstimateTreeNode[], id: string): RemoveNodeResult {
  const nextNodes: EstimateTreeNode[] = [];
  let removed: EstimateTreeNode | null = null;

  for (const node of nodes) {
    if (node.id === id) {
      removed = cloneNode(node);
      continue;
    }

    if (node.children?.length) {
      const childResult = removeNode(node.children, id);
      if (childResult.removed) {
        removed = childResult.removed;
        nextNodes.push({ ...cloneNode(node), children: childResult.nodes });
        continue;
      }
    }

    nextNodes.push(cloneNode(node));
  }

  return { removed, nodes: nextNodes };
}

// Drops land exactly where the user released them: the splice index is the
// final sibling position. No kind-based re-sorting — a drop that visually
// lands above a group must persist above that group, or the tree "snaps"
// after settle.
function insertNode(nodes: EstimateTreeNode[], parentId: string | null, rawIndex: number, nodeToInsert: EstimateTreeNode): EstimateTreeNode[] {
  const targetIndex = Math.max(0, rawIndex);
  if (parentId === null) {
    const nextNodes = nodes.map(cloneNode);
    nextNodes.splice(Math.min(targetIndex, nextNodes.length), 0, cloneNode(nodeToInsert));
    return nextNodes;
  }

  return nodes.map((node) => {
    const cloned = cloneNode(node);
    if (cloned.id === parentId) {
      const nextChildren = cloned.children?.map(cloneNode) ?? [];
      nextChildren.splice(Math.min(targetIndex, nextChildren.length), 0, cloneNode(nodeToInsert));
      return { ...cloned, children: nextChildren };
    }
    if (cloned.children?.length) return { ...cloned, children: insertNode(cloned.children, parentId, targetIndex, nodeToInsert) };
    return cloned;
  });
}

function getChildren(nodes: EstimateTreeNode[], parentId: string | null): EstimateTreeNode[] {
  if (parentId === null) return nodes;
  return findNodeLocation(nodes, parentId)?.node.children ?? [];
}

function uniqueParentIds(parentIds: Array<string | null>) {
  const seen = new Set<string>();
  const unique: Array<string | null> = [];
  for (const parentId of parentIds) {
    const key = parentId ?? "__estimate_tree_root__";
    if (seen.has(key)) continue;
    seen.add(key);
    unique.push(parentId);
  }
  return unique;
}

function buildSiblingUpdates(nodes: EstimateTreeNode[], parentIds: Array<string | null>): EstimateNodeReorderUpdate[] {
  return parentIds.flatMap((parentId) =>
    getChildren(nodes, parentId).map((node, index) => ({
      id: node.id,
      parentId,
      sortOrder: (index + 1) * ESTIMATE_TREE_SORT_ORDER_STEP,
    })),
  );
}

function getPersistedSortOrder(node: EstimateTreeNode | undefined): number | null {
  const value = node?.sortOrder;
  return typeof value === "number" && Number.isFinite(value) && value >= 0 ? value : null;
}

function getSparseMovedNodeSortOrder(siblings: EstimateTreeNode[], movedIndex: number): number | null {
  const previousSibling = siblings[movedIndex - 1];
  const nextSibling = siblings[movedIndex + 1];
  const previousSortOrder = getPersistedSortOrder(previousSibling);
  const nextSortOrder = getPersistedSortOrder(nextSibling);

  if (previousSibling && previousSortOrder === null) return null;
  if (nextSibling && nextSortOrder === null) return null;
  if (!previousSibling && !nextSibling) return ESTIMATE_TREE_SORT_ORDER_STEP;
  if (!previousSibling) {
    if (nextSortOrder === null || nextSortOrder <= ESTIMATE_TREE_SORT_ORDER_MIN_GAP) return null;
    return nextSortOrder / 2;
  }
  if (previousSortOrder === null) return null;
  if (!nextSibling) return previousSortOrder + ESTIMATE_TREE_SORT_ORDER_STEP;
  if (nextSortOrder === null) return null;
  if (nextSortOrder - previousSortOrder <= ESTIMATE_TREE_SORT_ORDER_MIN_GAP) return null;
  return previousSortOrder + (nextSortOrder - previousSortOrder) / 2;
}

function buildReorderUpdates({
  nodes,
  parentIds,
  draggedNodeId,
  targetParentId,
}: {
  nodes: EstimateTreeNode[];
  parentIds: Array<string | null>;
  draggedNodeId: string;
  targetParentId: string | null;
}): EstimateNodeReorderUpdate[] {
  const targetSiblings = getChildren(nodes, targetParentId);
  const movedIndex = targetSiblings.findIndex((node) => node.id === draggedNodeId);
  if (movedIndex === -1) return buildSiblingUpdates(nodes, parentIds);

  const nextSortOrder = getSparseMovedNodeSortOrder(targetSiblings, movedIndex);
  if (nextSortOrder === null) return buildSiblingUpdates(nodes, parentIds);

  return [{
    id: draggedNodeId,
    parentId: targetParentId,
    sortOrder: nextSortOrder,
  }];
}

export function getDescendantEstimateNodeIds(node: EstimateTreeNode): Set<string> {
  const ids = new Set<string>();
  function visit(current: EstimateTreeNode) {
    for (const child of current.children ?? []) {
      ids.add(child.id);
      visit(child);
    }
  }
  visit(node);
  return ids;
}

export function getEstimateTreeStructureSignature(nodes: EstimateTreeNode[]): string {
  const segments: string[] = [];
  function visit(currentNodes: EstimateTreeNode[], parentPath: string) {
    for (const node of currentNodes) {
      const path = parentPath ? `${parentPath}/${node.id}` : node.id;
      segments.push(`${path}:${node.kind}`);
      visit(node.children ?? [], path);
    }
  }
  visit(nodes, "");
  return segments.join("|");
}

export function getEstimateTreeContentSignature(nodes: EstimateTreeNode[]): string {
  const segments: unknown[] = [];

  function visit(currentNodes: EstimateTreeNode[], parentPath: string) {
    for (const node of currentNodes) {
      const path = parentPath ? `${parentPath}/${node.id}` : node.id;
      segments.push([
        path,
        node.kind,
        node.name,
      ]);
      visit(node.children ?? [], path);
    }
  }

  visit(nodes, "");
  return JSON.stringify(segments);
}

export function mergeEstimateTreeStructureWithCachedNodes({
  structureNodes,
  cachedNodes,
}: {
  structureNodes: EstimateTreeNode[];
  cachedNodes: EstimateTreeNode[];
}): EstimateTreeNode[] {
  const cachedById = new Map<string, EstimateTreeNode>();

  function indexCachedNodes(currentNodes: EstimateTreeNode[]) {
    for (const node of currentNodes) {
      cachedById.set(node.id, node);
      indexCachedNodes(node.children ?? []);
    }
  }

  function mergeNode(structureNode: EstimateTreeNode): EstimateTreeNode {
    const cachedNode = cachedById.get(structureNode.id);
    const mergedNode = cachedNode ? cloneNode(cachedNode) : cloneNode(structureNode);
    return {
      ...mergedNode,
      id: structureNode.id,
      kind: structureNode.kind,
      sortOrder: structureNode.sortOrder,
      children: structureNode.children?.map(mergeNode) ?? structureNode.children,
    };
  }

  indexCachedNodes(cachedNodes);
  return structureNodes.map(mergeNode);
}

export function buildEstimateNodeReorderPlan({
  nodes,
  draggedNodeId,
  targetParentId,
  targetIndex,
}: {
  nodes: EstimateTreeNode[];
  draggedNodeId: string;
  targetParentId: string | null;
  targetIndex: number;
}): EstimateNodeReorderResult {
  const sourceLocation = findNodeLocation(nodes, draggedNodeId);
  if (!sourceLocation) return fail("unknown-dragged-node", "Dragged estimate tree node was not found.");
  if (targetParentId === draggedNodeId) return fail("self-drop", "An estimate tree node cannot be dropped inside itself.");

  const targetParentLocation = targetParentId ? findNodeLocation(nodes, targetParentId) : null;
  if (targetParentId && !targetParentLocation) return fail("unknown-target-parent", "Drop target estimate tree node was not found.");

  // Single-node model (P6): any node may parent any node, so there is no
  // kind-based nesting rule left to reject. Structural safety stays — a node
  // cannot drop inside itself (self-drop, above) or inside one of its own
  // descendants (cycle, below) — and cross-tab moves are still rejected by the
  // server action + the relaxed DB reorder RPC (this planner runs within one
  // tab's projected tree, where every node already shares the active tab).
  if (targetParentId && getDescendantEstimateNodeIds(sourceLocation.node).has(targetParentId)) {
    return fail("cycle", "An estimate tree node cannot be dropped inside one of its descendants.");
  }

  const targetChildCount = getChildCount(nodes, targetParentId);
  if (targetChildCount === null) return fail("unknown-target-parent", "Drop target estimate tree node was not found.");

  const boundedTargetIndex = Math.max(0, Math.min(targetIndex, targetChildCount));
  const adjustedTargetIndex = sourceLocation.parentId === targetParentId && sourceLocation.index < boundedTargetIndex
    ? boundedTargetIndex - 1
    : boundedTargetIndex;

  if (sourceLocation.parentId === targetParentId && sourceLocation.index === adjustedTargetIndex) {
    return fail("no-op", "Estimate tree node is already in that position.");
  }

  const removedResult = removeNode(nodes, draggedNodeId);
  if (!removedResult.removed) return fail("unknown-dragged-node", "Dragged estimate tree node was not found.");

  const nextNodes = insertNode(removedResult.nodes, targetParentId, adjustedTargetIndex, removedResult.removed);
  // react-doctor-disable-next-line react-doctor/insecure-crypto-risk -- Structure signature is deterministic equality for reorder no-op detection, not security-sensitive cryptography.
  if (getEstimateTreeStructureSignature(nextNodes) === getEstimateTreeStructureSignature(nodes)) {
    return fail("no-op", "Estimate tree node is already in that position.");
  }

  const affectedParentIds = uniqueParentIds([sourceLocation.parentId, targetParentId]);
  const updates = buildReorderUpdates({
    nodes: nextNodes,
    parentIds: affectedParentIds,
    draggedNodeId,
    targetParentId,
  });

  return {
    ok: true,
    plan: {
      draggedNodeId,
      sourceParentId: sourceLocation.parentId,
      targetParentId,
      targetIndex: adjustedTargetIndex,
      nextNodes,
      affectedParentIds,
      updates,
    },
  };
}

export function evaluateEstimateTreeDrop({
  nodes,
  draggedNodeIds,
  target,
}: {
  nodes: EstimateTreeNode[];
  draggedNodeIds: string[];
  target: EstimateTreeDropTarget;
}): EstimateNodeReorderResult {
  const validation = validateEstimateTreeDrop({
    nodes,
    draggedNodeIds,
    target,
  });
  if (!validation.ok) return validation;
  return buildEstimateNodeReorderPlan({
    nodes,
    draggedNodeId: validation.draggedNodeId,
    targetParentId: validation.targetParentId,
    targetIndex: validation.targetIndex,
  });
}

export function validateEstimateTreeDrop({
  nodes,
  draggedNodeIds,
  target,
}: {
  nodes: EstimateTreeNode[];
  draggedNodeIds: string[];
  target: EstimateTreeDropTarget;
}): EstimateTreeDropValidationResult {
  if (draggedNodeIds.length !== 1) return fail("multi-drag-unsupported", "Only one estimate tree node can be moved at a time.");

  const draggedNodeId = draggedNodeIds[0];

  if (target.position === "inside") {
    const targetLocation = findNodeLocation(nodes, target.targetNodeId);
    if (!targetLocation) return fail("unknown-target-parent", "Drop target estimate tree node was not found.");
    return validateReorderPlacement({
      nodes,
      draggedNodeId,
      targetParentId: target.targetNodeId,
      targetIndex: targetLocation.node.children?.length ?? 0,
    });
  }

  const targetLocation = findNodeLocation(nodes, target.targetNodeId);
  if (!targetLocation) return fail("unknown-target-parent", "Drop target estimate tree node was not found.");

  return validateReorderPlacement({
    nodes,
    draggedNodeId,
    targetParentId: targetLocation.parentId,
    targetIndex: target.position === "before" ? targetLocation.index : targetLocation.index + 1,
  });
}
