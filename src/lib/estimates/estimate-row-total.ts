/**
 * The single JS oracle for an estimate row's line total. Mirrors the SQL
 * `estimate_row_line_total` STABLE function
 * (supabase/migrations/20260524050746_add_estimate_row_contingency_percentage.sql)
 * byte-for-byte:
 *
 *   subtotal       = quantity * unit_cost
 *   contingency    = 0 when quantity_base is set, else subtotal * contingency_percentage / 100
 *   line_total     = subtotal + misc_cost + contingency
 *
 * Used by the project-estimate list aggregation, the duplicate action's
 * optimistic total, and the `project_estimate_list_summaries` RPC parity proof,
 * so the count/total maths lives in exactly one place.
 */
export type EstimateRowCostInput = {
  quantity: number | string | null;
  quantity_base?: number | string | null;
  quantity_contingency_amount?: number | string | null;
  unit_cost: number | string | null;
  contingency_percentage?: number | string | null;
  misc_cost: number | string | null;
};

export function computeEstimateRowLineTotal(row: EstimateRowCostInput): number {
  const quantity = Number(row.quantity ?? 0);
  const unitCost = Number(row.unit_cost ?? 0);
  const quantityBase = row.quantity_base === null || row.quantity_base === undefined ? null : Number(row.quantity_base);
  const contingencyPercentage = Number(row.contingency_percentage ?? 0);
  const miscCost = Number(row.misc_cost ?? 0);
  const subTotal = quantity * unitCost;
  return subTotal + miscCost + (quantityBase === null ? (subTotal * contingencyPercentage) / 100 : 0);
}

export function sumEstimateRowLineTotals(rows: readonly EstimateRowCostInput[]): number {
  return rows.reduce((total, row) => total + computeEstimateRowLineTotal(row), 0);
}
