import { describe, expect, it } from "vitest";

import { moveEstimateRowItem } from "@/lib/domain/estimate-mutations";
import type { EstimateNode, EstimateRowItem, EstimateTree } from "@/lib/domain/estimate-tree";

function node(id: string, kind: "group" | "area"): EstimateNode {
  return { id, estimateId: "e1", parentId: null, kind, name: id, sortOrder: 0 };
}

function row(id: string, nodeId: string): EstimateRowItem {
  return {
    id,
    estimateId: "e1",
    nodeId,
    sortOrder: 0,
    sourceLibraryItemId: null,
    sourceSnapshot: null,
    material: "Material",
    description: "",
    supplier: "Supplier",
    unit: "unit",
    quantity: 1,
    unitCost: 10,
    miscCost: 0,
    discipline: "Architectural",
    designation: "",
    linkState: "unlinked",
  };
}

describe("estimate-mutations · moveEstimateRowItem (P3 unification)", () => {
  it("moves a row onto a non-area (group) node without throwing (crash-on-drag fix)", () => {
    // Pre-unification this threw "Only Area Nodes may receive estimate row items", which
    // crashed the optimistic onMutate handler when a row was dragged onto a non-area node.
    const tree: EstimateTree = {
      nodes: [node("groupTarget", "group"), node("areaSource", "area")],
      rows: [row("r1", "areaSource")],
    };

    const next = moveEstimateRowItem(tree, { rowId: "r1", targetNodeId: "groupTarget", newSortOrder: 3 });

    const moved = next.rows.find((r) => r.id === "r1");
    expect(moved?.nodeId).toBe("groupTarget");
    expect(moved?.sortOrder).toBe(3);
  });

  it("still throws when the target node does not exist (guard preserved)", () => {
    const tree: EstimateTree = { nodes: [node("a", "area")], rows: [row("r1", "a")] };
    expect(() => moveEstimateRowItem(tree, { rowId: "r1", targetNodeId: "ghost", newSortOrder: 0 })).toThrow();
  });
});
