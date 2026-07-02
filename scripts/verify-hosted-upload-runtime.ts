#!/usr/bin/env bun

import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";

const DEFAULT_BASE_URL = "https://www.archestimator.com";
const DEFAULT_RUNS = 1;
const MAX_RUNS = 5;
const DEFAULT_CONCURRENCY = 2;
const MAX_CONCURRENCY = 6;
const DEFAULT_BODY_PROBE_BYTES = 1024;
const MAX_BODY_PROBE_BYTES = 4 * 1024 * 1024;
const RUNTIME_PATH = "/api/internal/upload-runtime";

type HostedUploadRuntimeProbeType =
  | "unauthenticated-fail-closed"
  | "authenticated-runtime-dry-run"
  | "authenticated-body-probe"
  | "authenticated-concurrency-probe";

export type HostedUploadRuntimeSample = {
  key: string;
  type: HostedUploadRuntimeProbeType;
  run: number;
  status: number;
  durationMs: number;
  cacheControl: string | null;
  hasNoStoreCacheControl: boolean;
  setCookiePresent: boolean;
  contentType: string | null;
  bodyBytes: number;
  bodySummary: Record<string, unknown>;
  passed: boolean;
};

export type HostedUploadRuntimeReport = {
  generatedAt: string;
  mode: "hosted-upload-runtime-proof";
  proofBoundary: "hosted-runtime-fail-closed-only" | "hosted-runtime-authenticated-dry-run";
  baseUrl: string;
  runs: number;
  concurrency: number;
  bodyProbeBytes: number;
  authenticated: boolean;
  passed: boolean;
  productionProofReady: boolean;
  missingAuthenticatedProbeSecrets: string[];
  note: string;
  samples: HostedUploadRuntimeSample[];
};

export type VerifyHostedUploadRuntimeOptions = {
  baseUrl?: string;
  secret?: string;
  runs?: number;
  concurrency?: number;
  bodyProbeBytes?: number;
  fetchImpl?: typeof fetch;
};

type HostedUploadRuntimeEnvInputs = Required<Omit<VerifyHostedUploadRuntimeOptions, "secret" | "fetchImpl">>
  & Pick<VerifyHostedUploadRuntimeOptions, "secret">
  & {
    outputFile?: string;
  };

function round(value: number, precision = 2) {
  const factor = 10 ** precision;
  return Math.round(value * factor) / factor;
}

export function normalizeHostedUploadRuntimeBaseUrl(value: string | undefined) {
  const raw = (value || DEFAULT_BASE_URL).trim().replace(/\/+$/, "");
  const url = new URL(raw);
  const isLocalhost = url.hostname === "localhost" || url.hostname === "127.0.0.1" || url.hostname === "::1";
  if (url.protocol !== "https:" && !isLocalhost) {
    throw new Error("HOSTED_UPLOAD_RUNTIME_BASE_URL must use HTTPS unless it points at localhost.");
  }
  return url.origin;
}

export function parseHostedUploadRuntimeCount(value: string | undefined, fallback: number, max: number) {
  if (!value) return fallback;
  const parsed = Number.parseInt(value, 10);
  if (!Number.isInteger(parsed) || parsed <= 0) return fallback;
  return Math.min(parsed, max);
}

export function hasNoStoreCacheControl(value: string | null) {
  if (!value) return false;
  return value.toLowerCase().split(",").map((part) => part.trim()).includes("no-store");
}

function isFailClosedStatus(status: number) {
  return status === 401 || status === 403 || status === 405 || status === 503;
}

function summarizeJson(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  const record = value as Record<string, unknown>;
  const safeKeys = [
    "mode",
    "proofSurface",
    "runtime",
    "durationMs",
    "deployment",
    "configuredLimits",
    "bodyProbe",
    "memory",
    "storageLatency",
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

function runtimeSummaryPassed(summary: Record<string, unknown>) {
  const storageLatency = summary.storageLatency as Record<string, unknown> | undefined;
  return summary.mode === "dry-run"
    && summary.proofSurface === "upload-hosted-runtime"
    && summary.runtime === "nodejs"
    && storageLatency?.status === "ok"
    && storageLatency.bucketReachable === true;
}

function bodyProbePassed(summary: Record<string, unknown>, expectedBytes: number) {
  const bodyProbe = summary.bodyProbe as Record<string, unknown> | undefined;
  return runtimeSummaryPassed(summary) && bodyProbe?.receivedBytes === expectedBytes;
}

function configuredLimitsPresent(summary: Record<string, unknown>) {
  const configuredLimits = summary.configuredLimits as Record<string, unknown> | undefined;
  if (!configuredLimits) return false;
  return [
    "memoryMb",
    "bodyLimitBytes",
    "routeDurationMs",
    "expectedConcurrentUploads",
    "storageLatencyP95Ms",
  ].every((key) => typeof configuredLimits[key] === "number");
}

function samplePassed(type: HostedUploadRuntimeProbeType, response: Response, bodySummary: Record<string, unknown>, bodyProbeBytes: number) {
  const noStore = hasNoStoreCacheControl(response.headers.get("cache-control"));
  const noCookie = !response.headers.has("set-cookie");

  if (type === "unauthenticated-fail-closed") {
    return isFailClosedStatus(response.status) && noStore && noCookie;
  }
  if (type === "authenticated-body-probe") {
    return response.status === 200 && noStore && noCookie && bodyProbePassed(bodySummary, bodyProbeBytes);
  }
  return response.status === 200 && noStore && noCookie && runtimeSummaryPassed(bodySummary);
}

async function sampleHostedUploadRuntime({
  baseUrl,
  key,
  type,
  run,
  secret,
  bodyProbeBytes,
  fetchImpl = fetch,
}: {
  baseUrl: string;
  key: string;
  type: HostedUploadRuntimeProbeType;
  run: number;
  secret?: string;
  bodyProbeBytes: number;
  fetchImpl?: typeof fetch;
}): Promise<HostedUploadRuntimeSample> {
  const startedAt = performance.now();
  const authenticated = type !== "unauthenticated-fail-closed";
  const method = type === "authenticated-body-probe" ? "POST" : "GET";
  const body = type === "authenticated-body-probe" ? new Uint8Array(bodyProbeBytes) : undefined;
  const headers: Record<string, string> = {};
  if (authenticated && secret) headers.authorization = `Bearer ${secret}`;
  if (body) headers["content-type"] = "application/octet-stream";

  const response = await fetchImpl(`${baseUrl}${RUNTIME_PATH}`, {
    method,
    redirect: "manual",
    headers,
    body,
  });
  const durationMs = round(performance.now() - startedAt);
  const { bodyBytes, bodySummary } = await readBodySummary(response);
  const cacheControl = response.headers.get("cache-control");

  return {
    key,
    type,
    run,
    status: response.status,
    durationMs,
    cacheControl,
    hasNoStoreCacheControl: hasNoStoreCacheControl(cacheControl),
    setCookiePresent: response.headers.has("set-cookie"),
    contentType: response.headers.get("content-type"),
    bodyBytes,
    bodySummary,
    passed: samplePassed(type, response, bodySummary, bodyProbeBytes),
  };
}

export async function verifyHostedUploadRuntime(options: VerifyHostedUploadRuntimeOptions = {}): Promise<HostedUploadRuntimeReport> {
  const baseUrl = normalizeHostedUploadRuntimeBaseUrl(options.baseUrl);
  const runs = Math.min(Math.max(options.runs ?? DEFAULT_RUNS, 1), MAX_RUNS);
  const concurrency = Math.min(Math.max(options.concurrency ?? DEFAULT_CONCURRENCY, 1), MAX_CONCURRENCY);
  const bodyProbeBytes = Math.min(Math.max(options.bodyProbeBytes ?? DEFAULT_BODY_PROBE_BYTES, 1), MAX_BODY_PROBE_BYTES);
  const samples: HostedUploadRuntimeSample[] = [];

  for (let run = 1; run <= runs; run += 1) {
    samples.push(await sampleHostedUploadRuntime({
      baseUrl,
      key: "upload-runtime-unauthenticated-fail-closed",
      type: "unauthenticated-fail-closed",
      run,
      bodyProbeBytes,
      fetchImpl: options.fetchImpl,
    }));
  }

  if (options.secret) {
    for (let run = 1; run <= runs; run += 1) {
      samples.push(await sampleHostedUploadRuntime({
        baseUrl,
        key: "upload-runtime-authenticated-dry-run",
        type: "authenticated-runtime-dry-run",
        run,
        secret: options.secret,
        bodyProbeBytes,
        fetchImpl: options.fetchImpl,
      }));
      samples.push(await sampleHostedUploadRuntime({
        baseUrl,
        key: "upload-runtime-authenticated-body-probe",
        type: "authenticated-body-probe",
        run,
        secret: options.secret,
        bodyProbeBytes,
        fetchImpl: options.fetchImpl,
      }));
    }

    const concurrencySamples = await Promise.all(Array.from({ length: concurrency }, (_, index) => sampleHostedUploadRuntime({
      baseUrl,
      key: "upload-runtime-authenticated-concurrency-probe",
      type: "authenticated-concurrency-probe",
      run: index + 1,
      secret: options.secret,
      bodyProbeBytes,
      fetchImpl: options.fetchImpl,
    })));
    samples.push(...concurrencySamples);
  }

  const authenticatedSamples = samples.filter((sample) => sample.type !== "unauthenticated-fail-closed");
  const authenticatedPassed = authenticatedSamples.length > 0 && authenticatedSamples.every((sample) => sample.passed);
  const latestRuntimeSummary = [...authenticatedSamples].reverse().find((sample) => runtimeSummaryPassed(sample.bodySummary))?.bodySummary;
  const productionProofReady = authenticatedPassed && Boolean(latestRuntimeSummary && configuredLimitsPresent(latestRuntimeSummary));

  return {
    generatedAt: new Date().toISOString(),
    mode: "hosted-upload-runtime-proof",
    proofBoundary: authenticatedPassed ? "hosted-runtime-authenticated-dry-run" : "hosted-runtime-fail-closed-only",
    baseUrl,
    runs,
    concurrency,
    bodyProbeBytes,
    authenticated: Boolean(options.secret),
    passed: samples.every((sample) => sample.passed),
    productionProofReady,
    missingAuthenticatedProbeSecrets: options.secret ? [] : ["HOSTED_UPLOAD_RUNTIME_SECRET"],
    note: "Hosted upload runtime proof never records bearer secrets or uploaded bytes. Authenticated probes call a secret-gated non-mutating route that reports runtime memory, bounded body-probe receipt, concurrency reachability, and Cloudflare R2 storage latency. This does not prove real user upload UX, scanner/CDR execution, alert delivery, dashboard observation, backpressure traffic, or retention-runbook completion.",
    samples,
  };
}

export function parseInputsFromEnv(env: NodeJS.ProcessEnv = process.env): HostedUploadRuntimeEnvInputs {
  return {
    baseUrl: normalizeHostedUploadRuntimeBaseUrl(env.HOSTED_UPLOAD_RUNTIME_BASE_URL),
    secret: env.HOSTED_UPLOAD_RUNTIME_SECRET || env.UPLOAD_RUNTIME_PROOF_SECRET || env.CRON_SECRET,
    runs: parseHostedUploadRuntimeCount(env.HOSTED_UPLOAD_RUNTIME_RUNS, DEFAULT_RUNS, MAX_RUNS),
    concurrency: parseHostedUploadRuntimeCount(env.HOSTED_UPLOAD_RUNTIME_CONCURRENCY, DEFAULT_CONCURRENCY, MAX_CONCURRENCY),
    bodyProbeBytes: parseHostedUploadRuntimeCount(env.HOSTED_UPLOAD_RUNTIME_BODY_PROBE_BYTES, DEFAULT_BODY_PROBE_BYTES, MAX_BODY_PROBE_BYTES),
    outputFile: env.OUTPUT_FILE,
  };
}

export function writeOutput(report: HostedUploadRuntimeReport, outputFile: string) {
  const outputPath = resolve(outputFile);
  mkdirSync(dirname(outputPath), { recursive: true });
  writeFileSync(outputPath, `${JSON.stringify(report, null, 2)}\n`);
}

export async function main() {
  const inputs = parseInputsFromEnv();
  const report = await verifyHostedUploadRuntime(inputs);
  if (inputs.outputFile) writeOutput(report, inputs.outputFile);
  if (!inputs.outputFile) {
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
