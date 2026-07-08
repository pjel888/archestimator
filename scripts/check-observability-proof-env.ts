#!/usr/bin/env bun

import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";

export type ObservabilityProofEnvCheck = {
  key: string;
  required: boolean;
  passed: boolean;
  detail: string;
};

export type ObservabilityProofEnvGroup = {
  key: "workersLogsProof" | "alertDeliveryProof" | "operationalIncidentAlerts";
  ready: boolean;
  checks: ObservabilityProofEnvCheck[];
};

export type ObservabilityProofEnvReport = {
  generatedAt: string;
  mode: "observability-proof-env-preflight";
  proofBoundary: "non-secret-env-preflight";
  passed: boolean;
  hostedProofCollectionReady: boolean;
  operationalIncidentAlertsReady: boolean;
  groups: ObservabilityProofEnvGroup[];
  missingRequiredEnv: string[];
  invalidRequiredEnv: string[];
  advisory: string[];
  note: string;
};

type BuildOptions = {
  env?: Record<string, string | undefined>;
  generatedAt?: string;
};

const SAFE_SEARCH_TEXT_PATTERN = /^[A-Za-z0-9._:/[\]-]{1,180}$/;

function readEnv(env: Record<string, string | undefined>, name: string) {
  return env[name]?.trim() || "";
}

function isEnabled(value: string) {
  return value === "1" || value.toLowerCase() === "true";
}

function isSafeSearchText(value: string) {
  return SAFE_SEARCH_TEXT_PATTERN.test(value);
}

function isHttpsUrl(value: string) {
  try {
    return new URL(value).protocol === "https:";
  } catch {
    return false;
  }
}

function checkRequiredPresence(env: Record<string, string | undefined>, key: string): ObservabilityProofEnvCheck {
  const present = Boolean(readEnv(env, key));
  return {
    key,
    required: true,
    passed: present,
    detail: present ? "present" : "missing",
  };
}

function checkRequiredFlag(env: Record<string, string | undefined>, key: string): ObservabilityProofEnvCheck {
  const value = readEnv(env, key);
  const enabled = isEnabled(value);
  return {
    key,
    required: true,
    passed: enabled,
    detail: enabled ? "enabled" : value ? "not-enabled" : "missing",
  };
}

function checkRequiredHttpsUrl(env: Record<string, string | undefined>, key: string): ObservabilityProofEnvCheck {
  const value = readEnv(env, key);
  const present = Boolean(value);
  const valid = present && isHttpsUrl(value);
  return {
    key,
    required: true,
    passed: valid,
    detail: valid ? "present-https-url" : present ? "invalid-or-non-https-url" : "missing",
  };
}

function checkWorkersLogsProofInputs(env: Record<string, string | undefined>): ObservabilityProofEnvCheck {
  const requestId = readEnv(env, "WORKERS_LOGS_PROOF_REQUEST_ID");
  const route = readEnv(env, "WORKERS_LOGS_PROOF_ROUTE");
  const triggerUrl = readEnv(env, "WORKERS_LOGS_PROOF_URL") || readEnv(env, "WORKERS_LOGS_PROOF_TRIGGER_URL");
  const triggerSecret = readEnv(env, "WORKERS_LOGS_PROOF_SECRET");
  const legacyPresent = Boolean(requestId || route);
  const legacyReady = Boolean(requestId && route && isSafeSearchText(requestId) && isSafeSearchText(route));
  const triggerPresent = Boolean(triggerUrl || triggerSecret);
  const triggerReady = Boolean(triggerUrl && triggerSecret && isHttpsUrl(triggerUrl));
  const passed = legacyReady || triggerReady;
  let detail = "missing";
  if (legacyReady) detail = "legacy-request-id-ready";
  else if (triggerReady) detail = "trigger-url-ready";
  else if (legacyPresent || triggerPresent) detail = "invalid-or-incomplete";

  return {
    key: "WORKERS_LOGS_PROOF_REQUEST_ID+WORKERS_LOGS_PROOF_ROUTE or WORKERS_LOGS_PROOF_URL+WORKERS_LOGS_PROOF_SECRET",
    required: true,
    passed,
    detail,
  };
}

function checkAdvisoryCredential(env: Record<string, string | undefined>): ObservabilityProofEnvCheck {
  const hasToken = Boolean(readEnv(env, "CLOUDFLARE_API_TOKEN"));
  const hasAccount = Boolean(readEnv(env, "CLOUDFLARE_ACCOUNT_ID"));
  return {
    key: "CLOUDFLARE_API_TOKEN+CLOUDFLARE_ACCOUNT_ID",
    required: false,
    passed: hasToken && hasAccount,
    detail: hasToken && hasAccount ? "env-credential-hints-present" : "env-credential-hints-missing",
  };
}

function group(key: ObservabilityProofEnvGroup["key"], checks: ObservabilityProofEnvCheck[]): ObservabilityProofEnvGroup {
  return {
    key,
    ready: checks.filter((check) => check.required).every((check) => check.passed),
    checks,
  };
}

export function buildObservabilityProofEnvReport(options: BuildOptions = {}): ObservabilityProofEnvReport {
  const env = options.env ?? process.env;
  const workersLogsProof = group("workersLogsProof", [
    checkWorkersLogsProofInputs(env),
    checkAdvisoryCredential(env),
  ]);
  const alertDeliveryProof = group("alertDeliveryProof", [
    checkRequiredFlag(env, "OBSERVABILITY_ALERT_DELIVERY_PROOF"),
    checkRequiredFlag(env, "OBSERVABILITY_ALERT_DELIVERY_HOSTED_OBSERVED"),
    checkRequiredHttpsUrl(env, "OBSERVABILITY_ALERT_WEBHOOK_URL"),
    checkRequiredPresence(env, "OBSERVABILITY_ALERT_WEBHOOK_TOKEN"),
  ]);
  const operationalIncidentAlerts = group("operationalIncidentAlerts", [
    checkRequiredFlag(env, "OPERATIONAL_INCIDENT_ALERTS_ENABLED"),
    checkRequiredHttpsUrl(env, "OPERATIONAL_INCIDENT_ALERT_WEBHOOK_URL"),
    checkRequiredPresence(env, "OPERATIONAL_INCIDENT_ALERT_WEBHOOK_TOKEN"),
  ]);
  const groups = [workersLogsProof, alertDeliveryProof, operationalIncidentAlerts];
  const requiredFailures = groups.flatMap((item) => item.checks.filter((check) => check.required && !check.passed));
  const missingRequiredEnv = requiredFailures
    .filter((check) => check.detail === "missing")
    .map((check) => check.key);
  const invalidRequiredEnv = requiredFailures
    .filter((check) => check.detail !== "missing")
    .map((check) => check.key);
  const hostedProofCollectionReady = workersLogsProof.ready && alertDeliveryProof.ready;
  const operationalIncidentAlertsReady = operationalIncidentAlerts.ready;

  return {
    generatedAt: options.generatedAt ?? new Date().toISOString(),
    mode: "observability-proof-env-preflight",
    proofBoundary: "non-secret-env-preflight",
    passed: hostedProofCollectionReady && operationalIncidentAlertsReady,
    hostedProofCollectionReady,
    operationalIncidentAlertsReady,
    groups,
    missingRequiredEnv,
    invalidRequiredEnv,
    advisory: workersLogsProof.checks.some((check) => !check.required && !check.passed)
      ? [
        "Cloudflare credential env hints are missing. This does not prove wrangler auth is unavailable, but hosted Workers Logs collection may still require an authenticated wrangler session.",
      ]
      : [],
    note: "Non-secret preflight only. It reports required env presence and safe shapes for hosted proof collection; it does not query Cloudflare, send webhooks, read token values, or prove production observability.",
  };
}

function readOutputFile(env: Record<string, string | undefined>) {
  return env.OBSERVABILITY_PROOF_ENV_OUTPUT_FILE?.trim() || env.OUTPUT_FILE?.trim() || "";
}

export function writeObservabilityProofEnvReport(report: ObservabilityProofEnvReport, outputFile: string) {
  const resolved = resolve(outputFile);
  mkdirSync(dirname(resolved), { recursive: true });
  writeFileSync(resolved, `${JSON.stringify(report, null, 2)}\n`, "utf8");
}

function main() {
  const report = buildObservabilityProofEnvReport();
  const outputFile = readOutputFile(process.env);
  if (outputFile) writeObservabilityProofEnvReport(report, outputFile);
  console.log(JSON.stringify(report, null, 2));
  if (!report.passed) process.exit(1);
}

if (import.meta.main) {
  main();
}
