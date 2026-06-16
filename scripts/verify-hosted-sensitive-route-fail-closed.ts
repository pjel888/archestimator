#!/usr/bin/env bun

import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";

const DEFAULT_BASE_URL = "https://www.archestimator.com";
const DEFAULT_FAKE_TOKEN = "not-a-real-share-token-for-performance-proof";
const DEFAULT_RUNS = 1;
const MAX_RUNS = 10;
const BODY_PREVIEW_LENGTH = 140;

export type SensitiveRouteProbe = {
  key: string;
  label: string;
  path: string;
  note: string;
};

export type SensitiveRouteSample = {
  run: number;
  status: number;
  durationMs: number;
  cacheControl: string | null;
  hasNoStoreCacheControl: boolean;
  location: string | null;
  setCookiePresent: boolean;
  xVercelCache: string | null;
  contentType: string | null;
  bodyBytes: number;
  bodyPreview: string;
  failClosed: boolean;
  passed: boolean;
};

export type SensitiveRouteResult = SensitiveRouteProbe & {
  samples: SensitiveRouteSample[];
  minDurationMs: number | null;
  avgDurationMs: number | null;
  maxDurationMs: number | null;
  passed: boolean;
};

export type SensitiveRouteReport = {
  generatedAt: string;
  mode: "hosted-sensitive-route-fail-closed";
  baseUrl: string;
  runs: number;
  fakeTokenLabel: "redacted-fake-token";
  note: string;
  passed: boolean;
  results: SensitiveRouteResult[];
};

export type VerifySensitiveRoutesOptions = {
  baseUrl?: string;
  fakeToken?: string;
  runs?: number;
  fetchImpl?: typeof fetch;
};

export type SensitiveRoutesEnvInputs = {
  baseUrl: string;
  fakeToken: string;
  runs: number;
  outputFile?: string;
  markdownFile?: string;
};

export function round(value: number, precision = 2) {
  const factor = 10 ** precision;
  return Math.round(value * factor) / factor;
}

export function parseRunCount(value: string | undefined, fallback = DEFAULT_RUNS) {
  if (!value) return fallback;
  const parsed = Number.parseInt(value, 10);
  if (!Number.isInteger(parsed) || parsed <= 0) return fallback;
  return Math.min(parsed, MAX_RUNS);
}

export function normalizeHostedBaseUrl(value: string | undefined) {
  const raw = (value || DEFAULT_BASE_URL).trim().replace(/\/+$/, "");
  const url = new URL(raw);
  const isLocalhost = url.hostname === "localhost" || url.hostname === "127.0.0.1" || url.hostname === "::1";
  if (url.protocol !== "https:" && !isLocalhost) {
    throw new Error("HOSTED_SENSITIVE_BASE_URL must use HTTPS unless it points at localhost.");
  }
  return url.origin;
}

export function buildSensitiveRouteProbes(fakeToken = DEFAULT_FAKE_TOKEN): SensitiveRouteProbe[] {
  const token = encodeURIComponent(fakeToken);
  return [
    {
      key: "share-page-invalid-token",
      label: "Invalid share page",
      path: `/share/${token}`,
      note: "Exercises redacted invalid-token share page rendering without a private token.",
    },
    {
      key: "share-api-invalid-token",
      label: "Invalid share snapshot API",
      path: `/api/share/${token}`,
      note: "Exercises redacted invalid-token share snapshot API without a private token.",
    },
    {
      key: "share-activity-invalid-token",
      label: "Invalid share activity API",
      path: `/api/share/${token}/activity`,
      note: "Exercises redacted invalid-token share activity API without a private token.",
    },
    {
      key: "project-image-missing-path",
      label: "Project image API missing path",
      path: "/api/projects/images",
      note: "Exercises private project image route without a path or session.",
    },
    {
      key: "project-image-invalid-path",
      label: "Project image API invalid path",
      path: "/api/projects/images?path=not-a-valid-private-path.webp",
      note: "Exercises private project image route with a non-secret invalid storage path.",
    },
    {
      key: "project-image-valid-shaped-path",
      label: "Project image API valid-shaped fake path",
      path: "/api/projects/images?path=11111111-1111-4111-8111-111111111111/22222222-2222-4222-8222-222222222222/project-images/33333333-3333-4333-8333-333333333333/non-secret-proof.webp",
      note: "Exercises private project image route with a syntactically valid but non-secret fake storage path and no session.",
    },
  ];
}

export function hasNoStoreCacheControl(value: string | null) {
  if (!value) return false;
  return value.toLowerCase().split(",").map((part) => part.trim()).includes("no-store");
}

export function isFailClosedStatus(status: number) {
  return status === 307 || status === 308 || status === 401 || status === 403 || status === 404 || status === 405;
}

export function sanitizeText(value: string | null | undefined, fakeToken = DEFAULT_FAKE_TOKEN) {
  if (!value) return null;
  return value.replaceAll(fakeToken, "<redacted-fake-token>").replaceAll(encodeURIComponent(fakeToken), "<redacted-fake-token>");
}

export function sanitizeProbeForReport(probe: SensitiveRouteProbe, fakeToken = DEFAULT_FAKE_TOKEN): SensitiveRouteProbe {
  return { ...probe, path: sanitizeText(probe.path, fakeToken) ?? probe.path };
}

function durationStats(samples: SensitiveRouteSample[]) {
  if (samples.length === 0) return { minDurationMs: null, avgDurationMs: null, maxDurationMs: null };
  const durations = samples.map((sample) => sample.durationMs);
  return {
    minDurationMs: round(Math.min(...durations)),
    avgDurationMs: round(durations.reduce((sum, duration) => sum + duration, 0) / durations.length),
    maxDurationMs: round(Math.max(...durations)),
  };
}

export async function sampleSensitiveRoute({
  baseUrl,
  fakeToken,
  probe,
  run,
  fetchImpl = fetch,
}: {
  baseUrl: string;
  fakeToken: string;
  probe: SensitiveRouteProbe;
  run: number;
  fetchImpl?: typeof fetch;
}): Promise<SensitiveRouteSample> {
  const startedAt = performance.now();
  const response = await fetchImpl(`${baseUrl}${probe.path}`, { redirect: "manual" });
  const durationMs = round(performance.now() - startedAt);
  const text = await response.text();
  const cacheControl = response.headers.get("cache-control");
  const location = sanitizeText(response.headers.get("location"), fakeToken);
  const setCookiePresent = response.headers.has("set-cookie");
  const failClosed = isFailClosedStatus(response.status) && !setCookiePresent;
  const cacheSafe = hasNoStoreCacheControl(cacheControl);

  return {
    run,
    status: response.status,
    durationMs,
    cacheControl,
    hasNoStoreCacheControl: cacheSafe,
    location,
    setCookiePresent,
    xVercelCache: response.headers.get("x-vercel-cache"),
    contentType: response.headers.get("content-type"),
    bodyBytes: text.length,
    bodyPreview: sanitizeText(text.slice(0, BODY_PREVIEW_LENGTH), fakeToken) ?? "",
    failClosed,
    passed: failClosed && cacheSafe,
  };
}

export async function verifyHostedSensitiveRoutes(options: VerifySensitiveRoutesOptions = {}): Promise<SensitiveRouteReport> {
  const baseUrl = normalizeHostedBaseUrl(options.baseUrl);
  const fakeToken = options.fakeToken || DEFAULT_FAKE_TOKEN;
  const runs = Math.min(Math.max(options.runs ?? DEFAULT_RUNS, 1), MAX_RUNS);
  const probes = buildSensitiveRouteProbes(fakeToken);
  const results: SensitiveRouteResult[] = [];

  for (const probe of probes) {
    const samples: SensitiveRouteSample[] = [];
    for (let run = 1; run <= runs; run += 1) {
      samples.push(await sampleSensitiveRoute({ baseUrl, fakeToken, probe, run, fetchImpl: options.fetchImpl }));
    }
    const stats = durationStats(samples);
    results.push({ ...sanitizeProbeForReport(probe, fakeToken), samples, ...stats, passed: samples.every((sample) => sample.passed) });
  }

  return {
    generatedAt: new Date().toISOString(),
    mode: "hosted-sensitive-route-fail-closed",
    baseUrl,
    runs,
    fakeTokenLabel: "redacted-fake-token",
    note: "Credential-free hosted probe for invalid share tokens and unauthenticated private image routes. It proves fail-closed/no-store behavior only; valid share tokens and private media fixtures remain separate owner-approved evidence gates.",
    passed: results.every((result) => result.passed),
    results,
  };
}

export function parseInputsFromEnv(env: NodeJS.ProcessEnv = process.env): SensitiveRoutesEnvInputs {
  return {
    baseUrl: normalizeHostedBaseUrl(env.HOSTED_SENSITIVE_BASE_URL),
    fakeToken: env.HOSTED_SENSITIVE_FAKE_TOKEN || DEFAULT_FAKE_TOKEN,
    runs: parseRunCount(env.HOSTED_SENSITIVE_RUNS),
    outputFile: env.OUTPUT_FILE,
    markdownFile: env.MARKDOWN_FILE,
  };
}

export function writeOutput(report: SensitiveRouteReport, outputFile: string) {
  const outputPath = resolve(outputFile);
  mkdirSync(dirname(outputPath), { recursive: true });
  writeFileSync(outputPath, `${JSON.stringify(report, null, 2)}\n`);
}

export function writeMarkdown(report: SensitiveRouteReport, markdownFile: string) {
  const outputPath = resolve(markdownFile);
  mkdirSync(dirname(outputPath), { recursive: true });
  const rows = report.results.flatMap((result) => result.samples.map((sample) => [
    result.key,
    String(sample.run),
    String(sample.status),
    `${sample.durationMs}ms`,
    sample.cacheControl ?? "(none)",
    sample.hasNoStoreCacheControl ? "yes" : "no",
    sample.setCookiePresent ? "yes" : "no",
    sample.location ?? "(none)",
    sample.passed ? "PASS" : "FAIL",
  ]));

  const lines = [
    "# Hosted Sensitive Route Fail-Closed Probe",
    "",
    `Generated: ${report.generatedAt}`,
    `Base URL: ${report.baseUrl}`,
    `Overall: ${report.passed ? "PASS" : "FAIL"}`,
    "",
    report.note,
    "",
    "| Route | Run | Status | Duration | Cache-Control | no-store | Set-Cookie | Location | Result |",
    "| --- | ---: | ---: | ---: | --- | --- | --- | --- | --- |",
    ...rows.map((row) => `| ${row.join(" | ")} |`),
    "",
    "## Interpretation",
    "",
    "This probe intentionally uses only a fake share token and unauthenticated private-image requests. It does not prove valid private-token or private-media latency. Any FAIL means the route either did not fail closed or did not carry a no-store cache policy and must remain provider-proof-open.",
  ];
  writeFileSync(outputPath, `${lines.join("\n")}\n`);
}

export async function main() {
  const inputs = parseInputsFromEnv();
  const report = await verifyHostedSensitiveRoutes(inputs);
  if (inputs.outputFile) writeOutput(report, inputs.outputFile);
  if (inputs.markdownFile) writeMarkdown(report, inputs.markdownFile);
  if (!inputs.outputFile && !inputs.markdownFile) {
    process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
  }
  if (!report.passed) process.exitCode = 1;
}

if (import.meta.main) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  });
}
