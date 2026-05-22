import { describe, expect, it } from "vitest";

import type { EstimateTreeNode } from "@/components/workshop/estimate-tree-data";
import { findEstimateRowItemInTree, patchEstimateRowItemInTree } from "@/lib/estimates/estimate-row-tree-patch";

const tree: EstimateTreeNode[] = [
  {
    id: "group-1",
    name: "Group",
    kind: "group",
    total: "PHP 0.00",
    children: [
      {
        id: "area-1",
        name: "Area",
        kind: "area",
        total: "PHP 0.00",
        estimateRowItems: [
          {
            id: "row-1",
            material: "Hardwood Oak Flooring",
            description: "Floor finish",
            supplier: "Local supplier",
            source: "project",
            unit: "sq.m.",
            itemCost: 1200,
            quantity: 2,
            subTotal: 2400,
            miscCost: 50,
            totalItemCosts: 2450,
            category: "Finishes",
            pricingSource: "Estimate row snapshot",
            pricingDate: "2026-05-22",
          },
        ],
      },
    ],
  },
];

describe("patchEstimateRowItemInTree", () => {
  it("patches a nested row and recomputes totals", () => {
    const nextTree = patchEstimateRowItemInTree(tree, "row-1", { quantity: 7 });
    const row = nextTree[0].children?.[0].estimateRowItems?.[0];

    expect(nextTree).not.toBe(tree);
    expect(row?.quantity).toBe(7);
    expect(row?.subTotal).toBe(8400);
    expect(row?.totalItemCosts).toBe(8450);
  });

  it("returns the original tree when the row is absent", () => {
    expect(patchEstimateRowItemInTree(tree, "missing-row", { quantity: 7 })).toBe(tree);
  });

  it("patches misc cost without changing quantity", () => {
    const nextTree = patchEstimateRowItemInTree(tree, "row-1", { miscCost: 400 });
    const row = nextTree[0].children?.[0].estimateRowItems?.[0];

    expect(row?.quantity).toBe(2);
    expect(row?.subTotal).toBe(2400);
    expect(row?.miscCost).toBe(400);
    expect(row?.totalItemCosts).toBe(2800);
  });

  it("finds nested row items", () => {
    expect(findEstimateRowItemInTree(tree, "row-1")?.material).toBe("Hardwood Oak Flooring");
    expect(findEstimateRowItemInTree(tree, "missing-row")).toBeNull();
  });

  it("preserves unrelated branch identity", () => {
    const separateArea = {
      id: "area-2",
      name: "Other Area",
      kind: "area" as const,
      total: "PHP 0.00",
      estimateRowItems: [],
    };
    const branchedTree = [{ ...tree[0], children: [...(tree[0].children ?? []), separateArea] }];
    const nextTree = patchEstimateRowItemInTree(branchedTree, "row-1", { quantity: 3 });

    expect(nextTree[0].children?.[1]).toBe(separateArea);
  });
});
