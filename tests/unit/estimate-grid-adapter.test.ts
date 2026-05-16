import { describe, expect, test } from "bun:test";
import { GridCellKind } from "@glideapps/glide-data-grid";
import type { CostLibraryItem, Estimate } from "@/lib/local-data/schemas";
import { applyEstimateGridEdit, getEstimateGridCell, insertLibraryItemAtGridRow } from "@/lib/estimate-grid/adapter";

const estimate: Estimate = {
  id: "estimate_1",
  projectId: "project_1",
  name: "Test Estimate",
  versionLabel: "Initial",
  versionNumber: 1,
  status: "draft",
  pricingBasisDate: "2026-05-16",
  sections: [{ id: "section_1", name: "General Scope", outlineCode: "A", sectionType: "trade" }],
  lineItems: [
    {
      id: "line_1",
      sectionId: "section_1",
      itemName: "Existing tile",
      quantity: 2,
      unit: "sqm",
      unitCost: 100,
      wastePercent: 10,
      scopeStatus: "included",
      linkState: "manual",
    },
  ],
};

const libraryItem: CostLibraryItem = {
  id: "library_flooring",
  name: "Vinyl plank flooring",
  category: "Flooring",
  itemType: "material",
  unit: "sqm",
  defaultUnitCost: 850,
  defaultWastePercent: 7,
  pricingDate: "2026-05-16",
  sourceType: "supplier-quote",
  sourceName: "Demo supplier",
  confidence: "medium",
  tags: ["flooring"],
};

describe("estimate grid adapter", () => {
  test("maps canonical estimate rows to Glide cells", () => {
    const cell = getEstimateGridCell(estimate, [1, 0]);
    expect(cell.kind).toBe(GridCellKind.Text);
    expect(cell.displayData).toBe("Existing tile");
  });

  test("applies numeric edits back to canonical line items", () => {
    const next = applyEstimateGridEdit(estimate, [2, 0], { kind: GridCellKind.Number, data: 5, displayData: "5", allowOverlay: true });
    expect(next.lineItems[0].quantity).toBe(5);
    expect(estimate.lineItems[0].quantity).toBe(2);
  });

  test("inserts dragged library items as copied editable rows", () => {
    const next = insertLibraryItemAtGridRow(estimate, libraryItem, 1);
    expect(next.lineItems).toHaveLength(2);
    expect(next.lineItems[1].itemName).toBe("Vinyl plank flooring");
    expect(next.lineItems[1].sourceLibraryItemId).toBe("library_flooring");
    expect(next.lineItems[1].wastePercent).toBe(7);
  });
});
