import { describe, expect, test } from "bun:test";

import { buildCompareHref, buildEstimateSheetHref } from "../../src/lib/workshop/compare-href";

describe("buildCompareHref", () => {
  test("targets the Compare route's left/right contract with headline as baseline", () => {
    expect(buildCompareHref("proj-1", ["headline", "row"])).toBe(
      "/workshop/projects/proj-1/charts?left=headline&right=row",
    );
  });

  test("preserves a grouping mode when provided", () => {
    expect(buildCompareHref("proj-1", ["headline", "row"], "supplier")).toBe(
      "/workshop/projects/proj-1/charts?left=headline&right=row&mode=supplier",
    );
  });

  test("omits empty params gracefully", () => {
    expect(buildCompareHref("proj-1", [])).toBe("/workshop/projects/proj-1/charts");
  });
});

describe("buildEstimateSheetHref", () => {
  test("targets the first node when known", () => {
    expect(buildEstimateSheetHref("proj-1", "est-1", "node-1")).toBe("/workshop/projects/proj-1/estimates/node-1");
  });

  test("falls back to the estimate id when there is no first node", () => {
    expect(buildEstimateSheetHref("proj-1", "est-1", null)).toBe("/workshop/projects/proj-1/estimates/est-1");
  });
});
