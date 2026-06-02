#!/usr/bin/env bun

import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";

type HealthProbe = {
  url: string;
  status: number | null;
  ok: boolean;
  durationMs: number | null;
  contentType: string | null;
  location: string | null;
  bodySummary: string | null;
  healthJsonOk: boolean;
  healthService: string | null;
  passed: boolean;
  error: string | null;
};

type VerifyInputs = {
  urls: string[];
  authHeader?: string;
  authCookie?: string;
  outputFile?: string;
};

export type VercelHealthReadinessResult = {
  generatedAt: string;
  mode: "vercel-health-readiness";
  urls: string[];
  usedAuthMaterial: boolean;
  probes: HealthProbe[];
  readyUrls: string[];
  blockedUrls: string[];
  vercelHealthReady: boolean;
  note: string;
};

function readEnv(name: string) {
  const value = process.env[name];
  return value?.trim() || undefined;
}

export function parseHealthUrls(input: string | undefined) {
  return (input ?? "")
    .split(/[\n,]/)
    .map((value) => value.trim())
    .filter(Boolean);
}

export function parseInputsFromEnv(): VerifyInputs {
  const urls = parseHealthUrls(readEnv("VERCEL_HEALTH_URLS"));
  if (urls.length === 0) {
    throw new Error("Missing required Vercel health proof input: VERCEL_HEALTH_URLS.");
  }

  return {
    urls,
    authHeader: readEnv("VERCEL_HEALTH_AUTH_HEADER"),
    authCookie: readEnv("VERCEL_HEALTH_AUTH_COOKIE"),
    outputFile: readEnv("OUTPUT_FILE"),
  };
}

export function buildHeaders(inputs: Pick<VerifyInputs, "authHeader" | "authCookie">) {
  const headers: Record<string, string> = {};
  if (inputs.authHeader) headers.Authorization = inputs.authHeader;
  if (inputs.authCookie) headers.Cookie = inputs.authCookie;
  return headers;
}

function summarizeBody(text: string) {
  return text
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 180);
}

function parseHealthJson(text: string) {
  try {
    const parsed = JSON.parse(text) as { ok?: unknown; service?: unknown };
    return {
      healthJsonOk: parsed.ok === true,
      healthService: typeof parsed.service === "string" ? parsed.service : null,
    };
  } catch {
    return {
      healthJsonOk: false,
      healthService: null,
    };
  }
}

export function summarizeProbe(params: {
  url: string;
  response: Response;
  bodyText: string;
  durationMs: number;
}): HealthProbe {
  const contentType = params.response.headers.get("content-type");
  const location = params.response.headers.get("location");
  const { healthJsonOk, healthService } = parseHealthJson(params.bodyText);
  const passed = params.response.status === 200 && healthJsonOk && healthService === "archestimator";

  return {
    url: params.url,
    status: params.response.status,
    ok: params.response.ok,
    durationMs: Math.round(params.durationMs),
    contentType,
    location,
    bodySummary: summarizeBody(params.bodyText),
    healthJsonOk,
    healthService,
    passed,
    error: null,
  };
}

async function probeHealthUrl(inputs: VerifyInputs, url: string, fetchImpl: typeof fetch): Promise<HealthProbe> {
  const startedAt = performance.now();
  try {
    const response = await fetchImpl(url, {
      method: "GET",
      headers: buildHeaders(inputs),
      redirect: "manual",
    });
    const bodyText = await response.text();
    const durationMs = performance.now() - startedAt;
    return summarizeProbe({ url, response, bodyText, durationMs });
  } catch (error) {
    return {
      url,
      status: null,
      ok: false,
      durationMs: Math.round(performance.now() - startedAt),
      contentType: null,
      location: null,
      bodySummary: null,
      healthJsonOk: false,
      healthService: null,
      passed: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

export async function checkVercelHealthReadiness(
  inputs: VerifyInputs,
  fetchImpl: typeof fetch = fetch,
): Promise<VercelHealthReadinessResult> {
  const probes: HealthProbe[] = [];

  for (const url of inputs.urls) {
    probes.push(await probeHealthUrl(inputs, url, fetchImpl));
  }

  const readyUrls = probes.filter((probe) => probe.passed).map((probe) => probe.url);
  const blockedUrls = probes.filter((probe) => !probe.passed).map((probe) => probe.url);

  return {
    generatedAt: new Date().toISOString(),
    mode: "vercel-health-readiness",
    urls: inputs.urls,
    usedAuthMaterial: Boolean(inputs.authHeader || inputs.authCookie),
    probes,
    readyUrls,
    blockedUrls,
    vercelHealthReady: probes.length > 0 && probes.every((probe) => probe.passed),
    note: "Sanitized Vercel health readiness check. Optional auth headers/cookies are used only for requests and are never written to this report. Passing /api/health does not prove environment values, rollback, custom-domain alias correctness beyond the probed URLs, or hosted auth.",
  };
}

function writeOutput(outputFile: string, result: VercelHealthReadinessResult) {
  const resolved = resolve(outputFile);
  mkdirSync(dirname(resolved), { recursive: true });
  writeFileSync(resolved, `${JSON.stringify(result, null, 2)}\n`);
}

async function main() {
  const inputs = parseInputsFromEnv();
  const result = await checkVercelHealthReadiness(inputs);
  if (inputs.outputFile) writeOutput(inputs.outputFile, result);
  console.log(JSON.stringify(result, null, 2));
  if (!result.vercelHealthReady) process.exitCode = 1;
}

if (import.meta.main) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  });
}
