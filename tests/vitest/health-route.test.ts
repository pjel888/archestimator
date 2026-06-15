import { existsSync, readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

import { dynamic, GET } from "@/app/api/health/route";

const launchReadinessPlanDir = existsSync(".ai/03_plans/mvp-launch-readiness-2026-06-01")
  ? ".ai/03_plans/mvp-launch-readiness-2026-06-01"
  : ".ai/09_archive/mvp-launch-readiness-2026-06-01";

const observabilityPlan = readFileSync(
  `${launchReadinessPlanDir}/27-observability-monitoring-support-plan.md`,
  "utf8",
);
const operationsRunbook = readFileSync(
  `${launchReadinessPlanDir}/40-closed-beta-operations-runbook.md`,
  "utf8",
);

describe("/api/health", () => {
  it("returns a no-store public health payload without sensitive runtime details", async () => {
    const response = await GET();
    const payload = await response.json();

    expect(dynamic).toBe("force-dynamic");
    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toBe("no-store");
    expect(payload).toMatchObject({
      ok: true,
      service: "archestimator",
    });
    expect(payload.timestamp).toEqual(expect.any(String));
    expect(Number.isNaN(Date.parse(payload.timestamp))).toBe(false);
    expect(JSON.stringify(payload)).not.toMatch(/supabase|resend|secret|key|token|database/i);
  });

  it("keeps the closed-beta monitoring docs pointed at the health endpoint", () => {
    expect(observabilityPlan).toMatch(/\/api\/health/);
    expect(observabilityPlan).toMatch(/uptime monitor/i);
    expect(operationsRunbook).toMatch(/\/api\/health` returns `200`/);
  });
});
