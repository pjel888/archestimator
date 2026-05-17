import { describe, expect, test } from "bun:test";
import { GridCellKind } from "@glideapps/glide-data-grid";
import type { CostLibraryItem, Estimate } from "@/lib/local-data/schemas";
import { applyEstimateGridEdit, buildEstimateGridRows, getEstimateGridCell, insertLibraryItemAtGridRow, resolveDefaultProposalSectionId, resolveGridInsertionTarget } from "@/lib/estimate-grid/adapter";

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
  proposalSections: [
    { id: "proposal_general", name: "General Requirements", outlineCode: "A", displayInProposal: true },
    { id: "proposal_finishes", name: "Architectural Finishes", outlineCode: "B", displayInProposal: true },
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

  test("marks library-backed grid edits as linked overrides", () => {
    const libraryBackedEstimate: Estimate = {
      ...estimate,
      lineItems: [{ ...estimate.lineItems[0], sourceLibraryItemId: "library_flooring", linkState: "linked-clean" }],
    };

    const next = applyEstimateGridEdit(libraryBackedEstimate, [1, 1], {
      kind: GridCellKind.Text,
      data: "Custom flooring name",
      displayData: "Custom flooring name",
      allowOverlay: true,
    });

    expect(next.lineItems[0].itemName).toBe("Custom flooring name");
    expect(next.lineItems[0].linkState).toBe("linked-overridden");
  });

  test("clamps grid numeric edits to nonnegative values", () => {
    const nextQuantity = applyEstimateGridEdit(estimate, [2, 1], { kind: GridCellKind.Number, data: -5, displayData: "-5", allowOverlay: true });
    const nextUnitCost = applyEstimateGridEdit(estimate, [4, 1], { kind: GridCellKind.Number, data: -900, displayData: "-900", allowOverlay: true });
    const nextWaste = applyEstimateGridEdit(estimate, [5, 1], { kind: GridCellKind.Number, data: -10, displayData: "-10", allowOverlay: true });

    expect(nextQuantity.lineItems[0].quantity).toBe(0);
    expect(nextUnitCost.lineItems[0].unitCost).toBe(0);
    expect(nextWaste.lineItems[0].wastePercent).toBe(0);
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
    expect(next.lineItems[1].proposalSectionId).toBe("proposal_general");
  });

  test("maps inserted rows to the default proposal section", () => {
    expect(resolveDefaultProposalSectionId(estimate)).toBe("proposal_general");
    expect(resolveDefaultProposalSectionId(estimate, "section_1")).toBe("proposal_general");
    const next = insertLibraryItemAtGridRow(estimate, libraryItem, 2);
    expect(next.lineItems[1].proposalSectionId).toBe("proposal_general");
  });

  test("infers proposal section from existing rows in the selected working section", () => {
    const estimateWithGeneralRows: Estimate = {
      ...estimate,
      sections: [
        ...estimate.sections,
        { id: "space_general_conditions", name: "Project-wide", outlineCode: "GEN", sectionType: "custom" },
      ],
      proposalSections: [
        { id: "proposal_section_floor_finishes", name: "Floor Finishes", outlineCode: "A", displayInProposal: true },
        { id: "proposal_section_general_conditions", name: "General Conditions", outlineCode: "B", displayInProposal: true },
      ],
      lineItems: [
        ...estimate.lineItems,
        { ...estimate.lineItems[0], id: "line_gc", sectionId: "space_general_conditions", proposalSectionId: "proposal_section_general_conditions" },
      ],
    };

    expect(resolveDefaultProposalSectionId(estimateWithGeneralRows, "space_general_conditions")).toBe("proposal_section_general_conditions");
  });

  test("section header totals use the same inclusion rules as grand totals", () => {
    const toFollowEstimate: Estimate = {
      ...estimate,
      lineItems: [{ ...estimate.lineItems[0], scopeStatus: "to-follow" }],
    };
    const excludedEstimate: Estimate = {
      ...estimate,
      lineItems: [{ ...estimate.lineItems[0], scopeStatus: "excluded" }],
    };
    const toFollowRows = buildEstimateGridRows(toFollowEstimate);
    const excludedRows = buildEstimateGridRows(excludedEstimate);
    expect(toFollowRows[0]?.kind === "section" ? toFollowRows[0].total : -1).toBe(220);
    expect(excludedRows[0]?.kind === "section" ? excludedRows[0].total : -1).toBe(0);
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
