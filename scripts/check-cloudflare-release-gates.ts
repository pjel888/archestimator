#!/usr/bin/env bun

import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";

type GateScope = "planning" | "local-runtime" | "data-auth-realtime" | "provider" | "cost-performance";

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
} as const;

function readEnv(name: string) {
  const value = process.env[name];
  return value?.trim() || undefined;
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
  return typeof value === "number" && Number.isFinite(value) ? String(value) : "(missing)";
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

function artifactMissingGate(key: string, label: string, scope: GateScope, source: string | null): Gate {
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

function providerResourceReadbackBlocker(report: ProviderResourceReadbackReport | null | undefined) {
  const detail = report?.blockers?.find((blocker) => blocker.trim());
  return detail
    ? `Read-only Wrangler resource readback is incomplete: ${detail}`
    : "Read-only Wrangler resource readback for Worker deployment, D1, R2, Queues, and Worker secret names is incomplete.";
}

function requiredRouteProbeSummary(report: WorkerPreviewRouteReport | null) {
  const required = (report?.results ?? []).filter((result) => result.required === true);
  const failed = required.filter((result) => result.passed !== true);
  return {
    requiredCount: required.length,
    failedKeys: failed.map((result) => result.key ?? "(unknown)"),
    ready: report?.passed === true && required.length > 0 && failed.length === 0,
  };
}

function buildGates(inputs: ReleaseGateInputs) {
  const gates: Gate[] = [];

  if (!inputs.inventory.present) {
    gates.push(artifactMissingGate("inventory-refresh", "Migration inventory refreshed", "planning", inputs.inventory.source));
  } else {
    const counts = inputs.inventory.value?.counts;
    const sql = inputs.inventory.value?.sqlInventory;
    gates.push(gate(
      "inventory-refresh",
      "Migration inventory refreshed",
      "planning",
      Boolean(counts?.appRoutes && counts.providerCoupledFiles && counts.distinctRpcNames && sql?.appliedMigrationFiles),
      `routes=${numberLabel(counts?.appRoutes)}, providerCoupledFiles=${numberLabel(counts?.providerCoupledFiles)}, rpcNames=${numberLabel(counts?.distinctRpcNames)}, sqlMigrations=${numberLabel(sql?.appliedMigrationFiles)}`,
      "Repeatable route/provider/RPC/SQL migration inventory is incomplete.",
      inputs.inventory.source,
    ));
  }

  if (!inputs.pricingSnapshot.present) {
    gates.push(artifactMissingGate("official-pricing-refresh", "Official Cloudflare pricing refreshed", "planning", inputs.pricingSnapshot.source));
  } else {
    const readiness = inputs.pricingSnapshot.value?.readiness;
    gates.push(gate(
      "official-pricing-refresh",
      "Official Cloudflare pricing refreshed",
      "planning",
      readiness?.officialCloudflarePricingRefreshed === true
        && (readiness.requiredProductsMissing ?? []).length === 0
        && readiness.invalidSourceUrlCount === 0,
      `pricingRefreshed=${boolLabel(readiness?.officialCloudflarePricingRefreshed)}, missingProducts=${readiness?.requiredProductsMissing?.length ?? "(missing)"}, invalidSourceUrls=${numberLabel(readiness?.invalidSourceUrlCount)}`,
      "Official Cloudflare pricing snapshot is missing required product coverage or has invalid sources.",
      inputs.pricingSnapshot.source,
    ));
  }

  if (!inputs.costPerformanceWorkbook.present) {
    gates.push(artifactMissingGate("local-workbook-scaffold", "Local cost/performance workbook scaffold generated", "planning", inputs.costPerformanceWorkbook.source));
  } else {
    const readiness = inputs.costPerformanceWorkbook.value?.readiness;
    gates.push(gate(
      "local-workbook-scaffold",
      "Local cost/performance workbook scaffold generated",
      "planning",
      readiness?.cloudflarePricingRefreshed === true && readiness.localPreviewPerformanceCaptured === true,
      `pricingRefreshed=${boolLabel(readiness?.cloudflarePricingRefreshed)}, localPreviewPerformanceCaptured=${boolLabel(readiness?.localPreviewPerformanceCaptured)}`,
      "Local workbook scaffold does not yet have pricing plus local preview performance evidence.",
      inputs.costPerformanceWorkbook.source,
    ));
  }

  if (!inputs.d1AuthRealtimeReadiness.present) {
    gates.push(artifactMissingGate(
      "d1-auth-realtime-local-report",
      "D1/Auth/Realtime local redesign readiness report generated",
      "data-auth-realtime",
      inputs.d1AuthRealtimeReadiness.source,
    ));
    gates.push(artifactMissingGate(
      "d1-auth-realtime-production-proof",
      "D1/Auth/Realtime production proof ready",
      "data-auth-realtime",
      inputs.d1AuthRealtimeReadiness.source,
    ));
  } else {
    const readiness = inputs.d1AuthRealtimeReadiness.value?.readiness;
    const inventorySummary = inputs.d1AuthRealtimeReadiness.value?.inventorySummary;
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
        readiness?.productionD1AuthRealtimeReady === true,
        `d1Binding=${boolLabel(readiness?.d1BindingReady)}, authReplacement=${boolLabel(readiness?.authReplacementReady)}, appLayerAuthz=${boolLabel(readiness?.appLayerAuthzSpecReady)}, localRpcMechanics=${boolLabel(readiness?.localRpcTransactionMechanicsReady)}, betaFeedbackSlice=${boolLabel(readiness?.localBetaFeedbackD1SliceReady)}, collaborationInvitationSlice=${boolLabel(readiness?.localCollaborationInvitationD1SliceReady)}, closedBetaSlice=${boolLabel(readiness?.localClosedBetaD1SliceReady)}, componentLibrarySlice=${boolLabel(readiness?.localComponentLibraryD1SliceReady)}, estimateHistorySlice=${boolLabel(readiness?.localEstimateHistoryD1SliceReady)}, rpcRewrite=${boolLabel(readiness?.rpcRewritePlanReady)}, realtimeReplacement=${boolLabel(readiness?.realtimeReplacementReady)}, restoreProof=${boolLabel(readiness?.restoreProofReady)}, performanceProof=${boolLabel(readiness?.performanceProofReady)}`,
        "One or more D1/Auth/Realtime production proof subgates are incomplete; see the evidence flags for the exact blockers.",
        inputs.d1AuthRealtimeReadiness.source,
      ),
    );
  }

  if (!inputs.workerReadiness.present) {
    gates.push(artifactMissingGate("worker-manifest-local-readiness", "Worker manifest and local preview controls ready", "local-runtime", inputs.workerReadiness.source));
  } else {
    const value = inputs.workerReadiness.value;
    gates.push(gate(
      "worker-manifest-local-readiness",
      "Worker manifest and local preview controls ready",
      "local-runtime",
      value?.manifestReady === true && value.localPreviewReady === true,
      `manifestReady=${boolLabel(value?.manifestReady)}, localPreviewReady=${boolLabel(value?.localPreviewReady)}`,
      "Worker manifest, local preview controls, or required env/binding declarations are incomplete.",
      inputs.workerReadiness.source,
    ));
  }

  if (!inputs.workerPreviewRoutes.present) {
    gates.push(artifactMissingGate("worker-preview-route-probe", "Local Worker route probe passed", "local-runtime", inputs.workerPreviewRoutes.source));
  } else {
    const summary = requiredRouteProbeSummary(inputs.workerPreviewRoutes.value);
    gates.push(gate(
      "worker-preview-route-probe",
      "Local Worker route probe passed",
      "local-runtime",
      summary.ready,
      `reportPassed=${boolLabel(inputs.workerPreviewRoutes.value?.passed)}, requiredRoutes=${summary.requiredCount}, failedRequired=${summary.failedKeys.length === 0 ? "(none)" : summary.failedKeys.join(", ")}`,
      "Local Worker preview route probe has required failures or no required route samples.",
      inputs.workerPreviewRoutes.source,
    ));
  }

  if (!inputs.hostedRoutes.present) {
    gates.push(artifactMissingGate("hosted-worker-route-proof", "Hosted Worker route matrix proof captured", "provider", inputs.hostedRoutes.source));
  } else {
    const summary = requiredRouteProbeSummary(inputs.hostedRoutes.value);
    const value = inputs.hostedRoutes.value;
    gates.push(gate(
      "hosted-worker-route-proof",
      "Hosted Worker route matrix proof captured",
      "provider",
      value?.providerBacked === true
        && value.configured === true
        && value.routeContractReady === true
        && value.hostedRouteProofReady === true
        && value.passed === true
        && summary.ready,
      `configured=${boolLabel(value?.configured)}, providerBacked=${boolLabel(value?.providerBacked)}, routeContractReady=${boolLabel(value?.routeContractReady)}, hostedRouteProofReady=${boolLabel(value?.hostedRouteProofReady)}, requiredRoutes=${summary.requiredCount}, failedRequired=${summary.failedKeys.length === 0 ? "(none)" : summary.failedKeys.join(", ")}`,
      "Hosted HTTPS Cloudflare Worker route matrix proof is missing or has required failures.",
      inputs.hostedRoutes.source,
    ));
  }

  if (!inputs.platformToolchain.present) {
    gates.push(artifactMissingGate("platform-toolchain-snapshot", "Cloudflare platform toolchain snapshot ready", "local-runtime", inputs.platformToolchain.source));
  } else {
    const value = inputs.platformToolchain.value;
    gates.push(gate(
      "platform-toolchain-snapshot",
      "Cloudflare platform toolchain snapshot ready",
      "local-runtime",
      value?.readiness?.localToolchainSnapshotReady === true,
      `localToolchainSnapshotReady=${boolLabel(value?.readiness?.localToolchainSnapshotReady)}, observabilityConfigured=${boolLabel(value?.wranglerConfig?.observabilityConfigured)}, allBindingsTyped=${boolLabel(value?.generatedTypes?.allConfiguredBindingsTyped)}`,
      "Wrangler/OpenNext/schema/typegen/observability local toolchain proof is incomplete.",
      inputs.platformToolchain.source,
    ));
  }

  if (!inputs.wranglerAuth.present) {
    gates.push(artifactMissingGate("provider-wrangler-auth", "Wrangler/API auth readback ready", "provider", inputs.wranglerAuth.source));
  } else {
    const readiness = inputs.wranglerAuth.value?.readiness;
    gates.push(gate(
      "provider-wrangler-auth",
      "Wrangler/API auth readback ready",
      "provider",
      readiness?.wranglerApiAuthenticated === true && readiness.providerReadbackReady === true,
      `cliAvailable=${boolLabel(readiness?.wranglerCliAvailable)}, authCheckCompleted=${boolLabel(readiness?.wranglerAuthCheckCompleted)}, wranglerApiAuthenticated=${boolLabel(readiness?.wranglerApiAuthenticated)}, providerReadbackReady=${boolLabel(readiness?.providerReadbackReady)}`,
      "Wrangler/API authentication has not been proven; run `wrangler login` or configure a scoped token outside the repo, then rerun the auth check.",
      inputs.wranglerAuth.source,
    ));
  }

  if (!inputs.providerResources.present) {
    gates.push(artifactMissingGate("provider-resource-readback", "Provider resource readback ready", "provider", inputs.providerResources.source));
  } else {
    const readiness = inputs.providerResources.value?.readiness;
    gates.push(gate(
      "provider-resource-readback",
      "Provider resource readback ready",
      "provider",
      readiness?.providerResourceReadbackReady === true,
      `wranglerAuthenticated=${boolLabel(readiness?.wranglerAuthenticated)}, readbackAttempted=${boolLabel(readiness?.providerReadbackAttempted)}, workerDeployment=${boolLabel(readiness?.workerDeploymentReadbackReady)}, d1=${boolLabel(readiness?.d1DatabaseReadbackReady)}, r2=${boolLabel(readiness?.r2BucketReadbackReady)}, queues=${boolLabel(readiness?.queuesReadbackReady)}, secrets=${boolLabel(readiness?.workerSecretNameReadbackReady)}`,
      providerResourceReadbackBlocker(inputs.providerResources.value),
      inputs.providerResources.source,
    ));
  }

  if (!inputs.deployDryRun.present) {
    gates.push(artifactMissingGate("wrangler-deploy-dry-run", "Wrangler deploy dry-run ready", "local-runtime", inputs.deployDryRun.source));
  } else {
    const value = inputs.deployDryRun.value;
    gates.push(gate(
      "wrangler-deploy-dry-run",
      "Wrangler deploy dry-run ready",
      "local-runtime",
      value?.readiness?.localWranglerDryRunReady === true && (value.dryRun?.warnings ?? []).length === 0,
      `localWranglerDryRunReady=${boolLabel(value?.readiness?.localWranglerDryRunReady)}, exitCode=${numberLabel(value?.dryRun?.exitCode)}, noUploadMarkerSeen=${boolLabel(value?.dryRun?.noUploadMarkerSeen)}, warnings=${value?.dryRun?.warnings?.length ?? "(missing)"}, requiredBindingsReady=${boolLabel(value?.dryRun?.requiredBindingsReady)}`,
      "Wrangler dry-run is missing, failed, emitted warnings, or lacks required binding evidence.",
      inputs.deployDryRun.source,
    ));
  }

  if (!inputs.queuesCronProof.present) {
    gates.push(artifactMissingGate("queues-cron-local-proof", "Queues/Cron local retry and DLQ proof ready", "local-runtime", inputs.queuesCronProof.source));
  } else {
    const readiness = inputs.queuesCronProof.value?.readiness;
    gates.push(gate(
      "queues-cron-local-proof",
      "Queues/Cron local retry and DLQ proof ready",
      "local-runtime",
      readiness?.localQueuesCronProofReady === true,
      `queueConfig=${boolLabel(readiness?.localQueueConfigReady)}, workerQueueHandler=${boolLabel(readiness?.workerQueueHandlerReady)}, producer=${boolLabel(readiness?.localQueueProducerReady)}, ack=${boolLabel(readiness?.localConsumerAckReady)}, retry=${boolLabel(readiness?.localRetryReady)}, dlq=${boolLabel(readiness?.localDeadLetterDecisionReady)}, duplicate=${boolLabel(readiness?.localDuplicateDeliveryReady)}, poison=${boolLabel(readiness?.localPoisonMessageReady)}, providerBacked=${boolLabel(readiness?.providerBacked)}, productionJobsMessaging=${boolLabel(readiness?.productionJobsMessagingReady)}`,
      "Local Queues/Cron retry, duplicate, poison-message, and dead-letter decision proof is incomplete.",
      inputs.queuesCronProof.source,
    ));
  }

  if (!inputs.providerReadiness.present) {
    gates.push(artifactMissingGate("provider-dashboard-inventory", "Provider dashboard inventory captured", "provider", inputs.providerReadiness.source));
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
        value?.workersDeploymentReady === true
          && inputs.workerReadiness.value?.deploymentReady === true
          && inputs.wranglerAuth.value?.readiness?.wranglerApiAuthenticated === true,
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
    gates.push(artifactMissingGate("current-provider-costs", "Current provider cost inputs captured", "cost-performance", inputs.costPerformanceWorkbook.source));
    gates.push(artifactMissingGate("cloudflare-usage-costs", "Cloudflare usage cost inputs captured", "cost-performance", inputs.costPerformanceWorkbook.source));
    gates.push(artifactMissingGate("hosted-performance-proof", "Hosted Cloudflare performance proof captured", "cost-performance", inputs.costPerformanceWorkbook.source));
    gates.push(artifactMissingGate("production-cost-decision", "Production cost decision ready", "cost-performance", inputs.costPerformanceWorkbook.source));
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
        `hostedCredentialFreePerformanceCaptured=${boolLabel(readiness?.hostedCredentialFreePerformanceCaptured)}, productionRuntimePerformanceReady=${boolLabel(readiness?.productionRuntimePerformanceReady)}, strictHostedClientP95Ready=${boolLabel(readiness?.strictHostedClientP95Ready)}, hostedPerformanceReady=${boolLabel(readiness?.hostedPerformanceReady)}`,
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
    gates.find((item) => item.key === "provider-dashboard-inventory")?.ready === true;
  const providerProofReady = allScopesReady(gates, ["provider"]);
  const costPerformanceProofReady = allScopesReady(gates, ["cost-performance"]);
  const dataAuthRealtimeProofReady = allScopesReady(gates, ["data-auth-realtime"]);
  const localReleaseGateReportReady = planningInputsReady
    && localRuntimeProofReady
    && providerDashboardInventoryReady;

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
    },
    gates,
    readiness: {
      planningInputsReady,
      localRuntimeProofReady,
      providerDashboardInventoryReady,
      providerProofReady,
      costPerformanceProofReady,
      dataAuthRealtimeProofReady,
      localReleaseGateReportReady,
      productionCutoverReady: localReleaseGateReportReady
        && providerProofReady
        && costPerformanceProofReady
        && dataAuthRealtimeProofReady,
    },
    blockers: gates.filter((item) => !item.ready && item.blocker).map((item) => `${item.label}: ${item.blocker}`),
    note:
      "Aggregates existing local/sanitized Cloudflare migration evidence only. It does not call Cloudflare APIs, read env files, print secrets, deploy Workers, change DNS, purchase plans, cancel subscriptions, delete resources, or mutate external providers.",
  };
}

function writeOutput(outputFile: string, report: CloudflareReleaseGateReport) {
  const outputPath = resolve(outputFile);
  mkdirSync(dirname(outputPath), { recursive: true });
  writeFileSync(outputPath, `${JSON.stringify(report, null, 2)}\n`);
}

function markdownRows(rows: string[][]) {
  return rows.map((row) => `| ${row.map((cell) => cell.replaceAll("|", "\\|")).join(" | ")} |`);
}

export function writeMarkdown(report: CloudflareReleaseGateReport, markdownFile: string) {
  const outputPath = resolve(markdownFile);
  mkdirSync(dirname(outputPath), { recursive: true });
  const gateRows = report.gates.map((item) => [
    item.scope,
    item.label,
    item.ready ? "PASS" : "FAIL",
    item.evidence,
    item.blocker ?? "",
  ]);
  const blockerLines = report.blockers.length > 0
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
    inventory: readArtifact<InventoryReport>(readEnv("CLOUDFLARE_RELEASE_INVENTORY_FILE") ?? DEFAULT_FILES.inventory),
    workerPreviewRoutes: readArtifact<WorkerPreviewRouteReport>(
      readEnv("CLOUDFLARE_RELEASE_WORKER_PREVIEW_FILE") ?? DEFAULT_FILES.workerPreviewRoutes,
    ),
    hostedRoutes: readArtifact<HostedRouteProofReport>(
      readEnv("CLOUDFLARE_RELEASE_HOSTED_ROUTES_FILE") ?? DEFAULT_FILES.hostedRoutes,
    ),
    workerReadiness: readArtifact<WorkerReadinessReport>(
      readEnv("CLOUDFLARE_RELEASE_WORKER_READINESS_FILE") ?? DEFAULT_FILES.workerReadiness,
    ),
    platformToolchain: readArtifact<PlatformToolchainReport>(
      readEnv("CLOUDFLARE_RELEASE_TOOLCHAIN_FILE") ?? DEFAULT_FILES.platformToolchain,
    ),
    wranglerAuth: readArtifact<WranglerAuthReport>(
      readEnv("CLOUDFLARE_RELEASE_WRANGLER_AUTH_FILE") ?? DEFAULT_FILES.wranglerAuth,
    ),
    providerResources: readArtifact<ProviderResourceReadbackReport>(
      readEnv("CLOUDFLARE_RELEASE_PROVIDER_RESOURCES_FILE") ?? DEFAULT_FILES.providerResources,
    ),
    deployDryRun: readArtifact<DeployDryRunReport>(
      readEnv("CLOUDFLARE_RELEASE_DRY_RUN_FILE") ?? DEFAULT_FILES.deployDryRun,
    ),
    queuesCronProof: readArtifact<QueuesCronProofReport>(
      readEnv("CLOUDFLARE_RELEASE_QUEUES_CRON_FILE") ?? DEFAULT_FILES.queuesCronProof,
    ),
    pricingSnapshot: readArtifact<PricingSnapshotReport>(
      readEnv("CLOUDFLARE_RELEASE_PRICING_FILE") ?? DEFAULT_FILES.pricingSnapshot,
    ),
    costPerformanceWorkbook: readArtifact<CostPerformanceWorkbook>(
      readEnv("CLOUDFLARE_RELEASE_WORKBOOK_FILE") ?? DEFAULT_FILES.costPerformanceWorkbook,
    ),
    d1AuthRealtimeReadiness: readArtifact<D1AuthRealtimeReadinessReport>(
      readEnv("CLOUDFLARE_RELEASE_D1_AUTH_REALTIME_FILE") ?? DEFAULT_FILES.d1AuthRealtimeReadiness,
    ),
    providerReadiness: readArtifact<ProviderReadinessReport>(
      readEnv("CLOUDFLARE_RELEASE_PROVIDER_FILE") ?? DEFAULT_FILES.providerReadiness,
    ),
  };
}

async function main() {
  const report = buildCloudflareReleaseGateReport(readInputs());
  const outputFile = readEnv("OUTPUT_FILE") ?? `${PLAN_ROOT}/2026-07-01-cloudflare-release-gates.json`;
  const markdownFile = readEnv("MARKDOWN_FILE") ?? `${PLAN_ROOT}/2026-07-01-cloudflare-release-gates.md`;
  writeOutput(outputFile, report);
  writeMarkdown(report, markdownFile);
  console.log(JSON.stringify(report, null, 2));
  if (!report.readiness.localReleaseGateReportReady) process.exitCode = 1;
}

if (import.meta.main) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  });
}
