import { describe, expect, test } from "bun:test";
import { GridCellKind } from "@glideapps/glide-data-grid";
import type { CostLibraryItem, Estimate } from "@/lib/local-data/schemas";
import { applyEstimateGridEdit, buildEstimateGridRows, getEstimateGridCell, insertLibraryItemAtGridRow, resolveGridInsertionTarget } from "@/lib/estimate-grid/adapter";

const estimate: Estimate = {
  id: "estimate_1",
  projectId: "project_1",
  name: "Test Estimate",
  versionLabel: "Initial",
  versionNumber: 1,
  status: "draft",
  pricingBasisDate: "2026-05-16",
  sections: [
    { id: "section_1", name: "Ground Floor · Living Room", outlineCode: "GF-01", sectionType: "area" },
    { id: "section_2", name: "Second Floor · Bedroom", outlineCode: "2F-01", sectionType: "area" },
  ],
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
  source: "Demo supplier",
};

describe("estimate grid adapter", () => {
  test("builds section header rows plus canonical line rows", () => {
    const rows = buildEstimateGridRows(estimate);
    expect(rows.map((row) => row.kind)).toEqual(["section", "line", "section"]);
  });

  test("maps canonical estimate rows to Glide cells", () => {
    const cell = getEstimateGridCell(estimate, [1, 1]);
    expect(cell.kind).toBe(GridCellKind.Text);
    expect(cell.displayData).toBe("Existing tile");
  });

  test("applies numeric edits back to canonical line items", () => {
    const next = applyEstimateGridEdit(estimate, [2, 1], { kind: GridCellKind.Number, data: 5, displayData: "5", allowOverlay: true });
    expect(next.lineItems[0].quantity).toBe(5);
    expect(estimate.lineItems[0].quantity).toBe(2);
  });

  test("applies unit cost edits to material cost when material cost drives totals", () => {
    const materialBackedEstimate: Estimate = {
      ...estimate,
      lineItems: [{ ...estimate.lineItems[0], unitCost: undefined, materialUnitCost: 850 }],
    };
    const next = applyEstimateGridEdit(materialBackedEstimate, [4, 1], {
      kind: GridCellKind.Number,
      data: 900,
      displayData: "900",
      allowOverlay: true,
    });
    expect(next.lineItems[0].materialUnitCost).toBe(900);
    expect(next.lineItems[0].unitCost).toBeUndefined();
    expect(getEstimateGridCell(next, [6, 1]).displayData).toContain("1,980");
  });

  test("ignores edits against section header rows", () => {
    const next = applyEstimateGridEdit(estimate, [1, 0], { kind: GridCellKind.Text, data: "Wrong", displayData: "Wrong", allowOverlay: true });
    expect(next).toBe(estimate);
  });

  test("resolves visual drop row to section-aware insertion target", () => {
    const rows = buildEstimateGridRows(estimate);
    expect(resolveGridInsertionTarget(estimate, rows, 0)).toEqual({ sectionId: "section_1", lineItemIndex: 0 });
    expect(resolveGridInsertionTarget(estimate, rows, 2)).toEqual({ sectionId: "section_2", lineItemIndex: estimate.lineItems.length });
    expect(resolveGridInsertionTarget(estimate, rows, rows.length)).toEqual({ sectionId: "section_2", lineItemIndex: estimate.lineItems.length });
  });

  test("inserts dragged library items as copied editable rows", () => {
    const next = insertLibraryItemAtGridRow(estimate, libraryItem, 2);
    expect(next.lineItems).toHaveLength(2);
    expect(next.lineItems[1].sectionId).toBe("section_2");
    expect(next.lineItems[1].itemName).toBe("Vinyl plank flooring");
    expect(next.lineItems[1].sourceLibraryItemId).toBe("library_flooring");
    expect(next.lineItems[1].wastePercent).toBe(7);
  });

  test("appends after the final visible line row", () => {
    const populatedEstimate: Estimate = {
      ...estimate,
      sections: [{ id: "section_1", name: "Ground Floor · Living Room", outlineCode: "GF-01", sectionType: "area" }],
      lineItems: [
        estimate.lineItems[0],
        { ...estimate.lineItems[0], id: "line_2", itemName: "Second item" },
      ],
    };
    const rows = buildEstimateGridRows(populatedEstimate);
    const next = insertLibraryItemAtGridRow(populatedEstimate, libraryItem, rows.length);
    expect(next.lineItems).toHaveLength(3);
    expect(next.lineItems[2].itemName).toBe("Vinyl plank flooring");
  });
});
