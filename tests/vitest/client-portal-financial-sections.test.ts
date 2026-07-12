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
    expect(buildClientPortalFinancialSummaryPayload({ currencyCode: "USD", estimates })).toMatchObject({ estimateCount: 1, totalCost: 30 });
    expect(buildClientPortalCostBreakdownPayload({ currencyCode: "USD", estimates })).toMatchObject({ totalCost: 30, buckets: [{ label: "Design", totalCost: 20 }, { label: "Build", totalCost: 10 }] });
    const comparison = buildClientPortalEstimateComparisonPayload({ currencyCode: "USD", estimates });
    expect(comparison).toMatchObject({ totalCost: 30, estimates: [{ id: "estimate_1", totalCost: 30 }] });
    expect(JSON.stringify(comparison)).not.toContain("Private");
  });
});
