import type { EstimateRowItem, EstimateTree } from "./estimate-tree";

export function calculateEstimateRowTotal(row: EstimateRowItem) {
  return row.quantity * row.unitCost + row.miscCost;
}

export function calculateEstimateTotal(tree: EstimateTree) {
  return tree.rows.reduce((total, row) => total + calculateEstimateRowTotal(row), 0);
}
