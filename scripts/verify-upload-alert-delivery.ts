#!/usr/bin/env bun

import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";

import {
  buildUploadOperationalAlertPayload,
  sendUploadOperationalAlert,
  type UploadOperationalTelemetryRecord,
} from "@/lib/uploads/operational-telemetry";

const DEFAULT_OUTPUT = ".ai/03_plans/2026-06-26-File-Upload-Audit-And-Improvement/evidence/upload-alert-delivery-production-proof.json";
const PROOF_FLAG = "ARCH_UPLOAD_ALERT_DELIVERY_PROOF";
const HOSTED_OBSERVED_FLAG = "ARCH_UPLOAD_ALERT_DELIVERY_HOSTED_OBSERVED";
const ENV_FILE_VAR = "ARCH_UPLOAD_ALERT_DELIVERY_PROOF_ENV_FILE";
const PROOF_ENV_FILE_NAMES = new Set([
  PROOF_FLAG,
  HOSTED_OBSERVED_FLAG,
  "UPLOAD_OPERATIONS_ALERTS_ENABLED",
  "UPLOAD_OPERATIONS_ALERT_WEBHOOK_URL",
  "UPLOAD_OPERATIONS_ALERT_WEBHOOK_TOKEN",
]);

type EnvFileResult = {
  requested: boolean;
  loaded: boolean;
  missing?: boolean;
  path?: string;
  names?: string[];
};

type ProofCheck = {
  label: string;
  passed: boolean;
  proof?: string;
};

export type UploadAlertDeliveryProductionProofReport = {
  generatedAt: string;
  mode: "upload-alert-delivery-production-proof";
  proofBoundary:
    | "hosted-alert-delivery-observation"
    | "hosted-alert-delivery-proof-skipped"
    | "hosted-alert-delivery-proof-failed";
  passed: boolean;
  skipped: boolean;
  target: {
    explicitProofOptIn: boolean;
    hostedObservationConfirmed: boolean;
    alertsEnabled: boolean;
    webhookConfigured: boolean;
    webhookHttps: boolean;
    tokenConfigured: boolean;
  };
  payload: {
    event: UploadOperationalTelemetryRecord["event"];
    severity: UploadOperationalTelemetryRecord["severity"];
    status: UploadOperationalTelemetryRecord["status"];
    telemetrySource: UploadOperationalTelemetryRecord["source"];
    surface: UploadOperationalTelemetryRecord["surface"] | null;
    workspaceIdPresent: boolean;
    cleanupAlertCodes: string[];
    scanAlertCodes: string[];
  };
  delivery: {
    delivered: boolean;
    statusCode: number | null;
    reason: string | null;
    secretRedacted: boolean;
    webhookUrlRedacted: boolean;
    payloadPathSafe: boolean;
  };
  checks: ProofCheck[];
  failedChecks: string[];
  envFile: EnvFileResult;
  errorSummary?: {
    name: string;
    code: string | null;
    messageSha256: string;
  };
  note: string;
};

export type UploadAlertDeliveryProofOptions = {
  generatedAt?: string;
  fetchImpl?: typeof fetch;
  envFile?: EnvFileResult;
  hostedObservationConfirmed?: boolean;
};

function readEnv(name: string) {
  return process.env[name]?.trim() || "";
}

function sha256Hex(value: string) {
  return createHash("sha256").update(value).digest("hex");
}

function decodeEnvValue(rawValue: string) {
  const trimmed = rawValue.trim();
  if ((trimmed.startsWith("\"") && trimmed.endsWith("\"")) || (trimmed.startsWith("'") && trimmed.endsWith("'"))) {
    return trimmed.slice(1, -1);
  }

  return trimmed.replace(/\s+#.*$/, "").trim();
}

export function loadUploadAlertDeliveryProofEnvFile(): EnvFileResult {
  const requestedPath = readEnv(ENV_FILE_VAR);
  if (!requestedPath) {
    return { requested: false, loaded: false };
  }

  const envPath = resolve(requestedPath);
  if (!existsSync(envPath)) {
    return { requested: true, loaded: false, missing: true, path: requestedPath };
  }

  const names: string[] = [];
  for (const line of readFileSync(envPath, "utf8").split(/\r?\n/)) {
    const normalized = line.trim().replace(/^export\s+/, "");
    if (!normalized || normalized.startsWith("#")) continue;
    const match = normalized.match(/^([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$/);
    if (!match) continue;

    const [, name, rawValue] = match;
    if (!PROOF_ENV_FILE_NAMES.has(name)) continue;
    if (!process.env[name]) {
      process.env[name] = decodeEnvValue(rawValue);
      names.push(name);
    }
  }

  return { requested: true, loaded: true, path: requestedPath, names };
}

function isHttpsWebhook(value: string) {
  if (!value) return false;
  try {
    return new URL(value).protocol === "https:";
  } catch {
    return false;
  }
}

function hostedObservationConfirmed() {
  return readEnv(HOSTED_OBSERVED_FLAG) === "1";
}

function syntheticAlertRecord(): UploadOperationalTelemetryRecord {
  return {
    schemaVersion: "v1",
    event: "upload_backpressure_rejected",
    source: "admission-control",
    surface: "component-attachment",
    status: "blocked",
    severity: "warning",
    retryAfterSeconds: 60,
    quotaClass: "active_workspace",
    backpressureReason: "active_workspace",
  };
}

function payloadSummary(record: UploadOperationalTelemetryRecord): UploadAlertDeliveryProductionProofReport["payload"] {
  const payload = buildUploadOperationalAlertPayload(record);
  return {
    event: payload.event,
    severity: payload.severity,
    status: payload.status,
    telemetrySource: payload.telemetrySource,
    surface: payload.surface,
    workspaceIdPresent: payload.workspaceId !== null,
    cleanupAlertCodes: payload.cleanup.alertCodes,
    scanAlertCodes: payload.scan.alertCodes,
  };
}

function proofCheck(label: string, passed: boolean, proof?: string): ProofCheck {
  return { label, passed, proof };
}

function isPayloadPathSafe(body: string) {
  if (!body) return false;
  const deniedPatterns = [
    /storage[_-]?path/i,
    /file[_-]?name/i,
    /component-attachments\//i,
    /component-images\//i,
    /project-images\//i,
    /private\//i,
    /signed[_-]?url/i,
    /access[_-]?token/i,
    /bearer\s+/i,
    /supabase\.co\/storage/i,
  ];
  return deniedPatterns.every((pattern) => !pattern.test(body));
}

function errorSummary(error: unknown) {
  const err = error as NodeJS.ErrnoException;
  const message = error instanceof Error ? error.message : String(error);
  return {
    name: error instanceof Error ? error.name : "Error",
    code: typeof err.code === "string" ? err.code : null,
    messageSha256: sha256Hex(message),
  };
}

function makeReport(input: {
  generatedAt?: string;
  envFile: EnvFileResult;
  target: UploadAlertDeliveryProductionProofReport["target"];
  payload: UploadAlertDeliveryProductionProofReport["payload"];
  delivery: UploadAlertDeliveryProductionProofReport["delivery"];
  error?: unknown;
}): UploadAlertDeliveryProductionProofReport {
  const checks = [
    proofCheck("alert-delivery-explicit-proof-opt-in", input.target.explicitProofOptIn),
    proofCheck("alert-delivery-hosted-observation-confirmed", input.target.hostedObservationConfirmed),
    proofCheck("alert-delivery-alerts-enabled", input.target.alertsEnabled),
    proofCheck("alert-delivery-https-webhook-configured", input.target.webhookConfigured && input.target.webhookHttps),
    proofCheck("alert-delivery-token-configured", input.target.tokenConfigured),
    proofCheck("alert-delivery-observed", input.delivery.delivered),
    proofCheck("alert-delivery-status-2xx", typeof input.delivery.statusCode === "number" && input.delivery.statusCode >= 200 && input.delivery.statusCode < 300, String(input.delivery.statusCode ?? "")),
    proofCheck("alert-delivery-secret-redacted", input.delivery.secretRedacted),
    proofCheck("alert-delivery-webhook-url-redacted", input.delivery.webhookUrlRedacted),
    proofCheck("alert-delivery-payload-path-safe", input.delivery.payloadPathSafe),
  ];
  const failedChecks = checks.filter((check) => !check.passed).map((check) => check.label);
  const passed = failedChecks.length === 0 && !input.error;

  return {
    generatedAt: input.generatedAt ?? new Date().toISOString(),
    mode: "upload-alert-delivery-production-proof",
    proofBoundary: passed
      ? "hosted-alert-delivery-observation"
      : input.target.explicitProofOptIn
        ? "hosted-alert-delivery-proof-failed"
        : "hosted-alert-delivery-proof-skipped",
    passed,
    skipped: !input.target.explicitProofOptIn,
    target: input.target,
    payload: input.payload,
    delivery: input.delivery,
    checks,
    failedChecks: input.error ? [...failedChecks, "alert-delivery-request-execution"] : failedChecks,
    envFile: input.envFile,
    errorSummary: input.error ? errorSummary(input.error) : undefined,
    note: "This proof sends one synthetic warning-level upload operations alert through the existing alert sink only when explicit proof and hosted-observation gates are set. The report never records bearer tokens, raw webhook URLs, uploaded bytes, storage paths, filenames, provider paths, or customer/project data. It does not prove cleanup/scan hosted routes, live scanner/CDR execution, dashboard observation, backpressure traffic, retention runbooks, or hosted runtime limits.",
  };
}

export async function runUploadAlertDeliveryProductionProof(
  options: UploadAlertDeliveryProofOptions = {},
): Promise<UploadAlertDeliveryProductionProofReport> {
  const record = syntheticAlertRecord();
  const rawWebhookUrl = readEnv("UPLOAD_OPERATIONS_ALERT_WEBHOOK_URL");
  const token = readEnv("UPLOAD_OPERATIONS_ALERT_WEBHOOK_TOKEN");
  const target = {
    explicitProofOptIn: readEnv(PROOF_FLAG) === "1",
    hostedObservationConfirmed: options.hostedObservationConfirmed ?? hostedObservationConfirmed(),
    alertsEnabled: readEnv("UPLOAD_OPERATIONS_ALERTS_ENABLED") === "1",
    webhookConfigured: Boolean(rawWebhookUrl),
    webhookHttps: isHttpsWebhook(rawWebhookUrl),
    tokenConfigured: Boolean(token),
  };
  const payload = payloadSummary(record);
  const envFile = options.envFile ?? { requested: false, loaded: false };

  const preflightFailed = !target.explicitProofOptIn
    || !target.hostedObservationConfirmed
    || !target.alertsEnabled
    || !target.webhookConfigured
    || !target.webhookHttps
    || !target.tokenConfigured;

  if (preflightFailed) {
    return makeReport({
      generatedAt: options.generatedAt,
      envFile,
      target,
      payload,
      delivery: {
        delivered: false,
        statusCode: null,
        reason: !target.explicitProofOptIn
          ? `${PROOF_FLAG} is not set to 1.`
          : !target.hostedObservationConfirmed
            ? `${HOSTED_OBSERVED_FLAG}=1 is required before sending production alert proof.`
            : "alert delivery configuration is incomplete.",
        secretRedacted: true,
        webhookUrlRedacted: true,
        payloadPathSafe: false,
      },
    });
  }

  let observedBody = "";
  let deliveryResult: Awaited<ReturnType<typeof sendUploadOperationalAlert>> | null = null;
  let error: unknown;

  try {
    const fetchImpl = options.fetchImpl ?? fetch;
    deliveryResult = await sendUploadOperationalAlert(record, (async (input, init) => {
      observedBody = typeof init?.body === "string" ? init.body : "";
      return fetchImpl(input, init);
    }) as typeof fetch);
  } catch (caught) {
    error = caught;
  }

  const statusCode = deliveryResult && "statusCode" in deliveryResult ? deliveryResult.statusCode : null;
  const reason = deliveryResult && "reason" in deliveryResult ? deliveryResult.reason : error ? "request_failed" : null;
  const delivery = {
    delivered: deliveryResult?.delivered === true,
    statusCode,
    reason,
    secretRedacted: !observedBody.includes(token),
    webhookUrlRedacted: !observedBody.includes(rawWebhookUrl),
    payloadPathSafe: isPayloadPathSafe(observedBody),
  };

  return makeReport({
    generatedAt: options.generatedAt,
    envFile,
    target,
    payload,
    delivery,
    error,
  });
}

function outputPathFromEnv() {
  return readEnv("ARCH_UPLOAD_ALERT_DELIVERY_PROOF_OUTPUT") || readEnv("OUTPUT_FILE") || DEFAULT_OUTPUT;
}

export function writeUploadAlertDeliveryProductionProofReport(
  report: UploadAlertDeliveryProductionProofReport,
  outputFile = outputPathFromEnv(),
) {
  const outputPath = resolve(outputFile);
  mkdirSync(dirname(outputPath), { recursive: true });
  writeFileSync(outputPath, `${JSON.stringify(report, null, 2)}\n`);
  return outputPath;
}

async function main() {
  const envFile = loadUploadAlertDeliveryProofEnvFile();
  const report = await runUploadAlertDeliveryProductionProof({ envFile });
  const output = writeUploadAlertDeliveryProductionProofReport(report);
  console.log(`Upload alert delivery production proof ${report.passed ? "passed" : "failed"}; output=${output}`);
  if (!report.passed) process.exitCode = 1;
}

if (import.meta.main) {
  void main().catch((error) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  });
}
