import { describe, expect, it } from "vitest";

import type { EstimateTreeNode } from "@/components/workshop/estimate-tree-data";
import { estimateRowMutationResultToPatch, patchComponentInstanceRowsInTree, patchEstimateRowItemsInTree } from "@/lib/estimates/estimate-row-tree-patch";

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
  it("maps the authoritative source revision into the reusable row token", () => {
    const updatedAt = "2026-07-13T11:00:00.000Z";
    const patch = estimateRowMutationResultToPatch({
      material: "Updated component",
      description: "Description",
      supplier: "Supplier",
      unit: "each",
      quantity: 1,
      quantityBase: null,
      quantityContingencyAmount: null,
      itemCost: 100,
      contingencyPercentage: 0,
      adjustmentPercentage: 0,
      miscCost: 0,
      sourceSnapshot: { sourceUpdatedAt: updatedAt },
      metadata: {},
      linkState: "linked-clean",
      rowRevision: 2,
    });

    expect(patch.updatedAt).toBe(updatedAt);
  });

  it("applies shared fields only to rows with the target component identity", () => {
    const next = patchComponentInstanceRowsInTree(tree, "row-1", {
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
    expect(patchComponentInstanceRowsInTree(tree, "missing-row", { material: "Ignored" })).toBe(tree);
  });

  it("fans component fields across linked library instances while preserving instance quantities", () => {
    const libraryTree: EstimateTreeNode[] = [{
      ...tree[0],
      estimateRowItems: [
        { ...row("library-row-1", "unused"), source: "library", sourceLibraryItemId: "library-a", linkState: "linked-clean", quantity: 2, miscCost: 10, rowRevision: 1 },
        { ...row("library-row-2", "unused"), source: "library", sourceLibraryItemId: "library-a", linkState: "linked-overridden", quantity: 5, miscCost: 20, rowRevision: 3 },
        { ...row("library-row-detached", "unused"), source: "library", sourceLibraryItemId: "library-a", linkState: "detached", quantity: 6, miscCost: 30, rowRevision: 5 },
        { ...row("library-row-3", "unused"), source: "library", sourceLibraryItemId: "library-b", linkState: "linked-clean", quantity: 7 },
      ],
    }];

    const next = patchComponentInstanceRowsInTree(libraryTree, "library-row-1", {
      material: "Updated library component",
      quantity: 3,
      miscCost: 11,
      updatedAt: "2026-07-13T11:00:00.000Z",
    });

    expect(next[0].estimateRowItems?.map((item) => ({ id: item.id, material: item.material, quantity: item.quantity, miscCost: item.miscCost, updatedAt: item.updatedAt }))).toEqual([
      { id: "library-row-1", material: "Updated library component", quantity: 3, miscCost: 11, updatedAt: "2026-07-13T11:00:00.000Z" },
      { id: "library-row-2", material: "Updated library component", quantity: 5, miscCost: 20, updatedAt: "2026-07-13T11:00:00.000Z" },
      { id: "library-row-detached", material: "Original", quantity: 6, miscCost: 30, updatedAt: undefined },
      { id: "library-row-3", material: "Original", quantity: 7, miscCost: 0, updatedAt: undefined },
    ]);

    const revised = patchEstimateRowItemsInTree(next, {
      "library-row-1": { rowRevision: 2 },
      "library-row-2": { rowRevision: 4 },
    });
    expect(revised[0].estimateRowItems?.map((item) => item.rowRevision)).toEqual([2, 4, 5, undefined]);
  });
});
