import type { EstimateRowItem, EstimateTreeNode } from "@/lib/estimates/types";
import {
  calculateContingencyValue,
} from "../../estimate-sheet/rows/editable-row-model";

/** Recomputes a row's derived money fields from its base values. */
export function recomputeTemplateRow(item: EstimateRowItem): EstimateRowItem {
  const subTotal = item.itemCost * item.quantity;
  const contingencyValue = calculateContingencyValue(subTotal, item.contingencyPercentage ?? 0);
  return {
    ...item,
    subTotal,
    contingencyValue,
    totalItemCosts: subTotal + item.miscCost + contingencyValue,
  };
}

function mapTemplateNodes(
  nodes: EstimateTreeNode[],
  transform: (node: EstimateTreeNode) => EstimateTreeNode | null,
): EstimateTreeNode[] {
  const result: EstimateTreeNode[] = [];
  for (const node of nodes) {
    const next = transform(node);
    if (next === null) continue;
    result.push({
      ...next,
      children: next.children ? mapTemplateNodes(next.children, transform) : next.children,
    });
  }
  return result;
}

export function updateTemplateRowInNodes(
  nodes: EstimateTreeNode[],
  rowId: string,
  patch: Partial<EstimateRowItem>,
): EstimateTreeNode[] {
  return mapTemplateNodes(nodes, (node) => ({
    ...node,
    estimateRowItems: node.estimateRowItems?.map((item) =>
      item.id === rowId ? recomputeTemplateRow({ ...item, ...patch }) : item,
    ),
  }));
}

export function removeTemplateRowFromNodes(nodes: EstimateTreeNode[], rowId: string): EstimateTreeNode[] {
  return mapTemplateNodes(nodes, (node) => ({
    ...node,
    estimateRowItems: node.estimateRowItems?.filter((item) => item.id !== rowId),
  }));
}

export function appendTemplateRowToNode(
  nodes: EstimateTreeNode[],
  nodeId: string,
  row: EstimateRowItem,
): EstimateTreeNode[] {
  return mapTemplateNodes(nodes, (node) =>
    node.id === nodeId
      ? { ...node, estimateRowItems: [...(node.estimateRowItems ?? []), row] }
      : node,
  );
}

export function renameTemplateNodeInNodes(
  nodes: EstimateTreeNode[],
  nodeId: string,
  name: string,
): EstimateTreeNode[] {
  return mapTemplateNodes(nodes, (node) => (node.id === nodeId ? { ...node, name } : node));
}

export function removeTemplateNodeFromNodes(nodes: EstimateTreeNode[], nodeId: string): EstimateTreeNode[] {
  return mapTemplateNodes(nodes, (node) => (node.id === nodeId ? null : node));
}

export function appendTemplateChildNode(
  nodes: EstimateTreeNode[],
  parentId: string | null,
  child: EstimateTreeNode,
): EstimateTreeNode[] {
  if (parentId === null) return [...nodes, child];
  return mapTemplateNodes(nodes, (node) =>
    node.id === parentId ? { ...node, children: [...(node.children ?? []), child] } : node,
  );
}

export function findTemplateNode(nodes: EstimateTreeNode[], nodeId: string): EstimateTreeNode | null {
  for (const node of nodes) {
    if (node.id === nodeId) return node;
    const child = findTemplateNode(node.children ?? [], nodeId);
    if (child) return child;
  }
  return null;
}

/** First area in tree order under the given node (or among all nodes). */
export function findFirstTemplateArea(nodes: EstimateTreeNode[]): EstimateTreeNode | null {
  for (const node of nodes) {
    if (node.kind === "area") return node;
    const child = findFirstTemplateArea(node.children ?? []);
    if (child) return child;
  }
  return null;
}
