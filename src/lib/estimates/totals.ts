import type { Estimate, EstimateLineItem } from "@/lib/local-data/schemas";
import { calculateEstimateLineTotal } from "./calculations";

export type CalculatedEstimateLine = EstimateLineItem & {
  calculated: ReturnType<typeof calculateEstimateLineTotal>;
  includedInTotal: boolean;
};

export type EstimateTotals = {
  rows: CalculatedEstimateLine[];
  materialSubtotal: number;
  laborSubtotal: number;
  subtotal: number;
  markupAmount: number;
  contingencyAmount: number;
  grandTotal: number;
  excludedTotal: number;
  rowCount: number;
};

const excludedStatuses = new Set(["excluded", "by-others", "not-applicable"]);

export function isLineIncludedInTotal(line: EstimateLineItem) {
  return !excludedStatuses.has(line.scopeStatus);
}

export function calculateEstimateTotals(estimate: Estimate): EstimateTotals {
  const rows = estimate.lineItems.map((line) => {
    const calculated = calculateEstimateLineTotal({
      quantity: line.quantity,
      unitCost: line.unitCost,
      materialUnitCost: line.materialUnitCost,
      laborUnitCost: line.laborUnitCost,
    });

    return {
      ...line,
      calculated,
      includedInTotal: isLineIncludedInTotal(line),
    };
  });

  return rows.reduce<EstimateTotals>(
    (totals, row) => {
      if (row.includedInTotal) {
        totals.materialSubtotal += row.calculated.materialSubtotal;
        totals.laborSubtotal += row.calculated.laborSubtotal;
        totals.subtotal += row.calculated.subtotal;
        totals.markupAmount += row.calculated.markupAmount;
        totals.contingencyAmount += row.calculated.contingencyAmount;
        totals.grandTotal += row.calculated.total;
      } else {
        totals.excludedTotal += row.calculated.total;
      }
      totals.rowCount += 1;
      return totals;
    },
    {
      rows,
      materialSubtotal: 0,
      laborSubtotal: 0,
      subtotal: 0,
      markupAmount: 0,
      contingencyAmount: 0,
      grandTotal: 0,
      excludedTotal: 0,
      rowCount: 0,
    },
  );
}
