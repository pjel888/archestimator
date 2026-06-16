import type { EstimateTreeNode } from "@/components/workshop/estimate-tree-data";

export function replaceOptimisticTemplateRoots(
  nodes: EstimateTreeNode[],
  targetParentNodeId: string,
  optimisticRootNodeIds: ReadonlySet<string>,
  committedRootNodes: EstimateTreeNode[],
): EstimateTreeNode[] {
  const committedRootNodeIds = new Set(committedRootNodes.map((node) => node.id));
  const existingCommittedRootNodeIds = new Set<string>();

  function collectExistingCommittedRoots(node: EstimateTreeNode) {
    if (committedRootNodeIds.has(node.id) && !optimisticRootNodeIds.has(node.id)) existingCommittedRootNodeIds.add(node.id);
    node.children?.forEach(collectExistingCommittedRoots);
  }

  nodes.forEach(collectExistingCommittedRoots);

  function reconcileNode(node: EstimateTreeNode): EstimateTreeNode {
    const nextChildren = (node.children ?? []).flatMap((child) => {
      if (optimisticRootNodeIds.has(child.id)) return [];
      return [reconcileNode(child)];
    });

    if (node.id === targetParentNodeId) {
      const missingCommittedRootNodes = committedRootNodes.filter((committedRootNode) => !existingCommittedRootNodeIds.has(committedRootNode.id));
      return { ...node, children: [...nextChildren, ...missingCommittedRootNodes] };
    }

    return {
      ...node,
      children: node.children ? nextChildren : node.children,
    };
  }

  return nodes
    .filter((node) => !optimisticRootNodeIds.has(node.id))
    .map(reconcileNode);
}

export function collectEstimateRowItemIds(nodes: EstimateTreeNode[]): Set<string> {
  const rowItemIds = new Set<string>();

  function visit(node: EstimateTreeNode) {
    for (const rowItem of node.estimateRowItems ?? []) rowItemIds.add(rowItem.id);
    node.children?.forEach(visit);
  }

  nodes.forEach(visit);
  return rowItemIds;
}
