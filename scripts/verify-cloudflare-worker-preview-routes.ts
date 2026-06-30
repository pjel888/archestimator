#!/usr/bin/env bun

import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";

const DEFAULT_BASE_URL = "http://localhost:8787";
const DEFAULT_FAKE_TOKEN = "not-a-real-worker-preview-share-token";
const DEFAULT_RUNS = 1;
const MAX_RUNS = 10;
const BODY_PREVIEW_LENGTH = 140;

type ProbeKind = "health" | "public-page" | "signed-out-redirect" | "invalid-share-page" | "sensitive-fail-closed";

export type CloudflareWorkerPreviewProbe = {
  key: string;
  label: string;
  path: string;
  kind: ProbeKind;
  required: boolean;
  note: string;
};

export type CloudflareWorkerPreviewSample = {
  run: number;
  status: number | null;
  ttfbMs: number | null;
  durationMs: number | null;
  bodyDownloadMs: number | null;
  contentType: string | null;
  cacheControl: string | null;
  cfCacheStatus: string | null;
  cfRay: string | null;
  age: string | null;
  xOpenNext: string | null;
  xNextjsPrerender: string | null;
  hasNoStoreCacheControl: boolean;
  location: string | null;
  setCookiePresent: boolean;
  bodyBytes: number | null;
  bodyPreview: string | null;
  passed: boolean;
  reason: string;
  error: string | null;
};

export type CloudflareWorkerPreviewResult = CloudflareWorkerPreviewProbe & {
  samples: CloudflareWorkerPreviewSample[];
  passed: boolean;
  minDurationMs: number | null;
  avgDurationMs: number | null;
  maxDurationMs: number | null;
};

export type CloudflareWorkerPreviewReport = {
  generatedAt: string;
  mode: "cloudflare-worker-preview-routes";
  baseUrl: string;
  runs: number;
  fakeTokenLabel: "redacted-fake-token";
  note: string;
  passed: boolean;
  results: CloudflareWorkerPreviewResult[];
};

export type VerifyCloudflareWorkerPreviewOptions = {
  baseUrl?: string;
  fakeToken?: string;
  runs?: number;
  fetchImpl?: typeof fetch;
};

type EnvInputs = {
  baseUrl: string;
  fakeToken: string;
  runs: number;
  outputFile?: string;
  markdownFile?: string;
};

function round(value: number, precision = 2) {
  const factor = 10 ** precision;
  return Math.round(value * factor) / factor;
}

export function parseRunCount(value: string | undefined, fallback = DEFAULT_RUNS) {
  if (!value) return fallback;
  const parsed = Number.parseInt(value, 10);
  if (!Number.isInteger(parsed) || parsed <= 0) return fallback;
  return Math.min(parsed, MAX_RUNS);
}

export function normalizeWorkerPreviewBaseUrl(value: string | undefined) {
  const raw = (value || DEFAULT_BASE_URL).trim().replace(/\/+$/, "");
  const url = new URL(raw);
  const isLocalhost = url.hostname === "localhost" || url.hostname === "127.0.0.1" || url.hostname === "::1";
  if (url.protocol !== "https:" && !(isLocalhost && url.protocol === "http:")) {
    throw new Error("CLOUDFLARE_WORKER_PREVIEW_BASE_URL must use HTTPS unless it points at localhost.");
  }
  return url.origin;
}

export function buildCloudflareWorkerPreviewProbes(fakeToken = DEFAULT_FAKE_TOKEN): CloudflareWorkerPreviewProbe[] {
  const token = encodeURIComponent(fakeToken);
  return [
    {
      key: "health",
      label: "Health JSON",
      path: "/api/health",
      kind: "health",
      required: true,
      note: "Checks the Worker bundle serves the app health contract.",
    },
    {
      key: "home",
      label: "Home page",
      path: "/",
      kind: "public-page",
      required: true,
      note: "Checks a public App Router page renders from the Worker bundle.",
    },
    {
      key: "login",
      label: "Login page",
      path: "/login",
      kind: "public-page",
      required: true,
      note: "Checks an auth entry page renders without a session.",
    },
    {
      key: "pricing",
      label: "Pricing page",
      path: "/pricing",
      kind: "public-page",
      required: true,
      note: "Checks a second public marketing page renders from the Worker bundle.",
    },
    {
      key: "features",
      label: "Features page",
      path: "/features",
      kind: "public-page",
      required: true,
      note: "Checks a feature marketing page renders from the Worker bundle.",
    },
    {
      key: "about",
      label: "About page",
      path: "/about",
      kind: "public-page",
      required: true,
      note: "Checks a public company page renders from the Worker bundle.",
    },
    {
      key: "contact",
      label: "Contact page",
      path: "/contact",
      kind: "public-page",
      required: true,
      note: "Checks a public contact page renders from the Worker bundle.",
    },
    {
      key: "trust",
      label: "Trust page",
      path: "/trust",
      kind: "public-page",
      required: true,
      note: "Checks a public trust page renders from the Worker bundle.",
    },
    {
      key: "privacy",
      label: "Privacy page",
      path: "/privacy",
      kind: "public-page",
      required: true,
      note: "Checks the public privacy notice route renders from the Worker bundle.",
    },
    {
      key: "terms",
      label: "Terms page",
      path: "/terms",
      kind: "public-page",
      required: true,
      note: "Checks the public terms route renders from the Worker bundle.",
    },
    {
      key: "signup",
      label: "Signup page",
      path: "/signup",
      kind: "public-page",
      required: true,
      note: "Checks a public auth entry page renders without a session.",
    },
    {
      key: "access-required",
      label: "Access required page",
      path: "/access-required",
      kind: "public-page",
      required: true,
      note: "Checks the public closed-beta access fallback page renders from the Worker bundle.",
    },
    {
      key: "workshop-signed-out",
      label: "Workshop signed-out redirect",
      path: "/workshop",
      kind: "signed-out-redirect",
      required: true,
      note: "Checks protected app shell access fails closed without a session.",
    },
    {
      key: "share-invalid-page",
      label: "Invalid share page",
      path: `/share/${token}`,
      kind: "invalid-share-page",
      required: true,
      note: "Checks a fake share token fails closed without exposing private data.",
    },
    {
      key: "share-invalid-api",
      label: "Invalid share API",
      path: `/api/share/${token}`,
      kind: "sensitive-fail-closed",
      required: false,
      note: "Non-blocking local preview probe: this route performs durable provider-backed rate-limit/write work before snapshot lookup, so provider-free Worker preview records its status but does not use it as the local route-matrix gate.",
    },
    {
      key: "project-image-missing-path",
      label: "Project image API missing path",
      path: "/api/projects/images",
      kind: "sensitive-fail-closed",
      required: true,
      note: "Checks private project image access fails closed without a session or path.",
    },
  ];
}

export function hasNoStoreCacheControl(value: string | null) {
  if (!value) return false;
  return value.toLowerCase().split(",").map((part) => part.trim()).includes("no-store");
}

function sanitizeText(value: string | null | undefined, fakeToken = DEFAULT_FAKE_TOKEN) {
  if (!value) return null;
  return value.replaceAll(fakeToken, "<redacted-fake-token>").replaceAll(encodeURIComponent(fakeToken), "<redacted-fake-token>");
}

function parseHealthJson(text: string) {
  try {
    const parsed = JSON.parse(text) as { ok?: unknown; service?: unknown };
    return parsed.ok === true && parsed.service === "archestimator";
  } catch {
    return false;
  }
}

function isHtmlContentType(value: string | null) {
  return value?.toLowerCase().includes("text/html") ?? false;
}

function looksLikeGenericErrorBody(value: string) {
  return /something went wrong|internal_error|application error|next_request_error/i.test(value);
}

function looksLikeUnavailableSharePage(value: string) {
  return value.includes("Shared proposal") && value.includes("This shared proposal is unavailable");
}

function isRedirectToLogin(status: number, location: string | null) {
  if (status !== 307 && status !== 308) return false;
  if (!location) return false;
  try {
    const parsed = new URL(location, "http://localhost");
    return parsed.pathname === "/login";
  } catch {
    return location.startsWith("/login");
  }
}

function isFailClosedStatus(status: number) {
  return status === 307 || status === 308 || status === 401 || status === 403 || status === 404 || status === 405;
}

function evaluateSample(input: {
  probe: CloudflareWorkerPreviewProbe;
  status: number;
  contentType: string | null;
  cacheControl: string | null;
  location: string | null;
  setCookiePresent: boolean;
  bodyText: string;
}) {
  if (input.probe.kind === "health") {
    const passed = input.status === 200 && parseHealthJson(input.bodyText);
    return { passed, reason: passed ? "health_json_ok" : "health_json_mismatch" };
  }

  if (input.probe.kind === "public-page") {
    const passed = input.status === 200
      && isHtmlContentType(input.contentType)
      && !input.setCookiePresent
      && !looksLikeGenericErrorBody(input.bodyText);
    return { passed, reason: passed ? "public_html_ok" : "public_page_mismatch" };
  }

  if (input.probe.kind === "signed-out-redirect") {
    const passed = isRedirectToLogin(input.status, input.location)
      && hasNoStoreCacheControl(input.cacheControl)
      && !input.setCookiePresent;
    return { passed, reason: passed ? "signed_out_redirect_ok" : "signed_out_redirect_mismatch" };
  }

  if (input.probe.kind === "invalid-share-page") {
    const invalidStatePage = input.status === 200
      && isHtmlContentType(input.contentType)
      && hasNoStoreCacheControl(input.cacheControl)
      && !input.setCookiePresent
      && !looksLikeGenericErrorBody(input.bodyText)
      && looksLikeUnavailableSharePage(input.bodyText);
    const hardFailClosed = isFailClosedStatus(input.status)
      && hasNoStoreCacheControl(input.cacheControl)
      && !input.setCookiePresent;
    const passed = invalidStatePage || hardFailClosed;
    return { passed, reason: passed ? "invalid_share_page_safe" : "invalid_share_page_mismatch" };
  }

  const passed = isFailClosedStatus(input.status)
    && hasNoStoreCacheControl(input.cacheControl)
    && !input.setCookiePresent;
  return { passed, reason: passed ? "sensitive_fail_closed_ok" : "sensitive_fail_closed_mismatch" };
}

function durationStats(samples: CloudflareWorkerPreviewSample[]) {
  const durations = samples
    .map((sample) => sample.ttfbMs ?? sample.durationMs)
    .filter((duration): duration is number => duration !== null);
  if (durations.length === 0) return { minDurationMs: null, avgDurationMs: null, maxDurationMs: null };
  return {
    minDurationMs: round(Math.min(...durations)),
    avgDurationMs: round(durations.reduce((sum, duration) => sum + duration, 0) / durations.length),
    maxDurationMs: round(Math.max(...durations)),
  };
}

export async function sampleCloudflareWorkerPreviewRoute({
  baseUrl,
  fakeToken,
  probe,
  run,
  fetchImpl = fetch,
}: {
  baseUrl: string;
  fakeToken: string;
  probe: CloudflareWorkerPreviewProbe;
  run: number;
  fetchImpl?: typeof fetch;
}): Promise<CloudflareWorkerPreviewSample> {
  const startedAt = performance.now();
  try {
    const response = await fetchImpl(`${baseUrl}${probe.path}`, { method: "GET", redirect: "manual" });
    const ttfbMs = round(performance.now() - startedAt);
    const bodyStartedAt = performance.now();
    const bodyText = await response.text();
    const bodyDownloadMs = round(performance.now() - bodyStartedAt);
    const cacheControl = response.headers.get("cache-control");
    const location = sanitizeText(response.headers.get("location"), fakeToken);
    const setCookiePresent = response.headers.has("set-cookie");
    const { passed, reason } = evaluateSample({
      probe,
      status: response.status,
      contentType: response.headers.get("content-type"),
      cacheControl,
      location,
      setCookiePresent,
      bodyText,
    });

    return {
      run,
      status: response.status,
      ttfbMs,
      durationMs: ttfbMs,
      bodyDownloadMs,
      contentType: response.headers.get("content-type"),
      cacheControl,
      cfCacheStatus: response.headers.get("cf-cache-status"),
      cfRay: response.headers.get("cf-ray"),
      age: response.headers.get("age"),
      xOpenNext: response.headers.get("x-opennext"),
      xNextjsPrerender: response.headers.get("x-nextjs-prerender"),
      hasNoStoreCacheControl: hasNoStoreCacheControl(cacheControl),
      location,
      setCookiePresent,
      bodyBytes: bodyText.length,
      bodyPreview: sanitizeText(bodyText.slice(0, BODY_PREVIEW_LENGTH), fakeToken),
      passed,
      reason,
      error: null,
    };
  } catch (error) {
    const durationMs = round(performance.now() - startedAt);
    return {
      run,
      status: null,
      ttfbMs: durationMs,
      durationMs,
      bodyDownloadMs: null,
      contentType: null,
      cacheControl: null,
      cfCacheStatus: null,
      cfRay: null,
      age: null,
      xOpenNext: null,
      xNextjsPrerender: null,
      hasNoStoreCacheControl: false,
      location: null,
      setCookiePresent: false,
      bodyBytes: null,
      bodyPreview: null,
      passed: false,
      reason: "request_error",
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

export async function verifyCloudflareWorkerPreviewRoutes(
  options: VerifyCloudflareWorkerPreviewOptions = {},
): Promise<CloudflareWorkerPreviewReport> {
  const baseUrl = normalizeWorkerPreviewBaseUrl(options.baseUrl);
  const fakeToken = options.fakeToken || DEFAULT_FAKE_TOKEN;
  const runs = Math.min(Math.max(options.runs ?? DEFAULT_RUNS, 1), MAX_RUNS);
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

  return {
    generatedAt: new Date().toISOString(),
    mode: "cloudflare-worker-preview-routes",
    baseUrl,
    runs,
    fakeTokenLabel: "redacted-fake-token",
    note: "Credential-free Worker route probe. Passing means the required probes on the local/preview Worker URL serve the signed-out route contract only; non-required probes are recorded as findings. This is not provider deployment, custom-domain, authenticated workflow, database migration, upload-provider, analytics receipt, or rollback proof.",
    passed: requiredResults.length > 0 && requiredResults.every((result) => result.passed),
    results,
  };
}

export function parseInputsFromEnv(env: NodeJS.ProcessEnv = process.env): EnvInputs {
  return {
    baseUrl: normalizeWorkerPreviewBaseUrl(env.CLOUDFLARE_WORKER_PREVIEW_BASE_URL ?? env.WORKER_PREVIEW_BASE_URL),
    fakeToken: env.CLOUDFLARE_WORKER_PREVIEW_FAKE_TOKEN || DEFAULT_FAKE_TOKEN,
    runs: parseRunCount(env.CLOUDFLARE_WORKER_PREVIEW_RUNS),
    outputFile: env.OUTPUT_FILE,
    markdownFile: env.MARKDOWN_FILE,
  };
}

export function writeOutput(report: CloudflareWorkerPreviewReport, outputFile: string) {
  const outputPath = resolve(outputFile);
  mkdirSync(dirname(outputPath), { recursive: true });
  writeFileSync(outputPath, `${JSON.stringify(report, null, 2)}\n`);
}

export function writeMarkdown(report: CloudflareWorkerPreviewReport, markdownFile: string) {
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

  const lines = [
    "# Cloudflare Worker Preview Route Probe",
    "",
    `Generated: ${report.generatedAt}`,
    `Base URL: ${report.baseUrl}`,
    `Runs: ${report.runs}`,
    `Overall: ${report.passed ? "PASS" : "FAIL"}`,
    "",
    report.note,
    "",
    "| Probe | Kind | Required | Run | Status | TTFB | Body download | Cache-Control | CF Cache | Age | Prerender | Location | Reason | Result |",
    "| --- | --- | --- | ---: | ---: | ---: | ---: | --- | --- | --- | --- | --- | --- | --- |",
    ...rows.map((row) => `| ${row.join(" | ")} |`),
    "",
  ];
  writeFileSync(outputPath, `${lines.join("\n")}`);
}

async function main() {
  const inputs = parseInputsFromEnv();
  const report = await verifyCloudflareWorkerPreviewRoutes(inputs);
  if (inputs.outputFile) writeOutput(report, inputs.outputFile);
  if (inputs.markdownFile) writeMarkdown(report, inputs.markdownFile);
  console.log(JSON.stringify(report, null, 2));
  if (!report.passed) process.exitCode = 1;
}

if (import.meta.main) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  });
}
