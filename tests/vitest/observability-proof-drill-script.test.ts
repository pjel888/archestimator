import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import type { ObservabilityProofEnvReport } from "@/../scripts/check-observability-proof-env";
import type { ObservabilityProofRouteSmokeReport } from "@/../scripts/check-observability-proof-route";
import type { ProductionObservabilityProofReport } from "@/../scripts/check-production-observability-proof";
import {
  buildObservabilityProofDrillReport,
  formatObservabilityProofDrillSummary,
  writeObservabilityProofDrillReport,
} from "@/../scripts/run-observability-proof-drill";

const WORKERS_LOGS_EITHER_OR_KEY =
  "WORKERS_LOGS_PROOF_REQUEST_ID+WORKERS_LOGS_PROOF_ROUTE or WORKERS_LOGS_PROOF_URL+WORKERS_LOGS_PROOF_SECRET";

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

const MISSING_ENV: ObservabilityProofEnvReport = {
  generatedAt: "2026-07-08T00:00:00.000Z",
  mode: "observability-proof-env-preflight",
  proofBoundary: "non-secret-env-preflight",
  passed: false,
  hostedProofCollectionReady: false,
  operationalIncidentAlertsReady: false,
  groups: [
    {
      key: "workersLogsProof",
      ready: false,
      checks: [
        {
          key: WORKERS_LOGS_EITHER_OR_KEY,
          required: true,
          passed: false,
          detail: "missing",
        },
      ],
    },
    {
      key: "alertDeliveryProof",
      ready: false,
      checks: [
        {
          key: "OBSERVABILITY_ALERT_DELIVERY_PROOF",
          required: true,
          passed: false,
          detail: "missing",
        },
        {
          key: "OBSERVABILITY_ALERT_WEBHOOK_URL",
          required: true,
          passed: false,
          detail: "missing",
        },
      ],
    },
    {
      key: "operationalIncidentAlerts",
      ready: false,
      checks: [
        {
          key: "OPERATIONAL_INCIDENT_ALERTS_ENABLED",
          required: true,
          passed: false,
          detail: "missing",
        },
      ],
    },
  ],
  missingRequiredEnv: [
    WORKERS_LOGS_EITHER_OR_KEY,
    "OBSERVABILITY_ALERT_DELIVERY_PROOF",
    "OBSERVABILITY_ALERT_WEBHOOK_URL",
    "OPERATIONAL_INCIDENT_ALERTS_ENABLED",
  ],
  invalidRequiredEnv: [],
  advisory: ["Cloudflare credential env hints are missing."],
  note: "test",
};

const READY_ENV: ObservabilityProofEnvReport = {
  ...MISSING_ENV,
  passed: true,
  hostedProofCollectionReady: true,
  operationalIncidentAlertsReady: true,
  groups: MISSING_ENV.groups.map((group) => ({
    ...group,
    ready: true,
    checks: group.checks.map((check) => ({
      ...check,
      passed: true,
      detail: "present",
    })),
  })),
  missingRequiredEnv: [],
  advisory: [],
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
  requirements: [
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
  ],
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
  requirements: MISSING_PRODUCTION_PROOF.requirements.map((requirement) => ({
    ...requirement,
    status: "passed",
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
  requirements: MISSING_PRODUCTION_PROOF.requirements.map((requirement) => {
    if (requirement.key !== "workersLogsQuery") {
      return {
        ...requirement,
        status: "passed" as const,
        artifact: `.ai/03_plans/example/evidence/${requirement.key}.json`,
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

describe("observability proof drill", () => {
  it("fails closed without hosted env gates or proof artifacts and prints no secret values", () => {
    const report = buildObservabilityProofDrillReport({
      generatedAt: "2026-07-08T00:00:00.000Z",
      envReport: MISSING_ENV,
      productionReport: MISSING_PRODUCTION_PROOF,
      hostedProofRouteReport: ROUTE_NOT_FOUND,
    });

    expect(report.passed).toBe(false);
    expect(report.readOnly).toBe(true);
    expect(report.externalSideEffectsPerformed).toBe(false);
    expect(report.readiness).toMatchObject({
      hostedProofCollectionReady: false,
      hostedProofRouteReady: false,
      operationalIncidentAlertsReady: false,
      productionHostedProofReady: false,
    });
    expect(report.hostedProofRoute).toMatchObject({
      present: true,
      routeStatus: "route-not-found",
      httpStatus: 404,
      readyForWorkersLogsProof: false,
    });
    expect(
      report.actions.find((action) => action.key === "hostedProofRoute"),
    ).toMatchObject({
      status: "blocked",
      sideEffectWhenRun: "queries-hosted-route",
    });
    expect(
      report.actions.find((action) => action.key === "workersLogsQuery"),
    ).toMatchObject({
      status: "blocked",
      sideEffectWhenRun: "queries-cloudflare-logs",
    });
    expect(
      report.actions.find((action) => action.key === "uptimeAlertDelivery"),
    ).toMatchObject({
      status: "blocked",
      sideEffectWhenRun: "sends-synthetic-alert",
    });
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
    expect(report.executionPlan.summary).toEqual({
      passed: 0,
      readOnlyReady: 2,
      gatedExternalReady: 0,
      blocked: 9,
    });
    expect(report.executionPlan.readOnlyReady.map((step) => step.key)).toEqual([
      "envPreflight",
      "productionProofCheck",
    ]);
    expect(
      report.executionPlan.blocked.find(
        (step) => step.key === "hostedProofRoute",
      ),
    ).toMatchObject({
      phase: "hosted-route-smoke",
      sideEffectWhenRun: "queries-hosted-route",
    });
    expect(
      report.executionPlan.blocked.find(
        (step) => step.key === "workersLogsQuery",
      ),
    ).toMatchObject({
      phase: "collect-workers-logs-proof",
      sideEffectWhenRun: "queries-cloudflare-logs",
    });
    expect(report.executionPlan.safetyNote).toContain(
      "Only readOnlyReady steps are side-effect-free.",
    );

    const summary = formatObservabilityProofDrillSummary(
      report,
      "/tmp/drill.json",
    );
    expect(summary[0]).toBe(
      "Observability proof drill failed; output=/tmp/drill.json",
    );
    expect(summary).toContain(
      "Read-only: no Cloudflare query, webhook send, or incident mutation was performed.",
    );
    expect(summary).toContain(
      "Runbook: read-only ready=2; gated external ready=0; blocked=9",
    );
    expect(
      summary.some((line) => line.includes("ops:check-observability-route")),
    ).toBe(true);
    expect(JSON.stringify(report)).not.toMatch(
      /secret-token|alerts\.example\.test|req_internal-123/i,
    );
  });

  it("marks proof commands ready when env gates are ready but artifacts are missing", () => {
    const report = buildObservabilityProofDrillReport({
      envReport: READY_ENV,
      productionReport: MISSING_PRODUCTION_PROOF,
      hostedProofRouteReport: READY_ROUTE,
    });

    expect(report.passed).toBe(false);
    expect(report.readiness.hostedProofCollectionReady).toBe(true);
    expect(
      report.actions.find((action) => action.key === "workersLogsQuery"),
    ).toMatchObject({
      status: "ready-to-run",
      command:
        "WORKERS_LOGS_PROOF_URL=<https_observability_proof_url> WORKERS_LOGS_PROOF_SECRET=<cron_secret> bun run ops:collect-workers-logs-proof",
      reason:
        "Hosted Workers Logs proof status is missing; collect a fresh redacted proof-marker artifact. failedChecks=missing:workers-logs-query-proof.json.",
    });
    expect(
      report.actions.find(
        (action) => action.key === "incidentEscalationDelivery",
      ),
    ).toMatchObject({
      status: "ready-to-run",
      command:
        "bun run ops:verify-observability-alert -- --scenario incident-escalation",
    });
    expect(
      report.actions.find((action) => action.key === "queueDlqAlertDelivery"),
    ).toMatchObject({
      status: "ready-to-run",
      command: "bun run ops:verify-observability-alert -- --scenario queue-dlq",
      reason:
        "queue-dlq alert-delivery proof status is missing; run the explicitly gated synthetic alert probe. failedChecks=missing:queue-dlq-alert-delivery-proof.json.",
    });
    expect(
      report.actions.find(
        (action) => action.key === "retentionFailureAlertDelivery",
      ),
    ).toMatchObject({
      status: "ready-to-run",
      command:
        "bun run ops:verify-observability-alert -- --scenario retention-failure",
    });
    expect(report.executionPlan.summary).toEqual({
      passed: 3,
      readOnlyReady: 1,
      gatedExternalReady: 7,
      blocked: 0,
    });
    expect(
      report.executionPlan.gatedExternalReady.map((step) => step.key),
    ).toEqual([
      "workersLogsQuery",
      "uptimeAlertDelivery",
      "errorRateAlertDelivery",
      "queueDlqAlertDelivery",
      "cronFailureAlertDelivery",
      "incidentEscalationDelivery",
      "retentionFailureAlertDelivery",
    ]);
    expect(formatObservabilityProofDrillSummary(report)).toContain(
      "Runbook: read-only ready=1; gated external ready=7; blocked=0",
    );
  });

  it("includes failed check labels when hosted proof artifacts exist but fail validation", () => {
    const report = buildObservabilityProofDrillReport({
      envReport: READY_ENV,
      productionReport: FAILED_PRODUCTION_PROOF,
      hostedProofRouteReport: READY_ROUTE,
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
    expect(
      report.actions.find((action) => action.key === "workersLogsQuery"),
    ).toMatchObject({
      status: "ready-to-run",
      reason:
        "Hosted Workers Logs proof status is failed; collect a fresh redacted proof-marker artifact. failedChecks=artifact-producer-script, artifact-within-max-age.",
    });
    expect(report.executionPlan.summary).toEqual({
      passed: 9,
      readOnlyReady: 1,
      gatedExternalReady: 1,
      blocked: 0,
    });
    expect(report.executionPlan.gatedExternalReady[0]).toMatchObject({
      key: "workersLogsQuery",
      phase: "collect-workers-logs-proof",
    });
    expect(JSON.stringify(report)).not.toMatch(
      /Bearer |secret-token|req_internal-123|alerts\.example\.test/i,
    );
  });

  it("passes only when env gates and hosted proof artifacts are ready", () => {
    const report = buildObservabilityProofDrillReport({
      envReport: READY_ENV,
      productionReport: READY_PRODUCTION_PROOF,
      hostedProofRouteReport: READY_ROUTE,
    });

    expect(report.passed).toBe(true);
    expect(report.hostedProof.failedRequirementKeys).toEqual([]);
    expect(report.executionPlan.summary).toEqual({
      passed: 11,
      readOnlyReady: 0,
      gatedExternalReady: 0,
      blocked: 0,
    });
    expect(formatObservabilityProofDrillSummary(report)).toEqual([
      "Observability proof drill passed",
      "Read-only: no Cloudflare query, webhook send, or incident mutation was performed.",
      "Env readiness: hostedProofCollectionReady=true; operationalIncidentAlertsReady=true",
      "Hosted proof route: readyForWorkersLogsProof=true; routeStatus=auth-enforced; httpStatus=401",
      "Hosted proof: passed=7/7; failed=none",
    ]);
  });

  it("writes a sanitized drill artifact", () => {
    const report = buildObservabilityProofDrillReport({
      envReport: READY_ENV,
      productionReport: MISSING_PRODUCTION_PROOF,
      hostedProofRouteReport: READY_ROUTE,
    });
    const dir = mkdtempSync(join(tmpdir(), "observability-proof-drill-"));
    try {
      const output = join(dir, "drill.json");
      writeObservabilityProofDrillReport(report, output);
      const saved = readFileSync(output, "utf8");

      expect(JSON.parse(saved)).toEqual(report);
      expect(saved).not.toMatch(/Bearer |secret-token|alerts\.example\.test/i);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});
