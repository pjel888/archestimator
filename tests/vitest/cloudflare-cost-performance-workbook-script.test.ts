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

  it("uses p95 budget readiness, not route-contract readiness, as the strict p95 fallback", () => {
    const softRouteOnlyWorkbook = buildCloudflareCostPerformanceWorkbook({
      generatedAt: "2026-06-30T00:00:00.000Z",
      cloudflareHostedPerformance: {
        ...HOSTED_PERFORMANCE,
        p95BudgetReady: false,
        results: HOSTED_PERFORMANCE.results.map((result) =>
          result.key === "home" ? { ...result, p95BudgetPassed: false } : result,
        ),
      },
      cloudflareHostedPerformanceSource: "hosted-performance.json",
    });
    const strictBudgetWorkbook = buildCloudflareCostPerformanceWorkbook({
      generatedAt: "2026-06-30T00:00:00.000Z",
      cloudflareHostedPerformance: {
        ...HOSTED_PERFORMANCE,
        p95BudgetReady: true,
      },
      cloudflareHostedPerformanceSource: "hosted-performance.json",
    });

    expect(softRouteOnlyWorkbook.readiness.hostedCredentialFreePerformanceCaptured).toBe(true);
    expect(softRouteOnlyWorkbook.readiness.strictHostedClientP95Ready).toBe(false);
    expect(softRouteOnlyWorkbook.readiness.aggregateHostedPerformanceReady).toBe(false);
    expect(strictBudgetWorkbook.readiness.hostedCredentialFreePerformanceCaptured).toBe(true);
    expect(strictBudgetWorkbook.readiness.strictHostedClientP95Ready).toBe(true);
  });

  it("prefers explicit hosted TTFB fields over legacy duration aliases", () => {
    const workbook = buildCloudflareCostPerformanceWorkbook({
      generatedAt: "2026-06-30T00:00:00.000Z",
      cloudflareHostedPerformance: {
        ...HOSTED_PERFORMANCE,
        results: [
          {
            key: "home",
            required: true,
            p95TtfbMs: 88,
            p95DurationMs: 950,
            passed: true,
            p95BudgetPassed: true,
            samples: [{ ttfbMs: 88, durationMs: 950, passed: true, error: null }],
          },
        ],
      },
      cloudflareHostedPerformanceSource: "hosted-performance.json",
    });

    expect(workbook.performanceFixtures.find((row) => row.fixture === "Public home route p95 TTFB")).toMatchObject({
      cloudflareHostedP95Ms: 88,
      status: "hosted-partial-pass",
    });
  });

  it("prefers provider-backed Better Auth proof over credential-free login timing", () => {
    const workbook = buildCloudflareCostPerformanceWorkbook({
      generatedAt: "2026-07-01T00:00:00.000Z",
      cloudflareHostedPerformance: {
        ...HOSTED_PERFORMANCE,
        results: [
          {
            key: "login",
            required: true,
            p95DurationMs: 79,
            passed: true,
            p95BudgetPassed: true,
            samples: [{ durationMs: 79, passed: true, error: null }],
          },
        ],
      },
      cloudflareHostedPerformanceSource: "hosted-performance.json",
      betterAuthProviderProof: {
        mode: "cloudflare-better-auth-provider-proof-verifier",
        providerBacked: true,
        readiness: {
          betterAuthProviderProofReady: true,
          providerBackedCallbackSessionCutoverReady: true,
          routeGateSessionReadbackReady: true,
        },
      },
      betterAuthProviderProofSource: "better-auth-provider-proof.json",
    });

    expect(workbook.performanceFixtures.find((row) => row.fixture === "Login/auth callback p95 duration")).toMatchObject({
      cloudflareHostedP95Ms: null,
      status: "hosted-provider-proof-only",
      hostedEvidence: "better-auth-provider-proof.json",
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

  it("maps provider-backed D1 timing plus Better Auth, R2, and Jobs proofs into supplemental performance fixtures", () => {
    const workbook = buildCloudflareCostPerformanceWorkbook({
      generatedAt: "2026-06-30T00:00:00.000Z",
      cloudflareHostedPerformance: HOSTED_PERFORMANCE,
      cloudflareHostedPerformanceSource: "hosted-performance.json",
      d1RuntimePerformanceProof: {
        mode: "cloudflare-d1-runtime-performance-proof-verifier",
        providerBacked: true,
        readiness: {
          hostedWorkerD1PerformanceReady: true,
          d1RuntimeProofReady: true,
        },
        result: {
          benchmarkRows: [
            {
              surface: "workspace_homebase_summary",
              hostedBudgetMs: 600,
              hostedP95Ms: 65,
              sampleCount: 9,
              status: "hosted-pass",
              notes: "workspace summary",
            },
            {
              surface: "project_estimate_list_summaries",
              hostedBudgetMs: 600,
              hostedP95Ms: 76,
              sampleCount: 9,
              status: "hosted-pass",
              notes: "estimate list",
            },
            {
              surface: "estimate_row_mutation",
              hostedBudgetMs: 500,
              hostedP95Ms: 88,
              sampleCount: 9,
              status: "hosted-pass",
              notes: "estimate row mutation",
            },
            {
              surface: "library_overview_summary",
              hostedBudgetMs: 600,
              hostedP95Ms: 57,
              sampleCount: 9,
              status: "hosted-pass",
              notes: "library overview",
            },
          ],
        },
      },
      d1RuntimePerformanceProofSource: "d1-runtime-proof.json",
      betterAuthProviderProof: {
        mode: "cloudflare-better-auth-provider-proof-verifier",
        providerBacked: true,
        readiness: {
          betterAuthProviderProofReady: true,
          providerBackedCallbackSessionCutoverReady: true,
          routeGateSessionReadbackReady: true,
        },
      },
      betterAuthProviderProofSource: "better-auth-provider-proof.json",
      jobsRuntimeProof: {
        mode: "cloudflare-jobs-runtime-proof-verifier",
        providerBacked: true,
        readiness: {
          productionJobsMessagingReady: true,
        },
      },
      jobsRuntimeProofSource: "jobs-runtime-proof.json",
      providerRuntimeProof: {
        mode: "cloudflare-provider-runtime-proof-verifier",
        providerBacked: true,
        readiness: {
          providerRuntimeProofReady: true,
          r2ProviderProofReady: true,
          imagesProviderProofReady: true,
        },
      },
      providerRuntimeProofSource: "provider-runtime-proof.json",
    });

    expect(workbook.performanceFixtures.find((row) => row.fixture === "Login/auth callback p95 duration")).toMatchObject({
      status: "hosted-provider-proof-only",
      hostedEvidence: "better-auth-provider-proof.json",
    });
    expect(workbook.performanceFixtures.find((row) => row.fixture === "Project dashboard p95 TTFB")).toMatchObject({
      cloudflareHostedP95Ms: 65,
      status: "hosted-provider-pass",
      hostedEvidence: "d1-runtime-proof.json",
    });
    expect(workbook.performanceFixtures.find((row) => row.fixture === "Estimate sheet initial load p95")).toMatchObject({
      cloudflareHostedP95Ms: 76,
      status: "hosted-provider-pass",
    });
    expect(workbook.performanceFixtures.find((row) => row.fixture === "Estimate row mutation p95")).toMatchObject({
      cloudflareHostedP95Ms: 88,
      status: "hosted-provider-pass",
      hostedEvidence: "d1-runtime-proof.json",
    });
    expect(workbook.performanceFixtures.find((row) => row.fixture === "Library component search p95")).toMatchObject({
      cloudflareHostedP95Ms: 57,
      status: "hosted-provider-pass",
    });
    expect(workbook.performanceFixtures.find((row) => row.fixture === "Upload signed/session creation p95")).toMatchObject({
      cloudflareHostedP95Ms: null,
      status: "hosted-provider-proof-only",
      hostedEvidence: "provider-runtime-proof.json",
    });
    expect(workbook.performanceFixtures.find((row) => row.fixture === "Upload scan queue latency p95")).toMatchObject({
      cloudflareHostedP95Ms: null,
      status: "hosted-provider-proof-only",
      hostedEvidence: "jobs-runtime-proof.json",
    });
    expect(workbook.performanceFixtures.find((row) => row.fixture === "Realtime cursor/presence latency p95")).toMatchObject({
      status: "missing",
    });
    expect(workbook.readiness.hostedPerformanceReady).toBe(false);
    expect(workbook.readiness.productionRuntimePerformanceReady).toBe(false);
  });

  it("maps Durable Object realtime and Email Service proofs into supplemental performance fixtures", () => {
    const workbook = buildCloudflareCostPerformanceWorkbook({
      generatedAt: "2026-07-01T00:00:00.000Z",
      durableObjectWebSocketProof: {
        mode: "cloudflare-durable-object-websocket-proof",
        providerBacked: true,
        sampleCount: 9,
        readiness: {
          durableObjectWebSocketReady: true,
          twoClientsConnected: true,
          presenceRoundTripReady: true,
          broadcastRoundTripReady: true,
          realtimeLatencyP95Ready: true,
        },
        timingsMs: {
          presenceTrackToPeerP95Ms: 54,
          broadcastToPeerP95Ms: 53,
          realtimeEventP95Ms: 54,
        },
      },
      durableObjectWebSocketProofSource: "durable-object-proof.json",
      emailSendProof: {
        mode: "cloudflare-email-send-proof",
        providerBacked: true,
        sendProof: {
          sentAtApprox: "2026-07-01T07:33:55Z",
        },
        receiptProof: {
          received: true,
          receivedAt: "2026-07-01T07:33:59Z",
        },
        readiness: {
          emailSendingDomainReady: true,
          outboundArbitraryRecipientSendReady: true,
          gmailReceiptReady: true,
          productionEmailSendProofReady: true,
        },
      },
      emailSendProofSource: "email-send-proof.json",
    });

    expect(workbook.performanceFixtures.find((row) => row.fixture === "Realtime cursor/presence latency p95")).toMatchObject({
      cloudflareHostedP95Ms: 54,
      status: "hosted-provider-pass",
      hostedEvidence: "durable-object-proof.json",
    });
    expect(workbook.performanceFixtures.find((row) => row.fixture === "Email send-to-event latency p95")).toMatchObject({
      cloudflareHostedP95Ms: 4000,
      status: "hosted-provider-pass",
      hostedEvidence: "email-send-proof.json",
    });
  });

  it("maps provider-backed Jobs queue latency into the upload scan queue fixture", () => {
    const workbook = buildCloudflareCostPerformanceWorkbook({
      generatedAt: "2026-07-01T00:00:00.000Z",
      jobsRuntimeProof: {
        mode: "cloudflare-jobs-runtime-proof-verifier",
        providerBacked: true,
        queueLatency: {
          sampleCount: 2,
          p95Ms: 240,
          samplesMs: [120, 240],
        },
        readiness: {
          queueSendReady: true,
          queueConsumerReceiptReady: true,
          cronProviderExecutionProven: true,
          productionJobsMessagingReady: true,
        },
      },
      jobsRuntimeProofSource: "jobs-runtime-proof.json",
    });

    expect(workbook.performanceFixtures.find((row) => row.fixture === "Upload scan queue latency p95")).toMatchObject({
      cloudflareHostedP95Ms: 240,
      status: "hosted-provider-pass",
      hostedEvidence: "jobs-runtime-proof.json",
    });
  });

  it("maps hosted upload runtime proof into the upload session fixture", () => {
    const workbook = buildCloudflareCostPerformanceWorkbook({
      generatedAt: "2026-07-01T00:00:00.000Z",
      hostedUploadRuntimeProof: {
        mode: "hosted-upload-runtime-proof",
        proofBoundary: "hosted-runtime-authenticated-dry-run",
        passed: true,
        productionProofReady: true,
        runs: 2,
        concurrency: 2,
        samples: [
          {
            type: "unauthenticated-fail-closed",
            status: 401,
            durationMs: 20,
            passed: true,
          },
          {
            type: "authenticated-runtime-dry-run",
            status: 200,
            durationMs: 110,
            passed: true,
            bodySummary: { storageLatency: { status: "ok", durationMs: 44, bucketReachable: true } },
          },
          {
            type: "authenticated-body-probe",
            status: 200,
            durationMs: 140,
            passed: true,
            bodySummary: { storageLatency: { status: "ok", durationMs: 66, bucketReachable: true } },
          },
        ],
      },
      hostedUploadRuntimeProofSource: "hosted-upload-runtime-proof.json",
    });

    expect(workbook.performanceFixtures.find((row) => row.fixture === "Upload signed/session creation p95")).toMatchObject({
      cloudflareHostedP95Ms: 140,
      status: "hosted-provider-pass",
      hostedEvidence: "hosted-upload-runtime-proof.json",
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

  it("keeps production Cloudflare usage costs closed when inputs are proof-scale samples", () => {
    const workbook = buildCloudflareCostPerformanceWorkbook({
      generatedAt: "2026-07-01T00:00:00.000Z",
      inventory: INVENTORY,
      cloudflarePricingSnapshot: {
        mode: "cloudflare-pricing-snapshot",
        readiness: {
          officialCloudflarePricingRefreshed: true,
          invalidSourceUrlCount: 0,
          requiredProductsMissing: [],
        },
      },
      sanitizedUsageInputs: Object.fromEntries([
        ...[
          "Vercel plan cost",
          "Vercel bandwidth",
          "Vercel function invocations/duration",
          "Vercel build usage",
          "Supabase plan cost",
          "Supabase DB size",
          "Supabase storage GB",
          "Supabase egress",
          "Supabase Auth MAU",
          "Supabase Realtime connections/messages",
          "Resend plan cost",
          "Resend sends/events",
        ].map((input) => [input, { value: "captured", source: "provider-dashboard.json" }]),
        ...[
          "Workers requests",
          "Workers CPU",
          "Workers subrequests",
          "D1 reads",
          "D1 writes",
          "R2 storage",
          "R2 Class A",
          "R2 Class B",
          "Queues operations",
          "Durable Objects",
          "Email Service",
          "Observability/logs",
        ].map((input) => [
          input,
          {
            value: "proof sample captured",
            source: "proof-artifact.json",
            notes: "Proof-scale observed usage only; not projected monthly production volume.",
          },
        ]),
        ["D1 storage", {
          value: "12,288 bytes",
          source: "proof-artifact.json",
          notes: "Proof DB only; production import/projection is not complete.",
        }],
        ["KV reads/writes/lists", {
          value: "Not applicable",
          source: "wrangler.jsonc",
          notes: "Not applicable to the current runtime; expected usage is zero.",
        }],
        ["WAF/rate limiting", {
          value: "No add-on",
          source: "provider-readiness.json",
          notes: "Current zero-add-on posture; no paid add-on is required by current launch runtime.",
        }],
        ["Turnstile", {
          value: "Not applicable",
          source: "source-scan",
          notes: "Not applicable to the current runtime; expected Turnstile challenge volume is zero.",
        }],
      ]),
    });

    expect(workbook.readiness.currentProviderCostsReady).toBe(true);
    expect(workbook.readiness.cloudflarePricingRefreshed).toBe(true);
    expect(workbook.readiness.cloudflareUsageCostsReady).toBe(false);
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

  it("accepts the July 1 pre-launch cost decision once usage inputs are projection-grade and provider runtime proof passes", () => {
    const evidenceRoot = ".ai/03_plans/2026-06-29-Cloudflare-Migration-Codex/evidence";
    const hostedPerformance = JSON.parse(readFileSync(`${evidenceRoot}/2026-07-01-cloudflare-hosted-performance.json`, "utf8"));
    Object.assign(hostedPerformance, {
      p95BudgetReady: false,
      p95BudgetWatch: true,
      strictHostedClientP95Ready: false,
      hostedCredentialFreePerformanceReady: true,
    });
    hostedPerformance.results = hostedPerformance.results.map((result: { key?: string }) =>
      result.key === "home"
        ? {
            ...result,
            p95TtfbMs: 275,
            p95DurationMs: 275,
            p95BudgetPassed: false,
          }
        : result,
    );
    const workbook = buildCloudflareCostPerformanceWorkbook({
      inventory: JSON.parse(readFileSync(`${evidenceRoot}/2026-06-30-cloudflare-migration-inventory.json`, "utf8")),
      workerPreviewRouteProbe: JSON.parse(readFileSync(`${evidenceRoot}/2026-06-29-cloudflare-worker-preview-route-probe.json`, "utf8")),
      cloudflareHostedPerformance: hostedPerformance,
      d1RuntimePerformanceProof: JSON.parse(readFileSync(`${evidenceRoot}/2026-07-01-cloudflare-d1-runtime-performance-proof.json`, "utf8")),
      betterAuthProviderProof: JSON.parse(readFileSync(`${evidenceRoot}/2026-07-01-cloudflare-better-auth-provider-proof.json`, "utf8")),
      jobsRuntimeProof: JSON.parse(readFileSync(`${evidenceRoot}/2026-07-01-cloudflare-jobs-runtime-proof.json`, "utf8")),
      providerRuntimeProof: JSON.parse(readFileSync(`${evidenceRoot}/2026-07-01-cloudflare-provider-runtime-proof.json`, "utf8")),
      hostedUploadRuntimeProof: JSON.parse(readFileSync(`${evidenceRoot}/2026-07-01-cloudflare-hosted-upload-runtime-proof.json`, "utf8")),
      durableObjectWebSocketProof: JSON.parse(readFileSync(`${evidenceRoot}/2026-07-01-cloudflare-durable-object-websocket-proof.json`, "utf8")),
      emailSendProof: JSON.parse(readFileSync(`${evidenceRoot}/2026-07-01-cloudflare-email-send-proof.json`, "utf8")),
      cloudflarePricingSnapshot: JSON.parse(readFileSync(`${evidenceRoot}/2026-06-30-cloudflare-official-pricing-snapshot.json`, "utf8")),
      sanitizedUsageInputs: JSON.parse(readFileSync(`${evidenceRoot}/2026-07-01-cloudflare-sanitized-usage-inputs.json`, "utf8")),
    });

    expect(workbook.readiness.cloudflareUsageCostsReady).toBe(true);
    expect(workbook.readiness.productionRuntimePerformanceReady).toBe(true);
    expect(workbook.readiness.strictHostedClientP95Ready).toBe(false);
    expect(workbook.readiness.aggregateHostedPerformanceReady).toBe(true);
    expect(workbook.readiness.hostedPerformanceReady).toBe(false);
    expect(workbook.readiness.productionCostDecisionReady).toBe(true);
    expect(workbook.cloudflareCostInputs.find((row) => row.input === "Workers requests")).toMatchObject({
      status: "provided",
      basis: "observed-and-projected",
    });
    expect(workbook.cloudflareCostInputs.find((row) => row.input === "KV reads/writes/lists")).toMatchObject({
      status: "provided",
      basis: "not-applicable",
    });
    expect(workbook.performanceFixtures.find((row) => row.fixture === "Login/auth callback p95 duration")).toMatchObject({
      status: "hosted-provider-proof-only",
      hostedEvidence: "provided-better-auth-provider-proof",
    });
    expect(workbook.performanceFixtures.find((row) => row.fixture === "Upload signed/session creation p95")).toMatchObject({
      status: "hosted-provider-pass",
    });
  });
});
