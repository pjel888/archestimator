import { describe, expect, it } from "vitest";

import { findEstimateNode, sampleEstimateTree, validateEstimateTreeHierarchy } from "@/components/workshop/estimate-tree-data";

describe("estimate tree hierarchy", () => {
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

  it("keeps estimate row items only on area groups", () => {
    expect(validateEstimateTreeHierarchy(sampleEstimateTree)).toEqual([]);
  });
});
