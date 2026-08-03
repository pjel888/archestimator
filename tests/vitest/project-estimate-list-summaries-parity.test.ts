import { describe, expect, it } from "vitest";

import {
  computeEstimateRowCostParts,
  computeEstimateTotals,
  type EstimateRowCostInput,
} from "@/lib/estimates/estimate-row-total";

function total(rows: EstimateRowCostInput[]) {
  const result = computeEstimateTotals(rows, "working_estimate");
  if (!result.ok) throw new Error(`Unexpected calculation failure: ${result.code}`);
  return result.value.total;
}

function rowTotal(row: EstimateRowCostInput) {
  const result = computeEstimateRowCostParts(row);
  if (!result.ok) throw new Error(`Unexpected calculation failure: ${result.code}`);
  return result.value.total;
}

describe("estimate list summaries parity oracle (F8 / P2-1)", () => {
  it("zero-row estimate totals to 0", () => {
    expect(total([])).toBe(0);
  });

  it("contingency = 0", () => {
    const rows = [{ quantity: 2, unit_cost: 100, contingency_percentage: 0, misc_cost: 10 }];
    expect(total(rows)).toBe(210); // 200 + 10
  });

  it("contingency = null coalesces to 0", () => {
    const rows = [{ quantity: 1, unit_cost: 100, contingency_percentage: null, misc_cost: 55 }];
    expect(total(rows)).toBe(155); // 100 + 55 + 0
  });

  it("misc-only rows (zero subtotal)", () => {
    const rows = [
      { quantity: 0, unit_cost: 0, contingency_percentage: 0, misc_cost: 25 },
      { quantity: 0, unit_cost: 0, contingency_percentage: 0, misc_cost: 25 },
    ];
    expect(total(rows)).toBe(50);
  });

  it("multi-row mixed estimate", () => {
    const rows = [
      { quantity: 2, unit_cost: 100, contingency_percentage: 5, misc_cost: 10 }, // 200 + 10 + 10 = 220
      { quantity: 1, unit_cost: 50, contingency_percentage: 0, misc_cost: 0 }, //   50
      { quantity: 0, unit_cost: 0, contingency_percentage: 0, misc_cost: 25 }, //   25
      { quantity: 3, unit_cost: 100, contingency_percentage: 10, misc_cost: 0 }, // 300 + 30 = 330
    ];
    expect(rowTotal(rows[0]!)).toBe(220);
    expect(rowTotal(rows[3]!)).toBe(330);
    expect(total(rows)).toBe(625);
  });
});
