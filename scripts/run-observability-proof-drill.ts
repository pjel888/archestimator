#!/usr/bin/env bun

import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
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
import type { ObservabilityProofRouteSmokeReport } from "./check-observability-proof-route";

const DEFAULT_OBSERVABILITY_PROOF_ROUTE_FILE =
  ".ai/99_scratch/observability-proof-route-smoke-current.json";

type RequirementKey =
  ProductionObservabilityProofReport["failedRequirementKeys"][number];
type AlertDeliveryRequirementKey = Exclude<RequirementKey, "workersLogsQuery">;
type HostedProofRequirementDiagnostic = Pick<
  ProductionObservabilityProofReport["requirements"][number],
  "key" | "status" | "artifact" | "failedChecks" | "nextAction"
>;
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
    | "hostedProofRoute"
    | RequirementKey
    | "productionProofCheck"
    | "operationalIncidentAlerting";
  status: DrillActionStatus;
  sideEffectWhenRun:
    | "none"
    | "queries-hosted-route"
    | "queries-cloudflare-logs"
    | "sends-synthetic-alert"
    | "sends-operational-incident-alert";
  command: string;
  reason: string;
};

type DrillExecutionPlanStep = Pick<
  DrillAction,
  "key" | "status" | "sideEffectWhenRun" | "command" | "reason"
> & {
  phase:
    | "preflight"
    | "hosted-route-smoke"
    | "collect-workers-logs-proof"
    | "collect-alert-delivery-proof"
    | "incident-alert-drill"
    | "final-readiness-check";
};

type HostedProofRouteSummary = {
  source: string | null;
  present: boolean;
  routeStatus: ObservabilityProofRouteSmokeReport["routeStatus"] | null;
  httpStatus: number | null;
  routeReachable: boolean;
  authorizationEnforced: boolean;
  readyForWorkersLogsProof: boolean;
  nextAction: string | null;
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
    hostedProofRouteReady: boolean;
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
    requirements: HostedProofRequirementDiagnostic[];
  };
  hostedProofRoute: HostedProofRouteSummary;
  actions: DrillAction[];
  executionPlan: {
    summary: {
      passed: number;
      readOnlyReady: number;
      gatedExternalReady: number;
      blocked: number;
    };
    passed: DrillExecutionPlanStep[];
    readOnlyReady: DrillExecutionPlanStep[];
    gatedExternalReady: DrillExecutionPlanStep[];
    blocked: DrillExecutionPlanStep[];
    nextVerificationCommand: "bun run ops:observability-drill";
    safetyNote: string;
  };
  note: string;
};

type BuildOptions = {
  generatedAt?: string;
  envReport?: ObservabilityProofEnvReport;
  productionReport?: ProductionObservabilityProofReport;
  hostedProofRouteReport?: ObservabilityProofRouteSmokeReport | null;
  hostedProofRouteSource?: string | null;
};

function groupByKey(
  report: ObservabilityProofEnvReport,
  key: ObservabilityProofEnvGroup["key"],
) {
  return report.groups.find((group) => group.key === key) ?? null;
}

function failedRequiredEnv(group: ObservabilityProofEnvGroup | null) {
  if (!group) return [];
  return group.checks
    .filter((check) => check.required && !check.passed)
    .map((check) => check.key);
}

function requirementStatus(
  report: ProductionObservabilityProofReport,
  key: RequirementKey,
) {
  return (
    report.requirements.find((requirement) => requirement.key === key)
      ?.status ?? "missing"
  );
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

function failedChecksForRequirement(
  report: ProductionObservabilityProofReport,
  key: RequirementKey,
) {
  return (
    report.requirements.find((requirement) => requirement.key === key)
      ?.failedChecks ?? []
  );
}

function proofFailureSuffix(
  report: ProductionObservabilityProofReport,
  key: RequirementKey,
) {
  const failedChecks = failedChecksForRequirement(report, key);
  return failedChecks.length ? ` failedChecks=${failedChecks.join(", ")}.` : "";
}

function envFailureReason(prefix: string, failed: string[]) {
  return failed.length ? `${prefix}: ${failed.join(", ")}` : prefix;
}

function hostedProofRouteSummary(
  report: ObservabilityProofRouteSmokeReport | null | undefined,
  source: string | null | undefined,
): HostedProofRouteSummary {
  if (!report) {
    return {
      source: source ?? null,
      present: false,
      routeStatus: null,
      httpStatus: null,
      routeReachable: false,
      authorizationEnforced: false,
      readyForWorkersLogsProof: false,
      nextAction:
        "Run `OUTPUT_FILE=.ai/99_scratch/observability-proof-route-smoke-current.json bun run ops:check-observability-route` before collecting Workers Logs proof.",
    };
  }

  return {
    source: source ?? null,
    present: true,
    routeStatus: report.routeStatus,
    httpStatus: report.http.status,
    routeReachable: report.routeReachable,
    authorizationEnforced: report.authorizationEnforced,
    readyForWorkersLogsProof: report.readyForWorkersLogsProof,
    nextAction: report.nextAction,
  };
}

function hostedProofRouteAction(route: HostedProofRouteSummary): DrillAction {
  if (route.readyForWorkersLogsProof) {
    return {
      key: "hostedProofRoute",
      status: "passed",
      sideEffectWhenRun: "queries-hosted-route",
      command: "bun run ops:check-observability-route",
      reason:
        "Hosted observability proof route is live and rejects unauthenticated proof markers.",
    };
  }

  if (!route.present) {
    return {
      key: "hostedProofRoute",
      status: "ready-to-run",
      sideEffectWhenRun: "queries-hosted-route",
      command:
        "OUTPUT_FILE=.ai/99_scratch/observability-proof-route-smoke-current.json bun run ops:check-observability-route",
      reason:
        "No hosted proof-route smoke artifact is present; run the non-secret route smoke before Workers Logs proof collection.",
    };
  }

  return {
    key: "hostedProofRoute",
    status: "blocked",
    sideEffectWhenRun: "queries-hosted-route",
    command: "bun run ops:check-observability-route",
    reason: `Hosted proof-route smoke is ${route.routeStatus ?? "unknown"}; ${route.nextAction ?? "resolve the route smoke blocker before Workers Logs proof collection."}`,
  };
}

function workersLogsAction(
  envReport: ObservabilityProofEnvReport,
  productionReport: ProductionObservabilityProofReport,
  route: HostedProofRouteSummary,
): DrillAction {
  const key = "workersLogsQuery" as const;
  const status = requirementStatus(productionReport, key);
  if (status === "passed") {
    return {
      key,
      status: "passed",
      sideEffectWhenRun: "queries-cloudflare-logs",
      command: "bun run ops:collect-workers-logs-proof",
      reason:
        "Hosted Workers Logs proof artifact already satisfies the checker.",
    };
  }

  if (!route.readyForWorkersLogsProof) {
    return {
      key,
      status: "blocked",
      sideEffectWhenRun: "queries-cloudflare-logs",
      command: "bun run ops:check-observability-route",
      reason: route.present
        ? `Hosted proof route is not ready for Workers Logs proof: routeStatus=${route.routeStatus ?? "unknown"}. ${route.nextAction ?? ""}`.trim()
        : "Run `bun run ops:check-observability-route` before collecting Workers Logs proof.",
    };
  }

  const workersGroup = groupByKey(envReport, "workersLogsProof");
  const failed = failedRequiredEnv(workersGroup);
  return {
    key,
    status: workersGroup?.ready ? "ready-to-run" : "blocked",
    sideEffectWhenRun: "queries-cloudflare-logs",
    command:
      "WORKERS_LOGS_PROOF_URL=<https_observability_proof_url> WORKERS_LOGS_PROOF_SECRET=<cron_secret> bun run ops:collect-workers-logs-proof",
    reason: workersGroup?.ready
      ? `Hosted Workers Logs proof status is ${status}; collect a fresh redacted proof-marker artifact.${proofFailureSuffix(productionReport, key)}`
      : envFailureReason(
          "Hosted Workers Logs proof env gates are not ready",
          failed,
        ),
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
      ? `${scenario} alert-delivery proof status is ${status}; run the explicitly gated synthetic alert probe.${proofFailureSuffix(productionReport, key)}`
      : envFailureReason(
          `${scenario} alert-delivery proof env gates are not ready`,
          failed,
        ),
  };
}

function operationalIncidentAlertingAction(
  envReport: ObservabilityProofEnvReport,
): DrillAction {
  const group = groupByKey(envReport, "operationalIncidentAlerts");
  const failed = failedRequiredEnv(group);
  return {
    key: "operationalIncidentAlerting",
    status: group?.ready ? "passed" : "blocked",
    sideEffectWhenRun: "sends-operational-incident-alert",
    command: "bun run ops:incident -- --scope remote --dry-run ...",
    reason: group?.ready
      ? "Operational incident alert env gates are ready for a redacted remote incident mutation drill when one is intentionally run."
      : envFailureReason(
          "Operational incident alert env gates are not ready",
          failed,
        ),
  };
}

function productionProofCheckAction(
  productionReport: ProductionObservabilityProofReport,
): DrillAction {
  return {
    key: "productionProofCheck",
    status: productionReport.productionObservabilityReady
      ? "passed"
      : "ready-to-run",
    sideEffectWhenRun: "none",
    command: "bun run ops:check-observability",
    reason: productionReport.productionObservabilityReady
      ? "All hosted proof artifacts currently satisfy the production observability checker."
      : `Rerun after proof collection; missing or failing requirements: ${productionReport.failedRequirementKeys.join(", ") || "unknown"}.`,
  };
}

function executionPhaseForAction(
  action: DrillAction,
): DrillExecutionPlanStep["phase"] {
  if (action.key === "envPreflight") return "preflight";
  if (action.key === "hostedProofRoute") return "hosted-route-smoke";
  if (action.key === "workersLogsQuery") return "collect-workers-logs-proof";
  if (action.key === "operationalIncidentAlerting")
    return "incident-alert-drill";
  if (action.key === "productionProofCheck") return "final-readiness-check";
  return "collect-alert-delivery-proof";
}

function executionPlanStep(action: DrillAction): DrillExecutionPlanStep {
  return {
    phase: executionPhaseForAction(action),
    key: action.key,
    status: action.status,
    sideEffectWhenRun: action.sideEffectWhenRun,
    command: action.command,
    reason: action.reason,
  };
}

function buildExecutionPlan(
  actions: DrillAction[],
): ObservabilityProofDrillReport["executionPlan"] {
  const steps = actions.map(executionPlanStep);
  const passed = steps.filter((step) => step.status === "passed");
  const readOnlyReady = steps.filter(
    (step) =>
      step.status === "ready-to-run" && step.sideEffectWhenRun === "none",
  );
  const gatedExternalReady = steps.filter(
    (step) =>
      step.status === "ready-to-run" && step.sideEffectWhenRun !== "none",
  );
  const blocked = steps.filter((step) => step.status === "blocked");

  return {
    summary: {
      passed: passed.length,
      readOnlyReady: readOnlyReady.length,
      gatedExternalReady: gatedExternalReady.length,
      blocked: blocked.length,
    },
    passed,
    readOnlyReady,
    gatedExternalReady,
    blocked,
    nextVerificationCommand: "bun run ops:observability-drill",
    safetyNote:
      "Only readOnlyReady steps are side-effect-free. gatedExternalReady steps query the hosted proof route, query Cloudflare Logs, or send explicitly gated synthetic alerts; blocked steps require env/artifact/deploy setup first.",
  };
}

export function buildObservabilityProofDrillReport(
  options: BuildOptions = {},
): ObservabilityProofDrillReport {
  const envReport = options.envReport ?? buildObservabilityProofEnvReport();
  const productionReport =
    options.productionReport ?? checkProductionObservabilityProof();
  const hostedProofRoute = hostedProofRouteSummary(
    options.hostedProofRouteReport,
    options.hostedProofRouteSource,
  );
  const passed =
    envReport.passed &&
    hostedProofRoute.readyForWorkersLogsProof &&
    productionReport.productionObservabilityReady;
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
    hostedProofRouteAction(hostedProofRoute),
    workersLogsAction(envReport, productionReport, hostedProofRoute),
    alertDeliveryAction(
      "uptimeAlertDelivery",
      "uptime",
      envReport,
      productionReport,
    ),
    alertDeliveryAction(
      "errorRateAlertDelivery",
      "error-rate",
      envReport,
      productionReport,
    ),
    alertDeliveryAction(
      "queueDlqAlertDelivery",
      "queue-dlq",
      envReport,
      productionReport,
    ),
    alertDeliveryAction(
      "cronFailureAlertDelivery",
      "cron-failure",
      envReport,
      productionReport,
    ),
    alertDeliveryAction(
      "incidentEscalationDelivery",
      "incident-escalation",
      envReport,
      productionReport,
    ),
    alertDeliveryAction(
      "retentionFailureAlertDelivery",
      "retention-failure",
      envReport,
      productionReport,
    ),
    operationalIncidentAlertingAction(envReport),
    productionProofCheckAction(productionReport),
  ];
  const executionPlan = buildExecutionPlan(actions);

  return {
    generatedAt: options.generatedAt ?? new Date().toISOString(),
    mode: "observability-proof-drill",
    proofBoundary: "read-only-observability-readiness-drill",
    readOnly: true,
    externalSideEffectsPerformed: false,
    passed,
    readiness: {
      envPreflightPassed: envReport.passed,
      hostedProofRouteReady: hostedProofRoute.readyForWorkersLogsProof,
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
      requirements: hostedProofRequirementDiagnostics(productionReport),
    },
    hostedProofRoute,
    actions,
    executionPlan,
    note: "Read-only production observability readiness drill. It joins hosted proof env preflight, hosted proof-route smoke artifact status, and hosted proof artifact validation, but it does not query Cloudflare, send webhooks, mutate D1 incidents, print request ids, print webhook URLs, or print token values.",
  };
}

export function writeObservabilityProofDrillReport(
  report: ObservabilityProofDrillReport,
  outputFile: string,
) {
  const resolved = resolve(outputFile);
  mkdirSync(dirname(resolved), { recursive: true });
  writeFileSync(resolved, `${JSON.stringify(report, null, 2)}\n`, "utf8");
  return resolved;
}

function readOutputFile(env: Record<string, string | undefined>) {
  return (
    env.OBSERVABILITY_DRILL_OUTPUT_FILE?.trim() || env.OUTPUT_FILE?.trim() || ""
  );
}

function readRouteSmokeInputFile(env: Record<string, string | undefined>) {
  return (
    env.OBSERVABILITY_PROOF_ROUTE_REPORT_FILE?.trim() ||
    DEFAULT_OBSERVABILITY_PROOF_ROUTE_FILE
  );
}

export function readObservabilityProofRouteSmokeArtifact(
  inputFile = readRouteSmokeInputFile(process.env),
): {
  source: string | null;
  report: ObservabilityProofRouteSmokeReport | null;
} {
  const source = inputFile || null;
  if (!inputFile) return { source, report: null };
  const resolved = resolve(inputFile);
  if (!existsSync(resolved)) return { source: inputFile, report: null };
  try {
    const parsed = JSON.parse(readFileSync(resolved, "utf8")) as unknown;
    if (
      parsed &&
      typeof parsed === "object" &&
      !Array.isArray(parsed) &&
      (parsed as { mode?: unknown }).mode === "observability-proof-route-smoke"
    ) {
      return {
        source: inputFile,
        report: parsed as ObservabilityProofRouteSmokeReport,
      };
    }
  } catch {
    // Invalid artifacts are treated as absent so the drill fails closed.
  }
  return { source: inputFile, report: null };
}

export function formatObservabilityProofDrillSummary(
  report: ObservabilityProofDrillReport,
  outputFile?: string,
) {
  const outputSuffix = outputFile ? `; output=${outputFile}` : "";
  const lines = [
    `Observability proof drill ${report.passed ? "passed" : "failed"}${outputSuffix}`,
    "Read-only: no Cloudflare query, webhook send, or incident mutation was performed.",
    `Env readiness: hostedProofCollectionReady=${report.readiness.hostedProofCollectionReady}; operationalIncidentAlertsReady=${report.readiness.operationalIncidentAlertsReady}`,
    `Hosted proof route: readyForWorkersLogsProof=${report.hostedProofRoute.readyForWorkersLogsProof}; routeStatus=${report.hostedProofRoute.routeStatus ?? "missing"}; httpStatus=${report.hostedProofRoute.httpStatus ?? "none"}`,
    `Hosted proof: passed=${report.hostedProof.totals.passed}/${report.hostedProof.totals.required}; failed=${report.hostedProof.failedRequirementKeys.join(", ") || "none"}`,
  ];

  if (!report.passed) {
    lines.push(
      `Runbook: read-only ready=${report.executionPlan.summary.readOnlyReady}; gated external ready=${report.executionPlan.summary.gatedExternalReady}; blocked=${report.executionPlan.summary.blocked}`,
    );
  }

  for (const action of report.actions.filter(
    (action) => action.status !== "passed",
  )) {
    lines.push(
      `- ${action.key}: ${action.status}; command=${action.command}; reason=${action.reason}`,
    );
  }

  if (!report.passed) {
    lines.push(
      "Next: satisfy blocked env gates, run ready-to-run proof commands, then rerun `bun run ops:observability-drill`.",
    );
  }

  return lines;
}

async function main() {
  const routeSmoke = readObservabilityProofRouteSmokeArtifact();
  const report = buildObservabilityProofDrillReport({
    hostedProofRouteReport: routeSmoke.report,
    hostedProofRouteSource: routeSmoke.source,
  });
  const outputFile = readOutputFile(process.env);
  const written = outputFile
    ? writeObservabilityProofDrillReport(report, outputFile)
    : undefined;
  console.log(formatObservabilityProofDrillSummary(report, written).join("\n"));
  if (!report.passed) process.exitCode = 1;
}

if (import.meta.main) {
  void main();
}
