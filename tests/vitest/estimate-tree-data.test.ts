import { describe, expect, it } from "vitest";

import { findEstimateNode, sampleEstimateTree, validateEstimateTreeHierarchy } from "@/components/workshop/estimate-tree-data";
import { canNestEstimateNodeKind, getEstimateNodeDisplayKind, isEstimateGroupNodeKind, type EstimateTreeNodeKind } from "@/lib/estimates/tree-hierarchy";

const groupStorageKinds = ["group", "lot", "general", "structure", "level"] as const satisfies readonly EstimateTreeNodeKind[];

describe("estimate tree hierarchy", () => {
  it("treats every non-area storage kind as one Group Node concept", () => {
    expect(groupStorageKinds.map((kind) => getEstimateNodeDisplayKind(kind))).toEqual(["group", "group", "group", "group", "group"]);
    expect(groupStorageKinds.every((kind) => isEstimateGroupNodeKind(kind))).toBe(true);
    expect(getEstimateNodeDisplayKind("area")).toBe("area");
    expect(isEstimateGroupNodeKind("area")).toBe(false);
  });

  it("supports multiple lot groups as the top-level project parents", () => {
    expect(sampleEstimateTree.length).toBeGreaterThanOrEqual(2);
    expect(sampleEstimateTree.every((node) => node.kind === "lot")).toBe(true);
  });

  it("includes general proposal categories under the lot group", () => {
    const generalRequirements = findEstimateNode(sampleEstimateTree, "general-requirements");
    const siteWorks = findEstimateNode(sampleEstimateTree, "site-works");

    expect(generalRequirements?.kind).toBe("general");
    expect(generalRequirements?.name).toBe("General Requirements");
    expect(siteWorks?.kind).toBe("general");
    expect(siteWorks?.name).toBe("Site Works");
  });

  it("allows parent groups to contain area groups directly", () => {
    const siteWorks = findEstimateNode(sampleEstimateTree, "site-works");
    expect(siteWorks?.kind).toBe("general");
    expect(siteWorks?.children?.some((node) => node.kind === "area")).toBe(true);
  });

  it("allows any Group Node storage kind to nest inside any other Group Node", () => {
    for (const parentKind of groupStorageKinds) {
      for (const childKind of groupStorageKinds) {
        expect(canNestEstimateNodeKind(childKind, parentKind), `${childKind} under ${parentKind}`).toBe(true);
      }
      expect(canNestEstimateNodeKind("area", parentKind), `area under ${parentKind}`).toBe(true);
    }
  });

  it("keeps estimate row items only on area groups", () => {
    expect(validateEstimateTreeHierarchy(sampleEstimateTree)).toEqual([]);
  });
});
