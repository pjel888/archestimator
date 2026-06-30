#!/usr/bin/env bun

import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";

import {
  buildCloudflareWorkerPreviewProbes,
  sampleCloudflareWorkerPreviewRoute,
  type CloudflareWorkerPreviewResult,
  type CloudflareWorkerPreviewSample,
} from "./verify-cloudflare-worker-preview-routes";

const DEFAULT_FAKE_TOKEN = "not-a-real-hosted-worker-share-token";
const DEFAULT_RUNS = 20;
const DEFAULT_WARMUP_RUNS = 1;
const MIN_P95_RUNS = 20;
const MAX_RUNS = 30;
const MAX_WARMUP_RUNS = 5;
const DEFAULT_OUTPUT_FILE =
  ".ai/03_plans/2026-06-29-Cloudflare-Migration-Codex/evidence/2026-06-30-cloudflare-hosted-performance.json";
const DEFAULT_MARKDOWN_FILE =
  ".ai/03_plans/2026-06-29-Cloudflare-Migration-Codex/evidence/2026-06-30-cloudflare-hosted-performance.md";
const BODY_NOTE =
  "Hosted, credential-free Worker performance proof only. This does not call Cloudflare APIs, read env files, print secrets, deploy Workers, change DNS, purchase plans, mutate providers, authenticate users, prove D1/Auth/Realtimes flows, or make Vercel/Supabase/Resend removable.";

type HostedProbeBudget = {
  budgetMs: number | null;
  budgetLabel: string;
};

export type HostedCloudflareWorkerResult = CloudflareWorkerPreviewResult & HostedProbeBudget & {
  warmupSamples: CloudflareWorkerPreviewSample[];
  minTtfbMs: number | null;
  avgTtfbMs: number | null;
  maxTtfbMs: number | null;
  p95TtfbMs: number | null;
  p95DurationMs: number | null;
  p95BudgetPassed: boolean | null;
};

export type CloudflareHostedPerformanceReport = {
  generatedAt: string;
  mode: "cloudflare-hosted-worker-performance";
  baseUrl: string;
  providerBacked: boolean;
  proofScope: "credential-free-hosted-worker-routes";
  runs: number;
  warmupRuns: number;
  minimumP95Runs: number;
  p95SampleCountReady: boolean;
  p95Method: "nearest-rank";
  budgetMetric: "ttfbMs";
  fakeTokenLabel: "redacted-fake-token";
  note: string;
  routeContractReady: boolean;
  p95BudgetReady: boolean;
  hostedCredentialFreePerformanceReady: boolean;
  hostedPerformanceReady: false;
  passed: boolean;
  results: HostedCloudflareWorkerResult[];
};

export type VerifyCloudflareHostedPerformanceOptions = {
  baseUrl?: string;
  fakeToken?: string;
  runs?: number;
  warmupRuns?: number;
  fetchImpl?: typeof fetch;
};

type EnvInputs = {
  baseUrl: string;
  fakeToken: string;
  runs: number;
  warmupRuns: number;
  outputFile?: string;
  markdownFile?: string;
};

const HOSTED_ROUTE_BUDGETS: Record<string, HostedProbeBudget> = {
  health: { budgetMs: null, budgetLabel: "liveness contract only" },
  home: { budgetMs: 200, budgetLabel: "under 200 ms" },
  login: { budgetMs: 300, budgetLabel: "under 300 ms" },
  pricing: { budgetMs: 200, budgetLabel: "under 200 ms" },
  features: { budgetMs: 200, budgetLabel: "under 200 ms" },
  about: { budgetMs: 300, budgetLabel: "under 300 ms" },
  contact: { budgetMs: 300, budgetLabel: "under 300 ms" },
  trust: { budgetMs: 300, budgetLabel: "under 300 ms" },
  privacy: { budgetMs: 300, budgetLabel: "under 300 ms" },
  terms: { budgetMs: 300, budgetLabel: "under 300 ms" },
  signup: { budgetMs: 300, budgetLabel: "under 300 ms" },
  "access-required": { budgetMs: 300, budgetLabel: "under 300 ms" },
  "workshop-signed-out": { budgetMs: 600, budgetLabel: "under 600 ms" },
  "share-invalid-page": { budgetMs: 400, budgetLabel: "under 400 ms" },
  "share-invalid-api": { budgetMs: null, budgetLabel: "record only" },
  "project-image-missing-path": { budgetMs: null, budgetLabel: "record only" },
};

function round(value: number, precision = 2) {
  const factor = 10 ** precision;
  return Math.round(value * factor) / factor;
}

function percentile(values: number[], percentileValue: number) {
  if (values.length === 0) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const index = Math.max(0, Math.ceil((percentileValue / 100) * sorted.length) - 1);
  return sorted[index];
}

export function parseHostedPerformanceRunCount(value: string | undefined, fallback = DEFAULT_RUNS) {
  if (!value) return fallback;
  const parsed = Number.parseInt(value, 10);
  if (!Number.isInteger(parsed) || parsed <= 0) return fallback;
  return Math.min(parsed, MAX_RUNS);
}

function parseWarmupRunCount(value: string | undefined, fallback = DEFAULT_WARMUP_RUNS) {
  if (!value) return fallback;
  const parsed = Number.parseInt(value, 10);
  if (!Number.isInteger(parsed) || parsed < 0) return fallback;
  return Math.min(parsed, MAX_WARMUP_RUNS);
}

function ttfbStats(samples: CloudflareWorkerPreviewSample[]) {
  const values = samples
    .map((sample) => sample.ttfbMs ?? sample.durationMs)
    .filter((value): value is number => typeof value === "number" && Number.isFinite(value));
  if (values.length === 0) {
    return { minTtfbMs: null, avgTtfbMs: null, maxTtfbMs: null, p95TtfbMs: null };
  }
  return {
    minTtfbMs: round(Math.min(...values)),
    avgTtfbMs: round(values.reduce((sum, value) => sum + value, 0) / values.length),
    maxTtfbMs: round(Math.max(...values)),
    p95TtfbMs: percentile(values, 95),
  };
}

function isLocalOrPrivateHost(hostname: string) {
  const normalized = hostname.toLowerCase();
  if (normalized === "localhost" || normalized === "::1" || normalized.endsWith(".local")) return true;
  if (normalized === "127.0.0.1" || normalized.startsWith("127.")) return true;
  if (normalized.startsWith("10.")) return true;
  if (/^192\.168\./.test(normalized)) return true;
  const private172 = normalized.match(/^172\.(\d{1,2})\./);
  return Boolean(private172 && Number(private172[1]) >= 16 && Number(private172[1]) <= 31);
}

export function normalizeCloudflareHostedBaseUrl(value: string | undefined) {
  const raw = value?.trim();
  if (!raw) {
    throw new Error("CLOUDFLARE_HOSTED_PERFORMANCE_BASE_URL is required for hosted performance proof.");
  }
  const url = new URL(raw.replace(/\/+$/, ""));
  if (url.protocol !== "https:") {
    throw new Error("CLOUDFLARE_HOSTED_PERFORMANCE_BASE_URL must use HTTPS.");
  }
  if (isLocalOrPrivateHost(url.hostname)) {
    throw new Error("CLOUDFLARE_HOSTED_PERFORMANCE_BASE_URL must not point at localhost or a private network host.");
  }
  return url.origin;
}

function budgetForProbe(key: string): HostedProbeBudget {
  return HOSTED_ROUTE_BUDGETS[key] ?? { budgetMs: null, budgetLabel: "record only" };
}

function distinctSampleValues(samples: CloudflareWorkerPreviewSample[], selector: (sample: CloudflareWorkerPreviewSample) => string | null) {
  const values = [...new Set(samples.map(selector).filter((value): value is string => Boolean(value)))];
  return values.length === 0 ? "(none)" : values.join(", ");
}

export async function verifyCloudflareHostedPerformance(
  options: VerifyCloudflareHostedPerformanceOptions = {},
): Promise<CloudflareHostedPerformanceReport> {
  const baseUrl = normalizeCloudflareHostedBaseUrl(options.baseUrl);
  const fakeToken = options.fakeToken || DEFAULT_FAKE_TOKEN;
  const runs = parseHostedPerformanceRunCount(options.runs ? String(options.runs) : undefined, DEFAULT_RUNS);
  const warmupRuns = parseWarmupRunCount(
    options.warmupRuns === undefined ? undefined : String(options.warmupRuns),
    DEFAULT_WARMUP_RUNS,
  );
  const results: HostedCloudflareWorkerResult[] = [];

  for (const probe of buildCloudflareWorkerPreviewProbes(fakeToken)) {
    const warmupSamples: CloudflareWorkerPreviewSample[] = [];
    for (let run = 1; run <= warmupRuns; run += 1) {
      warmupSamples.push(await sampleCloudflareWorkerPreviewRoute({ baseUrl, fakeToken, probe, run, fetchImpl: options.fetchImpl }));
    }

    const samples: CloudflareWorkerPreviewSample[] = [];
    for (let run = 1; run <= runs; run += 1) {
      samples.push(await sampleCloudflareWorkerPreviewRoute({ baseUrl, fakeToken, probe, run, fetchImpl: options.fetchImpl }));
    }
    const stats = ttfbStats(samples);
    const budget = budgetForProbe(probe.key);
    const p95BudgetPassed = budget.budgetMs === null
      ? null
      : stats.p95TtfbMs !== null && stats.p95TtfbMs < budget.budgetMs;
    results.push({
      ...probe,
      warmupSamples,
      samples,
      minDurationMs: stats.minTtfbMs,
      avgDurationMs: stats.avgTtfbMs,
      maxDurationMs: stats.maxTtfbMs,
      minTtfbMs: stats.minTtfbMs,
      avgTtfbMs: stats.avgTtfbMs,
      maxTtfbMs: stats.maxTtfbMs,
      p95TtfbMs: stats.p95TtfbMs,
      p95DurationMs: stats.p95TtfbMs,
      passed: samples.every((sample) => sample.passed),
      ...budget,
      p95BudgetPassed,
    });
  }

  const requiredResults = results.filter((result) => result.required);
  const routeContractReady = requiredResults.length > 0 && requiredResults.every((result) => result.passed);
  const budgetedRequiredResults = requiredResults.filter((result) => result.budgetMs !== null);
  const p95SampleCountReady = runs >= MIN_P95_RUNS;
  const p95BudgetReady = p95SampleCountReady
    && budgetedRequiredResults.length > 0
    && budgetedRequiredResults.every((result) => result.p95BudgetPassed === true);
  const hostedCredentialFreePerformanceReady = routeContractReady && p95BudgetReady;

  return {
    generatedAt: new Date().toISOString(),
    mode: "cloudflare-hosted-worker-performance",
    baseUrl,
    providerBacked: true,
    proofScope: "credential-free-hosted-worker-routes",
    runs,
    warmupRuns,
    minimumP95Runs: MIN_P95_RUNS,
    p95SampleCountReady,
    p95Method: "nearest-rank",
    budgetMetric: "ttfbMs",
    fakeTokenLabel: "redacted-fake-token",
    note: BODY_NOTE,
    routeContractReady,
    p95BudgetReady,
    hostedCredentialFreePerformanceReady,
    hostedPerformanceReady: false,
    passed: hostedCredentialFreePerformanceReady,
    results,
  };
}

export function parseInputsFromEnv(env: NodeJS.ProcessEnv = process.env): EnvInputs {
  return {
    baseUrl: normalizeCloudflareHostedBaseUrl(env.CLOUDFLARE_HOSTED_PERFORMANCE_BASE_URL),
    fakeToken: env.CLOUDFLARE_HOSTED_PERFORMANCE_FAKE_TOKEN || DEFAULT_FAKE_TOKEN,
    runs: parseHostedPerformanceRunCount(env.CLOUDFLARE_HOSTED_PERFORMANCE_RUNS, DEFAULT_RUNS),
    warmupRuns: parseWarmupRunCount(env.CLOUDFLARE_HOSTED_PERFORMANCE_WARMUP_RUNS, DEFAULT_WARMUP_RUNS),
    outputFile: env.OUTPUT_FILE,
    markdownFile: env.MARKDOWN_FILE,
  };
}

export function writeOutput(report: CloudflareHostedPerformanceReport, outputFile: string) {
  const outputPath = resolve(outputFile);
  mkdirSync(dirname(outputPath), { recursive: true });
  writeFileSync(outputPath, `${JSON.stringify(report, null, 2)}\n`);
}

export function writeMarkdown(report: CloudflareHostedPerformanceReport, markdownFile: string) {
  const outputPath = resolve(markdownFile);
  mkdirSync(dirname(outputPath), { recursive: true });
  const rows = report.results.map((result) => [
    result.key,
    result.kind,
    result.required ? "yes" : "no",
    result.passed ? "PASS" : "FAIL",
    result.p95TtfbMs === null ? "(none)" : `${result.p95TtfbMs}ms`,
    result.budgetLabel,
    distinctSampleValues(result.samples, (sample) => sample.cfCacheStatus),
    distinctSampleValues(result.samples, (sample) => sample.xNextjsPrerender),
    result.p95BudgetPassed === null ? "n/a" : result.p95BudgetPassed ? "PASS" : "FAIL",
  ]);
  const lines = [
    "# Cloudflare Hosted Worker Performance",
    "",
    `Generated: ${report.generatedAt}`,
    `Base URL: ${report.baseUrl}`,
    `Runs: ${report.runs}`,
    `Warm-up runs: ${report.warmupRuns}`,
    `Minimum p95 runs for readiness: ${report.minimumP95Runs}`,
    `P95 method: ${report.p95Method}`,
    `Budget metric: ${report.budgetMetric}`,
    `P95 sample count ready: ${report.p95SampleCountReady ? "yes" : "no"}`,
    `Route contract ready: ${report.routeContractReady ? "yes" : "no"}`,
    `P95 budget ready: ${report.p95BudgetReady ? "yes" : "no"}`,
    `Credential-free hosted performance ready: ${report.hostedCredentialFreePerformanceReady ? "yes" : "no"}`,
    `Production hosted performance ready: ${report.hostedPerformanceReady ? "yes" : "no"}`,
    "",
    report.note,
    "",
    "| Probe | Kind | Required | Contract | P95 TTFB | Budget | CF Cache | Prerender | Budget result |",
    "| --- | --- | --- | --- | ---: | --- | --- | --- | --- |",
    ...rows.map((row) => `| ${row.join(" | ")} |`),
    "",
  ];
  writeFileSync(outputPath, lines.join("\n"));
}

async function main() {
  const inputs = parseInputsFromEnv();
  const report = await verifyCloudflareHostedPerformance(inputs);
  writeOutput(report, inputs.outputFile ?? DEFAULT_OUTPUT_FILE);
  writeMarkdown(report, inputs.markdownFile ?? DEFAULT_MARKDOWN_FILE);
  console.log(JSON.stringify(report, null, 2));
  if (!report.passed) process.exitCode = 1;
}

if (import.meta.main) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  });
}
