import type { EstimateTreeNode } from "@/lib/estimates/types";

export function buildTemplatePreviewNodeTotals(nodes: EstimateTreeNode[]): Map<string, number> {
  const totalsByNodeId = new Map<string, number>();

  function visit(node: EstimateTreeNode): number {
    const rowTotal = (node.estimateRowItems ?? []).reduce((sum, row) => sum + row.totalItemCosts, 0);
    const childTotal = (node.children ?? []).reduce((sum, child) => sum + visit(child), 0);
    const total = rowTotal + childTotal;
    totalsByNodeId.set(node.id, total);
    return total;
  }

  nodes.forEach(visit);
  return totalsByNodeId;
}
