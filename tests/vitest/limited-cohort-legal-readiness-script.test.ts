import { describe, expect, it } from "vitest";

import { checkLimitedCohortLegalReadiness } from "@/../scripts/check-limited-cohort-legal-readiness";

describe("limited cohort legal readiness script", () => {
  it("fails closed without an AUTH-003 candidate and does not claim counsel approval", () => {
    const result = checkLimitedCohortLegalReadiness({ now: "2026-07-12T00:00:00.000Z" });
    expect(result.limitedCohort.schemaReady).toBe(false);
    expect(result.limitedCohort.blockers).toContain("missing_candidate");
    expect(result.authorizationBoundary).toBe("AUTH-003_REQUIRED");
    expect(result.broaderPublicPaid.status).toBe("BOUNDARY");
  });
});
