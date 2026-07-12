import { finiteOrZero, isIncludedRow } from "./normalize";
import type { EstimateCostDriver, EstimateHealthRowFact } from "./types";

export function getEstimateCostDrivers(rows: EstimateHealthRowFact[]): EstimateCostDriver[] {
  const included = rows.filter(isIncludedRow);
  const total = included.reduce((sum, row) => sum + finiteOrZero(row.amount), 0);
  return included.map((row) => ({ id: row.id, amount: finiteOrZero(row.amount), share: total === 0 ? 0 : finiteOrZero(row.amount) / total }))
    .sort((left, right) => right.amount - left.amount || left.id.localeCompare(right.id));
}
