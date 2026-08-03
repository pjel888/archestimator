import { describe, expect, it } from "vitest";

import {
  applyProposalCharges,
  applySheetAdjustment,
  computeEstimateRowCostParts,
  computeEstimateTotals,
  validateEstimateCalculationInput,
} from "@/lib/estimates/estimate-row-total";

describe("estimate row canonical calculation", () => {
  it("rounds cost parts independently into minor units", () => {
    const result = computeEstimateRowCostParts({
      quantity: 1.000001,
      unit_cost: 10.005,
      adjustment_percentage: -10,
      misc_cost: 0.005,
      currency_code: "php",
    });

    expect(result).toMatchObject({
      ok: true,
      value: {
        currencyCode: "PHP",
        quantity: 1.000001,
        materialMinorUnits: 1001,
        adjustmentMinorUnits: -100,
        miscMinorUnits: 1,
        totalMinorUnits: 902,
      },
    });
  });

  it("rejects invalid numeric input, quantity mismatches, unsupported currency, and unsafe values", () => {
    expect(validateEstimateCalculationInput({ quantity: -1, unit_cost: 10, misc_cost: 0 })).toMatchObject({ ok: false, code: "invalid_calculation_input" });
    expect(validateEstimateCalculationInput({ quantity: 2, quantity_base: 1, quantity_contingency_amount: 0.5, unit_cost: 10, misc_cost: 0 })).toMatchObject({ ok: false, field: "quantity_contingency_amount" });
    expect(validateEstimateCalculationInput({ quantity: 1, unit_cost: 10, misc_cost: 0, currency_code: "JPY" })).toMatchObject({ ok: false, code: "unsupported_currency" });
    expect(computeEstimateRowCostParts({ quantity: Number.MAX_VALUE, unit_cost: 1, misc_cost: 0 })).toMatchObject({ ok: false, code: "amount_out_of_range" });
  });

  it("aggregates independently rounded canonical row totals", () => {
    expect(computeEstimateTotals([
      { quantity: 1, unit_cost: 0.335, misc_cost: 0 },
      { quantity: 1, unit_cost: 0.335, misc_cost: 0 },
    ], "working_estimate")).toMatchObject({
      ok: true,
      value: { rowTotalMinorUnits: 68, total: 0.68 },
    });
  });

  it("applies sheet and proposal charges once at named total boundaries", () => {
    expect(applySheetAdjustment(10_000, -10)).toEqual({ ok: true, value: { adjustmentMinorUnits: -1_000, totalMinorUnits: 9_000 } });
    expect(applyProposalCharges(9_000, 10, 12)).toEqual({ ok: true, value: { proposalContingencyMinorUnits: 900, vatMinorUnits: 1_188, totalMinorUnits: 11_088 } });

    const total = computeEstimateTotals(
      [
        { quantity: 1, unit_cost: 100, misc_cost: 0, scope_status: "included" },
        { quantity: 1, unit_cost: 50, misc_cost: 0, scope_status: "excluded" },
        { quantity: 1, unit_cost: 25, misc_cost: 0, archived: true },
      ],
      "final_proposal",
      { sheetAdjustmentPercentage: 10, proposalContingencyPercentage: 10, vatPercentage: 10 },
    );

    expect(total).toMatchObject({
      ok: true,
      value: {
        rowTotalMinorUnits: 10_000,
        sheetAdjustmentMinorUnits: 1_000,
        proposalContingencyMinorUnits: 1_100,
        vatMinorUnits: 1_210,
        totalMinorUnits: 13_310,
      },
    });
  });
});
