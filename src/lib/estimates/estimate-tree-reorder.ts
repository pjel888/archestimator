import type { EstimateTreeNode } from "@/lib/estimates/types";
import { canNestEstimateNodeKind, getEstimateNodeKindSortRank } from "@/lib/estimates/tree-hierarchy";

export const ESTIMATE_TREE_SORT_ORDER_STEP = 10;

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

type ReorderFailureCode =
  | "unknown-dragged-node"
  | "unknown-target-parent"
  | "multi-drag-unsupported"
  | "invalid-parent"
  | "self-drop"
  | "cycle"
  | "no-op";

export type EstimateNodeReorderResult =
  | { ok: true; plan: EstimateNodeReorderPlan }
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

function fail(code: ReorderFailureCode, message: string): EstimateNodeReorderResult {
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

function sortEstimateTreeSiblings(nodes: EstimateTreeNode[]) {
  return nodes
    .map((node, index) => ({ node, index }))
    .sort((left, right) => getEstimateNodeKindSortRank(left.node.kind) - getEstimateNodeKindSortRank(right.node.kind) || left.index - right.index)
    .map(({ node }) => node);
}

function insertNode(nodes: EstimateTreeNode[], parentId: string | null, rawIndex: number, nodeToInsert: EstimateTreeNode): EstimateTreeNode[] {
  const targetIndex = Math.max(0, rawIndex);
  if (parentId === null) {
    const nextNodes = nodes.map(cloneNode);
    nextNodes.splice(Math.min(targetIndex, nextNodes.length), 0, cloneNode(nodeToInsert));
    return sortEstimateTreeSiblings(nextNodes);
  }

  return nodes.map((node) => {
    const cloned = cloneNode(node);
    if (cloned.id === parentId) {
      const nextChildren = cloned.children?.map(cloneNode) ?? [];
      nextChildren.splice(Math.min(targetIndex, nextChildren.length), 0, cloneNode(nodeToInsert));
      return { ...cloned, children: sortEstimateTreeSiblings(nextChildren) };
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
        node.total,
        (node.estimateRowItems ?? []).map((item) => [
          item.id,
          item.material,
          item.description,
          item.supplier,
          item.source,
          item.unit,
          item.itemCost,
          item.quantity,
          item.subTotal,
          item.contingencyPercentage,
          item.contingencyValue,
          item.miscCost,
          item.totalItemCosts,
          item.category,
          item.discipline,
          item.designation,
          item.pricingSource,
          item.pricingDate,
          item.confidence,
        ]),
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

  const targetParentKind = targetParentLocation?.node.kind ?? null;
  if (!canNestEstimateNodeKind(sourceLocation.node.kind, targetParentKind)) {
    return fail("invalid-parent", `${sourceLocation.node.kind} nodes cannot be placed under ${targetParentKind ?? "estimate root"}.`);
  }

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
  if (getEstimateTreeStructureSignature(nextNodes) === getEstimateTreeStructureSignature(nodes)) {
    return fail("no-op", "Estimate tree node is already in that position.");
  }

  const affectedParentIds = uniqueParentIds([sourceLocation.parentId, targetParentId]);
  const updates = buildSiblingUpdates(nextNodes, affectedParentIds);

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
  if (draggedNodeIds.length !== 1) return fail("multi-drag-unsupported", "Only one estimate tree node can be moved at a time.");

  const draggedNodeId = draggedNodeIds[0];

  if (target.position === "inside") {
    const childCount = getChildCount(nodes, target.targetNodeId);
    if (childCount === null) return fail("unknown-target-parent", "Drop target estimate tree node was not found.");
    return buildEstimateNodeReorderPlan({ nodes, draggedNodeId, targetParentId: target.targetNodeId, targetIndex: childCount });
  }

  const targetLocation = findNodeLocation(nodes, target.targetNodeId);
  if (!targetLocation) return fail("unknown-target-parent", "Drop target estimate tree node was not found.");

  return buildEstimateNodeReorderPlan({
    nodes,
    draggedNodeId,
    targetParentId: targetLocation.parentId,
    targetIndex: target.position === "before" ? targetLocation.index : targetLocation.index + 1,
  });
}
