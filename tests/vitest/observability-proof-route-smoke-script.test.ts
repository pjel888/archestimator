import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import {
  buildObservabilityProofRouteSmokeReport,
  writeObservabilityProofRouteSmokeReport,
} from "@/../scripts/check-observability-proof-route";

function fetchStatus(status: number, statusText = "status") {
  return async () => new Response("{}", { status, statusText });
}

describe("observability proof route smoke", () => {
  it("passes when the hosted route enforces authorization", async () => {
    const report = await buildObservabilityProofRouteSmokeReport({
      generatedAt: "2026-07-08T00:00:00.000Z",
      url: "https://archestimator.com/__cloudflare/observability-proof",
      fetcher: fetchStatus(401, "Unauthorized"),
    });

    expect(report.readyForWorkersLogsProof).toBe(true);
    expect(report.routeStatus).toBe("auth-enforced");
    expect(report.routeReachable).toBe(true);
    expect(report.authorizationEnforced).toBe(true);
    expect(report.http).toMatchObject({
      attempted: true,
      status: 401,
      statusText: "Unauthorized",
    });
    expect(report.nextAction).toContain("ops:collect-workers-logs-proof");
    expect(JSON.stringify(report)).not.toMatch(/Bearer|CRON_SECRET=.*secret/i);
  });

  it("fails with a deploy-staleness action when the route is not found", async () => {
    const report = await buildObservabilityProofRouteSmokeReport({
      generatedAt: "2026-07-08T00:00:00.000Z",
      url: "https://archestimator.com/__cloudflare/observability-proof",
      fetcher: fetchStatus(404, "Not Found"),
    });

    expect(report.readyForWorkersLogsProof).toBe(false);
    expect(report.routeStatus).toBe("route-not-found");
    expect(report.routeReachable).toBe(false);
    expect(report.nextAction).toContain("Deploy the current Worker source");
  });

  it("fails closed when unauthenticated requests succeed", async () => {
    const report = await buildObservabilityProofRouteSmokeReport({
      generatedAt: "2026-07-08T00:00:00.000Z",
      url: "https://archestimator.com/__cloudflare/observability-proof",
      fetcher: fetchStatus(200, "OK"),
    });

    expect(report.readyForWorkersLogsProof).toBe(false);
    expect(report.routeStatus).toBe("auth-bypass");
    expect(report.routeReachable).toBe(true);
    expect(report.authorizationEnforced).toBe(false);
    expect(report.nextAction).toContain("authorization is not enforced");
  });

  it("rejects unsafe or non-HTTPS URLs without fetching", async () => {
    let called = false;
    const report = await buildObservabilityProofRouteSmokeReport({
      generatedAt: "2026-07-08T00:00:00.000Z",
      url: "http://archestimator.com/__cloudflare/observability-proof?token=secret",
      fetcher: async () => {
        called = true;
        return new Response(null, { status: 500 });
      },
    });

    expect(called).toBe(false);
    expect(report.readyForWorkersLogsProof).toBe(false);
    expect(report.routeStatus).toBe("invalid-url");
    expect(report.http.attempted).toBe(false);
    expect(JSON.stringify(report)).not.toContain("token=secret");
  });

  it("writes a non-secret route smoke artifact", async () => {
    const report = await buildObservabilityProofRouteSmokeReport({
      generatedAt: "2026-07-08T00:00:00.000Z",
      url: "https://archestimator.com/__cloudflare/observability-proof",
      fetcher: fetchStatus(401, "Unauthorized"),
    });
    const dir = mkdtempSync(join(tmpdir(), "observability-proof-route-"));
    try {
      const output = join(dir, "report.json");
      writeObservabilityProofRouteSmokeReport(report, output);
      const saved = readFileSync(output, "utf8");

      expect(JSON.parse(saved)).toEqual(report);
      expect(saved).not.toMatch(/Bearer|secret-token|cron-secret/i);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});
