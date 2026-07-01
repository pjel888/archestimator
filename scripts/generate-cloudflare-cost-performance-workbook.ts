#!/usr/bin/env bun

import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";

type EvidenceStatus = "missing" | "provided" | "local-derived";
type PerformanceStatus =
  | "missing"
  | "local-only-pass"
  | "local-only-fail"
  | "hosted-partial-pass"
  | "hosted-partial-fail"
  | "hosted-provider-pass"
  | "hosted-provider-proof-only"
  | "hosted-provider-fail";

type WorkerPreviewReport = {
  mode?: string;
  results?: Array<{
    key: string;
    label: string;
    required: boolean;
    samples: Array<{
      ttfbMs?: number | null;
      durationMs: number | null;
      passed: boolean;
      error: string | null;
    }>;
  }>;
};

type HostedPerformanceReport = {
  mode?: string;
  providerBacked?: boolean;
  proofScope?: string;
  routeContractReady?: boolean;
  hostedCredentialFreePerformanceReady?: boolean;
  hostedPerformanceReady?: boolean;
  results?: Array<{
    key: string;
    required?: boolean;
    p95TtfbMs?: number | null;
    p95DurationMs?: number | null;
    passed?: boolean;
    p95BudgetPassed?: boolean | null;
    samples?: Array<{
      ttfbMs?: number | null;
      durationMs: number | null;
      passed: boolean;
      error: string | null;
    }>;
  }>;
};

type InventoryReport = {
  counts?: {
    appRoutes?: number;
    providerCoupledFiles?: number;
    distinctRpcNames?: number;
    packageScripts?: number;
    cloudflareScripts?: number;
    providerReadinessScripts?: number;
  };
  sqlInventory?: {
    appliedMigrationFiles?: number;
    pendingReviewFiles?: number;
    functionDeclarationMatches?: number;
    rlsPolicyStorageAuthMatches?: number;
  };
};

type PricingSnapshotReport = {
  mode?: string;
  readiness?: {
    officialCloudflarePricingRefreshed?: boolean;
    productionCostDecisionReady?: boolean;
    requiredProductsMissing?: string[];
    invalidSourceUrlCount?: number;
  };
};

type D1RuntimePerformanceProofReport = {
  mode?: string;
  providerBacked?: boolean;
  readiness?: {
    hostedWorkerD1PerformanceReady?: boolean;
    d1RuntimeProofReady?: boolean;
  };
  result?: {
    benchmarkRows?: Array<{
      surface?: string;
      hostedBudgetMs?: number | null;
      hostedP95Ms?: number | null;
      sampleCount?: number | null;
      status?: string;
      notes?: string;
    }>;
  };
};

type BetterAuthProviderProofReport = {
  mode?: string;
  providerBacked?: boolean;
  readiness?: {
    betterAuthProviderProofReady?: boolean;
    providerBackedCallbackSessionCutoverReady?: boolean;
    routeGateSessionReadbackReady?: boolean;
  };
};

type JobsRuntimeProofReport = {
  mode?: string;
  providerBacked?: boolean;
  queueLatency?: {
    sampleCount?: number | null;
    p95Ms?: number | null;
    samplesMs?: number[];
  };
  readiness?: {
    productionJobsMessagingReady?: boolean;
    queueSendReady?: boolean;
    queueConsumerReceiptReady?: boolean;
    cronProviderExecutionProven?: boolean;
  };
};

type ProviderRuntimeProofReport = {
  mode?: string;
  providerBacked?: boolean;
  readiness?: {
    providerRuntimeProofReady?: boolean;
    r2ProviderProofReady?: boolean;
    imagesProviderProofReady?: boolean;
  };
};

type HostedUploadRuntimeProofReport = {
  mode?: string;
  proofBoundary?: string;
  passed?: boolean;
  productionProofReady?: boolean;
  runs?: number | null;
  concurrency?: number | null;
  samples?: Array<{
    type?: string;
    status?: number | null;
    durationMs?: number | null;
    passed?: boolean;
    bodySummary?: {
      configuredLimits?: Record<string, unknown> | null;
      storageLatency?: {
        status?: string | null;
        durationMs?: number | null;
        bucketReachable?: boolean | null;
      } | null;
    };
  }>;
};

type DurableObjectWebSocketProofReport = {
  mode?: string;
  providerBacked?: boolean;
  sampleCount?: number | null;
  readiness?: {
    durableObjectWebSocketReady?: boolean;
    twoClientsConnected?: boolean;
    presenceRoundTripReady?: boolean;
    broadcastRoundTripReady?: boolean;
    realtimeLatencyP95Ready?: boolean;
  };
  timingsMs?: {
    realtimeEventP95Ms?: number | null;
    presenceTrackToPeerP95Ms?: number | null;
    broadcastToPeerP95Ms?: number | null;
  };
};

type EmailSendProofReport = {
  mode?: string;
  providerBacked?: boolean;
  sendProof?: {
    sentAtApprox?: string | null;
  };
  receiptProof?: {
    received?: boolean;
    receivedAt?: string | null;
  };
  readiness?: {
    emailSendingDomainReady?: boolean;
    outboundArbitraryRecipientSendReady?: boolean;
    gmailReceiptReady?: boolean;
    productionEmailSendProofReady?: boolean;
  };
};

type CostEvidenceBasis = "observed" | "projected" | "observed-and-projected" | "not-applicable" | "proof-sample";

type SanitizedUsageInput = {
  value: string;
  source?: string;
  notes?: string;
  basis?: CostEvidenceBasis;
};

type SanitizedUsageInputs = Record<string, SanitizedUsageInput>;

export type WorkbookInputRow = {
  input: string;
  source: string;
  status: EvidenceStatus;
  value: string | null;
  notes: string;
  basis: CostEvidenceBasis | "local-derived" | "missing" | null;
};

export type PerformanceFixtureRow = {
  fixture: string;
  probeKeys: string[];
  currentBaselineP95Ms: number | null;
  cloudflareLocalPreviewP95Ms: number | null;
  cloudflareHostedP95Ms: number | null;
  budget: string;
  budgetMs: number | null;
  status: PerformanceStatus;
  evidence: string | null;
  hostedEvidence: string | null;
  notes: string;
};

export type CloudflareCostPerformanceWorkbook = {
  generatedAt: string;
  mode: "cloudflare-cost-performance-workbook";
  sources: {
    inventory: string | null;
    workerPreviewRouteProbe: string | null;
    cloudflareHostedPerformance: string | null;
    d1RuntimePerformanceProof: string | null;
    betterAuthProviderProof: string | null;
    jobsRuntimeProof: string | null;
    providerRuntimeProof: string | null;
    hostedUploadRuntimeProof: string | null;
    durableObjectWebSocketProof: string | null;
    emailSendProof: string | null;
    cloudflarePricingSnapshot: string | null;
    sanitizedUsageInputs: string | null;
  };
  readiness: {
    currentProviderCostsReady: boolean;
    cloudflarePricingRefreshed: boolean;
    cloudflareUsageCostsReady: boolean;
    localPreviewPerformanceCaptured: boolean;
    hostedCredentialFreePerformanceCaptured: boolean;
    productionRuntimePerformanceReady: boolean;
    strictHostedClientP95Ready: boolean;
    hostedPerformanceReady: boolean;
    productionCostDecisionReady: boolean;
  };
  inventoryCounts: {
    appRoutes: number | null;
    providerCoupledFiles: number | null;
    distinctRpcNames: number | null;
    appliedMigrationFiles: number | null;
    pendingReviewFiles: number | null;
    sqlFunctionDeclarationMatches: number | null;
    rlsPolicyStorageAuthMatches: number | null;
  };
  currentProviderCostInputs: WorkbookInputRow[];
  cloudflareCostInputs: WorkbookInputRow[];
  performanceFixtures: PerformanceFixtureRow[];
  note: string;
};

type WorkbookInputs = {
  inventory?: InventoryReport | null;
  inventorySource?: string | null;
  workerPreviewRouteProbe?: WorkerPreviewReport | null;
  workerPreviewRouteProbeSource?: string | null;
  cloudflareHostedPerformance?: HostedPerformanceReport | null;
  cloudflareHostedPerformanceSource?: string | null;
  d1RuntimePerformanceProof?: D1RuntimePerformanceProofReport | null;
  d1RuntimePerformanceProofSource?: string | null;
  betterAuthProviderProof?: BetterAuthProviderProofReport | null;
  betterAuthProviderProofSource?: string | null;
  jobsRuntimeProof?: JobsRuntimeProofReport | null;
  jobsRuntimeProofSource?: string | null;
  providerRuntimeProof?: ProviderRuntimeProofReport | null;
  providerRuntimeProofSource?: string | null;
  hostedUploadRuntimeProof?: HostedUploadRuntimeProofReport | null;
  hostedUploadRuntimeProofSource?: string | null;
  durableObjectWebSocketProof?: DurableObjectWebSocketProofReport | null;
  durableObjectWebSocketProofSource?: string | null;
  emailSendProof?: EmailSendProofReport | null;
  emailSendProofSource?: string | null;
  cloudflarePricingSnapshot?: PricingSnapshotReport | null;
  cloudflarePricingSnapshotSource?: string | null;
  sanitizedUsageInputs?: SanitizedUsageInputs | null;
  sanitizedUsageInputsSource?: string | null;
  generatedAt?: string;
};

const PLAN_ROOT = ".ai/03_plans/2026-06-29-Cloudflare-Migration-Codex/evidence";
const DEFAULT_INVENTORY_FILE = `${PLAN_ROOT}/2026-06-30-cloudflare-migration-inventory.json`;
const DEFAULT_ROUTE_PROBE_FILE = `${PLAN_ROOT}/2026-06-29-cloudflare-worker-preview-route-probe.json`;
const DEFAULT_HOSTED_PERFORMANCE_FILE = `${PLAN_ROOT}/2026-07-01-cloudflare-hosted-performance.json`;
const DEFAULT_D1_RUNTIME_PERFORMANCE_FILE = `${PLAN_ROOT}/2026-07-01-cloudflare-d1-runtime-performance-proof.json`;
const DEFAULT_BETTER_AUTH_PROVIDER_PROOF_FILE = `${PLAN_ROOT}/2026-07-01-cloudflare-better-auth-provider-proof.json`;
const DEFAULT_JOBS_RUNTIME_PROOF_FILE = `${PLAN_ROOT}/2026-07-01-cloudflare-jobs-runtime-proof.json`;
const DEFAULT_PROVIDER_RUNTIME_PROOF_FILE = `${PLAN_ROOT}/2026-07-01-cloudflare-provider-runtime-proof.json`;
const DEFAULT_HOSTED_UPLOAD_RUNTIME_PROOF_FILE = `${PLAN_ROOT}/2026-07-01-cloudflare-hosted-upload-runtime-proof.json`;
const DEFAULT_DURABLE_OBJECT_WEBSOCKET_PROOF_FILE = `${PLAN_ROOT}/2026-07-01-cloudflare-durable-object-websocket-proof.json`;
const DEFAULT_EMAIL_SEND_PROOF_FILE = `${PLAN_ROOT}/2026-07-01-cloudflare-email-send-proof.json`;
const DEFAULT_PRICING_SNAPSHOT_FILE = `${PLAN_ROOT}/2026-06-30-cloudflare-official-pricing-snapshot.json`;
const DEFAULT_SANITIZED_USAGE_INPUTS_FILE = `${PLAN_ROOT}/2026-07-01-cloudflare-sanitized-usage-inputs.json`;

const CURRENT_PROVIDER_INPUTS = [
  ["Vercel plan cost", "Vercel dashboard/invoice"],
  ["Vercel bandwidth", "Vercel usage"],
  ["Vercel function invocations/duration", "Vercel usage"],
  ["Vercel build usage", "Vercel usage"],
  ["Supabase plan cost", "Supabase dashboard/invoice"],
  ["Supabase DB size", "Supabase project metrics"],
  ["Supabase storage GB", "Supabase storage metrics"],
  ["Supabase egress", "Supabase usage"],
  ["Supabase Auth MAU", "Supabase auth metrics"],
  ["Supabase Realtime connections/messages", "Supabase realtime metrics"],
  ["Resend plan cost", "Resend dashboard/invoice"],
  ["Resend sends/events", "Resend dashboard"],
] as const;

const CLOUDFLARE_INPUTS = [
  ["Workers requests", "Monthly dynamic + static requests by route class"],
  ["Workers CPU", "p50/p95 CPU per route/action from hosted proof"],
  ["Workers subrequests", "D1/R2/KV/Queue/Email calls per route/action"],
  ["D1 reads", "Rows read per hot path x monthly calls"],
  ["D1 writes", "Rows written per mutation/job"],
  ["D1 storage", "DB size after import/projection"],
  ["R2 storage", "Object bytes by bucket/class"],
  ["R2 Class A", "Creates, lists, uploads, lifecycle operations"],
  ["R2 Class B", "Reads/downloads/head operations"],
  ["KV reads/writes/lists", "Safe-cache operations only"],
  ["Queues operations", "Writes, reads, deletes, retries in 64 KB units"],
  ["Durable Objects", "Room requests, WebSocket duration/messages/storage if applicable"],
  ["Email Service", "Sends, bounces/events, routing events"],
  ["WAF/rate limiting", "Plan tier, rule count, log needs"],
  ["Turnstile", "Challenge volume and false-positive review"],
  ["Observability/logs", "Log volume, retention, analytics needs"],
] as const;

const PERFORMANCE_FIXTURES = [
  {
    fixture: "Public home route p95 TTFB",
    probeKeys: ["home"],
    budget: "under 200 ms",
    budgetMs: 200,
    notes: "Local route probe duration is not hosted TTFB or Worker CPU.",
  },
  {
    fixture: "Pricing/features static route p95 TTFB",
    probeKeys: ["pricing", "features"],
    budget: "under 200 ms",
    budgetMs: 200,
    notes: "Uses the slower local preview p95 across pricing and features probes.",
  },
  {
    fixture: "Login/auth callback p95 duration",
    probeKeys: ["login"],
    budget: "no worse than baseline",
    budgetMs: null,
    notes: "Local proof only covers the public login page, not OAuth/callback/session refresh.",
  },
  {
    fixture: "Share route p95 TTFB",
    probeKeys: ["share-invalid-page"],
    budget: "under 400 ms",
    budgetMs: 400,
    notes: "Local proof covers a fake invalid share token fail-closed path only.",
  },
  {
    fixture: "Workshop home p95 TTFB",
    probeKeys: ["workshop-signed-out"],
    budget: "under 600 ms",
    budgetMs: 600,
    notes: "Local proof covers signed-out redirect behavior only, not authenticated workshop data.",
  },
  {
    fixture: "Project dashboard p95 TTFB",
    probeKeys: [],
    budget: "under 600 ms",
    budgetMs: 600,
    notes: "Requires authenticated hosted/provider fixture.",
  },
  {
    fixture: "Estimate sheet initial load p95",
    probeKeys: [],
    budget: "no worse than baseline",
    budgetMs: null,
    notes: "Requires authenticated hosted/provider fixture.",
  },
  {
    fixture: "Estimate row mutation p95",
    probeKeys: [],
    budget: "under 500 ms",
    budgetMs: 500,
    notes: "Requires D1/Supabase comparison and mutation fixture.",
  },
  {
    fixture: "Library component search p95",
    probeKeys: [],
    budget: "under 500 ms",
    budgetMs: 500,
    notes: "Requires authenticated hosted/provider fixture.",
  },
  {
    fixture: "Upload signed/session creation p95",
    probeKeys: [],
    budget: "no worse than baseline",
    budgetMs: null,
    notes: "Requires direct-upload replacement or provider fallback proof.",
  },
  {
    fixture: "Upload scan queue latency p95",
    probeKeys: [],
    budget: "job-specific",
    budgetMs: null,
    notes: "Requires Cloudflare Cron/Queues hosted execution proof.",
  },
  {
    fixture: "Realtime cursor/presence latency p95",
    probeKeys: [],
    budget: "no worse than baseline",
    budgetMs: null,
    notes: "Requires Durable Objects/WebSockets or Supabase Realtime comparison proof.",
  },
  {
    fixture: "Email send-to-event latency p95",
    probeKeys: [],
    budget: "no worse than baseline",
    budgetMs: null,
    notes: "Requires Cloudflare Email Service or Resend comparison proof.",
  },
] as const;

function readEnv(name: string) {
  const value = process.env[name];
  return value?.trim() || undefined;
}

function readJsonIfExists<T>(path: string | undefined): { source: string | null; value: T | null } {
  if (!path || !existsSync(path)) return { source: path ?? null, value: null };
  return { source: path, value: JSON.parse(readFileSync(path, "utf8")) as T };
}

function percentile(values: number[], percentileValue: number) {
  if (values.length === 0) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const index = Math.max(0, Math.ceil((percentileValue / 100) * sorted.length) - 1);
  return sorted[index];
}

function routeProbeP95ByKey(routeProbe: WorkerPreviewReport | null | undefined) {
  const values = new Map<string, number>();
  for (const result of routeProbe?.results ?? []) {
    const durations = result.samples
      .map((sample) => sample.ttfbMs ?? sample.durationMs)
      .filter((duration): duration is number => typeof duration === "number" && Number.isFinite(duration));
    const p95 = percentile(durations, 95);
    if (p95 !== null) values.set(result.key, p95);
  }
  return values;
}

function hostedP95ByKey(report: HostedPerformanceReport | null | undefined) {
  const values = new Map<string, number>();
  for (const result of report?.results ?? []) {
    if (typeof result.p95TtfbMs === "number" && Number.isFinite(result.p95TtfbMs)) {
      values.set(result.key, result.p95TtfbMs);
      continue;
    }
    if (typeof result.p95DurationMs === "number" && Number.isFinite(result.p95DurationMs)) {
      values.set(result.key, result.p95DurationMs);
      continue;
    }
    const durations = (result.samples ?? [])
      .map((sample) => sample.ttfbMs ?? sample.durationMs)
      .filter((duration): duration is number => typeof duration === "number" && Number.isFinite(duration));
    const p95 = percentile(durations, 95);
    if (p95 !== null) values.set(result.key, p95);
  }
  return values;
}

function d1RuntimeRowBySurface(report: D1RuntimePerformanceProofReport | null | undefined) {
  const values = new Map<string, NonNullable<NonNullable<D1RuntimePerformanceProofReport["result"]>["benchmarkRows"]>[number]>();
  if (
    report?.mode !== "cloudflare-d1-runtime-performance-proof-verifier"
    || report.providerBacked !== true
    || report.readiness?.hostedWorkerD1PerformanceReady !== true
    || report.readiness.d1RuntimeProofReady !== true
  ) {
    return values;
  }

  for (const row of report.result?.benchmarkRows ?? []) {
    if (row.surface) values.set(row.surface, row);
  }
  return values;
}

function hostedUploadRuntimeReady(report: HostedUploadRuntimeProofReport | null | undefined) {
  return report?.mode === "hosted-upload-runtime-proof"
    && report.proofBoundary === "hosted-runtime-authenticated-dry-run"
    && report.passed === true
    && report.productionProofReady === true;
}

function hostedUploadRuntimeP95Ms(report: HostedUploadRuntimeProofReport | null | undefined) {
  if (!hostedUploadRuntimeReady(report)) return null;
  const durations = (report?.samples ?? [])
    .filter((sample) => sample.type !== "unauthenticated-fail-closed")
    .filter((sample) => sample.status === 200 && sample.passed === true)
    .map((sample) => sample.durationMs)
    .filter((duration): duration is number => typeof duration === "number" && Number.isFinite(duration));
  return percentile(durations, 95);
}

function hostedUploadRuntimeStorageP95Ms(report: HostedUploadRuntimeProofReport | null | undefined) {
  if (!hostedUploadRuntimeReady(report)) return null;
  const durations = (report?.samples ?? [])
    .filter((sample) => sample.type !== "unauthenticated-fail-closed")
    .filter((sample) => sample.status === 200 && sample.passed === true)
    .map((sample) => sample.bodySummary?.storageLatency?.durationMs)
    .filter((duration): duration is number => typeof duration === "number" && Number.isFinite(duration));
  return percentile(durations, 95);
}

function providerRow(
  fixture: (typeof PERFORMANCE_FIXTURES)[number],
  hostedP95: number | null,
  hostedBudgetMs: number | null,
  hostedEvidence: string | null,
  proofReady: boolean,
  notes: string,
): PerformanceFixtureRow | null {
  if (!proofReady) return null;
  const budgetMs = fixture.budgetMs ?? hostedBudgetMs;
  const hasHostedTiming = typeof hostedP95 === "number" && Number.isFinite(hostedP95);
  const budgetPass = hasHostedTiming && (budgetMs === null || hostedP95 < budgetMs);
  return {
    fixture: fixture.fixture,
    probeKeys: [...fixture.probeKeys],
    currentBaselineP95Ms: null,
    cloudflareLocalPreviewP95Ms: null,
    cloudflareHostedP95Ms: hostedP95,
    budget: fixture.budget,
    budgetMs: fixture.budgetMs,
    status: hasHostedTiming ? budgetPass ? "hosted-provider-pass" : "hosted-provider-fail" : "hosted-provider-proof-only",
    evidence: null,
    hostedEvidence,
    notes,
  };
}

function supplementalProviderFixture(
  fixture: (typeof PERFORMANCE_FIXTURES)[number],
  inputs: Pick<
    WorkbookInputs,
    | "d1RuntimePerformanceProof"
    | "d1RuntimePerformanceProofSource"
    | "betterAuthProviderProof"
    | "betterAuthProviderProofSource"
    | "jobsRuntimeProof"
    | "jobsRuntimeProofSource"
    | "providerRuntimeProof"
    | "providerRuntimeProofSource"
    | "hostedUploadRuntimeProof"
    | "hostedUploadRuntimeProofSource"
    | "durableObjectWebSocketProof"
    | "durableObjectWebSocketProofSource"
    | "emailSendProof"
    | "emailSendProofSource"
  >,
) {
  const d1Rows = d1RuntimeRowBySurface(inputs.d1RuntimePerformanceProof);
  const d1Source = inputs.d1RuntimePerformanceProofSource ?? "provided-d1-runtime-performance-proof";
  const betterAuthReady =
    inputs.betterAuthProviderProof?.mode === "cloudflare-better-auth-provider-proof-verifier"
    && inputs.betterAuthProviderProof.providerBacked === true
    && inputs.betterAuthProviderProof.readiness?.betterAuthProviderProofReady === true
    && inputs.betterAuthProviderProof.readiness.providerBackedCallbackSessionCutoverReady === true
    && inputs.betterAuthProviderProof.readiness.routeGateSessionReadbackReady === true;
  const jobsReady =
    inputs.jobsRuntimeProof?.mode === "cloudflare-jobs-runtime-proof-verifier"
    && inputs.jobsRuntimeProof.providerBacked === true
    && inputs.jobsRuntimeProof.readiness?.productionJobsMessagingReady === true;
  const jobsQueueLatencyP95Ms =
    typeof inputs.jobsRuntimeProof?.queueLatency?.p95Ms === "number"
      && Number.isFinite(inputs.jobsRuntimeProof.queueLatency.p95Ms)
      ? inputs.jobsRuntimeProof.queueLatency.p95Ms
      : null;
  const jobsQueueLatencySampleCount =
    typeof inputs.jobsRuntimeProof?.queueLatency?.sampleCount === "number"
      ? inputs.jobsRuntimeProof.queueLatency.sampleCount
      : 0;
  const providerRuntimeReady =
    inputs.providerRuntimeProof?.mode === "cloudflare-provider-runtime-proof-verifier"
    && inputs.providerRuntimeProof.providerBacked === true
    && inputs.providerRuntimeProof.readiness?.providerRuntimeProofReady === true;
  const uploadRuntimeReady = hostedUploadRuntimeReady(inputs.hostedUploadRuntimeProof);
  const uploadRuntimeP95Ms = hostedUploadRuntimeP95Ms(inputs.hostedUploadRuntimeProof);
  const uploadRuntimeStorageP95Ms = hostedUploadRuntimeStorageP95Ms(inputs.hostedUploadRuntimeProof);
  const durableObjectReady =
    inputs.durableObjectWebSocketProof?.mode === "cloudflare-durable-object-websocket-proof"
    && inputs.durableObjectWebSocketProof.providerBacked === true
    && inputs.durableObjectWebSocketProof.readiness?.durableObjectWebSocketReady === true
    && inputs.durableObjectWebSocketProof.readiness.twoClientsConnected === true
    && inputs.durableObjectWebSocketProof.readiness.presenceRoundTripReady === true
    && inputs.durableObjectWebSocketProof.readiness.broadcastRoundTripReady === true
    && inputs.durableObjectWebSocketProof.readiness.realtimeLatencyP95Ready === true;
  const emailSendReady =
    inputs.emailSendProof?.mode === "cloudflare-email-send-proof"
    && inputs.emailSendProof.providerBacked === true
    && inputs.emailSendProof.readiness?.emailSendingDomainReady === true
    && inputs.emailSendProof.readiness.outboundArbitraryRecipientSendReady === true
    && inputs.emailSendProof.readiness.gmailReceiptReady === true
    && inputs.emailSendProof.readiness.productionEmailSendProofReady === true;

  if (fixture.fixture === "Login/auth callback p95 duration") {
    return providerRow(
      fixture,
      null,
      null,
      inputs.betterAuthProviderProofSource ?? "provided-better-auth-provider-proof",
      betterAuthReady,
      "Better Auth provider proof covers hosted D1 schema, Google provider config, magic-link callback, session-cookie issuance, route-gate readback, replay blocking, and cleanup. It is provider-backed but does not expose a p95 timing sample.",
    );
  }

  const d1SurfaceByFixture: Record<string, string> = {
    "Project dashboard p95 TTFB": "workspace_homebase_summary",
    "Estimate sheet initial load p95": "project_estimate_list_summaries",
    "Estimate row mutation p95": "estimate_row_mutation",
    "Library component search p95": "library_overview_summary",
  };
  const surface = d1SurfaceByFixture[fixture.fixture];
  if (surface) {
    const row = d1Rows.get(surface);
    return providerRow(
      fixture,
      typeof row?.hostedP95Ms === "number" ? row.hostedP95Ms : null,
      typeof row?.hostedBudgetMs === "number" ? row.hostedBudgetMs : null,
      d1Source,
      row?.status === "hosted-pass",
      `D1 runtime provider proof maps ${surface} to this fixture: sampleCount=${row?.sampleCount ?? "(unknown)"}, budget=${row?.hostedBudgetMs ?? "(unknown)"}ms. ${row?.notes ?? ""}`.trim(),
    );
  }

  if (fixture.fixture === "Upload signed/session creation p95") {
    if (uploadRuntimeReady) {
      return providerRow(
        fixture,
        uploadRuntimeP95Ms,
        null,
        inputs.hostedUploadRuntimeProofSource ?? "provided-hosted-upload-runtime-proof",
        true,
        `Hosted upload runtime proof covers the secret-gated non-mutating Cloudflare upload runtime route with R2 binding reachability, bounded body probe, and concurrency probe: runs=${inputs.hostedUploadRuntimeProof?.runs ?? "(unknown)"}, concurrency=${inputs.hostedUploadRuntimeProof?.concurrency ?? "(unknown)"}, routeP95=${uploadRuntimeP95Ms ?? "(missing)"}ms, storageProbeP95=${uploadRuntimeStorageP95Ms ?? "(missing)"}ms. It does not return uploaded bytes or bearer secrets and does not prove full real-user upload UX/scanner/CDR behavior.`,
      );
    }
    return providerRow(
      fixture,
      null,
      null,
      inputs.providerRuntimeProofSource ?? "provided-provider-runtime-proof",
      providerRuntimeReady,
      "Provider runtime proof covers Cloudflare Images plus ephemeral R2 put/get/delete/readback. It does not yet prove signed upload session p95.",
    );
  }

  if (fixture.fixture === "Upload scan queue latency p95") {
    return providerRow(
      fixture,
      jobsQueueLatencyP95Ms,
      null,
      inputs.jobsRuntimeProofSource ?? "provided-jobs-runtime-proof",
      jobsReady,
      `Jobs runtime proof covers Queue send, consumer receipt, cron provider execution, and sanitized end-to-end queue receipt latency: sampleCount=${jobsQueueLatencySampleCount}, p95=${jobsQueueLatencyP95Ms ?? "(missing)"}ms.`,
    );
  }

  if (fixture.fixture === "Realtime cursor/presence latency p95") {
    return providerRow(
      fixture,
      typeof inputs.durableObjectWebSocketProof?.timingsMs?.realtimeEventP95Ms === "number"
        ? inputs.durableObjectWebSocketProof.timingsMs.realtimeEventP95Ms
        : null,
      null,
      inputs.durableObjectWebSocketProofSource ?? "provided-durable-object-websocket-proof",
      durableObjectReady,
      `Durable Object WebSocket proof opened two hosted clients and verified peer presence plus broadcast delivery: sampleCount=${inputs.durableObjectWebSocketProof?.sampleCount ?? "(unknown)"}, presenceP95=${inputs.durableObjectWebSocketProof?.timingsMs?.presenceTrackToPeerP95Ms ?? "(unknown)"}ms, broadcastP95=${inputs.durableObjectWebSocketProof?.timingsMs?.broadcastToPeerP95Ms ?? "(unknown)"}ms. Proof-scale only; monthly WebSocket duration/message/storage volume still comes from rollout usage.`,
    );
  }

  if (fixture.fixture === "Email send-to-event latency p95") {
    const sentAt = inputs.emailSendProof?.sendProof?.sentAtApprox
      ? Date.parse(inputs.emailSendProof.sendProof.sentAtApprox)
      : Number.NaN;
    const receivedAt = inputs.emailSendProof?.receiptProof?.receivedAt
      ? Date.parse(inputs.emailSendProof.receiptProof.receivedAt)
      : Number.NaN;
    const receiptLatencyMs =
      Number.isFinite(sentAt) && Number.isFinite(receivedAt) && receivedAt >= sentAt
        ? receivedAt - sentAt
        : null;
    return providerRow(
      fixture,
      receiptLatencyMs,
      null,
      inputs.emailSendProofSource ?? "provided-email-send-proof",
      emailSendReady,
      "Cloudflare Email Service proof sent one arbitrary-recipient message from archestimator.com and verified owner-mailbox receipt by unique subject. This is a send-to-receipt proof-scale sample, not a bounce/event webhook p95.",
    );
  }

  return null;
}

function applySanitizedUsageRows(rows: readonly (readonly [string, string])[], usageInputs: SanitizedUsageInputs | null | undefined) {
  return rows.map(([input, source]): WorkbookInputRow => {
    const provided = usageInputs?.[input];
    return {
      input,
      source: provided?.source ?? source,
      status: provided ? "provided" : "missing",
      value: provided?.value ?? null,
      notes: provided?.notes ?? "Requires sanitized dashboard/invoice/metrics input before cost decisions.",
      basis: provided?.basis ?? (provided ? "observed" : "missing"),
    };
  });
}

function buildCloudflareInputRows(
  inventory: InventoryReport | null | undefined,
  usageInputs: SanitizedUsageInputs | null | undefined,
) {
  const derived: Partial<SanitizedUsageInputs> = {
    "Workers subrequests": inventory?.counts?.providerCoupledFiles
      ? {
          value: `${inventory.counts.providerCoupledFiles} provider-coupled source files need per-route subrequest mapping`,
          source: "cf:inventory",
          notes: "Inventory-derived surface count only; not monthly operation volume.",
          basis: "proof-sample",
        }
      : undefined,
    "D1 reads": inventory?.counts?.distinctRpcNames
      ? {
          value: `${inventory.counts.distinctRpcNames} app-code RPC names need read/write classification`,
          source: "cf:inventory",
          notes: "Inventory-derived rewrite surface only; not D1 row-read volume.",
          basis: "proof-sample",
        }
      : undefined,
    "D1 writes": inventory?.sqlInventory?.functionDeclarationMatches
      ? {
          value: `${inventory.sqlInventory.functionDeclarationMatches} SQL function declaration/update matches need transaction classification`,
          source: "cf:inventory",
          notes: "Inventory-derived rewrite surface only; not D1 row-write volume.",
          basis: "proof-sample",
        }
      : undefined,
  };

  return CLOUDFLARE_INPUTS.map(([input, source]): WorkbookInputRow => {
    const provided = usageInputs?.[input];
    const derivedValue = derived[input];
    if (provided) {
      return {
        input,
        source: provided.source ?? source,
        status: "provided",
        value: provided.value,
        notes: provided.notes ?? "Sanitized usage input supplied.",
        basis: provided.basis ?? null,
      };
    }
    if (derivedValue) {
      return {
        input,
        source: derivedValue.source ?? source,
        status: "local-derived",
        value: derivedValue.value,
        notes: derivedValue.notes ?? "Local-derived planning input only.",
        basis: "local-derived",
      };
    }
    return {
      input,
      source,
      status: "missing",
      value: null,
      notes: "Requires hosted Cloudflare proof or sanitized usage input before cost decisions.",
      basis: "missing",
    };
  });
}

function buildPerformanceFixtures(
  routeProbe: WorkerPreviewReport | null | undefined,
  routeProbeSource: string | null | undefined,
  hostedPerformance: HostedPerformanceReport | null | undefined,
  hostedPerformanceSource: string | null | undefined,
  supplementalInputs: Pick<
    WorkbookInputs,
    | "d1RuntimePerformanceProof"
    | "d1RuntimePerformanceProofSource"
    | "betterAuthProviderProof"
    | "betterAuthProviderProofSource"
    | "jobsRuntimeProof"
    | "jobsRuntimeProofSource"
    | "providerRuntimeProof"
    | "providerRuntimeProofSource"
    | "hostedUploadRuntimeProof"
    | "hostedUploadRuntimeProofSource"
    | "durableObjectWebSocketProof"
    | "durableObjectWebSocketProofSource"
    | "emailSendProof"
    | "emailSendProofSource"
  >,
) {
  const p95ByKey = routeProbeP95ByKey(routeProbe);
  const hostedP95sByKey = hostedP95ByKey(hostedPerformance);
  return PERFORMANCE_FIXTURES.map((fixture): PerformanceFixtureRow => {
    const probeP95s = fixture.probeKeys
      .map((key) => p95ByKey.get(key))
      .filter((value): value is number => typeof value === "number");
    const localP95 = probeP95s.length === 0 ? null : Math.max(...probeP95s);
    const localBudgetPass = localP95 !== null && (fixture.budgetMs === null || localP95 < fixture.budgetMs);
    const hostedProbeP95s = fixture.probeKeys
      .map((key) => hostedP95sByKey.get(key))
      .filter((value): value is number => typeof value === "number");
    const hostedP95 = hostedProbeP95s.length === 0 ? null : Math.max(...hostedProbeP95s);
    const supplemental = fixture.fixture === "Login/auth callback p95 duration" || hostedP95 === null
      ? supplementalProviderFixture(fixture, supplementalInputs)
      : null;
    if (supplemental) return supplemental;
    const hostedBudgetPass = hostedP95 !== null && (fixture.budgetMs === null || hostedP95 < fixture.budgetMs);
    const status: PerformanceStatus = hostedP95 !== null
      ? hostedBudgetPass ? "hosted-partial-pass" : "hosted-partial-fail"
      : localP95 === null ? "missing" : localBudgetPass ? "local-only-pass" : "local-only-fail";
    return {
      fixture: fixture.fixture,
      probeKeys: [...fixture.probeKeys],
      currentBaselineP95Ms: null,
      cloudflareLocalPreviewP95Ms: localP95,
      cloudflareHostedP95Ms: hostedP95,
      budget: fixture.budget,
      budgetMs: fixture.budgetMs,
      status,
      evidence: localP95 === null ? null : routeProbeSource ?? "provided-route-probe",
      hostedEvidence: hostedP95 === null ? null : hostedPerformanceSource ?? "provided-hosted-performance",
      notes: hostedP95 === null
        ? `${fixture.notes} Current-provider baseline and hosted Cloudflare proof are still required.`
        : `${fixture.notes} Hosted evidence here is credential-free route timing only unless the fixture explicitly maps to that route class.`,
    };
  });
}

function performanceStatusReady(status: PerformanceStatus) {
  return status === "hosted-partial-pass" || status === "hosted-provider-pass";
}

function providerRuntimePerformanceReady(fixtures: PerformanceFixtureRow[]) {
  const providerRuntimeFixtureNames = new Set([
    "Project dashboard p95 TTFB",
    "Estimate sheet initial load p95",
    "Estimate row mutation p95",
    "Library component search p95",
    "Upload signed/session creation p95",
    "Upload scan queue latency p95",
    "Realtime cursor/presence latency p95",
    "Email send-to-event latency p95",
  ]);
  const requiredFixtures = fixtures.filter((fixture) => providerRuntimeFixtureNames.has(fixture.fixture));
  return requiredFixtures.length === providerRuntimeFixtureNames.size
    && requiredFixtures.every((fixture) => performanceStatusReady(fixture.status));
}

function allRowsProvided(rows: WorkbookInputRow[]) {
  return rows.every((row) => row.status === "provided");
}

function productionUsageCostBasisReady(row: WorkbookInputRow) {
  if (row.status !== "provided") return false;
  if (row.basis === "observed" || row.basis === "projected" || row.basis === "observed-and-projected" || row.basis === "not-applicable") {
    return Boolean(row.value?.trim()) && Boolean(row.source?.trim());
  }
  if (row.basis === "proof-sample") return false;

  const text = `${row.value ?? ""} ${row.notes}`.toLowerCase();
  const explicitlyZeroOrNotApplicable =
    /\bexpected .*zero\b/.test(text)
    || /\bzero[- ]add[- ]on\b/.test(text)
    || /\bnot applicable to the current runtime\b/.test(text)
    || /\bno .*add[- ]on is required\b/.test(text);
  if (explicitlyZeroOrNotApplicable) return true;

  return !(
    /\bproof[- ]scale\b/.test(text)
    || /\bproof operation\b/.test(text)
    || /\bproof db\b/.test(text)
    || /\bproof buckets?\b/.test(text)
    || /\bnot projected\b/.test(text)
    || /\bnot monthly\b/.test(text)
    || /\bnot a monthly\b/.test(text)
    || /\brollout projection\b/.test(text)
    || /\bwill depend on\b/.test(text)
    || /\bnot observable before real launch\b/.test(text)
    || /\bproduction .*not complete\b/.test(text)
    || /\bbucket byte totals are not exposed\b/.test(text)
    || /\bfuture .*should be modeled separately\b/.test(text)
  );
}

function pricingSnapshotRefreshed(snapshot: PricingSnapshotReport | null | undefined) {
  return (
    snapshot?.mode === "cloudflare-pricing-snapshot" &&
    snapshot.readiness?.officialCloudflarePricingRefreshed === true &&
    snapshot.readiness.invalidSourceUrlCount === 0 &&
    (snapshot.readiness.requiredProductsMissing?.length ?? 0) === 0
  );
}

export function buildCloudflareCostPerformanceWorkbook(inputs: WorkbookInputs): CloudflareCostPerformanceWorkbook {
  const currentProviderCostInputs = applySanitizedUsageRows(CURRENT_PROVIDER_INPUTS, inputs.sanitizedUsageInputs);
  const cloudflareCostInputs = buildCloudflareInputRows(inputs.inventory, inputs.sanitizedUsageInputs);
  const performanceFixtures = buildPerformanceFixtures(
    inputs.workerPreviewRouteProbe,
    inputs.workerPreviewRouteProbeSource,
    inputs.cloudflareHostedPerformance,
    inputs.cloudflareHostedPerformanceSource,
    inputs,
  );
  const localPreviewPerformanceCaptured = performanceFixtures.some((fixture) =>
    fixture.cloudflareLocalPreviewP95Ms !== null && fixture.evidence !== null
  );
  const hostedCredentialFreePerformanceCaptured =
    inputs.cloudflareHostedPerformance?.mode === "cloudflare-hosted-worker-performance"
    && inputs.cloudflareHostedPerformance.providerBacked === true
    && inputs.cloudflareHostedPerformance.routeContractReady === true;
  const strictHostedClientP95Ready = performanceFixtures.length > 0
    && performanceFixtures.every((fixture) => performanceStatusReady(fixture.status))
    && inputs.cloudflareHostedPerformance?.hostedCredentialFreePerformanceReady === true;
  const productionRuntimePerformanceReady =
    hostedCredentialFreePerformanceCaptured
    && providerRuntimePerformanceReady(performanceFixtures);
  const hostedPerformanceReady = strictHostedClientP95Ready;
  const cloudflarePricingRefreshed = pricingSnapshotRefreshed(inputs.cloudflarePricingSnapshot);
  const currentProviderCostsReady = allRowsProvided(currentProviderCostInputs);
  const cloudflareUsageCostsReady = cloudflareCostInputs.every(productionUsageCostBasisReady);
  const productionCostDecisionReady =
    currentProviderCostsReady
    && cloudflarePricingRefreshed
    && cloudflareUsageCostsReady
    && productionRuntimePerformanceReady;

  return {
    generatedAt: inputs.generatedAt ?? new Date().toISOString(),
    mode: "cloudflare-cost-performance-workbook",
    sources: {
      inventory: inputs.inventorySource ?? null,
      workerPreviewRouteProbe: inputs.workerPreviewRouteProbeSource ?? null,
      cloudflareHostedPerformance: inputs.cloudflareHostedPerformanceSource ?? null,
      d1RuntimePerformanceProof: inputs.d1RuntimePerformanceProofSource ?? null,
      betterAuthProviderProof: inputs.betterAuthProviderProofSource ?? null,
      jobsRuntimeProof: inputs.jobsRuntimeProofSource ?? null,
      providerRuntimeProof: inputs.providerRuntimeProofSource ?? null,
      hostedUploadRuntimeProof: inputs.hostedUploadRuntimeProofSource ?? null,
      durableObjectWebSocketProof: inputs.durableObjectWebSocketProofSource ?? null,
      emailSendProof: inputs.emailSendProofSource ?? null,
      cloudflarePricingSnapshot: inputs.cloudflarePricingSnapshotSource ?? null,
      sanitizedUsageInputs: inputs.sanitizedUsageInputsSource ?? null,
    },
    readiness: {
      currentProviderCostsReady,
      cloudflarePricingRefreshed,
      cloudflareUsageCostsReady,
      localPreviewPerformanceCaptured,
      hostedCredentialFreePerformanceCaptured,
      productionRuntimePerformanceReady,
      strictHostedClientP95Ready,
      hostedPerformanceReady,
      productionCostDecisionReady,
    },
    inventoryCounts: {
      appRoutes: inputs.inventory?.counts?.appRoutes ?? null,
      providerCoupledFiles: inputs.inventory?.counts?.providerCoupledFiles ?? null,
      distinctRpcNames: inputs.inventory?.counts?.distinctRpcNames ?? null,
      appliedMigrationFiles: inputs.inventory?.sqlInventory?.appliedMigrationFiles ?? null,
      pendingReviewFiles: inputs.inventory?.sqlInventory?.pendingReviewFiles ?? null,
      sqlFunctionDeclarationMatches: inputs.inventory?.sqlInventory?.functionDeclarationMatches ?? null,
      rlsPolicyStorageAuthMatches: inputs.inventory?.sqlInventory?.rlsPolicyStorageAuthMatches ?? null,
    },
    currentProviderCostInputs,
    cloudflareCostInputs,
    performanceFixtures,
    note: "Workbook scaffold only. Local inventory, refreshed official Cloudflare pricing, and Worker preview durations can seed planning, but cost decisions still require sanitized Vercel/Supabase/Resend dashboard data, hosted Cloudflare usage metrics, provider logs, rollback triggers, and the same proof architecture for cost and performance evidence.",
  };
}

function writeOutput(outputFile: string, workbook: CloudflareCostPerformanceWorkbook) {
  const outputPath = resolve(outputFile);
  mkdirSync(dirname(outputPath), { recursive: true });
  writeFileSync(outputPath, `${JSON.stringify(workbook, null, 2)}\n`);
}

function markdownRows(rows: string[][]) {
  return rows.map((row) => `| ${row.join(" | ")} |`);
}

export function writeMarkdown(workbook: CloudflareCostPerformanceWorkbook, markdownFile: string) {
  const outputPath = resolve(markdownFile);
  mkdirSync(dirname(outputPath), { recursive: true });
  const currentRows = workbook.currentProviderCostInputs.map((row) => [
    row.input,
    row.status,
    row.basis ?? "",
    row.value ?? "",
    row.source,
    row.notes.replaceAll("|", "\\|"),
  ]);
  const cloudflareRows = workbook.cloudflareCostInputs.map((row) => [
    row.input,
    row.status,
    row.basis ?? "",
    row.value ?? "",
    row.source,
    row.notes.replaceAll("|", "\\|"),
  ]);
  const fixtureRows = workbook.performanceFixtures.map((row) => [
    row.fixture,
    row.currentBaselineP95Ms === null ? "" : `${row.currentBaselineP95Ms}ms`,
    row.cloudflareLocalPreviewP95Ms === null ? "" : `${row.cloudflareLocalPreviewP95Ms}ms`,
    row.cloudflareHostedP95Ms === null ? "" : `${row.cloudflareHostedP95Ms}ms`,
    row.budget,
    row.status,
    row.evidence ?? "",
    row.hostedEvidence ?? "",
  ]);
  const lines = [
    "# Cloudflare Cost And Performance Workbook",
    "",
    `Generated: ${workbook.generatedAt}`,
    "",
    workbook.note,
    "",
    "## Readiness",
    "",
    "| Gate | Ready |",
    "| --- | --- |",
    `| Current provider costs ready | ${workbook.readiness.currentProviderCostsReady ? "yes" : "no"} |`,
    `| Cloudflare pricing refreshed | ${workbook.readiness.cloudflarePricingRefreshed ? "yes" : "no"} |`,
    `| Cloudflare usage costs ready | ${workbook.readiness.cloudflareUsageCostsReady ? "yes" : "no"} |`,
    `| Local preview performance captured | ${workbook.readiness.localPreviewPerformanceCaptured ? "yes" : "no"} |`,
    `| Hosted credential-free performance captured | ${workbook.readiness.hostedCredentialFreePerformanceCaptured ? "yes" : "no"} |`,
    `| Production runtime performance ready | ${workbook.readiness.productionRuntimePerformanceReady ? "yes" : "no"} |`,
    `| Strict hosted client p95 ready | ${workbook.readiness.strictHostedClientP95Ready ? "yes" : "no"} |`,
    `| Hosted performance ready | ${workbook.readiness.hostedPerformanceReady ? "yes" : "no"} |`,
    `| Production cost decision ready | ${workbook.readiness.productionCostDecisionReady ? "yes" : "no"} |`,
    "",
    "## Inventory Counts",
    "",
    "| Item | Count |",
    "| --- | ---: |",
    `| App routes | ${workbook.inventoryCounts.appRoutes ?? ""} |`,
    `| Provider-coupled files | ${workbook.inventoryCounts.providerCoupledFiles ?? ""} |`,
    `| Distinct RPC names | ${workbook.inventoryCounts.distinctRpcNames ?? ""} |`,
    `| Applied SQL migrations | ${workbook.inventoryCounts.appliedMigrationFiles ?? ""} |`,
    `| Pending-review SQL files | ${workbook.inventoryCounts.pendingReviewFiles ?? ""} |`,
    `| SQL function declaration/update matches | ${workbook.inventoryCounts.sqlFunctionDeclarationMatches ?? ""} |`,
    `| RLS/policy/storage/auth matches | ${workbook.inventoryCounts.rlsPolicyStorageAuthMatches ?? ""} |`,
    "",
    "## Current Provider Cost Inputs",
    "",
    "| Input | Status | Basis | Value | Source | Notes |",
    "| --- | --- | --- | --- | --- | --- |",
    ...markdownRows(currentRows),
    "",
    "## Cloudflare Cost Inputs",
    "",
    "| Input | Status | Basis | Value | Source | Notes |",
    "| --- | --- | --- | --- | --- | --- |",
    ...markdownRows(cloudflareRows),
    "",
    "## Performance Fixtures",
    "",
    "| Fixture | Current p95 | Local Worker preview p95 | Hosted Worker p95 | Budget | Status | Local evidence | Hosted evidence |",
    "| --- | ---: | ---: | ---: | --- | --- | --- | --- |",
    ...markdownRows(fixtureRows),
    "",
  ];
  writeFileSync(outputPath, lines.join("\n"));
}

function collectRepoInputs(): WorkbookInputs {
  const inventoryFile = readEnv("CLOUDFLARE_MIGRATION_INVENTORY_FILE") ?? DEFAULT_INVENTORY_FILE;
  const routeProbeFile = readEnv("CLOUDFLARE_WORKER_ROUTE_PROBE_FILE") ?? DEFAULT_ROUTE_PROBE_FILE;
  const hostedPerformanceFile = readEnv("CLOUDFLARE_HOSTED_PERFORMANCE_FILE") ?? DEFAULT_HOSTED_PERFORMANCE_FILE;
  const d1RuntimePerformanceFile = readEnv("CLOUDFLARE_D1_RUNTIME_PERFORMANCE_FILE") ?? DEFAULT_D1_RUNTIME_PERFORMANCE_FILE;
  const betterAuthProviderProofFile = readEnv("CLOUDFLARE_BETTER_AUTH_PROVIDER_PROOF_FILE") ?? DEFAULT_BETTER_AUTH_PROVIDER_PROOF_FILE;
  const jobsRuntimeProofFile = readEnv("CLOUDFLARE_JOBS_RUNTIME_PROOF_FILE") ?? DEFAULT_JOBS_RUNTIME_PROOF_FILE;
  const providerRuntimeProofFile = readEnv("CLOUDFLARE_PROVIDER_RUNTIME_PROOF_FILE") ?? DEFAULT_PROVIDER_RUNTIME_PROOF_FILE;
  const hostedUploadRuntimeProofFile = readEnv("CLOUDFLARE_HOSTED_UPLOAD_RUNTIME_PROOF_FILE") ?? DEFAULT_HOSTED_UPLOAD_RUNTIME_PROOF_FILE;
  const durableObjectWebSocketProofFile = readEnv("CLOUDFLARE_DURABLE_OBJECT_WEBSOCKET_PROOF_FILE") ?? DEFAULT_DURABLE_OBJECT_WEBSOCKET_PROOF_FILE;
  const emailSendProofFile = readEnv("CLOUDFLARE_EMAIL_SEND_PROOF_FILE") ?? DEFAULT_EMAIL_SEND_PROOF_FILE;
  const pricingSnapshotFile = readEnv("CLOUDFLARE_PRICING_SNAPSHOT_FILE") ?? DEFAULT_PRICING_SNAPSHOT_FILE;
  const usageInputsFile = readEnv("CLOUDFLARE_SANITIZED_USAGE_INPUTS_FILE") ?? DEFAULT_SANITIZED_USAGE_INPUTS_FILE;
  const inventory = readJsonIfExists<InventoryReport>(inventoryFile);
  const routeProbe = readJsonIfExists<WorkerPreviewReport>(routeProbeFile);
  const hostedPerformance = readJsonIfExists<HostedPerformanceReport>(hostedPerformanceFile);
  const d1RuntimePerformance = readJsonIfExists<D1RuntimePerformanceProofReport>(d1RuntimePerformanceFile);
  const betterAuthProviderProof = readJsonIfExists<BetterAuthProviderProofReport>(betterAuthProviderProofFile);
  const jobsRuntimeProof = readJsonIfExists<JobsRuntimeProofReport>(jobsRuntimeProofFile);
  const providerRuntimeProof = readJsonIfExists<ProviderRuntimeProofReport>(providerRuntimeProofFile);
  const hostedUploadRuntimeProof = readJsonIfExists<HostedUploadRuntimeProofReport>(hostedUploadRuntimeProofFile);
  const durableObjectWebSocketProof = readJsonIfExists<DurableObjectWebSocketProofReport>(durableObjectWebSocketProofFile);
  const emailSendProof = readJsonIfExists<EmailSendProofReport>(emailSendProofFile);
  const pricingSnapshot = readJsonIfExists<PricingSnapshotReport>(pricingSnapshotFile);
  const usageInputs = readJsonIfExists<SanitizedUsageInputs>(usageInputsFile);

  return {
    inventory: inventory.value,
    inventorySource: inventory.value ? inventory.source : null,
    workerPreviewRouteProbe: routeProbe.value,
    workerPreviewRouteProbeSource: routeProbe.value ? routeProbe.source : null,
    cloudflareHostedPerformance: hostedPerformance.value,
    cloudflareHostedPerformanceSource: hostedPerformance.value ? hostedPerformance.source : null,
    d1RuntimePerformanceProof: d1RuntimePerformance.value,
    d1RuntimePerformanceProofSource: d1RuntimePerformance.value ? d1RuntimePerformance.source : null,
    betterAuthProviderProof: betterAuthProviderProof.value,
    betterAuthProviderProofSource: betterAuthProviderProof.value ? betterAuthProviderProof.source : null,
    jobsRuntimeProof: jobsRuntimeProof.value,
    jobsRuntimeProofSource: jobsRuntimeProof.value ? jobsRuntimeProof.source : null,
    providerRuntimeProof: providerRuntimeProof.value,
    providerRuntimeProofSource: providerRuntimeProof.value ? providerRuntimeProof.source : null,
    hostedUploadRuntimeProof: hostedUploadRuntimeProof.value,
    hostedUploadRuntimeProofSource: hostedUploadRuntimeProof.value ? hostedUploadRuntimeProof.source : null,
    durableObjectWebSocketProof: durableObjectWebSocketProof.value,
    durableObjectWebSocketProofSource: durableObjectWebSocketProof.value ? durableObjectWebSocketProof.source : null,
    emailSendProof: emailSendProof.value,
    emailSendProofSource: emailSendProof.value ? emailSendProof.source : null,
    cloudflarePricingSnapshot: pricingSnapshot.value,
    cloudflarePricingSnapshotSource: pricingSnapshot.value ? pricingSnapshot.source : null,
    sanitizedUsageInputs: usageInputs.value,
    sanitizedUsageInputsSource: usageInputs.value ? usageInputs.source : null,
  };
}

async function main() {
  const workbook = buildCloudflareCostPerformanceWorkbook(collectRepoInputs());
  const outputFile = readEnv("OUTPUT_FILE") ?? `${PLAN_ROOT}/2026-07-01-cloudflare-cost-performance-workbook.json`;
  const markdownFile = readEnv("MARKDOWN_FILE") ?? `${PLAN_ROOT}/2026-07-01-cloudflare-cost-performance-workbook.md`;
  writeOutput(outputFile, workbook);
  writeMarkdown(workbook, markdownFile);
  console.log(JSON.stringify(workbook, null, 2));
}

if (import.meta.main) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  });
}
