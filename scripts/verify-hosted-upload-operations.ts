#!/usr/bin/env bun

import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";

const PLAN_ROOT = ".ai/03_plans/2026-06-29-Cloudflare-Migration-Codex/evidence";
const DEFAULT_BASE_URL = "https://archestimator.com";
const DEFAULT_OUTPUT_FILE = `${PLAN_ROOT}/2026-07-02-cloudflare-hosted-upload-operations-proof.json`;
const DEFAULT_MARKDOWN_FILE = `${PLAN_ROOT}/2026-07-02-cloudflare-hosted-upload-operations-proof.md`;
const DEFAULT_RUNS = 1;
const MAX_RUNS = 5;
const DEFAULT_LIMIT = 1;
const MAX_LIMIT = 25;
const DEFAULT_ENV_FILES = [".env.local", ".dev.vars"];

type HostedUploadOperationKind = "cleanup" | "scan";
type HostedUploadOperationProbeType = "unauthenticated-fail-closed" | "authenticated-dry-run";

export type HostedUploadOperationProbe = {
  key: string;
  kind: HostedUploadOperationKind;
  type: HostedUploadOperationProbeType;
  path: string;
  authenticated: boolean;
  note: string;
};

export type HostedUploadOperationSample = {
  run: number;
  status: number;
  durationMs: number;
  cacheControl: string | null;
  hasNoStoreCacheControl: boolean;
  setCookiePresent: boolean;
  contentType: string | null;
  xVercelCache: string | null;
  bodyBytes: number;
  bodySummary: Record<string, unknown>;
  passed: boolean;
};

export type HostedUploadOperationResult = HostedUploadOperationProbe & {
  samples: HostedUploadOperationSample[];
  passed: boolean;
};

export type HostedUploadOperationsReport = {
  generatedAt: string;
  mode: "hosted-upload-operations-proof";
  proofBoundary: "hosted-fail-closed-only" | "hosted-authenticated-dry-run";
  baseUrl: string;
  runs: number;
  limit: number;
  authenticatedDryRunKinds: HostedUploadOperationKind[];
  missingAuthenticatedProbeSecrets: string[];
  passed: boolean;
  productionProofReady: boolean;
  note: string;
  results: HostedUploadOperationResult[];
};

export type VerifyHostedUploadOperationsOptions = {
  baseUrl?: string;
  cleanupSecret?: string;
  scanSecret?: string;
  runs?: number;
  limit?: number;
  fetchImpl?: typeof fetch;
};

type HostedUploadOperationsEnvInputs = Required<Pick<VerifyHostedUploadOperationsOptions, "baseUrl" | "runs" | "limit">>
  & Pick<VerifyHostedUploadOperationsOptions, "cleanupSecret" | "scanSecret">
  & {
    outputFile?: string;
    markdownFile?: string;
  };

export function round(value: number, precision = 2) {
  const factor = 10 ** precision;
  return Math.round(value * factor) / factor;
}

export function normalizeHostedUploadOperationsBaseUrl(value: string | undefined) {
  const raw = (value || DEFAULT_BASE_URL).trim().replace(/\/+$/, "");
  const url = new URL(raw);
  const isLocalhost = url.hostname === "localhost" || url.hostname === "127.0.0.1" || url.hostname === "::1";
  if (url.protocol !== "https:" && !isLocalhost) {
    throw new Error("HOSTED_UPLOAD_OPERATIONS_BASE_URL must use HTTPS unless it points at localhost.");
  }
  return url.origin;
}

export function parseHostedUploadOperationsCount(value: string | undefined, fallback: number, max: number) {
  if (!value) return fallback;
  const parsed = Number.parseInt(value, 10);
  if (!Number.isInteger(parsed) || parsed <= 0) return fallback;
  return Math.min(parsed, max);
}

function readEnv(env: NodeJS.ProcessEnv, name: string) {
  return env[name]?.trim() || undefined;
}

function unquoteEnvValue(value: string) {
  const trimmed = value.trim();
  const quote = trimmed[0];
  if ((quote === "\"" || quote === "'") && trimmed.endsWith(quote)) return trimmed.slice(1, -1);
  return trimmed;
}

function readEnvAssignment(file: string, name: string) {
  if (!existsSync(file)) return null;
  for (const line of readFileSync(file, "utf8").split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const match = trimmed.match(/^(?:export\s+)?([A-Z][A-Z0-9_]+)\s*=\s*(.*)$/);
    if (match?.[1] === name) return unquoteEnvValue(match[2]);
  }
  return null;
}

function readSecretCandidate(env: NodeJS.ProcessEnv, envFiles: string[], names: string[]) {
  for (const name of names) {
    const value = readEnv(env, name);
    if (value) return value;
  }
  for (const file of envFiles) {
    for (const name of names) {
      const value = readEnvAssignment(file, name);
      if (value?.trim()) return value.trim();
    }
  }
  return undefined;
}

function readEnvFiles(env: NodeJS.ProcessEnv) {
  const configured = readEnv(env, "HOSTED_UPLOAD_OPERATIONS_ENV_FILES");
  if (!configured) return DEFAULT_ENV_FILES;
  return configured.split(",").map((item) => item.trim()).filter(Boolean);
}

export function hasNoStoreCacheControl(value: string | null) {
  if (!value) return false;
  return value.toLowerCase().split(",").map((part) => part.trim()).includes("no-store");
}

function dryRunPath(kind: HostedUploadOperationKind, limit: number) {
  return `/api/internal/upload-${kind}?limit=${limit}&dryRun=1`;
}

export function buildHostedUploadOperationProbes(options: {
  cleanupSecret?: string;
  scanSecret?: string;
  limit?: number;
} = {}): HostedUploadOperationProbe[] {
  const limit = Math.min(Math.max(options.limit ?? DEFAULT_LIMIT, 1), MAX_LIMIT);
  const probes: HostedUploadOperationProbe[] = [
    {
      key: "upload-cleanup-unauthenticated-dry-run",
      kind: "cleanup",
      type: "unauthenticated-fail-closed",
      path: dryRunPath("cleanup", limit),
      authenticated: false,
      note: "Proves the hosted cleanup dry-run route fails closed without a bearer secret.",
    },
    {
      key: "upload-scan-unauthenticated-dry-run",
      kind: "scan",
      type: "unauthenticated-fail-closed",
      path: dryRunPath("scan", limit),
      authenticated: false,
      note: "Proves the hosted scan dry-run route fails closed without a bearer secret.",
    },
  ];

  if (options.cleanupSecret) {
    probes.push({
      key: "upload-cleanup-authenticated-dry-run",
      kind: "cleanup",
      type: "authenticated-dry-run",
      path: dryRunPath("cleanup", limit),
      authenticated: true,
      note: "Proves hosted cleanup invocation reaches the service-role reader without deleting storage or writing cleanup audit events.",
    });
  }

  if (options.scanSecret) {
    probes.push({
      key: "upload-scan-authenticated-dry-run",
      kind: "scan",
      type: "authenticated-dry-run",
      path: dryRunPath("scan", limit),
      authenticated: true,
      note: "Proves hosted scan invocation reaches the service-role queue reader without downloading objects, scanning bytes, or writing scan results.",
    });
  }

  return probes;
}

function isFailClosedStatus(status: number) {
  return status === 401 || status === 403 || status === 405 || status === 503;
}

function summarizeJson(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  const record = value as Record<string, unknown>;
  const safeKeys = [
    "mode",
    "readRecordCount",
    "selectedRecordCount",
    "pendingCount",
    "retryableCount",
    "totalBytes",
    "scannedCount",
    "writeFailedCount",
    "downloadFailedCount",
    "scannerFailedCount",
    "planner",
    "storage",
    "audit",
    "operationalSnapshot",
    "outcomeCounts",
  ];
  return Object.fromEntries(safeKeys.filter((key) => key in record).map((key) => [key, record[key]]));
}

async function readBodySummary(response: Response) {
  const text = await response.text();
  if (!text) return { bodyBytes: 0, bodySummary: {} };

  try {
    return {
      bodyBytes: text.length,
      bodySummary: summarizeJson(JSON.parse(text)),
    };
  } catch {
    return {
      bodyBytes: text.length,
      bodySummary: {},
    };
  }
}

function samplePassed(probe: HostedUploadOperationProbe, response: Response, bodySummary: Record<string, unknown>) {
  const noStore = hasNoStoreCacheControl(response.headers.get("cache-control"));
  const noCookie = !response.headers.has("set-cookie");

  if (probe.type === "unauthenticated-fail-closed") {
    return isFailClosedStatus(response.status) && noStore && noCookie;
  }

  return response.status === 200 && noStore && noCookie && bodySummary.mode === "dry-run";
}

export async function sampleHostedUploadOperation({
  baseUrl,
  probe,
  run,
  secret,
  fetchImpl = fetch,
}: {
  baseUrl: string;
  probe: HostedUploadOperationProbe;
  run: number;
  secret?: string;
  fetchImpl?: typeof fetch;
}): Promise<HostedUploadOperationSample> {
  const startedAt = performance.now();
  const headers = probe.authenticated && secret ? { authorization: `Bearer ${secret}` } : undefined;
  const response = await fetchImpl(`${baseUrl}${probe.path}`, { redirect: "manual", headers });
  const durationMs = round(performance.now() - startedAt);
  const { bodyBytes, bodySummary } = await readBodySummary(response);
  const cacheControl = response.headers.get("cache-control");

  return {
    run,
    status: response.status,
    durationMs,
    cacheControl,
    hasNoStoreCacheControl: hasNoStoreCacheControl(cacheControl),
    setCookiePresent: response.headers.has("set-cookie"),
    contentType: response.headers.get("content-type"),
    xVercelCache: response.headers.get("x-vercel-cache"),
    bodyBytes,
    bodySummary,
    passed: samplePassed(probe, response, bodySummary),
  };
}

export async function verifyHostedUploadOperations(options: VerifyHostedUploadOperationsOptions = {}): Promise<HostedUploadOperationsReport> {
  const baseUrl = normalizeHostedUploadOperationsBaseUrl(options.baseUrl);
  const runs = Math.min(Math.max(options.runs ?? DEFAULT_RUNS, 1), MAX_RUNS);
  const limit = Math.min(Math.max(options.limit ?? DEFAULT_LIMIT, 1), MAX_LIMIT);
  const probes = buildHostedUploadOperationProbes({
    cleanupSecret: options.cleanupSecret,
    scanSecret: options.scanSecret,
    limit,
  });
  const results: HostedUploadOperationResult[] = [];

  for (const probe of probes) {
    const samples: HostedUploadOperationSample[] = [];
    const secret = probe.kind === "cleanup" ? options.cleanupSecret : options.scanSecret;
    for (let run = 1; run <= runs; run += 1) {
      samples.push(await sampleHostedUploadOperation({ baseUrl, probe, run, secret, fetchImpl: options.fetchImpl }));
    }
    results.push({ ...probe, samples, passed: samples.every((sample) => sample.passed) });
  }

  const authenticatedDryRunKinds = results
    .filter((result) => result.type === "authenticated-dry-run" && result.passed)
    .map((result) => result.kind);
  const missingAuthenticatedProbeSecrets = [
    options.cleanupSecret ? null : "HOSTED_UPLOAD_OPERATIONS_CLEANUP_SECRET",
    options.scanSecret ? null : "HOSTED_UPLOAD_OPERATIONS_SCAN_SECRET",
  ].filter((value): value is string => Boolean(value));
  const productionProofReady = authenticatedDryRunKinds.includes("cleanup") && authenticatedDryRunKinds.includes("scan");

  return {
    generatedAt: new Date().toISOString(),
    mode: "hosted-upload-operations-proof",
    proofBoundary: productionProofReady ? "hosted-authenticated-dry-run" : "hosted-fail-closed-only",
    baseUrl,
    runs,
    limit,
    authenticatedDryRunKinds,
    missingAuthenticatedProbeSecrets,
    passed: results.every((result) => result.passed),
    productionProofReady,
    note: "Hosted upload operations proof never records bearer secrets. Authenticated dry-run probes read cleanup/scan queues only; they do not delete storage, write cleanup audit events, download uploaded bytes, call scanner providers, or write scan results. This does not prove live scanner/CDR service execution, real alert delivery, dashboard observation, backpressure traffic, or retention-runbook completion.",
    results,
  };
}

export function parseInputsFromEnv(env: NodeJS.ProcessEnv = process.env): HostedUploadOperationsEnvInputs {
  const envFiles = readEnvFiles(env);
  return {
    baseUrl: normalizeHostedUploadOperationsBaseUrl(env.HOSTED_UPLOAD_OPERATIONS_BASE_URL),
    cleanupSecret: readSecretCandidate(env, envFiles, [
      "HOSTED_UPLOAD_OPERATIONS_CLEANUP_SECRET",
      "UPLOAD_CLEANUP_JOB_SECRET",
      "CRON_SECRET",
    ]),
    scanSecret: readSecretCandidate(env, envFiles, [
      "HOSTED_UPLOAD_OPERATIONS_SCAN_SECRET",
      "UPLOAD_SCAN_JOB_SECRET",
      "CRON_SECRET",
    ]),
    runs: parseHostedUploadOperationsCount(env.HOSTED_UPLOAD_OPERATIONS_RUNS, DEFAULT_RUNS, MAX_RUNS),
    limit: parseHostedUploadOperationsCount(env.HOSTED_UPLOAD_OPERATIONS_LIMIT, DEFAULT_LIMIT, MAX_LIMIT),
    outputFile: env.OUTPUT_FILE ?? DEFAULT_OUTPUT_FILE,
    markdownFile: env.MARKDOWN_FILE ?? DEFAULT_MARKDOWN_FILE,
  };
}

export function writeOutput(report: HostedUploadOperationsReport, outputFile: string) {
  const outputPath = resolve(outputFile);
  mkdirSync(dirname(outputPath), { recursive: true });
  writeFileSync(outputPath, `${JSON.stringify(report, null, 2)}\n`);
}

export function writeMarkdown(report: HostedUploadOperationsReport, markdownFile: string) {
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
    result.authenticated ? "yes" : "no",
    sample.passed ? "PASS" : "FAIL",
  ]));

  const lines = [
    "# Hosted Upload Operations Proof",
    "",
    `Generated: ${report.generatedAt}`,
    `Base URL: ${report.baseUrl}`,
    `Overall: ${report.passed ? "PASS" : "FAIL"}`,
    `Production dry-run proof ready: ${report.productionProofReady ? "yes" : "no"}`,
    "",
    report.note,
    "",
    "| Probe | Run | Status | Duration | Cache-Control | no-store | Set-Cookie | Authenticated | Result |",
    "| --- | ---: | ---: | ---: | --- | --- | --- | --- | --- |",
    ...rows.map((row) => `| ${row.join(" | ")} |`),
    "",
    "## Remaining Gates",
    "",
    "This proof surface does not close hosted scanner/CDR execution, observed alert delivery, hosted dashboard emission, hosted backpressure exercise, retention-runbook exercise, or body-size/memory/duration/storage-latency proof.",
  ];
  writeFileSync(outputPath, `${lines.join("\n")}\n`);
}

export async function main() {
  const inputs = parseInputsFromEnv();
  const report = await verifyHostedUploadOperations(inputs);
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
