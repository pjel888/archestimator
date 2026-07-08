#!/usr/bin/env bun

import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, relative, resolve } from "node:path";

const DEFAULT_EVIDENCE_DIR = ".ai/03_plans/2026-07-07-observability-alert-proof-and-log-retention/evidence";
const DEFAULT_OUTPUT = `${DEFAULT_EVIDENCE_DIR}/production-observability-proof-check.json`;
const DEFAULT_MAX_AGE_HOURS = 72;
const WORKER_NAME = "archestimator-proof";

type RequirementKey =
  | "workersLogsQuery"
  | "uptimeAlertDelivery"
  | "errorRateAlertDelivery"
  | "incidentEscalationDelivery";

type RequirementStatus = "passed" | "failed" | "missing" | "invalid";

type ProofCheck = {
  label: string;
  passed: boolean;
  proof?: string;
};

type Requirement = {
  key: RequirementKey;
  label: string;
  candidates: string[];
  note: string;
  validate: (artifact: unknown, context: ValidationContext) => ProofCheck[];
};

type RequirementResult = {
  key: RequirementKey;
  label: string;
  status: RequirementStatus;
  artifact: string | null;
  checks: ProofCheck[];
  failedChecks: string[];
  note: string;
};

export type ProductionObservabilityProofReport = {
  generatedAt: string;
  mode: "production-observability-proof-check";
  proofBoundary: "hosted-observability-evidence-bundle";
  evidenceDir: string;
  maxAgeHours: number;
  passed: boolean;
  productionObservabilityReady: boolean;
  totals: {
    required: number;
    passed: number;
    failed: number;
    missing: number;
    invalid: number;
  };
  requirements: RequirementResult[];
  failedRequirementKeys: RequirementKey[];
  note: string;
};

export type CheckProductionObservabilityProofOptions = {
  evidenceDir?: string;
  outputFile?: string;
  generatedAt?: string;
  now?: Date;
  maxAgeHours?: number;
  fileOverrides?: Partial<Record<RequirementKey, string>>;
};

type ValidationContext = {
  now: Date;
  maxAgeHours: number;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function nested(value: unknown, path: readonly string[]) {
  let current = value;
  for (const part of path) {
    if (!isRecord(current)) return undefined;
    current = current[part];
  }
  return current;
}

function stringValue(value: unknown, path: readonly string[]) {
  const found = nested(value, path);
  return typeof found === "string" ? found : null;
}

function booleanValue(value: unknown, path: readonly string[]) {
  const found = nested(value, path);
  return typeof found === "boolean" ? found : null;
}

function numberValue(value: unknown, path: readonly string[]) {
  const found = nested(value, path);
  return typeof found === "number" ? found : null;
}

function check(label: string, passed: boolean, proof?: string): ProofCheck {
  return { label, passed, proof };
}

function displayPath(path: string) {
  const relativePath = relative(process.cwd(), resolve(path));
  return relativePath && !relativePath.startsWith("..") ? relativePath : path;
}

function parsePositiveNumber(value: string | undefined, fallback: number) {
  if (!value) return fallback;
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

export function readObservabilityProofMaxAgeHours(env: Record<string, string | undefined> = process.env) {
  return parsePositiveNumber(env.OBSERVABILITY_PROOF_MAX_AGE_HOURS, DEFAULT_MAX_AGE_HOURS);
}

function artifactFreshnessChecks(artifact: unknown, context: ValidationContext) {
  const generatedAt = stringValue(artifact, ["generatedAt"]);
  const generatedAtMs = generatedAt ? Date.parse(generatedAt) : NaN;
  const ageHours = Number.isFinite(generatedAtMs)
    ? Math.floor((context.now.getTime() - generatedAtMs) / 3_600_000)
    : null;
  return [
    check("artifact-generated-at-iso", typeof generatedAt === "string" && Number.isFinite(generatedAtMs), generatedAt ?? ""),
    check("artifact-not-from-future", ageHours !== null && ageHours >= 0, String(ageHours ?? "")),
    check(
      "artifact-within-max-age",
      ageHours !== null && ageHours <= context.maxAgeHours,
      ageHours === null ? "" : `${ageHours}h <= ${context.maxAgeHours}h`,
    ),
  ];
}

function sensitiveStringScan(artifact: unknown) {
  const text = JSON.stringify(artifact);
  if (/Bearer\s+[A-Za-z0-9._~+/=-]{12,}/i.test(text)) return false;
  if (/(cf_clearance|better-auth\.session|session_token|password-reset|invite_token)=/i.test(text)) return false;
  if (/https?:\/\/[^\s"']+[?&](token|code|state|password|secret)=/i.test(text)) return false;
  return true;
}

function sourceIsHostedLogs(value: string | null) {
  return value === "workers-logs" || value === "real-time-logs" || value === "wrangler-tail";
}

function validateWorkersLogsQuery(artifact: unknown, context: ValidationContext): ProofCheck[] {
  const matchedEvents = numberValue(artifact, ["query", "matchedEvents"]);
  return [
    ...artifactFreshnessChecks(artifact, context),
    check("workers-logs-mode", stringValue(artifact, ["mode"]) === "workers-logs-query-proof"),
    check("workers-logs-boundary", stringValue(artifact, ["proofBoundary"]) === "hosted-workers-logs-query"),
    check("workers-logs-passed", booleanValue(artifact, ["passed"]) === true),
    check("workers-logs-source-hosted", sourceIsHostedLogs(stringValue(artifact, ["source"]))),
    check("workers-logs-environment-production", stringValue(artifact, ["query", "environment"]) === "production"),
    check("workers-logs-worker-name", stringValue(artifact, ["query", "worker"]) === WORKER_NAME),
    check("workers-logs-matched-events", typeof matchedEvents === "number" && matchedEvents > 0, String(matchedEvents ?? "")),
    check("workers-logs-internal-request-id-observed", booleanValue(artifact, ["evidence", "internalRequestIdObserved"]) === true),
    check("workers-logs-route-observed", booleanValue(artifact, ["evidence", "routeObserved"]) === true),
    check("workers-logs-worker-outcome-observed", booleanValue(artifact, ["evidence", "workerOutcomeObserved"]) === true),
    check("workers-logs-error-message-redacted", booleanValue(artifact, ["evidence", "errorMessageRedacted"]) === true),
    check("workers-logs-no-raw-secrets", booleanValue(artifact, ["evidence", "noRawSecrets"]) === true),
    check("workers-logs-artifact-secret-scan", sensitiveStringScan(artifact)),
  ];
}

function deliveryStatusCodeOk(artifact: unknown) {
  const statusCode = numberValue(artifact, ["delivery", "statusCode"]);
  return statusCode == null || (statusCode >= 200 && statusCode < 300);
}

function validateAlertDeliveryScenario(expectedScenario: string) {
  return (artifact: unknown, context: ValidationContext): ProofCheck[] => [
    ...artifactFreshnessChecks(artifact, context),
    check("alert-mode", stringValue(artifact, ["mode"]) === "observability-alert-delivery-proof"),
    check("alert-boundary", stringValue(artifact, ["proofBoundary"]) === "hosted-alert-delivery-observation"),
    check("alert-scenario", stringValue(artifact, ["scenario"]) === expectedScenario),
    check("alert-passed", booleanValue(artifact, ["passed"]) === true),
    check("alert-environment-production", stringValue(artifact, ["environment"]) === "production"),
    check("alert-delivered", booleanValue(artifact, ["delivery", "delivered"]) === true),
    check("alert-observed-at-iso", Number.isFinite(Date.parse(stringValue(artifact, ["delivery", "observedAt"]) ?? ""))),
    check("alert-channel-present", Boolean(stringValue(artifact, ["delivery", "channel"]))),
    check("alert-status-2xx-if-present", deliveryStatusCodeOk(artifact), String(numberValue(artifact, ["delivery", "statusCode"]) ?? "")),
    check("alert-recipient-redacted", booleanValue(artifact, ["delivery", "recipientRedacted"]) === true),
    check("alert-secret-redacted", booleanValue(artifact, ["delivery", "secretRedacted"]) === true),
    check("alert-payload-path-safe", booleanValue(artifact, ["delivery", "payloadPathSafe"]) === true),
    check("alert-artifact-secret-scan", sensitiveStringScan(artifact)),
  ];
}

const REQUIREMENTS: Requirement[] = [
  {
    key: "workersLogsQuery",
    label: "Hosted Workers Logs query proof",
    candidates: ["workers-logs-query-proof.json"],
    note: "Requires hosted Workers Logs, Real-time Logs, or wrangler tail evidence with an internal request id, route, worker outcome, and redacted error message.",
    validate: validateWorkersLogsQuery,
  },
  {
    key: "uptimeAlertDelivery",
    label: "Hosted uptime alert delivery proof",
    candidates: ["uptime-alert-delivery-proof.json"],
    note: "Requires observed hosted delivery for the uptime scenario without raw recipients, secrets, tokens, or sensitive URLs.",
    validate: validateAlertDeliveryScenario("uptime"),
  },
  {
    key: "errorRateAlertDelivery",
    label: "Hosted error-rate alert delivery proof",
    candidates: ["error-rate-alert-delivery-proof.json"],
    note: "Requires observed hosted delivery for the error-rate scenario without raw recipients, secrets, tokens, or sensitive URLs.",
    validate: validateAlertDeliveryScenario("error-rate"),
  },
  {
    key: "incidentEscalationDelivery",
    label: "Hosted incident-escalation alert delivery proof",
    candidates: ["incident-escalation-alert-delivery-proof.json"],
    note: "Requires observed hosted delivery for incident escalation after a real or intentional drill incident.",
    validate: validateAlertDeliveryScenario("incident-escalation"),
  },
];

function loadArtifact(evidenceDir: string, candidates: readonly string[], override?: string) {
  const paths = override ? [override] : candidates.map((candidate) => join(evidenceDir, candidate));
  for (const path of paths) {
    if (!existsSync(path)) continue;
    try {
      return {
        artifactPath: displayPath(path),
        artifact: JSON.parse(readFileSync(path, "utf8")) as unknown,
        invalid: false,
      };
    } catch {
      return {
        artifactPath: displayPath(path),
        artifact: null,
        invalid: true,
      };
    }
  }

  return {
    artifactPath: null,
    artifact: null,
    invalid: false,
  };
}

function evaluateRequirement(
  requirement: Requirement,
  evidenceDir: string,
  context: ValidationContext,
  override?: string,
): RequirementResult {
  const loaded = loadArtifact(evidenceDir, requirement.candidates, override);
  if (!loaded.artifactPath) {
    return {
      key: requirement.key,
      label: requirement.label,
      status: "missing",
      artifact: null,
      checks: [],
      failedChecks: requirement.candidates.map((candidate) => `missing:${candidate}`),
      note: requirement.note,
    };
  }

  if (loaded.invalid) {
    return {
      key: requirement.key,
      label: requirement.label,
      status: "invalid",
      artifact: loaded.artifactPath,
      checks: [check("artifact-json-parseable", false)],
      failedChecks: ["artifact-json-parseable"],
      note: requirement.note,
    };
  }

  const checks = requirement.validate(loaded.artifact, context);
  const failedChecks = checks.filter((item) => !item.passed).map((item) => item.label);
  return {
    key: requirement.key,
    label: requirement.label,
    status: failedChecks.length === 0 ? "passed" : "failed",
    artifact: loaded.artifactPath,
    checks,
    failedChecks,
    note: requirement.note,
  };
}

function fileOverridesFromEnv(env: Record<string, string | undefined> = process.env): Partial<Record<RequirementKey, string>> {
  return {
    workersLogsQuery: env.OBSERVABILITY_WORKERS_LOGS_PROOF_FILE,
    uptimeAlertDelivery: env.OBSERVABILITY_UPTIME_ALERT_PROOF_FILE,
    errorRateAlertDelivery: env.OBSERVABILITY_ERROR_RATE_ALERT_PROOF_FILE,
    incidentEscalationDelivery: env.OBSERVABILITY_INCIDENT_ESCALATION_PROOF_FILE,
  };
}

function outputPathFromEnv(env: Record<string, string | undefined> = process.env) {
  return env.OUTPUT_FILE || env.OBSERVABILITY_PROOF_OUTPUT_FILE || DEFAULT_OUTPUT;
}

export function checkProductionObservabilityProof(
  options: CheckProductionObservabilityProofOptions = {},
): ProductionObservabilityProofReport {
  const evidenceDir = resolve(options.evidenceDir || process.env.OBSERVABILITY_PROOF_EVIDENCE_DIR || DEFAULT_EVIDENCE_DIR);
  const context = {
    now: options.now ?? new Date(),
    maxAgeHours: options.maxAgeHours ?? readObservabilityProofMaxAgeHours(),
  };
  const requirements = REQUIREMENTS.map((requirement) => evaluateRequirement(
    requirement,
    evidenceDir,
    context,
    options.fileOverrides?.[requirement.key],
  ));
  const totals = {
    required: requirements.length,
    passed: requirements.filter((requirement) => requirement.status === "passed").length,
    failed: requirements.filter((requirement) => requirement.status === "failed").length,
    missing: requirements.filter((requirement) => requirement.status === "missing").length,
    invalid: requirements.filter((requirement) => requirement.status === "invalid").length,
  };
  const passed = totals.passed === totals.required;

  return {
    generatedAt: options.generatedAt ?? new Date().toISOString(),
    mode: "production-observability-proof-check",
    proofBoundary: "hosted-observability-evidence-bundle",
    evidenceDir: displayPath(evidenceDir),
    maxAgeHours: context.maxAgeHours,
    passed,
    productionObservabilityReady: passed,
    totals,
    requirements,
    failedRequirementKeys: requirements
      .filter((requirement) => requirement.status !== "passed")
      .map((requirement) => requirement.key),
    note: "This checker validates hosted observability evidence artifacts. It does not query Cloudflare, send alerts, read secrets, mutate incidents, or treat local logs as production proof. Missing, stale, preview-only, unredacted, invalid, or partial artifacts keep productionObservabilityReady=false.",
  };
}

export function writeProductionObservabilityProofReport(
  report: ProductionObservabilityProofReport,
  outputFile = outputPathFromEnv(),
) {
  const outputPath = resolve(outputFile);
  mkdirSync(dirname(outputPath), { recursive: true });
  writeFileSync(outputPath, `${JSON.stringify(report, null, 2)}\n`);
  return outputPath;
}

export function formatProductionObservabilityProofSummary(
  report: ProductionObservabilityProofReport,
  outputFile?: string,
) {
  const outputSuffix = outputFile ? `; output=${outputFile}` : "";
  const lines = [
    `Production observability proof check ${report.passed ? "passed" : "failed"}${outputSuffix}`,
  ];
  if (report.passed) return lines;

  lines.push(`Failed requirements: ${report.failedRequirementKeys.join(", ") || "none"}`);
  for (const requirement of report.requirements.filter((item) => item.status !== "passed")) {
    const artifact = requirement.artifact ?? "missing";
    const failedChecks = requirement.failedChecks.join(", ") || requirement.status;
    lines.push(`- ${requirement.key}: ${requirement.status}; artifact=${artifact}; failedChecks=${failedChecks}`);
  }
  lines.push(
    "Next: run `bun run ops:check-observability-env`, collect hosted Workers Logs proof with `bun run ops:collect-workers-logs-proof`, run alert probes with `bun run ops:verify-observability-alert -- --scenario <uptime|error-rate|incident-escalation>`, then rerun `bun run ops:check-observability`.",
  );
  return lines;
}

async function main() {
  const report = checkProductionObservabilityProof({
    evidenceDir: process.env.OBSERVABILITY_PROOF_EVIDENCE_DIR,
    fileOverrides: fileOverridesFromEnv(),
  });
  const output = writeProductionObservabilityProofReport(report);
  console.log(formatProductionObservabilityProofSummary(report, output).join("\n"));
  if (!report.passed) process.exitCode = 1;
}

if (import.meta.main) {
  void main();
}
