#!/usr/bin/env bun

import { createHash } from "node:crypto";
import { spawn, type ChildProcessWithoutNullStreams } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";

import {
  chromium,
  type Browser,
  type BrowserContextOptions,
  type Page,
} from "@playwright/test";

import { ESTIMATE_SHEET_TREE_LOAD_LIMITS } from "../src/lib/estimates/load-limits";
import {
  ESTIMATE_LOADING_STAGE_NAMES,
  type EstimateLoadingStageName,
} from "../src/lib/perf/estimate-loading-stages";

export { ESTIMATE_LOADING_STAGE_NAMES, type EstimateLoadingStageName };
export type EstimateFixtureClass = "small" | "large" | "load-limit";
export type EstimateLoadingRuntime = "next-production" | "opennext-preview";
export type EstimateNavigationKind = "hard-refresh" | "client-navigation";
export type EstimateCacheState = "warm" | "cold-proxy";
export type EstimatePrefetchState = "not-applicable" | "no-hover" | "hover-prefetch" | "warm-revisit";

export type EstimateLoadingDimensions = {
  runtime: EstimateLoadingRuntime;
  fixtureClass: EstimateFixtureClass;
  navigationKind: EstimateNavigationKind;
  cacheState: EstimateCacheState;
  prefetchState: EstimatePrefetchState;
};

export type EstimateLoadingFixture = {
  class: EstimateFixtureClass;
  syntheticId: string;
  estimatePath: string;
  estimatesListPath: string;
  nodeCount: number;
  rowItemCount: number;
  schemaRevision: string;
  loadLimits: {
    maxNodeCount: number;
    maxRowItemCount: number;
  };
};

export type EstimateLoadingFixtureManifest = {
  schemaVersion: 1;
  sourceRevision: string;
  redactionStatus: "synthetic-only";
  fixtures: EstimateLoadingFixture[];
};

type PerfTraceEvent = {
  label: string;
  kind: "timing" | "database";
  elapsedMs: number;
};

export type PerfTraceSnapshot = {
  requestId: string;
  scope: string;
  timings: PerfTraceEvent[];
  databaseRoundTrips: number;
};

export type EstimateLoadingSample = {
  runId: string;
  sampleIndex: number;
  dimensions: EstimateLoadingDimensions;
  processIsolationId: string | null;
  valid: boolean;
  failure: string | null;
  durationMs: number | null;
  ttfbMs: number | null;
  fcpMs: number | null;
  firstInteractiveMs: number | null;
  rscBytes: number | null;
  jsBytes: number | null;
  queryCount: number | null;
  serverRequestId: string | null;
  layoutRequestId: string | null;
  stages: Partial<Record<EstimateLoadingStageName, number>>;
};

export type CanonicalBudgetReference = {
  key: CanonicalBudgetKey;
  heading: string;
  selectors: string[];
  matches: Array<{ line: number; text: string }>;
  digest: string;
};

export type CanonicalBudgetMetadata = {
  path: string;
  sourceRevision: string;
  digest: string;
  references: CanonicalBudgetReference[];
};

export type CanonicalBudgetKey =
  | "BUDGET-WORKSHOP-SHELL"
  | "BUDGET-ESTIMATE-ROUTE"
  | "BUDGET-ESTIMATE-MODULE"
  | "BUDGET-ESTIMATE-INTERACTION"
  | "BUDGET-BUNDLE"
  | "BUDGET-INSTRUMENTATION"
  | "BUDGET-D1";

type MetricDistribution = {
  samples: number;
  p50: number | null;
  p95: number | null;
};

export type EstimateLoadingCell = {
  key: string;
  dimensions: EstimateLoadingDimensions;
  requiredValidSamples: number;
  attemptedSamples: number;
  validSamples: number;
  sufficient: boolean;
  failures: Array<{ runId: string; sampleIndex: number; message: string }>;
  durationMs: MetricDistribution;
  ttfbMs: MetricDistribution;
  fcpMs: MetricDistribution;
  firstInteractiveMs: MetricDistribution;
  rscBytes: MetricDistribution;
  jsBytes: MetricDistribution;
  queryCount: MetricDistribution;
  stages: Record<EstimateLoadingStageName, MetricDistribution>;
  samples: EstimateLoadingSample[];
};

export type EstimateLoadingArtifact = {
  schemaVersion: 1;
  kind: "estimate-loading-performance";
  status: "PASS" | "FAIL";
  generatedAt: string;
  sourceRevision: string;
  sourceWorktreeSha256: string;
  runtimeMode: EstimateLoadingRuntime;
  coldProxyDisclaimer: string | null;
  redactionStatus: "PASS";
  fixedStages: readonly EstimateLoadingStageName[];
  samplePolicy: {
    warmOrNavigationMinimum: number;
    coldProxyMinimum: number;
    percentileMethod: "nearest-rank";
    outlierTrimming: false;
    failuresRetained: true;
  };
  canonicalBudget: CanonicalBudgetMetadata;
  fixtureManifest: {
    sourceRevision: string;
    digest: string;
    fixtures: Array<{
      class: EstimateFixtureClass;
      syntheticId: string;
      nodeCount: number;
      rowItemCount: number;
      schemaRevision: string;
      loadLimits: EstimateLoadingFixture["loadLimits"];
    }>;
  };
  cells: EstimateLoadingCell[];
  contractFailures: string[];
};

const CANONICAL_BUDGET_PATH = ".ai/01_roadmap/27-performance-budget-and-regression-gates.md";
const PERF_JSON_PREFIX = "[perf-json] ";
const ESTIMATE_TRACE_SCOPE = "workshop.estimate-sheet";
const ESTIMATE_LAYOUT_TRACE_SCOPE = "workshop.estimate-layout";
const WARM_OR_NAVIGATION_MINIMUM = 20;
const COLD_PROXY_MINIMUM = 10;
const DEFAULT_INTERACTIVE_SELECTOR =
  "[data-estimate-center-column='sheet'] input:enabled, [data-estimate-center-column='sheet'] button:enabled, [data-estimate-center-column='sheet'] [contenteditable='true']";

const BUDGET_REFERENCE_SPECS: Array<{
  key: CanonicalBudgetKey;
  heading: string;
  selectors: string[];
}> = [
  {
    key: "BUDGET-WORKSHOP-SHELL",
    heading: "Performance Budget by Layer > Route-Level Budgets",
    selectors: ["| `/workshop/*` |"],
  },
  {
    key: "BUDGET-ESTIMATE-ROUTE",
    heading: "Performance Budget by Layer > Route-Level Budgets",
    selectors: ["| `/workshop/projects/[id]/estimates/[id]` |"],
  },
  {
    key: "BUDGET-ESTIMATE-MODULE",
    heading: "Performance Budget by Layer > Module-Level Budgets",
    selectors: ["| Estimate sheet (inline editing) |"],
  },
  {
    key: "BUDGET-ESTIMATE-INTERACTION",
    heading: "Operation-Level Budgets and Performance Smoke Test",
    selectors: ["| Row add/edit (optimistic) |", "# Estimate operations"],
  },
  {
    key: "BUDGET-BUNDLE",
    heading: "Global Rules, Enterprise Rules, and Enterprise Gates",
    selectors: ["## Global Performance Rules", "## Enterprise MVP Stricter Rules", "## Enterprise MVP Performance Gates"],
  },
  {
    key: "BUDGET-INSTRUMENTATION",
    heading: "Enterprise Rules and Enterprise Gates",
    selectors: ["Instrumentation must not add user-visible latency.", "Instrumentation latency check:", "PII scrubbing verified:"],
  },
  {
    key: "BUDGET-D1",
    heading: "Database Performance Rules",
    selectors: ["## Database Performance Rules"],
  },
];

function sha256(value: string) {
  return createHash("sha256").update(value.replace(/\r\n/g, "\n")).digest("hex");
}

export function percentile(values: number[], rank: 50 | 95): number | null {
  if (values.length === 0) return null;
  const sorted = [...values].sort((left, right) => left - right);
  const index = Math.max(0, Math.ceil((rank / 100) * sorted.length) - 1);
  return sorted[index] ?? null;
}

function distribution(values: Array<number | null>): MetricDistribution {
  const valid = values.filter((value): value is number => Number.isFinite(value));
  return {
    samples: valid.length,
    p50: percentile(valid, 50),
    p95: percentile(valid, 95),
  };
}

export function requiredSampleCount(dimensions: EstimateLoadingDimensions) {
  return dimensions.cacheState === "cold-proxy" ? COLD_PROXY_MINIMUM : WARM_OR_NAVIGATION_MINIMUM;
}

export function cellKey(dimensions: EstimateLoadingDimensions) {
  return [
    dimensions.runtime,
    dimensions.fixtureClass,
    dimensions.navigationKind,
    dimensions.cacheState,
    dimensions.prefetchState,
  ].join(":");
}

export function sanitizeMeasurementText(value: string) {
  return value
    .replace(/[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}/gi, "{synthetic-id}")
    .replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi, "{email}")
    .replace(/([?&](?:access_token|refresh_token|id_token|token|code|state|session|password|secret|api_key)=)[^&#\s)'\"<>]+/gi, "$1{redacted}")
    .replace(/\b(access_token|refresh_token|id_token|token|code|state|session|password|secret|api_key)=([^\s,;&]+)/gi, "$1={redacted}")
    .replace(/\b(Authorization:\s*Bearer\s+)[^\s,;]+/gi, "$1{redacted}")
    .replace(/\b(Cookie|Set-Cookie):\s*[^\s,]+/gi, "$1: {redacted-cookie}")
    .replace(/\b[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\b/g, "{jwt}")
    .replace(/[A-Za-z]:\\[^\s\"')<>]+/g, "{local-path}")
    .replace(/\/(?:Users|home|private\/tmp|tmp)\/[^\s\"')<>]+/g, "{local-path}");
}

export function parsePerfTraceLines(
  lines: string[],
  scopes: readonly string[] = [ESTIMATE_TRACE_SCOPE],
): PerfTraceSnapshot[] {
  const snapshots: PerfTraceSnapshot[] = [];
  for (const line of lines) {
    const prefixIndex = line.indexOf(PERF_JSON_PREFIX);
    if (prefixIndex < 0) continue;
    try {
      const snapshot = JSON.parse(line.slice(prefixIndex + PERF_JSON_PREFIX.length)) as PerfTraceSnapshot;
      if (scopes.includes(snapshot.scope)) snapshots.push(snapshot);
    } catch {
      // Malformed trace output is retained as a missing-correlation contract failure by the caller.
    }
  }
  return snapshots;
}

export function resolveCanonicalBudgetMetadata(
  source: string,
  sourceRevision: string,
  path = CANONICAL_BUDGET_PATH,
): CanonicalBudgetMetadata {
  const lines = source.replace(/\r\n/g, "\n").split("\n");
  const references = BUDGET_REFERENCE_SPECS.map((spec) => {
    const matches = spec.selectors.map((selector) => {
      const indexes = lines
        .map((line, index) => (line.includes(selector) ? index : -1))
        .filter((index) => index >= 0);
      if (indexes.length !== 1) {
        throw new Error(`${spec.key} selector must resolve exactly once: ${selector} (found ${indexes.length})`);
      }
      const index = indexes[0]!;
      return { line: index + 1, text: lines[index]! };
    });
    return {
      ...spec,
      matches,
      digest: sha256(matches.map((match) => `${match.line}:${match.text}`).join("\n")),
    };
  });

  return {
    path,
    sourceRevision,
    digest: sha256(source),
    references,
  };
}

function validateDimensions(dimensions: EstimateLoadingDimensions): string[] {
  const failures: string[] = [];
  if (dimensions.navigationKind === "hard-refresh" && dimensions.prefetchState !== "not-applicable") {
    failures.push(`${cellKey(dimensions)}: hard refresh cannot carry a client-prefetch state`);
  }
  if (dimensions.navigationKind === "client-navigation" && dimensions.prefetchState === "not-applicable") {
    failures.push(`${cellKey(dimensions)}: client navigation requires no-hover, hover-prefetch, or warm-revisit`);
  }
  if (dimensions.cacheState === "cold-proxy") {
    if (dimensions.runtime !== "opennext-preview") {
      failures.push(`${cellKey(dimensions)}: cold-proxy evidence is restricted to local OpenNext preview`);
    }
    if (dimensions.navigationKind !== "hard-refresh") {
      failures.push(`${cellKey(dimensions)}: cold-proxy evidence must use a hard document refresh`);
    }
  }
  return failures;
}

export function summarizeEstimateLoadingCell(samples: EstimateLoadingSample[]): EstimateLoadingCell {
  if (samples.length === 0) throw new Error("Cannot summarize an empty estimate-loading cell.");
  const dimensions = samples[0]!.dimensions;
  const key = cellKey(dimensions);
  if (samples.some((sample) => cellKey(sample.dimensions) !== key)) {
    throw new Error(`Cell ${key} contains mixed dimensions.`);
  }

  const requiredValidSamples = requiredSampleCount(dimensions);
  const validSamples = samples.filter((sample) => sample.valid);
  const failures = samples
    .filter((sample) => !sample.valid)
    .map((sample) => ({
      runId: sample.runId,
      sampleIndex: sample.sampleIndex,
      message: sanitizeMeasurementText(sample.failure ?? "unknown measurement failure"),
    }));
  const stages = Object.fromEntries(
    ESTIMATE_LOADING_STAGE_NAMES.map((stage) => [
      stage,
      distribution(validSamples.map((sample) => sample.stages[stage] ?? null)),
    ]),
  ) as Record<EstimateLoadingStageName, MetricDistribution>;

  return {
    key,
    dimensions,
    requiredValidSamples,
    attemptedSamples: samples.length,
    validSamples: validSamples.length,
    sufficient: validSamples.length >= requiredValidSamples,
    failures,
    durationMs: distribution(validSamples.map((sample) => sample.durationMs)),
    ttfbMs: distribution(validSamples.map((sample) => sample.ttfbMs)),
    fcpMs: distribution(validSamples.map((sample) => sample.fcpMs)),
    firstInteractiveMs: distribution(validSamples.map((sample) => sample.firstInteractiveMs)),
    rscBytes: distribution(validSamples.map((sample) => sample.rscBytes)),
    jsBytes: distribution(validSamples.map((sample) => sample.jsBytes)),
    queryCount: distribution(validSamples.map((sample) => sample.queryCount)),
    stages,
    samples: samples.map((sample) => ({
      ...sample,
      failure: sample.failure ? sanitizeMeasurementText(sample.failure) : null,
    })),
  };
}

export function buildEstimateLoadingArtifact(input: {
  samples: EstimateLoadingSample[];
  runtime: EstimateLoadingRuntime;
  sourceRevision: string;
  sourceWorktreeSha256: string;
  canonicalBudget: CanonicalBudgetMetadata;
  fixtureManifest: EstimateLoadingFixtureManifest;
  generatedAt?: string;
}): EstimateLoadingArtifact {
  const grouped = new Map<string, EstimateLoadingSample[]>();
  for (const sample of input.samples) {
    const key = cellKey(sample.dimensions);
    grouped.set(key, [...(grouped.get(key) ?? []), sample]);
  }

  const cells = [...grouped.values()].map(summarizeEstimateLoadingCell);
  const runIds = input.samples.map((sample) => sample.runId);
  const contractFailures = cells.flatMap((cell) => {
    const failures = validateDimensions(cell.dimensions);
    if (cell.dimensions.runtime !== input.runtime) {
      failures.push(`${cell.key}: cell runtime does not match artifact runtime ${input.runtime}`);
    }
    if (!cell.sufficient) {
      failures.push(`${cell.key}: ${cell.validSamples}/${cell.requiredValidSamples} valid samples`);
    }
    if (cell.failures.length > 0) failures.push(`${cell.key}: ${cell.failures.length} failed samples retained`);
    for (const stage of ESTIMATE_LOADING_STAGE_NAMES) {
      if (cell.stages[stage].samples !== cell.validSamples) {
        failures.push(`${cell.key}: stage ${stage} is missing from one or more valid samples`);
      }
    }
    const requiredMetrics: Array<[string, MetricDistribution]> = [
      ["durationMs", cell.durationMs],
      ["firstInteractiveMs", cell.firstInteractiveMs],
      ["rscBytes", cell.rscBytes],
      ["jsBytes", cell.jsBytes],
      ["queryCount", cell.queryCount],
    ];
    if (cell.dimensions.navigationKind === "hard-refresh") {
      requiredMetrics.push(["ttfbMs", cell.ttfbMs], ["fcpMs", cell.fcpMs]);
    }
    for (const [metric, metricDistribution] of requiredMetrics) {
      if (metricDistribution.samples !== cell.validSamples) {
        failures.push(`${cell.key}: metric ${metric} is missing from one or more valid samples`);
      }
    }
    if (cell.dimensions.cacheState === "cold-proxy") {
      const ids = new Set(
        input.samples
          .filter((sample) => cellKey(sample.dimensions) === cell.key && sample.valid)
          .map((sample) => sample.processIsolationId)
          .filter((value): value is string => Boolean(value)),
      );
      if (ids.size !== cell.validSamples) {
        failures.push(`${cell.key}: every cold-proxy sample requires a unique processIsolationId`);
      }
    }
    if (cell.samples.some((sample) => sample.valid && !sample.serverRequestId)) {
      failures.push(`${cell.key}: every valid sample requires a correlated serverRequestId`);
    }
    if (
      cell.dimensions.navigationKind === "hard-refresh" &&
      cell.samples.some((sample) => sample.valid && !sample.layoutRequestId)
    ) {
      failures.push(`${cell.key}: every valid hard-refresh sample requires a correlated layoutRequestId`);
    }
    return failures;
  });

  if (cells.length === 0) contractFailures.push("No measurement cells were produced.");
  if (new Set(runIds).size !== runIds.length) contractFailures.push("Every measurement sample requires a unique runId.");
  if (input.fixtureManifest.sourceRevision !== input.sourceRevision) {
    contractFailures.push("Fixture manifest sourceRevision must match the measurement source revision.");
  }

  const fixtureSource = JSON.stringify(input.fixtureManifest);
  return {
    schemaVersion: 1,
    kind: "estimate-loading-performance",
    status: contractFailures.length === 0 ? "PASS" : "FAIL",
    generatedAt: input.generatedAt ?? new Date().toISOString(),
    sourceRevision: input.sourceRevision,
    sourceWorktreeSha256: input.sourceWorktreeSha256,
    runtimeMode: input.runtime,
    coldProxyDisclaimer:
      input.runtime === "opennext-preview"
        ? "Restarted local OpenNext/Wrangler measurements are cold-start proxies only; they do not prove hosted Cloudflare or production behavior."
        : null,
    redactionStatus: "PASS",
    fixedStages: ESTIMATE_LOADING_STAGE_NAMES,
    samplePolicy: {
      warmOrNavigationMinimum: WARM_OR_NAVIGATION_MINIMUM,
      coldProxyMinimum: COLD_PROXY_MINIMUM,
      percentileMethod: "nearest-rank",
      outlierTrimming: false,
      failuresRetained: true,
    },
    canonicalBudget: input.canonicalBudget,
    fixtureManifest: {
      sourceRevision: input.fixtureManifest.sourceRevision,
      digest: sha256(fixtureSource),
      fixtures: input.fixtureManifest.fixtures.map((fixture) => ({
        class: fixture.class,
        syntheticId: fixture.syntheticId,
        nodeCount: fixture.nodeCount,
        rowItemCount: fixture.rowItemCount,
        schemaRevision: fixture.schemaRevision,
        loadLimits: fixture.loadLimits,
      })),
    },
    cells,
    contractFailures,
  };
}

export type BrowserSnapshot = {
  ttfbMs: number | null;
  fcpMs: number | null;
  rscBytes: number;
  jsBytes: number;
  browserStages: Partial<Record<EstimateLoadingStageName, number>>;
  duplicateClientStages: EstimateLoadingStageName[];
};

export async function collectEstimateBrowserSnapshot(page: Page): Promise<BrowserSnapshot> {
  return page.evaluate((fixedStages) => {
    const navigation = performance.getEntriesByType("navigation")[0] as PerformanceNavigationTiming | undefined;
    const resources = performance.getEntriesByType("resource") as PerformanceResourceTiming[];
    const paints = performance.getEntriesByType("paint");
    const fcp = paints.find((entry) => entry.name === "first-contentful-paint");
    const browserStages: Partial<Record<EstimateLoadingStageName, number>> = {};
    const duplicateClientStages: EstimateLoadingStageName[] = [];
    for (const stage of fixedStages) {
      if (!stage.startsWith("estimate.client.")) continue;
      const entries = performance.getEntriesByName(stage);
      if (entries.length > 1) duplicateClientStages.push(stage as EstimateLoadingStageName);
      const entry = entries.at(-1);
      if (entry) browserStages[stage as EstimateLoadingStageName] = entry.duration || entry.startTime;
    }
    const bytes = (entry: PerformanceResourceTiming) => entry.transferSize || entry.encodedBodySize || 0;
    return {
      ttfbMs: navigation ? navigation.responseStart : null,
      fcpMs: fcp?.startTime ?? null,
      rscBytes: resources
        .filter((entry) => entry.name.includes("_rsc=") || entry.name.includes(".rsc"))
        .reduce((total, entry) => total + bytes(entry), 0),
      jsBytes: resources
        .filter((entry) => entry.initiatorType === "script" || /\.m?js(?:$|\?)/i.test(entry.name))
        .reduce((total, entry) => total + bytes(entry), 0),
      browserStages,
      duplicateClientStages,
    };
  }, ESTIMATE_LOADING_STAGE_NAMES);
}

type ManagedServer = {
  process: ChildProcessWithoutNullStreams;
  lines: string[];
  isolationId: string;
};

export type RunnerOptions = {
  runtime: EstimateLoadingRuntime;
  modes: string[];
  fixtures: EstimateFixtureClass[];
  output: string;
  fixtureManifestPath: string;
  budgetPath: string;
  baseUrl: string;
  serverCommand: string;
  runs: number | null;
};

function readArgument(args: string[], name: string) {
  const index = args.indexOf(name);
  return index < 0 ? undefined : args[index + 1];
}

export function parseEstimateLoadingArgs(args: string[], env: NodeJS.ProcessEnv = process.env): RunnerOptions {
  const runtime = (readArgument(args, "--runtime") ?? "") as EstimateLoadingRuntime;
  if (runtime !== "next-production" && runtime !== "opennext-preview") {
    throw new Error("--runtime must be next-production or opennext-preview.");
  }
  const defaultPort = runtime === "next-production" ? "3042" : "8787";
  const baseUrl = readArgument(args, "--base-url") ?? env.BASE_URL ?? `http://127.0.0.1:${defaultPort}`;
  const serverCommand =
    readArgument(args, "--server-command") ??
    env.ESTIMATE_LOADING_SERVER_COMMAND ??
    (runtime === "next-production"
      ? `bun x next start --hostname 127.0.0.1 --port ${defaultPort}`
      : `bun x opennextjs-cloudflare preview -- --ip 127.0.0.1 --port ${defaultPort}`);
  const output = readArgument(args, "--output");
  const fixtureManifestPath =
    readArgument(args, "--fixture-manifest") ?? env.ESTIMATE_LOADING_FIXTURE_MANIFEST;
  if (!output) throw new Error("--output is required.");
  if (!fixtureManifestPath) {
    throw new Error("--fixture-manifest or ESTIMATE_LOADING_FIXTURE_MANIFEST is required.");
  }
  const modes = (readArgument(args, "--modes") ?? "").split(",").filter(Boolean);
  const fixtures = (readArgument(args, "--fixtures") ?? "").split(",").filter(Boolean) as EstimateFixtureClass[];
  if (modes.length === 0) throw new Error("--modes must select at least one measurement mode.");
  if (fixtures.length === 0) throw new Error("--fixtures must select at least one fixture class.");
  if (fixtures.some((fixture) => !["small", "large", "load-limit"].includes(fixture))) {
    throw new Error("--fixtures contains an unsupported fixture class.");
  }
  const rawRuns = readArgument(args, "--runs");
  const runs = rawRuns === undefined ? null : Number(rawRuns);
  if (runs !== null && (!Number.isSafeInteger(runs) || runs < 1)) {
    throw new Error("--runs must be a positive integer.");
  }
  return {
    runtime,
    modes,
    fixtures,
    output,
    fixtureManifestPath,
    budgetPath: readArgument(args, "--budget-file") ?? CANONICAL_BUDGET_PATH,
    baseUrl,
    serverCommand,
    runs,
  };
}

export function expandEstimateLoadingDimensions(
  runtime: EstimateLoadingRuntime,
  fixtureClass: EstimateFixtureClass,
  modes: string[],
): EstimateLoadingDimensions[] {
  const supported = new Set([
    "hard-refresh",
    "client-navigation",
    "no-hover",
    "hover-prefetch",
    "warm-revisit",
    "cold-process",
    "warm-process",
  ]);
  const unsupported = modes.filter((mode) => !supported.has(mode));
  if (unsupported.length > 0) throw new Error(`Unsupported modes: ${unsupported.join(", ")}`);

  const dimensions: EstimateLoadingDimensions[] = [];
  if (modes.includes("hard-refresh")) {
    dimensions.push({ runtime, fixtureClass, navigationKind: "hard-refresh", cacheState: "warm", prefetchState: "not-applicable" });
  }
  if (modes.includes("client-navigation") || modes.includes("no-hover")) {
    dimensions.push({ runtime, fixtureClass, navigationKind: "client-navigation", cacheState: "warm", prefetchState: "no-hover" });
  }
  if (modes.includes("hover-prefetch")) {
    dimensions.push({ runtime, fixtureClass, navigationKind: "client-navigation", cacheState: "warm", prefetchState: "hover-prefetch" });
  }
  if (modes.includes("warm-revisit")) {
    dimensions.push({ runtime, fixtureClass, navigationKind: "client-navigation", cacheState: "warm", prefetchState: "warm-revisit" });
  }
  if (modes.includes("cold-process")) {
    dimensions.push({ runtime, fixtureClass, navigationKind: "hard-refresh", cacheState: "cold-proxy", prefetchState: "not-applicable" });
  }
  if (dimensions.length === 0) throw new Error("Modes do not select a navigation cell.");
  return dimensions;
}

function getContextOptions(): BrowserContextOptions {
  const storageState = process.env.PLAYWRIGHT_STORAGE_STATE;
  if (!storageState) {
    throw new Error("PLAYWRIGHT_STORAGE_STATE is required for authenticated estimate-loading measurements.");
  }
  if (!existsSync(resolve(storageState))) throw new Error("PLAYWRIGHT_STORAGE_STATE does not exist.");
  return { storageState };
}

async function startServer(options: RunnerOptions): Promise<ManagedServer> {
  const lines: string[] = [];
  const child = spawn(options.serverCommand, {
    cwd: process.cwd(),
    env: { ...process.env, PERF_TRACE: "1", NEXT_PUBLIC_PERF_TRACE: "1" },
    shell: true,
    stdio: ["pipe", "pipe", "pipe"],
  });
  const append = (chunk: Buffer) => lines.push(...chunk.toString("utf8").split(/\r?\n/).filter(Boolean));
  child.stdout.on("data", append);
  child.stderr.on("data", append);
  const startedAt = Date.now();
  while (Date.now() - startedAt < 60_000) {
    if (child.exitCode !== null) throw new Error(`Measurement server exited before readiness with code ${child.exitCode}.`);
    try {
      const response = await fetch(options.baseUrl, { redirect: "manual" });
      if (response.status > 0) {
        return { process: child, lines, isolationId: `proc_${Date.now().toString(36)}_${child.pid ?? "unknown"}` };
      }
    } catch {
      // Poll until the local server is ready or the deadline is reached.
    }
    await new Promise((resolveDelay) => setTimeout(resolveDelay, 250));
  }
  child.kill();
  throw new Error("Measurement server did not become ready within 60 seconds.");
}

async function stopServer(server: ManagedServer | null) {
  if (!server || server.process.exitCode !== null) return;
  server.process.kill("SIGTERM");
  await new Promise<void>((resolveStop) => {
    const timeout = setTimeout(() => {
      server.process.kill("SIGKILL");
      resolveStop();
    }, 5_000);
    server.process.once("exit", () => {
      clearTimeout(timeout);
      resolveStop();
    });
  });
}

async function waitForInteractive(page: Page) {
  const selector = process.env.ESTIMATE_LOADING_INTERACTIVE_SELECTOR ?? DEFAULT_INTERACTIVE_SELECTOR;
  await page.locator(selector).first().waitFor({ state: "visible", timeout: 30_000 });
}

async function prepareNavigation(page: Page, baseUrl: string, fixture: EstimateLoadingFixture, dimensions: EstimateLoadingDimensions) {
  const estimateUrl = new URL(fixture.estimatePath, baseUrl).toString();
  if (dimensions.navigationKind === "hard-refresh") return;

  if (dimensions.prefetchState === "warm-revisit") {
    await page.goto(estimateUrl, { waitUntil: "domcontentloaded" });
    await waitForInteractive(page);
  }
  await page.goto(new URL(fixture.estimatesListPath, baseUrl).toString(), { waitUntil: "domcontentloaded" });
  await page.evaluate(() => {
    performance.clearMarks();
    performance.clearMeasures();
    performance.clearResourceTimings();
  });
}

async function executeNavigation(page: Page, baseUrl: string, fixture: EstimateLoadingFixture, dimensions: EstimateLoadingDimensions) {
  const estimateUrl = new URL(fixture.estimatePath, baseUrl).toString();
  if (dimensions.navigationKind === "hard-refresh") {
    const startedAt = performance.now();
    await page.goto(estimateUrl, { waitUntil: "domcontentloaded" });
    return startedAt;
  }

  const link = page.locator(`a[href="${fixture.estimatePath.replaceAll('"', '\\"')}"]:visible`).first();
  await link.waitFor({ state: "visible", timeout: 30_000 });
  if (dimensions.prefetchState === "hover-prefetch") {
    await link.hover();
    await page.waitForTimeout(300);
  }
  const startedAt = performance.now();
  await Promise.all([
    page.waitForFunction((pathname) => window.location.pathname === pathname, fixture.estimatePath, { timeout: 30_000 }),
    link.click({ noWaitAfter: true }),
  ]);
  return startedAt;
}

function mergeStages(snapshots: PerfTraceSnapshot[], browser: BrowserSnapshot) {
  const stages: Partial<Record<EstimateLoadingStageName, number>> = { ...browser.browserStages };
  for (const snapshot of snapshots) {
    for (const event of snapshot.timings) {
      if ((ESTIMATE_LOADING_STAGE_NAMES as readonly string[]).includes(event.label)) {
        stages[event.label as EstimateLoadingStageName] = event.elapsedMs;
      }
    }
  }
  return stages;
}

async function measureSample(input: {
  browser: Browser;
  fixture: EstimateLoadingFixture;
  dimensions: EstimateLoadingDimensions;
  sampleIndex: number;
  baseUrl: string;
  server: ManagedServer;
}): Promise<EstimateLoadingSample> {
  const runId = `est_${Date.now().toString(36)}_${input.sampleIndex.toString(36)}`;
  const context = await input.browser.newContext(getContextOptions());
  const page = await context.newPage();
  try {
    await prepareNavigation(page, input.baseUrl, input.fixture, input.dimensions);
    const lineCursor = input.server.lines.length;
    const startedAt = await executeNavigation(page, input.baseUrl, input.fixture, input.dimensions);
    await waitForInteractive(page);
    await page.waitForFunction(
      () => performance.getEntriesByName("estimate.client.interactive").length === 1,
      undefined,
      { timeout: 30_000 },
    );
    const firstInteractiveMs = Number((performance.now() - startedAt).toFixed(1));
    const browserSnapshot = await collectEstimateBrowserSnapshot(page);
    await page.waitForTimeout(50);
    const snapshots = parsePerfTraceLines(input.server.lines.slice(lineCursor), [
      ESTIMATE_LAYOUT_TRACE_SCOPE,
      ESTIMATE_TRACE_SCOPE,
    ]);
    const layoutSnapshots = snapshots.filter((snapshot) => snapshot.scope === ESTIMATE_LAYOUT_TRACE_SCOPE);
    const routeSnapshots = snapshots.filter((snapshot) => snapshot.scope === ESTIMATE_TRACE_SCOPE);
    const requiresLayoutSnapshot = input.dimensions.navigationKind === "hard-refresh";
    if (
      routeSnapshots.length !== 1 ||
      layoutSnapshots.length > 1 ||
      (requiresLayoutSnapshot && layoutSnapshots.length !== 1)
    ) {
      throw new Error(
        `Expected ${requiresLayoutSnapshot ? "exactly one" : "at most one"} ${ESTIMATE_LAYOUT_TRACE_SCOPE} and exactly one ${ESTIMATE_TRACE_SCOPE} trace snapshot; received ${layoutSnapshots.length} and ${routeSnapshots.length}.`,
      );
    }
    const layoutSnapshot = layoutSnapshots[0] ?? null;
    const routeSnapshot = routeSnapshots[0]!;
    const fixedServerLabels = snapshots.flatMap((snapshot) => snapshot.timings)
      .map((event) => event.label)
      .filter((label) => (ESTIMATE_LOADING_STAGE_NAMES as readonly string[]).includes(label));
    if (new Set(fixedServerLabels).size !== fixedServerLabels.length) {
      throw new Error("Duplicate fixed server stage labels were emitted for one request.");
    }
    if (browserSnapshot.duplicateClientStages.length > 0) {
      throw new Error(`Duplicate fixed client stage labels: ${browserSnapshot.duplicateClientStages.join(", ")}`);
    }
    const stages = mergeStages(snapshots, browserSnapshot);
    if (!layoutSnapshot) stages["estimate.layout.auth"] = 0;
    const missingStages = ESTIMATE_LOADING_STAGE_NAMES.filter((stage) => stages[stage] === undefined);
    if (missingStages.length > 0) throw new Error(`Missing fixed stages: ${missingStages.join(", ")}`);
    return {
      runId,
      sampleIndex: input.sampleIndex,
      dimensions: input.dimensions,
      processIsolationId: input.dimensions.cacheState === "cold-proxy" ? input.server.isolationId : null,
      valid: true,
      failure: null,
      durationMs: firstInteractiveMs,
      ttfbMs: browserSnapshot.ttfbMs,
      fcpMs: browserSnapshot.fcpMs,
      firstInteractiveMs,
      rscBytes: browserSnapshot.rscBytes,
      jsBytes: browserSnapshot.jsBytes,
      queryCount: snapshots.reduce((total, snapshot) => total + snapshot.databaseRoundTrips, 0),
      serverRequestId: routeSnapshot.requestId,
      layoutRequestId: layoutSnapshot?.requestId ?? null,
      stages,
    };
  } catch (error) {
    return {
      runId,
      sampleIndex: input.sampleIndex,
      dimensions: input.dimensions,
      processIsolationId: input.dimensions.cacheState === "cold-proxy" ? input.server.isolationId : null,
      valid: false,
      failure: sanitizeMeasurementText(error instanceof Error ? error.message : String(error)),
      durationMs: null,
      ttfbMs: null,
      fcpMs: null,
      firstInteractiveMs: null,
      rscBytes: null,
      jsBytes: null,
      queryCount: null,
      serverRequestId: null,
      layoutRequestId: null,
      stages: {},
    };
  } finally {
    await context.close();
  }
}

function readFixtureManifest(path: string): EstimateLoadingFixtureManifest {
  const manifest = JSON.parse(readFileSync(resolve(path), "utf8")) as EstimateLoadingFixtureManifest;
  if (manifest.schemaVersion !== 1 || manifest.redactionStatus !== "synthetic-only") {
    throw new Error("Fixture manifest must use schemaVersion 1 and redactionStatus synthetic-only.");
  }
  if (!/^[a-f0-9]{40}$/.test(manifest.sourceRevision)) {
    throw new Error("Fixture manifest sourceRevision must be a full Git revision.");
  }
  for (const fixtureClass of ["small", "large", "load-limit"] as const) {
    if (manifest.fixtures.filter((fixture) => fixture.class === fixtureClass).length !== 1) {
      throw new Error(`Fixture manifest must contain exactly one ${fixtureClass} fixture.`);
    }
  }
  for (const fixture of manifest.fixtures) {
    if (!/^[a-z0-9._:-]{1,64}$/.test(fixture.syntheticId) || !/^[a-z0-9._:-]{1,64}$/.test(fixture.schemaRevision)) {
      throw new Error(`${fixture.class} fixture identifiers must be bounded synthetic labels.`);
    }
    if (![fixture.nodeCount, fixture.rowItemCount].every((value) => Number.isSafeInteger(value) && value >= 0)) {
      throw new Error(`${fixture.class} fixture counts must be non-negative integers.`);
    }
    if (fixture.estimatePath.includes("?") || fixture.estimatesListPath.includes("?")) {
      throw new Error(`${fixture.class} fixture routes must not contain query strings or tokens.`);
    }
    if (
      fixture.loadLimits.maxNodeCount !== ESTIMATE_SHEET_TREE_LOAD_LIMITS.maxNodeCount ||
      fixture.loadLimits.maxRowItemCount !== ESTIMATE_SHEET_TREE_LOAD_LIMITS.maxRowItemCount
    ) {
      throw new Error(`${fixture.class} fixture loadLimits do not match current ESTIMATE_SHEET_TREE_LOAD_LIMITS.`);
    }
  }
  const loadLimit = manifest.fixtures.find((fixture) => fixture.class === "load-limit")!;
  if (
    loadLimit.nodeCount !== loadLimit.loadLimits.maxNodeCount ||
    loadLimit.rowItemCount !== loadLimit.loadLimits.maxRowItemCount
  ) {
    throw new Error("load-limit fixture counts must exactly match the manifest's source-derived load limits.");
  }
  return manifest;
}

function readGitRevision() {
  const result = Bun.spawnSync(["git", "rev-parse", "HEAD"], { stdout: "pipe", stderr: "pipe" });
  if (result.exitCode !== 0) throw new Error("Unable to resolve the current Git revision.");
  return result.stdout.toString().trim();
}

function readPerformanceSourceWorktreeSha256() {
  const relevantPaths = [
    "scripts/measure-estimate-loading.ts",
    "src/lib/perf/estimate-loading-client.ts",
    "src/lib/perf/estimate-loading-stages.ts",
    "src/lib/repositories/workspace-repository.ts",
    "src/app/workshop/projects/[projectId]/estimates/[nodeId]/page.tsx",
    "src/components/workshop/EstimateWorkspaceClient.tsx",
    "next.config.ts",
    "package.json",
    "bun.lock",
    CANONICAL_BUDGET_PATH,
  ];
  const hash = createHash("sha256");
  for (const path of relevantPaths) {
    hash.update(path);
    hash.update("\0");
    hash.update(readFileSync(resolve(path)));
    hash.update("\0");
  }
  return hash.digest("hex");
}

async function main() {
  const options = parseEstimateLoadingArgs(process.argv.slice(2));
  const sourceRevision = readGitRevision();
  const sourceWorktreeSha256 = readPerformanceSourceWorktreeSha256();
  const budgetSource = readFileSync(resolve(options.budgetPath), "utf8");
  const canonicalBudget = resolveCanonicalBudgetMetadata(budgetSource, sourceRevision, options.budgetPath);
  const fixtureManifest = readFixtureManifest(options.fixtureManifestPath);
  if (fixtureManifest.sourceRevision !== sourceRevision) {
    throw new Error("Fixture manifest sourceRevision must match the current Git revision.");
  }
  const fixtures = options.fixtures.map((fixtureClass) => fixtureManifest.fixtures.find((fixture) => fixture.class === fixtureClass)!);
  const dimensions = fixtures.flatMap((fixture) =>
    expandEstimateLoadingDimensions(options.runtime, fixture.class, options.modes),
  );
  if (dimensions.some((value) => value.cacheState === "cold-proxy") && options.runtime !== "opennext-preview") {
    throw new Error("cold-process mode is only valid with --runtime opennext-preview.");
  }

  const browser = await chromium.launch({ headless: true });
  const samples: EstimateLoadingSample[] = [];
  let server: ManagedServer | null = null;
  try {
    for (const cellDimensions of dimensions) {
      const fixture = fixtures.find((candidate) => candidate.class === cellDimensions.fixtureClass)!;
      const sampleCount = options.runs ?? requiredSampleCount(cellDimensions);
      for (let sampleIndex = 1; sampleIndex <= sampleCount; sampleIndex += 1) {
        if (!server || cellDimensions.cacheState === "cold-proxy") {
          await stopServer(server);
          server = await startServer(options);
        }
        samples.push(
          await measureSample({
            browser,
            fixture,
            dimensions: cellDimensions,
            sampleIndex,
            baseUrl: options.baseUrl,
            server,
          }),
        );
      }
    }
  } finally {
    await stopServer(server);
    await browser.close();
  }

  const artifact = buildEstimateLoadingArtifact({
    samples,
    runtime: options.runtime,
    sourceRevision,
    sourceWorktreeSha256,
    canonicalBudget,
    fixtureManifest,
  });
  const outputPath = resolve(options.output);
  mkdirSync(dirname(outputPath), { recursive: true });
  writeFileSync(outputPath, `${JSON.stringify(artifact, null, 2)}\n`, "utf8");
  console.log(JSON.stringify({ outputPath, status: artifact.status, cells: artifact.cells.length, failures: artifact.contractFailures }, null, 2));
  if (artifact.status !== "PASS") process.exitCode = 1;
}

if (import.meta.main) {
  main().catch((error) => {
    console.error(sanitizeMeasurementText(error instanceof Error ? error.message : String(error)));
    process.exit(1);
  });
}
