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
  platformCookie?: string;
  platformAuthHeader?: string;
  outputFile?: string;
  cases: AuthCaseInput[];
};

type AuthCaseResult = {
  name: AuthCaseName;
  route: string;
  expected: string;
  providedAuthMaterial: boolean;
  status: number | null;
  location: string | null;
  normalizedLocationPath: string | null;
  ok: boolean;
  durationMs: number | null;
  passed: boolean;
  error: string | null;
};

type VerifyResult = {
  generatedAt: string;
  mode: "hosted-auth-route-smoke";
  baseUrl: string;
  cases: AuthCaseResult[];
  passed: boolean;
  note: string;
};

const WORKSHOP_ROUTE = "/workshop";
const LOGIN_ROUTE = "/login";
const ACCESS_REQUIRED_ROUTE = "/beta/access-required";

function readEnv(name: string) {
  const value = process.env[name];
  return value?.trim() || undefined;
}

export function normalizeBaseUrl(value: string) {
  return value.replace(/\/+$/, "");
}

export function parseInputsFromEnv(): VerifyInputs {
  const baseUrl = readEnv("HOSTED_AUTH_BASE_URL");

  if (!baseUrl) {
    throw new Error("Missing required hosted auth proof input: HOSTED_AUTH_BASE_URL.");
  }

  return {
    baseUrl: normalizeBaseUrl(baseUrl),
    platformCookie: readEnv("HOSTED_AUTH_PLATFORM_COOKIE"),
    platformAuthHeader: readEnv("HOSTED_AUTH_PLATFORM_AUTH_HEADER"),
    outputFile: readEnv("OUTPUT_FILE"),
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

function expectedDescription(name: AuthCaseName) {
  if (name === "allowed") return "allowed session reaches the protected workshop without beta-access redirect";
  if (name === "denied") return "denied session redirects to /beta/access-required";
  if (name === "revoked") return "revoked session redirects to /beta/access-required?status=revoked";
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
    ok: false,
    durationMs: null,
    passed: false,
    error: `Missing HOSTED_AUTH_${name.toUpperCase()}_COOKIE.`,
  };
}

export async function verifyHostedAuthRoutes(inputs: VerifyInputs, fetchImpl: typeof fetch = fetch): Promise<VerifyResult> {
  const cases: AuthCaseResult[] = [];

  for (const authCase of inputs.cases) {
    if (authCase.name !== "signedOut" && authCase.required && !authCase.cookie) {
      cases.push(missingCaseResult(authCase.name));
      continue;
    }

    const startedAt = performance.now();
    const response = await fetchImpl(`${inputs.baseUrl}${WORKSHOP_ROUTE}`, {
      method: "GET",
      headers: buildHeaders(inputs, authCase.cookie),
      redirect: "manual",
    });
    const durationMs = performance.now() - startedAt;
    const location = response.headers.get("location");
    const normalizedLocationPath = normalizeLocationPath(location, inputs.baseUrl);
    const passed = evaluateCase({
      name: authCase.name,
      status: response.status,
      ok: response.ok,
      location,
      normalizedLocationPath,
    });

    cases.push({
      name: authCase.name,
      route: WORKSHOP_ROUTE,
      expected: expectedDescription(authCase.name),
      providedAuthMaterial: authCase.name === "signedOut" ? false : Boolean(authCase.cookie),
      status: response.status,
      location,
      normalizedLocationPath,
      ok: response.ok,
      durationMs: Math.round(durationMs),
      passed,
      error: null,
    });
  }

  return {
    generatedAt: new Date().toISOString(),
    mode: "hosted-auth-route-smoke",
    baseUrl: inputs.baseUrl,
    cases,
    passed: cases.every((authCase) => authCase.passed),
    note: "Sanitized hosted auth smoke. Session cookies and platform bypass headers are used only for requests and are never written to this report.",
  };
}

function writeOutput(outputFile: string, result: VerifyResult) {
  const resolved = resolve(outputFile);
  mkdirSync(dirname(resolved), { recursive: true });
  writeFileSync(resolved, `${JSON.stringify(result, null, 2)}\n`);
}

async function main() {
  const inputs = parseInputsFromEnv();
  const result = await verifyHostedAuthRoutes(inputs);
  if (inputs.outputFile) writeOutput(inputs.outputFile, result);
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
