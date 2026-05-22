import type { EstimateRowItem, EstimateTreeNode } from "@/components/workshop/estimate-tree-data";

export type EstimateRowItemPatch = {
  quantity?: number;
  itemCost?: number;
  miscCost?: number;
};

export function findEstimateRowItemInTree(tree: EstimateTreeNode[], rowId: string): EstimateRowItem | null {
  for (const node of tree) {
    const item = node.estimateRowItems?.find((rowItem) => rowItem.id === rowId);
    if (item) return item;
    const childItem = node.children ? findEstimateRowItemInTree(node.children, rowId) : null;
    if (childItem) return childItem;
  }

  return null;
}

function patchEstimateRowItem(item: EstimateRowItem, patch: EstimateRowItemPatch) {
  const quantity = patch.quantity ?? item.quantity;
  const itemCost = patch.itemCost ?? item.itemCost;
  const miscCost = patch.miscCost ?? item.miscCost;
  return {
    ...item,
    quantity,
    itemCost,
    subTotal: itemCost * quantity,
    miscCost,
    totalItemCosts: itemCost * quantity + miscCost,
  };
}

export function patchEstimateRowItemInTree(
  tree: EstimateTreeNode[],
  rowId: string,
  patch: EstimateRowItemPatch,
): EstimateTreeNode[] {
  let didChange = false;

  function visit(node: EstimateTreeNode): EstimateTreeNode {
    let nextItems = node.estimateRowItems;
    if (node.estimateRowItems?.some((item) => item.id === rowId)) {
      nextItems = node.estimateRowItems.map((item) => (item.id === rowId ? patchEstimateRowItem(item, patch) : item));
      didChange = true;
    }

    let nextChildren = node.children;
    if (node.children?.length) {
      const patchedChildren = node.children.map(visit);
      if (patchedChildren.some((child, index) => child !== node.children?.[index])) nextChildren = patchedChildren;
    }

    if (nextItems === node.estimateRowItems && nextChildren === node.children) return node;
    return { ...node, estimateRowItems: nextItems, children: nextChildren };
  }

  const nextTree = tree.map(visit);
  return didChange ? nextTree : tree;
}
