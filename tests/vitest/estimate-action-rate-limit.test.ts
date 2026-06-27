import { beforeEach, describe, expect, it } from "vitest";

import {
  checkEstimateActionRateLimit,
  resetEstimateActionRateLimitForTests,
} from "@/lib/estimates/action-rate-limit";

describe("estimate action rate limit", () => {
  beforeEach(() => {
    resetEstimateActionRateLimitForTests();
  });

  it("limits repeated estimate mutations per actor and estimate", () => {
    const baseInput = {
      now: 1_000_000,
      resourceId: "estimate-1",
      surface: "estimate-mutation" as const,
      userId: "user-1",
    };

    for (let index = 0; index < 40; index += 1) {
      expect(checkEstimateActionRateLimit({ ...baseInput, now: baseInput.now + index }).allowed).toBe(true);
    }

    expect(checkEstimateActionRateLimit({ ...baseInput, now: baseInput.now + 40 })).toEqual({
      allowed: false,
      message: "Too many estimate changes. Please wait 10 seconds.",
      retryAfter: 10,
    });
  });

  it("keeps actors and estimate resources isolated", () => {
    const now = 2_000_000;
    for (let index = 0; index < 40; index += 1) {
      expect(checkEstimateActionRateLimit({
        now: now + index,
        resourceId: "estimate-1",
        surface: "estimate-mutation",
        userId: "user-1",
      }).allowed).toBe(true);
    }

    expect(checkEstimateActionRateLimit({
      now,
      resourceId: "estimate-1",
      surface: "estimate-mutation",
      userId: "user-2",
    }).allowed).toBe(true);
    expect(checkEstimateActionRateLimit({
      now,
      resourceId: "estimate-2",
      surface: "estimate-mutation",
      userId: "user-1",
    }).allowed).toBe(true);
    expect(checkEstimateActionRateLimit({
      now,
      resourceId: "estimate-1",
      surface: "project-estimate-create",
      userId: "user-1",
    }).allowed).toBe(true);
  });
});
