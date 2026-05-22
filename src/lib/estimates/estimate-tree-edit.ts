import type { EstimateTreeNode } from "@/lib/estimates/types";

export type EstimateTreeDeletePlan = {
  nextNodes: EstimateTreeNode[];
  deletedNodeIds: Set<string>;
  fallbackNodeId: string | null;
};

type NodePosition = {
  node: EstimateTreeNode;
  parentId: string | null;
  siblings: EstimateTreeNode[];
  index: number;
};

export function renameEstimateTreeNode(
  nodes: EstimateTreeNode[],
  nodeId: string,
  name: string,
): EstimateTreeNode[] {
  let didRename = false;

  function renameNode(node: EstimateTreeNode): EstimateTreeNode {
    const children = node.children?.map(renameNode);
    if (node.id !== nodeId) {
      return children && children !== node.children ? { ...node, children } : node;
    }

    didRename = true;
    return { ...node, name };
  }

  const nextNodes = nodes.map(renameNode);
  return didRename ? nextNodes : nodes;
}

export function getEstimateTreeNodeAndDescendantIds(
  nodes: EstimateTreeNode[],
  nodeId: string,
): Set<string> {
  const targetNode = findTreeNode(nodes, nodeId);
  const ids = new Set<string>();
  if (!targetNode) return ids;

  function collect(node: EstimateTreeNode) {
    ids.add(node.id);
    node.children?.forEach(collect);
  }

  collect(targetNode);
  return ids;
}

export function planEstimateTreeDelete(
  nodes: EstimateTreeNode[],
  nodeId: string,
  selectedNodeId: string | null,
): EstimateTreeDeletePlan {
  const position = findNodePosition(nodes, nodeId);
  if (!position) {
    return {
      nextNodes: nodes,
      deletedNodeIds: new Set(),
      fallbackNodeId: selectedNodeId ?? firstVisibleNodeId(nodes),
    };
  }

  const deletedNodeIds = getEstimateTreeNodeAndDescendantIds(nodes, nodeId);
  const nextNodes = removeEstimateTreeNodes(nodes, deletedNodeIds);
  const selectedNodeRemains = selectedNodeId ? !deletedNodeIds.has(selectedNodeId) : false;
  const fallbackNodeId = selectedNodeRemains
    ? selectedNodeId
    : getDeleteFallbackNodeId(position, deletedNodeIds, nextNodes);

  return { nextNodes, deletedNodeIds, fallbackNodeId };
}

function findTreeNode(nodes: EstimateTreeNode[], nodeId: string): EstimateTreeNode | null {
  for (const node of nodes) {
    if (node.id === nodeId) return node;
    const child = node.children ? findTreeNode(node.children, nodeId) : null;
    if (child) return child;
  }
  return null;
}

function findNodePosition(
  nodes: EstimateTreeNode[],
  nodeId: string,
  parentId: string | null = null,
): NodePosition | null {
  for (let index = 0; index < nodes.length; index += 1) {
    const node = nodes[index];
    if (node.id === nodeId) return { node, parentId, siblings: nodes, index };
    const childPosition = node.children ? findNodePosition(node.children, nodeId, node.id) : null;
    if (childPosition) return childPosition;
  }
  return null;
}

function removeEstimateTreeNodes(nodes: EstimateTreeNode[], deletedNodeIds: Set<string>): EstimateTreeNode[] {
  return nodes.flatMap((node) => {
    if (deletedNodeIds.has(node.id)) return [];
    if (!node.children?.length) return [node];
    return [{ ...node, children: removeEstimateTreeNodes(node.children, deletedNodeIds) }];
  });
}

function getDeleteFallbackNodeId(
  deletedPosition: NodePosition,
  deletedNodeIds: Set<string>,
  nextNodes: EstimateTreeNode[],
) {
  const nextSibling = findSiblingOutsideDeletedSet(deletedPosition.siblings, deletedPosition.index + 1, 1, deletedNodeIds);
  if (nextSibling) return nextSibling.id;

  const previousSibling = findSiblingOutsideDeletedSet(deletedPosition.siblings, deletedPosition.index - 1, -1, deletedNodeIds);
  if (previousSibling) return previousSibling.id;

  if (deletedPosition.parentId && !deletedNodeIds.has(deletedPosition.parentId)) return deletedPosition.parentId;

  return firstVisibleNodeId(nextNodes);
}

function findSiblingOutsideDeletedSet(
  siblings: EstimateTreeNode[],
  startIndex: number,
  direction: 1 | -1,
  deletedNodeIds: Set<string>,
) {
  for (let index = startIndex; index >= 0 && index < siblings.length; index += direction) {
    const sibling = siblings[index];
    if (!deletedNodeIds.has(sibling.id)) return sibling;
  }
  return null;
}

function firstVisibleNodeId(nodes: EstimateTreeNode[]): string | null {
  return nodes[0]?.id ?? null;
}
