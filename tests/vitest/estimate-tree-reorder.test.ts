import { describe, expect, it } from "vitest";

import type { EstimateTreeNode } from "@/components/workshop/estimate-tree-data";
import {
  ESTIMATE_TREE_SORT_ORDER_STEP,
  buildEstimateNodeReorderPlan,
  evaluateEstimateTreeDrop,
  getDescendantEstimateNodeIds,
  getEstimateTreeStructureSignature,
  mergeEstimateTreeStructureWithCachedNodes,
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
                  miscCost: 250,
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

describe("estimate tree reorder planning", () => {
  it("translates same-parent after-sibling drops into an optimistic sibling reorder", () => {
    const result = evaluateEstimateTreeDrop({
      nodes: fixtureTree(),
      draggedNodeIds: ["kitchen"],
      target: { targetNodeId: "living", position: "after" },
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

  it("translates inside drops into appending inside the target Group Node", () => {
    const result = evaluateEstimateTreeDrop({
      nodes: fixtureTree(),
      draggedNodeIds: ["kitchen"],
      target: { targetNodeId: "site-works", position: "inside" },
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

  it("translates after-last-root drops into appending a valid Group Node at estimate root", () => {
    const result = evaluateEstimateTreeDrop({
      nodes: fixtureTree(),
      draggedNodeIds: ["ground-floor"],
      target: { targetNodeId: "alternates", position: "after" },
    });

    expect(result.ok).toBe(true);
    if (!result.ok) throw new Error(result.message);
    expect(childIds(result.plan.nextNodes, null)).toEqual(["project-scope", "alternates", "ground-floor"]);
    expect(getDescendantEstimateNodeIds(byId(result.plan.nextNodes, "ground-floor"))).toEqual(new Set(["kitchen", "living"]));
  });

  // P6 single-node model: any node may live at root or parent any node. The
  // old kind-based "invalid-parent" rejections are gone; only cycle/self-drop
  // (and server/DB cross-tab) remain.
  it("allows a row-owning node (former area) at estimate root", () => {
    const result = buildEstimateNodeReorderPlan({
      nodes: fixtureTree(),
      draggedNodeId: "kitchen",
      targetParentId: null,
      targetIndex: 2,
    });

    expect(result.ok).toBe(true);
    if (!result.ok) throw new Error(result.message);
    expect(childIds(result.plan.nextNodes, null)).toEqual(["project-scope", "alternates", "kitchen"]);
    // The moved node keeps its own rows at the new root position.
    expect(byId(result.plan.nextNodes, "kitchen").estimateRowItems?.map((row) => row.id)).toEqual([
      "row-kitchen-cabinet",
    ]);
  });

  it("allows dropping a node into a row-owning node (former area)", () => {
    const result = buildEstimateNodeReorderPlan({
      nodes: fixtureTree(),
      draggedNodeId: "living",
      targetParentId: "kitchen",
      targetIndex: 0,
    });

    expect(result.ok).toBe(true);
    if (!result.ok) throw new Error(result.message);
    expect(childIds(result.plan.nextNodes, "kitchen")).toEqual(["living"]);
    // "kitchen" now has BOTH its own rows AND a child node (mixed content).
    expect(byId(result.plan.nextNodes, "kitchen").estimateRowItems?.map((row) => row.id)).toEqual([
      "row-kitchen-cabinet",
    ]);
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

  // P6 regression guard: evaluateEstimateTreeDrop (the gate the sidebar uses)
  // must still reject self/cycle even though every kind-based nesting rule is
  // gone. An "inside" drop onto an ancestor is a cycle; onto self is a self-drop.
  it("still rejects cycle and self drops via evaluateEstimateTreeDrop after the nesting relax", () => {
    const cycleInside = evaluateEstimateTreeDrop({
      nodes: fixtureTree(),
      draggedNodeIds: ["project-scope"],
      target: { targetNodeId: "kitchen", position: "inside" },
    });
    expect(cycleInside).toMatchObject({ ok: false, code: "cycle" });

    const selfInside = evaluateEstimateTreeDrop({
      nodes: fixtureTree(),
      draggedNodeIds: ["kitchen"],
      target: { targetNodeId: "kitchen", position: "inside" },
    });
    expect(selfInside).toMatchObject({ ok: false, code: "self-drop" });
  });

  // P6 empty-target regression fix: a node with NO children (a former leaf
  // area like "living") can now receive a dropped node "inside" it — the
  // planner accepts containment on any node, not just folders.
  it("accepts an inside drop onto a childless node (former leaf area)", () => {
    const result = evaluateEstimateTreeDrop({
      nodes: fixtureTree(),
      draggedNodeIds: ["front-yard"],
      target: { targetNodeId: "living", position: "inside" },
    });
    expect(result.ok).toBe(true);
    if (!result.ok) throw new Error(result.message);
    expect(childIds(result.plan.nextNodes, "living")).toEqual(["front-yard"]);
  });

  it("rejects unknown dragged nodes, unknown targets, multi-drag, and no-op drops", () => {
    expect(buildEstimateNodeReorderPlan({ nodes: fixtureTree(), draggedNodeId: "missing", targetParentId: null, targetIndex: 0 })).toMatchObject({ ok: false, code: "unknown-dragged-node" });
    expect(buildEstimateNodeReorderPlan({ nodes: fixtureTree(), draggedNodeId: "kitchen", targetParentId: "missing", targetIndex: 0 })).toMatchObject({ ok: false, code: "unknown-target-parent" });
    expect(evaluateEstimateTreeDrop({ nodes: fixtureTree(), draggedNodeIds: ["kitchen"], target: { targetNodeId: "missing", position: "after" } })).toMatchObject({ ok: false, code: "unknown-target-parent" });
    expect(evaluateEstimateTreeDrop({ nodes: fixtureTree(), draggedNodeIds: ["kitchen"], target: { targetNodeId: "missing", position: "inside" } })).toMatchObject({ ok: false, code: "unknown-target-parent" });
    expect(evaluateEstimateTreeDrop({ nodes: fixtureTree(), draggedNodeIds: ["kitchen", "living"], target: { targetNodeId: "living", position: "after" } })).toMatchObject({ ok: false, code: "multi-drag-unsupported" });
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

  it("lands mixed-kind siblings exactly at the drop index", () => {
    const result = buildEstimateNodeReorderPlan({
      nodes: fixtureTree(),
      draggedNodeId: "site-works",
      targetParentId: "ground-floor",
      targetIndex: 2,
    });

    expect(result.ok).toBe(true);
    if (!result.ok) throw new Error(result.message);
    expect(childIds(result.plan.nextNodes, "ground-floor")).toEqual(["kitchen", "living", "site-works"]);
    expect(result.plan.updates).toEqual([
      { id: "ground-floor", parentId: "project-scope", sortOrder: ESTIMATE_TREE_SORT_ORDER_STEP },
      { id: "kitchen", parentId: "ground-floor", sortOrder: ESTIMATE_TREE_SORT_ORDER_STEP },
      { id: "living", parentId: "ground-floor", sortOrder: ESTIMATE_TREE_SORT_ORDER_STEP * 2 },
      { id: "site-works", parentId: "ground-floor", sortOrder: ESTIMATE_TREE_SORT_ORDER_STEP * 3 },
    ]);
  });

  it("maps a 'before' drop so an area lands above a sibling group through the UI path", () => {
    // The tree's top-quarter band emits position "before"; this is the path
    // the UI actually takes when dropping a row directly above a group.
    const result = evaluateEstimateTreeDrop({
      nodes: fixtureTree(),
      draggedNodeIds: ["kitchen"],
      target: { targetNodeId: "site-works", position: "before" },
    });

    expect(result.ok).toBe(true);
    if (!result.ok) throw new Error(result.message);
    expect(childIds(result.plan.nextNodes, "project-scope")).toEqual(["ground-floor", "kitchen", "site-works"]);
    expect(result.plan.updates).toEqual([
      { id: "living", parentId: "ground-floor", sortOrder: ESTIMATE_TREE_SORT_ORDER_STEP },
      { id: "ground-floor", parentId: "project-scope", sortOrder: ESTIMATE_TREE_SORT_ORDER_STEP },
      { id: "kitchen", parentId: "project-scope", sortOrder: ESTIMATE_TREE_SORT_ORDER_STEP * 2 },
      { id: "site-works", parentId: "project-scope", sortOrder: ESTIMATE_TREE_SORT_ORDER_STEP * 3 },
    ]);
  });

  it("treats a 'before' drop directly above the node's next sibling as a no-op", () => {
    // Same-parent index adjustment: dropping ground-floor above site-works
    // is where it already sits, and must not produce phantom updates.
    const result = evaluateEstimateTreeDrop({
      nodes: fixtureTree(),
      draggedNodeIds: ["ground-floor"],
      target: { targetNodeId: "site-works", position: "before" },
    });

    expect(result).toMatchObject({ ok: false, code: "no-op" });
  });

  it("lets an area land above a sibling group and persists that order", () => {
    const nodes = [
      node({
        id: "main-house",
        name: "Main House",
        kind: "group",
        children: [
          node({ id: "first-floor", name: "First Floor", kind: "group", children: [] }),
          node({ id: "kitchen", name: "Kitchen", kind: "area", children: [] }),
        ],
      }),
    ];

    const result = buildEstimateNodeReorderPlan({
      nodes,
      draggedNodeId: "kitchen",
      targetParentId: "main-house",
      targetIndex: 0,
    });

    expect(result.ok).toBe(true);
    if (!result.ok) throw new Error(result.message);
    expect(childIds(result.plan.nextNodes, "main-house")).toEqual(["kitchen", "first-floor"]);
    expect(result.plan.updates).toEqual([
      { id: "kitchen", parentId: "main-house", sortOrder: ESTIMATE_TREE_SORT_ORDER_STEP },
      { id: "first-floor", parentId: "main-house", sortOrder: ESTIMATE_TREE_SORT_ORDER_STEP * 2 },
    ]);
  });

  it("applies confirmed tree structure while preserving cached node content", () => {
    const planned = evaluateEstimateTreeDrop({
      nodes: fixtureTree(),
      draggedNodeIds: ["kitchen"],
      target: { targetNodeId: "site-works", position: "inside" },
    });
    expect(planned.ok).toBe(true);
    if (!planned.ok) throw new Error(planned.message);

    const cachedNodes = planned.plan.nextNodes.map((rootNode) => {
      function visit(nodeToMap: EstimateTreeNode): EstimateTreeNode {
        if (nodeToMap.id === "kitchen") {
          return {
            ...nodeToMap,
            estimateRowItems: [
              {
                id: "cached-row-edit",
                material: "Cached Row",
                description: "Still in cache while reorder saves.",
                supplier: "Local cache",
                source: "project",
                unit: "pc",
                itemCost: 100,
                quantity: 1,
                subTotal: 100,
                miscCost: 0,
                totalItemCosts: 100,
                category: "General",
                pricingSource: "Fixture",
                pricingDate: "2026-05-21",
              },
            ],
          };
        }
        return { ...nodeToMap, children: nodeToMap.children?.map(visit) };
      }
      return visit(rootNode);
    });

    const merged = mergeEstimateTreeStructureWithCachedNodes({
      structureNodes: planned.plan.nextNodes,
      cachedNodes,
    });

    expect(childIds(merged, "site-works")).toEqual(["front-yard", "kitchen"]);
    expect(byId(merged, "kitchen").estimateRowItems?.map((row) => row.id)).toEqual(["cached-row-edit"]);
  });
});
