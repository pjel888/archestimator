import { describe, expect, it } from "vitest";

import {
  onboardingSupportContextFromSearchParams,
  onboardingSupportContextHref,
  sanitizeOnboardingSupportContext,
} from "@/lib/onboarding/support-context";

const validContext = {
  flowKey: "first_estimate_value",
  flowVersion: 1,
  stepKey: "add_priced_row",
  reasonCode: "target_timeout",
  routeKey: "estimate_sheet",
  viewportClass: "desktop",
} as const;

describe("onboarding support context", () => {
  it("round-trips the exact allowlisted diagnostic fields", () => {
    const href = onboardingSupportContextHref(validContext);
    const url = new URL(href, "https://archestimator.test");

    expect(href).toBe(
      "/workshop/feedback?flowKey=first_estimate_value&flowVersion=1&reasonCode=target_timeout&viewportClass=desktop&stepKey=add_priced_row&routeKey=estimate_sheet",
    );
    expect(
      onboardingSupportContextFromSearchParams(
        Object.fromEntries(url.searchParams.entries()),
      ),
    ).toEqual(validContext);
  });

  it("normalizes optional fields and numeric string versions", () => {
    expect(
      sanitizeOnboardingSupportContext({
        flowKey: "core_orientation",
        flowVersion: "1",
        stepKey: "",
        reasonCode: "user_close",
        routeKey: undefined,
        viewportClass: "mobile",
      }),
    ).toEqual({
      flowKey: "core_orientation",
      flowVersion: 1,
      stepKey: null,
      reasonCode: "user_close",
      routeKey: null,
      viewportClass: "mobile",
    });
  });

  it.each([
    null,
    [],
    { ...validContext, flowKey: "unknown" },
    { ...validContext, flowVersion: 0 },
    { ...validContext, flowVersion: 1_001 },
    { ...validContext, stepKey: "unknown" },
    { ...validContext, reasonCode: "database_error" },
    { ...validContext, routeKey: "/workshop/projects/secret-id" },
    { ...validContext, viewportClass: "tablet" },
    { ...validContext, userId: "user-secret" },
    { ...validContext, projectId: "project-secret" },
    { ...validContext, rawError: "D1_ERROR" },
  ])("rejects invalid or non-allowlisted context %#", (value) => {
    expect(sanitizeOnboardingSupportContext(value)).toBeNull();
  });
});
