#!/usr/bin/env bun

import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";

const CORE_CLOSED_BETA_ENV_NAMES = [
  "NEXT_PUBLIC_APP_URL",
  "NEXT_PUBLIC_SITE_URL",
  "ARCHESTIMATOR_ALLOWED_APP_ORIGINS",
  "NEXT_PUBLIC_SUPABASE_URL",
  "NEXT_PUBLIC_SUPABASE_ANON_KEY",
  "SUPABASE_SERVICE_ROLE_KEY",
  "CLOSED_BETA_ACCESS_ENABLED",
  "PUBLICATION_TOKEN_ENCRYPTION_SECRET",
  "PUBLICATION_TOKEN_HASH_SECRET",
  "PUBLICATION_ACCESS_COOKIE_SECRET",
  "ARCHESTIMATOR_AI_ENABLED",
  "NEXT_PUBLIC_ASK_FLIP_UI_ENABLED",
] as const;

const EMAIL_DELIVERY_ENV_NAMES = [
  "RESEND_API_KEY",
  "RESEND_FROM",
  "RESEND_REPLY_TO",
  "RESEND_WEBHOOK_SECRET",
] as const;

const INVITE_DELIVERY_ENV_NAMES = [
  "PROJECT_INVITE_ENTRY_ENABLED",
  "ARCHESTIMATOR_INVITE_TOKEN_PEPPER",
] as const;

const SCHEDULED_JOB_ENV_NAMES = [
  "CRON_SECRET",
] as const;

const UPLOAD_OPERATIONS_ALERT_ENV_NAMES = [
  "UPLOAD_OPERATIONS_ALERTS_ENABLED",
  "UPLOAD_OPERATIONS_ALERT_WEBHOOK_URL",
  "UPLOAD_OPERATIONS_ALERT_WEBHOOK_TOKEN",
] as const;

const HOSTED_UPLOAD_RUNTIME_PROOF_ENV_NAMES = [
  "UPLOAD_RUNTIME_PROOF_SECRET",
  "ARCH_UPLOAD_HOSTED_MEMORY_MB",
  "ARCH_UPLOAD_HOSTED_BODY_LIMIT_BYTES",
  "ARCH_UPLOAD_HOSTED_ROUTE_DURATION_MS",
  "ARCH_UPLOAD_HOSTED_CONCURRENT_UPLOADS",
  "ARCH_UPLOAD_STORAGE_LATENCY_P95_MS",
] as const;

const LIVE_UPLOAD_SCANNER_ENV_NAMES = [
  "UPLOAD_SCAN_PROVIDER",
  "UPLOAD_CLAMD_HOST",
  "UPLOAD_CLAMD_PORT",
] as const;

type EnvGroupResult = {
  required: string[];
  present: string[];
  missing: string[];
  ready: boolean;
};

export type VercelEnvReadinessResult = {
  generatedAt: string;
  mode: "vercel-env-readiness";
  source: string;
  discoveredNames: string[];
  coreClosedBetaRuntime: EnvGroupResult;
  emailDelivery: EnvGroupResult;
  inviteDelivery: EnvGroupResult;
  scheduledJobs: EnvGroupResult;
  uploadOperationsAlerts: EnvGroupResult;
  hostedUploadRuntimeProof: EnvGroupResult;
  liveUploadScanner: EnvGroupResult;
  vercelEnvReady: boolean;
  uploadProductionProofReady: boolean;
  note: string;
};

function readEnv(name: string) {
  const value = process.env[name];
  return value?.trim() || undefined;
}

export function extractVercelEnvNames(input: string) {
  return Array.from(new Set(input.match(/\b[A-Z][A-Z0-9]+(?:_[A-Z0-9]+)+\b/g) ?? [])).sort();
}

function evaluateGroup(required: readonly string[], discoveredNames: string[]): EnvGroupResult {
  const discovered = new Set(discoveredNames);
  const present = required.filter((name) => discovered.has(name));
  const missing = required.filter((name) => !discovered.has(name));
  return {
    required: [...required],
    present,
    missing,
    ready: missing.length === 0,
  };
}

export function checkVercelEnvReadiness(input: string, source = "provided-text"): VercelEnvReadinessResult {
  const discoveredNames = extractVercelEnvNames(input);
  const coreClosedBetaRuntime = evaluateGroup(CORE_CLOSED_BETA_ENV_NAMES, discoveredNames);
  const emailDelivery = evaluateGroup(EMAIL_DELIVERY_ENV_NAMES, discoveredNames);
  const inviteDelivery = evaluateGroup(INVITE_DELIVERY_ENV_NAMES, discoveredNames);
  const scheduledJobs = evaluateGroup(SCHEDULED_JOB_ENV_NAMES, discoveredNames);
  const uploadOperationsAlerts = evaluateGroup(UPLOAD_OPERATIONS_ALERT_ENV_NAMES, discoveredNames);
  const hostedUploadRuntimeProof = evaluateGroup(HOSTED_UPLOAD_RUNTIME_PROOF_ENV_NAMES, discoveredNames);
  const liveUploadScanner = evaluateGroup(LIVE_UPLOAD_SCANNER_ENV_NAMES, discoveredNames);

  return {
    generatedAt: new Date().toISOString(),
    mode: "vercel-env-readiness",
    source,
    discoveredNames,
    coreClosedBetaRuntime,
    emailDelivery,
    inviteDelivery,
    scheduledJobs,
    uploadOperationsAlerts,
    hostedUploadRuntimeProof,
    liveUploadScanner,
    vercelEnvReady: coreClosedBetaRuntime.ready && scheduledJobs.ready,
    uploadProductionProofReady: scheduledJobs.ready
      && uploadOperationsAlerts.ready
      && hostedUploadRuntimeProof.ready
      && liveUploadScanner.ready,
    note: "Vercel env readiness checks variable names only. It does not read or prove secret values, callback URL correctness, provider dashboard configuration, scheduled job execution, alert delivery, live scanner reachability, hosted runtime limits, rollback, or hosted auth behavior.",
  };
}

function readInput() {
  const inputFile = readEnv("VERCEL_ENV_LIST_FILE");
  const inputText = readEnv("VERCEL_ENV_LIST_TEXT");

  if (inputFile) {
    return {
      source: inputFile,
      text: readFileSync(inputFile, "utf8"),
    };
  }

  if (inputText) {
    return {
      source: "VERCEL_ENV_LIST_TEXT",
      text: inputText,
    };
  }

  throw new Error("Set VERCEL_ENV_LIST_FILE to a sanitized `vercel env ls --non-interactive` transcript, or set VERCEL_ENV_LIST_TEXT.");
}

function writeOutput(outputFile: string, result: VercelEnvReadinessResult) {
  const resolved = resolve(outputFile);
  mkdirSync(dirname(resolved), { recursive: true });
  writeFileSync(resolved, `${JSON.stringify(result, null, 2)}\n`);
}

async function main() {
  const input = readInput();
  const result = checkVercelEnvReadiness(input.text, input.source);
  const outputFile = readEnv("OUTPUT_FILE");
  if (outputFile) writeOutput(outputFile, result);
  console.log(JSON.stringify(result, null, 2));
  if (!result.vercelEnvReady) process.exitCode = 1;
}

if (import.meta.main) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  });
}
