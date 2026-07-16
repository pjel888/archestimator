import { describe, expect, it } from "vitest";

import { DEFAULT_PRICE_FRESHNESS_POLICY, getPriceFreshness, resolvePriceFreshnessPolicy } from "@/lib/estimate-health";
import { ESTIMATE_HEALTH_GOLDEN_FIXTURE } from "./fixtures/estimate-health-golden-fixture";

describe("estimate price policy contract (UNIT-001 red baseline)", () => {
  it("locks the compatibility fallback before policy persistence exists", () => {
    expect(ESTIMATE_HEALTH_GOLDEN_FIXTURE.workspacePolicy).toEqual({ revision: 7, staleDays: 90, veryStaleDays: 180 });
  });

  it("resolves a category override ahead of workspace fallback", () => {
    expect(resolvePriceFreshnessPolicy({
      workspacePolicy: ESTIMATE_HEALTH_GOLDEN_FIXTURE.workspacePolicy,
      categoryPolicy: ESTIMATE_HEALTH_GOLDEN_FIXTURE.categoryPolicy,
      categoryId: "folder-masonry",
    })).toEqual({ revision: 8, staleDays: 30, veryStaleDays: 60 });
  });

  it("returns missing for non-finite timestamps and invalid policies", () => {
    const now = Date.parse("2026-07-10T12:00:00.000Z");

    expect(getPriceFreshness({ timestamp: Number.NaN, now, policy: DEFAULT_PRICE_FRESHNESS_POLICY })).toBe("missing");
    expect(getPriceFreshness({ timestamp: Number.POSITIVE_INFINITY, now, policy: DEFAULT_PRICE_FRESHNESS_POLICY })).toBe("missing");
    expect(getPriceFreshness({ timestamp: Date.parse("not-a-date"), now, policy: DEFAULT_PRICE_FRESHNESS_POLICY })).toBe("missing");
    expect(getPriceFreshness({ timestamp: now, now, policy: { revision: 1, staleDays: Number.NaN, veryStaleDays: 180 } })).toBe("missing");
    expect(getPriceFreshness({ timestamp: now, now, policy: { revision: 1, staleDays: 90, veryStaleDays: Number.POSITIVE_INFINITY } })).toBe("missing");
    expect(getPriceFreshness({ timestamp: now, now, policy: { revision: 1, staleDays: 180, veryStaleDays: 90 } })).toBe("missing");
  });

  it("preserves the 90/180 compatibility thresholds at exact boundaries", () => {
    const now = Date.parse("2026-07-10T12:00:00.000Z");
    const day = 86_400_000;

    expect(getPriceFreshness({ timestamp: now - 90 * day, now, policy: DEFAULT_PRICE_FRESHNESS_POLICY })).toBe("fresh");
    expect(getPriceFreshness({ timestamp: now - 90 * day - 1, now, policy: DEFAULT_PRICE_FRESHNESS_POLICY })).toBe("stale");
    expect(getPriceFreshness({ timestamp: now - 180 * day, now, policy: DEFAULT_PRICE_FRESHNESS_POLICY })).toBe("stale");
    expect(getPriceFreshness({ timestamp: now - 180 * day - 1, now, policy: DEFAULT_PRICE_FRESHNESS_POLICY })).toBe("very-stale");
  });
});
