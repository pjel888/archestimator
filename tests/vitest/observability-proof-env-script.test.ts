import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import {
  buildObservabilityProofEnvReport,
  writeObservabilityProofEnvReport,
} from "@/../scripts/check-observability-proof-env";

const WORKERS_LOGS_EITHER_OR_KEY =
  "WORKERS_LOGS_PROOF_REQUEST_ID+WORKERS_LOGS_PROOF_ROUTE or WORKERS_LOGS_PROOF_URL+WORKERS_LOGS_PROOF_SECRET";

describe("observability proof env preflight", () => {
  it("fails closed without hosted proof env gates and does not expose values", () => {
    const report = buildObservabilityProofEnvReport({
      generatedAt: "2026-07-08T00:00:00.000Z",
      env: {},
    });

    expect(report.passed).toBe(false);
    expect(report.hostedProofCollectionReady).toBe(false);
    expect(report.operationalIncidentAlertsReady).toBe(false);
    expect(report.missingRequiredEnv).toEqual([
      WORKERS_LOGS_EITHER_OR_KEY,
      "OBSERVABILITY_ALERT_DELIVERY_PROOF",
      "OBSERVABILITY_ALERT_DELIVERY_HOSTED_OBSERVED",
      "OBSERVABILITY_ALERT_WEBHOOK_URL",
      "OBSERVABILITY_ALERT_WEBHOOK_TOKEN",
      "OPERATIONAL_INCIDENT_ALERTS_ENABLED",
      "OPERATIONAL_INCIDENT_ALERT_WEBHOOK_URL",
      "OPERATIONAL_INCIDENT_ALERT_WEBHOOK_TOKEN",
    ]);
    expect(JSON.stringify(report)).not.toMatch(/token-value|alerts\.example\.test/i);
  });

  it("passes with safe hosted proof and incident alert env shapes", () => {
    const report = buildObservabilityProofEnvReport({
      generatedAt: "2026-07-08T00:00:00.000Z",
      env: {
        WORKERS_LOGS_PROOF_REQUEST_ID: "req_internal-123",
        WORKERS_LOGS_PROOF_ROUTE: "/workshop/projects",
        CLOUDFLARE_API_TOKEN: "cloudflare-token-value",
        CLOUDFLARE_ACCOUNT_ID: "account-id",
        OBSERVABILITY_ALERT_DELIVERY_PROOF: "1",
        OBSERVABILITY_ALERT_DELIVERY_HOSTED_OBSERVED: "1",
        OBSERVABILITY_ALERT_WEBHOOK_URL: "https://alerts.example.test/observability",
        OBSERVABILITY_ALERT_WEBHOOK_TOKEN: "observability-token-value",
        OPERATIONAL_INCIDENT_ALERTS_ENABLED: "1",
        OPERATIONAL_INCIDENT_ALERT_WEBHOOK_URL: "https://alerts.example.test/incidents",
        OPERATIONAL_INCIDENT_ALERT_WEBHOOK_TOKEN: "incident-token-value",
      },
    });

    expect(report.passed).toBe(true);
    expect(report.missingRequiredEnv).toEqual([]);
    expect(report.invalidRequiredEnv).toEqual([]);
    expect(JSON.stringify(report)).not.toMatch(/cloudflare-token-value|observability-token-value|incident-token-value|alerts\.example\.test/i);
  });

  it("passes Workers Logs proof preflight with a trigger URL and local proof secret", () => {
    const report = buildObservabilityProofEnvReport({
      generatedAt: "2026-07-08T00:00:00.000Z",
      env: {
        WORKERS_LOGS_PROOF_URL: "https://archestimator.com/__cloudflare/observability-proof",
        WORKERS_LOGS_PROOF_SECRET: "cron-secret-value",
        OBSERVABILITY_ALERT_DELIVERY_PROOF: "1",
        OBSERVABILITY_ALERT_DELIVERY_HOSTED_OBSERVED: "1",
        OBSERVABILITY_ALERT_WEBHOOK_URL: "https://alerts.example.test/observability",
        OBSERVABILITY_ALERT_WEBHOOK_TOKEN: "observability-token-value",
        OPERATIONAL_INCIDENT_ALERTS_ENABLED: "1",
        OPERATIONAL_INCIDENT_ALERT_WEBHOOK_URL: "https://alerts.example.test/incidents",
        OPERATIONAL_INCIDENT_ALERT_WEBHOOK_TOKEN: "incident-token-value",
      },
    });

    expect(report.passed).toBe(true);
    expect(report.groups.find((group) => group.key === "workersLogsProof")?.checks[0]).toMatchObject({
      key: WORKERS_LOGS_EITHER_OR_KEY,
      passed: true,
      detail: "trigger-url-ready",
    });
    expect(JSON.stringify(report)).not.toMatch(/cron-secret-value|archestimator\.com|alerts\.example\.test/i);
  });

  it("rejects unsafe request ids and non-https webhook URLs without echoing them", () => {
    const report = buildObservabilityProofEnvReport({
      generatedAt: "2026-07-08T00:00:00.000Z",
      env: {
        WORKERS_LOGS_PROOF_REQUEST_ID: "req unsafe",
        WORKERS_LOGS_PROOF_ROUTE: "/workshop/projects",
        OBSERVABILITY_ALERT_DELIVERY_PROOF: "yes",
        OBSERVABILITY_ALERT_DELIVERY_HOSTED_OBSERVED: "1",
        OBSERVABILITY_ALERT_WEBHOOK_URL: "http://alerts.example.test/observability",
        OBSERVABILITY_ALERT_WEBHOOK_TOKEN: "observability-token-value",
        OPERATIONAL_INCIDENT_ALERTS_ENABLED: "1",
        OPERATIONAL_INCIDENT_ALERT_WEBHOOK_URL: "not a url",
        OPERATIONAL_INCIDENT_ALERT_WEBHOOK_TOKEN: "incident-token-value",
      },
    });

    expect(report.passed).toBe(false);
    expect(report.invalidRequiredEnv).toEqual([
      WORKERS_LOGS_EITHER_OR_KEY,
      "OBSERVABILITY_ALERT_DELIVERY_PROOF",
      "OBSERVABILITY_ALERT_WEBHOOK_URL",
      "OPERATIONAL_INCIDENT_ALERT_WEBHOOK_URL",
    ]);
    expect(JSON.stringify(report)).not.toContain("req unsafe");
    expect(JSON.stringify(report)).not.toContain("http://alerts.example.test");
    expect(JSON.stringify(report)).not.toContain("not a url");
  });

  it("writes a non-secret preflight artifact", () => {
    const report = buildObservabilityProofEnvReport({
      generatedAt: "2026-07-08T00:00:00.000Z",
      env: {
        WORKERS_LOGS_PROOF_REQUEST_ID: "req_internal-123",
      },
    });
    const dir = mkdtempSync(join(tmpdir(), "observability-proof-env-"));
    try {
      const output = join(dir, "report.json");
      writeObservabilityProofEnvReport(report, output);
      const saved = readFileSync(output, "utf8");

      expect(JSON.parse(saved)).toEqual(report);
      expect(saved).not.toMatch(/Bearer |token-value/i);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});
