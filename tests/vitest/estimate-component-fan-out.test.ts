import { describe, expect, it } from "vitest";

import type { EstimateTreeNode } from "@/components/workshop/estimate-tree-data";
import { patchProjectComponentInstanceRowsInTree } from "@/lib/estimates/estimate-row-tree-patch";

function row(id: string, componentId: string, material = "Original") {
  return {
    id,
    material,
    description: material,
    supplier: "Supplier",
    source: "project" as const,
    unit: "each",
    itemCost: 100,
    quantity: 1,
    subTotal: 100,
    miscCost: 0,
    totalItemCosts: 100,
    category: "Fixtures",
    pricingSource: "Project estimate row",
    pricingDate: "2026-07-11",
    metadata: {
      projectComponentProjection: {
        projectId: "project-1",
        classification: "express",
        componentId,
      },
    },
  };
}

const tree: EstimateTreeNode[] = [{
  id: "area-1",
  name: "Area",
  kind: "area",
  total: "PHP 0.00",
  estimateRowItems: [row("row-1", "component-a"), row("row-2", "component-a"), row("row-3", "component-b")],
}];

describe("estimate project-component fan-out", () => {
  it("applies shared fields only to rows with the target component identity", () => {
    const next = patchProjectComponentInstanceRowsInTree(tree, "row-1", {
      material: "Updated component",
      quantity: 4,
    });
    const items = next[0].estimateRowItems ?? [];

    expect(items.map((item) => ({ id: item.id, material: item.material, quantity: item.quantity }))).toEqual([
      { id: "row-1", material: "Updated component", quantity: 4 },
      { id: "row-2", material: "Updated component", quantity: 1 },
      { id: "row-3", material: "Original", quantity: 1 },
    ]);
  });

  it("returns the original tree when no target row exists", () => {
    expect(patchProjectComponentInstanceRowsInTree(tree, "missing-row", { material: "Ignored" })).toBe(tree);
  });
});
