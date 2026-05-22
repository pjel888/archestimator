import { describe, expect, it } from "vitest";

import type { EstimateTreeNode } from "@/components/workshop/estimate-tree-data";
import {
  getEstimateTreeNodeAndDescendantIds,
  planEstimateTreeDelete,
  renameEstimateTreeNode,
} from "@/lib/estimates/estimate-tree-edit";

function fixtureTree(): EstimateTreeNode[] {
  return [
    {
      id: "project-scope",
      name: "Project Scope",
      kind: "group",
      total: "₱0.00",
      children: [
        {
          id: "ground-floor",
          name: "Ground Floor",
          kind: "group",
          total: "₱0.00",
          children: [
            {
              id: "kitchen",
              name: "Kitchen",
              kind: "area",
              total: "₱1.00",
              estimateRowItems: [
                {
                  id: "row-1",
                  material: "Tile",
                  description: "Floor tile",
                  supplier: "Supplier",
                  source: "project",
                  unit: "sqm",
                  itemCost: 10,
                  quantity: 2,
                  subTotal: 20,
                  miscCost: 4,
                  totalItemCosts: 24,
                  category: "Finishes",
                  pricingSource: "Quote",
                  pricingDate: "2026-05-21",
                },
              ],
              children: [],
            },
            {
              id: "living",
              name: "Living Area",
              kind: "area",
              total: "₱0.00",
              estimateRowItems: [],
              children: [],
            },
          ],
        },
        {
          id: "site-works",
          name: "Site Works",
          kind: "group",
          total: "₱0.00",
          children: [
            {
              id: "front-yard",
              name: "Front Yard",
              kind: "area",
              total: "₱0.00",
              estimateRowItems: [],
              children: [],
            },
          ],
        },
      ],
    },
    {
      id: "phase-two",
      name: "Phase Two",
      kind: "group",
      total: "₱0.00",
      children: [],
    },
  ];
}

function ids(nodes: EstimateTreeNode[]): string[] {
  return nodes.flatMap((node) => [node.id, ...ids(node.children ?? [])]);
}

describe("estimate tree edit helpers", () => {
  it("renames only the target node and preserves children", () => {
    const tree = fixtureTree();
    const renamed = renameEstimateTreeNode(tree, "ground-floor", "Level 1");

    expect(renamed[0]?.children?.[0]?.name).toBe("Level 1");
    expect(renamed[0]?.name).toBe("Project Scope");
    expect(renamed[0]?.children?.[0]?.children?.map((child) => child.id)).toEqual(["kitchen", "living"]);
  });

  it("preserves row items and metadata when renaming an Area Node", () => {
    const tree = fixtureTree();
    const renamed = renameEstimateTreeNode(tree, "kitchen", "Chef Kitchen");
    const kitchen = renamed[0]?.children?.[0]?.children?.[0];

    expect(kitchen).toMatchObject({
      id: "kitchen",
      name: "Chef Kitchen",
      kind: "area",
      total: "₱1.00",
    });
    expect(kitchen?.estimateRowItems).toEqual(tree[0]?.children?.[0]?.children?.[0]?.estimateRowItems);
  });

  it("collects a node id and all deeply nested descendant ids", () => {
    expect(Array.from(getEstimateTreeNodeAndDescendantIds(fixtureTree(), "project-scope")).sort()).toEqual([
      "front-yard",
      "ground-floor",
      "kitchen",
      "living",
      "project-scope",
      "site-works",
    ]);
  });

  it("deleting an Area Node removes only that Area Node", () => {
    const plan = planEstimateTreeDelete(fixtureTree(), "kitchen", "kitchen");

    expect(ids(plan.nextNodes)).toEqual(["project-scope", "ground-floor", "living", "site-works", "front-yard", "phase-two"]);
    expect(Array.from(plan.deletedNodeIds)).toEqual(["kitchen"]);
  });

  it("deleting a Group Node removes descendants and reports descendant ids", () => {
    const plan = planEstimateTreeDelete(fixtureTree(), "ground-floor", "ground-floor");

    expect(ids(plan.nextNodes)).toEqual(["project-scope", "site-works", "front-yard", "phase-two"]);
    expect(Array.from(plan.deletedNodeIds).sort()).toEqual(["ground-floor", "kitchen", "living"]);
  });

  it("fallback prefers the next sibling", () => {
    const plan = planEstimateTreeDelete(fixtureTree(), "kitchen", "kitchen");

    expect(plan.fallbackNodeId).toBe("living");
  });

  it("fallback uses the previous sibling when no next sibling exists", () => {
    const plan = planEstimateTreeDelete(fixtureTree(), "living", "living");

    expect(plan.fallbackNodeId).toBe("kitchen");
  });

  it("fallback uses the parent when no sibling remains", () => {
    const plan = planEstimateTreeDelete(fixtureTree(), "front-yard", "front-yard");

    expect(plan.fallbackNodeId).toBe("site-works");
  });

  it("fallback uses the first remaining visible node when no deleted-node fallback exists", () => {
    const tree: EstimateTreeNode[] = [
      {
        id: "only-root",
        name: "Only Root",
        kind: "group",
        total: "₱0.00",
        children: [],
      },
    ];
    const plan = planEstimateTreeDelete(tree, "missing-node", null);

    expect(plan.fallbackNodeId).toBe("only-root");
    expect(plan.nextNodes).toBe(tree);
  });

  it("fallback returns null when the tree becomes empty", () => {
    const tree: EstimateTreeNode[] = [
      {
        id: "only-root",
        name: "Only Root",
        kind: "group",
        total: "₱0.00",
        children: [],
      },
    ];
    const plan = planEstimateTreeDelete(tree, "only-root", "only-root");

    expect(plan.nextNodes).toEqual([]);
    expect(plan.fallbackNodeId).toBeNull();
  });
});
