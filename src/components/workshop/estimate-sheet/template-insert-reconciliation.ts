import type { EstimateTreeNode } from "@/components/workshop/estimate-tree-data";

export function replaceOptimisticTemplateRoots(
  nodes: EstimateTreeNode[],
  targetParentNodeId: string,
  optimisticRootNodeIds: ReadonlySet<string>,
  committedRootNodes: EstimateTreeNode[],
): EstimateTreeNode[] {
  const committedRootNodeIds = new Set(committedRootNodes.map((node) => node.id));

  return nodes.map((node) => {
    if (node.id === targetParentNodeId) {
      let didInsertCommittedRoots = false;
      const nextChildren: EstimateTreeNode[] = [];

      for (const child of node.children ?? []) {
        if (optimisticRootNodeIds.has(child.id)) {
          if (!didInsertCommittedRoots) {
            nextChildren.push(...committedRootNodes);
            didInsertCommittedRoots = true;
          }
          continue;
        }

        if (!committedRootNodeIds.has(child.id)) nextChildren.push(child);
      }

      if (!didInsertCommittedRoots) nextChildren.push(...committedRootNodes);
      return { ...node, children: nextChildren };
    }

    return {
      ...node,
      children: node.children
        ? replaceOptimisticTemplateRoots(node.children, targetParentNodeId, optimisticRootNodeIds, committedRootNodes)
        : node.children,
    };
  });
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
