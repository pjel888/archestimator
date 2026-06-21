import { describe, expect, it } from "vitest";

import { resolveProjectDataRouteState } from "@/lib/workshop/project-data-route-state";

describe("resolveProjectDataRouteState", () => {
  it("prefers the canonical sheet param over legacy left/right params", () => {
    expect(resolveProjectDataRouteState({ sheet: "sheet-a", compare: "sheet-b", left: "legacy-left", right: "legacy-right" })).toEqual({
      selectedEstimateId: "sheet-a",
      compareEstimateIds: ["sheet-b"],
      groupingMode: "category",
    });
  });

  it("uses legacy left/right as read-only fallbacks for old links", () => {
    expect(resolveProjectDataRouteState({ left: "legacy-left", right: "legacy-right", mode: "supplier" })).toEqual({
      selectedEstimateId: "legacy-left",
      compareEstimateIds: ["legacy-right"],
      groupingMode: "supplier",
    });
  });

  it("defaults invalid or missing grouping modes to category", () => {
    expect(resolveProjectDataRouteState({ sheet: "sheet-a", mode: "timeline" })).toEqual({
      selectedEstimateId: "sheet-a",
      compareEstimateIds: null,
      groupingMode: "category",
    });
    expect(resolveProjectDataRouteState(null)).toEqual({
      selectedEstimateId: null,
      compareEstimateIds: null,
      groupingMode: "category",
    });
  });

  it("reads only the first value when Next provides repeated query params", () => {
    expect(resolveProjectDataRouteState({ sheet: ["sheet-a", "sheet-b"], compare: ["sheet-b,sheet-c", "sheet-d"], mode: ["space", "supplier"] })).toEqual({
      selectedEstimateId: "sheet-a",
      compareEstimateIds: ["sheet-b", "sheet-c"],
      groupingMode: "space",
    });
  });

  it("treats compare=none as an explicit no-compare preference", () => {
    expect(resolveProjectDataRouteState({ sheet: "sheet-a", compare: "none", right: "sheet-b" })).toEqual({
      selectedEstimateId: "sheet-a",
      compareEstimateIds: [],
      groupingMode: "category",
    });
  });
});
