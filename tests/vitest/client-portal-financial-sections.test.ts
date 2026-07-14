import { describe, expect, it } from "vitest";

import { buildClientPortalCostBreakdownPayload, buildClientPortalEstimateComparisonPayload, buildClientPortalFinancialSummaryPayload } from "@/lib/client-portal/financial-sections";

const estimates = [{
  id: "estimate_1", name: "Main", sheetCode: "A-100", updatedAt: null, rowCount: 2, totalCost: 30, tabs: [],
  rows: [
    { id: "row_1", description: "Wall", designation: "W1", discipline: "Build", material: "Private", quantity: 1, unit: "ea", rowTotal: 10 },
    { id: "row_2", description: "Plan", designation: "P1", discipline: "Design", material: "Private", quantity: 1, unit: "ea", rowTotal: 20 },
  ],
}];

describe("client portal financial sections", () => {
  it("creates reconciled client-safe financial summaries without raw row facts", () => {
    expect(buildClientPortalFinancialSummaryPayload({ currencyCode: "USD", estimates })).toMatchObject({ estimateCount: 1, totalCost: 30, totalCostMinorUnits: 3000 });
    expect(buildClientPortalCostBreakdownPayload({ currencyCode: "USD", estimates, groupBy: "discipline" })).toMatchObject({ totalCost: 30, totalCostMinorUnits: 3000, buckets: [{ label: "Design", totalCost: 20, totalCostMinorUnits: 2000 }, { label: "Build", totalCost: 10, totalCostMinorUnits: 1000 }] });
    const comparison = buildClientPortalEstimateComparisonPayload({ currencyCode: "USD", estimates });
    expect(comparison).toMatchObject({ totalCost: 30, estimates: [{ id: "estimate_1", totalCost: 30 }] });
    expect(JSON.stringify(comparison)).not.toContain("Private");
  });

  it("groups category and supplier totals from issued row minor units", () => {
    const scoped = [{
      ...estimates[0],
      totalCost: 20.02,
      totalCostMinorUnits: 2002,
      rows: [
        { ...estimates[0]!.rows[0]!, category: "Flooring", supplier: "Supplier A", rowTotal: 10.01, rowTotalMinorUnits: 1001 },
        { ...estimates[0]!.rows[1]!, category: "Flooring", supplier: "Supplier B", rowTotal: 10.01, rowTotalMinorUnits: 1001 },
      ],
    }];

    expect(buildClientPortalCostBreakdownPayload({ currencyCode: "USD", estimates: scoped, groupBy: "category" })).toMatchObject({ totalCost: 20.02, totalCostMinorUnits: 2002, buckets: [{ label: "Flooring", totalCost: 20.02, totalCostMinorUnits: 2002 }] });
    expect(buildClientPortalCostBreakdownPayload({ currencyCode: "USD", estimates: scoped, groupBy: "supplier" })).toMatchObject({ totalCost: 20.02, buckets: [{ label: "Supplier A", totalCostMinorUnits: 1001 }, { label: "Supplier B", totalCostMinorUnits: 1001 }] });
  });
});
