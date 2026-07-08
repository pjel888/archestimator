import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import type { ObservabilityProofEnvReport } from "@/../scripts/check-observability-proof-env";
import type { ProductionObservabilityProofReport } from "@/../scripts/check-production-observability-proof";
import {
  buildObservabilityProofDrillReport,
  formatObservabilityProofDrillSummary,
  writeObservabilityProofDrillReport,
} from "@/../scripts/run-observability-proof-drill";

const WORKERS_LOGS_EITHER_OR_KEY =
  "WORKERS_LOGS_PROOF_REQUEST_ID+WORKERS_LOGS_PROOF_ROUTE or WORKERS_LOGS_PROOF_URL+WORKERS_LOGS_PROOF_SECRET";

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
        { key: WORKERS_LOGS_EITHER_OR_KEY, required: true, passed: false, detail: "missing" },
      ],
    },
    {
      key: "alertDeliveryProof",
      ready: false,
      checks: [
        { key: "OBSERVABILITY_ALERT_DELIVERY_PROOF", required: true, passed: false, detail: "missing" },
        { key: "OBSERVABILITY_ALERT_WEBHOOK_URL", required: true, passed: false, detail: "missing" },
      ],
    },
    {
      key: "operationalIncidentAlerts",
      ready: false,
      checks: [
        { key: "OPERATIONAL_INCIDENT_ALERTS_ENABLED", required: true, passed: false, detail: "missing" },
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
    checks: group.checks.map((check) => ({ ...check, passed: true, detail: "present" })),
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
    required: 4,
    passed: 0,
    failed: 0,
    missing: 4,
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
    },
    {
      key: "uptimeAlertDelivery",
      label: "Hosted uptime alert delivery proof",
      status: "missing",
      artifact: null,
      checks: [],
      failedChecks: ["missing:uptime-alert-delivery-proof.json"],
      note: "test",
    },
    {
      key: "errorRateAlertDelivery",
      label: "Hosted error-rate alert delivery proof",
      status: "missing",
      artifact: null,
      checks: [],
      failedChecks: ["missing:error-rate-alert-delivery-proof.json"],
      note: "test",
    },
    {
      key: "incidentEscalationDelivery",
      label: "Hosted incident-escalation alert delivery proof",
      status: "missing",
      artifact: null,
      checks: [],
      failedChecks: ["missing:incident-escalation-alert-delivery-proof.json"],
      note: "test",
    },
  ],
  failedRequirementKeys: [
    "workersLogsQuery",
    "uptimeAlertDelivery",
    "errorRateAlertDelivery",
    "incidentEscalationDelivery",
  ],
  note: "test",
};

const READY_PRODUCTION_PROOF: ProductionObservabilityProofReport = {
  ...MISSING_PRODUCTION_PROOF,
  passed: true,
  productionObservabilityReady: true,
  totals: {
    required: 4,
    passed: 4,
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

describe("observability proof drill", () => {
  it("fails closed without hosted env gates or proof artifacts and prints no secret values", () => {
    const report = buildObservabilityProofDrillReport({
      generatedAt: "2026-07-08T00:00:00.000Z",
      envReport: MISSING_ENV,
      productionReport: MISSING_PRODUCTION_PROOF,
    });

    expect(report.passed).toBe(false);
    expect(report.readOnly).toBe(true);
    expect(report.externalSideEffectsPerformed).toBe(false);
    expect(report.readiness).toMatchObject({
      hostedProofCollectionReady: false,
      operationalIncidentAlertsReady: false,
      productionHostedProofReady: false,
    });
    expect(report.actions.find((action) => action.key === "workersLogsQuery")).toMatchObject({
      status: "blocked",
      sideEffectWhenRun: "queries-cloudflare-logs",
    });
    expect(report.actions.find((action) => action.key === "uptimeAlertDelivery")).toMatchObject({
      status: "blocked",
      sideEffectWhenRun: "sends-synthetic-alert",
    });

    const summary = formatObservabilityProofDrillSummary(report, "/tmp/drill.json");
    expect(summary[0]).toBe("Observability proof drill failed; output=/tmp/drill.json");
    expect(summary).toContain("Read-only: no Cloudflare query, webhook send, or incident mutation was performed.");
    expect(summary.some((line) => line.includes("WORKERS_LOGS_PROOF_URL"))).toBe(true);
    expect(JSON.stringify(report)).not.toMatch(/secret-token|alerts\.example\.test|req_internal-123/i);
  });

  it("marks proof commands ready when env gates are ready but artifacts are missing", () => {
    const report = buildObservabilityProofDrillReport({
      envReport: READY_ENV,
      productionReport: MISSING_PRODUCTION_PROOF,
    });

    expect(report.passed).toBe(false);
    expect(report.readiness.hostedProofCollectionReady).toBe(true);
    expect(report.actions.find((action) => action.key === "workersLogsQuery")).toMatchObject({
      status: "ready-to-run",
      command: "WORKERS_LOGS_PROOF_URL=<https_observability_proof_url> WORKERS_LOGS_PROOF_SECRET=<cron_secret> bun run ops:collect-workers-logs-proof",
    });
    expect(report.actions.find((action) => action.key === "incidentEscalationDelivery")).toMatchObject({
      status: "ready-to-run",
      command: "bun run ops:verify-observability-alert -- --scenario incident-escalation",
    });
  });

  it("passes only when env gates and hosted proof artifacts are ready", () => {
    const report = buildObservabilityProofDrillReport({
      envReport: READY_ENV,
      productionReport: READY_PRODUCTION_PROOF,
    });

    expect(report.passed).toBe(true);
    expect(report.hostedProof.failedRequirementKeys).toEqual([]);
    expect(formatObservabilityProofDrillSummary(report)).toEqual([
      "Observability proof drill passed",
      "Read-only: no Cloudflare query, webhook send, or incident mutation was performed.",
      "Env readiness: hostedProofCollectionReady=true; operationalIncidentAlertsReady=true",
      "Hosted proof: passed=4/4; failed=none",
    ]);
  });

  it("writes a sanitized drill artifact", () => {
    const report = buildObservabilityProofDrillReport({
      envReport: READY_ENV,
      productionReport: MISSING_PRODUCTION_PROOF,
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
