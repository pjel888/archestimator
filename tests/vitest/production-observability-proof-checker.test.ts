import { mkdirSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import {
  checkProductionObservabilityProof,
  formatProductionObservabilityProofSummary,
  readObservabilityProofMaxAgeHours,
} from "@/../scripts/check-production-observability-proof";

const NOW = new Date("2026-07-08T12:00:00.000Z");
const GENERATED_AT = "2026-07-08T10:00:00.000Z";
const WORKERS_LOGS_PROOF_PRODUCER = {
  script: "scripts/collect-workers-logs-proof.ts",
  version: 1,
};
const ALERT_DELIVERY_PROOF_PRODUCER = {
  script: "scripts/verify-observability-alert-delivery.ts",
  version: 1,
};
const ALERT_SCENARIOS = [
  "uptime",
  "error-rate",
  "queue-dlq",
  "cron-failure",
  "incident-escalation",
  "retention-failure",
] as const;
const WORKERS_LOGS_NEXT_ACTION =
  "Run `bun run ops:check-observability-env`; after hosted proof env gates pass, run `WORKERS_LOGS_PROOF_URL=<https_observability_proof_url> WORKERS_LOGS_PROOF_SECRET=<cron_secret> bun run ops:collect-workers-logs-proof`, then rerun `bun run ops:check-observability`.";

type AlertScenario = (typeof ALERT_SCENARIOS)[number];

function alertNextAction(scenario: AlertScenario) {
  return `Run \`bun run ops:check-observability-env\`; after alert-delivery env gates pass, run \`bun run ops:verify-observability-alert -- --scenario ${scenario}\`, then rerun \`bun run ops:check-observability\`.`;
}

function writeJson(dir: string, name: string, value: unknown) {
  writeFileSync(join(dir, name), `${JSON.stringify(value, null, 2)}\n`);
}

function tempEvidenceDir() {
  const dir = join(
    tmpdir(),
    `archestimator-observability-proof-${crypto.randomUUID()}`,
  );
  mkdirSync(dir, { recursive: true });
  return dir;
}

function workersLogsArtifact(overrides: Record<string, unknown> = {}) {
  return {
    generatedAt: GENERATED_AT,
    producer: WORKERS_LOGS_PROOF_PRODUCER,
    mode: "workers-logs-query-proof",
    proofBoundary: "hosted-workers-logs-query",
    passed: true,
    source: "workers-logs",
    query: {
      environment: "production",
      worker: "archestimator-proof",
      windowStart: "2026-07-08T09:55:00.000Z",
      windowEnd: "2026-07-08T10:05:00.000Z",
      matchedEvents: 3,
    },
    evidence: {
      internalRequestIdObserved: true,
      routeObserved: true,
      workerOutcomeObserved: true,
      errorMessageRedacted: true,
      noRawSecrets: true,
    },
    ...overrides,
  };
}

function alertArtifact(
  scenario: AlertScenario,
  overrides: Record<string, unknown> = {},
) {
  return {
    generatedAt: GENERATED_AT,
    producer: ALERT_DELIVERY_PROOF_PRODUCER,
    mode: "observability-alert-delivery-proof",
    proofBoundary: "hosted-alert-delivery-observation",
    scenario,
    environment: "production",
    passed: true,
    delivery: {
      delivered: true,
      observedAt: "2026-07-08T10:01:00.000Z",
      channel: "email",
      recipientRedacted: true,
      secretRedacted: true,
      payloadPathSafe: true,
    },
    ...overrides,
  };
}

function writeValidBundle(dir: string) {
  writeJson(dir, "workers-logs-query-proof.json", workersLogsArtifact());
  writeJson(dir, "uptime-alert-delivery-proof.json", alertArtifact("uptime"));
  writeJson(
    dir,
    "error-rate-alert-delivery-proof.json",
    alertArtifact("error-rate"),
  );
  writeJson(
    dir,
    "queue-dlq-alert-delivery-proof.json",
    alertArtifact("queue-dlq"),
  );
  writeJson(
    dir,
    "cron-failure-alert-delivery-proof.json",
    alertArtifact("cron-failure"),
  );
  writeJson(
    dir,
    "incident-escalation-alert-delivery-proof.json",
    alertArtifact("incident-escalation"),
  );
  writeJson(
    dir,
    "retention-failure-alert-delivery-proof.json",
    alertArtifact("retention-failure"),
  );
}

describe("production observability proof checker", () => {
  it("fails closed when hosted proof artifacts are missing", () => {
    const report = checkProductionObservabilityProof({
      evidenceDir: tempEvidenceDir(),
      now: NOW,
      generatedAt: NOW.toISOString(),
    });

    expect(report.productionObservabilityReady).toBe(false);
    expect(report.totals).toMatchObject({ required: 7, passed: 0, missing: 7 });
    expect(report.failedRequirementKeys).toEqual([
      "workersLogsQuery",
      "uptimeAlertDelivery",
      "errorRateAlertDelivery",
      "queueDlqAlertDelivery",
      "cronFailureAlertDelivery",
      "incidentEscalationDelivery",
      "retentionFailureAlertDelivery",
    ]);
    expect(
      report.requirements.find(
        (requirement) => requirement.key === "workersLogsQuery",
      )?.nextAction,
    ).toBe(WORKERS_LOGS_NEXT_ACTION);
    expect(
      report.requirements.find(
        (requirement) => requirement.key === "errorRateAlertDelivery",
      )?.nextAction,
    ).toBe(alertNextAction("error-rate"));

    expect(
      formatProductionObservabilityProofSummary(report, "/tmp/proof.json"),
    ).toEqual([
      "Production observability proof check failed; output=/tmp/proof.json",
      "Failed requirements: workersLogsQuery, uptimeAlertDelivery, errorRateAlertDelivery, queueDlqAlertDelivery, cronFailureAlertDelivery, incidentEscalationDelivery, retentionFailureAlertDelivery",
      `- workersLogsQuery: missing; artifact=missing; failedChecks=missing:workers-logs-query-proof.json; nextAction=${WORKERS_LOGS_NEXT_ACTION}`,
      `- uptimeAlertDelivery: missing; artifact=missing; failedChecks=missing:uptime-alert-delivery-proof.json; nextAction=${alertNextAction("uptime")}`,
      `- errorRateAlertDelivery: missing; artifact=missing; failedChecks=missing:error-rate-alert-delivery-proof.json; nextAction=${alertNextAction("error-rate")}`,
      `- queueDlqAlertDelivery: missing; artifact=missing; failedChecks=missing:queue-dlq-alert-delivery-proof.json; nextAction=${alertNextAction("queue-dlq")}`,
      `- cronFailureAlertDelivery: missing; artifact=missing; failedChecks=missing:cron-failure-alert-delivery-proof.json; nextAction=${alertNextAction("cron-failure")}`,
      `- incidentEscalationDelivery: missing; artifact=missing; failedChecks=missing:incident-escalation-alert-delivery-proof.json; nextAction=${alertNextAction("incident-escalation")}`,
      `- retentionFailureAlertDelivery: missing; artifact=missing; failedChecks=missing:retention-failure-alert-delivery-proof.json; nextAction=${alertNextAction("retention-failure")}`,
      "Next: run `bun run ops:check-observability-env`, collect hosted Workers Logs proof with `bun run ops:collect-workers-logs-proof`, run alert probes with `bun run ops:verify-observability-alert -- --scenario <uptime|error-rate|queue-dlq|cron-failure|incident-escalation|retention-failure>`, then rerun `bun run ops:check-observability`.",
    ]);
  });

  it("passes with fresh hosted Workers Logs and alert-delivery artifacts", () => {
    const evidenceDir = tempEvidenceDir();
    writeValidBundle(evidenceDir);

    const report = checkProductionObservabilityProof({
      evidenceDir,
      now: NOW,
      generatedAt: NOW.toISOString(),
    });

    expect(report.productionObservabilityReady).toBe(true);
    expect(report.failedRequirementKeys).toEqual([]);
    expect(
      report.requirements.every(
        (requirement) => requirement.status === "passed",
      ),
    ).toBe(true);
  });

  it("rejects stale proof artifacts", () => {
    const evidenceDir = tempEvidenceDir();
    writeValidBundle(evidenceDir);
    writeJson(
      evidenceDir,
      "workers-logs-query-proof.json",
      workersLogsArtifact({
        generatedAt: "2026-07-04T00:00:00.000Z",
      }),
    );

    const report = checkProductionObservabilityProof({
      evidenceDir,
      now: NOW,
      maxAgeHours: 72,
    });

    expect(report.productionObservabilityReady).toBe(false);
    expect(report.failedRequirementKeys).toContain("workersLogsQuery");
    expect(
      report.requirements.find(
        (requirement) => requirement.key === "workersLogsQuery",
      )?.failedChecks,
    ).toContain("artifact-within-max-age");
    expect(
      formatProductionObservabilityProofSummary(report).some(
        (line) =>
          line.startsWith("- workersLogsQuery: failed; artifact=") &&
          line.includes("workers-logs-query-proof.json") &&
          line.includes("artifact-within-max-age"),
      ),
    ).toBe(true);
  });

  it("rejects otherwise valid artifacts without the expected proof producer metadata", () => {
    const evidenceDir = tempEvidenceDir();
    writeValidBundle(evidenceDir);
    writeJson(
      evidenceDir,
      "workers-logs-query-proof.json",
      workersLogsArtifact({
        producer: {
          script: "scripts/manual-fixture.ts",
          version: 1,
        },
      }),
    );
    writeJson(
      evidenceDir,
      "uptime-alert-delivery-proof.json",
      alertArtifact("uptime", {
        producer: {
          script: "scripts/verify-observability-alert-delivery.ts",
          version: 2,
        },
      }),
    );

    const report = checkProductionObservabilityProof({
      evidenceDir,
      now: NOW,
    });

    expect(report.productionObservabilityReady).toBe(false);
    expect(report.failedRequirementKeys).toEqual([
      "workersLogsQuery",
      "uptimeAlertDelivery",
    ]);
    expect(
      report.requirements.find(
        (requirement) => requirement.key === "workersLogsQuery",
      )?.failedChecks,
    ).toContain("artifact-producer-script");
    expect(
      report.requirements.find(
        (requirement) => requirement.key === "uptimeAlertDelivery",
      )?.failedChecks,
    ).toContain("artifact-producer-version");
  });

  it("rejects artifacts that leak bearer-style secrets", () => {
    const evidenceDir = tempEvidenceDir();
    writeValidBundle(evidenceDir);
    writeJson(
      evidenceDir,
      "error-rate-alert-delivery-proof.json",
      alertArtifact("error-rate", {
        redactedSnippet: "Bearer abcdefghijklmnopqrstuvwxyz",
      }),
    );

    const report = checkProductionObservabilityProof({
      evidenceDir,
      now: NOW,
    });

    expect(report.productionObservabilityReady).toBe(false);
    expect(report.failedRequirementKeys).toContain("errorRateAlertDelivery");
    expect(
      report.requirements.find(
        (requirement) => requirement.key === "errorRateAlertDelivery",
      )?.failedChecks,
    ).toContain("alert-artifact-secret-scan");
  });

  it("reads max-age overrides from environment", () => {
    expect(
      readObservabilityProofMaxAgeHours({
        OBSERVABILITY_PROOF_MAX_AGE_HOURS: "12",
      }),
    ).toBe(12);
    expect(
      readObservabilityProofMaxAgeHours({
        OBSERVABILITY_PROOF_MAX_AGE_HOURS: "-1",
      }),
    ).toBe(72);
  });
});
