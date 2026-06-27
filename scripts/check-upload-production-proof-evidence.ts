#!/usr/bin/env bun

import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";

const DEFAULT_EVIDENCE_DIR = ".ai/03_plans/2026-06-26-File-Upload-Audit-And-Improvement/evidence";
const DEFAULT_OUTPUT = `${DEFAULT_EVIDENCE_DIR}/upload-production-proof-evidence-check.json`;

type EvidenceRequirementKey =
  | "hostedUploadOperations"
  | "hostedUploadRuntime"
  | "liveScanner"
  | "alertDelivery"
  | "dashboardObservation"
  | "hostedBackpressure"
  | "retentionRunbook";

type EvidenceStatus = "passed" | "failed" | "missing" | "invalid";

type EvidenceCheck = {
  label: string;
  passed: boolean;
  proof?: string;
};

type EvidenceRequirementResult = {
  key: EvidenceRequirementKey;
  label: string;
  status: EvidenceStatus;
  artifact: string | null;
  checks: EvidenceCheck[];
  failedChecks: string[];
  note: string;
};

type EvidenceRequirement = {
  key: EvidenceRequirementKey;
  label: string;
  candidates: string[];
  note: string;
  validate: (artifact: unknown) => EvidenceCheck[];
};

export type UploadProductionProofEvidenceReport = {
  generatedAt: string;
  mode: "upload-production-proof-evidence-check";
  proofBoundary: "fail-closed-production-evidence-bundle";
  evidenceDir: string;
  passed: boolean;
  productionProofReady: boolean;
  totals: {
    required: number;
    passed: number;
    failed: number;
    missing: number;
    invalid: number;
  };
  requirements: EvidenceRequirementResult[];
  note: string;
};

export type CheckUploadProductionProofEvidenceOptions = {
  evidenceDir?: string;
  outputFile?: string;
  generatedAt?: string;
  fileOverrides?: Partial<Record<EvidenceRequirementKey, string>>;
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

function arrayValue(value: unknown, path: readonly string[]) {
  const found = nested(value, path);
  return Array.isArray(found) ? found : [];
}

function check(label: string, passed: boolean, proof?: string): EvidenceCheck {
  return { label, passed, proof };
}

function validateHostedUploadOperations(artifact: unknown): EvidenceCheck[] {
  const authenticatedKinds = arrayValue(artifact, ["authenticatedDryRunKinds"]);
  return [
    check("hosted-operations-mode", stringValue(artifact, ["mode"]) === "hosted-upload-operations-proof"),
    check("hosted-operations-passed", booleanValue(artifact, ["passed"]) === true),
    check("hosted-operations-production-proof-ready", booleanValue(artifact, ["productionProofReady"]) === true),
    check("hosted-operations-authenticated-boundary", stringValue(artifact, ["proofBoundary"]) === "hosted-authenticated-dry-run"),
    check("hosted-cleanup-dry-run-observed", authenticatedKinds.includes("cleanup"), authenticatedKinds.join(",")),
    check("hosted-scan-dry-run-observed", authenticatedKinds.includes("scan"), authenticatedKinds.join(",")),
    check("hosted-operations-secrets-present-but-not-recorded", arrayValue(artifact, ["missingAuthenticatedProbeSecrets"]).length === 0),
  ];
}

function validateHostedUploadRuntime(artifact: unknown): EvidenceCheck[] {
  const sampleTypes = arrayValue(artifact, ["samples"])
    .filter(isRecord)
    .map((sample) => sample.type)
    .filter((type): type is string => typeof type === "string");
  return [
    check("hosted-runtime-mode", stringValue(artifact, ["mode"]) === "hosted-upload-runtime-proof"),
    check("hosted-runtime-passed", booleanValue(artifact, ["passed"]) === true),
    check("hosted-runtime-production-proof-ready", booleanValue(artifact, ["productionProofReady"]) === true),
    check("hosted-runtime-authenticated", booleanValue(artifact, ["authenticated"]) === true),
    check("hosted-runtime-authenticated-boundary", stringValue(artifact, ["proofBoundary"]) === "hosted-runtime-authenticated-dry-run"),
    check("hosted-runtime-body-probe-observed", sampleTypes.includes("authenticated-body-probe"), sampleTypes.join(",")),
    check("hosted-runtime-concurrency-probe-observed", sampleTypes.includes("authenticated-concurrency-probe"), sampleTypes.join(",")),
    check("hosted-runtime-secrets-present-but-not-recorded", arrayValue(artifact, ["missingAuthenticatedProbeSecrets"]).length === 0),
  ];
}

function validateLiveScanner(artifact: unknown): EvidenceCheck[] {
  return [
    check("live-scanner-mode", stringValue(artifact, ["mode"]) === "upload-clamd-live-proof"),
    check("live-scanner-boundary", stringValue(artifact, ["proofBoundary"]) === "live-clamd-scanner-service-proof"),
    check("live-scanner-passed", booleanValue(artifact, ["passed"]) === true),
    check("live-scanner-not-skipped", booleanValue(artifact, ["skipped"]) === false),
    check("live-scanner-provider-clamd", stringValue(artifact, ["scannerProvider"]) === "clamd"),
    check("live-scanner-clean-fixture", stringValue(artifact, ["samples", "clean", "outcome"]) === "clean"),
    check("live-scanner-eicar-detected", stringValue(artifact, ["samples", "eicar", "outcome"]) === "infected"),
    check("live-scanner-failed-checks-empty", arrayValue(artifact, ["failedChecks"]).length === 0),
  ];
}

function validateAlertDelivery(artifact: unknown): EvidenceCheck[] {
  const statusCode = numberValue(artifact, ["delivery", "statusCode"]);
  return [
    check("alert-delivery-mode", stringValue(artifact, ["mode"]) === "upload-alert-delivery-production-proof"),
    check("alert-delivery-boundary", stringValue(artifact, ["proofBoundary"]) === "hosted-alert-delivery-observation"),
    check("alert-delivery-passed", booleanValue(artifact, ["passed"]) === true),
    check("alert-delivery-observed", booleanValue(artifact, ["delivery", "delivered"]) === true),
    check("alert-delivery-status-2xx", typeof statusCode === "number" && statusCode >= 200 && statusCode < 300, String(statusCode ?? "")),
    check("alert-delivery-secret-redacted", booleanValue(artifact, ["delivery", "secretRedacted"]) === true),
    check("alert-delivery-payload-path-safe", booleanValue(artifact, ["delivery", "payloadPathSafe"]) === true),
  ];
}

function validateDashboardObservation(artifact: unknown): EvidenceCheck[] {
  return [
    check("dashboard-mode", stringValue(artifact, ["mode"]) === "upload-dashboard-production-proof"),
    check("dashboard-boundary", stringValue(artifact, ["proofBoundary"]) === "hosted-dashboard-observation"),
    check("dashboard-passed", booleanValue(artifact, ["passed"]) === true),
    check("dashboard-hosted-observed", booleanValue(artifact, ["dashboard", "hostedObserved"]) === true),
    check("dashboard-path-safe", booleanValue(artifact, ["dashboard", "pathSafe"]) === true),
    check("dashboard-backpressure-metric-present", booleanValue(artifact, ["dashboard", "backpressureMetricPresent"]) === true),
    check("dashboard-cleanup-scan-metrics-present", booleanValue(artifact, ["dashboard", "cleanupScanMetricsPresent"]) === true),
  ];
}

function validateHostedBackpressure(artifact: unknown): EvidenceCheck[] {
  return [
    check("backpressure-mode", stringValue(artifact, ["mode"]) === "upload-backpressure-production-proof"),
    check("backpressure-boundary", stringValue(artifact, ["proofBoundary"]) === "hosted-backpressure-observation"),
    check("backpressure-passed", booleanValue(artifact, ["passed"]) === true),
    check("backpressure-hosted-exercised", booleanValue(artifact, ["exercise", "hosted"]) === true),
    check("backpressure-429-observed", numberValue(artifact, ["exercise", "rejectionStatus"]) === 429),
    check("backpressure-retry-after-observed", booleanValue(artifact, ["exercise", "retryAfterPresent"]) === true),
    check("backpressure-telemetry-observed", booleanValue(artifact, ["exercise", "telemetryObserved"]) === true),
    check("backpressure-path-safe", booleanValue(artifact, ["exercise", "pathSafe"]) === true),
  ];
}

function validateRetentionRunbook(artifact: unknown): EvidenceCheck[] {
  return [
    check("retention-runbook-mode", stringValue(artifact, ["mode"]) === "upload-retention-runbook-production-proof"),
    check("retention-runbook-boundary", stringValue(artifact, ["proofBoundary"]) === "production-retention-runbook-exercise"),
    check("retention-runbook-passed", booleanValue(artifact, ["passed"]) === true),
    check("retention-runbook-hosted-cron-observed", booleanValue(artifact, ["runbook", "hostedCronObserved"]) === true),
    check("retention-runbook-cleanup-retry-observed", booleanValue(artifact, ["runbook", "cleanupRetryObserved"]) === true),
    check("retention-runbook-dashboard-observed", booleanValue(artifact, ["runbook", "dashboardObserved"]) === true),
    check("retention-runbook-alert-observed", booleanValue(artifact, ["runbook", "alertObserved"]) === true),
    check("retention-runbook-path-safe", booleanValue(artifact, ["runbook", "noRawStoragePaths"]) === true),
  ];
}

const REQUIREMENTS: EvidenceRequirement[] = [
  {
    key: "hostedUploadOperations",
    label: "Hosted cleanup and scan dry-run routes",
    candidates: ["upload-hosted-operations-proof.json", "upload-hosted-operations-fail-closed-proof.json"],
    note: "Requires authenticated hosted dry-run proof for both cleanup and scan routes.",
    validate: validateHostedUploadOperations,
  },
  {
    key: "hostedUploadRuntime",
    label: "Hosted runtime body, concurrency, and storage-latency proof",
    candidates: ["upload-hosted-runtime-proof.json", "upload-hosted-runtime-fail-closed-proof.json"],
    note: "Requires authenticated hosted runtime proof with configured limit facts.",
    validate: validateHostedUploadRuntime,
  },
  {
    key: "liveScanner",
    label: "Live ClamD scanner service proof",
    candidates: ["upload-clamd-live-proof.json"],
    note: "Requires a real ClamD-compatible service to scan generated clean and EICAR fixtures.",
    validate: validateLiveScanner,
  },
  {
    key: "alertDelivery",
    label: "Observed hosted alert delivery",
    candidates: ["upload-alert-delivery-production-proof.json"],
    note: "Requires observed 2xx delivery of a sanitized hosted upload operations alert.",
    validate: validateAlertDelivery,
  },
  {
    key: "dashboardObservation",
    label: "Observed hosted operations dashboard",
    candidates: ["upload-dashboard-production-proof.json"],
    note: "Requires hosted dashboard observation of path-safe cleanup, scan, and backpressure metrics.",
    validate: validateDashboardObservation,
  },
  {
    key: "hostedBackpressure",
    label: "Observed hosted backpressure exercise",
    candidates: ["upload-backpressure-production-proof.json"],
    note: "Requires a hosted 429 backpressure exercise with retry-after and telemetry observation.",
    validate: validateHostedBackpressure,
  },
  {
    key: "retentionRunbook",
    label: "Production retention runbook exercise",
    candidates: ["upload-retention-runbook-production-proof.json"],
    note: "Requires hosted cron, cleanup retry, dashboard, and alert observations from the production runbook exercise.",
    validate: validateRetentionRunbook,
  },
];

function loadArtifact(evidenceDir: string, candidates: readonly string[], override?: string) {
  const paths = override ? [override] : candidates.map((candidate) => join(evidenceDir, candidate));
  for (const path of paths) {
    if (!existsSync(path)) continue;
    try {
      return {
        artifactPath: path,
        artifact: JSON.parse(readFileSync(path, "utf8")) as unknown,
        invalid: false,
      };
    } catch {
      return {
        artifactPath: path,
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
  requirement: EvidenceRequirement,
  evidenceDir: string,
  override?: string,
): EvidenceRequirementResult {
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

  const checks = requirement.validate(loaded.artifact);
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

function outputPathFromEnv(env: NodeJS.ProcessEnv = process.env) {
  return env.OUTPUT_FILE || env.UPLOAD_PRODUCTION_PROOF_EVIDENCE_OUTPUT || DEFAULT_OUTPUT;
}

function fileOverridesFromEnv(env: NodeJS.ProcessEnv = process.env): Partial<Record<EvidenceRequirementKey, string>> {
  return {
    hostedUploadOperations: env.UPLOAD_PRODUCTION_PROOF_HOSTED_OPERATIONS_FILE,
    hostedUploadRuntime: env.UPLOAD_PRODUCTION_PROOF_HOSTED_RUNTIME_FILE,
    liveScanner: env.UPLOAD_PRODUCTION_PROOF_LIVE_SCANNER_FILE,
    alertDelivery: env.UPLOAD_PRODUCTION_PROOF_ALERT_DELIVERY_FILE,
    dashboardObservation: env.UPLOAD_PRODUCTION_PROOF_DASHBOARD_FILE,
    hostedBackpressure: env.UPLOAD_PRODUCTION_PROOF_BACKPRESSURE_FILE,
    retentionRunbook: env.UPLOAD_PRODUCTION_PROOF_RETENTION_RUNBOOK_FILE,
  };
}

export function checkUploadProductionProofEvidence(
  options: CheckUploadProductionProofEvidenceOptions = {},
): UploadProductionProofEvidenceReport {
  const evidenceDir = resolve(options.evidenceDir || process.env.UPLOAD_PRODUCTION_PROOF_EVIDENCE_DIR || DEFAULT_EVIDENCE_DIR);
  const requirements = REQUIREMENTS.map((requirement) => evaluateRequirement(
    requirement,
    evidenceDir,
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
    mode: "upload-production-proof-evidence-check",
    proofBoundary: "fail-closed-production-evidence-bundle",
    evidenceDir,
    passed,
    productionProofReady: passed,
    totals,
    requirements,
    note: "This checker validates the required hosted/live production upload proof artifacts as a bundle. It does not collect evidence, deploy routes, read secrets, mutate provider state, or turn on production uploads. Any missing, invalid, fail-closed, local-only, or partial artifact keeps productionProofReady=false.",
  };
}

export function writeUploadProductionProofEvidenceReport(
  report: UploadProductionProofEvidenceReport,
  outputFile = outputPathFromEnv(),
) {
  const outputPath = resolve(outputFile);
  mkdirSync(dirname(outputPath), { recursive: true });
  writeFileSync(outputPath, `${JSON.stringify(report, null, 2)}\n`);
  return outputPath;
}

async function main() {
  const report = checkUploadProductionProofEvidence({
    evidenceDir: process.env.UPLOAD_PRODUCTION_PROOF_EVIDENCE_DIR,
    fileOverrides: fileOverridesFromEnv(),
  });
  const output = writeUploadProductionProofEvidenceReport(report);
  console.log(`Upload production proof evidence check ${report.passed ? "passed" : "failed"}; output=${output}`);
  if (!report.passed) process.exitCode = 1;
}

if (import.meta.main) {
  void main();
}
