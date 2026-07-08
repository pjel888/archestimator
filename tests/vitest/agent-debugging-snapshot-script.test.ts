import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import {
  buildAgentDebuggingSnapshotReport,
  buildLocalLogSnapshot,
  writeAgentDebuggingSnapshotReport,
} from "@/../scripts/check-agent-debugging-snapshot";
import type { AlertScenarioReadinessReport } from "@/../scripts/check-alert-scenario-readiness";
import type { ErrorHandlingContractReport } from "@/../scripts/check-error-handling-contract";
import type { ObservabilityProofEnvReport } from "@/../scripts/check-observability-proof-env";
import type { OperationalIncidentsReadinessReport } from "@/../scripts/check-operational-incidents";
import type { ProductionObservabilityProofReport } from "@/../scripts/check-production-observability-proof";
import {
  appendDebuggingSessionLedgerRecord,
  buildDebuggingRecurrenceKey,
  buildDebuggingSessionLedgerRecord,
} from "@/../scripts/record-debugging-session";

const READY_ERROR_HANDLING: ErrorHandlingContractReport = {
  generatedAt: "2026-07-08T00:00:00.000Z",
  mode: "error-handling-contract-check",
  scannedTargets: ["src/app/api"],
  scannedFiles: 12,
  violations: [],
  failedChecks: [],
  passed: true,
  note: "test",
};

const READY_INCIDENTS: OperationalIncidentsReadinessReport = {
  generatedAt: "2026-07-08T00:00:00.000Z",
  mode: "operational-incidents-readiness",
  source: {
    database: "ARCH_DB",
    scope: "local",
  },
  thresholdsHours: {
    sev1: 4,
    sev2: 24,
    sev3: 120,
  },
  tableRead: {
    attempted: true,
    commandExitCode: 0,
    parsedJson: true,
    incidentTablesReady: true,
    foundTables: ["operational_incident_events", "operational_incidents"],
  },
  incidentRows: [],
  staleIncidents: [],
  missing: [],
  readiness: {
    incidentTablesReady: true,
    noStaleIncidents: true,
    operationalIncidentsReady: true,
  },
  note: "test",
};

const MISSING_HOSTED_ENV: ObservabilityProofEnvReport = {
  generatedAt: "2026-07-08T00:00:00.000Z",
  mode: "observability-proof-env-preflight",
  proofBoundary: "non-secret-env-preflight",
  passed: false,
  hostedProofCollectionReady: false,
  operationalIncidentAlertsReady: false,
  groups: [],
  missingRequiredEnv: ["WORKERS_LOGS_PROOF_REQUEST_ID", "OBSERVABILITY_ALERT_WEBHOOK_TOKEN"],
  invalidRequiredEnv: [],
  advisory: ["Cloudflare credential env hints are missing."],
  note: "test",
};

const MISSING_PRODUCTION_PROOF: ProductionObservabilityProofReport = {
  generatedAt: "2026-07-08T00:00:00.000Z",
  mode: "production-observability-proof-check",
  proofBoundary: "hosted-observability-evidence-bundle",
  evidenceDir: ".ai/03_plans/example/evidence",
  maxAgeHours: 72,
  passed: false,
  productionObservabilityReady: false,
  totals: {
    required: 7,
    passed: 0,
    failed: 0,
    missing: 7,
    invalid: 0,
  },
  requirements: [],
  failedRequirementKeys: [
    "workersLogsQuery",
    "uptimeAlertDelivery",
    "errorRateAlertDelivery",
    "queueDlqAlertDelivery",
    "cronFailureAlertDelivery",
    "incidentEscalationDelivery",
    "retentionFailureAlertDelivery",
  ],
  note: "test",
};

const READY_PRODUCTION_PROOF: ProductionObservabilityProofReport = {
  ...MISSING_PRODUCTION_PROOF,
  passed: true,
  productionObservabilityReady: true,
  totals: {
    required: 7,
    passed: 7,
    failed: 0,
    missing: 0,
    invalid: 0,
  },
  failedRequirementKeys: [],
};

const READY_ALERT_SCENARIOS: AlertScenarioReadinessReport = {
  generatedAt: "2026-07-08T00:00:00.000Z",
  mode: "alert-scenario-readiness",
  proofBoundary: "local-alert-scenario-contract",
  catalogReady: true,
  productionAlertProducerReady: true,
  expectedScenarioIds: ["S-01", "S-02", "S-03", "S-04", "S-05", "S-06", "S-07"],
  totals: {
    scenarios: 7,
    implementedProofs: 7,
    plannedProofs: 0,
    providerBackedLaunchRequired: 7,
    launchBlockers: 0,
  },
  scenarios: [],
  missing: [],
  launchBlockers: [],
  note: "test",
};

function tempLog(content: string) {
  const dir = mkdtempSync(join(tmpdir(), "agent-debug-snapshot-"));
  mkdirSync(join(dir, "logs"), { recursive: true });
  const logPath = join(dir, "logs", "dev.ndjson");
  writeFileSync(logPath, content, "utf8");
  return { dir, logPath };
}

describe("agent debugging snapshot script", () => {
  it("summarizes local log shape without exposing raw messages or stacks", () => {
    const { dir, logPath } = tempLog(`${JSON.stringify({
      record_id: "rec_123",
      timestamp: "2026-07-08T00:00:00.000Z",
      level: "ERROR",
      event: "route_error",
      message: "Bearer provider-secret failed for client@example.com",
      context: { route: "/workshop/projects?token=secret" },
      error: {
        class: "Error",
        code: "INTERNAL_ERROR",
        stack: ["at privateFunction (/tmp/secret.ts:1:1)"],
      },
      tainted_fields: ["message", "error.stack"],
    })}\n`);
    try {
      const report = buildAgentDebuggingSnapshotReport({
        generatedAt: "2026-07-08T00:00:00.000Z",
        logPath,
        errorHandlingReport: READY_ERROR_HANDLING,
        incidentReport: READY_INCIDENTS,
        hostedProofEnvReport: MISSING_HOSTED_ENV,
        productionObservabilityReport: MISSING_PRODUCTION_PROOF,
      });

      expect(report.localLogs).toMatchObject({
        exists: true,
        parsedRecords: 1,
        malformedLines: 0,
        errorRecords: 1,
      });
      expect(report.localLogs.latestError).toMatchObject({
        recordId: "rec_123",
        event: "route_error",
        route: null,
        errorClass: "Error",
        errorCode: "INTERNAL_ERROR",
        taintedFieldCount: 2,
      });
      expect(report.readiness.localDebuggingReady).toBe(true);
      expect(report.readiness.alertScenarioCatalogReady).toBe(true);
      expect(report.readiness.productionAlertScenarioProducerReady).toBe(true);
      expect(report.readiness.productionEvidenceCollectionReady).toBe(false);
      expect(report.readiness.productionHostedProofReady).toBe(false);
      expect(report.hostedProof.failedRequirementKeys).toContain("workersLogsQuery");
      expect(report.alertScenarios.launchBlockers).toEqual([]);
      expect(report.debuggingLedger.latestErrorRecurrenceKey).toBe(buildDebuggingRecurrenceKey({
        environment: "local",
        route: null,
        event: "route_error",
        errorClass: "Error",
        errorCode: "INTERNAL_ERROR",
      }));
      expect(report.recommendedNextSteps).toContain("Run `bun run logs:debug` or `bun run logs:explain <record_id>` for the latest local error record before changing code.");
      expect(report.recommendedNextSteps).toContain("Run `bun run ops:observability-drill` and collect missing hosted proof artifacts for: workersLogsQuery, uptimeAlertDelivery, errorRateAlertDelivery, queueDlqAlertDelivery, cronFailureAlertDelivery, incidentEscalationDelivery, retentionFailureAlertDelivery.");
      expect(report.recommendedNextSteps).toContain("After the root cause is proven, append a redacted `ops:debug-ledger` record using `debuggingLedger.latestErrorRecurrenceKey` so future agents recognize this fingerprint.");
      expect(JSON.stringify(report)).not.toMatch(/provider-secret|client@example\.com|privateFunction|token=secret/i);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it("reports malformed or missing local logs as local debugging not ready", () => {
    const { dir, logPath } = tempLog("not json\n");
    try {
      const malformed = buildAgentDebuggingSnapshotReport({
        logPath,
        errorHandlingReport: READY_ERROR_HANDLING,
        incidentReport: READY_INCIDENTS,
        hostedProofEnvReport: MISSING_HOSTED_ENV,
        productionObservabilityReport: MISSING_PRODUCTION_PROOF,
      });

      expect(malformed.localLogs.malformedLines).toBe(1);
      expect(malformed.readiness.localDebuggingReady).toBe(false);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }

    const missing = buildLocalLogSnapshot("/tmp/archestimator-definitely-missing-dev-log.ndjson");
    expect(missing).toMatchObject({
      exists: false,
      parsedRecords: 0,
      latestError: null,
    });
  });

  it("surfaces error-handling and incident readiness failures as next steps", () => {
    const { dir, logPath } = tempLog("");
    try {
      const report = buildAgentDebuggingSnapshotReport({
        logPath,
        errorHandlingReport: {
          ...READY_ERROR_HANDLING,
          passed: false,
          violations: [
            {
              file: "src/app/api/example/route.ts",
              line: 1,
              column: 1,
              pattern: "catch-empty-block",
              excerpt: "catch {}",
            },
          ],
          failedChecks: ["silent-catch-handling"],
        },
        incidentReport: {
          ...READY_INCIDENTS,
          staleIncidents: [
            {
              id: "inc_1",
              severity: "sev2",
              status: "open",
              declaredAt: "2026-07-01T00:00:00.000Z",
              ageHours: 24,
              resolveSlaHours: 4,
            },
          ],
          missing: ["stale_incident:inc_1"],
          readiness: {
            ...READY_INCIDENTS.readiness,
            noStaleIncidents: false,
            operationalIncidentsReady: false,
          },
        },
        hostedProofEnvReport: MISSING_HOSTED_ENV,
        productionObservabilityReport: MISSING_PRODUCTION_PROOF,
      });

      expect(report.errorHandling.violationCount).toBe(1);
      expect(report.incidents.staleIncidentCount).toBe(1);
      expect(report.recommendedNextSteps).toContain("Run `bun run validate:error-handling` and fix silent catch violations before claiming error-handling readiness.");
      expect(report.recommendedNextSteps).toContain("Run `bun run ops:check-incidents` and resolve missing/stale operational incident readiness items.");
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it("writes a sanitized snapshot artifact", () => {
    const { dir, logPath } = tempLog("");
    try {
      const report = buildAgentDebuggingSnapshotReport({
        generatedAt: "2026-07-08T00:00:00.000Z",
        logPath,
        errorHandlingReport: READY_ERROR_HANDLING,
        incidentReport: READY_INCIDENTS,
        hostedProofEnvReport: MISSING_HOSTED_ENV,
        productionObservabilityReport: READY_PRODUCTION_PROOF,
      });
      const output = join(dir, "snapshot.json");
      writeAgentDebuggingSnapshotReport(report, output);
      const saved = readFileSync(output, "utf8");

      expect(JSON.parse(saved)).toEqual(report);
      expect(saved).not.toMatch(/Bearer |provider-secret|token-value/i);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it("surfaces prior redacted debugging records that match the latest local error", () => {
    const { dir, logPath } = tempLog(`${JSON.stringify({
      record_id: "rec_456",
      timestamp: "2026-07-08T00:00:00.000Z",
      level: "ERROR",
      event: "client_error",
      context: { route: "/workshop/projects" },
      error: {
        class: "ReferenceError",
        code: "CONTEXT_MENU_CONTENT",
      },
      tainted_fields: [],
    })}\n`);
    try {
      const ledgerPath = join(dir, "debugging-ledger.ndjson");
      appendDebuggingSessionLedgerRecord(buildDebuggingSessionLedgerRecord({
        id: "debug-recurring-context-menu",
        generatedAt: "2026-07-08T00:00:00.000Z",
        environment: "local",
        status: "fixed",
        severity: "sev3",
        source: "local-log",
        symptom: "Project page client error from missing context menu primitive.",
        route: "/workshop/projects",
        event: "client_error",
        errorClass: "ReferenceError",
        errorCode: "CONTEXT_MENU_CONTENT",
        rootCause: "The dropdown primitive import was lost during menu consolidation.",
        fixSummary: "Restored the import and covered project-page rendering.",
        validation: ["bun run type-check"],
      }), ledgerPath);

      const report = buildAgentDebuggingSnapshotReport({
        logPath,
        debuggingLedgerPath: ledgerPath,
        errorHandlingReport: READY_ERROR_HANDLING,
        incidentReport: READY_INCIDENTS,
        hostedProofEnvReport: MISSING_HOSTED_ENV,
        productionObservabilityReport: MISSING_PRODUCTION_PROOF,
      });

      expect(report.debuggingLedger.matchingLatestErrorCount).toBe(1);
      expect(report.debuggingLedger.latestErrorRecurrenceKey).toBe(buildDebuggingRecurrenceKey({
        environment: "local",
        route: "/workshop/projects",
        event: "client_error",
        errorClass: "ReferenceError",
        errorCode: "CONTEXT_MENU_CONTENT",
      }));
      expect(report.debuggingLedger.recentMatches[0]).toMatchObject({
        id: "debug-recurring-context-menu",
        status: "fixed",
        fixSummary: "Restored the import and covered project-page rendering.",
      });
      expect(report.recommendedNextSteps).toContain("Review `debuggingLedger.recentMatches` before changing code; this error fingerprint has prior redacted fix evidence.");
      expect(JSON.stringify(report)).not.toMatch(/Bearer |token=|client@example\.com/i);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it("can report production hosted proof readiness when the hosted bundle is complete", () => {
    const { dir, logPath } = tempLog("");
    try {
      const report = buildAgentDebuggingSnapshotReport({
        logPath,
        errorHandlingReport: READY_ERROR_HANDLING,
        incidentReport: READY_INCIDENTS,
        hostedProofEnvReport: {
          ...MISSING_HOSTED_ENV,
          passed: true,
          hostedProofCollectionReady: true,
          operationalIncidentAlertsReady: true,
          missingRequiredEnv: [],
          invalidRequiredEnv: [],
          advisory: [],
        },
        productionObservabilityReport: READY_PRODUCTION_PROOF,
        alertScenarioReport: READY_ALERT_SCENARIOS,
      });

      expect(report.hostedProof.productionObservabilityReady).toBe(true);
      expect(report.alertScenarios.productionAlertProducerReady).toBe(true);
      expect(report.readiness.productionEvidenceCollectionReady).toBe(true);
      expect(report.readiness.productionIncidentAlertingReady).toBe(true);
      expect(report.readiness.productionAlertScenarioProducerReady).toBe(true);
      expect(report.readiness.productionHostedProofReady).toBe(true);
      expect(report.recommendedNextSteps).not.toContain("Run `bun run ops:check-observability` and collect missing hosted proof artifacts for: unknown.");
      expect(report.recommendedNextSteps.some((step) => step.includes("ops:check-alert-scenarios"))).toBe(false);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});
