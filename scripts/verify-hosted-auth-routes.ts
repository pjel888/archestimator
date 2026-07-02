#!/usr/bin/env bun

import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";

type AuthCaseName = "signedOut" | "allowed" | "denied" | "revoked" | "expired";

type AuthCaseInput = {
  name: AuthCaseName;
  cookie?: string;
  required: boolean;
};

type VerifyInputs = {
  baseUrl: string;
  allowedOrigins?: string[];
  platformCookie?: string;
  platformAuthHeader?: string;
  outputFile?: string;
  markdownFile?: string;
  runs?: number;
  cases: AuthCaseInput[];
};

type AuthCaseSample = {
  status: number | null;
  location: string | null;
  normalizedLocationPath: string | null;
  cacheControl: string | null;
  hasPrivateNoStoreCacheControl: boolean;
  ok: boolean;
  durationMs: number | null;
  passed: boolean;
  error: string | null;
};

type AuthCaseResult = AuthCaseSample & {
  name: AuthCaseName;
  route: string;
  expected: string;
  providedAuthMaterial: boolean;
  samples: AuthCaseSample[];
  minDurationMs: number | null;
  maxDurationMs: number | null;
  averageDurationMs: number | null;
};

type VerifyResult = {
  generatedAt: string;
  mode: "hosted-auth-route-smoke";
  baseUrl: string;
  runs: number;
  cases: AuthCaseResult[];
  passed: boolean;
  note: string;
};

const WORKSHOP_ROUTE = "/workshop";
const LOGIN_ROUTE = "/login";
const ACCESS_REQUIRED_ROUTE = "/access-required";
const DEFAULT_RUNS = 1;
const DEFAULT_ALLOWED_ORIGINS = [
  "https://archestimator.com",
  "https://www.archestimator.com",
  "https://archestimator.vercel.app",
];

function readEnv(name: string) {
  const value = process.env[name];
  return value?.trim() || undefined;
}

export function normalizeBaseUrl(value: string) {
  return value.replace(/\/+$/, "");
}

export function parseAllowedOrigins(value?: string) {
  const origins = (value ?? "")
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);
  return origins.length ? origins : DEFAULT_ALLOWED_ORIGINS;
}

function normalizeOrigin(value: string, label: string) {
  let parsed: URL;
  try {
    parsed = new URL(value);
  } catch {
    throw new Error(`${label} must be an absolute URL origin.`);
  }

  if (parsed.protocol !== "https:") {
    throw new Error(`${label} must use https before hosted auth cookies are sent.`);
  }

  return parsed.origin;
}

export function validateHostedAuthBaseUrl(baseUrl: string, allowedOrigins: string[] = DEFAULT_ALLOWED_ORIGINS) {
  const normalizedBaseOrigin = normalizeOrigin(baseUrl, "HOSTED_AUTH_BASE_URL");
  const normalizedAllowedOrigins = allowedOrigins.map((origin) => normalizeOrigin(origin, "HOSTED_AUTH_ALLOWED_ORIGINS"));

  if (!normalizedAllowedOrigins.includes(normalizedBaseOrigin)) {
    throw new Error(
      `HOSTED_AUTH_BASE_URL origin ${normalizedBaseOrigin} is not in HOSTED_AUTH_ALLOWED_ORIGINS. Refusing to send hosted auth cookies.`,
    );
  }

  return normalizedBaseOrigin;
}

export function parsePositiveIntegerEnv(value: string | undefined, envName: string, fallback: number) {
  if (!value) return fallback;
  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    throw new Error(`${envName} must be a positive integer.`);
  }
  return parsed;
}

export function parseRuns(value: string | undefined) {
  return Math.min(parsePositiveIntegerEnv(value, "HOSTED_AUTH_RUNS", DEFAULT_RUNS), 10);
}

export function parseInputsFromEnv(): VerifyInputs {
  const baseUrl = readEnv("HOSTED_AUTH_BASE_URL");

  if (!baseUrl) {
    throw new Error("Missing required hosted auth proof input: HOSTED_AUTH_BASE_URL.");
  }
  const allowedOrigins = parseAllowedOrigins(readEnv("HOSTED_AUTH_ALLOWED_ORIGINS"));

  return {
    baseUrl: validateHostedAuthBaseUrl(normalizeBaseUrl(baseUrl), allowedOrigins),
    allowedOrigins,
    platformCookie: readEnv("HOSTED_AUTH_PLATFORM_COOKIE"),
    platformAuthHeader: readEnv("HOSTED_AUTH_PLATFORM_AUTH_HEADER"),
    outputFile: readEnv("OUTPUT_FILE"),
    markdownFile: readEnv("MARKDOWN_FILE"),
    runs: parseRuns(readEnv("HOSTED_AUTH_RUNS")),
    cases: [
      { name: "signedOut", required: true },
      { name: "allowed", cookie: readEnv("HOSTED_AUTH_ALLOWED_COOKIE"), required: true },
      { name: "denied", cookie: readEnv("HOSTED_AUTH_DENIED_COOKIE"), required: true },
      { name: "revoked", cookie: readEnv("HOSTED_AUTH_REVOKED_COOKIE"), required: true },
      { name: "expired", cookie: readEnv("HOSTED_AUTH_EXPIRED_COOKIE"), required: true },
    ],
  };
}

export function buildHeaders(inputs: Pick<VerifyInputs, "platformCookie" | "platformAuthHeader">, caseCookie?: string) {
  const headers: Record<string, string> = {};
  const cookies = [inputs.platformCookie, caseCookie].filter(Boolean);

  if (cookies.length > 0) headers.Cookie = cookies.join("; ");
  if (inputs.platformAuthHeader) headers.Authorization = inputs.platformAuthHeader;

  return headers;
}

export function normalizeLocationPath(location: string | null, baseUrl: string) {
  if (!location) return null;
  try {
    const parsed = new URL(location, baseUrl);
    return `${parsed.pathname}${parsed.search}`;
  } catch {
    return location;
  }
}

export function hasPrivateNoStoreCacheControl(value: string | null) {
  if (!value) return false;
  const directives = value
    .toLowerCase()
    .split(",")
    .map((directive) => directive.trim());
  return directives.includes("private") && directives.includes("no-store");
}

function expectedDescription(name: AuthCaseName) {
  if (name === "allowed") return "allowed session reaches the protected workshop without beta-access redirect";
  if (name === "denied") return "denied session redirects to /access-required";
  if (name === "revoked") return "revoked session redirects to /access-required?status=revoked";
  return "signed-out or expired session redirects to /login with a safe next path";
}

export function evaluateCase(params: {
  name: AuthCaseName;
  status: number;
  ok: boolean;
  location: string | null;
  normalizedLocationPath: string | null;
}) {
  if (params.name === "allowed") {
    return params.ok && !params.normalizedLocationPath?.startsWith(ACCESS_REQUIRED_ROUTE);
  }

  if (params.name === "denied") {
    return params.status >= 300
      && params.status < 400
      && params.normalizedLocationPath === ACCESS_REQUIRED_ROUTE;
  }

  if (params.name === "revoked") {
    return params.status >= 300
      && params.status < 400
      && params.normalizedLocationPath === `${ACCESS_REQUIRED_ROUTE}?status=revoked`;
  }

  return params.status >= 300
    && params.status < 400
    && Boolean(params.normalizedLocationPath?.startsWith(`${LOGIN_ROUTE}?next=%2Fworkshop`));
}

function missingCaseResult(name: AuthCaseName): AuthCaseResult {
  return {
    name,
    route: WORKSHOP_ROUTE,
    expected: expectedDescription(name),
    providedAuthMaterial: false,
    status: null,
    location: null,
    normalizedLocationPath: null,
    cacheControl: null,
    hasPrivateNoStoreCacheControl: false,
    ok: false,
    durationMs: null,
    passed: false,
    error: `Missing HOSTED_AUTH_${name.toUpperCase()}_COOKIE.`,
    samples: [],
    minDurationMs: null,
    maxDurationMs: null,
    averageDurationMs: null,
  };
}

function summarizeCase(params: {
  name: AuthCaseName;
  route: string;
  providedAuthMaterial: boolean;
  samples: AuthCaseSample[];
}): AuthCaseResult {
  const latest = params.samples[params.samples.length - 1];
  if (!latest) throw new Error(`At least one hosted auth sample is required for ${params.name}.`);

  const durations = params.samples
    .map((sample) => sample.durationMs)
    .filter((duration): duration is number => duration !== null);
  const averageDurationMs = durations.length
    ? Math.round(durations.reduce((sum, duration) => sum + duration, 0) / durations.length)
    : null;

  return {
    name: params.name,
    route: params.route,
    expected: expectedDescription(params.name),
    providedAuthMaterial: params.providedAuthMaterial,
    ...latest,
    samples: params.samples,
    minDurationMs: durations.length ? Math.min(...durations) : null,
    maxDurationMs: durations.length ? Math.max(...durations) : null,
    averageDurationMs,
    passed: params.samples.every((sample) => sample.passed),
  };
}

export async function verifyHostedAuthRoutes(inputs: VerifyInputs, fetchImpl: typeof fetch = fetch): Promise<VerifyResult> {
  const baseUrl = validateHostedAuthBaseUrl(normalizeBaseUrl(inputs.baseUrl), inputs.allowedOrigins);
  const cases: AuthCaseResult[] = [];
  const runs = inputs.runs ?? DEFAULT_RUNS;

  for (const authCase of inputs.cases) {
    if (authCase.name !== "signedOut" && authCase.required && !authCase.cookie) {
      cases.push(missingCaseResult(authCase.name));
      continue;
    }

    const samples: AuthCaseSample[] = [];
    for (let index = 0; index < runs; index += 1) {
      const startedAt = performance.now();
      const response = await fetchImpl(`${baseUrl}${WORKSHOP_ROUTE}`, {
        method: "GET",
        headers: buildHeaders(inputs, authCase.cookie),
        redirect: "manual",
      });
      const durationMs = performance.now() - startedAt;
      const location = response.headers.get("location");
      const normalizedLocationPath = normalizeLocationPath(location, baseUrl);
      const cacheControl = response.headers.get("cache-control");
      const hasPrivateNoStore = hasPrivateNoStoreCacheControl(cacheControl);
      const routeBehaviorPassed = evaluateCase({
        name: authCase.name,
        status: response.status,
        ok: response.ok,
        location,
        normalizedLocationPath,
      });
      const passed = routeBehaviorPassed && hasPrivateNoStore;

      samples.push({
        status: response.status,
        location,
        normalizedLocationPath,
        cacheControl,
        hasPrivateNoStoreCacheControl: hasPrivateNoStore,
        ok: response.ok,
        durationMs: Math.round(durationMs),
        passed,
        error: null,
      });
    }

    cases.push(summarizeCase({
      name: authCase.name,
      route: WORKSHOP_ROUTE,
      providedAuthMaterial: authCase.name === "signedOut" ? false : Boolean(authCase.cookie),
      samples,
    }));
  }

  return {
    generatedAt: new Date().toISOString(),
    mode: "hosted-auth-route-smoke",
    baseUrl,
    runs,
    cases,
    passed: cases.every((authCase) => authCase.passed),
    note: "Sanitized hosted auth smoke/benchmark. Session cookies and platform bypass headers are used only for requests and are never written to this report.",
  };
}

function writeOutput(outputFile: string, result: VerifyResult) {
  const resolved = resolve(outputFile);
  mkdirSync(dirname(resolved), { recursive: true });
  writeFileSync(resolved, `${JSON.stringify(result, null, 2)}\n`);
}

function formatDuration(value: number | null) {
  return value === null ? "n/a" : `${value}ms`;
}

function writeMarkdown(markdownFile: string, result: VerifyResult) {
  const resolved = resolve(markdownFile);
  mkdirSync(dirname(resolved), { recursive: true });
  const rows = result.cases
    .map((authCase) => `| ${[
      authCase.name,
      authCase.passed ? "pass" : "fail",
      String(authCase.status ?? "n/a"),
      authCase.normalizedLocationPath ?? "n/a",
      authCase.cacheControl ?? "n/a",
      authCase.hasPrivateNoStoreCacheControl ? "yes" : "no",
      formatDuration(authCase.minDurationMs),
      formatDuration(authCase.averageDurationMs),
      formatDuration(authCase.maxDurationMs),
      authCase.error ?? "",
    ].join(" | ")} |`)
    .join("\n");

  writeFileSync(resolved, `# Hosted auth route smoke — ${result.generatedAt}

Status: **${result.passed ? "PASSED" : "OPEN / NOT FULLY PROVEN"}**.

Mode: \`${result.mode}\`

Base URL: \`${result.baseUrl}\`

Runs per provided case: ${result.runs}

| Case | Result | Latest status | Latest redirect path | Cache-Control | Private/no-store | Min | Avg | Max | Error |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
${rows}

Note: ${result.note}
\n`);
}

async function main() {
  const inputs = parseInputsFromEnv();
  const result = await verifyHostedAuthRoutes(inputs);
  if (inputs.outputFile) writeOutput(inputs.outputFile, result);
  if (inputs.markdownFile) writeMarkdown(inputs.markdownFile, result);
  console.log(JSON.stringify(result, null, 2));

  if (!result.passed) {
    process.exitCode = 1;
  }
}

if (import.meta.main) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  });
}
