#!/usr/bin/env bun

import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";

type EvidenceStatus = "missing" | "provided" | "local-derived";
type PerformanceStatus = "missing" | "local-only-pass" | "local-only-fail" | "hosted-partial-pass" | "hosted-partial-fail";

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

type SanitizedUsageInput = {
  value: string;
  source?: string;
  notes?: string;
};

type SanitizedUsageInputs = Record<string, SanitizedUsageInput>;

export type WorkbookInputRow = {
  input: string;
  source: string;
  status: EvidenceStatus;
  value: string | null;
  notes: string;
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
    cloudflarePricingSnapshot: string | null;
    sanitizedUsageInputs: string | null;
  };
  readiness: {
    currentProviderCostsReady: boolean;
    cloudflarePricingRefreshed: boolean;
    cloudflareUsageCostsReady: boolean;
    localPreviewPerformanceCaptured: boolean;
    hostedCredentialFreePerformanceCaptured: boolean;
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
  cloudflarePricingSnapshot?: PricingSnapshotReport | null;
  cloudflarePricingSnapshotSource?: string | null;
  sanitizedUsageInputs?: SanitizedUsageInputs | null;
  sanitizedUsageInputsSource?: string | null;
  generatedAt?: string;
};

const PLAN_ROOT = ".ai/03_plans/2026-06-29-Cloudflare-Migration-Codex/evidence";
const DEFAULT_INVENTORY_FILE = `${PLAN_ROOT}/2026-06-30-cloudflare-migration-inventory.json`;
const DEFAULT_ROUTE_PROBE_FILE = `${PLAN_ROOT}/2026-06-29-cloudflare-worker-preview-route-probe.json`;
const DEFAULT_HOSTED_PERFORMANCE_FILE = `${PLAN_ROOT}/2026-06-30-cloudflare-hosted-performance.json`;
const DEFAULT_PRICING_SNAPSHOT_FILE = `${PLAN_ROOT}/2026-06-30-cloudflare-official-pricing-snapshot.json`;
const DEFAULT_SANITIZED_USAGE_INPUTS_FILE = `${PLAN_ROOT}/2026-06-30-cloudflare-sanitized-usage-inputs.json`;

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

function applySanitizedUsageRows(rows: readonly (readonly [string, string])[], usageInputs: SanitizedUsageInputs | null | undefined) {
  return rows.map(([input, source]): WorkbookInputRow => {
    const provided = usageInputs?.[input];
    return {
      input,
      source: provided?.source ?? source,
      status: provided ? "provided" : "missing",
      value: provided?.value ?? null,
      notes: provided?.notes ?? "Requires sanitized dashboard/invoice/metrics input before cost decisions.",
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
        }
      : undefined,
    "D1 reads": inventory?.counts?.distinctRpcNames
      ? {
          value: `${inventory.counts.distinctRpcNames} app-code RPC names need read/write classification`,
          source: "cf:inventory",
          notes: "Inventory-derived rewrite surface only; not D1 row-read volume.",
        }
      : undefined,
    "D1 writes": inventory?.sqlInventory?.functionDeclarationMatches
      ? {
          value: `${inventory.sqlInventory.functionDeclarationMatches} SQL function declaration/update matches need transaction classification`,
          source: "cf:inventory",
          notes: "Inventory-derived rewrite surface only; not D1 row-write volume.",
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
      };
    }
    if (derivedValue) {
      return {
        input,
        source: derivedValue.source ?? source,
        status: "local-derived",
        value: derivedValue.value,
        notes: derivedValue.notes ?? "Local-derived planning input only.",
      };
    }
    return {
      input,
      source,
      status: "missing",
      value: null,
      notes: "Requires hosted Cloudflare proof or sanitized usage input before cost decisions.",
    };
  });
}

function buildPerformanceFixtures(
  routeProbe: WorkerPreviewReport | null | undefined,
  routeProbeSource: string | null | undefined,
  hostedPerformance: HostedPerformanceReport | null | undefined,
  hostedPerformanceSource: string | null | undefined,
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

function allRowsProvided(rows: WorkbookInputRow[]) {
  return rows.every((row) => row.status === "provided");
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
  );
  const localPreviewPerformanceCaptured = performanceFixtures.some((fixture) =>
    fixture.cloudflareLocalPreviewP95Ms !== null && fixture.evidence !== null
  );
  const hostedCredentialFreePerformanceCaptured =
    inputs.cloudflareHostedPerformance?.mode === "cloudflare-hosted-worker-performance"
    && inputs.cloudflareHostedPerformance.providerBacked === true
    && inputs.cloudflareHostedPerformance.routeContractReady === true;
  const hostedPerformanceReady = performanceFixtures.length > 0
    && performanceFixtures.every((fixture) => fixture.status === "hosted-partial-pass")
    && inputs.cloudflareHostedPerformance?.hostedPerformanceReady === true;
  const cloudflarePricingRefreshed = pricingSnapshotRefreshed(inputs.cloudflarePricingSnapshot);

  return {
    generatedAt: inputs.generatedAt ?? new Date().toISOString(),
    mode: "cloudflare-cost-performance-workbook",
    sources: {
      inventory: inputs.inventorySource ?? null,
      workerPreviewRouteProbe: inputs.workerPreviewRouteProbeSource ?? null,
      cloudflareHostedPerformance: inputs.cloudflareHostedPerformanceSource ?? null,
      cloudflarePricingSnapshot: inputs.cloudflarePricingSnapshotSource ?? null,
      sanitizedUsageInputs: inputs.sanitizedUsageInputsSource ?? null,
    },
    readiness: {
      currentProviderCostsReady: allRowsProvided(currentProviderCostInputs),
      cloudflarePricingRefreshed,
      cloudflareUsageCostsReady: cloudflareCostInputs.every((row) => row.status === "provided"),
      localPreviewPerformanceCaptured,
      hostedCredentialFreePerformanceCaptured,
      hostedPerformanceReady,
      productionCostDecisionReady: false,
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
    row.value ?? "",
    row.source,
    row.notes.replaceAll("|", "\\|"),
  ]);
  const cloudflareRows = workbook.cloudflareCostInputs.map((row) => [
    row.input,
    row.status,
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
    "| Input | Status | Value | Source | Notes |",
    "| --- | --- | --- | --- | --- |",
    ...markdownRows(currentRows),
    "",
    "## Cloudflare Cost Inputs",
    "",
    "| Input | Status | Value | Source | Notes |",
    "| --- | --- | --- | --- | --- |",
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
  const pricingSnapshotFile = readEnv("CLOUDFLARE_PRICING_SNAPSHOT_FILE") ?? DEFAULT_PRICING_SNAPSHOT_FILE;
  const usageInputsFile = readEnv("CLOUDFLARE_SANITIZED_USAGE_INPUTS_FILE") ?? DEFAULT_SANITIZED_USAGE_INPUTS_FILE;
  const inventory = readJsonIfExists<InventoryReport>(inventoryFile);
  const routeProbe = readJsonIfExists<WorkerPreviewReport>(routeProbeFile);
  const hostedPerformance = readJsonIfExists<HostedPerformanceReport>(hostedPerformanceFile);
  const pricingSnapshot = readJsonIfExists<PricingSnapshotReport>(pricingSnapshotFile);
  const usageInputs = readJsonIfExists<SanitizedUsageInputs>(usageInputsFile);

  return {
    inventory: inventory.value,
    inventorySource: inventory.value ? inventory.source : null,
    workerPreviewRouteProbe: routeProbe.value,
    workerPreviewRouteProbeSource: routeProbe.value ? routeProbe.source : null,
    cloudflareHostedPerformance: hostedPerformance.value,
    cloudflareHostedPerformanceSource: hostedPerformance.value ? hostedPerformance.source : null,
    cloudflarePricingSnapshot: pricingSnapshot.value,
    cloudflarePricingSnapshotSource: pricingSnapshot.value ? pricingSnapshot.source : null,
    sanitizedUsageInputs: usageInputs.value,
    sanitizedUsageInputsSource: usageInputs.value ? usageInputs.source : null,
  };
}

async function main() {
  const workbook = buildCloudflareCostPerformanceWorkbook(collectRepoInputs());
  const outputFile = readEnv("OUTPUT_FILE") ?? `${PLAN_ROOT}/2026-06-30-cloudflare-cost-performance-workbook.json`;
  const markdownFile = readEnv("MARKDOWN_FILE") ?? `${PLAN_ROOT}/2026-06-30-cloudflare-cost-performance-workbook.md`;
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
