import { describe, expect, it } from "vitest";

import { buildReport } from "../../scripts/verify-cloudflare-hosted-estimate-history-proof";

function passingBody() {
  return {
    mode: "cloudflare-hosted-estimate-history-proof",
    proofSurface: "/api/internal/estimate-history-proof",
    readiness: {
      d1BindingPresent: true,
      appLayerEditorGuardReady: true,
      crossWorkspaceDenialReady: true,
      viewerDenialReady: true,
      idempotencyReady: true,
      rollbackReady: true,
      cleanupReady: true,
      hostedEstimateHistoryD1Ready: true,
    },
    idempotencyProof: {
      passed: true,
      eventCount: 1,
      replayReturnedSameEvent: true,
      firstError: null,
      secondError: null,
    },
    denialProof: {
      passed: true,
      viewerCanEdit: false,
      strangerCanEdit: false,
      viewerMutationError: "Estimate edit access denied.",
      strangerMutationError: "Estimate edit access denied.",
      viewerEventCount: 0,
      strangerEventCount: 0,
    },
    rollbackProof: {
      passed: true,
      rollbackErrorObserved: true,
      rowResidue: 0,
      eventResidue: 0,
      error: "no such table: __archestimator_missing_rollback_guard",
    },
    cleanupAfter: {
      workspaces: 0,
      profiles: 0,
      workspaceMembers: 0,
      projects: 0,
      estimates: 0,
      estimateTabs: 0,
      estimateNodes: 0,
      estimateRows: 0,
      estimateEvents: 0,
      estimateAdjustments: 0,
    },
    passed: true,
  };
}

describe("Cloudflare hosted estimate-history proof verifier script", () => {
  it("marks the hosted D1 estimate-history gate ready from sanitized endpoint evidence", async () => {
    const requested: { url: string; authorization: string | null }[] = [];
    const fetchImpl = async (input: string | URL | Request, init?: RequestInit) => {
      const url = typeof input === "string" || input instanceof URL ? String(input) : input.url;
      requested.push({
        url,
        authorization: new Headers(init?.headers).get("authorization"),
      });
      return Response.json(passingBody(), { status: 200 });
    };

    const report = await buildReport({
      baseUrl: "https://archestimator.example",
      secret: "cron-secret",
      secretInput: { name: "CRON_SECRET", present: true, source: "test" },
      fetchImpl,
    });

    expect(requested).toEqual([
      {
        url: "https://archestimator.example/api/internal/estimate-history-proof",
        authorization: "Bearer cron-secret",
      },
    ]);
    expect(report.readiness.hostedEstimateHistoryD1Ready).toBe(true);
    expect(report.readiness.cleanupReady).toBe(true);
    expect(report.blockers).toEqual([]);
  });

  it("keeps cleanup as a hard readiness gate", async () => {
    const body = passingBody();
    body.cleanupAfter.estimateEvents = 1;
    const fetchImpl = async () => Response.json(body, { status: 200 });

    const report = await buildReport({
      baseUrl: "https://archestimator.example",
      secret: "cron-secret",
      secretInput: { name: "CRON_SECRET", present: true, source: "test" },
      fetchImpl,
    });

    expect(report.readiness.hostedEstimateHistoryD1Ready).toBe(false);
    expect(report.blockers).toContain("Synthetic estimate proof fixture cleanup did not return to zero.");
  });

  it("reports missing secret without calling the hosted endpoint", async () => {
    let called = false;
    const fetchImpl = async () => {
      called = true;
      return Response.json(passingBody(), { status: 200 });
    };

    const report = await buildReport({
      baseUrl: "https://archestimator.example",
      secret: null,
      secretInput: { name: "CRON_SECRET", present: false, source: null },
      fetchImpl,
    });

    expect(called).toBe(false);
    expect(report.readiness.hostedEstimateHistoryD1Ready).toBe(false);
    expect(report.blockers).toContain("CRON_SECRET is missing from process.env or configured local env files.");
  });
});
