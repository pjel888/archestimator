import { describe, expect, it } from "vitest";

import { buildDevAuthBypassPreflightReport, type WranglerProfileQueryResult } from "../../scripts/check-dev-auth-bypass";

const profileExists: WranglerProfileQueryResult = {
  exitCode: 0,
  signal: null,
  timedOut: false,
  stdoutBytes: 40,
  stderrBytes: 0,
  parsedJson: true,
  profileExists: true,
};

describe("dev auth bypass preflight", () => {
  it("does not query D1 when the bypass is disabled", () => {
    const report = buildDevAuthBypassPreflightReport({
      env: { NODE_ENV: "development", ARCHESTIMATOR_DEV_AUTH_BYPASS: "0" },
      generatedAt: "2026-07-10T00:00:00.000Z",
    });

    expect(report.passed).toBe(true);
    expect(report.status).toBe("not-enabled");
    expect(report.checks.profileQuery).toBeNull();
  });

  it("rejects an enabled bypass whose local D1 identity is missing without exposing credentials", () => {
    const report = buildDevAuthBypassPreflightReport({
      env: {
        NODE_ENV: "development",
        ARCHESTIMATOR_DEV_AUTH_BYPASS: "1",
        ARCHESTIMATOR_DEV_AUTH_EMAIL: "developer@example.com",
        ARCHESTIMATOR_DEV_AUTH_BYPASS_SECRET: "a".repeat(32),
      },
      queryResult: { ...profileExists, profileExists: false },
    });

    expect(report.passed).toBe(false);
    expect(report.status).toBe("profile-missing");
    expect(JSON.stringify(report)).not.toContain("developer@example.com");
    expect(JSON.stringify(report)).not.toContain("a".repeat(32));
  });

  it("accepts a configured non-production bypass only when local D1 confirms the profile", () => {
    const report = buildDevAuthBypassPreflightReport({
      env: {
        NODE_ENV: "development",
        ARCHESTIMATOR_DEV_AUTH_BYPASS: "1",
        ARCHESTIMATOR_DEV_AUTH_EMAIL: "developer@example.com",
        ARCHESTIMATOR_DEV_AUTH_BYPASS_SECRET: "a".repeat(32),
      },
      queryResult: profileExists,
    });

    expect(report.passed).toBe(true);
    expect(report.status).toBe("ready");
    expect(report.boundary).toBe("local-d1-read-only");
  });
});
