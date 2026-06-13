import { describe, expect, it } from "vitest";

import { computeEstimateRowLineTotal, sumEstimateRowLineTotals } from "@/lib/estimates/estimate-row-total";

// Golden values for the project_estimate_list_summaries RPC. The SQL aggregate is
// proven byte-identical to this JS oracle by
// scripts/prove-estimate-list-summaries-postgres.mjs (PASS: 5 parity cases against
// PG17). This test pins the oracle so a formula drift is caught in CI without a DB.
// Formula: quantity*unit_cost + misc_cost + (quantity*unit_cost*coalesce(contingency,0)/100)

describe("estimate list summaries parity oracle (F8 / P2-1)", () => {
  it("zero-row estimate totals to 0", () => {
    expect(sumEstimateRowLineTotals([])).toBe(0);
  });

  it("contingency = 0", () => {
    const rows = [{ quantity: 2, unit_cost: 100, contingency_percentage: 0, misc_cost: 10 }];
    expect(sumEstimateRowLineTotals(rows)).toBe(210); // 200 + 10
  });

  it("contingency = null coalesces to 0", () => {
    const rows = [{ quantity: 1, unit_cost: 100, contingency_percentage: null, misc_cost: 55 }];
    expect(sumEstimateRowLineTotals(rows)).toBe(155); // 100 + 55 + 0
  });

  it("misc-only rows (zero subtotal)", () => {
    const rows = [
      { quantity: 0, unit_cost: 0, contingency_percentage: 0, misc_cost: 25 },
      { quantity: 0, unit_cost: 0, contingency_percentage: 0, misc_cost: 25 },
    ];
    expect(sumEstimateRowLineTotals(rows)).toBe(50);
  });

  it("multi-row mixed estimate", () => {
    const rows = [
      { quantity: 2, unit_cost: 100, contingency_percentage: 5, misc_cost: 10 }, // 200 + 10 + 10 = 220
      { quantity: 1, unit_cost: 50, contingency_percentage: 0, misc_cost: 0 }, //   50
      { quantity: 0, unit_cost: 0, contingency_percentage: 0, misc_cost: 25 }, //   25
      { quantity: 3, unit_cost: 100, contingency_percentage: 10, misc_cost: 0 }, // 300 + 30 = 330
    ];
    expect(computeEstimateRowLineTotal(rows[0])).toBe(220);
    expect(computeEstimateRowLineTotal(rows[3])).toBe(330);
    expect(sumEstimateRowLineTotals(rows)).toBe(625);
  });
});
