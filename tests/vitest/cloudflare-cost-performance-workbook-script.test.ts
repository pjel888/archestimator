import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import {
  buildCloudflareCostPerformanceWorkbook,
  writeMarkdown,
} from "../../scripts/generate-cloudflare-cost-performance-workbook";

const INVENTORY = {
  counts: {
    appRoutes: 70,
    providerCoupledFiles: 89,
    distinctRpcNames: 80,
    packageScripts: 70,
    cloudflareScripts: 7,
    providerReadinessScripts: 8,
  },
  sqlInventory: {
    appliedMigrationFiles: 181,
    pendingReviewFiles: 13,
    functionDeclarationMatches: 346,
    rlsPolicyStorageAuthMatches: 684,
  },
};

const ROUTE_PROBE = {
  mode: "cloudflare-worker-preview-routes",
  results: [
    {
      key: "home",
      label: "Home page",
      required: true,
      samples: [
        { durationMs: 101, passed: true, error: null },
        { durationMs: 155, passed: true, error: null },
      ],
    },
    {
      key: "pricing",
      label: "Pricing page",
      required: true,
      samples: [{ durationMs: 120, passed: true, error: null }],
    },
    {
      key: "features",
      label: "Features page",
      required: true,
      samples: [{ durationMs: 175, passed: true, error: null }],
    },
    {
      key: "workshop-signed-out",
      label: "Workshop signed-out redirect",
      required: true,
      samples: [{ durationMs: 86, passed: true, error: null }],
    },
  ],
};

const HOSTED_PERFORMANCE = {
  mode: "cloudflare-hosted-worker-performance",
  providerBacked: true,
  proofScope: "credential-free-hosted-worker-routes",
  routeContractReady: true,
  hostedCredentialFreePerformanceReady: true,
  hostedPerformanceReady: false,
  results: [
    {
      key: "home",
      required: true,
      p95DurationMs: 95,
      passed: true,
      p95BudgetPassed: true,
      samples: [{ durationMs: 95, passed: true, error: null }],
    },
    {
      key: "pricing",
      required: true,
      p95DurationMs: 115,
      passed: true,
      p95BudgetPassed: true,
      samples: [{ durationMs: 115, passed: true, error: null }],
    },
    {
      key: "features",
      required: true,
      p95DurationMs: 125,
      passed: true,
      p95BudgetPassed: true,
      samples: [{ durationMs: 125, passed: true, error: null }],
    },
  ],
};

describe("Cloudflare cost/performance workbook generator", () => {
  it("marks provider costs missing while deriving local planning counts", () => {
    const workbook = buildCloudflareCostPerformanceWorkbook({
      generatedAt: "2026-06-30T00:00:00.000Z",
      inventory: INVENTORY,
      inventorySource: "inventory.json",
      workerPreviewRouteProbe: ROUTE_PROBE,
      workerPreviewRouteProbeSource: "route-probe.json",
      cloudflarePricingSnapshot: {
        mode: "cloudflare-pricing-snapshot",
        readiness: {
          officialCloudflarePricingRefreshed: true,
          invalidSourceUrlCount: 0,
          requiredProductsMissing: [],
        },
      },
      cloudflarePricingSnapshotSource: "pricing-snapshot.json",
    });

    expect(workbook.readiness.currentProviderCostsReady).toBe(false);
    expect(workbook.readiness.cloudflarePricingRefreshed).toBe(true);
    expect(workbook.readiness.cloudflareUsageCostsReady).toBe(false);
    expect(workbook.readiness.localPreviewPerformanceCaptured).toBe(true);
    expect(workbook.readiness.hostedCredentialFreePerformanceCaptured).toBe(false);
    expect(workbook.readiness.productionCostDecisionReady).toBe(false);
    expect(workbook.inventoryCounts).toMatchObject({
      appRoutes: 70,
      providerCoupledFiles: 89,
      distinctRpcNames: 80,
      appliedMigrationFiles: 181,
      rlsPolicyStorageAuthMatches: 684,
    });
    expect(workbook.currentProviderCostInputs.every((row) => row.status === "missing")).toBe(true);
    expect(workbook.cloudflareCostInputs.find((row) => row.input === "D1 reads")).toMatchObject({
      status: "local-derived",
      value: "80 app-code RPC names need read/write classification",
    });
  });

  it("maps local Worker route probe durations into local-only performance fixtures", () => {
    const workbook = buildCloudflareCostPerformanceWorkbook({
      generatedAt: "2026-06-30T00:00:00.000Z",
      workerPreviewRouteProbe: ROUTE_PROBE,
      workerPreviewRouteProbeSource: "route-probe.json",
    });

    expect(workbook.performanceFixtures.find((row) => row.fixture === "Public home route p95 TTFB")).toMatchObject({
      cloudflareLocalPreviewP95Ms: 155,
      cloudflareHostedP95Ms: null,
      status: "local-only-pass",
      evidence: "route-probe.json",
    });
    expect(workbook.performanceFixtures.find((row) => row.fixture === "Pricing/features static route p95 TTFB")).toMatchObject({
      cloudflareLocalPreviewP95Ms: 175,
      status: "local-only-pass",
    });
    expect(workbook.performanceFixtures.find((row) => row.fixture === "Project dashboard p95 TTFB")).toMatchObject({
      cloudflareLocalPreviewP95Ms: null,
      status: "missing",
    });
  });

  it("maps hosted credential-free proof without opening production performance readiness", () => {
    const workbook = buildCloudflareCostPerformanceWorkbook({
      generatedAt: "2026-06-30T00:00:00.000Z",
      workerPreviewRouteProbe: ROUTE_PROBE,
      workerPreviewRouteProbeSource: "route-probe.json",
      cloudflareHostedPerformance: HOSTED_PERFORMANCE,
      cloudflareHostedPerformanceSource: "hosted-performance.json",
    });

    expect(workbook.readiness.hostedCredentialFreePerformanceCaptured).toBe(true);
    expect(workbook.readiness.hostedPerformanceReady).toBe(false);
    expect(workbook.readiness.productionCostDecisionReady).toBe(false);
    expect(workbook.performanceFixtures.find((row) => row.fixture === "Public home route p95 TTFB")).toMatchObject({
      cloudflareHostedP95Ms: 95,
      status: "hosted-partial-pass",
      hostedEvidence: "hosted-performance.json",
    });
    expect(workbook.performanceFixtures.find((row) => row.fixture === "Project dashboard p95 TTFB")).toMatchObject({
      cloudflareHostedP95Ms: null,
      status: "missing",
    });
  });

  it("treats a hosted route artifact as captured even when budgets fail", () => {
    const workbook = buildCloudflareCostPerformanceWorkbook({
      generatedAt: "2026-06-30T00:00:00.000Z",
      workerPreviewRouteProbe: ROUTE_PROBE,
      workerPreviewRouteProbeSource: "route-probe.json",
      cloudflareHostedPerformance: {
        ...HOSTED_PERFORMANCE,
        hostedCredentialFreePerformanceReady: false,
        results: [
          {
            key: "home",
            required: true,
            p95DurationMs: 275,
            passed: true,
            p95BudgetPassed: false,
            samples: [{ durationMs: 275, passed: true, error: null }],
          },
        ],
      },
      cloudflareHostedPerformanceSource: "hosted-performance.json",
    });

    expect(workbook.readiness.localPreviewPerformanceCaptured).toBe(true);
    expect(workbook.readiness.hostedCredentialFreePerformanceCaptured).toBe(true);
    expect(workbook.readiness.hostedPerformanceReady).toBe(false);
    expect(workbook.performanceFixtures.find((row) => row.fixture === "Public home route p95 TTFB")).toMatchObject({
      status: "hosted-partial-fail",
      hostedEvidence: "hosted-performance.json",
    });
  });


  it("accepts sanitized usage inputs without making hosted proof ready", () => {
    const workbook = buildCloudflareCostPerformanceWorkbook({
      generatedAt: "2026-06-30T00:00:00.000Z",
      sanitizedUsageInputs: {
        "Vercel plan cost": { value: "$0", source: "sanitized-billing-export.json" },
      },
      sanitizedUsageInputsSource: "sanitized-billing-export.json",
    });

    expect(workbook.currentProviderCostInputs.find((row) => row.input === "Vercel plan cost")).toMatchObject({
      status: "provided",
      value: "$0",
      source: "sanitized-billing-export.json",
    });
    expect(workbook.readiness.hostedPerformanceReady).toBe(false);
    expect(workbook.readiness.productionCostDecisionReady).toBe(false);
  });

  it("does not treat a missing pricing snapshot as a production cost decision", () => {
    const workbook = buildCloudflareCostPerformanceWorkbook({
      generatedAt: "2026-06-30T00:00:00.000Z",
      sanitizedUsageInputs: {
        "Vercel plan cost": { value: "$0", source: "sanitized-billing-export.json" },
      },
    });

    expect(workbook.readiness.cloudflarePricingRefreshed).toBe(false);
    expect(workbook.readiness.productionCostDecisionReady).toBe(false);
  });

  it("writes markdown without leaking arbitrary source-only values", () => {
    const workbook = buildCloudflareCostPerformanceWorkbook({
      generatedAt: "2026-06-30T00:00:00.000Z",
      sanitizedUsageInputs: {
        "Vercel plan cost": {
          value: "$0",
          source: "sanitized-billing-export.json",
          notes: "sanitized-only",
        },
      },
      workerPreviewRouteProbe: {
        results: [
          {
            key: "home",
            label: "Home page",
            required: true,
            samples: [{ durationMs: 42, passed: true, error: "secret-value-should-not-print" }],
          },
        ],
      },
      workerPreviewRouteProbeSource: "route-probe.json",
    });
    const dir = mkdtempSync(join(tmpdir(), "cloudflare-workbook-"));
    try {
      const file = join(dir, "workbook.md");
      writeMarkdown(workbook, file);
      const markdown = readFileSync(file, "utf8");
      expect(markdown).toContain("Public home route p95 TTFB");
      expect(markdown).not.toContain("secret-value-should-not-print");
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it("keeps production cost decisions closed in the real repo default state", () => {
    const workbook = buildCloudflareCostPerformanceWorkbook({
      inventory: JSON.parse(
        readFileSync(
          ".ai/03_plans/2026-06-29-Cloudflare-Migration-Codex/evidence/2026-06-30-cloudflare-migration-inventory.json",
          "utf8",
        ),
      ),
      workerPreviewRouteProbe: JSON.parse(
        readFileSync(
          ".ai/03_plans/2026-06-29-Cloudflare-Migration-Codex/evidence/2026-06-29-cloudflare-worker-preview-route-probe.json",
          "utf8",
        ),
      ),
      cloudflarePricingSnapshot: JSON.parse(
        readFileSync(
          ".ai/03_plans/2026-06-29-Cloudflare-Migration-Codex/evidence/2026-06-30-cloudflare-official-pricing-snapshot.json",
          "utf8",
        ),
      ),
    });

    expect(workbook.readiness.productionCostDecisionReady).toBe(false);
    expect(workbook.readiness.cloudflarePricingRefreshed).toBe(true);
    expect(workbook.currentProviderCostInputs.some((row) => row.status === "missing")).toBe(true);
    expect(workbook.performanceFixtures.some((row) => row.status === "local-only-pass")).toBe(true);
  });
});
