import { describe, expect, it } from "vitest";

import { findEstimateNode, sampleEstimateTree, validateEstimateTreeHierarchy, type EstimateTreeNode } from "@/components/workshop/estimate-tree-data";
import {
  isEstimateTreeNodeKind,
  normalizeEstimateTreeNodeKind,
  type EstimateTreeNodeKind,
} from "@/lib/estimates/tree-hierarchy";

const activeNodeKinds = ["group", "area"] as const satisfies readonly EstimateTreeNodeKind[];
const legacyTechnicalKinds = ["lot", "general", "structure", "level", "assembly"] as const;

function collectNodeKinds(nodes: EstimateTreeNode[]) {
  const kinds = new Set<EstimateTreeNode["kind"]>();

  function visit(node: EstimateTreeNode) {
    kinds.add(node.kind);
    node.children?.forEach(visit);
  }

  nodes.forEach(visit);
  return kinds;
}

describe("estimate tree hierarchy", () => {
  it("exposes only group and area as active technical node kinds", () => {
    expect(activeNodeKinds).toEqual(["group", "area"]);
    expect(activeNodeKinds.every((kind) => isEstimateTreeNodeKind(kind))).toBe(true);
    expect(legacyTechnicalKinds.map((kind) => isEstimateTreeNodeKind(kind))).toEqual([false, false, false, false, false]);
  });

  it("normalizes legacy organizing kinds to group during the remote migration transition", () => {
    expect(activeNodeKinds.map((kind) => normalizeEstimateTreeNodeKind(kind))).toEqual(["group", "area"]);
    expect(legacyTechnicalKinds.map((kind) => normalizeEstimateTreeNodeKind(kind))).toEqual(["group", "group", "group", "group", "group"]);
    expect(normalizeEstimateTreeNodeKind("legacy")).toBeNull();
  });

  it("supports multiple top-level project parents as group nodes", () => {
    expect(sampleEstimateTree.length).toBeGreaterThanOrEqual(2);
    expect(sampleEstimateTree.every((node) => node.kind === "group")).toBe(true);
  });

  it("keeps proposal category labels as names on group nodes", () => {
    const generalRequirements = findEstimateNode(sampleEstimateTree, "general-requirements");
    const siteWorks = findEstimateNode(sampleEstimateTree, "site-works");

    expect(generalRequirements?.kind).toBe("group");
    expect(generalRequirements?.name).toBe("General Requirements");
    expect(siteWorks?.kind).toBe("group");
    expect(siteWorks?.name).toBe("Site Works");
  });

  it("allows group nodes to contain area nodes directly", () => {
    const siteWorks = findEstimateNode(sampleEstimateTree, "site-works");
    expect(siteWorks?.kind).toBe("group");
    expect(siteWorks?.children?.some((node) => node.kind === "area")).toBe(true);
  });

  // P6 single-node model: the kind-based nesting helper (canNestEstimateNodeKind)
  // is deleted — any node may parent any node. Nesting acceptance is now proven
  // behaviorally in estimate-tree-reorder.test.ts (evaluateEstimateTreeDrop) and
  // estimate-mixed-content.test.tsx; only cycle/self-drop/cross-tab remain.

  it("keeps all sample tree technical kinds limited to group and area", () => {
    expect(Array.from(collectNodeKinds(sampleEstimateTree)).sort()).toEqual(["area", "group"]);
  });

  it("keeps estimate row items only on area nodes", () => {
    expect(validateEstimateTreeHierarchy(sampleEstimateTree)).toEqual([]);
  });

  it("does not flag rows on a non-area node (P3 unification: any node may own rows)", () => {
    // Pre-unification this returned ["Container is a Group Node but contains estimate row items"].
    const mixed = [
      {
        id: "g1",
        name: "Container",
        kind: "group",
        estimateRowItems: [{ id: "r1" }],
        children: [
          { id: "a1", name: "Leaf", kind: "area", estimateRowItems: [{ id: "r2" }], children: [] },
        ],
      },
    ] as unknown as EstimateTreeNode[];
    expect(validateEstimateTreeHierarchy(mixed)).toEqual([]);
  });
});
