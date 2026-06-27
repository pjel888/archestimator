#!/usr/bin/env bun

import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";

const DEFAULT_EVIDENCE_DIR = ".ai/03_plans/2026-06-26-File-Upload-Audit-And-Improvement/evidence";
const PROOF_FLAG = "ARCH_UPLOAD_PRODUCTION_OBSERVATIONS_PROOF";
const INPUT_FILE_VAR = "ARCH_UPLOAD_PRODUCTION_OBSERVATIONS_FILE";

type ProofCheck = {
  label: string;
  passed: boolean;
  proof?: string;
};

type InputFileState = {
  requested: boolean;
  loaded: boolean;
  invalid?: boolean;
  missing?: boolean;
  path?: string;
};

type DashboardObservation = {
  hostedObserved?: unknown;
  pathSafe?: unknown;
  backpressureMetricPresent?: unknown;
  cleanupScanMetricsPresent?: unknown;
};

type BackpressureObservation = {
  hosted?: unknown;
  rejectionStatus?: unknown;
  retryAfterPresent?: unknown;
  telemetryObserved?: unknown;
  pathSafe?: unknown;
};

type RetentionRunbookObservation = {
  hostedCronObserved?: unknown;
  cleanupRetryObserved?: unknown;
  dashboardObserved?: unknown;
  alertObserved?: unknown;
  noRawStoragePaths?: unknown;
};

type ProductionObservationInput = {
  dashboard?: DashboardObservation;
  backpressure?: BackpressureObservation;
  retentionRunbook?: RetentionRunbookObservation;
};

export type UploadDashboardProductionProofReport = {
  generatedAt: string;
  mode: "upload-dashboard-production-proof";
  proofBoundary: "hosted-dashboard-observation" | "hosted-dashboard-proof-skipped" | "hosted-dashboard-proof-failed";
  passed: boolean;
  skipped: boolean;
  dashboard: {
    hostedObserved: boolean;
    pathSafe: boolean;
    backpressureMetricPresent: boolean;
    cleanupScanMetricsPresent: boolean;
  };
  checks: ProofCheck[];
  failedChecks: string[];
  inputFile: InputFileState;
  note: string;
};

export type UploadBackpressureProductionProofReport = {
  generatedAt: string;
  mode: "upload-backpressure-production-proof";
  proofBoundary: "hosted-backpressure-observation" | "hosted-backpressure-proof-skipped" | "hosted-backpressure-proof-failed";
  passed: boolean;
  skipped: boolean;
  exercise: {
    hosted: boolean;
    rejectionStatus: number | null;
    retryAfterPresent: boolean;
    telemetryObserved: boolean;
    pathSafe: boolean;
  };
  checks: ProofCheck[];
  failedChecks: string[];
  inputFile: InputFileState;
  note: string;
};

export type UploadRetentionRunbookProductionProofReport = {
  generatedAt: string;
  mode: "upload-retention-runbook-production-proof";
  proofBoundary:
    | "production-retention-runbook-exercise"
    | "production-retention-runbook-proof-skipped"
    | "production-retention-runbook-proof-failed";
  passed: boolean;
  skipped: boolean;
  runbook: {
    hostedCronObserved: boolean;
    cleanupRetryObserved: boolean;
    dashboardObserved: boolean;
    alertObserved: boolean;
    noRawStoragePaths: boolean;
  };
  checks: ProofCheck[];
  failedChecks: string[];
  inputFile: InputFileState;
  note: string;
};

export type UploadProductionObservationReports = {
  dashboard: UploadDashboardProductionProofReport;
  backpressure: UploadBackpressureProductionProofReport;
  retentionRunbook: UploadRetentionRunbookProductionProofReport;
};

type BuildOptions = {
  generatedAt?: string;
  explicitProofOptIn?: boolean;
  input?: ProductionObservationInput | null;
  inputFile?: InputFileState;
};

function readEnv(name: string) {
  return process.env[name]?.trim() || "";
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function asInput(value: unknown): ProductionObservationInput | null {
  if (!isRecord(value)) return null;
  return {
    dashboard: isRecord(value.dashboard) ? value.dashboard : undefined,
    backpressure: isRecord(value.backpressure) ? value.backpressure : undefined,
    retentionRunbook: isRecord(value.retentionRunbook) ? value.retentionRunbook : undefined,
  };
}

function proofCheck(label: string, passed: boolean, proof?: string): ProofCheck {
  return { label, passed, proof };
}

function failedChecks(checks: readonly ProofCheck[]) {
  return checks.filter((check) => !check.passed).map((check) => check.label);
}

function pathSafeInput(input: ProductionObservationInput | null) {
  if (!input) return false;
  const stringValues: string[] = [];
  const collectStringValues = (value: unknown) => {
    if (typeof value === "string") {
      stringValues.push(value);
      return;
    }
    if (Array.isArray(value)) {
      value.forEach(collectStringValues);
      return;
    }
    if (isRecord(value)) {
      Object.values(value).forEach(collectStringValues);
    }
  };
  collectStringValues(input);
  const serialized = stringValues.join("\n");
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
    /https?:\/\//i,
  ];
  return deniedPatterns.every((pattern) => !pattern.test(serialized));
}

function loadObservationInputFromEnv(): { state: InputFileState; input: ProductionObservationInput | null } {
  const requestedPath = readEnv(INPUT_FILE_VAR);
  if (!requestedPath) {
    return { state: { requested: false, loaded: false }, input: null };
  }

  const inputPath = resolve(requestedPath);
  if (!existsSync(inputPath)) {
    return { state: { requested: true, loaded: false, missing: true, path: requestedPath }, input: null };
  }

  try {
    const parsed = JSON.parse(readFileSync(inputPath, "utf8")) as unknown;
    const input = asInput(parsed);
    if (!input) {
      return { state: { requested: true, loaded: false, invalid: true, path: requestedPath }, input: null };
    }
    return { state: { requested: true, loaded: true, path: requestedPath }, input };
  } catch {
    return { state: { requested: true, loaded: false, invalid: true, path: requestedPath }, input: null };
  }
}

function buildDashboardReport(options: Required<BuildOptions>, inputPathSafe: boolean): UploadDashboardProductionProofReport {
  const dashboard = {
    hostedObserved: options.input?.dashboard?.hostedObserved === true,
    pathSafe: inputPathSafe && options.input?.dashboard?.pathSafe === true,
    backpressureMetricPresent: options.input?.dashboard?.backpressureMetricPresent === true,
    cleanupScanMetricsPresent: options.input?.dashboard?.cleanupScanMetricsPresent === true,
  };
  const checks = [
    proofCheck("dashboard-explicit-proof-opt-in", options.explicitProofOptIn),
    proofCheck("dashboard-input-loaded", options.inputFile.loaded),
    proofCheck("dashboard-hosted-observed", dashboard.hostedObserved),
    proofCheck("dashboard-path-safe", dashboard.pathSafe),
    proofCheck("dashboard-backpressure-metric-present", dashboard.backpressureMetricPresent),
    proofCheck("dashboard-cleanup-scan-metrics-present", dashboard.cleanupScanMetricsPresent),
  ];
  const failures = failedChecks(checks);
  const passed = failures.length === 0;
  return {
    generatedAt: options.generatedAt,
    mode: "upload-dashboard-production-proof",
    proofBoundary: passed
      ? "hosted-dashboard-observation"
      : options.explicitProofOptIn
        ? "hosted-dashboard-proof-failed"
        : "hosted-dashboard-proof-skipped",
    passed,
    skipped: !options.explicitProofOptIn,
    dashboard,
    checks,
    failedChecks: failures,
    inputFile: options.inputFile,
    note: "This artifact records sanitized operator observation of the hosted upload operations dashboard. It must not include URLs, storage paths, filenames, provider paths, signed URLs, tokens, or customer/project data. It does not collect browser evidence, deploy code, query production, or prove alert/backpressure/runbook behavior by itself.",
  };
}

function buildBackpressureReport(options: Required<BuildOptions>, inputPathSafe: boolean): UploadBackpressureProductionProofReport {
  const exercise = {
    hosted: options.input?.backpressure?.hosted === true,
    rejectionStatus: typeof options.input?.backpressure?.rejectionStatus === "number"
      ? options.input.backpressure.rejectionStatus
      : null,
    retryAfterPresent: options.input?.backpressure?.retryAfterPresent === true,
    telemetryObserved: options.input?.backpressure?.telemetryObserved === true,
    pathSafe: inputPathSafe && options.input?.backpressure?.pathSafe === true,
  };
  const checks = [
    proofCheck("backpressure-explicit-proof-opt-in", options.explicitProofOptIn),
    proofCheck("backpressure-input-loaded", options.inputFile.loaded),
    proofCheck("backpressure-hosted-exercised", exercise.hosted),
    proofCheck("backpressure-429-observed", exercise.rejectionStatus === 429, String(exercise.rejectionStatus ?? "")),
    proofCheck("backpressure-retry-after-observed", exercise.retryAfterPresent),
    proofCheck("backpressure-telemetry-observed", exercise.telemetryObserved),
    proofCheck("backpressure-path-safe", exercise.pathSafe),
  ];
  const failures = failedChecks(checks);
  const passed = failures.length === 0;
  return {
    generatedAt: options.generatedAt,
    mode: "upload-backpressure-production-proof",
    proofBoundary: passed
      ? "hosted-backpressure-observation"
      : options.explicitProofOptIn
        ? "hosted-backpressure-proof-failed"
        : "hosted-backpressure-proof-skipped",
    passed,
    skipped: !options.explicitProofOptIn,
    exercise,
    checks,
    failedChecks: failures,
    inputFile: options.inputFile,
    note: "This artifact records sanitized operator observation of a hosted upload backpressure exercise. It must show a hosted 429 response, Retry-After, telemetry observation, and path-safe evidence. It does not create traffic, deploy code, query production, or prove dashboard/alert/runbook behavior by itself.",
  };
}

function buildRetentionRunbookReport(
  options: Required<BuildOptions>,
  inputPathSafe: boolean,
): UploadRetentionRunbookProductionProofReport {
  const runbook = {
    hostedCronObserved: options.input?.retentionRunbook?.hostedCronObserved === true,
    cleanupRetryObserved: options.input?.retentionRunbook?.cleanupRetryObserved === true,
    dashboardObserved: options.input?.retentionRunbook?.dashboardObserved === true,
    alertObserved: options.input?.retentionRunbook?.alertObserved === true,
    noRawStoragePaths: inputPathSafe && options.input?.retentionRunbook?.noRawStoragePaths === true,
  };
  const checks = [
    proofCheck("retention-runbook-explicit-proof-opt-in", options.explicitProofOptIn),
    proofCheck("retention-runbook-input-loaded", options.inputFile.loaded),
    proofCheck("retention-runbook-hosted-cron-observed", runbook.hostedCronObserved),
    proofCheck("retention-runbook-cleanup-retry-observed", runbook.cleanupRetryObserved),
    proofCheck("retention-runbook-dashboard-observed", runbook.dashboardObserved),
    proofCheck("retention-runbook-alert-observed", runbook.alertObserved),
    proofCheck("retention-runbook-path-safe", runbook.noRawStoragePaths),
  ];
  const failures = failedChecks(checks);
  const passed = failures.length === 0;
  return {
    generatedAt: options.generatedAt,
    mode: "upload-retention-runbook-production-proof",
    proofBoundary: passed
      ? "production-retention-runbook-exercise"
      : options.explicitProofOptIn
        ? "production-retention-runbook-proof-failed"
        : "production-retention-runbook-proof-skipped",
    passed,
    skipped: !options.explicitProofOptIn,
    runbook,
    checks,
    failedChecks: failures,
    inputFile: options.inputFile,
    note: "This artifact records sanitized operator observation of the production upload retention runbook. It must show hosted cron execution, cleanup retry behavior, dashboard observation, alert observation, and no raw storage paths. It does not run cron, mutate production, query production, or prove scanner/runtime behavior by itself.",
  };
}

export function buildUploadProductionObservationReports(options: BuildOptions = {}): UploadProductionObservationReports {
  const normalized = {
    generatedAt: options.generatedAt ?? new Date().toISOString(),
    explicitProofOptIn: options.explicitProofOptIn ?? readEnv(PROOF_FLAG) === "1",
    input: options.input ?? null,
    inputFile: options.inputFile ?? { requested: false, loaded: false },
  };
  const inputPathSafe = pathSafeInput(normalized.input);
  return {
    dashboard: buildDashboardReport(normalized, inputPathSafe),
    backpressure: buildBackpressureReport(normalized, inputPathSafe),
    retentionRunbook: buildRetentionRunbookReport(normalized, inputPathSafe),
  };
}

export function writeUploadProductionObservationReports(
  reports: UploadProductionObservationReports,
  evidenceDir = readEnv("UPLOAD_PRODUCTION_OBSERVATIONS_EVIDENCE_DIR") || DEFAULT_EVIDENCE_DIR,
) {
  const outputDir = resolve(evidenceDir);
  mkdirSync(outputDir, { recursive: true });
  const outputs = {
    dashboard: join(outputDir, "upload-dashboard-production-proof.json"),
    backpressure: join(outputDir, "upload-backpressure-production-proof.json"),
    retentionRunbook: join(outputDir, "upload-retention-runbook-production-proof.json"),
  };
  writeFileSync(outputs.dashboard, `${JSON.stringify(reports.dashboard, null, 2)}\n`);
  writeFileSync(outputs.backpressure, `${JSON.stringify(reports.backpressure, null, 2)}\n`);
  writeFileSync(outputs.retentionRunbook, `${JSON.stringify(reports.retentionRunbook, null, 2)}\n`);
  return outputs;
}

async function main() {
  const { state, input } = loadObservationInputFromEnv();
  const reports = buildUploadProductionObservationReports({ input, inputFile: state });
  const outputs = writeUploadProductionObservationReports(reports);
  const passed = reports.dashboard.passed && reports.backpressure.passed && reports.retentionRunbook.passed;
  console.log(`Upload production observation proofs ${passed ? "passed" : "failed"}; outputs=${Object.values(outputs).join(",")}`);
  if (!passed) process.exitCode = 1;
}

if (import.meta.main) {
  void main().catch((error) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  });
}
