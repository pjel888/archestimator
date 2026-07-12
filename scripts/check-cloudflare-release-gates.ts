#!/usr/bin/env bun

import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";

import { validateBetaOperatingReadinessReport, type BetaOperatingReadinessReport } from "./check-beta-operating-readiness";

type GateScope =
  | "planning"
  | "local-runtime"
  | "data-auth-realtime"
  | "provider"
  | "cost-performance"
  | "observability-support";

type Gate = {
  key: string;
  label: string;
  scope: GateScope;
  ready: boolean;
  evidence: string;
  blocker: string | null;
  source: string | null;
};

type Artifact<T> = {
  source: string | null;
  present: boolean;
  value: T | null;
};

type InventoryReport = {
  counts?: {
    appRoutes?: number;
    providerCoupledFiles?: number;
    distinctRpcNames?: number;
    cloudflareScripts?: number;
  };
  sqlInventory?: {
    appliedMigrationFiles?: number;
    functionDeclarationMatches?: number;
    rlsPolicyStorageAuthMatches?: number;
  };
};

type WorkerPreviewRouteReport = {
  passed?: boolean;
  results?: Array<{
    key?: string;
    required?: boolean;
    passed?: boolean;
  }>;
};

type HostedRouteProofReport = {
  configured?: boolean;
  providerBacked?: boolean;
  routeContractReady?: boolean;
  hostedRouteProofReady?: boolean;
  passed?: boolean;
  results?: Array<{
    key?: string;
    required?: boolean;
    passed?: boolean;
  }>;
};

type WorkerReadinessReport = {
  manifestReady?: boolean;
  localPreviewReady?: boolean;
  deploymentSecretsReady?: boolean;
  deploymentReady?: boolean;
  providerSecretList?: {
    checked?: boolean;
    ready?: boolean;
  };
};

type PlatformToolchainReport = {
  readiness?: {
    localToolchainSnapshotReady?: boolean;
    productionDeployReady?: boolean;
  };
  wranglerConfig?: {
    observabilityConfigured?: boolean;
  };
  generatedTypes?: {
    allConfiguredBindingsTyped?: boolean;
  };
};

type DeployDryRunReport = {
  readiness?: {
    localWranglerDryRunReady?: boolean;
    productionDeployReady?: boolean;
  };
  dryRun?: {
    exitCode?: number;
    noUploadMarkerSeen?: boolean;
    warnings?: string[];
    requiredBindingsReady?: boolean;
  };
};

type QueuesCronProofReport = {
  readiness?: {
    localQueueConfigReady?: boolean;
    workerQueueHandlerReady?: boolean;
    localQueueProducerReady?: boolean;
    localConsumerAckReady?: boolean;
    localRetryReady?: boolean;
    localDeadLetterDecisionReady?: boolean;
    localDuplicateDeliveryReady?: boolean;
    localPoisonMessageReady?: boolean;
    localQueuesCronProofReady?: boolean;
    providerBacked?: boolean;
    productionJobsMessagingReady?: boolean;
  };
};

type WranglerAuthReport = {
  readiness?: {
    wranglerCliAvailable?: boolean;
    wranglerAuthCheckCompleted?: boolean;
    wranglerApiAuthenticated?: boolean;
    providerReadbackReady?: boolean;
    productionDeployReady?: boolean;
  };
};

type ProviderResourceReadbackReport = {
  readiness?: {
    wranglerAuthenticated?: boolean;
    providerReadbackAttempted?: boolean;
    workerDeploymentReadbackReady?: boolean;
    d1DatabaseReadbackReady?: boolean;
    r2BucketReadbackReady?: boolean;
    queuesReadbackReady?: boolean;
    workerSecretNameReadbackReady?: boolean;
    providerResourceReadbackReady?: boolean;
  };
  blockers?: string[];
};

type PricingSnapshotReport = {
  readiness?: {
    officialCloudflarePricingRefreshed?: boolean;
    productionCostDecisionReady?: boolean;
    requiredProductsMissing?: string[];
    invalidSourceUrlCount?: number;
  };
};

type CostPerformanceWorkbook = {
  readiness?: {
    currentProviderCostsReady?: boolean;
    cloudflarePricingRefreshed?: boolean;
    cloudflareUsageCostsReady?: boolean;
    localPreviewPerformanceCaptured?: boolean;
    hostedCredentialFreePerformanceCaptured?: boolean;
    productionRuntimePerformanceReady?: boolean;
    strictHostedClientP95Ready?: boolean;
    aggregateHostedPerformanceReady?: boolean;
    hostedPerformanceReady?: boolean;
    productionCostDecisionReady?: boolean;
  };
};

type D1AuthRealtimeReadinessReport = {
  readiness?: {
    databaseInventoryReady?: boolean;
    d1BindingReady?: boolean;
    authReplacementReady?: boolean;
    appLayerAuthzSpecReady?: boolean;
    localRpcTransactionMechanicsReady?: boolean;
    localBetaFeedbackD1SliceReady?: boolean;
    localCollaborationInvitationD1SliceReady?: boolean;
    localClosedBetaD1SliceReady?: boolean;
    localComponentLibraryD1SliceReady?: boolean;
    localEstimateHistoryD1SliceReady?: boolean;
    rpcRewritePlanReady?: boolean;
    realtimeReplacementReady?: boolean;
    restoreProofReady?: boolean;
    recoveryReceiptValid?: boolean;
    performanceProofReady?: boolean;
    localRedesignReadinessReportReady?: boolean;
    productionD1AuthRealtimeReady?: boolean;
  };
  inventorySummary?: {
    distinctRpcNames?: number | null;
    rlsPolicyStorageAuthMatches?: number | null;
  };
};

type ProviderReadinessReport = {
  dashboardInventoryReady?: boolean;
  workersDeploymentReady?: boolean;
  storageMediaReady?: boolean;
  jobsReady?: boolean;
  analyticsReady?: boolean;
  productionCutoverReady?: boolean;
};

type AgentDebuggingSnapshotGateFailure = {
  key?: string;
  readinessKey?: string;
  command?: string;
  nextAction?: string;
};

type AgentDebuggingSnapshotReport = {
  localLogs?: {
    exists?: boolean;
    parsedRecords?: number;
    malformedLines?: number;
    latestError?: {
      origin?: string;
      freshness?: string;
    } | null;
    latestRuntimeError?: unknown;
  };
  errorHandling?: {
    passed?: boolean;
    violationCount?: number;
  };
  readiness?: {
    localDebuggingReady?: boolean;
    operationalIncidentsReady?: boolean;
    alertScenarioCatalogReady?: boolean;
    productionAlertScenarioProducerReady?: boolean;
    productionEvidenceCollectionReady?: boolean;
    productionIncidentAlertingReady?: boolean;
    productionHostedProofReady?: boolean;
    supportMonitoringReady?: boolean;
  };
  readinessGates?: {
    local?: {
      ready?: boolean;
      failures?: AgentDebuggingSnapshotGateFailure[];
    };
    production?: {
      ready?: boolean;
      failures?: AgentDebuggingSnapshotGateFailure[];
    };
  };
};

type ProductionObservabilityProofReport = {
  productionObservabilityReady?: boolean;
  totals?: {
    required?: number;
    passed?: number;
    failed?: number;
    missing?: number;
    invalid?: number;
  };
  failedRequirementKeys?: string[];
};

type ObservabilityProofRouteSmokeReport = {
  routeStatus?: string;
  routeReachable?: boolean;
  authorizationEnforced?: boolean;
  readyForWorkersLogsProof?: boolean;
  nextAction?: string;
  http?: {
    status?: number | null;
  };
};

type SupportMonitoringReadinessReport = {
  supportMonitoringReady?: boolean;
  summary?: {
    passed?: number;
    missing?: number;
    failed?: number;
  };
  requirements?: Array<{
    key?: string;
    status?: string;
  }>;
  missing?: string[];
};

export type ReleaseGateInputs = {
  generatedAt?: string;
  inventory: Artifact<InventoryReport>;
  workerPreviewRoutes: Artifact<WorkerPreviewRouteReport>;
  hostedRoutes: Artifact<HostedRouteProofReport>;
  workerReadiness: Artifact<WorkerReadinessReport>;
  platformToolchain: Artifact<PlatformToolchainReport>;
  wranglerAuth: Artifact<WranglerAuthReport>;
  providerResources: Artifact<ProviderResourceReadbackReport>;
  deployDryRun: Artifact<DeployDryRunReport>;
  queuesCronProof: Artifact<QueuesCronProofReport>;
  pricingSnapshot: Artifact<PricingSnapshotReport>;
  costPerformanceWorkbook: Artifact<CostPerformanceWorkbook>;
  d1AuthRealtimeReadiness: Artifact<D1AuthRealtimeReadinessReport>;
  providerReadiness: Artifact<ProviderReadinessReport>;
  agentDebugSnapshot: Artifact<AgentDebuggingSnapshotReport>;
  observabilityProofRoute: Artifact<ObservabilityProofRouteSmokeReport>;
  productionObservability: Artifact<ProductionObservabilityProofReport>;
  supportMonitoring: Artifact<SupportMonitoringReadinessReport>;
  betaOperatingReadiness: Artifact<BetaOperatingReadinessReport>;
};

export type CloudflareReleaseGateReport = {
  generatedAt: string;
  mode: "cloudflare-release-gates";
  sources: Record<string, string | null>;
  gates: Gate[];
  readiness: {
    planningInputsReady: boolean;
    localRuntimeProofReady: boolean;
    providerDashboardInventoryReady: boolean;
    providerProofReady: boolean;
    costPerformanceProofReady: boolean;
    dataAuthRealtimeProofReady: boolean;
    observabilitySupportProofReady: boolean;
    localReleaseGateReportReady: boolean;
    productionCutoverReady: boolean;
  };
  blockers: string[];
  note: string;
};

const PLAN_ROOT = ".ai/03_plans/2026-06-29-Cloudflare-Migration-Codex/evidence";

const DEFAULT_FILES = {
  inventory: `${PLAN_ROOT}/2026-06-30-cloudflare-migration-inventory.json`,
  workerPreviewRoutes: `${PLAN_ROOT}/2026-06-29-cloudflare-worker-preview-route-probe.json`,
  hostedRoutes: `${PLAN_ROOT}/2026-07-01-cloudflare-hosted-route-proof.json`,
  workerReadiness: `${PLAN_ROOT}/2026-07-01-cloudflare-worker-readiness.json`,
  platformToolchain: `${PLAN_ROOT}/2026-06-30-cloudflare-platform-toolchain.json`,
  wranglerAuth: `${PLAN_ROOT}/2026-06-30-cloudflare-wrangler-auth.json`,
  providerResources: `${PLAN_ROOT}/2026-07-01-cloudflare-provider-resource-readback.json`,
  deployDryRun: `${PLAN_ROOT}/2026-06-30-cloudflare-wrangler-deploy-dry-run.json`,
  queuesCronProof: `${PLAN_ROOT}/2026-06-30-cloudflare-queues-cron-proof.json`,
  pricingSnapshot: `${PLAN_ROOT}/2026-06-30-cloudflare-official-pricing-snapshot.json`,
  costPerformanceWorkbook: `${PLAN_ROOT}/2026-07-01-cloudflare-cost-performance-workbook.json`,
  d1AuthRealtimeReadiness: `${PLAN_ROOT}/2026-07-01-cloudflare-d1-auth-realtime-readiness.json`,
  providerReadiness: `${PLAN_ROOT}/2026-07-01-cloudflare-provider-readiness.json`,
  agentDebugSnapshot: ".ai/99_scratch/agent-debugging-snapshot-current.json",
  observabilityProofRoute:
    ".ai/99_scratch/observability-proof-route-smoke-current.json",
  productionObservability:
    ".ai/99_scratch/production-observability-proof-check-current.json",
  supportMonitoring: ".ai/99_scratch/support-monitoring-readiness-current.json",
  betaOperatingReadiness: ".ai/99_scratch/beta-operating-readiness-current.json",
} as const;

function readEnv(name: string) {
  const value = process.env[name];
  return value?.trim() || undefined;
}

function envEnabled(env: Record<string, string | undefined>, name: string) {
  const value = env[name]?.trim().toLowerCase();
  return value === "1" || value === "true" || value === "yes";
}

function readArtifact<T>(source: string | undefined): Artifact<T> {
  if (!source || !existsSync(source)) {
    return { source: source ?? null, present: false, value: null };
  }
  return {
    source,
    present: true,
    value: JSON.parse(readFileSync(source, "utf8")) as T,
  };
}

function boolLabel(value: unknown) {
  if (value === true) return "yes";
  if (value === false) return "no";
  return "(missing)";
}

function numberLabel(value: unknown) {
  return typeof value === "number" && Number.isFinite(value)
    ? String(value)
    : "(missing)";
}

function gate(
  key: string,
  label: string,
  scope: GateScope,
  ready: boolean,
  evidence: string,
  blocker: string,
  source: string | null,
): Gate {
  return {
    key,
    label,
    scope,
    ready,
    evidence,
    blocker: ready ? null : blocker,
    source,
  };
}

function artifactMissingGate(
  key: string,
  label: string,
  scope: GateScope,
  source: string | null,
): Gate {
  return gate(
    key,
    label,
    scope,
    false,
    `source=${source ?? "(none)"}, present=no`,
    "Required Cloudflare migration evidence artifact is missing.",
    source,
  );
}

function releaseArtifactMissingGate(
  key: string,
  label: string,
  scope: GateScope,
  source: string | null,
): Gate {
  return gate(
    key,
    label,
    scope,
    false,
    `source=${source ?? "(none)"}, present=no`,
    "Required release evidence artifact is missing.",
    source,
  );
}

function providerResourceReadbackBlocker(
  report: ProviderResourceReadbackReport | null | undefined,
) {
  const detail = report?.blockers?.find((blocker) => blocker.trim());
  return detail
    ? `Read-only Wrangler resource readback is incomplete: ${detail}`
    : "Read-only Wrangler resource readback for Worker deployment, D1, R2, Queues, and Worker secret names is incomplete.";
}

function requiredRouteProbeSummary(report: WorkerPreviewRouteReport | null) {
  const required = (report?.results ?? []).filter(
    (result) => result.required === true,
  );
  const failed = required.filter((result) => result.passed !== true);
  return {
    requiredCount: required.length,
    failedKeys: failed.map((result) => result.key ?? "(unknown)"),
    ready:
      report?.passed === true && required.length > 0 && failed.length === 0,
  };
}

function failureKeyList(
  failures: AgentDebuggingSnapshotGateFailure[] | undefined,
) {
  const keys = (failures ?? [])
    .map((failure) => failure.key)
    .filter((key): key is string => Boolean(key));
  return keys.length > 0 ? keys.join(", ") : "(none)";
}

function agentSnapshotProductionReady(
  report: AgentDebuggingSnapshotReport | null | undefined,
) {
  if (report?.readinessGates?.production?.ready === true) return true;
  const readiness = report?.readiness;
  if (!readiness) return false;
  return (
    readiness.operationalIncidentsReady === true &&
    readiness.alertScenarioCatalogReady === true &&
    readiness.productionAlertScenarioProducerReady === true &&
    readiness.productionEvidenceCollectionReady === true &&
    readiness.productionIncidentAlertingReady === true &&
    readiness.productionHostedProofReady === true &&
    readiness.supportMonitoringReady === true
  );
}

function agentSnapshotProductionBlocker(
  report: AgentDebuggingSnapshotReport | null | undefined,
) {
  const failures = report?.readinessGates?.production?.failures ?? [];
  const keys = failureKeyList(failures);
  if (keys !== "(none)") {
    return `Agent debugging production gate is red: ${keys}. Run \`AGENT_DEBUG_SNAPSHOT_REQUIRE_PRODUCTION=1 OUTPUT_FILE=.ai/99_scratch/agent-debugging-snapshot-current.json bun run ops:agent-debug-snapshot\` and resolve the reported readinessGates.production failures.`;
  }
  return "Agent debugging production gate is incomplete. Generate a fresh agent debugging snapshot and resolve production evidence, incident alerting, hosted proof, and support monitoring blockers.";
}

function observabilityFailedKeys(
  report: ProductionObservabilityProofReport | null | undefined,
) {
  const keys = report?.failedRequirementKeys ?? [];
  return keys.length > 0 ? keys.join(", ") : "(none)";
}

function supportMonitoringFailedKeys(
  report: SupportMonitoringReadinessReport | null | undefined,
) {
  const requirementKeys = (report?.requirements ?? [])
    .filter((requirement) => requirement.status !== "passed")
    .map((requirement) => requirement.key)
    .filter((key): key is string => Boolean(key));
  const missing = report?.missing ?? [];
  const keys = requirementKeys.length > 0 ? requirementKeys : missing;
  return keys.length > 0 ? keys.join(", ") : "(none)";
}

function buildGates(inputs: ReleaseGateInputs) {
  const gates: Gate[] = [];

  if (!inputs.inventory.present) {
    gates.push(
      artifactMissingGate(
        "inventory-refresh",
        "Migration inventory refreshed",
        "planning",
        inputs.inventory.source,
      ),
    );
  } else {
    const counts = inputs.inventory.value?.counts;
    const sql = inputs.inventory.value?.sqlInventory;
    gates.push(
      gate(
        "inventory-refresh",
        "Migration inventory refreshed",
        "planning",
        Boolean(
          counts?.appRoutes &&
          counts.providerCoupledFiles &&
          counts.distinctRpcNames &&
          sql?.appliedMigrationFiles,
        ),
        `routes=${numberLabel(counts?.appRoutes)}, providerCoupledFiles=${numberLabel(counts?.providerCoupledFiles)}, rpcNames=${numberLabel(counts?.distinctRpcNames)}, sqlMigrations=${numberLabel(sql?.appliedMigrationFiles)}`,
        "Repeatable route/provider/RPC/SQL migration inventory is incomplete.",
        inputs.inventory.source,
      ),
    );
  }

  if (!inputs.pricingSnapshot.present) {
    gates.push(
      artifactMissingGate(
        "official-pricing-refresh",
        "Official Cloudflare pricing refreshed",
        "planning",
        inputs.pricingSnapshot.source,
      ),
    );
  } else {
    const readiness = inputs.pricingSnapshot.value?.readiness;
    gates.push(
      gate(
        "official-pricing-refresh",
        "Official Cloudflare pricing refreshed",
        "planning",
        readiness?.officialCloudflarePricingRefreshed === true &&
          (readiness.requiredProductsMissing ?? []).length === 0 &&
          readiness.invalidSourceUrlCount === 0,
        `pricingRefreshed=${boolLabel(readiness?.officialCloudflarePricingRefreshed)}, missingProducts=${readiness?.requiredProductsMissing?.length ?? "(missing)"}, invalidSourceUrls=${numberLabel(readiness?.invalidSourceUrlCount)}`,
        "Official Cloudflare pricing snapshot is missing required product coverage or has invalid sources.",
        inputs.pricingSnapshot.source,
      ),
    );
  }

  if (!inputs.costPerformanceWorkbook.present) {
    gates.push(
      artifactMissingGate(
        "local-workbook-scaffold",
        "Local cost/performance workbook scaffold generated",
        "planning",
        inputs.costPerformanceWorkbook.source,
      ),
    );
  } else {
    const readiness = inputs.costPerformanceWorkbook.value?.readiness;
    gates.push(
      gate(
        "local-workbook-scaffold",
        "Local cost/performance workbook scaffold generated",
        "planning",
        readiness?.cloudflarePricingRefreshed === true &&
          readiness.localPreviewPerformanceCaptured === true,
        `pricingRefreshed=${boolLabel(readiness?.cloudflarePricingRefreshed)}, localPreviewPerformanceCaptured=${boolLabel(readiness?.localPreviewPerformanceCaptured)}`,
        "Local workbook scaffold does not yet have pricing plus local preview performance evidence.",
        inputs.costPerformanceWorkbook.source,
      ),
    );
  }

  if (!inputs.d1AuthRealtimeReadiness.present) {
    gates.push(
      artifactMissingGate(
        "d1-auth-realtime-local-report",
        "D1/Auth/Realtime local redesign readiness report generated",
        "data-auth-realtime",
        inputs.d1AuthRealtimeReadiness.source,
      ),
    );
    gates.push(
      artifactMissingGate(
        "d1-auth-realtime-production-proof",
        "D1/Auth/Realtime production proof ready",
        "data-auth-realtime",
        inputs.d1AuthRealtimeReadiness.source,
      ),
    );
  } else {
    const readiness = inputs.d1AuthRealtimeReadiness.value?.readiness;
    const inventorySummary =
      inputs.d1AuthRealtimeReadiness.value?.inventorySummary;
    gates.push(
      gate(
        "d1-auth-realtime-local-report",
        "D1/Auth/Realtime local redesign readiness report generated",
        "data-auth-realtime",
        readiness?.localRedesignReadinessReportReady === true,
        `localReportReady=${boolLabel(readiness?.localRedesignReadinessReportReady)}, databaseInventoryReady=${boolLabel(readiness?.databaseInventoryReady)}, inventoryRpcNames=${numberLabel(inventorySummary?.distinctRpcNames)}, rlsPolicyStorageAuthMatches=${numberLabel(inventorySummary?.rlsPolicyStorageAuthMatches)}`,
        "Local D1/Auth/Realtime redesign blocker inventory is missing or incomplete.",
        inputs.d1AuthRealtimeReadiness.source,
      ),
      gate(
        "d1-auth-realtime-production-proof",
        "D1/Auth/Realtime production proof ready",
        "data-auth-realtime",
        readiness?.productionD1AuthRealtimeReady === true && readiness?.recoveryReceiptValid === true,
        `d1Binding=${boolLabel(readiness?.d1BindingReady)}, authReplacement=${boolLabel(readiness?.authReplacementReady)}, appLayerAuthz=${boolLabel(readiness?.appLayerAuthzSpecReady)}, localRpcMechanics=${boolLabel(readiness?.localRpcTransactionMechanicsReady)}, betaFeedbackSlice=${boolLabel(readiness?.localBetaFeedbackD1SliceReady)}, collaborationInvitationSlice=${boolLabel(readiness?.localCollaborationInvitationD1SliceReady)}, closedBetaSlice=${boolLabel(readiness?.localClosedBetaD1SliceReady)}, componentLibrarySlice=${boolLabel(readiness?.localComponentLibraryD1SliceReady)}, estimateHistorySlice=${boolLabel(readiness?.localEstimateHistoryD1SliceReady)}, rpcRewrite=${boolLabel(readiness?.rpcRewritePlanReady)}, realtimeReplacement=${boolLabel(readiness?.realtimeReplacementReady)}, restoreProof=${boolLabel(readiness?.restoreProofReady)}, recoveryReceipt=${boolLabel(readiness?.recoveryReceiptValid)}, performanceProof=${boolLabel(readiness?.performanceProofReady)}`,
        "One or more D1/Auth/Realtime production proof subgates are incomplete; see the evidence flags for the exact blockers.",
        inputs.d1AuthRealtimeReadiness.source,
      ),
    );
  }

  if (!inputs.workerReadiness.present) {
    gates.push(
      artifactMissingGate(
        "worker-manifest-local-readiness",
        "Worker manifest and local preview controls ready",
        "local-runtime",
        inputs.workerReadiness.source,
      ),
    );
  } else {
    const value = inputs.workerReadiness.value;
    gates.push(
      gate(
        "worker-manifest-local-readiness",
        "Worker manifest and local preview controls ready",
        "local-runtime",
        value?.manifestReady === true && value.localPreviewReady === true,
        `manifestReady=${boolLabel(value?.manifestReady)}, localPreviewReady=${boolLabel(value?.localPreviewReady)}`,
        "Worker manifest, local preview controls, or required env/binding declarations are incomplete.",
        inputs.workerReadiness.source,
      ),
    );
  }

  if (!inputs.workerPreviewRoutes.present) {
    gates.push(
      artifactMissingGate(
        "worker-preview-route-probe",
        "Local Worker route probe passed",
        "local-runtime",
        inputs.workerPreviewRoutes.source,
      ),
    );
  } else {
    const summary = requiredRouteProbeSummary(inputs.workerPreviewRoutes.value);
    gates.push(
      gate(
        "worker-preview-route-probe",
        "Local Worker route probe passed",
        "local-runtime",
        summary.ready,
        `reportPassed=${boolLabel(inputs.workerPreviewRoutes.value?.passed)}, requiredRoutes=${summary.requiredCount}, failedRequired=${summary.failedKeys.length === 0 ? "(none)" : summary.failedKeys.join(", ")}`,
        "Local Worker preview route probe has required failures or no required route samples.",
        inputs.workerPreviewRoutes.source,
      ),
    );
  }

  if (!inputs.hostedRoutes.present) {
    gates.push(
      artifactMissingGate(
        "hosted-worker-route-proof",
        "Hosted Worker route matrix proof captured",
        "provider",
        inputs.hostedRoutes.source,
      ),
    );
  } else {
    const summary = requiredRouteProbeSummary(inputs.hostedRoutes.value);
    const value = inputs.hostedRoutes.value;
    gates.push(
      gate(
        "hosted-worker-route-proof",
        "Hosted Worker route matrix proof captured",
        "provider",
        value?.providerBacked === true &&
          value.configured === true &&
          value.routeContractReady === true &&
          value.hostedRouteProofReady === true &&
          value.passed === true &&
          summary.ready,
        `configured=${boolLabel(value?.configured)}, providerBacked=${boolLabel(value?.providerBacked)}, routeContractReady=${boolLabel(value?.routeContractReady)}, hostedRouteProofReady=${boolLabel(value?.hostedRouteProofReady)}, requiredRoutes=${summary.requiredCount}, failedRequired=${summary.failedKeys.length === 0 ? "(none)" : summary.failedKeys.join(", ")}`,
        "Hosted HTTPS Cloudflare Worker route matrix proof is missing or has required failures.",
        inputs.hostedRoutes.source,
      ),
    );
  }

  if (!inputs.platformToolchain.present) {
    gates.push(
      artifactMissingGate(
        "platform-toolchain-snapshot",
        "Cloudflare platform toolchain snapshot ready",
        "local-runtime",
        inputs.platformToolchain.source,
      ),
    );
  } else {
    const value = inputs.platformToolchain.value;
    gates.push(
      gate(
        "platform-toolchain-snapshot",
        "Cloudflare platform toolchain snapshot ready",
        "local-runtime",
        value?.readiness?.localToolchainSnapshotReady === true,
        `localToolchainSnapshotReady=${boolLabel(value?.readiness?.localToolchainSnapshotReady)}, observabilityConfigured=${boolLabel(value?.wranglerConfig?.observabilityConfigured)}, allBindingsTyped=${boolLabel(value?.generatedTypes?.allConfiguredBindingsTyped)}`,
        "Wrangler/OpenNext/schema/typegen/observability local toolchain proof is incomplete.",
        inputs.platformToolchain.source,
      ),
    );
  }

  if (!inputs.wranglerAuth.present) {
    gates.push(
      artifactMissingGate(
        "provider-wrangler-auth",
        "Wrangler/API auth readback ready",
        "provider",
        inputs.wranglerAuth.source,
      ),
    );
  } else {
    const readiness = inputs.wranglerAuth.value?.readiness;
    gates.push(
      gate(
        "provider-wrangler-auth",
        "Wrangler/API auth readback ready",
        "provider",
        readiness?.wranglerApiAuthenticated === true &&
          readiness.providerReadbackReady === true,
        `cliAvailable=${boolLabel(readiness?.wranglerCliAvailable)}, authCheckCompleted=${boolLabel(readiness?.wranglerAuthCheckCompleted)}, wranglerApiAuthenticated=${boolLabel(readiness?.wranglerApiAuthenticated)}, providerReadbackReady=${boolLabel(readiness?.providerReadbackReady)}`,
        "Wrangler/API authentication has not been proven; run `wrangler login` or configure a scoped token outside the repo, then rerun the auth check.",
        inputs.wranglerAuth.source,
      ),
    );
  }

  if (!inputs.providerResources.present) {
    gates.push(
      artifactMissingGate(
        "provider-resource-readback",
        "Provider resource readback ready",
        "provider",
        inputs.providerResources.source,
      ),
    );
  } else {
    const readiness = inputs.providerResources.value?.readiness;
    gates.push(
      gate(
        "provider-resource-readback",
        "Provider resource readback ready",
        "provider",
        readiness?.providerResourceReadbackReady === true,
        `wranglerAuthenticated=${boolLabel(readiness?.wranglerAuthenticated)}, readbackAttempted=${boolLabel(readiness?.providerReadbackAttempted)}, workerDeployment=${boolLabel(readiness?.workerDeploymentReadbackReady)}, d1=${boolLabel(readiness?.d1DatabaseReadbackReady)}, r2=${boolLabel(readiness?.r2BucketReadbackReady)}, queues=${boolLabel(readiness?.queuesReadbackReady)}, secrets=${boolLabel(readiness?.workerSecretNameReadbackReady)}`,
        providerResourceReadbackBlocker(inputs.providerResources.value),
        inputs.providerResources.source,
      ),
    );
  }

  if (!inputs.deployDryRun.present) {
    gates.push(
      artifactMissingGate(
        "wrangler-deploy-dry-run",
        "Wrangler deploy dry-run ready",
        "local-runtime",
        inputs.deployDryRun.source,
      ),
    );
  } else {
    const value = inputs.deployDryRun.value;
    gates.push(
      gate(
        "wrangler-deploy-dry-run",
        "Wrangler deploy dry-run ready",
        "local-runtime",
        value?.readiness?.localWranglerDryRunReady === true &&
          (value.dryRun?.warnings ?? []).length === 0,
        `localWranglerDryRunReady=${boolLabel(value?.readiness?.localWranglerDryRunReady)}, exitCode=${numberLabel(value?.dryRun?.exitCode)}, noUploadMarkerSeen=${boolLabel(value?.dryRun?.noUploadMarkerSeen)}, warnings=${value?.dryRun?.warnings?.length ?? "(missing)"}, requiredBindingsReady=${boolLabel(value?.dryRun?.requiredBindingsReady)}`,
        "Wrangler dry-run is missing, failed, emitted warnings, or lacks required binding evidence.",
        inputs.deployDryRun.source,
      ),
    );
  }

  if (!inputs.queuesCronProof.present) {
    gates.push(
      artifactMissingGate(
        "queues-cron-local-proof",
        "Queues/Cron local retry and DLQ proof ready",
        "local-runtime",
        inputs.queuesCronProof.source,
      ),
    );
  } else {
    const readiness = inputs.queuesCronProof.value?.readiness;
    gates.push(
      gate(
        "queues-cron-local-proof",
        "Queues/Cron local retry and DLQ proof ready",
        "local-runtime",
        readiness?.localQueuesCronProofReady === true,
        `queueConfig=${boolLabel(readiness?.localQueueConfigReady)}, workerQueueHandler=${boolLabel(readiness?.workerQueueHandlerReady)}, producer=${boolLabel(readiness?.localQueueProducerReady)}, ack=${boolLabel(readiness?.localConsumerAckReady)}, retry=${boolLabel(readiness?.localRetryReady)}, dlq=${boolLabel(readiness?.localDeadLetterDecisionReady)}, duplicate=${boolLabel(readiness?.localDuplicateDeliveryReady)}, poison=${boolLabel(readiness?.localPoisonMessageReady)}, providerBacked=${boolLabel(readiness?.providerBacked)}, productionJobsMessaging=${boolLabel(readiness?.productionJobsMessagingReady)}`,
        "Local Queues/Cron retry, duplicate, poison-message, and dead-letter decision proof is incomplete.",
        inputs.queuesCronProof.source,
      ),
    );
  }

  if (!inputs.providerReadiness.present) {
    gates.push(
      artifactMissingGate(
        "provider-dashboard-inventory",
        "Provider dashboard inventory captured",
        "provider",
        inputs.providerReadiness.source,
      ),
    );
  } else {
    const value = inputs.providerReadiness.value;
    gates.push(
      gate(
        "provider-dashboard-inventory",
        "Provider dashboard inventory captured",
        "provider",
        value?.dashboardInventoryReady === true,
        `dashboardInventoryReady=${boolLabel(value?.dashboardInventoryReady)}`,
        "Sanitized Cloudflare dashboard inventory is missing or incomplete.",
        inputs.providerReadiness.source,
      ),
      gate(
        "provider-workers-deployment",
        "Hosted Worker deployment and custom domain provider-proven",
        "provider",
        value?.workersDeploymentReady === true &&
          inputs.workerReadiness.value?.deploymentReady === true &&
          inputs.wranglerAuth.value?.readiness?.wranglerApiAuthenticated ===
            true,
        `workersDeploymentReady=${boolLabel(value?.workersDeploymentReady)}, workerDeploymentSecretsReady=${boolLabel(inputs.workerReadiness.value?.deploymentSecretsReady)}, workerDeploymentReady=${boolLabel(inputs.workerReadiness.value?.deploymentReady)}, wranglerApiAuthenticated=${boolLabel(inputs.wranglerAuth.value?.readiness?.wranglerApiAuthenticated)}`,
        "Workers Paid/API auth/secrets/hosted Worker/custom-domain proof is incomplete.",
        inputs.providerReadiness.source,
      ),
      gate(
        "provider-storage-media",
        "R2 and Images provider proof ready",
        "provider",
        value?.storageMediaReady === true,
        `storageMediaReady=${boolLabel(value?.storageMediaReady)}`,
        "R2 bucket/readback and Cloudflare Images provider proof is incomplete.",
        inputs.providerReadiness.source,
      ),
      gate(
        "provider-jobs-messaging",
        "Cron/Queues/dead-letter provider proof ready",
        "provider",
        value?.jobsReady === true,
        `jobsReady=${boolLabel(value?.jobsReady)}`,
        "Cloudflare Cron/Queues/dead-letter provider proof is incomplete.",
        inputs.providerReadiness.source,
      ),
      gate(
        "provider-analytics-receipt",
        "Cloudflare analytics and observability receipt ready",
        "provider",
        value?.analyticsReady === true,
        `analyticsReady=${boolLabel(value?.analyticsReady)}`,
        "Cloudflare Web Analytics/Workers Observability receipt is incomplete.",
        inputs.providerReadiness.source,
      ),
    );
  }

  if (!inputs.costPerformanceWorkbook.present) {
    gates.push(
      artifactMissingGate(
        "current-provider-costs",
        "Current provider cost inputs captured",
        "cost-performance",
        inputs.costPerformanceWorkbook.source,
      ),
    );
    gates.push(
      artifactMissingGate(
        "cloudflare-usage-costs",
        "Cloudflare usage cost inputs captured",
        "cost-performance",
        inputs.costPerformanceWorkbook.source,
      ),
    );
    gates.push(
      artifactMissingGate(
        "hosted-performance-proof",
        "Hosted Cloudflare performance proof captured",
        "cost-performance",
        inputs.costPerformanceWorkbook.source,
      ),
    );
    gates.push(
      artifactMissingGate(
        "production-cost-decision",
        "Production cost decision ready",
        "cost-performance",
        inputs.costPerformanceWorkbook.source,
      ),
    );
  } else {
    const readiness = inputs.costPerformanceWorkbook.value?.readiness;
    gates.push(
      gate(
        "current-provider-costs",
        "Current provider cost inputs captured",
        "cost-performance",
        readiness?.currentProviderCostsReady === true,
        `currentProviderCostsReady=${boolLabel(readiness?.currentProviderCostsReady)}`,
        "Sanitized Vercel/Supabase/Resend invoice or dashboard usage inputs are missing.",
        inputs.costPerformanceWorkbook.source,
      ),
      gate(
        "cloudflare-usage-costs",
        "Cloudflare usage cost inputs captured",
        "cost-performance",
        readiness?.cloudflareUsageCostsReady === true,
        `cloudflareUsageCostsReady=${boolLabel(readiness?.cloudflareUsageCostsReady)}`,
        "Hosted Cloudflare request/CPU/storage/operation usage inputs are missing.",
        inputs.costPerformanceWorkbook.source,
      ),
      gate(
        "hosted-performance-proof",
        "Hosted Cloudflare runtime performance proof captured",
        "cost-performance",
        readiness?.productionRuntimePerformanceReady === true,
        `hostedCredentialFreePerformanceCaptured=${boolLabel(readiness?.hostedCredentialFreePerformanceCaptured)}, productionRuntimePerformanceReady=${boolLabel(readiness?.productionRuntimePerformanceReady)}, strictHostedClientP95Ready=${boolLabel(readiness?.strictHostedClientP95Ready)}, aggregateHostedPerformanceReady=${boolLabel(readiness?.aggregateHostedPerformanceReady ?? readiness?.productionRuntimePerformanceReady)}`,
        "Hosted Cloudflare runtime performance evidence is missing or failing. Strict local-client p95 route timing remains visible in the workbook but is tracked separately from provider runtime readiness.",
        inputs.costPerformanceWorkbook.source,
      ),
      gate(
        "production-cost-decision",
        "Production cost decision ready",
        "cost-performance",
        readiness?.productionCostDecisionReady === true,
        `productionCostDecisionReady=${boolLabel(readiness?.productionCostDecisionReady)}`,
        "Production cost decision cannot pass until current-provider and hosted Cloudflare usage/performance evidence exists.",
        inputs.costPerformanceWorkbook.source,
      ),
    );
  }

  if (!inputs.agentDebugSnapshot.present) {
    gates.push(
      releaseArtifactMissingGate(
        "agent-debug-local-readiness",
        "Agent debugging local snapshot ready",
        "observability-support",
        inputs.agentDebugSnapshot.source,
      ),
    );
    gates.push(
      releaseArtifactMissingGate(
        "agent-debug-production-readiness",
        "Agent debugging production gate ready",
        "observability-support",
        inputs.agentDebugSnapshot.source,
      ),
    );
  } else {
    const value = inputs.agentDebugSnapshot.value;
    const localReady =
      value?.readinessGates?.local?.ready === true ||
      value?.readiness?.localDebuggingReady === true;
    const productionReady = agentSnapshotProductionReady(value);
    gates.push(
      gate(
        "agent-debug-local-readiness",
        "Agent debugging local snapshot ready",
        "observability-support",
        localReady,
        `localReady=${boolLabel(value?.readinessGates?.local?.ready ?? value?.readiness?.localDebuggingReady)}, logExists=${boolLabel(value?.localLogs?.exists)}, parsedRecords=${numberLabel(value?.localLogs?.parsedRecords)}, malformedLines=${numberLabel(value?.localLogs?.malformedLines)}, latestOrigin=${value?.localLogs?.latestError?.origin ?? "(missing)"}, latestFreshness=${value?.localLogs?.latestError?.freshness ?? "(missing)"}, errorHandlingPassed=${boolLabel(value?.errorHandling?.passed)}, errorHandlingViolations=${numberLabel(value?.errorHandling?.violationCount)}`,
        "Agent debugging local snapshot is missing log parse, latest-error, or static error-handling readiness evidence.",
        inputs.agentDebugSnapshot.source,
      ),
      gate(
        "agent-debug-production-readiness",
        "Agent debugging production gate ready",
        "observability-support",
        productionReady,
        `productionReady=${boolLabel(value?.readinessGates?.production?.ready)}, failures=${failureKeyList(value?.readinessGates?.production?.failures)}, operationalIncidents=${boolLabel(value?.readiness?.operationalIncidentsReady)}, alertCatalog=${boolLabel(value?.readiness?.alertScenarioCatalogReady)}, alertProducer=${boolLabel(value?.readiness?.productionAlertScenarioProducerReady)}, hostedProofEnv=${boolLabel(value?.readiness?.productionEvidenceCollectionReady)}, incidentAlerting=${boolLabel(value?.readiness?.productionIncidentAlertingReady)}, hostedProof=${boolLabel(value?.readiness?.productionHostedProofReady)}, supportMonitoring=${boolLabel(value?.readiness?.supportMonitoringReady)}`,
        agentSnapshotProductionBlocker(value),
        inputs.agentDebugSnapshot.source,
      ),
    );
  }

  if (!inputs.productionObservability.present) {
    gates.push(
      releaseArtifactMissingGate(
        "hosted-observability-proof",
        "Hosted observability proof bundle ready",
        "observability-support",
        inputs.productionObservability.source,
      ),
    );
  } else {
    const value = inputs.productionObservability.value;
    const failedKeys = value?.failedRequirementKeys ?? [];
    gates.push(
      gate(
        "hosted-observability-proof",
        "Hosted observability proof bundle ready",
        "observability-support",
        value?.productionObservabilityReady === true && failedKeys.length === 0,
        `productionObservabilityReady=${boolLabel(value?.productionObservabilityReady)}, required=${numberLabel(value?.totals?.required)}, passed=${numberLabel(value?.totals?.passed)}, failed=${numberLabel(value?.totals?.failed)}, missing=${numberLabel(value?.totals?.missing)}, invalid=${numberLabel(value?.totals?.invalid)}, failedRequirements=${observabilityFailedKeys(value)}`,
        `Hosted observability proof is incomplete: ${observabilityFailedKeys(value)}. Run \`bun run ops:observability-drill\`, then collect Workers Logs and alert-delivery proof artifacts before rerunning \`bun run ops:check-observability\`.`,
        inputs.productionObservability.source,
      ),
    );
  }

  if (!inputs.observabilityProofRoute.present) {
    gates.push(
      releaseArtifactMissingGate(
        "hosted-observability-proof-route",
        "Hosted observability proof route ready",
        "observability-support",
        inputs.observabilityProofRoute.source,
      ),
    );
  } else {
    const value = inputs.observabilityProofRoute.value;
    gates.push(
      gate(
        "hosted-observability-proof-route",
        "Hosted observability proof route ready",
        "observability-support",
        value?.readyForWorkersLogsProof === true &&
          value.routeReachable === true &&
          value.authorizationEnforced === true,
        `routeStatus=${value?.routeStatus ?? "(missing)"}, httpStatus=${numberLabel(value?.http?.status)}, routeReachable=${boolLabel(value?.routeReachable)}, authorizationEnforced=${boolLabel(value?.authorizationEnforced)}, readyForWorkersLogsProof=${boolLabel(value?.readyForWorkersLogsProof)}`,
        value?.nextAction ??
          "Run `OUTPUT_FILE=.ai/99_scratch/observability-proof-route-smoke-current.json bun run ops:check-observability-route` and resolve the hosted proof-route blocker.",
        inputs.observabilityProofRoute.source,
      ),
    );
  }

  if (!inputs.supportMonitoring.present) {
    gates.push(
      releaseArtifactMissingGate(
        "support-monitoring-readiness",
        "Support monitoring readiness ready",
        "observability-support",
        inputs.supportMonitoring.source,
      ),
    );
  } else {
    const value = inputs.supportMonitoring.value;
    gates.push(
      gate(
        "support-monitoring-readiness",
        "Support monitoring readiness ready",
        "observability-support",
        value?.supportMonitoringReady === true,
        `supportMonitoringReady=${boolLabel(value?.supportMonitoringReady)}, passed=${numberLabel(value?.summary?.passed)}, missing=${numberLabel(value?.summary?.missing)}, failed=${numberLabel(value?.summary?.failed)}, openRequirements=${supportMonitoringFailedKeys(value)}`,
        `Support monitoring readiness is incomplete: ${supportMonitoringFailedKeys(value)}. Run \`OUTPUT_FILE=.ai/99_scratch/support-monitoring-readiness-current.json bun run launch:check-support-monitoring\` with the required support owners, confirmations, incident status, and observability proof artifacts.`,
        inputs.supportMonitoring.source,
      ),
    );
  }

  if (!inputs.betaOperatingReadiness.present) {
    gates.push(
      releaseArtifactMissingGate(
        "beta-operating-readiness",
        "Beta operating local readiness receipt current",
        "local-runtime",
        inputs.betaOperatingReadiness.source,
      ),
    );
  } else {
    try {
      const report = validateBetaOperatingReadinessReport(
        inputs.betaOperatingReadiness.value,
        new Date(inputs.generatedAt ?? Date.now()),
      );
      gates.push(
        gate(
          "beta-operating-readiness",
          "Beta operating local readiness receipt current",
          "local-runtime",
          report.localReady,
          `localReady=${boolLabel(report.localReady)}, decision=${report.decision}, boundaries=${report.boundaries.map((boundary) => boundary.id).join(",")}`,
          "Beta operating local criteria are incomplete or stale; hosted and human authorization boundaries remain separate.",
          inputs.betaOperatingReadiness.source,
        ),
      );
    } catch {
      gates.push(
        gate(
          "beta-operating-readiness",
          "Beta operating local readiness receipt current",
          "local-runtime",
          false,
          "receipt=invalid",
          "Beta operating readiness receipt is missing, stale, malformed, or contradictory.",
          inputs.betaOperatingReadiness.source,
        ),
      );
    }
  }

  return gates;
}

function allScopesReady(gates: Gate[], scopes: GateScope[]) {
  const scoped = gates.filter((item) => scopes.includes(item.scope));
  return scoped.length > 0 && scoped.every((item) => item.ready);
}

export function buildCloudflareReleaseGateReport(
  inputs: ReleaseGateInputs,
): CloudflareReleaseGateReport {
  const gates = buildGates(inputs);
  const planningInputsReady = allScopesReady(gates, ["planning"]);
  const localRuntimeProofReady = allScopesReady(gates, ["local-runtime"]);
  const providerDashboardInventoryReady =
    gates.find((item) => item.key === "provider-dashboard-inventory")?.ready ===
    true;
  const providerProofReady = allScopesReady(gates, ["provider"]);
  const costPerformanceProofReady = allScopesReady(gates, ["cost-performance"]);
  const dataAuthRealtimeProofReady = allScopesReady(gates, [
    "data-auth-realtime",
  ]);
  const observabilitySupportProofReady = allScopesReady(gates, [
    "observability-support",
  ]);
  const localReleaseGateReportReady =
    planningInputsReady &&
    localRuntimeProofReady &&
    providerDashboardInventoryReady;

  return {
    generatedAt: inputs.generatedAt ?? new Date().toISOString(),
    mode: "cloudflare-release-gates",
    sources: {
      inventory: inputs.inventory.source,
      workerPreviewRoutes: inputs.workerPreviewRoutes.source,
      hostedRoutes: inputs.hostedRoutes.source,
      workerReadiness: inputs.workerReadiness.source,
      platformToolchain: inputs.platformToolchain.source,
      wranglerAuth: inputs.wranglerAuth.source,
      providerResources: inputs.providerResources.source,
      deployDryRun: inputs.deployDryRun.source,
      queuesCronProof: inputs.queuesCronProof.source,
      pricingSnapshot: inputs.pricingSnapshot.source,
      costPerformanceWorkbook: inputs.costPerformanceWorkbook.source,
      d1AuthRealtimeReadiness: inputs.d1AuthRealtimeReadiness.source,
      providerReadiness: inputs.providerReadiness.source,
      agentDebugSnapshot: inputs.agentDebugSnapshot.source,
      observabilityProofRoute: inputs.observabilityProofRoute.source,
      productionObservability: inputs.productionObservability.source,
      supportMonitoring: inputs.supportMonitoring.source,
      betaOperatingReadiness: inputs.betaOperatingReadiness.source,
    },
    gates,
    readiness: {
      planningInputsReady,
      localRuntimeProofReady,
      providerDashboardInventoryReady,
      providerProofReady,
      costPerformanceProofReady,
      dataAuthRealtimeProofReady,
      observabilitySupportProofReady,
      localReleaseGateReportReady,
      productionCutoverReady:
        localReleaseGateReportReady &&
        providerProofReady &&
        costPerformanceProofReady &&
        dataAuthRealtimeProofReady &&
        observabilitySupportProofReady,
    },
    blockers: gates
      .filter((item) => !item.ready && item.blocker)
      .map((item) => `${item.label}: ${item.blocker}`),
    note: "Aggregates existing local/sanitized Cloudflare migration evidence only. It does not call Cloudflare APIs, read env files, print secrets, deploy Workers, change DNS, purchase plans, cancel subscriptions, delete resources, or mutate external providers.",
  };
}

export function cloudflareReleaseGateExitCode(
  report: CloudflareReleaseGateReport,
  env: Record<string, string | undefined> = process.env,
) {
  if (!report.readiness.localReleaseGateReportReady) return 1;
  if (
    envEnabled(env, "CLOUDFLARE_RELEASE_REQUIRE_PRODUCTION") &&
    !report.readiness.productionCutoverReady
  ) {
    return 1;
  }
  return 0;
}

function writeOutput(outputFile: string, report: CloudflareReleaseGateReport) {
  const outputPath = resolve(outputFile);
  mkdirSync(dirname(outputPath), { recursive: true });
  writeFileSync(outputPath, `${JSON.stringify(report, null, 2)}\n`);
}

function markdownRows(rows: string[][]) {
  return rows.map(
    (row) =>
      `| ${row.map((cell) => cell.replaceAll("|", "\\|")).join(" | ")} |`,
  );
}

export function writeMarkdown(
  report: CloudflareReleaseGateReport,
  markdownFile: string,
) {
  const outputPath = resolve(markdownFile);
  mkdirSync(dirname(outputPath), { recursive: true });
  const gateRows = report.gates.map((item) => [
    item.scope,
    item.label,
    item.ready ? "PASS" : "FAIL",
    item.evidence,
    item.blocker ?? "",
  ]);
  const blockerLines =
    report.blockers.length > 0
      ? report.blockers.map((blocker) => `- ${blocker}`)
      : ["- (none)"];
  const lines = [
    "# Cloudflare Release Gates",
    "",
    `Generated: ${report.generatedAt}`,
    "",
    report.note,
    "",
    "## Summary",
    "",
    "| Gate | Ready |",
    "| --- | --- |",
    `| Planning inputs ready | ${report.readiness.planningInputsReady ? "yes" : "no"} |`,
    `| Local runtime proof ready | ${report.readiness.localRuntimeProofReady ? "yes" : "no"} |`,
    `| Provider dashboard inventory ready | ${report.readiness.providerDashboardInventoryReady ? "yes" : "no"} |`,
    `| Provider proof ready | ${report.readiness.providerProofReady ? "yes" : "no"} |`,
    `| Cost/performance proof ready | ${report.readiness.costPerformanceProofReady ? "yes" : "no"} |`,
    `| D1/Auth/Realtime proof ready | ${report.readiness.dataAuthRealtimeProofReady ? "yes" : "no"} |`,
    `| Observability/support proof ready | ${report.readiness.observabilitySupportProofReady ? "yes" : "no"} |`,
    `| Local release-gate report ready | ${report.readiness.localReleaseGateReportReady ? "yes" : "no"} |`,
    `| Production cutover ready | ${report.readiness.productionCutoverReady ? "yes" : "no"} |`,
    "",
    "## Checks",
    "",
    "| Scope | Check | Result | Evidence | Blocker |",
    "| --- | --- | --- | --- | --- |",
    ...markdownRows(gateRows),
    "",
    "## Blockers",
    "",
    ...blockerLines,
    "",
  ];
  writeFileSync(outputPath, lines.join("\n"));
}

function readInputs(): ReleaseGateInputs {
  return {
    inventory: readArtifact<InventoryReport>(
      readEnv("CLOUDFLARE_RELEASE_INVENTORY_FILE") ?? DEFAULT_FILES.inventory,
    ),
    workerPreviewRoutes: readArtifact<WorkerPreviewRouteReport>(
      readEnv("CLOUDFLARE_RELEASE_WORKER_PREVIEW_FILE") ??
        DEFAULT_FILES.workerPreviewRoutes,
    ),
    hostedRoutes: readArtifact<HostedRouteProofReport>(
      readEnv("CLOUDFLARE_RELEASE_HOSTED_ROUTES_FILE") ??
        DEFAULT_FILES.hostedRoutes,
    ),
    workerReadiness: readArtifact<WorkerReadinessReport>(
      readEnv("CLOUDFLARE_RELEASE_WORKER_READINESS_FILE") ??
        DEFAULT_FILES.workerReadiness,
    ),
    platformToolchain: readArtifact<PlatformToolchainReport>(
      readEnv("CLOUDFLARE_RELEASE_TOOLCHAIN_FILE") ??
        DEFAULT_FILES.platformToolchain,
    ),
    wranglerAuth: readArtifact<WranglerAuthReport>(
      readEnv("CLOUDFLARE_RELEASE_WRANGLER_AUTH_FILE") ??
        DEFAULT_FILES.wranglerAuth,
    ),
    providerResources: readArtifact<ProviderResourceReadbackReport>(
      readEnv("CLOUDFLARE_RELEASE_PROVIDER_RESOURCES_FILE") ??
        DEFAULT_FILES.providerResources,
    ),
    deployDryRun: readArtifact<DeployDryRunReport>(
      readEnv("CLOUDFLARE_RELEASE_DRY_RUN_FILE") ?? DEFAULT_FILES.deployDryRun,
    ),
    queuesCronProof: readArtifact<QueuesCronProofReport>(
      readEnv("CLOUDFLARE_RELEASE_QUEUES_CRON_FILE") ??
        DEFAULT_FILES.queuesCronProof,
    ),
    pricingSnapshot: readArtifact<PricingSnapshotReport>(
      readEnv("CLOUDFLARE_RELEASE_PRICING_FILE") ??
        DEFAULT_FILES.pricingSnapshot,
    ),
    costPerformanceWorkbook: readArtifact<CostPerformanceWorkbook>(
      readEnv("CLOUDFLARE_RELEASE_WORKBOOK_FILE") ??
        DEFAULT_FILES.costPerformanceWorkbook,
    ),
    d1AuthRealtimeReadiness: readArtifact<D1AuthRealtimeReadinessReport>(
      readEnv("CLOUDFLARE_RELEASE_D1_AUTH_REALTIME_FILE") ??
        DEFAULT_FILES.d1AuthRealtimeReadiness,
    ),
    providerReadiness: readArtifact<ProviderReadinessReport>(
      readEnv("CLOUDFLARE_RELEASE_PROVIDER_FILE") ??
        DEFAULT_FILES.providerReadiness,
    ),
    agentDebugSnapshot: readArtifact<AgentDebuggingSnapshotReport>(
      readEnv("CLOUDFLARE_RELEASE_AGENT_DEBUG_SNAPSHOT_FILE") ??
        DEFAULT_FILES.agentDebugSnapshot,
    ),
    observabilityProofRoute: readArtifact<ObservabilityProofRouteSmokeReport>(
      readEnv("CLOUDFLARE_RELEASE_OBSERVABILITY_PROOF_ROUTE_FILE") ??
        DEFAULT_FILES.observabilityProofRoute,
    ),
    productionObservability: readArtifact<ProductionObservabilityProofReport>(
      readEnv("CLOUDFLARE_RELEASE_OBSERVABILITY_PROOF_FILE") ??
        DEFAULT_FILES.productionObservability,
    ),
    supportMonitoring: readArtifact<SupportMonitoringReadinessReport>(
      readEnv("CLOUDFLARE_RELEASE_SUPPORT_MONITORING_FILE") ??
        DEFAULT_FILES.supportMonitoring,
    ),
    betaOperatingReadiness: readArtifact<BetaOperatingReadinessReport>(
      readEnv("CLOUDFLARE_RELEASE_BETA_OPERATING_READINESS_FILE") ??
        DEFAULT_FILES.betaOperatingReadiness,
    ),
  };
}

async function main() {
  const report = buildCloudflareReleaseGateReport(readInputs());
  const outputFile =
    readEnv("OUTPUT_FILE") ??
    `${PLAN_ROOT}/2026-07-01-cloudflare-release-gates.json`;
  const markdownFile =
    readEnv("MARKDOWN_FILE") ??
    `${PLAN_ROOT}/2026-07-01-cloudflare-release-gates.md`;
  writeOutput(outputFile, report);
  writeMarkdown(report, markdownFile);
  console.log(JSON.stringify(report, null, 2));
  const exitCode = cloudflareReleaseGateExitCode(report, process.env);
  if (exitCode !== 0) process.exitCode = exitCode;
}

if (import.meta.main) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  });
}
