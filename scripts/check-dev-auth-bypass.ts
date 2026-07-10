#!/usr/bin/env bun

import { spawnSync } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";

type DevAuthBypassPreflightStatus =
  | "not-enabled"
  | "production-refused"
  | "configuration-invalid"
  | "profile-query-failed"
  | "profile-missing"
  | "ready";

export type WranglerProfileQueryResult = {
  exitCode: number | null;
  signal: string | null;
  timedOut: boolean;
  stdoutBytes: number;
  stderrBytes: number;
  parsedJson: boolean;
  profileExists: boolean | null;
};

export type DevAuthBypassPreflightReport = {
  generatedAt: string;
  mode: "dev-auth-bypass-preflight";
  boundary: "local-d1-read-only";
  status: DevAuthBypassPreflightStatus;
  passed: boolean;
  bypassEnabled: boolean;
  checks: {
    nonProduction: boolean;
    emailConfigured: boolean;
    bypassSecretConfigured: boolean;
    profileQuery: WranglerProfileQueryResult | null;
  };
  missing: string[];
  nextAction: string;
  note: string;
};

type BuildOptions = {
  env?: Record<string, string | undefined>;
  queryResult?: WranglerProfileQueryResult;
  generatedAt?: string;
};

const DATABASE = "ARCH_DB";

function readEnv(env: Record<string, string | undefined>, name: string) {
  return env[name]?.trim() || "";
}

function parseWranglerD1JsonOutput(stdout: string): Array<{ results?: unknown[]; success?: boolean }> | null {
  const trimmed = stdout.trim();
  for (let index = 0; index < trimmed.length; index += 1) {
    if (trimmed[index] !== "[") continue;
    try {
      const parsed = JSON.parse(trimmed.slice(index)) as unknown;
      if (Array.isArray(parsed)) return parsed as Array<{ results?: unknown[]; success?: boolean }>;
    } catch (error) {
      if (!(error instanceof SyntaxError)) return null;
    }
  }
  return null;
}

function extractProfileExists(results: Array<{ results?: unknown[] }> | null): boolean | null {
  const value = results?.[0]?.results?.[0];
  if (!value || typeof value !== "object" || !("profile_exists" in value)) return null;
  const profileExists = (value as { profile_exists?: unknown }).profile_exists;
  return profileExists === 1 || profileExists === "1" || profileExists === true
    ? true
    : profileExists === 0 || profileExists === "0" || profileExists === false
      ? false
      : null;
}

function queryLocalD1Profile(email: string): WranglerProfileQueryResult {
  const escapedEmail = email.replaceAll("'", "''");
  const sql = `SELECT CASE WHEN EXISTS (SELECT 1 FROM profiles WHERE lower(email) = lower('${escapedEmail}')) THEN 1 ELSE 0 END AS profile_exists;`;
  const result = spawnSync("bunx", ["wrangler", "d1", "execute", DATABASE, "--local", "--command", sql], {
    cwd: process.cwd(),
    encoding: "utf8",
    timeout: 30_000,
    maxBuffer: 1024 * 1024,
  });
  const parsed = parseWranglerD1JsonOutput(result.stdout ?? "");
  return {
    exitCode: result.status,
    signal: result.signal,
    timedOut: result.error?.message.includes("ETIMEDOUT") ?? false,
    stdoutBytes: Buffer.byteLength(result.stdout ?? ""),
    stderrBytes: Buffer.byteLength(result.stderr ?? ""),
    parsedJson: Boolean(parsed),
    profileExists: extractProfileExists(parsed),
  };
}

export function buildDevAuthBypassPreflightReport(options: BuildOptions = {}): DevAuthBypassPreflightReport {
  const env = options.env ?? process.env;
  const bypassEnabled = readEnv(env, "ARCHESTIMATOR_DEV_AUTH_BYPASS") === "1";
  const nonProduction = readEnv(env, "NODE_ENV") !== "production";
  const email = readEnv(env, "ARCHESTIMATOR_DEV_AUTH_EMAIL");
  const bypassSecretConfigured = readEnv(env, "ARCHESTIMATOR_DEV_AUTH_BYPASS_SECRET").length >= 32;
  const emailConfigured = Boolean(email);
  const base = {
    generatedAt: options.generatedAt ?? new Date().toISOString(),
    mode: "dev-auth-bypass-preflight" as const,
    boundary: "local-d1-read-only" as const,
    bypassEnabled,
    checks: {
      nonProduction,
      emailConfigured,
      bypassSecretConfigured,
      profileQuery: null as WranglerProfileQueryResult | null,
    },
    note: "Reads only the local ARCH_DB profiles table. The report never includes the bypass email, secret, SQL, or Wrangler output, and it never uses --remote or writes D1 data.",
  };

  if (!bypassEnabled) {
    return { ...base, status: "not-enabled", passed: true, missing: [], nextAction: "Dev auth bypass is disabled; no local D1 profile preflight is needed." };
  }
  if (!nonProduction) {
    return { ...base, status: "production-refused", passed: false, missing: ["NODE_ENV must not be production"], nextAction: "Disable the dev bypass in production; this preflight deliberately does not query D1." };
  }

  const missing = [
    !emailConfigured ? "ARCHESTIMATOR_DEV_AUTH_EMAIL" : null,
    !bypassSecretConfigured ? "ARCHESTIMATOR_DEV_AUTH_BYPASS_SECRET (minimum 32 characters)" : null,
  ].filter((value): value is string => Boolean(value));
  if (missing.length > 0) {
    return { ...base, status: "configuration-invalid", passed: false, missing, nextAction: "Set the missing local-only bypass configuration, then rerun this read-only preflight." };
  }

  const profileQuery = options.queryResult ?? queryLocalD1Profile(email);
  const checks = { ...base.checks, profileQuery };
  if (profileQuery.exitCode !== 0 || !profileQuery.parsedJson || profileQuery.profileExists === null) {
    return { ...base, checks, status: "profile-query-failed", passed: false, missing: ["local D1 profile query"], nextAction: "Apply the local D1 migrations and make the local Wrangler/D1 runtime available, then rerun the preflight." };
  }
  if (!profileQuery.profileExists) {
    return { ...base, checks, status: "profile-missing", passed: false, missing: ["profiles row for the configured dev bypass identity"], nextAction: "Seed or select a local D1 profile for the configured bypass identity, or disable the bypass. Do not weaken the auth guard." };
  }
  return { ...base, checks, status: "ready", passed: true, missing: [], nextAction: "Local dev-auth bypass identity is ready for protected-route testing." };
}

function readOutputFile(env: Record<string, string | undefined>) {
  return env.DEV_AUTH_BYPASS_PREFLIGHT_OUTPUT_FILE?.trim() || env.OUTPUT_FILE?.trim() || "";
}

export function writeDevAuthBypassPreflightReport(report: DevAuthBypassPreflightReport, outputFile: string) {
  const resolved = resolve(outputFile);
  mkdirSync(dirname(resolved), { recursive: true });
  writeFileSync(resolved, `${JSON.stringify(report, null, 2)}\n`, "utf8");
}

function main() {
  const report = buildDevAuthBypassPreflightReport();
  const outputFile = readOutputFile(process.env);
  if (outputFile) writeDevAuthBypassPreflightReport(report, outputFile);
  console.log(JSON.stringify(report, null, 2));
  if (!report.passed) process.exit(1);
}

if (import.meta.main) {
  main();
}
