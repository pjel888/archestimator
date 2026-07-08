#!/usr/bin/env bun

import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";

import {
  buildObservabilityProofEnvReport,
  type ObservabilityProofEnvGroup,
  type ObservabilityProofEnvReport,
} from "./check-observability-proof-env";
import {
  checkProductionObservabilityProof,
  type ProductionObservabilityProofReport,
} from "./check-production-observability-proof";

type RequirementKey = ProductionObservabilityProofReport["failedRequirementKeys"][number];
type AlertDeliveryRequirementKey = Exclude<RequirementKey, "workersLogsQuery">;
type ObservabilityAlertScenario =
  | "uptime"
  | "error-rate"
  | "queue-dlq"
  | "cron-failure"
  | "incident-escalation"
  | "retention-failure";

type DrillActionStatus = "passed" | "ready-to-run" | "blocked";

type DrillAction = {
  key:
    | "envPreflight"
    | RequirementKey
    | "productionProofCheck"
    | "operationalIncidentAlerting";
  status: DrillActionStatus;
  sideEffectWhenRun: "none" | "queries-cloudflare-logs" | "sends-synthetic-alert" | "sends-operational-incident-alert";
  command: string;
  reason: string;
};

export type ObservabilityProofDrillReport = {
  generatedAt: string;
  mode: "observability-proof-drill";
  proofBoundary: "read-only-observability-readiness-drill";
  readOnly: true;
  externalSideEffectsPerformed: false;
  passed: boolean;
  readiness: {
    envPreflightPassed: boolean;
    hostedProofCollectionReady: boolean;
    operationalIncidentAlertsReady: boolean;
    productionHostedProofReady: boolean;
  };
  envPreflight: {
    missingRequiredEnv: string[];
    invalidRequiredEnv: string[];
    advisoryCount: number;
  };
  hostedProof: {
    evidenceDir: string;
    maxAgeHours: number;
    totals: ProductionObservabilityProofReport["totals"];
    failedRequirementKeys: ProductionObservabilityProofReport["failedRequirementKeys"];
  };
  actions: DrillAction[];
  note: string;
};

type BuildOptions = {
  generatedAt?: string;
  envReport?: ObservabilityProofEnvReport;
  productionReport?: ProductionObservabilityProofReport;
};

function groupByKey(report: ObservabilityProofEnvReport, key: ObservabilityProofEnvGroup["key"]) {
  return report.groups.find((group) => group.key === key) ?? null;
}

function failedRequiredEnv(group: ObservabilityProofEnvGroup | null) {
  if (!group) return [];
  return group.checks
    .filter((check) => check.required && !check.passed)
    .map((check) => check.key);
}

function requirementStatus(report: ProductionObservabilityProofReport, key: RequirementKey) {
  return report.requirements.find((requirement) => requirement.key === key)?.status ?? "missing";
}

function envFailureReason(prefix: string, failed: string[]) {
  return failed.length
    ? `${prefix}: ${failed.join(", ")}`
    : prefix;
}

function workersLogsAction(
  envReport: ObservabilityProofEnvReport,
  productionReport: ProductionObservabilityProofReport,
): DrillAction {
  const key = "workersLogsQuery" as const;
  const status = requirementStatus(productionReport, key);
  if (status === "passed") {
    return {
      key,
      status: "passed",
      sideEffectWhenRun: "queries-cloudflare-logs",
      command: "bun run ops:collect-workers-logs-proof",
      reason: "Hosted Workers Logs proof artifact already satisfies the checker.",
    };
  }

  const workersGroup = groupByKey(envReport, "workersLogsProof");
  const failed = failedRequiredEnv(workersGroup);
  return {
    key,
    status: workersGroup?.ready ? "ready-to-run" : "blocked",
    sideEffectWhenRun: "queries-cloudflare-logs",
    command: "WORKERS_LOGS_PROOF_URL=<https_observability_proof_url> WORKERS_LOGS_PROOF_SECRET=<cron_secret> bun run ops:collect-workers-logs-proof",
    reason: workersGroup?.ready
      ? `Hosted Workers Logs proof is ${status}; collect a fresh redacted proof-marker artifact.`
      : envFailureReason("Hosted Workers Logs proof env gates are not ready", failed),
  };
}

function alertDeliveryAction(
  key: AlertDeliveryRequirementKey,
  scenario: ObservabilityAlertScenario,
  envReport: ObservabilityProofEnvReport,
  productionReport: ProductionObservabilityProofReport,
): DrillAction {
  const status = requirementStatus(productionReport, key);
  if (status === "passed") {
    return {
      key,
      status: "passed",
      sideEffectWhenRun: "sends-synthetic-alert",
      command: `bun run ops:verify-observability-alert -- --scenario ${scenario}`,
      reason: `${scenario} alert-delivery proof artifact already satisfies the checker.`,
    };
  }

  const alertGroup = groupByKey(envReport, "alertDeliveryProof");
  const failed = failedRequiredEnv(alertGroup);
  return {
    key,
    status: alertGroup?.ready ? "ready-to-run" : "blocked",
    sideEffectWhenRun: "sends-synthetic-alert",
    command: `bun run ops:verify-observability-alert -- --scenario ${scenario}`,
    reason: alertGroup?.ready
      ? `${scenario} alert-delivery proof is ${status}; run the explicitly gated synthetic alert probe.`
      : envFailureReason(`${scenario} alert-delivery proof env gates are not ready`, failed),
  };
}

function operationalIncidentAlertingAction(envReport: ObservabilityProofEnvReport): DrillAction {
  const group = groupByKey(envReport, "operationalIncidentAlerts");
  const failed = failedRequiredEnv(group);
  return {
    key: "operationalIncidentAlerting",
    status: group?.ready ? "passed" : "blocked",
    sideEffectWhenRun: "sends-operational-incident-alert",
    command: "bun run ops:incident -- --scope remote --dry-run ...",
    reason: group?.ready
      ? "Operational incident alert env gates are ready for a redacted remote incident mutation drill when one is intentionally run."
      : envFailureReason("Operational incident alert env gates are not ready", failed),
  };
}

function productionProofCheckAction(productionReport: ProductionObservabilityProofReport): DrillAction {
  return {
    key: "productionProofCheck",
    status: productionReport.productionObservabilityReady ? "passed" : "ready-to-run",
    sideEffectWhenRun: "none",
    command: "bun run ops:check-observability",
    reason: productionReport.productionObservabilityReady
      ? "All hosted proof artifacts currently satisfy the production observability checker."
      : `Rerun after proof collection; missing or failing requirements: ${productionReport.failedRequirementKeys.join(", ") || "unknown"}.`,
  };
}

export function buildObservabilityProofDrillReport(options: BuildOptions = {}): ObservabilityProofDrillReport {
  const envReport = options.envReport ?? buildObservabilityProofEnvReport();
  const productionReport = options.productionReport ?? checkProductionObservabilityProof();
  const passed = envReport.passed && productionReport.productionObservabilityReady;
  const actions: DrillAction[] = [
    {
      key: "envPreflight",
      status: envReport.passed ? "passed" : "ready-to-run",
      sideEffectWhenRun: "none",
      command: "bun run ops:check-observability-env",
      reason: envReport.passed
        ? "Hosted proof and operational incident alert env gates are present with safe shapes."
        : "Run the preflight after configuring hosted proof and incident alert env gates.",
    },
    workersLogsAction(envReport, productionReport),
    alertDeliveryAction("uptimeAlertDelivery", "uptime", envReport, productionReport),
    alertDeliveryAction("errorRateAlertDelivery", "error-rate", envReport, productionReport),
    alertDeliveryAction("queueDlqAlertDelivery", "queue-dlq", envReport, productionReport),
    alertDeliveryAction("cronFailureAlertDelivery", "cron-failure", envReport, productionReport),
    alertDeliveryAction("incidentEscalationDelivery", "incident-escalation", envReport, productionReport),
    alertDeliveryAction("retentionFailureAlertDelivery", "retention-failure", envReport, productionReport),
    operationalIncidentAlertingAction(envReport),
    productionProofCheckAction(productionReport),
  ];

  return {
    generatedAt: options.generatedAt ?? new Date().toISOString(),
    mode: "observability-proof-drill",
    proofBoundary: "read-only-observability-readiness-drill",
    readOnly: true,
    externalSideEffectsPerformed: false,
    passed,
    readiness: {
      envPreflightPassed: envReport.passed,
      hostedProofCollectionReady: envReport.hostedProofCollectionReady,
      operationalIncidentAlertsReady: envReport.operationalIncidentAlertsReady,
      productionHostedProofReady: productionReport.productionObservabilityReady,
    },
    envPreflight: {
      missingRequiredEnv: envReport.missingRequiredEnv,
      invalidRequiredEnv: envReport.invalidRequiredEnv,
      advisoryCount: envReport.advisory.length,
    },
    hostedProof: {
      evidenceDir: productionReport.evidenceDir,
      maxAgeHours: productionReport.maxAgeHours,
      totals: productionReport.totals,
      failedRequirementKeys: productionReport.failedRequirementKeys,
    },
    actions,
    note: "Read-only production observability readiness drill. It joins hosted proof env preflight and hosted proof artifact validation, but it does not query Cloudflare, send webhooks, mutate D1 incidents, print request ids, print webhook URLs, or print token values.",
  };
}

export function writeObservabilityProofDrillReport(report: ObservabilityProofDrillReport, outputFile: string) {
  const resolved = resolve(outputFile);
  mkdirSync(dirname(resolved), { recursive: true });
  writeFileSync(resolved, `${JSON.stringify(report, null, 2)}\n`, "utf8");
  return resolved;
}

function readOutputFile(env: Record<string, string | undefined>) {
  return env.OBSERVABILITY_DRILL_OUTPUT_FILE?.trim() || env.OUTPUT_FILE?.trim() || "";
}

export function formatObservabilityProofDrillSummary(report: ObservabilityProofDrillReport, outputFile?: string) {
  const outputSuffix = outputFile ? `; output=${outputFile}` : "";
  const lines = [
    `Observability proof drill ${report.passed ? "passed" : "failed"}${outputSuffix}`,
    "Read-only: no Cloudflare query, webhook send, or incident mutation was performed.",
    `Env readiness: hostedProofCollectionReady=${report.readiness.hostedProofCollectionReady}; operationalIncidentAlertsReady=${report.readiness.operationalIncidentAlertsReady}`,
    `Hosted proof: passed=${report.hostedProof.totals.passed}/${report.hostedProof.totals.required}; failed=${report.hostedProof.failedRequirementKeys.join(", ") || "none"}`,
  ];

  for (const action of report.actions.filter((action) => action.status !== "passed")) {
    lines.push(`- ${action.key}: ${action.status}; command=${action.command}; reason=${action.reason}`);
  }

  if (!report.passed) {
    lines.push("Next: satisfy blocked env gates, run ready-to-run proof commands, then rerun `bun run ops:observability-drill`.");
  }

  return lines;
}

async function main() {
  const report = buildObservabilityProofDrillReport();
  const outputFile = readOutputFile(process.env);
  const written = outputFile ? writeObservabilityProofDrillReport(report, outputFile) : undefined;
  console.log(formatObservabilityProofDrillSummary(report, written).join("\n"));
  if (!report.passed) process.exitCode = 1;
}

if (import.meta.main) {
  void main();
}
