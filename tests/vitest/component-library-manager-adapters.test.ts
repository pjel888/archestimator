import { describe, expect, it } from "vitest";

import { adaptEstimateRowItemToManagerItem, daysBetween, deriveHealth } from "@/components/workshop/component-library-manager/adapters";
import type { ComponentLibraryManagerItemDraft } from "@/components/workshop/component-library-manager/types";
import type { EstimateRowItem } from "@/components/workshop/estimate-tree-data";

const baseRow: EstimateRowItem = {
  id: "row-1",
  material: "Porcelain Tile",
  description: "Floor finish",
  supplier: "Wilcon Depot",
  source: "library",
  unit: "sqm",
  itemCost: 950,
  quantity: 1,
  subTotal: 950,
  supplementaryCosts: 80,
  laborCost: 120,
  totalItemCosts: 1150,
  category: "Finishes",
  discipline: "Architectural",
  designation: "Floor Finish",
  tags: ["tile", "flooring"],
  pricingSource: "Supplier quote",
  pricingDate: "2026-05-18",
  confidence: "Demo seed",
};

const baseDraft: ComponentLibraryManagerItemDraft = {
  id: "item-1",
  name: "Porcelain Tile",
  kind: "material",
  category: "Finishes",
  supplier: "Wilcon Depot",
  rawSupplier: "Wilcon Depot",
  unit: "sqm",
  unitCost: 950,
  laborCost: 120,
  supplementaryCost: 80,
  pricingSource: "Supplier quote",
  pricingDate: "2026-05-18",
  confidence: "medium",
  description: "Floor finish",
};

describe("component library manager adapters", () => {
  it("converts seed estimate rows into manager items", () => {
    const item = adaptEstimateRowItemToManagerItem(baseRow, new Date("2026-05-21T00:00:00.000Z"));

    expect(item).toMatchObject({
      id: "row-1",
      name: "Porcelain Tile",
      kind: "material",
      category: "Finishes",
      supplier: "Wilcon Depot",
      rawSupplier: "Wilcon Depot",
      unit: "sqm",
      unitCost: 950,
      laborCost: 120,
      supplementaryCost: 80,
      confidence: "Demo seed",
      health: "current",
      tags: ["tile", "flooring"],
    });
    expect(item.healthIssues).toEqual([]);
  });

  it("derives low confidence from seed rows without confidence metadata", () => {
    const item = adaptEstimateRowItemToManagerItem(
      {
        ...baseRow,
        id: "missing-confidence",
        confidence: undefined,
      },
      new Date("2026-05-21T00:00:00.000Z"),
    );

    expect(item.health).toBe("stale");
    expect(item.healthIssues).toEqual(["low-confidence"]);
  });

  it("normalizes missing supplier and category", () => {
    const item = adaptEstimateRowItemToManagerItem(
      {
        ...baseRow,
        id: "missing",
        supplier: "",
        category: "",
      },
      new Date("2026-05-21T00:00:00.000Z"),
    );

    expect(item.supplier).toBe("No supplier");
    expect(item.rawSupplier).toBeNull();
    expect(item.category).toBe("Uncategorized");
  });

  it("derives missing-price, source, date, low-confidence, and stale issues", () => {
    expect(deriveHealth({ ...baseDraft, unitCost: 0 }, new Date("2026-05-21T00:00:00.000Z")).health).toBe("missing");
    expect(deriveHealth({ ...baseDraft, pricingSource: "" }, new Date("2026-05-21T00:00:00.000Z"))).toMatchObject({
      health: "needs-review",
      healthIssues: ["missing-source"],
    });
    expect(deriveHealth({ ...baseDraft, pricingDate: "" }, new Date("2026-05-21T00:00:00.000Z"))).toMatchObject({
      health: "needs-review",
      healthIssues: ["missing-date"],
    });
    expect(deriveHealth({ ...baseDraft, confidence: "" }, new Date("2026-05-21T00:00:00.000Z"))).toMatchObject({
      health: "stale",
      healthIssues: ["low-confidence"],
    });
    expect(deriveHealth({ ...baseDraft, pricingDate: "2025-01-15" }, new Date("2026-05-21T00:00:00.000Z")).healthIssues).toContain("stale-price");
  });

  it("preserves multiple health issues", () => {
    const result = deriveHealth(
      {
        ...baseDraft,
        unitCost: null,
        pricingSource: "",
        pricingDate: "",
        confidence: "",
      },
      new Date("2026-05-21T00:00:00.000Z"),
    );

    expect(result.health).toBe("missing");
    expect(result.healthIssues).toEqual(["missing-price", "missing-source", "missing-date", "low-confidence"]);
  });

  it("counts whole days between pricing dates", () => {
    expect(daysBetween("2026-05-18", "2026-05-21T11:12:05.000Z")).toBe(3);
  });
});
