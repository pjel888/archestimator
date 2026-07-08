import {
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import {
  agentDebuggingSnapshotExitCode,
  buildAgentDebuggingSnapshotReport,
  buildLocalLogSnapshot,
  writeAgentDebuggingSnapshotReport,
} from "@/../scripts/check-agent-debugging-snapshot";
import type { AlertScenarioReadinessReport } from "@/../scripts/check-alert-scenario-readiness";
import type { ErrorHandlingContractReport } from "@/../scripts/check-error-handling-contract";
import type { ObservabilityProofEnvReport } from "@/../scripts/check-observability-proof-env";
import type { ObservabilityProofRouteSmokeReport } from "@/../scripts/check-observability-proof-route";
import type { OperationalIncidentsReadinessReport } from "@/../scripts/check-operational-incidents";
import type { ProductionObservabilityProofReport } from "@/../scripts/check-production-observability-proof";
import type { SupportMonitoringReadinessResult } from "@/../scripts/check-support-monitoring-readiness";
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

const READY_ROUTE: ObservabilityProofRouteSmokeReport = {
  generatedAt: "2026-07-08T00:00:00.000Z",
  mode: "observability-proof-route-smoke",
  proofBoundary: "non-secret-hosted-route-smoke",
  target: {
    origin: "https://archestimator.com",
    pathname: "/__cloudflare/observability-proof",
  },
  note: "test",
  http: {
    attempted: true,
    status: 401,
    statusText: "Unauthorized",
    redirected: false,
  },
  routeStatus: "auth-enforced",
  routeReachable: true,
  authorizationEnforced: true,
  readyForWorkersLogsProof: true,
  nextAction: "Collect Workers Logs proof.",
};

const ROUTE_NOT_FOUND: ObservabilityProofRouteSmokeReport = {
  ...READY_ROUTE,
  http: {
    attempted: true,
    status: 404,
    statusText: "Not Found",
    redirected: false,
  },
  routeStatus: "route-not-found",
  routeReachable: false,
  authorizationEnforced: false,
  readyForWorkersLogsProof: false,
  nextAction:
    "Deploy the current Worker source from a clean runtime worktree so `/__cloudflare/observability-proof` is live, then rerun `bun run ops:check-observability-route`.",
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
  missingRequiredEnv: [
    "WORKERS_LOGS_PROOF_REQUEST_ID",
    "OBSERVABILITY_ALERT_WEBHOOK_TOKEN",
  ],
  invalidRequiredEnv: [],
  advisory: ["Cloudflare credential env hints are missing."],
  note: "test",
};

const READY_HOSTED_ENV: ObservabilityProofEnvReport = {
  ...MISSING_HOSTED_ENV,
  passed: true,
  hostedProofCollectionReady: true,
  operationalIncidentAlertsReady: true,
  groups: [
    {
      key: "workersLogsProof",
      ready: true,
      checks: [
        {
          key: "WORKERS_LOGS_PROOF_REQUEST_ID+WORKERS_LOGS_PROOF_ROUTE or WORKERS_LOGS_PROOF_URL+WORKERS_LOGS_PROOF_SECRET",
          required: true,
          passed: true,
          detail: "trigger-url-ready",
        },
      ],
    },
    {
      key: "alertDeliveryProof",
      ready: true,
      checks: [
        {
          key: "OBSERVABILITY_ALERT_DELIVERY_PROOF",
          required: true,
          passed: true,
          detail: "enabled",
        },
      ],
    },
    {
      key: "operationalIncidentAlerts",
      ready: true,
      checks: [
        {
          key: "OPERATIONAL_INCIDENT_ALERTS_ENABLED",
          required: true,
          passed: true,
          detail: "enabled",
        },
      ],
    },
  ],
  missingRequiredEnv: [],
  invalidRequiredEnv: [],
  advisory: [],
};

const MISSING_PROOF_REQUIREMENTS: ProductionObservabilityProofReport["requirements"] =
  [
    {
      key: "workersLogsQuery",
      label: "Hosted Workers Logs query proof",
      status: "missing",
      artifact: null,
      checks: [],
      failedChecks: ["missing:workers-logs-query-proof.json"],
      note: "test",
      nextAction: "test",
    },
    {
      key: "uptimeAlertDelivery",
      label: "Hosted uptime alert delivery proof",
      status: "missing",
      artifact: null,
      checks: [],
      failedChecks: ["missing:uptime-alert-delivery-proof.json"],
      note: "test",
      nextAction: "test",
    },
    {
      key: "errorRateAlertDelivery",
      label: "Hosted error-rate alert delivery proof",
      status: "missing",
      artifact: null,
      checks: [],
      failedChecks: ["missing:error-rate-alert-delivery-proof.json"],
      note: "test",
      nextAction: "test",
    },
    {
      key: "queueDlqAlertDelivery",
      label: "Hosted Queue DLQ alert delivery proof",
      status: "missing",
      artifact: null,
      checks: [],
      failedChecks: ["missing:queue-dlq-alert-delivery-proof.json"],
      note: "test",
      nextAction: "test",
    },
    {
      key: "cronFailureAlertDelivery",
      label: "Hosted cron-failure alert delivery proof",
      status: "missing",
      artifact: null,
      checks: [],
      failedChecks: ["missing:cron-failure-alert-delivery-proof.json"],
      note: "test",
      nextAction: "test",
    },
    {
      key: "incidentEscalationDelivery",
      label: "Hosted incident-escalation alert delivery proof",
      status: "missing",
      artifact: null,
      checks: [],
      failedChecks: ["missing:incident-escalation-alert-delivery-proof.json"],
      note: "test",
      nextAction: "test",
    },
    {
      key: "retentionFailureAlertDelivery",
      label: "Hosted retention-failure alert delivery proof",
      status: "missing",
      artifact: null,
      checks: [],
      failedChecks: ["missing:retention-failure-alert-delivery-proof.json"],
      note: "test",
      nextAction: "test",
    },
  ];

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
  requirements: MISSING_PROOF_REQUIREMENTS,
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
  requirements: MISSING_PROOF_REQUIREMENTS.map((requirement) => ({
    ...requirement,
    status: "passed" as const,
    artifact:
      requirement.artifact ?? ".ai/03_plans/example/evidence/proof.json",
    failedChecks: [],
  })),
  failedRequirementKeys: [],
};

const FAILED_PRODUCTION_PROOF: ProductionObservabilityProofReport = {
  ...MISSING_PRODUCTION_PROOF,
  totals: {
    required: 7,
    passed: 6,
    failed: 1,
    missing: 0,
    invalid: 0,
  },
  requirements: MISSING_PROOF_REQUIREMENTS.map((requirement) => {
    if (requirement.key !== "workersLogsQuery") {
      return {
        ...requirement,
        status: "passed" as const,
        artifact: ".ai/03_plans/example/evidence/passed-alert-proof.json",
        failedChecks: [],
      };
    }
    return {
      ...requirement,
      status: "failed" as const,
      artifact: ".ai/03_plans/example/evidence/workers-logs-query-proof.json",
      failedChecks: ["artifact-producer-script", "artifact-within-max-age"],
    };
  }),
  failedRequirementKeys: ["workersLogsQuery"],
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

const MISSING_SUPPORT_REQUIREMENTS: SupportMonitoringReadinessResult["requirements"] =
  [
    {
      key: "supportInboxMonitoring",
      category: "operator-confirmation",
      status: "missing",
      label: "Support inbox monitoring",
      missing: ["support inbox monitoring confirmed"],
      source: null,
      nextAction:
        "Set SUPPORT_MONITORING_INBOX_CONFIRMED=true after the monitored support inbox is confirmed.",
    },
    {
      key: "feedbackReview",
      category: "operator-confirmation",
      status: "missing",
      label: "Feedback table review",
      missing: ["feedback table review confirmed"],
      source: null,
      nextAction:
        "Set SUPPORT_MONITORING_FEEDBACK_REVIEW_CONFIRMED=true after the feedback review queue is confirmed.",
    },
    {
      key: "uptimeAlertDelivery",
      category: "operator-confirmation",
      status: "missing",
      label: "Uptime alert delivery",
      missing: ["uptime alert delivery confirmed"],
      source: null,
      nextAction:
        "Set SUPPORT_MONITORING_UPTIME_ALERT_CONFIRMED=true after hosted uptime alert delivery is confirmed.",
    },
    {
      key: "errorAlertDelivery",
      category: "operator-confirmation",
      status: "missing",
      label: "Error alert delivery",
      missing: ["error alert delivery confirmed"],
      source: null,
      nextAction:
        "Set SUPPORT_MONITORING_ERROR_ALERT_CONFIRMED=true after hosted error alert delivery is confirmed.",
    },
    {
      key: "incidentEscalationPath",
      category: "operator-confirmation",
      status: "missing",
      label: "Incident escalation path",
      missing: ["incident escalation path confirmed"],
      source: null,
      nextAction:
        "Set SUPPORT_MONITORING_INCIDENT_ESCALATION_CONFIRMED=true after incident escalation ownership is confirmed.",
    },
    {
      key: "supportOwnerLabel",
      category: "owner-label",
      status: "missing",
      label: "Support owner label",
      missing: ["support owner label"],
      source: null,
      nextAction:
        "Set SUPPORT_MONITORING_SUPPORT_OWNER to a short sanitized owner label.",
    },
    {
      key: "alertOwnerLabel",
      category: "owner-label",
      status: "missing",
      label: "Alert owner label",
      missing: ["alert owner label"],
      source: null,
      nextAction:
        "Set SUPPORT_MONITORING_ALERT_OWNER to a short sanitized owner label.",
    },
    {
      key: "first24HourReviewOwnerLabel",
      category: "owner-label",
      status: "missing",
      label: "First 24-hour review owner label",
      missing: ["first 24-hour review owner label"],
      source: null,
      nextAction:
        "Set SUPPORT_MONITORING_FIRST_24H_OWNER to a short sanitized owner label.",
    },
    {
      key: "first72HourReviewOwnerLabel",
      category: "owner-label",
      status: "missing",
      label: "First 72-hour review owner label",
      missing: ["first 72-hour review owner label"],
      source: null,
      nextAction:
        "Set SUPPORT_MONITORING_FIRST_72H_OWNER to a short sanitized owner label.",
    },
    {
      key: "operationalIncidentStatusArtifact",
      category: "evidence-artifact",
      status: "missing",
      label: "Operational incident status artifact",
      missing: ["operational incident status artifact"],
      source: null,
      nextAction:
        "Run `bun run ops:check-incidents` and pass its JSON artifact as SUPPORT_MONITORING_INCIDENT_STATUS_FILE.",
    },
    {
      key: "productionObservabilityProofArtifact",
      category: "evidence-artifact",
      status: "missing",
      label: "Production observability proof artifact",
      missing: ["production observability proof artifact"],
      source: null,
      nextAction:
        "Run `bun run ops:check-observability` and pass its JSON artifact as SUPPORT_MONITORING_OBSERVABILITY_PROOF_FILE.",
    },
  ];

const READY_SUPPORT_REQUIREMENTS: SupportMonitoringReadinessResult["requirements"] =
  MISSING_SUPPORT_REQUIREMENTS.map((requirement) => ({
    ...requirement,
    status: "passed" as const,
    missing: [],
    source:
      requirement.key === "operationalIncidentStatusArtifact"
        ? ".ai/99_scratch/operational-incidents-readiness-remote.json"
        : requirement.key === "productionObservabilityProofArtifact"
          ? ".ai/99_scratch/production-observability-proof-check-current.json"
          : null,
  }));

const MISSING_SUPPORT_MONITORING: SupportMonitoringReadinessResult = {
  generatedAt: "2026-07-08T00:00:00.000Z",
  mode: "support-monitoring-readiness",
  proofFlags: {
    SUPPORT_MONITORING_INBOX_CONFIRMED: false,
    SUPPORT_MONITORING_FEEDBACK_REVIEW_CONFIRMED: false,
    SUPPORT_MONITORING_UPTIME_ALERT_CONFIRMED: false,
    SUPPORT_MONITORING_ERROR_ALERT_CONFIRMED: false,
    SUPPORT_MONITORING_INCIDENT_ESCALATION_CONFIRMED: false,
  },
  supportOwner: null,
  alertOwner: null,
  first24HourReviewOwner: null,
  first72HourReviewOwner: null,
  incidentStatus: {
    source: null,
    present: false,
    operationalIncidentsReady: false,
    staleIncidentIds: [],
  },
  observabilityProof: {
    source: null,
    present: false,
    productionObservabilityReady: false,
    failedRequirementKeys: [],
  },
  summary: {
    passed: 0,
    missing: 11,
    failed: 0,
  },
  requirements: MISSING_SUPPORT_REQUIREMENTS,
  missing: [
    "support inbox monitoring confirmed",
    "feedback table review confirmed",
    "uptime alert delivery confirmed",
    "error alert delivery confirmed",
    "incident escalation path confirmed",
    "support owner label",
    "alert owner label",
    "first 24-hour review owner label",
    "first 72-hour review owner label",
    "operational incident status artifact",
    "production observability proof artifact",
  ],
  supportMonitoringReady: false,
  note: "test",
};

const READY_SUPPORT_MONITORING: SupportMonitoringReadinessResult = {
  ...MISSING_SUPPORT_MONITORING,
  proofFlags: {
    SUPPORT_MONITORING_INBOX_CONFIRMED: true,
    SUPPORT_MONITORING_FEEDBACK_REVIEW_CONFIRMED: true,
    SUPPORT_MONITORING_UPTIME_ALERT_CONFIRMED: true,
    SUPPORT_MONITORING_ERROR_ALERT_CONFIRMED: true,
    SUPPORT_MONITORING_INCIDENT_ESCALATION_CONFIRMED: true,
  },
  supportOwner: "Philip / Support",
  alertOwner: "Philip / Alerts",
  first24HourReviewOwner: "Philip / Day 1",
  first72HourReviewOwner: "Philip / Day 3",
  incidentStatus: {
    source: ".ai/99_scratch/operational-incidents-readiness-remote.json",
    present: true,
    operationalIncidentsReady: true,
    staleIncidentIds: [],
  },
  observabilityProof: {
    source: ".ai/99_scratch/production-observability-proof-check-current.json",
    present: true,
    productionObservabilityReady: true,
    failedRequirementKeys: [],
  },
  summary: {
    passed: 11,
    missing: 0,
    failed: 0,
  },
  requirements: READY_SUPPORT_REQUIREMENTS,
  missing: [],
  supportMonitoringReady: true,
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
    const { dir, logPath } = tempLog(
      `${JSON.stringify({
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
      })}\n`,
    );
    try {
      const report = buildAgentDebuggingSnapshotReport({
        generatedAt: "2026-07-08T00:00:00.000Z",
        logPath,
        errorHandlingReport: READY_ERROR_HANDLING,
        incidentReport: READY_INCIDENTS,
        hostedProofEnvReport: MISSING_HOSTED_ENV,
        hostedProofRouteReport: ROUTE_NOT_FOUND,
        productionObservabilityReport: MISSING_PRODUCTION_PROOF,
        supportMonitoringReport: MISSING_SUPPORT_MONITORING,
      });

      expect(report.localLogs).toMatchObject({
        exists: true,
        parsedRecords: 1,
        malformedLines: 0,
        errorRecords: 1,
        latestErrorStaleAfterHours: 24,
      });
      expect(report.localLogs.latestError).toMatchObject({
        recordId: "rec_123",
        timestamp: "2026-07-08T00:00:00.000Z",
        ageMinutes: 0,
        freshness: "fresh",
        origin: "runtime",
        originEvidence: [],
        event: "route_error",
        route: null,
        errorClass: "Error",
        errorCode: "INTERNAL_ERROR",
        taintedFieldCount: 2,
      });
      expect(report.localLogs.latestRuntimeError).toEqual(
        report.localLogs.latestError,
      );
      expect(report.readiness.localDebuggingReady).toBe(true);
      expect(report.readiness.alertScenarioCatalogReady).toBe(true);
      expect(report.readiness.productionAlertScenarioProducerReady).toBe(true);
      expect(report.readiness.productionHostedProofRouteReady).toBe(false);
      expect(report.readiness.productionEvidenceCollectionReady).toBe(false);
      expect(report.readiness.productionHostedProofReady).toBe(false);
      expect(report.readiness.supportMonitoringReady).toBe(false);
      expect(report.readinessGates.local).toEqual({
        ready: true,
        failures: [],
      });
      expect(report.readinessGates.production.ready).toBe(false);
      expect(
        report.readinessGates.production.failures.map((failure) => failure.key),
      ).toEqual([
        "hostedProofEnv",
        "hostedProofRoute",
        "operationalIncidentAlerting",
        "hostedProofArtifacts",
        "supportMonitoring",
      ]);
      expect(report.hostedProofRoute).toMatchObject({
        present: true,
        routeStatus: "route-not-found",
        httpStatus: 404,
        readyForWorkersLogsProof: false,
      });
      expect(report.hostedProof.failedRequirementKeys).toContain(
        "workersLogsQuery",
      );
      expect(
        report.hostedProof.requirements.find(
          (requirement) => requirement.key === "workersLogsQuery",
        ),
      ).toEqual({
        key: "workersLogsQuery",
        status: "missing",
        artifact: null,
        failedChecks: ["missing:workers-logs-query-proof.json"],
        nextAction: "test",
      });
      expect(report.observabilityRunbook.summary).toEqual({
        passed: 0,
        readOnlyReady: 2,
        gatedExternalReady: 0,
        blocked: 9,
      });
      expect(
        report.observabilityRunbook.blocked.find(
          (step) => step.key === "hostedProofRoute",
        ),
      ).toMatchObject({
        phase: "hosted-route-smoke",
        sideEffectWhenRun: "queries-hosted-route",
      });
      expect(
        report.observabilityRunbook.blocked.find(
          (step) => step.key === "workersLogsQuery",
        ),
      ).toMatchObject({
        phase: "collect-workers-logs-proof",
        sideEffectWhenRun: "queries-cloudflare-logs",
      });
      expect(report.alertScenarios.launchBlockers).toEqual([]);
      expect(report.supportMonitoring).toMatchObject({
        ready: false,
        summary: {
          passed: 0,
          missing: 11,
          failed: 0,
        },
        ownerLabels: {
          supportOwnerPresent: false,
          alertOwnerPresent: false,
          first24HourReviewOwnerPresent: false,
          first72HourReviewOwnerPresent: false,
        },
      });
      expect(
        report.supportMonitoring.requirements.find(
          (requirement) =>
            requirement.key === "operationalIncidentStatusArtifact",
        ),
      ).toMatchObject({
        category: "evidence-artifact",
        status: "missing",
        missing: ["operational incident status artifact"],
      });
      expect(report.debuggingLedger.latestErrorRecurrenceKey).toBe(
        buildDebuggingRecurrenceKey({
          environment: "local",
          route: null,
          event: "route_error",
          errorClass: "Error",
          errorCode: "INTERNAL_ERROR",
        }),
      );
      expect(report.recommendedNextSteps).toContain(
        "Run `bun run logs:debug` or `bun run logs:explain <record_id>` for the latest local error record before changing code.",
      );
      expect(report.recommendedNextSteps).toContain(
        "Hosted proof route smoke is route-not-found; Deploy the current Worker source from a clean runtime worktree so `/__cloudflare/observability-proof` is live, then rerun `bun run ops:check-observability-route`.",
      );
      expect(report.recommendedNextSteps).toContain(
        "Run `bun run ops:observability-drill` and collect missing hosted proof artifacts for: workersLogsQuery, uptimeAlertDelivery, errorRateAlertDelivery, queueDlqAlertDelivery, cronFailureAlertDelivery, incidentEscalationDelivery, retentionFailureAlertDelivery.",
      );
      expect(report.recommendedNextSteps).toContain(
        "Review `observabilityRunbook.blocked` before collecting hosted proof; blocked env/artifact setup must be resolved before Cloudflare tail or alert probes.",
      );
      expect(
        report.recommendedNextSteps.some((step) =>
          step.includes("launch:check-support-monitoring"),
        ),
      ).toBe(true);
      expect(report.recommendedNextSteps).toContain(
        "After the root cause is proven, append a redacted `ops:debug-ledger` record using `debuggingLedger.latestErrorRecurrenceKey` so future agents recognize this fingerprint.",
      );
      expect(JSON.stringify(report)).not.toMatch(
        /provider-secret|client@example\.com|privateFunction|token=secret/i,
      );
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it("classifies diagnostic records tied to Vitest route errors as test-origin evidence", () => {
    const { dir, logPath } = tempLog(
      [
        JSON.stringify({
          record_id: "rec_runtime",
          timestamp: "2026-07-07T23:59:00.000Z",
          level: "ERROR",
          event: "client_error",
          context: {
            route: "/workshop/projects",
          },
          error: {
            class: "ReferenceError",
            code: "RUNTIME_ONLY",
          },
        }),
        JSON.stringify({
          record_id: "rec_early_diagnostic",
          timestamp: "2026-07-07T23:59:59.999Z",
          level: "ERROR",
          event: "shared_link_decision_route_event",
          message: "Shared-link decision route diagnostic.",
          context: {
            route: "/api/share/[token]/decision",
            error_code: "SUBMIT_FAILED",
            status: 500,
          },
        }),
        JSON.stringify({
          record_id: "rec_route_error",
          timestamp: "2026-07-08T00:00:00.000Z",
          level: "ERROR",
          event: "route_error",
          message: "Something went wrong. Try again in a moment.",
          context: {
            route: "/api/share/[token]/decision",
            status: 500,
          },
          error: {
            class: "InternalError",
            code: "INTERNAL_ERROR",
            stack: [
              "InternalError: Something went wrong. Try again in a moment.",
              "    at Module.POST (/repo/src/app/api/share/[token]/decision/route.ts:368:7)",
              "    at /repo/tests/vitest/project-publication-decision.test.tsx:500:19",
              "    at /repo/node_modules/@vitest/runner/dist/chunk-artifact.js:1903:20",
            ],
          },
        }),
        JSON.stringify({
          record_id: "rec_diagnostic",
          timestamp: "2026-07-08T00:00:00.001Z",
          level: "ERROR",
          event: "shared_link_decision_route_event",
          message: "Shared-link decision route diagnostic.",
          context: {
            route: "/api/share/[token]/decision",
            error_code: "SUBMIT_FAILED",
            status: 500,
          },
        }),
        "",
      ].join("\n"),
    );
    try {
      const report = buildAgentDebuggingSnapshotReport({
        generatedAt: "2026-07-08T00:05:00.000Z",
        logPath,
        debuggingLedgerPath: join(dir, "empty-debugging-ledger.ndjson"),
        errorHandlingReport: READY_ERROR_HANDLING,
        incidentReport: READY_INCIDENTS,
        hostedProofEnvReport: MISSING_HOSTED_ENV,
        hostedProofRouteReport: READY_ROUTE,
        productionObservabilityReport: MISSING_PRODUCTION_PROOF,
      });

      expect(report.localLogs.latestError).toMatchObject({
        recordId: "rec_diagnostic",
        freshness: "fresh",
        origin: "test",
        route: "/api/share/[token]/decision",
        originEvidence: [
          "tests/vitest/project-publication-decision.test.tsx",
          "node_modules/@vitest",
        ],
      });
      expect(report.localLogs.latestRuntimeError).toMatchObject({
        recordId: "rec_runtime",
        freshness: "fresh",
        origin: "runtime",
        originEvidence: [],
        route: "/workshop/projects",
        errorClass: "ReferenceError",
        errorCode: "RUNTIME_ONLY",
      });
      expect(report.debuggingLedger.latestRuntimeErrorRecurrenceKey).toBe(
        buildDebuggingRecurrenceKey({
          environment: "local",
          route: "/workshop/projects",
          event: "client_error",
          errorClass: "ReferenceError",
          errorCode: "RUNTIME_ONLY",
        }),
      );
      expect(report.recommendedNextSteps).toContain(
        "Latest local error appears to come from a test run; rerun the relevant test with a temp `ARCHESTIMATOR_DEV_LOG_PATH` or reproduce in dev before treating it as app-runtime evidence.",
      );
      expect(report.recommendedNextSteps).toContain(
        "Review `localLogs.latestRuntimeError` or run `bun run logs:explain <record_id>` for the newest app-runtime error behind the test-origin log noise.",
      );
      expect(report.recommendedNextSteps).toContain(
        "If the test-origin error reproduces outside synthetic log evidence, append a redacted `ops:debug-ledger` record using `debuggingLedger.latestErrorRecurrenceKey`.",
      );
      expect(report.recommendedNextSteps).toContain(
        "If `localLogs.latestRuntimeError` becomes the active investigation, append the eventual redacted `ops:debug-ledger` record using `debuggingLedger.latestRuntimeErrorRecurrenceKey`.",
      );
      expect(report.recommendedNextSteps).not.toContain(
        "Run `bun run logs:debug` or `bun run logs:explain <record_id>` for the latest local error record before changing code.",
      );
      expect(report.recommendedNextSteps).not.toContain(
        "After the root cause is proven, append a redacted `ops:debug-ledger` record using `debuggingLedger.latestErrorRecurrenceKey` so future agents recognize this fingerprint.",
      );
      expect(JSON.stringify(report)).not.toMatch(
        /InternalError: Something went wrong|Module\.POST|chunk-artifact/i,
      );
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it("surfaces prior redacted debugging records for the runtime candidate behind test-origin noise", () => {
    const { dir, logPath } = tempLog(
      [
        JSON.stringify({
          record_id: "rec_runtime",
          timestamp: "2026-07-07T23:59:00.000Z",
          level: "ERROR",
          event: "client_error",
          context: {
            route: "/workshop/projects",
          },
          error: {
            class: "ReferenceError",
            code: "RUNTIME_ONLY",
          },
        }),
        JSON.stringify({
          record_id: "rec_route_error",
          timestamp: "2026-07-08T00:00:00.000Z",
          level: "ERROR",
          event: "route_error",
          context: {
            route: "/api/share/[token]/decision",
            status: 500,
          },
          error: {
            class: "InternalError",
            code: "INTERNAL_ERROR",
            stack: [
              "InternalError: Something went wrong.",
              "    at Module.POST (/repo/src/app/api/share/[token]/decision/route.ts:368:7)",
              "    at /repo/tests/vitest/project-publication-decision.test.tsx:500:19",
              "    at /repo/node_modules/@vitest/runner/dist/chunk-artifact.js:1903:20",
            ],
          },
        }),
        JSON.stringify({
          record_id: "rec_diagnostic",
          timestamp: "2026-07-08T00:00:00.001Z",
          level: "ERROR",
          event: "shared_link_decision_route_event",
          context: {
            route: "/api/share/[token]/decision",
            status: 500,
          },
        }),
        "",
      ].join("\n"),
    );
    try {
      const ledgerPath = join(dir, "debugging-ledger.ndjson");
      appendDebuggingSessionLedgerRecord(
        buildDebuggingSessionLedgerRecord({
          id: "debug-runtime-candidate-fixed",
          generatedAt: "2026-07-08T00:01:00.000Z",
          environment: "local",
          status: "fixed",
          severity: "sev3",
          source: "local-log",
          symptom:
            "Runtime client error was already investigated behind synthetic test logs.",
          route: "/workshop/projects",
          event: "client_error",
          errorClass: "ReferenceError",
          errorCode: "RUNTIME_ONLY",
          rootCause: "A stale client bundle loaded a removed menu module.",
          fixSummary:
            "Rebuilt the dev app and verified project page client runtime.",
          validation: ["bun run type-check"],
        }),
        ledgerPath,
      );

      const report = buildAgentDebuggingSnapshotReport({
        generatedAt: "2026-07-08T00:05:00.000Z",
        logPath,
        debuggingLedgerPath: ledgerPath,
        errorHandlingReport: READY_ERROR_HANDLING,
        incidentReport: READY_INCIDENTS,
        hostedProofEnvReport: MISSING_HOSTED_ENV,
        hostedProofRouteReport: READY_ROUTE,
        productionObservabilityReport: MISSING_PRODUCTION_PROOF,
      });

      expect(report.localLogs.latestError).toMatchObject({
        origin: "test",
        route: "/api/share/[token]/decision",
      });
      expect(report.localLogs.latestRuntimeError).toMatchObject({
        recordId: "rec_runtime",
        origin: "runtime",
      });
      expect(report.debuggingLedger.matchingLatestErrorCount).toBe(0);
      expect(report.debuggingLedger.matchingLatestRuntimeErrorCount).toBe(1);
      expect(report.debuggingLedger.latestRuntimeErrorRecurrenceKey).toBe(
        buildDebuggingRecurrenceKey({
          environment: "local",
          route: "/workshop/projects",
          event: "client_error",
          errorClass: "ReferenceError",
          errorCode: "RUNTIME_ONLY",
        }),
      );
      expect(
        report.debuggingLedger.latestRuntimeErrorMatchSummary,
      ).toMatchObject({
        hasMatches: true,
        total: 1,
        statusCounts: {
          fixed: 1,
        },
        latest: {
          id: "debug-runtime-candidate-fixed",
          status: "fixed",
          fixSummary:
            "Rebuilt the dev app and verified project page client runtime.",
          validation: ["bun run type-check"],
        },
      });
      expect(report.debuggingLedger.recentRuntimeMatches[0]).toMatchObject({
        id: "debug-runtime-candidate-fixed",
        status: "fixed",
      });
      expect(report.recommendedNextSteps).toContain(
        "Review `debuggingLedger.latestRuntimeErrorMatchSummary.latest` before chasing `localLogs.latestRuntimeError`; this runtime fingerprint was previously fixed, so rerun its recorded validation before starting a new fix branch.",
      );
      expect(report.recommendedNextSteps).not.toContain(
        "If `localLogs.latestRuntimeError` becomes the active investigation, append the eventual redacted `ops:debug-ledger` record using `debuggingLedger.latestRuntimeErrorRecurrenceKey`.",
      );
      expect(JSON.stringify(report)).not.toMatch(
        /Bearer |token=|client@example\.com|Module\.POST/i,
      );
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it("marks stale local errors so agents do not treat old logs as current evidence", () => {
    const { dir, logPath } = tempLog(
      `${JSON.stringify({
        record_id: "rec_stale",
        timestamp: "2026-07-06T00:00:00.000Z",
        level: "ERROR",
        event: "client_error",
        context: { route: "/workshop/projects" },
        error: {
          class: "ReferenceError",
          code: "OLD_CLIENT_ERROR",
        },
        tainted_fields: [],
      })}\n`,
    );
    try {
      const report = buildAgentDebuggingSnapshotReport({
        generatedAt: "2026-07-08T12:00:00.000Z",
        logPath,
        errorHandlingReport: READY_ERROR_HANDLING,
        incidentReport: READY_INCIDENTS,
        hostedProofEnvReport: MISSING_HOSTED_ENV,
        hostedProofRouteReport: READY_ROUTE,
        productionObservabilityReport: MISSING_PRODUCTION_PROOF,
      });

      expect(report.localLogs.latestError).toMatchObject({
        recordId: "rec_stale",
        ageMinutes: 3_600,
        freshness: "stale",
        origin: "runtime",
      });
      expect(report.localLogs.latestRuntimeError).toEqual(
        report.localLogs.latestError,
      );
      expect(report.recommendedNextSteps).toContain(
        "Latest local error is older than 24h; reproduce or observe a fresh failure before treating it as current root-cause evidence.",
      );
      expect(report.recommendedNextSteps).not.toContain(
        "Run `bun run logs:debug` or `bun run logs:explain <record_id>` for the latest local error record before changing code.",
      );
      expect(JSON.stringify(report)).not.toMatch(
        /Bearer |token=|client@example\.com/i,
      );
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it("surfaces hosted proof failed check labels without copying proof contents", () => {
    const { dir, logPath } = tempLog("");
    try {
      const report = buildAgentDebuggingSnapshotReport({
        logPath,
        errorHandlingReport: READY_ERROR_HANDLING,
        incidentReport: READY_INCIDENTS,
        hostedProofEnvReport: MISSING_HOSTED_ENV,
        hostedProofRouteReport: READY_ROUTE,
        productionObservabilityReport: FAILED_PRODUCTION_PROOF,
      });

      expect(
        report.hostedProof.requirements.find(
          (requirement) => requirement.key === "workersLogsQuery",
        ),
      ).toEqual({
        key: "workersLogsQuery",
        status: "failed",
        artifact: ".ai/03_plans/example/evidence/workers-logs-query-proof.json",
        failedChecks: ["artifact-producer-script", "artifact-within-max-age"],
        nextAction: "test",
      });
      expect(report.recommendedNextSteps).toContain(
        "Review `hostedProof.requirements` failedChecks for stale, wrong-producer, unredacted, or invalid hosted proof artifacts before recollecting evidence.",
      );
      expect(JSON.stringify(report)).not.toMatch(
        /Bearer |secret-token|req_internal-123|alerts\.example\.test/i,
      );
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
        hostedProofRouteReport: READY_ROUTE,
        productionObservabilityReport: MISSING_PRODUCTION_PROOF,
      });

      expect(malformed.localLogs.malformedLines).toBe(1);
      expect(malformed.readiness.localDebuggingReady).toBe(false);
      expect(malformed.readinessGates.local.ready).toBe(false);
      expect(
        malformed.readinessGates.local.failures.map((failure) => failure.key),
      ).toEqual(["localLogsMalformed"]);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }

    const missing = buildLocalLogSnapshot(
      "/tmp/archestimator-definitely-missing-dev-log.ndjson",
    );
    expect(missing).toMatchObject({
      exists: false,
      parsedRecords: 0,
      latestErrorStaleAfterHours: 24,
      latestError: null,
      latestRuntimeError: null,
    });
  });

  it("computes strict and production-required snapshot exit codes", () => {
    const { dir, logPath } = tempLog("");
    try {
      const locallyReadyProductionIncomplete =
        buildAgentDebuggingSnapshotReport({
          logPath,
          errorHandlingReport: READY_ERROR_HANDLING,
          incidentReport: READY_INCIDENTS,
          hostedProofEnvReport: MISSING_HOSTED_ENV,
          hostedProofRouteReport: READY_ROUTE,
          productionObservabilityReport: MISSING_PRODUCTION_PROOF,
          alertScenarioReport: READY_ALERT_SCENARIOS,
          supportMonitoringReport: MISSING_SUPPORT_MONITORING,
        });

      expect(
        locallyReadyProductionIncomplete.readiness.localDebuggingReady,
      ).toBe(true);
      expect(
        locallyReadyProductionIncomplete.readiness
          .productionEvidenceCollectionReady,
      ).toBe(false);
      expect(
        agentDebuggingSnapshotExitCode(locallyReadyProductionIncomplete, {}),
      ).toBe(0);
      expect(
        agentDebuggingSnapshotExitCode(locallyReadyProductionIncomplete, {
          AGENT_DEBUG_SNAPSHOT_STRICT: "1",
        }),
      ).toBe(0);
      expect(
        agentDebuggingSnapshotExitCode(locallyReadyProductionIncomplete, {
          AGENT_DEBUG_SNAPSHOT_REQUIRE_PRODUCTION: "true",
        }),
      ).toBe(1);

      const productionReady = buildAgentDebuggingSnapshotReport({
        logPath,
        errorHandlingReport: READY_ERROR_HANDLING,
        incidentReport: READY_INCIDENTS,
        hostedProofEnvReport: READY_HOSTED_ENV,
        hostedProofRouteReport: READY_ROUTE,
        productionObservabilityReport: READY_PRODUCTION_PROOF,
        alertScenarioReport: READY_ALERT_SCENARIOS,
        supportMonitoringReport: READY_SUPPORT_MONITORING,
      });

      expect(
        agentDebuggingSnapshotExitCode(productionReady, {
          AGENT_DEBUG_SNAPSHOT_REQUIRE_PRODUCTION: "true",
        }),
      ).toBe(0);

      const staleIncidentReport = buildAgentDebuggingSnapshotReport({
        logPath,
        errorHandlingReport: READY_ERROR_HANDLING,
        incidentReport: {
          ...READY_INCIDENTS,
          staleIncidents: [
            {
              id: "inc_stale",
              severity: "sev2",
              status: "open",
              declaredAt: "2026-07-07T00:00:00.000Z",
              ageHours: 25,
              resolveSlaHours: 24,
            },
          ],
          missing: ["stale_incident:inc_stale"],
          readiness: {
            ...READY_INCIDENTS.readiness,
            noStaleIncidents: false,
            operationalIncidentsReady: false,
          },
        },
        hostedProofEnvReport: READY_HOSTED_ENV,
        hostedProofRouteReport: READY_ROUTE,
        productionObservabilityReport: READY_PRODUCTION_PROOF,
        alertScenarioReport: READY_ALERT_SCENARIOS,
        supportMonitoringReport: READY_SUPPORT_MONITORING,
      });

      expect(
        staleIncidentReport.readinessGates.production.failures.map(
          (failure) => failure.key,
        ),
      ).toEqual(["operationalIncidents"]);
      expect(
        agentDebuggingSnapshotExitCode(staleIncidentReport, {
          AGENT_DEBUG_SNAPSHOT_REQUIRE_PRODUCTION: "true",
        }),
      ).toBe(1);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }

    const malformed = tempLog("not json\n");
    try {
      const locallyBlocked = buildAgentDebuggingSnapshotReport({
        logPath: malformed.logPath,
        errorHandlingReport: READY_ERROR_HANDLING,
        incidentReport: READY_INCIDENTS,
        hostedProofEnvReport: READY_HOSTED_ENV,
        hostedProofRouteReport: READY_ROUTE,
        productionObservabilityReport: READY_PRODUCTION_PROOF,
        alertScenarioReport: READY_ALERT_SCENARIOS,
        supportMonitoringReport: READY_SUPPORT_MONITORING,
      });

      expect(locallyBlocked.readiness.localDebuggingReady).toBe(false);
      expect(
        agentDebuggingSnapshotExitCode(locallyBlocked, {
          AGENT_DEBUG_SNAPSHOT_STRICT: "true",
        }),
      ).toBe(1);
    } finally {
      rmSync(malformed.dir, { recursive: true, force: true });
    }
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
        hostedProofRouteReport: READY_ROUTE,
        productionObservabilityReport: MISSING_PRODUCTION_PROOF,
      });

      expect(report.errorHandling.violationCount).toBe(1);
      expect(report.incidents.staleIncidentCount).toBe(1);
      expect(report.recommendedNextSteps).toContain(
        "Run `bun run validate:error-handling` and fix silent catch violations before claiming error-handling readiness.",
      );
      expect(report.recommendedNextSteps).toContain(
        "Run `bun run ops:check-incidents` and resolve missing/stale operational incident readiness items.",
      );
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
        hostedProofRouteReport: READY_ROUTE,
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
    const { dir, logPath } = tempLog(
      `${JSON.stringify({
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
      })}\n`,
    );
    try {
      const ledgerPath = join(dir, "debugging-ledger.ndjson");
      appendDebuggingSessionLedgerRecord(
        buildDebuggingSessionLedgerRecord({
          id: "debug-recurring-context-menu",
          generatedAt: "2026-07-08T00:00:00.000Z",
          environment: "local",
          status: "fixed",
          severity: "sev3",
          source: "local-log",
          symptom:
            "Project page client error from missing context menu primitive.",
          route: "/workshop/projects",
          event: "client_error",
          errorClass: "ReferenceError",
          errorCode: "CONTEXT_MENU_CONTENT",
          rootCause:
            "The dropdown primitive import was lost during menu consolidation.",
          fixSummary: "Restored the import and covered project-page rendering.",
          validation: ["bun run type-check"],
        }),
        ledgerPath,
      );

      const report = buildAgentDebuggingSnapshotReport({
        logPath,
        debuggingLedgerPath: ledgerPath,
        errorHandlingReport: READY_ERROR_HANDLING,
        incidentReport: READY_INCIDENTS,
        hostedProofEnvReport: MISSING_HOSTED_ENV,
        hostedProofRouteReport: READY_ROUTE,
        productionObservabilityReport: MISSING_PRODUCTION_PROOF,
      });

      expect(report.debuggingLedger.matchingLatestErrorCount).toBe(1);
      expect(report.debuggingLedger.latestErrorRecurrenceKey).toBe(
        buildDebuggingRecurrenceKey({
          environment: "local",
          route: "/workshop/projects",
          event: "client_error",
          errorClass: "ReferenceError",
          errorCode: "CONTEXT_MENU_CONTENT",
        }),
      );
      expect(report.debuggingLedger.recentMatches[0]).toMatchObject({
        id: "debug-recurring-context-menu",
        status: "fixed",
        fixSummary: "Restored the import and covered project-page rendering.",
      });
      expect(report.debuggingLedger.latestErrorMatchSummary).toMatchObject({
        hasMatches: true,
        total: 1,
        statusCounts: {
          fixed: 1,
        },
        latest: {
          id: "debug-recurring-context-menu",
          status: "fixed",
          fixSummary: "Restored the import and covered project-page rendering.",
          validation: ["bun run type-check"],
        },
      });
      expect(report.recommendedNextSteps).toContain(
        "Review `debuggingLedger.latestErrorMatchSummary.latest` before changing code; this fingerprint was previously fixed, so rerun its recorded validation before starting a new fix branch.",
      );
      expect(JSON.stringify(report)).not.toMatch(
        /Bearer |token=|client@example\.com/i,
      );
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
        hostedProofEnvReport: READY_HOSTED_ENV,
        hostedProofRouteReport: READY_ROUTE,
        productionObservabilityReport: READY_PRODUCTION_PROOF,
        alertScenarioReport: READY_ALERT_SCENARIOS,
        supportMonitoringReport: READY_SUPPORT_MONITORING,
      });

      expect(report.hostedProof.productionObservabilityReady).toBe(true);
      expect(report.alertScenarios.productionAlertProducerReady).toBe(true);
      expect(report.readiness.productionEvidenceCollectionReady).toBe(true);
      expect(report.readiness.productionIncidentAlertingReady).toBe(true);
      expect(report.readiness.productionAlertScenarioProducerReady).toBe(true);
      expect(report.readiness.productionHostedProofReady).toBe(true);
      expect(report.readiness.supportMonitoringReady).toBe(true);
      expect(report.supportMonitoring).toMatchObject({
        ready: true,
        summary: {
          passed: 11,
          missing: 0,
          failed: 0,
        },
        ownerLabels: {
          supportOwnerPresent: true,
          alertOwnerPresent: true,
          first24HourReviewOwnerPresent: true,
          first72HourReviewOwnerPresent: true,
        },
      });
      expect(
        report.supportMonitoring.requirements.every(
          (requirement) => requirement.status === "passed",
        ),
      ).toBe(true);
      expect(report.observabilityRunbook.summary).toEqual({
        passed: 11,
        readOnlyReady: 0,
        gatedExternalReady: 0,
        blocked: 0,
      });
      expect(report.recommendedNextSteps).not.toContain(
        "Run `bun run ops:check-observability` and collect missing hosted proof artifacts for: unknown.",
      );
      expect(
        report.recommendedNextSteps.some((step) =>
          step.includes("ops:check-alert-scenarios"),
        ),
      ).toBe(false);
      expect(
        report.recommendedNextSteps.some((step) =>
          step.includes("launch:check-support-monitoring"),
        ),
      ).toBe(false);
      expect(JSON.stringify(report)).not.toMatch(
        /Philip \/ Support|Philip \/ Alerts|Philip \/ Day/i,
      );
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});
