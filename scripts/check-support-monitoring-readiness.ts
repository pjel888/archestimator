#!/usr/bin/env bun

import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";

type ProofFlagName =
  | "SUPPORT_MONITORING_INBOX_CONFIRMED"
  | "SUPPORT_MONITORING_FEEDBACK_REVIEW_CONFIRMED"
  | "SUPPORT_MONITORING_UPTIME_ALERT_CONFIRMED"
  | "SUPPORT_MONITORING_ERROR_ALERT_CONFIRMED"
  | "SUPPORT_MONITORING_INCIDENT_ESCALATION_CONFIRMED";

export type SupportMonitoringRequirementKey =
  | "supportInboxMonitoring"
  | "feedbackReview"
  | "uptimeAlertDelivery"
  | "errorAlertDelivery"
  | "incidentEscalationPath"
  | "supportOwnerLabel"
  | "alertOwnerLabel"
  | "first24HourReviewOwnerLabel"
  | "first72HourReviewOwnerLabel"
  | "operationalIncidentStatusArtifact"
  | "productionObservabilityProofArtifact";

export type SupportMonitoringRequirementCategory =
  | "operator-confirmation"
  | "owner-label"
  | "evidence-artifact";

export type SupportMonitoringRequirementStatus = "passed" | "missing" | "failed";

export type SupportMonitoringRequirement = {
  key: SupportMonitoringRequirementKey;
  category: SupportMonitoringRequirementCategory;
  status: SupportMonitoringRequirementStatus;
  label: string;
  missing: string[];
  source: string | null;
  nextAction: string;
};

export type SupportMonitoringReadinessResult = {
  generatedAt: string;
  mode: "support-monitoring-readiness";
  proofFlags: Record<ProofFlagName, boolean>;
  supportOwner: string | null;
  alertOwner: string | null;
  first24HourReviewOwner: string | null;
  first72HourReviewOwner: string | null;
  incidentStatus: {
    source: string | null;
    present: boolean;
    operationalIncidentsReady: boolean;
    staleIncidentIds: string[];
  };
  observabilityProof: {
    source: string | null;
    present: boolean;
    productionObservabilityReady: boolean;
    failedRequirementKeys: string[];
  };
  summary: Record<SupportMonitoringRequirementStatus, number>;
  requirements: SupportMonitoringRequirement[];
  missing: string[];
  supportMonitoringReady: boolean;
  note: string;
};

const PROOF_FLAGS: ProofFlagName[] = [
  "SUPPORT_MONITORING_INBOX_CONFIRMED",
  "SUPPORT_MONITORING_FEEDBACK_REVIEW_CONFIRMED",
  "SUPPORT_MONITORING_UPTIME_ALERT_CONFIRMED",
  "SUPPORT_MONITORING_ERROR_ALERT_CONFIRMED",
  "SUPPORT_MONITORING_INCIDENT_ESCALATION_CONFIRMED",
];

function readEnv(name: string) {
  const value = process.env[name];
  return value?.trim() || undefined;
}

export function parseProofFlag(value: string | undefined) {
  const normalized = value?.trim().toLowerCase();
  return normalized === "1" || normalized === "true" || normalized === "yes" || normalized === "passed";
}

export function sanitizeOwnerLabel(value: string | undefined) {
  if (!value) return null;
  const trimmed = value.trim().replace(/\s+/g, " ");
  if (!trimmed || trimmed.length > 80) return null;
  if (/[<>{}[\]\\]/.test(trimmed)) return null;
  return trimmed;
}

type IncidentStatusArtifact = {
  readiness?: {
    operationalIncidentsReady?: boolean;
    incidentTablesReady?: boolean;
    noStaleIncidents?: boolean;
  };
  staleIncidents?: Array<{ id?: unknown }>;
};

type IncidentStatusResult = {
  source: string | null;
  present: boolean;
  operationalIncidentsReady: boolean;
  staleIncidentIds: string[];
  missing: string[];
};

type ObservabilityProofArtifact = {
  productionObservabilityReady?: boolean;
  failedRequirementKeys?: unknown[];
  requirements?: Array<{ key?: unknown; status?: unknown }>;
};

type ObservabilityProofResult = {
  source: string | null;
  present: boolean;
  productionObservabilityReady: boolean;
  failedRequirementKeys: string[];
  missing: string[];
};

function readIncidentStatusArtifact(path: string | undefined): IncidentStatusResult {
  if (!path) {
    return {
      source: null,
      present: false,
      operationalIncidentsReady: false,
      staleIncidentIds: [] as string[],
      missing: ["operational incident status artifact"],
    };
  }
  if (!existsSync(path)) {
    return {
      source: path,
      present: false,
      operationalIncidentsReady: false,
      staleIncidentIds: [] as string[],
      missing: ["operational incident status artifact readable"],
    };
  }

  try {
    const artifact = JSON.parse(readFileSync(path, "utf8")) as IncidentStatusArtifact;
    const staleIncidentIds = (artifact.staleIncidents ?? [])
      .map((row) => typeof row.id === "string" ? row.id : null)
      .filter((value): value is string => Boolean(value));
    const operationalIncidentsReady = artifact.readiness?.operationalIncidentsReady === true
      && artifact.readiness.incidentTablesReady === true
      && artifact.readiness.noStaleIncidents === true
      && staleIncidentIds.length === 0;

    return {
      source: path,
      present: true,
      operationalIncidentsReady,
      staleIncidentIds,
      missing: [
        artifact.readiness?.operationalIncidentsReady !== true ? "operational incidents ready" : null,
        artifact.readiness?.incidentTablesReady !== true ? "operational incident tables ready" : null,
        artifact.readiness?.noStaleIncidents !== true ? "no stale operational incidents" : null,
        ...staleIncidentIds.map((id) => `stale_incident:${id}`),
      ].filter((value): value is string => Boolean(value)),
    };
  } catch {
    return {
      source: path,
      present: false,
      operationalIncidentsReady: false,
      staleIncidentIds: [] as string[],
      missing: ["operational incident status artifact valid JSON"],
    };
  }
}

function readObservabilityProofArtifact(path: string | undefined): ObservabilityProofResult {
  if (!path) {
    return {
      source: null,
      present: false,
      productionObservabilityReady: false,
      failedRequirementKeys: [] as string[],
      missing: ["production observability proof artifact"],
    };
  }
  if (!existsSync(path)) {
    return {
      source: path,
      present: false,
      productionObservabilityReady: false,
      failedRequirementKeys: [] as string[],
      missing: ["production observability proof artifact readable"],
    };
  }

  try {
    const artifact = JSON.parse(readFileSync(path, "utf8")) as ObservabilityProofArtifact;
    const failedRequirementKeys = artifact.failedRequirementKeys
      ?.filter((value): value is string => typeof value === "string")
      ?? (artifact.requirements ?? [])
        .filter((row) => row.status !== "passed")
        .map((row) => typeof row.key === "string" ? row.key : null)
        .filter((value): value is string => Boolean(value));
    const productionObservabilityReady = artifact.productionObservabilityReady === true
      && failedRequirementKeys.length === 0;

    return {
      source: path,
      present: true,
      productionObservabilityReady,
      failedRequirementKeys,
      missing: productionObservabilityReady
        ? []
        : [
          "production observability proof ready",
          ...failedRequirementKeys.map((key) => `observability_proof:${key}`),
        ],
    };
  } catch {
    return {
      source: path,
      present: false,
      productionObservabilityReady: false,
      failedRequirementKeys: [] as string[],
      missing: ["production observability proof artifact valid JSON"],
    };
  }
}

function operatorRequirement(
  key: SupportMonitoringRequirementKey,
  label: string,
  passed: boolean,
  missingLabel: string,
  nextAction: string,
): SupportMonitoringRequirement {
  return {
    key,
    category: "operator-confirmation",
    status: passed ? "passed" : "missing",
    label,
    missing: passed ? [] : [missingLabel],
    source: null,
    nextAction,
  };
}

function ownerRequirement(
  key: SupportMonitoringRequirementKey,
  label: string,
  present: boolean,
  missingLabel: string,
  nextAction: string,
): SupportMonitoringRequirement {
  return {
    key,
    category: "owner-label",
    status: present ? "passed" : "missing",
    label,
    missing: present ? [] : [missingLabel],
    source: null,
    nextAction,
  };
}

function incidentArtifactRequirement(
  incidentStatus: IncidentStatusResult,
): SupportMonitoringRequirement {
  return {
    key: "operationalIncidentStatusArtifact",
    category: "evidence-artifact",
    status: incidentStatus.operationalIncidentsReady
      ? "passed"
      : incidentStatus.present
        ? "failed"
        : "missing",
    label: "Operational incident status artifact",
    missing: incidentStatus.missing,
    source: incidentStatus.source,
    nextAction: "Run `bun run ops:check-incidents` and pass its JSON artifact as SUPPORT_MONITORING_INCIDENT_STATUS_FILE.",
  };
}

function observabilityArtifactRequirement(
  observabilityProof: ObservabilityProofResult,
): SupportMonitoringRequirement {
  return {
    key: "productionObservabilityProofArtifact",
    category: "evidence-artifact",
    status: observabilityProof.productionObservabilityReady
      ? "passed"
      : observabilityProof.present
        ? "failed"
        : "missing",
    label: "Production observability proof artifact",
    missing: observabilityProof.missing,
    source: observabilityProof.source,
    nextAction: "Run `bun run ops:check-observability` and pass its JSON artifact as SUPPORT_MONITORING_OBSERVABILITY_PROOF_FILE.",
  };
}

function summarizeRequirements(requirements: SupportMonitoringRequirement[]) {
  return requirements.reduce<Record<SupportMonitoringRequirementStatus, number>>(
    (totals, requirement) => {
      totals[requirement.status] += 1;
      return totals;
    },
    { passed: 0, missing: 0, failed: 0 },
  );
}

export function checkSupportMonitoringReadiness(env: Record<string, string | undefined> = process.env) {
  const proofFlags = Object.fromEntries(
    PROOF_FLAGS.map((name) => [name, parseProofFlag(env[name])]),
  ) as Record<ProofFlagName, boolean>;

  const supportOwner = sanitizeOwnerLabel(env.SUPPORT_MONITORING_SUPPORT_OWNER);
  const alertOwner = sanitizeOwnerLabel(env.SUPPORT_MONITORING_ALERT_OWNER);
  const first24HourReviewOwner = sanitizeOwnerLabel(env.SUPPORT_MONITORING_FIRST_24H_OWNER);
  const first72HourReviewOwner = sanitizeOwnerLabel(env.SUPPORT_MONITORING_FIRST_72H_OWNER);
  const incidentStatus = readIncidentStatusArtifact(
    env.SUPPORT_MONITORING_INCIDENT_STATUS_FILE ?? env.OPERATIONAL_INCIDENTS_STATUS_FILE,
  );
  const observabilityProof = readObservabilityProofArtifact(
    env.SUPPORT_MONITORING_OBSERVABILITY_PROOF_FILE ?? env.PRODUCTION_OBSERVABILITY_PROOF_FILE,
  );

  const requirements: SupportMonitoringRequirement[] = [
    operatorRequirement(
      "supportInboxMonitoring",
      "Support inbox monitoring",
      proofFlags.SUPPORT_MONITORING_INBOX_CONFIRMED,
      "support inbox monitoring confirmed",
      "Set SUPPORT_MONITORING_INBOX_CONFIRMED=true after the monitored support inbox is confirmed.",
    ),
    operatorRequirement(
      "feedbackReview",
      "Feedback table review",
      proofFlags.SUPPORT_MONITORING_FEEDBACK_REVIEW_CONFIRMED,
      "feedback table review confirmed",
      "Set SUPPORT_MONITORING_FEEDBACK_REVIEW_CONFIRMED=true after the feedback review queue is confirmed.",
    ),
    operatorRequirement(
      "uptimeAlertDelivery",
      "Uptime alert delivery",
      proofFlags.SUPPORT_MONITORING_UPTIME_ALERT_CONFIRMED,
      "uptime alert delivery confirmed",
      "Set SUPPORT_MONITORING_UPTIME_ALERT_CONFIRMED=true after hosted uptime alert delivery is confirmed.",
    ),
    operatorRequirement(
      "errorAlertDelivery",
      "Error alert delivery",
      proofFlags.SUPPORT_MONITORING_ERROR_ALERT_CONFIRMED,
      "error alert delivery confirmed",
      "Set SUPPORT_MONITORING_ERROR_ALERT_CONFIRMED=true after hosted error alert delivery is confirmed.",
    ),
    operatorRequirement(
      "incidentEscalationPath",
      "Incident escalation path",
      proofFlags.SUPPORT_MONITORING_INCIDENT_ESCALATION_CONFIRMED,
      "incident escalation path confirmed",
      "Set SUPPORT_MONITORING_INCIDENT_ESCALATION_CONFIRMED=true after incident escalation ownership is confirmed.",
    ),
    ownerRequirement(
      "supportOwnerLabel",
      "Support owner label",
      Boolean(supportOwner),
      "support owner label",
      "Set SUPPORT_MONITORING_SUPPORT_OWNER to a short sanitized owner label.",
    ),
    ownerRequirement(
      "alertOwnerLabel",
      "Alert owner label",
      Boolean(alertOwner),
      "alert owner label",
      "Set SUPPORT_MONITORING_ALERT_OWNER to a short sanitized owner label.",
    ),
    ownerRequirement(
      "first24HourReviewOwnerLabel",
      "First 24-hour review owner label",
      Boolean(first24HourReviewOwner),
      "first 24-hour review owner label",
      "Set SUPPORT_MONITORING_FIRST_24H_OWNER to a short sanitized owner label.",
    ),
    ownerRequirement(
      "first72HourReviewOwnerLabel",
      "First 72-hour review owner label",
      Boolean(first72HourReviewOwner),
      "first 72-hour review owner label",
      "Set SUPPORT_MONITORING_FIRST_72H_OWNER to a short sanitized owner label.",
    ),
    incidentArtifactRequirement(incidentStatus),
    observabilityArtifactRequirement(observabilityProof),
  ];
  const summary = summarizeRequirements(requirements);
  const missing = requirements.flatMap((requirement) => requirement.missing);
  const supportMonitoringReady = requirements.every((requirement) => requirement.status === "passed");

  return {
    generatedAt: new Date().toISOString(),
    mode: "support-monitoring-readiness" as const,
    proofFlags,
    supportOwner,
    alertOwner,
    first24HourReviewOwner,
    first72HourReviewOwner,
    incidentStatus: {
      source: incidentStatus.source,
      present: incidentStatus.present,
      operationalIncidentsReady: incidentStatus.operationalIncidentsReady,
      staleIncidentIds: incidentStatus.staleIncidentIds,
    },
    observabilityProof: {
      source: observabilityProof.source,
      present: observabilityProof.present,
      productionObservabilityReady: observabilityProof.productionObservabilityReady,
      failedRequirementKeys: observabilityProof.failedRequirementKeys,
    },
    summary,
    requirements,
    missing,
    supportMonitoringReady,
    note: "Sanitized support monitoring readiness check. It records operator-confirmed proof flags and owner labels, consumes read-only operational incident and production observability proof artifacts, emits structured requirement diagnostics, and fails closed when hosted evidence is missing. It does not verify inbox access, alert dashboards, linked feedback rows, hosted auth, or incident delivery by itself.",
  } satisfies SupportMonitoringReadinessResult;
}

function writeOutput(outputFile: string, result: SupportMonitoringReadinessResult) {
  const resolved = resolve(outputFile);
  mkdirSync(dirname(resolved), { recursive: true });
  writeFileSync(resolved, `${JSON.stringify(result, null, 2)}\n`);
}

async function main() {
  const result = checkSupportMonitoringReadiness();
  const outputFile = readEnv("OUTPUT_FILE");
  if (outputFile) writeOutput(outputFile, result);
  console.log(JSON.stringify(result, null, 2));
  if (!result.supportMonitoringReady) process.exitCode = 1;
}

if (import.meta.main) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  });
}
