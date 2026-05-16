import { describe, expect, test } from "bun:test";
import { calculateEstimateTotals } from "@/lib/estimates/totals";
import type { Estimate } from "@/lib/local-data/schemas";

const estimate: Estimate = {
  id: "estimate_1",
  projectId: "project_1",
  name: "Test Estimate",
  versionLabel: "Initial",
  versionNumber: 1,
  status: "draft",
  pricingBasisDate: "2026-05-16",
  sections: [{ id: "section_1", name: "Works", outlineCode: "A", sectionType: "trade" }],
  lineItems: [
    {
      id: "included",
      sectionId: "section_1",
      itemName: "Included work",
      quantity: 2,
      unit: "sqm",
      materialUnitCost: 100,
      laborUnitCost: 50,
      scopeStatus: "included",
      linkState: "manual",
    },
    {
      id: "excluded",
      sectionId: "section_1",
      itemName: "Excluded work",
      quantity: 1,
      unit: "lot",
      unitCost: 1000,
      scopeStatus: "excluded",
      linkState: "manual",
    },
  ],
};

describe("calculateEstimateTotals", () => {
  test("excludes excluded/by-others/not-applicable rows from grand total", () => {
    const totals = calculateEstimateTotals(estimate);

    expect(totals.grandTotal).toBe(300);
    expect(totals.excludedTotal).toBe(1000);
    expect(totals.rowCount).toBe(2);
  });
});
