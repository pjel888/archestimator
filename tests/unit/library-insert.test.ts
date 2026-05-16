import { describe, expect, test } from "bun:test";
import { createLineItemFromLibraryItem, detectLinkStateAfterEdit } from "@/lib/estimates/library-insert";
import type { CostLibraryItem, EstimateLineItem } from "@/lib/local-data/schemas";

const tile: CostLibraryItem = {
  id: "lib_tile",
  name: "Tile 600 x 600",
  category: "Floor Finish",
  itemType: "material",
  unit: "sqm",
  defaultUnitCost: 800,
  defaultLaborUnitCost: 120,
  pricingDate: "2026-05-16",
  source: "Demo library",
};

describe("createLineItemFromLibraryItem", () => {
  test("copies library defaults into an editable linked estimate row", () => {
    const line = createLineItemFromLibraryItem(tile, "section_floor");

    expect(line.sectionId).toBe("section_floor");
    expect(line.itemName).toBe(tile.name);
    expect(line.quantity).toBe(1);
    expect(line.materialUnitCost).toBe(800);
    expect(line.laborUnitCost).toBe(120);
    expect(line.sourceLibraryItemId).toBe(tile.id);
    expect(line.linkState).toBe("linked-clean");
  });
});

describe("detectLinkStateAfterEdit", () => {
  const linkedLine: EstimateLineItem = {
    id: "line_1",
    sectionId: "section_floor",
    itemName: "Tile 600 x 600",
    quantity: 1,
    unit: "sqm",
    materialUnitCost: 800,
    laborUnitCost: 120,
    scopeStatus: "included",
    sourceLibraryItemId: "lib_tile",
    linkState: "linked-clean",
  };

  test("marks pricing edits as linked-overridden", () => {
    expect(detectLinkStateAfterEdit(linkedLine, "materialUnitCost")).toBe("linked-overridden");
  });

  test("keeps quantity edits linked-clean because quantity is project-specific", () => {
    expect(detectLinkStateAfterEdit(linkedLine, "quantity")).toBe("linked-clean");
  });
});
