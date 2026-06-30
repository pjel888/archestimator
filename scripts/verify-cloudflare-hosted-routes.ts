#!/usr/bin/env bun

import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";

import {
  buildCloudflareWorkerPreviewProbes,
  parseRunCount,
  sampleCloudflareWorkerPreviewRoute,
  type CloudflareWorkerPreviewResult,
  type CloudflareWorkerPreviewSample,
} from "./verify-cloudflare-worker-preview-routes";
import { normalizeCloudflareHostedBaseUrl } from "./verify-cloudflare-hosted-performance";

const DEFAULT_FAKE_TOKEN = "not-a-real-hosted-worker-share-token";
const DEFAULT_RUNS = 1;
const BODY_NOTE =
  "Hosted, credential-free Worker route proof only. This does not call Cloudflare APIs, read env files, print secrets, deploy Workers, change DNS, purchase plans, mutate providers, authenticate users, prove D1/Auth/Realtime flows, or make Vercel/Supabase/Resend removable.";

export type CloudflareHostedRouteProofReport = {
  generatedAt: string;
  mode: "cloudflare-hosted-worker-routes";
  baseUrl: string | null;
  providerBacked: boolean;
  proofScope: "credential-free-hosted-worker-route-contract";
  configured: boolean;
  runs: number;
  fakeTokenLabel: "redacted-fake-token";
  note: string;
  routeContractReady: boolean;
  hostedRouteProofReady: boolean;
  passed: boolean;
  blockers: string[];
  results: CloudflareWorkerPreviewResult[];
};

export type VerifyCloudflareHostedRoutesOptions = {
  baseUrl?: string;
  fakeToken?: string;
  runs?: number;
  fetchImpl?: typeof fetch;
};

type EnvInputs = {
  baseUrl?: string;
  fakeToken: string;
  runs: number;
  outputFile?: string;
  markdownFile?: string;
};

function round(value: number, precision = 2) {
  const factor = 10 ** precision;
  return Math.round(value * factor) / factor;
}

function durationStats(samples: CloudflareWorkerPreviewSample[]) {
  const durations = samples
    .map((sample) => sample.ttfbMs ?? sample.durationMs)
    .filter((duration): duration is number => typeof duration === "number" && Number.isFinite(duration));
  if (durations.length === 0) return { minDurationMs: null, avgDurationMs: null, maxDurationMs: null };
  return {
    minDurationMs: round(Math.min(...durations)),
    avgDurationMs: round(durations.reduce((sum, duration) => sum + duration, 0) / durations.length),
    maxDurationMs: round(Math.max(...durations)),
  };
}

function normalizeOptionalHostedBaseUrl(value: string | undefined) {
  const raw = value?.trim();
  if (!raw) return null;
  return normalizeCloudflareHostedBaseUrl(raw);
}

function notConfiguredReport(runs: number): CloudflareHostedRouteProofReport {
  return {
    generatedAt: new Date().toISOString(),
    mode: "cloudflare-hosted-worker-routes",
    baseUrl: null,
    providerBacked: false,
    proofScope: "credential-free-hosted-worker-route-contract",
    configured: false,
    runs,
    fakeTokenLabel: "redacted-fake-token",
    note: BODY_NOTE,
    routeContractReady: false,
    hostedRouteProofReady: false,
    passed: false,
    blockers: ["CLOUDFLARE_HOSTED_ROUTE_BASE_URL is not configured with an HTTPS deployed Worker URL."],
    results: [],
  };
}

export function normalizeCloudflareHostedRouteBaseUrl(value: string | undefined) {
  const normalized = normalizeOptionalHostedBaseUrl(value);
  if (!normalized) {
    throw new Error("CLOUDFLARE_HOSTED_ROUTE_BASE_URL is required for hosted route proof.");
  }
  return normalized;
}

export async function verifyCloudflareHostedRoutes(
  options: VerifyCloudflareHostedRoutesOptions = {},
): Promise<CloudflareHostedRouteProofReport> {
  const runs = parseRunCount(options.runs ? String(options.runs) : undefined, DEFAULT_RUNS);
  const baseUrl = normalizeOptionalHostedBaseUrl(options.baseUrl);
  if (!baseUrl) return notConfiguredReport(runs);

  const fakeToken = options.fakeToken || DEFAULT_FAKE_TOKEN;
  const results: CloudflareWorkerPreviewResult[] = [];

  for (const probe of buildCloudflareWorkerPreviewProbes(fakeToken)) {
    const samples: CloudflareWorkerPreviewSample[] = [];
    for (let run = 1; run <= runs; run += 1) {
      samples.push(await sampleCloudflareWorkerPreviewRoute({ baseUrl, fakeToken, probe, run, fetchImpl: options.fetchImpl }));
    }
    results.push({
      ...probe,
      samples,
      ...durationStats(samples),
      passed: samples.every((sample) => sample.passed),
    });
  }

  const requiredResults = results.filter((result) => result.required);
  const failedRequired = requiredResults.filter((result) => !result.passed).map((result) => result.key);
  const routeContractReady = requiredResults.length > 0 && failedRequired.length === 0;
  const blockers = routeContractReady
    ? []
    : [`Required hosted route probes failed: ${failedRequired.length === 0 ? "(none sampled)" : failedRequired.join(", ")}.`];

  return {
    generatedAt: new Date().toISOString(),
    mode: "cloudflare-hosted-worker-routes",
    baseUrl,
    providerBacked: true,
    proofScope: "credential-free-hosted-worker-route-contract",
    configured: true,
    runs,
    fakeTokenLabel: "redacted-fake-token",
    note: BODY_NOTE,
    routeContractReady,
    hostedRouteProofReady: routeContractReady,
    passed: routeContractReady,
    blockers,
    results,
  };
}

export function parseInputsFromEnv(env: NodeJS.ProcessEnv = process.env): EnvInputs {
  return {
    baseUrl: env.CLOUDFLARE_HOSTED_ROUTE_BASE_URL || env.CLOUDFLARE_HOSTED_WORKER_BASE_URL,
    fakeToken: env.CLOUDFLARE_HOSTED_ROUTE_FAKE_TOKEN || DEFAULT_FAKE_TOKEN,
    runs: parseRunCount(env.CLOUDFLARE_HOSTED_ROUTE_RUNS, DEFAULT_RUNS),
    outputFile: env.OUTPUT_FILE,
    markdownFile: env.MARKDOWN_FILE,
  };
}

export function writeOutput(report: CloudflareHostedRouteProofReport, outputFile: string) {
  const outputPath = resolve(outputFile);
  mkdirSync(dirname(outputPath), { recursive: true });
  writeFileSync(outputPath, `${JSON.stringify(report, null, 2)}\n`);
}

export function writeMarkdown(report: CloudflareHostedRouteProofReport, markdownFile: string) {
  const outputPath = resolve(markdownFile);
  mkdirSync(dirname(outputPath), { recursive: true });
  const rows = report.results.flatMap((result) => result.samples.map((sample) => [
    result.key,
    result.kind,
    result.required ? "yes" : "no",
    String(sample.run),
    String(sample.status ?? "(error)"),
    sample.ttfbMs === null ? "(none)" : `${sample.ttfbMs}ms`,
    sample.bodyDownloadMs === null ? "(none)" : `${sample.bodyDownloadMs}ms`,
    sample.cacheControl ?? "(none)",
    sample.cfCacheStatus ?? "(none)",
    sample.age ?? "(none)",
    sample.xNextjsPrerender ?? "(none)",
    sample.location ?? "(none)",
    sample.reason,
    sample.passed ? "PASS" : "FAIL",
  ]));
  const blockerLines = report.blockers.length > 0
    ? report.blockers.map((blocker) => `- ${blocker}`)
    : ["- (none)"];
  const lines = [
    "# Cloudflare Hosted Worker Route Proof",
    "",
    `Generated: ${report.generatedAt}`,
    `Configured: ${report.configured ? "yes" : "no"}`,
    `Base URL: ${report.baseUrl ?? "(missing)"}`,
    `Runs: ${report.runs}`,
    "Fake token: redacted-fake-token",
    `Route contract ready: ${report.routeContractReady ? "yes" : "no"}`,
    `Hosted route proof ready: ${report.hostedRouteProofReady ? "yes" : "no"}`,
    "",
    report.note,
    "",
    "## Blockers",
    "",
    ...blockerLines,
    "",
    "## Probes",
    "",
    "| Probe | Kind | Required | Run | Status | TTFB | Body download | Cache-Control | CF Cache | Age | Prerender | Location | Reason | Result |",
    "| --- | --- | --- | ---: | ---: | ---: | ---: | --- | --- | --- | --- | --- | --- | --- |",
    ...(rows.length > 0 ? rows.map((row) => `| ${row.join(" | ")} |`) : ["| (none) |  |  |  |  |  |  |  |  |  |  |  |  |  |"]),
    "",
  ];
  writeFileSync(outputPath, lines.join("\n"));
}

async function main() {
  const inputs = parseInputsFromEnv();
  const report = await verifyCloudflareHostedRoutes(inputs);
  const outputFile =
    inputs.outputFile ?? ".ai/03_plans/2026-06-29-Cloudflare-Migration-Codex/evidence/2026-06-30-cloudflare-hosted-route-proof.json";
  const markdownFile =
    inputs.markdownFile ?? ".ai/03_plans/2026-06-29-Cloudflare-Migration-Codex/evidence/2026-06-30-cloudflare-hosted-route-proof.md";
  writeOutput(report, outputFile);
  writeMarkdown(report, markdownFile);
  console.log(JSON.stringify(report, null, 2));
  if (report.configured && !report.passed) process.exitCode = 1;
}

if (import.meta.main) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  });
}
