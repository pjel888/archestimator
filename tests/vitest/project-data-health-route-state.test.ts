import { describe, expect, it } from "vitest";

import { resolveProjectDataRouteState } from "@/lib/workshop/project-data-route-state";

describe("project-data health route-state contract (UNIT-001 red baseline)", () => {
  it("characterizes existing project-data URL state", () => {
    expect(resolveProjectDataRouteState({ sheet: "estimate-main", compare: "none", mode: "category" })).toEqual({
      selectedEstimateId: "estimate-main",
      compareEstimateIds: [],
      groupingMode: "category",
    });
  });

  it.fails("RED-EST-002: preserves a versioned health issue drill-through filter", () => {
    expect(resolveProjectDataRouteState({ sheet: "estimate-main", health_rule: "unpriced", health_rows: "unpriced,quantity-missing" } as never)).toMatchObject({
      healthFilter: { version: 1, ruleIds: ["unpriced", "quantity-missing"] },
    });
  });
});
