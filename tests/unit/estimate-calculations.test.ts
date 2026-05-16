import { describe, expect, test } from "bun:test";
import { calculateEstimateLineTotal } from "@/lib/estimates/calculations";

describe("calculateEstimateLineTotal", () => {
  test("combines project quantity with library unit cost", () => {
    const result = calculateEstimateLineTotal({ quantity: 25, unitCost: 800 });

    expect(result).toEqual({
      adjustedQuantity: 25,
      materialSubtotal: 20000,
      laborSubtotal: 0,
      subtotal: 20000,
      markupAmount: 0,
      contingencyAmount: 0,
      total: 20000,
    });
  });

  test("applies waste to quantity before material and labor subtotals", () => {
    const result = calculateEstimateLineTotal({
      quantity: 25,
      materialUnitCost: 800,
      laborUnitCost: 120,
      wastePercent: 10,
    });

    expect(result.adjustedQuantity).toBe(27.5);
    expect(result.materialSubtotal).toBe(22000);
    expect(result.laborSubtotal).toBe(3300);
    expect(result.total).toBe(25300);
  });

  test("keeps markup and contingency explicit", () => {
    const result = calculateEstimateLineTotal({
      quantity: 10,
      unitCost: 1000,
      markupPercent: 15,
      contingencyPercent: 5,
    });

    expect(result.subtotal).toBe(10000);
    expect(result.markupAmount).toBe(1500);
    expect(result.contingencyAmount).toBe(500);
    expect(result.total).toBe(12000);
  });
});
