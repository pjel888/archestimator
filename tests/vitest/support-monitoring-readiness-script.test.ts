import { describe, expect, it } from "vitest";
import { mkdtempSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";

import {
  checkSupportMonitoringReadiness,
  parseProofFlag,
  sanitizeOwnerLabel,
} from "@/../scripts/check-support-monitoring-readiness";

function writeIncidentStatusArtifact(artifact: unknown) {
  const dir = mkdtempSync(join(tmpdir(), "archestimator-incidents-"));
  const file = join(dir, "incident-status.json");
  writeFileSync(file, `${JSON.stringify(artifact, null, 2)}\n`);
  return file;
}

function validIncidentStatusFile() {
  return writeIncidentStatusArtifact({
    readiness: {
      incidentTablesReady: true,
      noStaleIncidents: true,
      operationalIncidentsReady: true,
    },
    staleIncidents: [],
  });
}

function validObservabilityProofFile() {
  return writeIncidentStatusArtifact({
    productionObservabilityReady: true,
    failedRequirementKeys: [],
    requirements: [
      { key: "workersLogsQuery", status: "passed" },
      { key: "uptimeAlertDelivery", status: "passed" },
      { key: "errorRateAlertDelivery", status: "passed" },
      { key: "queueDlqAlertDelivery", status: "passed" },
      { key: "cronFailureAlertDelivery", status: "passed" },
      { key: "incidentEscalationDelivery", status: "passed" },
      { key: "retentionFailureAlertDelivery", status: "passed" },
    ],
  });
}

describe("support monitoring readiness checker", () => {
  it("parses explicit proof flags only", () => {
    expect(parseProofFlag("true")).toBe(true);
    expect(parseProofFlag("1")).toBe(true);
    expect(parseProofFlag("yes")).toBe(true);
    expect(parseProofFlag("passed")).toBe(true);
    expect(parseProofFlag("false")).toBe(false);
    expect(parseProofFlag("")).toBe(false);
    expect(parseProofFlag(undefined)).toBe(false);
  });

  it("keeps owner labels short and sanitized", () => {
    expect(sanitizeOwnerLabel(" Philip / Launch Ops ")).toBe("Philip / Launch Ops");
    expect(sanitizeOwnerLabel("bad<script>")).toBeNull();
    expect(sanitizeOwnerLabel("x".repeat(81))).toBeNull();
  });

  it("fails closed when monitoring proof is not provided", () => {
    const result = checkSupportMonitoringReadiness({});

    expect(result.supportMonitoringReady).toBe(false);
    expect(result.missing).toEqual([
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
    ]);
    expect(result.note).toContain("does not verify inbox access");
  });

  it("passes only when all proof flags, owner labels, incident status proof, and observability proof are present", () => {
    const result = checkSupportMonitoringReadiness({
      SUPPORT_MONITORING_INBOX_CONFIRMED: "true",
      SUPPORT_MONITORING_FEEDBACK_REVIEW_CONFIRMED: "true",
      SUPPORT_MONITORING_UPTIME_ALERT_CONFIRMED: "true",
      SUPPORT_MONITORING_ERROR_ALERT_CONFIRMED: "true",
      SUPPORT_MONITORING_INCIDENT_ESCALATION_CONFIRMED: "true",
      SUPPORT_MONITORING_SUPPORT_OWNER: "Philip / Support",
      SUPPORT_MONITORING_ALERT_OWNER: "Philip / Alerts",
      SUPPORT_MONITORING_FIRST_24H_OWNER: "Philip / Day 1",
      SUPPORT_MONITORING_FIRST_72H_OWNER: "Philip / Day 3",
      SUPPORT_MONITORING_INCIDENT_STATUS_FILE: validIncidentStatusFile(),
      SUPPORT_MONITORING_OBSERVABILITY_PROOF_FILE: validObservabilityProofFile(),
    });

    expect(result.supportMonitoringReady).toBe(true);
    expect(result.missing).toEqual([]);
    expect(result.supportOwner).toBe("Philip / Support");
    expect(result.alertOwner).toBe("Philip / Alerts");
    expect(result.first24HourReviewOwner).toBe("Philip / Day 1");
    expect(result.first72HourReviewOwner).toBe("Philip / Day 3");
    expect(result.incidentStatus.operationalIncidentsReady).toBe(true);
    expect(result.observabilityProof.productionObservabilityReady).toBe(true);
  });

  it("fails closed when incident status proof contains stale incidents", () => {
    const staleArtifact = writeIncidentStatusArtifact({
      readiness: {
        incidentTablesReady: true,
        noStaleIncidents: false,
        operationalIncidentsReady: false,
      },
      staleIncidents: [{ id: "incident-stale" }],
    });
    const result = checkSupportMonitoringReadiness({
      SUPPORT_MONITORING_INBOX_CONFIRMED: "true",
      SUPPORT_MONITORING_FEEDBACK_REVIEW_CONFIRMED: "true",
      SUPPORT_MONITORING_UPTIME_ALERT_CONFIRMED: "true",
      SUPPORT_MONITORING_ERROR_ALERT_CONFIRMED: "true",
      SUPPORT_MONITORING_INCIDENT_ESCALATION_CONFIRMED: "true",
      SUPPORT_MONITORING_SUPPORT_OWNER: "Philip / Support",
      SUPPORT_MONITORING_ALERT_OWNER: "Philip / Alerts",
      SUPPORT_MONITORING_FIRST_24H_OWNER: "Philip / Day 1",
      SUPPORT_MONITORING_FIRST_72H_OWNER: "Philip / Day 3",
      SUPPORT_MONITORING_INCIDENT_STATUS_FILE: staleArtifact,
      SUPPORT_MONITORING_OBSERVABILITY_PROOF_FILE: validObservabilityProofFile(),
    });

    expect(result.supportMonitoringReady).toBe(false);
    expect(result.missing).toContain("stale_incident:incident-stale");
    expect(result.incidentStatus.staleIncidentIds).toEqual(["incident-stale"]);
  });

  it("fails closed when production observability proof is partial", () => {
    const partialObservabilityProof = writeIncidentStatusArtifact({
      productionObservabilityReady: false,
      failedRequirementKeys: ["errorRateAlertDelivery"],
      requirements: [
        { key: "workersLogsQuery", status: "passed" },
        { key: "errorRateAlertDelivery", status: "failed" },
      ],
    });
    const result = checkSupportMonitoringReadiness({
      SUPPORT_MONITORING_INBOX_CONFIRMED: "true",
      SUPPORT_MONITORING_FEEDBACK_REVIEW_CONFIRMED: "true",
      SUPPORT_MONITORING_UPTIME_ALERT_CONFIRMED: "true",
      SUPPORT_MONITORING_ERROR_ALERT_CONFIRMED: "true",
      SUPPORT_MONITORING_INCIDENT_ESCALATION_CONFIRMED: "true",
      SUPPORT_MONITORING_SUPPORT_OWNER: "Philip / Support",
      SUPPORT_MONITORING_ALERT_OWNER: "Philip / Alerts",
      SUPPORT_MONITORING_FIRST_24H_OWNER: "Philip / Day 1",
      SUPPORT_MONITORING_FIRST_72H_OWNER: "Philip / Day 3",
      SUPPORT_MONITORING_INCIDENT_STATUS_FILE: validIncidentStatusFile(),
      SUPPORT_MONITORING_OBSERVABILITY_PROOF_FILE: partialObservabilityProof,
    });

    expect(result.supportMonitoringReady).toBe(false);
    expect(result.missing).toContain("observability_proof:errorRateAlertDelivery");
    expect(result.observabilityProof.failedRequirementKeys).toEqual(["errorRateAlertDelivery"]);
  });
});
