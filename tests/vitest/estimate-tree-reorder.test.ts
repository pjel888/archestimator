import { describe, expect, it } from "vitest";
import type { DraggingPosition } from "react-complex-tree";

import type { EstimateTreeNode } from "@/components/workshop/estimate-tree-data";
import {
  ESTIMATE_TREE_ROOT_ITEM_ID,
  ESTIMATE_TREE_SORT_ORDER_STEP,
  buildEstimateNodeReorderPlan,
  evaluateEstimateTreeDrop,
  getDescendantEstimateNodeIds,
  getEstimateTreeStructureSignature,
} from "@/lib/estimates/estimate-tree-reorder";

function node(input: Omit<EstimateTreeNode, "total"> & { total?: string }): EstimateTreeNode {
  return { total: "₱0.00", ...input };
}

function fixtureTree(): EstimateTreeNode[] {
  return [
    node({
      id: "project-scope",
      name: "Project Scope",
      kind: "group",
      children: [
        node({
          id: "ground-floor",
          name: "Ground Floor",
          kind: "group",
          children: [
            node({
              id: "kitchen",
              name: "Kitchen",
              kind: "area",
              estimateRowItems: [
                {
                  id: "row-kitchen-cabinet",
                  material: "Base Cabinet",
                  description: "Cabinet run",
                  supplier: "Local shop",
                  source: "project",
                  unit: "lm",
                  itemCost: 1000,
                  quantity: 1,
                  subTotal: 1000,
                  supplementaryCosts: 0,
                  laborCost: 250,
                  totalItemCosts: 1250,
                  category: "Cabinetry",
                  pricingSource: "Fixture",
                  pricingDate: "2026-05-20",
                },
              ],
              children: [],
            }),
            node({ id: "living", name: "Living Area", kind: "area", children: [] }),
          ],
        }),
        node({
          id: "site-works",
          name: "Site Works",
          kind: "group",
          children: [node({ id: "front-yard", name: "Front Yard", kind: "area", children: [] })],
        }),
      ],
    }),
    node({ id: "alternates", name: "Alternates", kind: "group", children: [] }),
  ];
}

function childIds(nodes: EstimateTreeNode[], parentId: string | null): string[] {
  const roots = nodes;
  if (parentId === null) return roots.map((item) => item.id);

  const stack = [...roots];
  while (stack.length > 0) {
    const current = stack.shift()!;
    if (current.id === parentId) return current.children?.map((child) => child.id) ?? [];
    stack.push(...(current.children ?? []));
  }
  throw new Error(`Parent ${parentId} not found.`);
}

function byId(nodes: EstimateTreeNode[], id: string): EstimateTreeNode {
  const stack = [...nodes];
  while (stack.length > 0) {
    const current = stack.shift()!;
    if (current.id === id) return current;
    stack.push(...(current.children ?? []));
  }
  throw new Error(`Node ${id} not found.`);
}

function between(parentItem: string, childIndex: number): DraggingPosition {
  return {
    targetType: "between-items",
    treeId: "estimate-sheet-tree",
    parentItem,
    childIndex,
    linePosition: "bottom",
    linearIndex: 0,
    depth: 2,
  };
}

describe("estimate tree reorder planning", () => {
  it("translates same-parent RCT between-items drops into an optimistic sibling reorder", () => {
    const result = evaluateEstimateTreeDrop({
      nodes: fixtureTree(),
      draggedItemIds: ["kitchen"],
      target: between("ground-floor", 2),
    });

    expect(result.ok).toBe(true);
    if (!result.ok) throw new Error(result.message);
    expect(childIds(result.plan.nextNodes, "ground-floor")).toEqual(["living", "kitchen"]);
    expect(result.plan.targetParentId).toBe("ground-floor");
    expect(result.plan.affectedParentIds).toEqual(["ground-floor"]);
    expect(result.plan.updates).toEqual([
      { id: "living", parentId: "ground-floor", sortOrder: ESTIMATE_TREE_SORT_ORDER_STEP },
      { id: "kitchen", parentId: "ground-floor", sortOrder: ESTIMATE_TREE_SORT_ORDER_STEP * 2 },
    ]);
  });

  it("translates RCT item drops into appending inside the target Group Node", () => {
    const result = evaluateEstimateTreeDrop({
      nodes: fixtureTree(),
      draggedItemIds: ["kitchen"],
      target: {
        targetType: "item",
        treeId: "estimate-sheet-tree",
        targetItem: "site-works",
        parentItem: "project-scope",
        linearIndex: 0,
        depth: 1,
      },
    });

    expect(result.ok).toBe(true);
    if (!result.ok) throw new Error(result.message);
    expect(childIds(result.plan.nextNodes, "ground-floor")).toEqual(["living"]);
    expect(childIds(result.plan.nextNodes, "site-works")).toEqual(["front-yard", "kitchen"]);
    expect(byId(result.plan.nextNodes, "kitchen").estimateRowItems?.map((row) => row.id)).toEqual(["row-kitchen-cabinet"]);
    expect(result.plan.updates).toEqual([
      { id: "living", parentId: "ground-floor", sortOrder: ESTIMATE_TREE_SORT_ORDER_STEP },
      { id: "front-yard", parentId: "site-works", sortOrder: ESTIMATE_TREE_SORT_ORDER_STEP },
      { id: "kitchen", parentId: "site-works", sortOrder: ESTIMATE_TREE_SORT_ORDER_STEP * 2 },
    ]);
  });

  it("translates RCT root drops into appending a valid Group Node at estimate root", () => {
    const result = evaluateEstimateTreeDrop({
      nodes: fixtureTree(),
      draggedItemIds: ["ground-floor"],
      target: {
        targetType: "root",
        treeId: "estimate-sheet-tree",
        targetItem: ESTIMATE_TREE_ROOT_ITEM_ID,
        linearIndex: 0,
        depth: 0,
      },
    });

    expect(result.ok).toBe(true);
    if (!result.ok) throw new Error(result.message);
    expect(childIds(result.plan.nextNodes, null)).toEqual(["project-scope", "alternates", "ground-floor"]);
    expect(getDescendantEstimateNodeIds(byId(result.plan.nextNodes, "ground-floor"))).toEqual(new Set(["kitchen", "living"]));
  });

  it("rejects Area Nodes at estimate root", () => {
    const result = buildEstimateNodeReorderPlan({
      nodes: fixtureTree(),
      draggedNodeId: "kitchen",
      targetParentId: null,
      targetIndex: 2,
    });

    expect(result.ok).toBe(false);
    if (result.ok) throw new Error("Expected root area move to be rejected.");
    expect(result.code).toBe("invalid-parent");
  });

  it("rejects Area Nodes as drop parents", () => {
    const result = buildEstimateNodeReorderPlan({
      nodes: fixtureTree(),
      draggedNodeId: "living",
      targetParentId: "kitchen",
      targetIndex: 0,
    });

    expect(result.ok).toBe(false);
    if (result.ok) throw new Error("Expected area parent to be rejected.");
    expect(result.code).toBe("invalid-parent");
  });

  it("rejects self drops and descendant cycle drops", () => {
    const selfDrop = buildEstimateNodeReorderPlan({
      nodes: fixtureTree(),
      draggedNodeId: "site-works",
      targetParentId: "site-works",
      targetIndex: 0,
    });
    const cycleDrop = buildEstimateNodeReorderPlan({
      nodes: fixtureTree(),
      draggedNodeId: "project-scope",
      targetParentId: "ground-floor",
      targetIndex: 0,
    });

    expect(selfDrop.ok).toBe(false);
    if (selfDrop.ok) throw new Error("Expected self drop to be rejected.");
    expect(selfDrop.code).toBe("self-drop");
    expect(cycleDrop.ok).toBe(false);
    if (cycleDrop.ok) throw new Error("Expected cycle drop to be rejected.");
    expect(cycleDrop.code).toBe("cycle");
  });

  it("rejects unknown dragged nodes, unknown targets, synthetic root drags, multi-drag, and no-op drops", () => {
    expect(buildEstimateNodeReorderPlan({ nodes: fixtureTree(), draggedNodeId: "missing", targetParentId: null, targetIndex: 0 })).toMatchObject({ ok: false, code: "unknown-dragged-node" });
    expect(buildEstimateNodeReorderPlan({ nodes: fixtureTree(), draggedNodeId: "kitchen", targetParentId: "missing", targetIndex: 0 })).toMatchObject({ ok: false, code: "unknown-target-parent" });
    expect(evaluateEstimateTreeDrop({ nodes: fixtureTree(), draggedItemIds: [ESTIMATE_TREE_ROOT_ITEM_ID], target: between("ground-floor", 0) })).toMatchObject({ ok: false, code: "synthetic-root-drag" });
    expect(evaluateEstimateTreeDrop({ nodes: fixtureTree(), draggedItemIds: ["kitchen", "living"], target: between("ground-floor", 2) })).toMatchObject({ ok: false, code: "multi-drag-unsupported" });
    expect(buildEstimateNodeReorderPlan({ nodes: fixtureTree(), draggedNodeId: "kitchen", targetParentId: "ground-floor", targetIndex: 0 })).toMatchObject({ ok: false, code: "no-op" });
  });

  it("preserves a stable structural signature for confirmed local reorders", () => {
    const initial = fixtureTree();
    const result = buildEstimateNodeReorderPlan({
      nodes: initial,
      draggedNodeId: "site-works",
      targetParentId: "ground-floor",
      targetIndex: 0,
    });

    expect(result.ok).toBe(true);
    if (!result.ok) throw new Error(result.message);
    expect(getEstimateTreeStructureSignature(result.plan.nextNodes)).not.toBe(getEstimateTreeStructureSignature(initial));
    expect(getEstimateTreeStructureSignature(result.plan.nextNodes)).toContain("ground-floor/site-works:group");
  });
});
