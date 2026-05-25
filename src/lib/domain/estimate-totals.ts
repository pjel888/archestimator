import type { EstimateRowItem, EstimateTree } from "./estimate-tree";

export function calculateEstimateRowTotal(row: EstimateRowItem) {
  const subTotal = row.quantity * row.unitCost;
  return subTotal + row.miscCost + (subTotal * (row.contingencyPercentage ?? 0)) / 100;
}

export function calculateEstimateTotal(tree: EstimateTree) {
  return tree.rows.reduce((total, row) => total + calculateEstimateRowTotal(row), 0);
}
