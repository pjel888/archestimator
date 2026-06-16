import type { EstimateTreeNode } from "@/components/workshop/estimate-tree-data";

export function replaceOptimisticTemplateRoots(
  nodes: EstimateTreeNode[],
  targetParentNodeId: string,
  optimisticNodeIds: ReadonlySet<string>,
  committedRootNodes: EstimateTreeNode[],
): EstimateTreeNode[] {
  const committedRootNodeIds = new Set(committedRootNodes.map((node) => node.id));
  const existingCommittedRootNodeIds = new Set<string>();

  function collectExistingCommittedRoots(node: EstimateTreeNode) {
    if (committedRootNodeIds.has(node.id) && !optimisticNodeIds.has(node.id)) existingCommittedRootNodeIds.add(node.id);
    node.children?.forEach(collectExistingCommittedRoots);
  }

  nodes.forEach(collectExistingCommittedRoots);

  function reconcileChildren(children: EstimateTreeNode[] | undefined): EstimateTreeNode[] {
    return (children ?? []).flatMap((child) => {
      const reconciledDescendants = reconcileChildren(child.children);
      if (optimisticNodeIds.has(child.id)) return reconciledDescendants;
      return [{ ...child, children: child.children ? reconciledDescendants : child.children }];
    });
  }

  function reconcileNode(node: EstimateTreeNode): EstimateTreeNode {
    const nextChildren = reconcileChildren(node.children);

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
    .flatMap((node) => (optimisticNodeIds.has(node.id) ? reconcileChildren(node.children) : [reconcileNode(node)]));
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
