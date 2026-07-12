import { describe, expect, it } from "vitest";

import { ESTIMATE_HEALTH_GOLDEN_FIXTURE } from "./fixtures/estimate-health-golden-fixture";

describe("estimate revision intelligence contract (UNIT-001 red baseline)", () => {
  it("freezes same-estimate high-water ordering inputs", () => {
    expect(ESTIMATE_HEALTH_GOLDEN_FIXTURE.revisionBoundary.events.map((event) => event.eventId)).toEqual([
      "event-002", "event-003", "event-004", "event-005", "event-006", "event-007",
    ]);
  });

  it.fails("RED-EST-003: reconciles complete same-estimate revision facts and preserves unknown residual", async () => {
    const health = await import(/* @vite-ignore */ ["@", "/lib/estimate-health"].join(""));
    expect(health.reconcileEstimateRevision(ESTIMATE_HEALTH_GOLDEN_FIXTURE.revisionBoundary)).toMatchObject({
      available: true,
      quantityDelta: 10,
      rateDelta: 20,
      adjustmentDelta: 30,
      miscDelta: 40,
      scopeDelta: 50,
      residualDelta: 5,
    });
  });
});
