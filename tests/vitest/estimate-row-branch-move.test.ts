import { describe, expect, it } from "vitest";

import type { EstimateRowItem, EstimateTreeNode } from "@/components/workshop/estimate-tree-data";
import { applyEstimateRowItemMoveResultToTree, moveEstimateRowItemInTree } from "@/lib/estimates/estimate-row-tree-move";

function row(id: string, rowRevision = Number(id.replace(/\D/g, "")) || 1, sortOrder?: number): EstimateRowItem {
  return {
    id,
    ...(sortOrder === undefined ? {} : { sortOrder }),
    material: `Material ${id}`,
    description: `Description ${id}`,
    supplier: "Supplier",
    source: "project",
    unit: "pc",
    itemCost: 100,
    quantity: 1,
    subTotal: 100,
    miscCost: 0,
    totalItemCosts: 100,
    category: "General",
    pricingSource: "Test",
    pricingDate: "2026-06-27",
    rowRevision,
  };
}

function node(id: string, estimateRowItems: EstimateRowItem[] = [], children: EstimateTreeNode[] = []): EstimateTreeNode {
  return {
    id,
    name: id,
    kind: "area",
    total: "PHP 0.00",
    estimateRowItems,
    children,
  };
}

function rowIds(tree: EstimateTreeNode[], nodeId: string): string[] {
  const found = findNode(tree, nodeId);
  return found?.estimateRowItems?.map((item) => item.id) ?? [];
}

function findNode(nodes: EstimateTreeNode[], nodeId: string): EstimateTreeNode | null {
  for (const current of nodes) {
    if (current.id === nodeId) return current;
    const child = findNode(current.children ?? [], nodeId);
    if (child) return child;
  }
  return null;
}

function deepFreeze<T>(value: T): T {
  if (value && typeof value === "object") {
    Object.freeze(value);
    for (const nested of Object.values(value)) deepFreeze(nested);
  }
  return value;
}

describe("moveEstimateRowItemInTree", () => {
  it("reorders a row within the same branch from a lower index to a higher index", () => {
    const tree = [node("living", [row("row-1", 11), row("row-2", 12), row("row-3", 13), row("row-4", 14)])];

    const result = moveEstimateRowItemInTree({
      tree,
      rowItemId: "row-1",
      sourceNodeId: "living",
      targetNodeId: "living",
      targetIndex: 3,
    });

    expect(result.status).toBe("moved");
    expect(rowIds(result.tree, "living")).toEqual(["row-2", "row-3", "row-1", "row-4"]);
    expect(result.affectedRowUpdates).toEqual([
      { rowId: "row-2", nodeId: "living", sortOrder: 0, expectedRowRevision: 12 },
      { rowId: "row-3", nodeId: "living", sortOrder: 1, expectedRowRevision: 13 },
      { rowId: "row-1", nodeId: "living", sortOrder: 2, expectedRowRevision: 11 },
    ]);
  });

  it("reorders a row within the same branch from a higher index to a lower index", () => {
    const tree = [node("living", [row("row-1", 11), row("row-2", 12), row("row-3", 13)])];

    const result = moveEstimateRowItemInTree({
      tree,
      rowItemId: "row-3",
      sourceNodeId: "living",
      targetNodeId: "living",
      targetIndex: 0,
    });

    expect(result.status).toBe("moved");
    expect(rowIds(result.tree, "living")).toEqual(["row-3", "row-1", "row-2"]);
    expect(result.affectedRowUpdates).toEqual([
      { rowId: "row-3", nodeId: "living", sortOrder: 0, expectedRowRevision: 13 },
      { rowId: "row-1", nodeId: "living", sortOrder: 1, expectedRowRevision: 11 },
      { rowId: "row-2", nodeId: "living", sortOrder: 2, expectedRowRevision: 12 },
    ]);
  });

  it("moves a row to the top, middle, and bottom of another branch with dense updates", () => {
    const sourceRows = [row("source-1", 21), row("source-2", 22), row("source-3", 23)];
    const targetRows = [row("target-1", 31), row("target-2", 32)];

    const toTop = moveEstimateRowItemInTree({
      tree: [node("source", sourceRows), node("target", targetRows)],
      rowItemId: "source-2",
      sourceNodeId: "source",
      targetNodeId: "target",
      targetIndex: 0,
    });

    expect(rowIds(toTop.tree, "source")).toEqual(["source-1", "source-3"]);
    expect(rowIds(toTop.tree, "target")).toEqual(["source-2", "target-1", "target-2"]);
    expect(toTop.affectedRowUpdates).toEqual([
      { rowId: "source-3", nodeId: "source", sortOrder: 1, expectedRowRevision: 23 },
      { rowId: "source-2", nodeId: "target", sortOrder: 0, expectedRowRevision: 22 },
      { rowId: "target-1", nodeId: "target", sortOrder: 1, expectedRowRevision: 31 },
      { rowId: "target-2", nodeId: "target", sortOrder: 2, expectedRowRevision: 32 },
    ]);

    const toMiddle = moveEstimateRowItemInTree({
      tree: [node("source", sourceRows), node("target", targetRows)],
      rowItemId: "source-2",
      sourceNodeId: "source",
      targetNodeId: "target",
      targetIndex: 1,
    });

    expect(rowIds(toMiddle.tree, "target")).toEqual(["target-1", "source-2", "target-2"]);
    expect(toMiddle.affectedRowUpdates.map((update) => `${update.rowId}:${update.nodeId}:${update.sortOrder}`)).toEqual([
      "source-3:source:1",
      "source-2:target:1",
      "target-2:target:2",
    ]);

    const toBottom = moveEstimateRowItemInTree({
      tree: [node("source", sourceRows), node("target", targetRows)],
      rowItemId: "source-2",
      sourceNodeId: "source",
      targetNodeId: "target",
      targetIndex: 99,
    });

    expect(rowIds(toBottom.tree, "target")).toEqual(["target-1", "target-2", "source-2"]);
    expect(toBottom.affectedRowUpdates.map((update) => `${update.rowId}:${update.nodeId}:${update.sortOrder}`)).toEqual([
      "source-3:source:1",
      "source-2:target:2",
    ]);
  });

  it("uses stored sort order to normalize sparse persisted sibling rows", () => {
    const sourceRows = [row("source-1", 21, 10), row("source-2", 22, 20)];
    const targetRows = [row("target-1", 31, 10)];

    const result = moveEstimateRowItemInTree({
      tree: [node("source", sourceRows), node("target", targetRows)],
      rowItemId: "source-1",
      sourceNodeId: "source",
      targetNodeId: "target",
      targetIndex: 1,
    });

    expect(result.status).toBe("moved");
    expect(result.affectedRowUpdates).toEqual([
      { rowId: "source-2", nodeId: "source", sortOrder: 0, expectedRowRevision: 22 },
      { rowId: "target-1", nodeId: "target", sortOrder: 0, expectedRowRevision: 31 },
      { rowId: "source-1", nodeId: "target", sortOrder: 1, expectedRowRevision: 21 },
    ]);
    expect(findNode(result.tree, "target")?.estimateRowItems?.map((item) => item.sortOrder)).toEqual([0, 1]);
  });

  it("appends to an empty target branch", () => {
    const result = moveEstimateRowItemInTree({
      tree: [node("source", [row("row-1", 41)]), node("target", [])],
      rowItemId: "row-1",
      sourceNodeId: "source",
      targetNodeId: "target",
      targetIndex: 0,
    });

    expect(result.status).toBe("moved");
    expect(rowIds(result.tree, "source")).toEqual([]);
    expect(rowIds(result.tree, "target")).toEqual(["row-1"]);
    expect(result.affectedRowUpdates).toEqual([{ rowId: "row-1", nodeId: "target", sortOrder: 0, expectedRowRevision: 41 }]);
  });

  it("returns noop for a same-branch move that resolves to the current position", () => {
    const tree = [node("living", [row("row-1", 51), row("row-2", 52)])];

    const result = moveEstimateRowItemInTree({
      tree,
      rowItemId: "row-1",
      sourceNodeId: "living",
      targetNodeId: "living",
      targetIndex: 1,
    });

    expect(result.status).toBe("noop");
    expect(result.tree).toBe(tree);
    expect(result.affectedRowUpdates).toEqual([]);
  });

  it("reports missing source row, missing source node, missing target node, and optimistic ids", () => {
    const tree = [node("source", [row("row-1")]), node("target")];

    expect(moveEstimateRowItemInTree({ tree, rowItemId: "missing", sourceNodeId: "source", targetNodeId: "target", targetIndex: 0 }).status).toBe("not-found");
    expect(moveEstimateRowItemInTree({ tree, rowItemId: "row-1", sourceNodeId: "missing", targetNodeId: "target", targetIndex: 0 }).status).toBe("not-found");
    expect(moveEstimateRowItemInTree({ tree, rowItemId: "row-1", sourceNodeId: "source", targetNodeId: "missing", targetIndex: 0 }).status).toBe("invalid-target");
    expect(moveEstimateRowItemInTree({ tree, rowItemId: "optimistic-row-1", sourceNodeId: "source", targetNodeId: "target", targetIndex: 0 }).status).toBe("invalid-target");
    expect(moveEstimateRowItemInTree({ tree, rowItemId: "row-1", sourceNodeId: "optimistic-source", targetNodeId: "target", targetIndex: 0 }).status).toBe("invalid-target");
    expect(moveEstimateRowItemInTree({ tree, rowItemId: "row-1", sourceNodeId: "source", targetNodeId: "optimistic-target", targetIndex: 0 }).status).toBe("invalid-target");
  });

  it("does not mutate the input tree and preserves unrelated branch identity", () => {
    const unrelated = node("unrelated", [row("row-9", 99)]);
    const tree = deepFreeze([node("group", [], [node("source", [row("row-1", 61), row("row-2", 62)]), node("target", [row("row-3", 63)]), unrelated])]);

    const result = moveEstimateRowItemInTree({
      tree,
      rowItemId: "row-1",
      sourceNodeId: "source",
      targetNodeId: "target",
      targetIndex: 1,
    });

    expect(rowIds(tree, "source")).toEqual(["row-1", "row-2"]);
    expect(rowIds(tree, "target")).toEqual(["row-3"]);
    expect(rowIds(result.tree, "source")).toEqual(["row-2"]);
    expect(rowIds(result.tree, "target")).toEqual(["row-3", "row-1"]);
    expect(findNode(result.tree, "unrelated")).toBe(unrelated);
    expect(result.tree).not.toBe(tree);
  });

  it("keeps large branch calculations dense and bounded", () => {
    const rows = Array.from({ length: 1000 }, (_, index) => row(`row-${index}`, index + 1));

    const result = moveEstimateRowItemInTree({
      tree: [node("large", rows)],
      rowItemId: "row-999",
      sourceNodeId: "large",
      targetNodeId: "large",
      targetIndex: 0,
    });

    expect(result.status).toBe("moved");
    expect(rowIds(result.tree, "large").slice(0, 3)).toEqual(["row-999", "row-0", "row-1"]);
    expect(result.affectedRowUpdates).toHaveLength(1000);
    expect(result.affectedRowUpdates.map((update) => update.sortOrder)).toEqual(Array.from({ length: 1000 }, (_, index) => index));
  });

  it("applies authoritative move results back into a tree while preserving unrelated branch identity", () => {
    const unrelated = node("unrelated", [row("row-99", 99)]);
    const tree = [
      node("source", [row("row-1", 1), row("row-2", 2), row("row-3", 3)]),
      node("target", [row("row-4", 4)]),
      unrelated,
    ];

    const result = applyEstimateRowItemMoveResultToTree(tree, [
      { rowId: "row-2", nodeId: "target", sortOrder: 0, rowRevision: 12 },
      { rowId: "row-4", nodeId: "target", sortOrder: 1, rowRevision: 14 },
      { rowId: "row-3", nodeId: "source", sortOrder: 1, rowRevision: 13 },
    ]);

    expect(rowIds(result, "source")).toEqual(["row-1", "row-3"]);
    expect(rowIds(result, "target")).toEqual(["row-2", "row-4"]);
    expect(findNode(result, "source")?.estimateRowItems?.[1]?.rowRevision).toBe(13);
    expect(findNode(result, "target")?.estimateRowItems?.[0]?.rowRevision).toBe(12);
    expect(findNode(result, "unrelated")).toBe(unrelated);
  });

  it("uses full authoritative sibling results without displacing unchanged trailing rows", () => {
    const tree = [node("living", [row("row-1", 1), row("row-2", 2), row("row-3", 3), row("row-4", 4)])];

    const result = applyEstimateRowItemMoveResultToTree(tree, [
      { rowId: "row-2", nodeId: "living", sortOrder: 0, rowRevision: 12 },
      { rowId: "row-3", nodeId: "living", sortOrder: 1, rowRevision: 13 },
      { rowId: "row-1", nodeId: "living", sortOrder: 2, rowRevision: 11 },
      { rowId: "row-4", nodeId: "living", sortOrder: 3, rowRevision: 4 },
    ]);

    expect(rowIds(result, "living")).toEqual(["row-2", "row-3", "row-1", "row-4"]);
    expect(findNode(result, "living")?.estimateRowItems?.map((item) => item.rowRevision)).toEqual([12, 13, 11, 4]);
  });
});
