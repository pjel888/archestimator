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
  type DebuggingSessionLedgerMatch,
  type DebuggingSessionLedgerMatchSummary,
  type DebuggingSessionLedgerSnapshot,
} from "./record-debugging-session";
import {
  buildObservabilityProofDrillReport,
  readObservabilityProofRouteSmokeArtifact,
  type ObservabilityProofDrillReport,
} from "./run-observability-proof-drill";
import {
  checkSupportMonitoringReadiness,
  type SupportMonitoringReadinessResult,
} from "./check-support-monitoring-readiness";
import type { ObservabilityProofRouteSmokeReport } from "./check-observability-proof-route";

const DEFAULT_LOCAL_ERROR_STALE_AFTER_HOURS = 24;

type LocalLogErrorSummary = {
  recordId: string;
  timestamp: string | null;
  ageMinutes: number | null;
  freshness: "fresh" | "stale" | "unknown";
  origin: "runtime" | "test" | "unknown";
  originEvidence: string[];
  level: string | null;
  event: string | null;
  route: string | null;
  errorClass: string | null;
  errorCode: string | null;
  taintedFieldCount: number;
};

type LocalLogSnapshot = {
  path: string;
  exists: boolean;
  parsedRecords: number;
  malformedLines: number;
  errorRecords: number;
  latestErrorStaleAfterHours: number;
  latestError: LocalLogErrorSummary | null;
  latestRuntimeError: LocalLogErrorSummary | null;
};

type HostedProofRequirementDiagnostic = Pick<
  ProductionObservabilityProofReport["requirements"][number],
  "key" | "status" | "artifact" | "failedChecks" | "nextAction"
>;

type SnapshotReadinessKey =
  | "localDebuggingReady"
  | "operationalIncidentsReady"
  | "alertScenarioCatalogReady"
  | "productionAlertScenarioProducerReady"
  | "productionHostedProofRouteReady"
  | "productionEvidenceCollectionReady"
  | "productionIncidentAlertingReady"
  | "productionHostedProofReady"
  | "supportMonitoringReady";

export type AgentDebuggingSnapshotGateFailure = {
  key: string;
  scope: "local" | "production";
  readinessKey: SnapshotReadinessKey;
  command: string;
  nextAction: string;
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
  hostedProofRoute: ObservabilityProofDrillReport["hostedProofRoute"];
  hostedProof: {
    productionObservabilityReady: boolean;
    evidenceDir: string;
    maxAgeHours: number;
    totals: ProductionObservabilityProofReport["totals"];
    failedRequirementKeys: ProductionObservabilityProofReport["failedRequirementKeys"];
    requirements: HostedProofRequirementDiagnostic[];
  };
  alertScenarios: {
    catalogReady: boolean;
    productionAlertProducerReady: boolean;
    totals: AlertScenarioReadinessReport["totals"];
    launchBlockers: string[];
  };
  observabilityRunbook: ObservabilityProofDrillReport["executionPlan"];
  supportMonitoring: {
    ready: boolean;
    proofFlags: SupportMonitoringReadinessResult["proofFlags"];
    summary: SupportMonitoringReadinessResult["summary"];
    requirements: SupportMonitoringReadinessResult["requirements"];
    ownerLabels: {
      supportOwnerPresent: boolean;
      alertOwnerPresent: boolean;
      first24HourReviewOwnerPresent: boolean;
      first72HourReviewOwnerPresent: boolean;
    };
    incidentStatus: SupportMonitoringReadinessResult["incidentStatus"];
    observabilityProof: SupportMonitoringReadinessResult["observabilityProof"];
    missing: string[];
  };
  debuggingLedger: DebuggingSessionLedgerSnapshot & {
    latestRuntimeErrorRecurrenceKey: string | null;
    matchingLatestRuntimeErrorCount: number;
    latestRuntimeErrorMatchSummary: DebuggingSessionLedgerMatchSummary;
    recentRuntimeMatches: DebuggingSessionLedgerMatch[];
  };
  readiness: {
    localDebuggingReady: boolean;
    operationalIncidentsReady: boolean;
    alertScenarioCatalogReady: boolean;
    productionAlertScenarioProducerReady: boolean;
    productionHostedProofRouteReady: boolean;
    productionEvidenceCollectionReady: boolean;
    productionIncidentAlertingReady: boolean;
    productionHostedProofReady: boolean;
    supportMonitoringReady: boolean;
  };
  readinessGates: {
    local: {
      ready: boolean;
      failures: AgentDebuggingSnapshotGateFailure[];
    };
    production: {
      ready: boolean;
      failures: AgentDebuggingSnapshotGateFailure[];
    };
  };
  recommendedNextSteps: string[];
  note: string;
};

type BuildOptions = {
  generatedAt?: string;
  logPath?: string;
  localErrorStaleAfterHours?: number;
  errorHandlingReport?: ErrorHandlingContractReport;
  incidentReport?: OperationalIncidentsReadinessReport;
  hostedProofEnvReport?: ObservabilityProofEnvReport;
  productionObservabilityReport?: ProductionObservabilityProofReport;
  hostedProofRouteReport?: ObservabilityProofRouteSmokeReport | null;
  hostedProofRouteSource?: string | null;
  alertScenarioReport?: AlertScenarioReadinessReport;
  supportMonitoringReport?: SupportMonitoringReadinessResult;
  debuggingLedger?: DebuggingSessionLedgerSnapshot;
  debuggingLedgerPath?: string;
};

const DEFAULT_LOG_PATH = "logs/dev.ndjson";

function displayPath(path: string) {
  const relativePath = relative(process.cwd(), resolve(path));
  const display =
    relativePath && !relativePath.startsWith("..") ? relativePath : path;
  return display.split(sep).join("/");
}

function safeDiagnosticPath(value: unknown) {
  if (typeof value !== "string") return null;
  if (!value.startsWith("/")) return null;
  if (value.includes("?") || value.includes("#")) return null;
  if (value.length > 160) return null;
  if (!/^[A-Za-z0-9/_:.[\]-]+$/.test(value)) return null;
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

function contextRoute(record: unknown) {
  if (!isRecord(record)) return null;
  const context = isRecord(record.context) ? record.context : {};
  return safeDiagnosticPath(context.route ?? context.route_handler);
}

function recordTimestampMs(record: unknown) {
  if (!isRecord(record)) return null;
  const timestamp = stringField(record.timestamp);
  if (!timestamp) return null;
  const parsed = Date.parse(timestamp);
  return Number.isFinite(parsed) ? parsed : null;
}

function isErrorLevel(record: unknown) {
  const level = isRecord(record)
    ? stringField(record.level)?.toLowerCase()
    : null;
  return level === "error" || level === "fatal";
}

function collectStackLines(value: unknown): string[] {
  const lines: string[] = [];
  if (!isRecord(value)) return lines;
  const error = isRecord(value.error) ? value.error : null;
  const stack = error?.stack;
  if (typeof stack === "string") {
    lines.push(...stack.split(/\r?\n/));
  } else if (Array.isArray(stack)) {
    lines.push(
      ...stack.filter((line): line is string => typeof line === "string"),
    );
  }

  const cause = isRecord(error?.cause) ? error.cause : null;
  const causeStack = cause?.stack;
  if (typeof causeStack === "string") {
    lines.push(...causeStack.split(/\r?\n/));
  } else if (Array.isArray(causeStack)) {
    lines.push(
      ...causeStack.filter((line): line is string => typeof line === "string"),
    );
  }

  return lines;
}

function testOriginEvidence(record: unknown) {
  const evidence = new Set<string>();
  for (const line of collectStackLines(record)) {
    const normalized = line.split(process.cwd()).join("");
    const testMatch = normalized.match(
      /tests\/[A-Za-z0-9_./@[\]-]+\.(?:test|spec)\.[A-Za-z0-9]+/,
    );
    if (testMatch) evidence.add(testMatch[0]);
    if (normalized.includes("node_modules/@vitest"))
      evidence.add("node_modules/@vitest");
  }
  return Array.from(evidence).slice(0, 4);
}

function nearbyTestOriginEvidence(
  entries: Array<{ record: unknown; index: number }>,
  latest: { record: unknown; index: number },
) {
  const evidence = new Set(testOriginEvidence(latest.record));
  if (evidence.size > 0) return Array.from(evidence);

  const latestRoute = contextRoute(latest.record);
  const latestTimestampMs = recordTimestampMs(latest.record);
  const nearbyEntries = entries
    .filter((entry) => entry.index !== latest.index)
    .sort(
      (left, right) =>
        Math.abs(left.index - latest.index) -
        Math.abs(right.index - latest.index),
    );

  for (const entry of nearbyEntries) {
    const candidateRoute = contextRoute(entry.record);
    if (latestRoute && candidateRoute && latestRoute !== candidateRoute)
      continue;

    const candidateTimestampMs = recordTimestampMs(entry.record);
    if (
      latestTimestampMs !== null &&
      candidateTimestampMs !== null &&
      Math.abs(latestTimestampMs - candidateTimestampMs) > 2_000
    ) {
      continue;
    }

    for (const item of testOriginEvidence(entry.record)) evidence.add(item);
  }

  return Array.from(evidence).slice(0, 4);
}

function latestErrorFreshness(
  timestamp: string | null,
  now: Date,
  staleAfterHours: number,
): Pick<LocalLogErrorSummary, "ageMinutes" | "freshness"> {
  const timestampMs = timestamp ? Date.parse(timestamp) : NaN;
  if (!Number.isFinite(timestampMs)) {
    return { ageMinutes: null, freshness: "unknown" };
  }

  const ageMinutes = Math.floor((now.getTime() - timestampMs) / 60_000);
  if (ageMinutes < 0) {
    return { ageMinutes, freshness: "unknown" };
  }

  return {
    ageMinutes,
    freshness: ageMinutes > staleAfterHours * 60 ? "stale" : "fresh",
  };
}

function latestErrorSummary(
  record: unknown,
  now: Date,
  staleAfterHours: number,
  originEvidence: string[],
): LocalLogErrorSummary | null {
  if (!isRecord(record)) return null;
  const context = isRecord(record.context) ? record.context : {};
  const rawRoute = context.route ?? context.route_handler;
  const taintedFields = Array.isArray(record.tainted_fields)
    ? record.tainted_fields
    : [];
  const timestamp = stringField(record.timestamp);
  const freshness = latestErrorFreshness(timestamp, now, staleAfterHours);
  return {
    recordId: stringField(record.record_id) ?? "unknown-record",
    timestamp,
    ageMinutes: freshness.ageMinutes,
    freshness: freshness.freshness,
    origin: originEvidence.length ? "test" : "runtime",
    originEvidence,
    level: stringField(record.level),
    event: stringField(record.event),
    route: safeDiagnosticPath(rawRoute),
    errorClass:
      nestedString(record, ["error", "class"]) ??
      nestedString(record, ["error", "name"]),
    errorCode: nestedString(record, ["error", "code"]),
    taintedFieldCount: taintedFields.length,
  };
}

function debuggingLedgerMatchNextStep(report: AgentDebuggingSnapshotReport) {
  const latestMatch = report.debuggingLedger.latestErrorMatchSummary.latest;
  if (!latestMatch) {
    return "Review `debuggingLedger.recentMatches` before changing code; this error fingerprint has prior redacted fix evidence.";
  }

  if (latestMatch.status === "fixed" || latestMatch.status === "mitigated") {
    return `Review \`debuggingLedger.latestErrorMatchSummary.latest\` before changing code; this fingerprint was previously ${latestMatch.status}, so rerun its recorded validation before starting a new fix branch.`;
  }

  if (
    latestMatch.status === "observed" ||
    latestMatch.status === "investigating"
  ) {
    return `Resume \`debuggingLedger.latestErrorMatchSummary.latest\` before starting a new root-cause branch; this fingerprint already has prior ${latestMatch.status} evidence.`;
  }

  return "Review `debuggingLedger.latestErrorMatchSummary.latest` before changing code; the latest prior decision marked this fingerprint `wontfix`.";
}

function runtimeDebuggingLedgerMatchNextStep(
  report: AgentDebuggingSnapshotReport,
) {
  const latestMatch =
    report.debuggingLedger.latestRuntimeErrorMatchSummary.latest;
  if (!latestMatch) {
    return "Review `debuggingLedger.recentRuntimeMatches` before changing code; the runtime candidate has prior redacted evidence.";
  }

  if (latestMatch.status === "fixed" || latestMatch.status === "mitigated") {
    return `Review \`debuggingLedger.latestRuntimeErrorMatchSummary.latest\` before chasing \`localLogs.latestRuntimeError\`; this runtime fingerprint was previously ${latestMatch.status}, so rerun its recorded validation before starting a new fix branch.`;
  }

  if (
    latestMatch.status === "observed" ||
    latestMatch.status === "investigating"
  ) {
    return `Resume \`debuggingLedger.latestRuntimeErrorMatchSummary.latest\` before chasing \`localLogs.latestRuntimeError\`; this runtime fingerprint already has prior ${latestMatch.status} evidence.`;
  }

  return "Review `debuggingLedger.latestRuntimeErrorMatchSummary.latest` before chasing `localLogs.latestRuntimeError`; the latest prior decision marked this runtime fingerprint `wontfix`.";
}

const EMPTY_LEDGER_MATCH_SUMMARY: DebuggingSessionLedgerMatchSummary = {
  hasMatches: false,
  total: 0,
  statusCounts: {},
  latest: null,
};

function augmentDebuggingLedgerWithRuntimeCandidate(
  latestErrorLedger: DebuggingSessionLedgerSnapshot,
  runtimeLedger: DebuggingSessionLedgerSnapshot | null,
) {
  return {
    ...latestErrorLedger,
    latestRuntimeErrorRecurrenceKey:
      runtimeLedger?.latestErrorRecurrenceKey ?? null,
    matchingLatestRuntimeErrorCount:
      runtimeLedger?.matchingLatestErrorCount ?? 0,
    latestRuntimeErrorMatchSummary:
      runtimeLedger?.latestErrorMatchSummary ?? EMPTY_LEDGER_MATCH_SUMMARY,
    recentRuntimeMatches: runtimeLedger?.recentMatches ?? [],
  };
}

function readinessFailure(
  failure: AgentDebuggingSnapshotGateFailure,
  passed: boolean,
) {
  return passed ? [] : [failure];
}

function buildReadinessGates(
  report: AgentDebuggingSnapshotReport,
): AgentDebuggingSnapshotReport["readinessGates"] {
  const localFailures = [
    ...readinessFailure(
      {
        key: "localLogsMissing",
        scope: "local",
        readinessKey: "localDebuggingReady",
        command: "bun run logs:emit-test",
        nextAction:
          "Start the dev server or emit a sanitized test log so local debugging has a readable NDJSON source.",
      },
      report.localLogs.exists,
    ),
    ...readinessFailure(
      {
        key: "localLogsMalformed",
        scope: "local",
        readinessKey: "localDebuggingReady",
        command: "bun run logs:debug",
        nextAction:
          "Fix or rotate malformed local NDJSON log lines before using local log evidence.",
      },
      report.localLogs.malformedLines === 0,
    ),
    ...readinessFailure(
      {
        key: "errorHandlingStaticGate",
        scope: "local",
        readinessKey: "localDebuggingReady",
        command: "bun run validate:error-handling",
        nextAction:
          "Fix silent catch or raw runtime logging violations before claiming local debugging readiness.",
      },
      report.errorHandling.passed,
    ),
  ];

  const productionFailures = [
    ...readinessFailure(
      {
        key: "operationalIncidents",
        scope: "production",
        readinessKey: "operationalIncidentsReady",
        command: "bun run ops:check-incidents",
        nextAction:
          "Resolve missing or stale operational incident readiness items before launch evidence can pass.",
      },
      report.readiness.operationalIncidentsReady,
    ),
    ...readinessFailure(
      {
        key: "alertScenarioCatalog",
        scope: "production",
        readinessKey: "alertScenarioCatalogReady",
        command: "bun run ops:check-alert-scenarios -- --catalog-only",
        nextAction:
          "Complete the alert owner, channel, latency, evaluator, proof command, and artifact catalog.",
      },
      report.readiness.alertScenarioCatalogReady,
    ),
    ...readinessFailure(
      {
        key: "productionAlertProducer",
        scope: "production",
        readinessKey: "productionAlertScenarioProducerReady",
        command: "bun run ops:check-alert-scenarios",
        nextAction:
          "Implement missing provider-backed alert proof producers before launch.",
      },
      report.readiness.productionAlertScenarioProducerReady,
    ),
    ...readinessFailure(
      {
        key: "hostedProofEnv",
        scope: "production",
        readinessKey: "productionEvidenceCollectionReady",
        command: "bun run ops:check-observability-env",
        nextAction:
          "Configure hosted Workers Logs and alert-delivery proof env gates without exposing secret values.",
      },
      report.readiness.productionEvidenceCollectionReady,
    ),
    ...readinessFailure(
      {
        key: "hostedProofRoute",
        scope: "production",
        readinessKey: "productionHostedProofRouteReady",
        command: "bun run ops:check-observability-route",
        nextAction:
          report.hostedProofRoute.nextAction ??
          "Run the hosted proof-route smoke and resolve route deployment/auth blockers before Workers Logs proof collection.",
      },
      report.readiness.productionHostedProofRouteReady,
    ),
    ...readinessFailure(
      {
        key: "operationalIncidentAlerting",
        scope: "production",
        readinessKey: "productionIncidentAlertingReady",
        command: "bun run ops:check-observability-env",
        nextAction:
          "Configure operational incident alert env gates before claiming production incident alerting readiness.",
      },
      report.readiness.productionIncidentAlertingReady,
    ),
    ...readinessFailure(
      {
        key: "hostedProofArtifacts",
        scope: "production",
        readinessKey: "productionHostedProofReady",
        command: "bun run ops:observability-drill",
        nextAction:
          "Collect redacted hosted Workers Logs and alert-delivery proof artifacts, then rerun readiness checks.",
      },
      report.readiness.productionHostedProofReady,
    ),
    ...readinessFailure(
      {
        key: "supportMonitoring",
        scope: "production",
        readinessKey: "supportMonitoringReady",
        command: "bun run launch:check-support-monitoring",
        nextAction:
          "Provide support-monitoring operator confirmations, owner labels, incident status, and observability proof artifacts.",
      },
      report.readiness.supportMonitoringReady,
    ),
  ];

  return {
    local: {
      ready: localFailures.length === 0,
      failures: localFailures,
    },
    production: {
      ready: productionFailures.length === 0,
      failures: productionFailures,
    },
  };
}

export function buildLocalLogSnapshot(
  logPath = process.env.ARCHESTIMATOR_DEV_LOG_PATH || DEFAULT_LOG_PATH,
  options: {
    now?: Date;
    staleAfterHours?: number;
  } = {},
): LocalLogSnapshot {
  const resolved = resolve(logPath);
  const staleAfterHours =
    options.staleAfterHours ?? DEFAULT_LOCAL_ERROR_STALE_AFTER_HOURS;
  if (!existsSync(resolved)) {
    return {
      path: displayPath(resolved),
      exists: false,
      parsedRecords: 0,
      malformedLines: 0,
      errorRecords: 0,
      latestErrorStaleAfterHours: staleAfterHours,
      latestError: null,
      latestRuntimeError: null,
    };
  }

  const { records, malformedLines } = parseLogLines(
    readFileSync(resolved, "utf8"),
  );
  const errorEntries = records
    .map((record, index) => ({ record, index }))
    .filter((entry) => isErrorLevel(entry.record));
  const now = options.now ?? new Date();
  const errorSummaries = errorEntries
    .map((entry) =>
      latestErrorSummary(
        entry.record,
        now,
        staleAfterHours,
        nearbyTestOriginEvidence(errorEntries, entry),
      ),
    )
    .filter((summary): summary is LocalLogErrorSummary => Boolean(summary));
  const latestError = errorSummaries[errorSummaries.length - 1] ?? null;
  const latestRuntimeError =
    errorSummaries.findLast((summary) => summary.origin === "runtime") ?? null;
  return {
    path: displayPath(resolved),
    exists: true,
    parsedRecords: records.length,
    malformedLines,
    errorRecords: errorEntries.length,
    latestErrorStaleAfterHours: staleAfterHours,
    latestError,
    latestRuntimeError,
  };
}

function nextSteps(report: AgentDebuggingSnapshotReport) {
  const steps: string[] = [];
  if (!report.localLogs.exists) {
    steps.push(
      "Start the local dev server or run `bun run logs:emit-test` before relying on local log evidence.",
    );
  } else if (report.localLogs.latestError?.origin === "test") {
    steps.push(
      "Latest local error appears to come from a test run; rerun the relevant test with a temp `ARCHESTIMATOR_DEV_LOG_PATH` or reproduce in dev before treating it as app-runtime evidence.",
    );
    if (report.localLogs.latestRuntimeError?.freshness === "stale") {
      steps.push(
        `Latest runtime-origin local error behind the test record is older than ${report.localLogs.latestErrorStaleAfterHours}h; reproduce or observe a fresh runtime failure before treating it as current root-cause evidence.`,
      );
    } else if (report.localLogs.latestRuntimeError) {
      steps.push(
        "Review `localLogs.latestRuntimeError` or run `bun run logs:explain <record_id>` for the newest app-runtime error behind the test-origin log noise.",
      );
    }
    if (report.debuggingLedger.matchingLatestRuntimeErrorCount > 0) {
      steps.push(runtimeDebuggingLedgerMatchNextStep(report));
    } else if (report.debuggingLedger.latestRuntimeErrorRecurrenceKey) {
      steps.push(
        "If `localLogs.latestRuntimeError` becomes the active investigation, append the eventual redacted `ops:debug-ledger` record using `debuggingLedger.latestRuntimeErrorRecurrenceKey`.",
      );
    }
  } else if (report.localLogs.latestError?.freshness === "stale") {
    steps.push(
      `Latest local error is older than ${report.localLogs.latestErrorStaleAfterHours}h; reproduce or observe a fresh failure before treating it as current root-cause evidence.`,
    );
  } else if (report.localLogs.errorRecords > 0) {
    steps.push(
      "Run `bun run logs:debug` or `bun run logs:explain <record_id>` for the latest local error record before changing code.",
    );
  }
  if (!report.errorHandling.passed) {
    steps.push(
      "Run `bun run validate:error-handling` and fix silent catch violations before claiming error-handling readiness.",
    );
  }
  if (!report.incidents.ready) {
    steps.push(
      "Run `bun run ops:check-incidents` and resolve missing/stale operational incident readiness items.",
    );
  }
  if (!report.hostedProofEnv.hostedProofCollectionReady) {
    steps.push(
      "Run `bun run ops:check-observability-env` with hosted proof env gates before collecting Workers Logs or alert-delivery proof.",
    );
  }
  if (!report.hostedProofRoute.readyForWorkersLogsProof) {
    if (report.hostedProofRoute.present) {
      steps.push(
        `Hosted proof route smoke is ${report.hostedProofRoute.routeStatus ?? "unknown"}; ${report.hostedProofRoute.nextAction ?? "resolve the route smoke blocker before Workers Logs proof collection."}`,
      );
    } else {
      steps.push(
        "Run `bun run ops:check-observability-route` before collecting Workers Logs proof so agents know whether production serves the protected marker route.",
      );
    }
  }
  if (!report.hostedProof.productionObservabilityReady) {
    const failed =
      report.hostedProof.failedRequirementKeys.join(", ") || "unknown";
    steps.push(
      `Run \`bun run ops:observability-drill\` and collect missing hosted proof artifacts for: ${failed}.`,
    );
    if (report.observabilityRunbook.summary.blocked > 0) {
      steps.push(
        "Review `observabilityRunbook.blocked` before collecting hosted proof; blocked env/artifact setup must be resolved before Cloudflare tail or alert probes.",
      );
    } else if (report.observabilityRunbook.summary.gatedExternalReady > 0) {
      steps.push(
        "Review `observabilityRunbook.gatedExternalReady` before running hosted proof commands; those steps intentionally query Cloudflare Logs or send synthetic alerts.",
      );
    }
    const hasNonMissingFailure = report.hostedProof.requirements.some(
      (requirement) =>
        requirement.status !== "passed" &&
        requirement.failedChecks.some((check) => !check.startsWith("missing:")),
    );
    if (hasNonMissingFailure) {
      steps.push(
        "Review `hostedProof.requirements` failedChecks for stale, wrong-producer, unredacted, or invalid hosted proof artifacts before recollecting evidence.",
      );
    }
  }
  if (!report.alertScenarios.catalogReady) {
    steps.push(
      "Run `bun run ops:check-alert-scenarios -- --catalog-only` and fix missing alert owner/channel/latency/proof fields.",
    );
  } else if (!report.alertScenarios.productionAlertProducerReady) {
    const blockers =
      report.alertScenarios.launchBlockers.join(", ") || "unknown";
    steps.push(
      `Run \`bun run ops:check-alert-scenarios\` and close alert scenario launch blockers: ${blockers}.`,
    );
  }
  if (!report.supportMonitoring.ready) {
    const missingRequirementKeys = report.supportMonitoring.requirements
      .filter((requirement) => requirement.status !== "passed")
      .map((requirement) => requirement.key);
    const missing =
      missingRequirementKeys.slice(0, 8).join(", ") ||
      report.supportMonitoring.missing.slice(0, 8).join(", ") ||
      "unknown";
    const suffix = missingRequirementKeys.length > 8 ? ", and more" : "";
    steps.push(
      `Run \`bun run launch:check-support-monitoring\` with incident and observability proof artifacts plus operator confirmations; missing requirements: ${missing}${suffix}.`,
    );
  }
  if (
    report.debuggingLedger.malformedLines > 0 ||
    report.debuggingLedger.unsafeRecords > 0
  ) {
    steps.push(
      "Run `bun run ops:debug-ledger -- --check` and remove malformed or unsafe debugging ledger records before using recurrence evidence.",
    );
  } else if (report.debuggingLedger.matchingLatestErrorCount > 0) {
    steps.push(debuggingLedgerMatchNextStep(report));
  } else if (report.debuggingLedger.latestErrorRecurrenceKey) {
    if (report.localLogs.latestError?.origin === "test") {
      steps.push(
        "If the test-origin error reproduces outside synthetic log evidence, append a redacted `ops:debug-ledger` record using `debuggingLedger.latestErrorRecurrenceKey`.",
      );
    } else {
      steps.push(
        "After the root cause is proven, append a redacted `ops:debug-ledger` record using `debuggingLedger.latestErrorRecurrenceKey` so future agents recognize this fingerprint.",
      );
    }
  }
  return steps;
}

function hostedProofRequirementDiagnostics(
  report: ProductionObservabilityProofReport,
): HostedProofRequirementDiagnostic[] {
  return report.requirements.map((requirement) => ({
    key: requirement.key,
    status: requirement.status,
    artifact: requirement.artifact,
    failedChecks: requirement.failedChecks,
    nextAction: requirement.nextAction,
  }));
}

export function buildAgentDebuggingSnapshotReport(
  options: BuildOptions = {},
): AgentDebuggingSnapshotReport {
  const generatedAt = options.generatedAt ?? new Date().toISOString();
  const generatedAtDate = new Date(generatedAt);
  const localLogs = buildLocalLogSnapshot(options.logPath, {
    now: Number.isFinite(generatedAtDate.getTime())
      ? generatedAtDate
      : new Date(),
    staleAfterHours: options.localErrorStaleAfterHours,
  });
  const errorHandlingReport =
    options.errorHandlingReport ?? buildErrorHandlingContractReport();
  const incidentReport =
    options.incidentReport ?? buildOperationalIncidentsReadinessReport();
  const hostedProofEnvReport =
    options.hostedProofEnvReport ?? buildObservabilityProofEnvReport();
  const productionObservabilityReport =
    options.productionObservabilityReport ??
    checkProductionObservabilityProof();
  const hostedProofRouteReport = options.hostedProofRouteReport;
  const hostedProofRouteSource = options.hostedProofRouteSource;
  const alertScenarioReport =
    options.alertScenarioReport ?? checkAlertScenarioReadiness();
  const supportMonitoringReport =
    options.supportMonitoringReport ?? checkSupportMonitoringReadiness();
  const observabilityDrillReport = buildObservabilityProofDrillReport({
    generatedAt,
    envReport: hostedProofEnvReport,
    productionReport: productionObservabilityReport,
    hostedProofRouteReport,
    hostedProofRouteSource,
  });
  const latestErrorLedger =
    options.debuggingLedger ??
    buildDebuggingSessionLedgerSnapshot({
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
  const runtimeLedger = localLogs.latestRuntimeError
    ? buildDebuggingSessionLedgerSnapshot({
        ledgerPath: options.debuggingLedgerPath,
        latestError: {
          environment: "local",
          route: localLogs.latestRuntimeError.route,
          event: localLogs.latestRuntimeError.event,
          errorClass: localLogs.latestRuntimeError.errorClass,
          errorCode: localLogs.latestRuntimeError.errorCode,
        },
      })
    : null;
  const debuggingLedger = augmentDebuggingLedgerWithRuntimeCandidate(
    latestErrorLedger,
    runtimeLedger,
  );
  const localDebuggingReady =
    localLogs.exists &&
    localLogs.malformedLines === 0 &&
    errorHandlingReport.passed;
  const report: AgentDebuggingSnapshotReport = {
    generatedAt,
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
      hostedProofCollectionReady:
        hostedProofEnvReport.hostedProofCollectionReady,
      operationalIncidentAlertsReady:
        hostedProofEnvReport.operationalIncidentAlertsReady,
      missingRequiredEnv: hostedProofEnvReport.missingRequiredEnv,
      invalidRequiredEnv: hostedProofEnvReport.invalidRequiredEnv,
      advisoryCount: hostedProofEnvReport.advisory.length,
    },
    hostedProofRoute: observabilityDrillReport.hostedProofRoute,
    hostedProof: {
      productionObservabilityReady:
        productionObservabilityReport.productionObservabilityReady,
      evidenceDir: productionObservabilityReport.evidenceDir,
      maxAgeHours: productionObservabilityReport.maxAgeHours,
      totals: productionObservabilityReport.totals,
      failedRequirementKeys:
        productionObservabilityReport.failedRequirementKeys,
      requirements: hostedProofRequirementDiagnostics(
        productionObservabilityReport,
      ),
    },
    alertScenarios: {
      catalogReady: alertScenarioReport.catalogReady,
      productionAlertProducerReady:
        alertScenarioReport.productionAlertProducerReady,
      totals: alertScenarioReport.totals,
      launchBlockers: alertScenarioReport.launchBlockers,
    },
    observabilityRunbook: observabilityDrillReport.executionPlan,
    supportMonitoring: {
      ready: supportMonitoringReport.supportMonitoringReady,
      proofFlags: supportMonitoringReport.proofFlags,
      summary: supportMonitoringReport.summary,
      requirements: supportMonitoringReport.requirements,
      ownerLabels: {
        supportOwnerPresent: Boolean(supportMonitoringReport.supportOwner),
        alertOwnerPresent: Boolean(supportMonitoringReport.alertOwner),
        first24HourReviewOwnerPresent: Boolean(
          supportMonitoringReport.first24HourReviewOwner,
        ),
        first72HourReviewOwnerPresent: Boolean(
          supportMonitoringReport.first72HourReviewOwner,
        ),
      },
      incidentStatus: supportMonitoringReport.incidentStatus,
      observabilityProof: supportMonitoringReport.observabilityProof,
      missing: supportMonitoringReport.missing,
    },
    debuggingLedger,
    readiness: {
      localDebuggingReady,
      operationalIncidentsReady:
        incidentReport.readiness.operationalIncidentsReady,
      alertScenarioCatalogReady: alertScenarioReport.catalogReady,
      productionAlertScenarioProducerReady:
        alertScenarioReport.productionAlertProducerReady,
      productionHostedProofRouteReady:
        observabilityDrillReport.hostedProofRoute.readyForWorkersLogsProof,
      productionEvidenceCollectionReady:
        hostedProofEnvReport.hostedProofCollectionReady,
      productionIncidentAlertingReady:
        hostedProofEnvReport.operationalIncidentAlertsReady,
      productionHostedProofReady:
        productionObservabilityReport.productionObservabilityReady,
      supportMonitoringReady: supportMonitoringReport.supportMonitoringReady,
    },
    readinessGates: {
      local: {
        ready: localDebuggingReady,
        failures: [],
      },
      production: {
        ready: false,
        failures: [],
      },
    },
    recommendedNextSteps: [],
    note: "Read-only agent debugging snapshot. It summarizes local log shape, latest local error freshness/origin, latest runtime-origin local error when test-origin records are newer, static error-handling hygiene, D1 incident readiness, alert scenario readiness, hosted proof env readiness, hosted proof route-smoke readiness, hosted proof artifact readiness with failed check labels and nextAction proof commands, production observability runbook buckets, support monitoring readiness with structured requirement diagnostics, machine-readable readiness gate failures, and prior redacted debugging ledger matches for both the latest local error and runtime candidate without printing raw log records, stack traces, request bodies, owner-label values, webhook URLs, or token values.",
  };
  const readinessGates = buildReadinessGates(report);
  return {
    ...report,
    readinessGates,
    recommendedNextSteps: nextSteps({ ...report, readinessGates }),
  };
}

function readOutputFile(env: Record<string, string | undefined>) {
  return (
    env.AGENT_DEBUG_SNAPSHOT_OUTPUT_FILE?.trim() ||
    env.OUTPUT_FILE?.trim() ||
    ""
  );
}

function envEnabled(env: Record<string, string | undefined>, name: string) {
  const value = env[name]?.trim().toLowerCase();
  return value === "1" || value === "true";
}

export function writeAgentDebuggingSnapshotReport(
  report: AgentDebuggingSnapshotReport,
  outputFile: string,
) {
  const resolved = resolve(outputFile);
  mkdirSync(dirname(resolved), { recursive: true });
  writeFileSync(resolved, `${JSON.stringify(report, null, 2)}\n`, "utf8");
}

export function agentDebuggingSnapshotExitCode(
  report: AgentDebuggingSnapshotReport,
  env: Record<string, string | undefined> = process.env,
) {
  if (
    envEnabled(env, "AGENT_DEBUG_SNAPSHOT_STRICT") &&
    !report.readinessGates.local.ready
  ) {
    return 1;
  }
  if (
    envEnabled(env, "AGENT_DEBUG_SNAPSHOT_REQUIRE_PRODUCTION") &&
    !report.readinessGates.production.ready
  ) {
    return 1;
  }
  return 0;
}

function main() {
  const routeSmoke = readObservabilityProofRouteSmokeArtifact();
  const report = buildAgentDebuggingSnapshotReport({
    hostedProofRouteReport: routeSmoke.report,
    hostedProofRouteSource: routeSmoke.source,
  });
  const outputFile = readOutputFile(process.env);
  if (outputFile) writeAgentDebuggingSnapshotReport(report, outputFile);
  console.log(JSON.stringify(report, null, 2));
  const exitCode = agentDebuggingSnapshotExitCode(report, process.env);
  if (exitCode !== 0) process.exit(exitCode);
}

if (import.meta.main) {
  main();
}
