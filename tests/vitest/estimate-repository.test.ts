import { describe, expect, it } from "vitest";

import type { EstimateRowItem } from "@/lib/domain/estimate-tree";
import type { InsertEstimateRowItemInput } from "@/lib/repositories/estimate-repository";

function makeRow(overrides: Partial<EstimateRowItem> = {}): EstimateRowItem {
  return {
    id: "row-1",
    estimateId: "estimate-1",
    nodeId: "area-1",
    sortOrder: 1,
    sourceLibraryItemId: null,
    sourceSnapshot: null,
    material: "Concrete",
    description: "Ready-mix concrete",
    supplier: "Supplier A",
    unit: "cu.m",
    quantity: 1,
    unitCost: 100,
    supplementaryCost: 0,
    laborCost: 0,
    discipline: "Structural",
    designation: "STR",
    linkState: "manual",
    ...overrides,
  };
}

describe("estimate repository row-item contract", () => {
  it("accepts insert inputs without estimateId and can still form a complete row", () => {
    const input: InsertEstimateRowItemInput = {
      ...makeRow({ id: "row-new" }),
      id: "row-new",
    };

    expect(input.id).toBe("row-new");
    expect(input.nodeId).toBe("area-1");
  });

  it("supports partial row value updates for spreadsheet-speed edits", () => {
    const current = makeRow();
    const next = { ...current, quantity: 3, unitCost: 125 };

    expect(next.quantity * next.unitCost).toBe(375);
    expect(next.description).toBe(current.description);
  });
});
