#!/usr/bin/env bun

import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, relative, resolve, sep } from "node:path";

import {
  checkAlertScenarioReadiness,
  type AlertScenarioReadinessReport,
} from "./check-alert-scenario-readiness";
import {
  buildErrorHandlingContractReport,
  type ErrorHandlingContractReport,
} from "./check-error-handling-contract";
import {
  buildObservabilityProofEnvReport,
  type ObservabilityProofEnvReport,
} from "./check-observability-proof-env";
import {
  buildOperationalIncidentsReadinessReport,
  type OperationalIncidentsReadinessReport,
} from "./check-operational-incidents";
import {
  checkProductionObservabilityProof,
  type ProductionObservabilityProofReport,
} from "./check-production-observability-proof";
import {
  buildDebuggingSessionLedgerSnapshot,
  type DebuggingSessionLedgerSnapshot,
} from "./record-debugging-session";

type LocalLogSnapshot = {
  path: string;
  exists: boolean;
  parsedRecords: number;
  malformedLines: number;
  errorRecords: number;
  latestError: {
    recordId: string;
    timestamp: string | null;
    level: string | null;
    event: string | null;
    route: string | null;
    errorClass: string | null;
    errorCode: string | null;
    taintedFieldCount: number;
  } | null;
};

export type AgentDebuggingSnapshotReport = {
  generatedAt: string;
  mode: "agent-debugging-snapshot";
  proofBoundary: "local-agent-debugging-readiness";
  localLogs: LocalLogSnapshot;
  errorHandling: {
    passed: boolean;
    scannedFiles: number;
    violationCount: number;
    failedChecks: string[];
  };
  incidents: {
    ready: boolean;
    scope: string;
    staleIncidentCount: number;
    missing: string[];
  };
  hostedProofEnv: {
    hostedProofCollectionReady: boolean;
    operationalIncidentAlertsReady: boolean;
    missingRequiredEnv: string[];
    invalidRequiredEnv: string[];
    advisoryCount: number;
  };
  hostedProof: {
    productionObservabilityReady: boolean;
    evidenceDir: string;
    maxAgeHours: number;
    totals: ProductionObservabilityProofReport["totals"];
    failedRequirementKeys: ProductionObservabilityProofReport["failedRequirementKeys"];
  };
  alertScenarios: {
    catalogReady: boolean;
    productionAlertProducerReady: boolean;
    totals: AlertScenarioReadinessReport["totals"];
    launchBlockers: string[];
  };
  debuggingLedger: DebuggingSessionLedgerSnapshot;
  readiness: {
    localDebuggingReady: boolean;
    operationalIncidentsReady: boolean;
    alertScenarioCatalogReady: boolean;
    productionAlertScenarioProducerReady: boolean;
    productionEvidenceCollectionReady: boolean;
    productionIncidentAlertingReady: boolean;
    productionHostedProofReady: boolean;
  };
  recommendedNextSteps: string[];
  note: string;
};

type BuildOptions = {
  generatedAt?: string;
  logPath?: string;
  errorHandlingReport?: ErrorHandlingContractReport;
  incidentReport?: OperationalIncidentsReadinessReport;
  hostedProofEnvReport?: ObservabilityProofEnvReport;
  productionObservabilityReport?: ProductionObservabilityProofReport;
  alertScenarioReport?: AlertScenarioReadinessReport;
  debuggingLedger?: DebuggingSessionLedgerSnapshot;
  debuggingLedgerPath?: string;
};

const DEFAULT_LOG_PATH = "logs/dev.ndjson";

function displayPath(path: string) {
  const relativePath = relative(process.cwd(), resolve(path));
  const display = relativePath && !relativePath.startsWith("..") ? relativePath : path;
  return display.split(sep).join("/");
}

function safeDiagnosticPath(value: unknown) {
  if (typeof value !== "string") return null;
  if (!value.startsWith("/")) return null;
  if (value.includes("?") || value.includes("#")) return null;
  if (value.length > 160) return null;
  if (!/^[A-Za-z0-9/_:.-]+$/.test(value)) return null;
  return value;
}

function parseLogLines(content: string) {
  const records: unknown[] = [];
  let malformedLines = 0;
  for (const line of content.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    try {
      records.push(JSON.parse(trimmed) as unknown);
    } catch {
      malformedLines += 1;
    }
  }
  return { records, malformedLines };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function stringField(value: unknown) {
  return typeof value === "string" && value.trim() ? value : null;
}

function nestedString(value: unknown, path: readonly string[]) {
  let current = value;
  for (const part of path) {
    if (!isRecord(current)) return null;
    current = current[part];
  }
  return stringField(current);
}

function isErrorLevel(record: unknown) {
  const level = isRecord(record) ? stringField(record.level)?.toLowerCase() : null;
  return level === "error" || level === "fatal";
}

function latestErrorSummary(record: unknown): LocalLogSnapshot["latestError"] {
  if (!isRecord(record)) return null;
  const context = isRecord(record.context) ? record.context : {};
  const rawRoute = context.route ?? context.route_handler;
  const taintedFields = Array.isArray(record.tainted_fields) ? record.tainted_fields : [];
  return {
    recordId: stringField(record.record_id) ?? "unknown-record",
    timestamp: stringField(record.timestamp),
    level: stringField(record.level),
    event: stringField(record.event),
    route: safeDiagnosticPath(rawRoute),
    errorClass: nestedString(record, ["error", "class"]) ?? nestedString(record, ["error", "name"]),
    errorCode: nestedString(record, ["error", "code"]),
    taintedFieldCount: taintedFields.length,
  };
}

export function buildLocalLogSnapshot(logPath = process.env.ARCHESTIMATOR_DEV_LOG_PATH || DEFAULT_LOG_PATH): LocalLogSnapshot {
  const resolved = resolve(logPath);
  if (!existsSync(resolved)) {
    return {
      path: displayPath(resolved),
      exists: false,
      parsedRecords: 0,
      malformedLines: 0,
      errorRecords: 0,
      latestError: null,
    };
  }

  const { records, malformedLines } = parseLogLines(readFileSync(resolved, "utf8"));
  const errorRecords = records.filter(isErrorLevel);
  return {
    path: displayPath(resolved),
    exists: true,
    parsedRecords: records.length,
    malformedLines,
    errorRecords: errorRecords.length,
    latestError: errorRecords.length ? latestErrorSummary(errorRecords[errorRecords.length - 1]) : null,
  };
}

function nextSteps(report: AgentDebuggingSnapshotReport) {
  const steps: string[] = [];
  if (!report.localLogs.exists) {
    steps.push("Start the local dev server or run `bun run logs:emit-test` before relying on local log evidence.");
  } else if (report.localLogs.errorRecords > 0) {
    steps.push("Run `bun run logs:debug` or `bun run logs:explain <record_id>` for the latest local error record before changing code.");
  }
  if (!report.errorHandling.passed) {
    steps.push("Run `bun run validate:error-handling` and fix silent catch violations before claiming error-handling readiness.");
  }
  if (!report.incidents.ready) {
    steps.push("Run `bun run ops:check-incidents` and resolve missing/stale operational incident readiness items.");
  }
  if (!report.hostedProofEnv.hostedProofCollectionReady) {
    steps.push("Run `bun run ops:check-observability-env` with hosted proof env gates before collecting Workers Logs or alert-delivery proof.");
  }
  if (!report.hostedProof.productionObservabilityReady) {
    const failed = report.hostedProof.failedRequirementKeys.join(", ") || "unknown";
    steps.push(`Run \`bun run ops:observability-drill\` and collect missing hosted proof artifacts for: ${failed}.`);
  }
  if (!report.alertScenarios.catalogReady) {
    steps.push("Run `bun run ops:check-alert-scenarios -- --catalog-only` and fix missing alert owner/channel/latency/proof fields.");
  } else if (!report.alertScenarios.productionAlertProducerReady) {
    const blockers = report.alertScenarios.launchBlockers.join(", ") || "unknown";
    steps.push(`Run \`bun run ops:check-alert-scenarios\` and close alert scenario launch blockers: ${blockers}.`);
  }
  if (report.debuggingLedger.malformedLines > 0 || report.debuggingLedger.unsafeRecords > 0) {
    steps.push("Run `bun run ops:debug-ledger -- --check` and remove malformed or unsafe debugging ledger records before using recurrence evidence.");
  } else if (report.debuggingLedger.matchingLatestErrorCount > 0) {
    steps.push("Review `debuggingLedger.recentMatches` before changing code; this error fingerprint has prior redacted fix evidence.");
  } else if (report.debuggingLedger.latestErrorRecurrenceKey) {
    steps.push("After the root cause is proven, append a redacted `ops:debug-ledger` record using `debuggingLedger.latestErrorRecurrenceKey` so future agents recognize this fingerprint.");
  }
  return steps;
}

export function buildAgentDebuggingSnapshotReport(options: BuildOptions = {}): AgentDebuggingSnapshotReport {
  const localLogs = buildLocalLogSnapshot(options.logPath);
  const errorHandlingReport = options.errorHandlingReport ?? buildErrorHandlingContractReport();
  const incidentReport = options.incidentReport ?? buildOperationalIncidentsReadinessReport();
  const hostedProofEnvReport = options.hostedProofEnvReport ?? buildObservabilityProofEnvReport();
  const productionObservabilityReport = options.productionObservabilityReport ?? checkProductionObservabilityProof();
  const alertScenarioReport = options.alertScenarioReport ?? checkAlertScenarioReadiness();
  const debuggingLedger = options.debuggingLedger ?? buildDebuggingSessionLedgerSnapshot({
    ledgerPath: options.debuggingLedgerPath,
    latestError: localLogs.latestError
      ? {
          environment: "local",
          route: localLogs.latestError.route,
          event: localLogs.latestError.event,
          errorClass: localLogs.latestError.errorClass,
          errorCode: localLogs.latestError.errorCode,
        }
      : null,
  });
  const localDebuggingReady = localLogs.exists && localLogs.malformedLines === 0 && errorHandlingReport.passed;
  const report: AgentDebuggingSnapshotReport = {
    generatedAt: options.generatedAt ?? new Date().toISOString(),
    mode: "agent-debugging-snapshot",
    proofBoundary: "local-agent-debugging-readiness",
    localLogs,
    errorHandling: {
      passed: errorHandlingReport.passed,
      scannedFiles: errorHandlingReport.scannedFiles,
      violationCount: errorHandlingReport.violations.length,
      failedChecks: errorHandlingReport.failedChecks,
    },
    incidents: {
      ready: incidentReport.readiness.operationalIncidentsReady,
      scope: incidentReport.source.scope,
      staleIncidentCount: incidentReport.staleIncidents.length,
      missing: incidentReport.missing,
    },
    hostedProofEnv: {
      hostedProofCollectionReady: hostedProofEnvReport.hostedProofCollectionReady,
      operationalIncidentAlertsReady: hostedProofEnvReport.operationalIncidentAlertsReady,
      missingRequiredEnv: hostedProofEnvReport.missingRequiredEnv,
      invalidRequiredEnv: hostedProofEnvReport.invalidRequiredEnv,
      advisoryCount: hostedProofEnvReport.advisory.length,
    },
    hostedProof: {
      productionObservabilityReady: productionObservabilityReport.productionObservabilityReady,
      evidenceDir: productionObservabilityReport.evidenceDir,
      maxAgeHours: productionObservabilityReport.maxAgeHours,
      totals: productionObservabilityReport.totals,
      failedRequirementKeys: productionObservabilityReport.failedRequirementKeys,
    },
    alertScenarios: {
      catalogReady: alertScenarioReport.catalogReady,
      productionAlertProducerReady: alertScenarioReport.productionAlertProducerReady,
      totals: alertScenarioReport.totals,
      launchBlockers: alertScenarioReport.launchBlockers,
    },
    debuggingLedger,
    readiness: {
      localDebuggingReady,
      operationalIncidentsReady: incidentReport.readiness.operationalIncidentsReady,
      alertScenarioCatalogReady: alertScenarioReport.catalogReady,
      productionAlertScenarioProducerReady: alertScenarioReport.productionAlertProducerReady,
      productionEvidenceCollectionReady: hostedProofEnvReport.hostedProofCollectionReady,
      productionIncidentAlertingReady: hostedProofEnvReport.operationalIncidentAlertsReady,
      productionHostedProofReady: productionObservabilityReport.productionObservabilityReady,
    },
    recommendedNextSteps: [],
    note: "Read-only agent debugging snapshot. It summarizes local log shape, static error-handling hygiene, D1 incident readiness, alert scenario readiness, hosted proof env readiness, hosted proof artifact readiness, and prior redacted debugging ledger matches without printing raw log records, stack traces, request bodies, webhook URLs, or token values.",
  };
  return {
    ...report,
    recommendedNextSteps: nextSteps(report),
  };
}

function readOutputFile(env: Record<string, string | undefined>) {
  return env.AGENT_DEBUG_SNAPSHOT_OUTPUT_FILE?.trim() || env.OUTPUT_FILE?.trim() || "";
}

function envEnabled(env: Record<string, string | undefined>, name: string) {
  const value = env[name]?.trim().toLowerCase();
  return value === "1" || value === "true";
}

export function writeAgentDebuggingSnapshotReport(report: AgentDebuggingSnapshotReport, outputFile: string) {
  const resolved = resolve(outputFile);
  mkdirSync(dirname(resolved), { recursive: true });
  writeFileSync(resolved, `${JSON.stringify(report, null, 2)}\n`, "utf8");
}

function main() {
  const report = buildAgentDebuggingSnapshotReport();
  const outputFile = readOutputFile(process.env);
  if (outputFile) writeAgentDebuggingSnapshotReport(report, outputFile);
  console.log(JSON.stringify(report, null, 2));
  if (envEnabled(process.env, "AGENT_DEBUG_SNAPSHOT_STRICT") && !report.readiness.localDebuggingReady) {
    process.exit(1);
  }
  if (
    envEnabled(process.env, "AGENT_DEBUG_SNAPSHOT_REQUIRE_PRODUCTION")
    && (
      !report.readiness.productionEvidenceCollectionReady
      || !report.readiness.productionIncidentAlertingReady
      || !report.readiness.productionAlertScenarioProducerReady
      || !report.readiness.productionHostedProofReady
    )
  ) {
    process.exit(1);
  }
}

if (import.meta.main) {
  main();
}
