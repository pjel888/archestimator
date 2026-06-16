import { describe, expect, it } from "vitest";

import { resolveProjectDataRouteState } from "@/lib/workshop/project-data-route-state";

describe("resolveProjectDataRouteState", () => {
  it("prefers the canonical sheet param over legacy left/right params", () => {
    expect(resolveProjectDataRouteState({ sheet: "sheet-a", left: "legacy-left", right: "legacy-right" })).toEqual({
      selectedEstimateId: "sheet-a",
      groupingMode: "category",
    });
  });

  it("uses legacy left as a read-only fallback for old links and ignores right", () => {
    expect(resolveProjectDataRouteState({ left: "legacy-left", right: "legacy-right", mode: "supplier" })).toEqual({
      selectedEstimateId: "legacy-left",
      groupingMode: "supplier",
    });
  });

  it("defaults invalid or missing grouping modes to category", () => {
    expect(resolveProjectDataRouteState({ sheet: "sheet-a", mode: "timeline" })).toEqual({
      selectedEstimateId: "sheet-a",
      groupingMode: "category",
    });
    expect(resolveProjectDataRouteState(null)).toEqual({
      selectedEstimateId: null,
      groupingMode: "category",
    });
  });

  it("reads only the first value when Next provides repeated query params", () => {
    expect(resolveProjectDataRouteState({ sheet: ["sheet-a", "sheet-b"], mode: ["space", "supplier"] })).toEqual({
      selectedEstimateId: "sheet-a",
      groupingMode: "space",
    });
  });
});
