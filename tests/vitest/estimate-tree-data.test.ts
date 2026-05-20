import { describe, expect, it } from "vitest";

import { findEstimateNode, sampleEstimateTree, validateEstimateTreeHierarchy, type EstimateTreeNode } from "@/components/workshop/estimate-tree-data";
import { canNestEstimateNodeKind, getEstimateNodeDisplayKind, isEstimateGroupNodeKind, isEstimateTreeNodeKind, type EstimateTreeNodeKind } from "@/lib/estimates/tree-hierarchy";

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

  it("uses one Group Node concept for every non-area hierarchy label", () => {
    expect(getEstimateNodeDisplayKind("group")).toBe("group");
    expect(isEstimateGroupNodeKind("group")).toBe(true);
    expect(getEstimateNodeDisplayKind("area")).toBe("area");
    expect(isEstimateGroupNodeKind("area")).toBe(false);
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

  it("allows root -> group and group -> group|area while blocking area parents", () => {
    expect(canNestEstimateNodeKind("group", null)).toBe(true);
    expect(canNestEstimateNodeKind("area", null)).toBe(false);
    expect(canNestEstimateNodeKind("group", "group")).toBe(true);
    expect(canNestEstimateNodeKind("area", "group")).toBe(true);
    expect(canNestEstimateNodeKind("group", "area")).toBe(false);
    expect(canNestEstimateNodeKind("area", "area")).toBe(false);
  });

  it("keeps all sample tree technical kinds limited to group and area", () => {
    expect(Array.from(collectNodeKinds(sampleEstimateTree)).sort()).toEqual(["area", "group"]);
  });

  it("keeps estimate row items only on area nodes", () => {
    expect(validateEstimateTreeHierarchy(sampleEstimateTree)).toEqual([]);
  });
});
