#!/usr/bin/env bun

import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";

import {
  buildOperationalIncidentAlertPayload,
  operationalIncidentAlertPayloadPathSafe,
  type OperationalIncidentAlertPayload,
} from "../src/lib/observability/operational-alerts";

const EVIDENCE_DIR = ".ai/03_plans/2026-07-07-observability-alert-proof-and-log-retention/evidence";
const PROOF_FLAG = "OBSERVABILITY_ALERT_DELIVERY_PROOF";
const HOSTED_OBSERVED_FLAG = "OBSERVABILITY_ALERT_DELIVERY_HOSTED_OBSERVED";
const ENV_FILE_VAR = "OBSERVABILITY_ALERT_DELIVERY_PROOF_ENV_FILE";
const SCENARIOS = ["uptime", "error-rate", "incident-escalation"] as const;
const PROOF_ENV_FILE_NAMES = new Set([
  PROOF_FLAG,
  HOSTED_OBSERVED_FLAG,
  "OBSERVABILITY_ALERT_SCENARIO",
  "OBSERVABILITY_ALERT_WEBHOOK_URL",
  "OBSERVABILITY_ALERT_WEBHOOK_TOKEN",
  "OBSERVABILITY_ALERT_CHANNEL",
]);

type ObservabilityAlertScenario = (typeof SCENARIOS)[number];

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

type SyntheticObservabilityAlertPayload = {
  schemaVersion: "v1";
  source: "archestimator-observability";
  scenario: ObservabilityAlertScenario;
  severity: "warning" | "critical";
  status: "attention" | "blocked";
  event: string;
  sample: boolean;
};

type AlertDeliveryPayload = SyntheticObservabilityAlertPayload | OperationalIncidentAlertPayload;

export type ObservabilityAlertDeliveryProofReport = {
  generatedAt: string;
  mode: "observability-alert-delivery-proof";
  proofBoundary:
    | "hosted-alert-delivery-observation"
    | "hosted-alert-delivery-proof-skipped"
    | "hosted-alert-delivery-proof-failed";
  scenario: ObservabilityAlertScenario;
  environment: "production";
  passed: boolean;
  skipped: boolean;
  target: {
    explicitProofOptIn: boolean;
    hostedObservationConfirmed: boolean;
    webhookConfigured: boolean;
    webhookHttps: boolean;
    tokenConfigured: boolean;
  };
  payload: AlertDeliveryPayload;
  delivery: {
    delivered: boolean;
    observedAt: string | null;
    channel: string;
    statusCode: number | null;
    reason: string | null;
    recipientRedacted: boolean;
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

export type ObservabilityAlertDeliveryProofOptions = {
  scenario?: ObservabilityAlertScenario;
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

export function loadObservabilityAlertDeliveryProofEnvFile(): EnvFileResult {
  const requestedPath = readEnv(ENV_FILE_VAR);
  if (!requestedPath) return { requested: false, loaded: false };

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

function normalizeScenario(value: string | undefined): ObservabilityAlertScenario {
  if (SCENARIOS.includes(value as ObservabilityAlertScenario)) return value as ObservabilityAlertScenario;
  throw new Error(`OBSERVABILITY_ALERT_SCENARIO must be one of ${SCENARIOS.join(", ")}`);
}

function scenarioFromArgs(argv: string[]) {
  const index = argv.indexOf("--scenario");
  if (index === -1) return undefined;
  const value = argv[index + 1];
  if (!value || value.startsWith("--")) throw new Error("--scenario requires a value");
  argv.splice(index, 2);
  return normalizeScenario(value);
}

function isHttpsWebhook(value: string) {
  if (!value) return false;
  try {
    return new URL(value).protocol === "https:";
  } catch {
    return false;
  }
}

function sanitizedChannelLabel() {
  const raw = readEnv("OBSERVABILITY_ALERT_CHANNEL") || "webhook";
  if (/@/.test(raw)) return `email:${sha256Hex(raw.toLowerCase()).slice(0, 12)}`;
  if (/https?:\/\//i.test(raw)) return `url:${sha256Hex(raw).slice(0, 12)}`;
  if (/bearer|token|secret|password|cookie/i.test(raw)) return `redacted:${sha256Hex(raw).slice(0, 12)}`;
  const normalized = raw.trim().replace(/\s+/g, "-").toLowerCase();
  return /^[a-z0-9._:-]{1,48}$/.test(normalized) ? normalized : `label:${sha256Hex(raw).slice(0, 12)}`;
}

function hostedObservationConfirmed() {
  return readEnv(HOSTED_OBSERVED_FLAG) === "1";
}

function buildPayload(scenario: ObservabilityAlertScenario, generatedAt?: string): AlertDeliveryPayload {
  if (scenario === "incident-escalation") {
    return buildOperationalIncidentAlertPayload({
      action: "declare",
      database: "ARCH_DB",
      scope: "remote",
      incidentId: "incident-escalation-proof",
      eventId: "incident-escalation-proof-event",
      generatedAt,
      severity: "sev1",
      status: "open",
      owner: "ops",
      actor: "ops",
      summary: "Synthetic incident escalation alert delivery proof",
      detail: "Hosted incident escalation alert delivery probe",
      sample: true,
    });
  }

  return {
    schemaVersion: "v1",
    source: "archestimator-observability",
    scenario,
    severity: "warning",
    status: "attention",
    event: `${scenario.replace(/-/g, "_")}_alert_probe`,
    sample: true,
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
    /cookie/i,
    /password/i,
    /invite[_-]?token/i,
    /share[_-]?token/i,
  ];
  return deniedPatterns.every((pattern) => !pattern.test(body));
}

function alertDeliveryPayloadPathSafe(payload: AlertDeliveryPayload, body: string) {
  if (payload.source === "archestimator-operational-incidents") {
    return operationalIncidentAlertPayloadPathSafe(payload);
  }
  return isPayloadPathSafe(body);
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
  scenario: ObservabilityAlertScenario;
  envFile: EnvFileResult;
  target: ObservabilityAlertDeliveryProofReport["target"];
  payload: ObservabilityAlertDeliveryProofReport["payload"];
  delivery: ObservabilityAlertDeliveryProofReport["delivery"];
  error?: unknown;
}): ObservabilityAlertDeliveryProofReport {
  const checks = [
    proofCheck("alert-delivery-explicit-proof-opt-in", input.target.explicitProofOptIn),
    proofCheck("alert-delivery-hosted-observation-confirmed", input.target.hostedObservationConfirmed),
    proofCheck("alert-delivery-https-webhook-configured", input.target.webhookConfigured && input.target.webhookHttps),
    proofCheck("alert-delivery-token-configured", input.target.tokenConfigured),
    proofCheck("alert-delivery-observed", input.delivery.delivered),
    proofCheck("alert-delivery-observed-at", Boolean(input.delivery.observedAt)),
    proofCheck("alert-delivery-status-2xx", typeof input.delivery.statusCode === "number" && input.delivery.statusCode >= 200 && input.delivery.statusCode < 300, String(input.delivery.statusCode ?? "")),
    proofCheck("alert-delivery-recipient-redacted", input.delivery.recipientRedacted),
    proofCheck("alert-delivery-secret-redacted", input.delivery.secretRedacted),
    proofCheck("alert-delivery-webhook-url-redacted", input.delivery.webhookUrlRedacted),
    proofCheck("alert-delivery-payload-path-safe", input.delivery.payloadPathSafe),
  ];
  const failedChecks = checks.filter((check) => !check.passed).map((check) => check.label);
  const passed = failedChecks.length === 0 && !input.error;

  return {
    generatedAt: input.generatedAt ?? new Date().toISOString(),
    mode: "observability-alert-delivery-proof",
    proofBoundary: passed
      ? "hosted-alert-delivery-observation"
      : input.target.explicitProofOptIn
        ? "hosted-alert-delivery-proof-failed"
        : "hosted-alert-delivery-proof-skipped",
    scenario: input.scenario,
    environment: "production",
    passed,
    skipped: !input.target.explicitProofOptIn,
    target: input.target,
    payload: input.payload,
    delivery: input.delivery,
    checks,
    failedChecks: input.error ? [...failedChecks, "alert-delivery-request-execution"] : failedChecks,
    envFile: input.envFile,
    errorSummary: input.error ? errorSummary(input.error) : undefined,
    note: "This proof sends one synthetic observability alert through the configured HTTPS webhook only when explicit proof and hosted-observation gates are set. The report never records bearer tokens, raw webhook URLs, raw recipient addresses, cookies, private URLs, invite/share/password-reset tokens, customer data, storage paths, filenames, or payload bodies. It does not prove the external poller cadence, Cloudflare dashboard alert policies, or inbox ownership by itself.",
  };
}

export async function runObservabilityAlertDeliveryProof(
  options: ObservabilityAlertDeliveryProofOptions = {},
): Promise<ObservabilityAlertDeliveryProofReport> {
  const scenario = options.scenario ?? normalizeScenario(readEnv("OBSERVABILITY_ALERT_SCENARIO") || "uptime");
  const rawWebhookUrl = readEnv("OBSERVABILITY_ALERT_WEBHOOK_URL");
  const token = readEnv("OBSERVABILITY_ALERT_WEBHOOK_TOKEN");
  const target = {
    explicitProofOptIn: readEnv(PROOF_FLAG) === "1",
    hostedObservationConfirmed: options.hostedObservationConfirmed ?? hostedObservationConfirmed(),
    webhookConfigured: Boolean(rawWebhookUrl),
    webhookHttps: isHttpsWebhook(rawWebhookUrl),
    tokenConfigured: Boolean(token),
  };
  const payload = buildPayload(scenario, options.generatedAt);
  const envFile = options.envFile ?? { requested: false, loaded: false };

  const preflightFailed = !target.explicitProofOptIn
    || !target.hostedObservationConfirmed
    || !target.webhookConfigured
    || !target.webhookHttps
    || !target.tokenConfigured;

  if (preflightFailed) {
    const body = JSON.stringify(payload);
    return makeReport({
      generatedAt: options.generatedAt,
      scenario,
      envFile,
      target,
      payload,
      delivery: {
        delivered: false,
        observedAt: null,
        channel: sanitizedChannelLabel(),
        statusCode: null,
        reason: !target.explicitProofOptIn
          ? `${PROOF_FLAG} is not set to 1.`
          : !target.hostedObservationConfirmed
            ? `${HOSTED_OBSERVED_FLAG}=1 is required before sending production alert proof.`
            : "alert delivery configuration is incomplete.",
        recipientRedacted: true,
        secretRedacted: true,
        webhookUrlRedacted: true,
        payloadPathSafe: alertDeliveryPayloadPathSafe(payload, body),
      },
    });
  }

  let observedBody = "";
  let response: Response | null = null;
  let error: unknown;

  try {
    const fetchImpl = options.fetchImpl ?? fetch;
    const body = JSON.stringify(payload);
    response = await fetchImpl(rawWebhookUrl, {
      method: "POST",
      headers: {
        "authorization": `Bearer ${token}`,
        "content-type": "application/json",
        "x-archestimator-alert-scenario": scenario,
      },
      body,
    });
    observedBody = body;
  } catch (caught) {
    error = caught;
  }

  const delivery = {
    delivered: response?.ok === true,
    observedAt: response?.ok ? (options.generatedAt ?? new Date().toISOString()) : null,
    channel: sanitizedChannelLabel(),
    statusCode: response?.status ?? null,
    reason: response && !response.ok ? "webhook_rejected" : error ? "request_failed" : null,
    recipientRedacted: true,
    secretRedacted: !observedBody.includes(token),
    webhookUrlRedacted: !observedBody.includes(rawWebhookUrl),
    payloadPathSafe: alertDeliveryPayloadPathSafe(payload, observedBody),
  };

  return makeReport({
    generatedAt: options.generatedAt,
    scenario,
    envFile,
    target,
    payload,
    delivery,
    error,
  });
}

function defaultOutputFile(scenario: ObservabilityAlertScenario) {
  return `${EVIDENCE_DIR}/${scenario}-alert-delivery-proof.json`;
}

function outputPathFromEnv(scenario: ObservabilityAlertScenario) {
  return readEnv("OBSERVABILITY_ALERT_DELIVERY_PROOF_OUTPUT") || readEnv("OUTPUT_FILE") || defaultOutputFile(scenario);
}

export function writeObservabilityAlertDeliveryProofReport(
  report: ObservabilityAlertDeliveryProofReport,
  outputFile = outputPathFromEnv(report.scenario),
) {
  const outputPath = resolve(outputFile);
  mkdirSync(dirname(outputPath), { recursive: true });
  writeFileSync(outputPath, `${JSON.stringify(report, null, 2)}\n`);
  return outputPath;
}

async function main() {
  const args = process.argv.slice(2);
  const scenario = scenarioFromArgs(args) ?? normalizeScenario(readEnv("OBSERVABILITY_ALERT_SCENARIO") || "uptime");
  if (args.length > 0) throw new Error(`Unknown argument(s): ${args.join(" ")}`);
  const envFile = loadObservabilityAlertDeliveryProofEnvFile();
  const report = await runObservabilityAlertDeliveryProof({ scenario, envFile });
  const output = writeObservabilityAlertDeliveryProofReport(report);
  console.log(`Observability alert delivery proof ${report.passed ? "passed" : "failed"}; scenario=${scenario}; output=${output}`);
  if (!report.passed) process.exitCode = 1;
}

if (import.meta.main) {
  void main().catch((error) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  });
}
