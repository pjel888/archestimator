import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import {
  buildCloudflareReleaseGateReport,
  cloudflareReleaseGateExitCode,
  type ReleaseGateInputs,
  writeMarkdown,
} from "../../scripts/check-cloudflare-release-gates";
import type { BetaOperatingReadinessReport } from "../../scripts/check-beta-operating-readiness";

const source = <T>(value: T, path = "artifact.json") => ({
  source: path,
  present: true,
  value,
});

const missing = <T>(path = "missing.json") => ({
  source: path,
  present: false,
  value: null as T | null,
});

const INVENTORY = {
  counts: {
    appRoutes: 70,
    providerCoupledFiles: 89,
    distinctRpcNames: 80,
    cloudflareScripts: 13,
  },
  sqlInventory: {
    appliedMigrationFiles: 181,
    functionDeclarationMatches: 346,
    rlsPolicyStorageAuthMatches: 684,
  },
};

const WORKER_PREVIEW = {
  passed: true,
  results: [
    { key: "health", required: true, passed: true },
    { key: "home", required: true, passed: true },
    { key: "optional", required: false, passed: false },
  ],
};

const HOSTED_ROUTES = {
  configured: false,
  providerBacked: false,
  routeContractReady: false,
  hostedRouteProofReady: false,
  passed: false,
  results: [] as Array<{ key: string; required: boolean; passed: boolean }>,
};

const WORKER_READINESS = {
  manifestReady: true,
  localPreviewReady: true,
  deploymentSecretsReady: false,
  deploymentReady: false,
  providerSecretList: {
    checked: false,
    ready: false,
  },
};

const PLATFORM_TOOLCHAIN = {
  readiness: {
    localToolchainSnapshotReady: true,
    productionDeployReady: false,
  },
  wranglerConfig: {
    observabilityConfigured: true,
  },
  generatedTypes: {
    allConfiguredBindingsTyped: true,
  },
};

const WRANGLER_AUTH = {
  readiness: {
    wranglerCliAvailable: true,
    wranglerAuthCheckCompleted: true,
    wranglerApiAuthenticated: false,
    providerReadbackReady: false,
    productionDeployReady: false,
  },
};

const PROVIDER_RESOURCES = {
  readiness: {
    wranglerAuthenticated: false,
    providerReadbackAttempted: false,
    workerDeploymentReadbackReady: false,
    d1DatabaseReadbackReady: false,
    r2BucketReadbackReady: false,
    queuesReadbackReady: false,
    workerSecretNameReadbackReady: false,
    providerResourceReadbackReady: false,
  },
};

const DRY_RUN = {
  readiness: {
    localWranglerDryRunReady: true,
    productionDeployReady: false,
  },
  dryRun: {
    exitCode: 0,
    noUploadMarkerSeen: true,
    warnings: [],
    requiredBindingsReady: true,
  },
};

const QUEUES_CRON = {
  readiness: {
    localQueueConfigReady: true,
    workerQueueHandlerReady: true,
    localQueueProducerReady: true,
    localConsumerAckReady: true,
    localRetryReady: true,
    localDeadLetterDecisionReady: true,
    localDuplicateDeliveryReady: true,
    localPoisonMessageReady: true,
    localQueuesCronProofReady: true,
    providerBacked: false,
    productionJobsMessagingReady: false,
  },
};

const PRICING = {
  readiness: {
    officialCloudflarePricingRefreshed: true,
    productionCostDecisionReady: false,
    requiredProductsMissing: [],
    invalidSourceUrlCount: 0,
  },
};

const WORKBOOK = {
  readiness: {
    currentProviderCostsReady: false,
    cloudflarePricingRefreshed: true,
    cloudflareUsageCostsReady: false,
    localPreviewPerformanceCaptured: true,
    hostedCredentialFreePerformanceCaptured: true,
    productionRuntimePerformanceReady: false,
    strictHostedClientP95Ready: false,
    hostedPerformanceReady: false,
    productionCostDecisionReady: false,
  },
};

const D1_AUTH_REALTIME = {
  readiness: {
    databaseInventoryReady: true,
    d1BindingReady: false,
    authReplacementReady: false,
    appLayerAuthzSpecReady: false,
    localRpcTransactionMechanicsReady: false,
    localBetaFeedbackD1SliceReady: false,
    localCollaborationInvitationD1SliceReady: false,
    localClosedBetaD1SliceReady: false,
    localComponentLibraryD1SliceReady: false,
    localEstimateHistoryD1SliceReady: false,
    rpcRewritePlanReady: false,
    realtimeReplacementReady: false,
    restoreProofReady: false,
    performanceProofReady: false,
    localRedesignReadinessReportReady: true,
    productionD1AuthRealtimeReady: false,
  },
  inventorySummary: {
    distinctRpcNames: 80,
    rlsPolicyStorageAuthMatches: 684,
  },
};

const PROVIDER = {
  dashboardInventoryReady: true,
  workersDeploymentReady: false,
  storageMediaReady: false,
  jobsReady: false,
  analyticsReady: false,
  productionCutoverReady: false,
};

const AGENT_DEBUG_BLOCKED = {
  localLogs: {
    exists: true,
    parsedRecords: 42,
    malformedLines: 0,
    latestError: {
      origin: "runtime",
      freshness: "fresh",
    },
  },
  errorHandling: {
    passed: true,
    violationCount: 0,
  },
  readiness: {
    localDebuggingReady: true,
    operationalIncidentsReady: true,
    alertScenarioCatalogReady: true,
    productionAlertScenarioProducerReady: true,
    productionEvidenceCollectionReady: false,
    productionIncidentAlertingReady: false,
    productionHostedProofReady: false,
    supportMonitoringReady: false,
  },
  readinessGates: {
    local: {
      ready: true,
      failures: [],
    },
    production: {
      ready: false,
      failures: [
        { key: "hostedProofEnv" },
        { key: "operationalIncidentAlerting" },
        { key: "hostedProofArtifacts" },
        { key: "supportMonitoring" },
      ],
    },
  },
};

const AGENT_DEBUG_READY = {
  ...AGENT_DEBUG_BLOCKED,
  readiness: {
    localDebuggingReady: true,
    operationalIncidentsReady: true,
    alertScenarioCatalogReady: true,
    productionAlertScenarioProducerReady: true,
    productionEvidenceCollectionReady: true,
    productionIncidentAlertingReady: true,
    productionHostedProofReady: true,
    supportMonitoringReady: true,
  },
  readinessGates: {
    local: {
      ready: true,
      failures: [],
    },
    production: {
      ready: true,
      failures: [],
    },
  },
};

const PRODUCTION_OBSERVABILITY_BLOCKED = {
  productionObservabilityReady: false,
  totals: {
    required: 7,
    passed: 0,
    failed: 0,
    missing: 7,
    invalid: 0,
  },
  failedRequirementKeys: ["workersLogsQuery", "errorRateAlertDelivery"],
};

const PRODUCTION_OBSERVABILITY_READY = {
  productionObservabilityReady: true,
  totals: {
    required: 7,
    passed: 7,
    failed: 0,
    missing: 0,
    invalid: 0,
  },
  failedRequirementKeys: [],
};

const OBSERVABILITY_PROOF_ROUTE_BLOCKED = {
  routeStatus: "route-not-found",
  routeReachable: false,
  authorizationEnforced: false,
  readyForWorkersLogsProof: false,
  nextAction:
    "Deploy the current Worker source from a clean runtime worktree so `/__cloudflare/observability-proof` is live, then rerun `bun run ops:check-observability-route`.",
  http: {
    status: 404,
  },
};

const OBSERVABILITY_PROOF_ROUTE_READY = {
  routeStatus: "auth-enforced",
  routeReachable: true,
  authorizationEnforced: true,
  readyForWorkersLogsProof: true,
  nextAction:
    "Set WORKERS_LOGS_PROOF_URL to this route, set WORKERS_LOGS_PROOF_SECRET from the production CRON_SECRET, then run `bun run ops:collect-workers-logs-proof`.",
  http: {
    status: 401,
  },
};

const SUPPORT_MONITORING_BLOCKED = {
  supportMonitoringReady: false,
  summary: {
    passed: 0,
    missing: 11,
    failed: 0,
  },
  requirements: [
    { key: "supportInboxMonitoring", status: "missing" },
    { key: "productionObservabilityProofArtifact", status: "missing" },
  ],
  missing: [
    "support inbox monitoring confirmed",
    "production observability proof artifact",
  ],
};

const SUPPORT_MONITORING_READY = {
  supportMonitoringReady: true,
  summary: {
    passed: 11,
    missing: 0,
    failed: 0,
  },
  requirements: [
    { key: "supportInboxMonitoring", status: "passed" },
    { key: "productionObservabilityProofArtifact", status: "passed" },
  ],
  missing: [],
};

const BETA_OPERATING_LOCAL_READY: BetaOperatingReadinessReport = {
  schemaVersion: "BETA-OPERATING-READINESS-v1",
  producerVersion: "BETA-OPERATING-READINESS-v1",
  releaseId: "release-20260630-a1b2c3d4",
  candidateSha: "a".repeat(40),
  environment: "production",
  generatedAt: "2026-06-29T00:00:00.000Z",
  expiresAt: "2026-07-01T00:00:00.000Z",
  decision: "NO_GO",
  localReady: true,
  criteria: [
    ...["AC-001", "AC-002", "AC-003", "AC-004", "AC-005", "AC-006", "AC-007"].map((id) => ({ id: id as "AC-001" | "AC-002" | "AC-003" | "AC-004" | "AC-005" | "AC-006" | "AC-007", status: "PASS" as const, blockers: [] })),
    { id: "AC-008", status: "BOUNDARY", blockers: ["AUTH-001"] },
    { id: "AC-009", status: "BOUNDARY", blockers: ["AUTH-002"] },
    { id: "AC-010", status: "BOUNDARY", blockers: ["AUTH-003"] },
  ],
  boundaries: [
    { id: "AUTH-001", status: "BOUNDARY", nextAction: "hosted proof" },
    { id: "AUTH-002", status: "BOUNDARY", nextAction: "auth decision" },
    { id: "AUTH-003", status: "BOUNDARY", nextAction: "legal decision" },
  ],
  artifacts: Object.fromEntries(["telemetry", "operator", "incidentSupport", "auth", "legal", "activation", "recovery", "maintainability"].map((name) => [name, { schemaVersion: "LOCAL-v1", producerVersion: "producer-v1", collectedAt: "2026-06-29T00:00:00.000Z", expiresAt: "2026-07-01T00:00:00.000Z" }])) as BetaOperatingReadinessReport["artifacts"],
};

function currentLocalInputs(): ReleaseGateInputs {
  return {
    generatedAt: "2026-06-30T00:00:00.000Z",
    inventory: source(INVENTORY, "inventory.json"),
    workerPreviewRoutes: source(WORKER_PREVIEW, "preview.json"),
    hostedRoutes: source(HOSTED_ROUTES, "hosted-routes.json"),
    workerReadiness: source(WORKER_READINESS, "worker-readiness.json"),
    platformToolchain: source(PLATFORM_TOOLCHAIN, "toolchain.json"),
    wranglerAuth: source(WRANGLER_AUTH, "wrangler-auth.json"),
    providerResources: source(PROVIDER_RESOURCES, "provider-resources.json"),
    deployDryRun: source(DRY_RUN, "dry-run.json"),
    queuesCronProof: source(QUEUES_CRON, "queues-cron.json"),
    pricingSnapshot: source(PRICING, "pricing.json"),
    costPerformanceWorkbook: source(WORKBOOK, "workbook.json"),
    d1AuthRealtimeReadiness: source(D1_AUTH_REALTIME, "d1-auth-realtime.json"),
    providerReadiness: source(PROVIDER, "provider.json"),
    agentDebugSnapshot: source(
      AGENT_DEBUG_BLOCKED,
      "agent-debugging-snapshot.json",
    ),
    productionObservability: source(
      PRODUCTION_OBSERVABILITY_BLOCKED,
      "production-observability.json",
    ),
    observabilityProofRoute: source(
      OBSERVABILITY_PROOF_ROUTE_BLOCKED,
      "observability-proof-route.json",
    ),
    supportMonitoring: source(
      SUPPORT_MONITORING_BLOCKED,
      "support-monitoring.json",
    ),
    betaOperatingReadiness: source(
      BETA_OPERATING_LOCAL_READY,
      "beta-operating-readiness.json",
    ),
  };
}

function productionReadyInputs(): ReleaseGateInputs {
  const inputs = currentLocalInputs();
  inputs.workerReadiness = source({
    ...WORKER_READINESS,
    deploymentSecretsReady: true,
    deploymentReady: true,
    providerSecretList: { checked: true, ready: true },
  });
  inputs.hostedRoutes = source(
    {
      configured: true,
      providerBacked: true,
      routeContractReady: true,
      hostedRouteProofReady: true,
      passed: true,
      results: [
        { key: "health", required: true, passed: true },
        { key: "home", required: true, passed: true },
      ],
    },
    "hosted-routes.json",
  );
  inputs.wranglerAuth = source({
    readiness: {
      wranglerCliAvailable: true,
      wranglerAuthCheckCompleted: true,
      wranglerApiAuthenticated: true,
      providerReadbackReady: true,
      productionDeployReady: false,
    },
  });
  inputs.providerResources = source(
    {
      readiness: {
        wranglerAuthenticated: true,
        providerReadbackAttempted: true,
        workerDeploymentReadbackReady: true,
        d1DatabaseReadbackReady: true,
        r2BucketReadbackReady: true,
        queuesReadbackReady: true,
        workerSecretNameReadbackReady: true,
        providerResourceReadbackReady: true,
      },
    },
    "provider-resources.json",
  );
  inputs.providerReadiness = source({
    dashboardInventoryReady: true,
    workersDeploymentReady: true,
    storageMediaReady: true,
    jobsReady: true,
    analyticsReady: true,
    productionCutoverReady: true,
  });
  inputs.costPerformanceWorkbook = source({
    readiness: {
      currentProviderCostsReady: true,
      cloudflarePricingRefreshed: true,
      cloudflareUsageCostsReady: true,
      localPreviewPerformanceCaptured: true,
      hostedCredentialFreePerformanceCaptured: true,
      productionRuntimePerformanceReady: true,
      strictHostedClientP95Ready: false,
      aggregateHostedPerformanceReady: true,
      hostedPerformanceReady: false,
      productionCostDecisionReady: true,
    },
  });
  inputs.d1AuthRealtimeReadiness = source({
    readiness: {
      databaseInventoryReady: true,
      d1BindingReady: true,
      authReplacementReady: true,
      appLayerAuthzSpecReady: true,
      localRpcTransactionMechanicsReady: true,
      localBetaFeedbackD1SliceReady: true,
      localCollaborationInvitationD1SliceReady: true,
      localClosedBetaD1SliceReady: true,
      localComponentLibraryD1SliceReady: true,
      localEstimateHistoryD1SliceReady: true,
      rpcRewritePlanReady: true,
      realtimeReplacementReady: true,
      restoreProofReady: true,
      recoveryReceiptValid: true,
      performanceProofReady: true,
      localRedesignReadinessReportReady: true,
      productionD1AuthRealtimeReady: true,
    },
    inventorySummary: {
      distinctRpcNames: 80,
      rlsPolicyStorageAuthMatches: 684,
    },
  });
  inputs.agentDebugSnapshot = source(
    AGENT_DEBUG_READY,
    "agent-debugging-snapshot.json",
  );
  inputs.productionObservability = source(
    PRODUCTION_OBSERVABILITY_READY,
    "production-observability.json",
  );
  inputs.observabilityProofRoute = source(
    OBSERVABILITY_PROOF_ROUTE_READY,
    "observability-proof-route.json",
  );
  inputs.supportMonitoring = source(
    SUPPORT_MONITORING_READY,
    "support-monitoring.json",
  );
  return inputs;
}

describe("Cloudflare release gate aggregator", () => {
  it("passes the local report gate while keeping production cutover closed", () => {
    const report = buildCloudflareReleaseGateReport(currentLocalInputs());

    expect(report.readiness.planningInputsReady).toBe(true);
    expect(report.readiness.localRuntimeProofReady).toBe(true);
    expect(report.readiness.providerDashboardInventoryReady).toBe(true);
    expect(report.readiness.localReleaseGateReportReady).toBe(true);
    expect(report.readiness.providerProofReady).toBe(false);
    expect(report.readiness.costPerformanceProofReady).toBe(false);
    expect(report.readiness.dataAuthRealtimeProofReady).toBe(false);
    expect(report.readiness.observabilitySupportProofReady).toBe(false);
    expect(report.readiness.productionCutoverReady).toBe(false);
    expect(report.blockers).toEqual(
      expect.arrayContaining([
        expect.stringContaining(
          "Hosted Worker deployment and custom domain provider-proven",
        ),
        expect.stringContaining("Hosted Worker route matrix proof captured"),
        expect.stringContaining("Wrangler/API auth readback ready"),
        expect.stringContaining("Provider resource readback ready"),
        expect.stringContaining("D1/Auth/Realtime production proof ready"),
        expect.stringContaining("Production cost decision ready"),
        expect.stringContaining("Agent debugging production gate ready"),
        expect.stringContaining("Hosted observability proof bundle ready"),
        expect.stringContaining("Support monitoring readiness ready"),
      ]),
    );
  });

  it("carries detailed provider resource blockers into the release summary", () => {
    const inputs = currentLocalInputs();
    inputs.providerResources = source(
      {
        readiness: {
          wranglerAuthenticated: true,
          providerReadbackAttempted: true,
          workerDeploymentReadbackReady: true,
          d1DatabaseReadbackReady: true,
          r2BucketReadbackReady: true,
          queuesReadbackReady: true,
          workerSecretNameReadbackReady: false,
          providerResourceReadbackReady: false,
        },
        blockers: [
          "Worker secret name list: missing expected names BETTER_AUTH_GOOGLE_CLIENT_ID, BETTER_AUTH_GOOGLE_CLIENT_SECRET.",
        ],
      },
      "provider-resources.json",
    );

    const report = buildCloudflareReleaseGateReport(inputs);

    expect(report.blockers).toEqual(
      expect.arrayContaining([
        "Provider resource readback ready: Read-only Wrangler resource readback is incomplete: Worker secret name list: missing expected names BETTER_AUTH_GOOGLE_CLIENT_ID, BETTER_AUTH_GOOGLE_CLIENT_SECRET.",
      ]),
    );
  });

  it("passes production cutover when provider runtime is ready and strict public p95 remains watch-grade", () => {
    const completeInputs = currentLocalInputs();
    completeInputs.workerReadiness = source({
      ...WORKER_READINESS,
      deploymentSecretsReady: true,
      deploymentReady: true,
      providerSecretList: { checked: true, ready: true },
    });
    completeInputs.hostedRoutes = source(
      {
        configured: true,
        providerBacked: true,
        routeContractReady: true,
        hostedRouteProofReady: true,
        passed: true,
        results: [
          { key: "health", required: true, passed: true },
          { key: "home", required: true, passed: true },
        ],
      },
      "hosted-routes.json",
    );
    completeInputs.wranglerAuth = source({
      readiness: {
        wranglerCliAvailable: true,
        wranglerAuthCheckCompleted: true,
        wranglerApiAuthenticated: true,
        providerReadbackReady: true,
        productionDeployReady: false,
      },
    });
    completeInputs.providerResources = source(
      {
        readiness: {
          wranglerAuthenticated: true,
          providerReadbackAttempted: true,
          workerDeploymentReadbackReady: true,
          d1DatabaseReadbackReady: true,
          r2BucketReadbackReady: true,
          queuesReadbackReady: true,
          workerSecretNameReadbackReady: true,
          providerResourceReadbackReady: true,
        },
      },
      "provider-resources.json",
    );
    completeInputs.providerReadiness = source({
      dashboardInventoryReady: true,
      workersDeploymentReady: true,
      storageMediaReady: true,
      jobsReady: true,
      analyticsReady: true,
      productionCutoverReady: true,
    });
    completeInputs.costPerformanceWorkbook = source({
      readiness: {
        currentProviderCostsReady: true,
        cloudflarePricingRefreshed: true,
        cloudflareUsageCostsReady: true,
        localPreviewPerformanceCaptured: true,
        hostedCredentialFreePerformanceCaptured: true,
        productionRuntimePerformanceReady: true,
        strictHostedClientP95Ready: false,
        aggregateHostedPerformanceReady: true,
        hostedPerformanceReady: false,
        productionCostDecisionReady: true,
      },
    });
    completeInputs.d1AuthRealtimeReadiness = source({
      readiness: {
        databaseInventoryReady: true,
        d1BindingReady: true,
        authReplacementReady: true,
        appLayerAuthzSpecReady: true,
        localRpcTransactionMechanicsReady: true,
        localBetaFeedbackD1SliceReady: true,
        localCollaborationInvitationD1SliceReady: true,
        localClosedBetaD1SliceReady: true,
        localComponentLibraryD1SliceReady: true,
        localEstimateHistoryD1SliceReady: true,
        rpcRewritePlanReady: true,
        realtimeReplacementReady: true,
      restoreProofReady: true,
      recoveryReceiptValid: true,
        performanceProofReady: true,
        localRedesignReadinessReportReady: true,
        productionD1AuthRealtimeReady: true,
      },
      inventorySummary: {
        distinctRpcNames: 80,
        rlsPolicyStorageAuthMatches: 684,
      },
    });
    completeInputs.agentDebugSnapshot = source(
      AGENT_DEBUG_READY,
      "agent-debugging-snapshot.json",
    );
    completeInputs.productionObservability = source(
      PRODUCTION_OBSERVABILITY_READY,
      "production-observability.json",
    );
    completeInputs.observabilityProofRoute = source(
      OBSERVABILITY_PROOF_ROUTE_READY,
      "observability-proof-route.json",
    );
    completeInputs.supportMonitoring = source(
      SUPPORT_MONITORING_READY,
      "support-monitoring.json",
    );

    const report = buildCloudflareReleaseGateReport(completeInputs);

    expect(report.readiness.providerProofReady).toBe(true);
    expect(report.readiness.costPerformanceProofReady).toBe(true);
    expect(report.readiness.dataAuthRealtimeProofReady).toBe(true);
    expect(report.readiness.observabilitySupportProofReady).toBe(true);
    expect(report.readiness.productionCutoverReady).toBe(true);
    expect(
      report.gates.find((gate) => gate.key === "hosted-performance-proof")
        ?.evidence,
    ).toContain("strictHostedClientP95Ready=no");
    expect(
      report.gates.find(
        (gate) => gate.key === "d1-auth-realtime-production-proof",
      )?.evidence,
    ).toContain("estimateHistorySlice=yes");
    expect(report.blockers).toEqual([]);
  });

  it("keeps production cutover closed when the agent debugging production gate is red", () => {
    const inputs = productionReadyInputs();
    inputs.agentDebugSnapshot = source(
      AGENT_DEBUG_BLOCKED,
      "agent-debugging-snapshot.json",
    );

    const report = buildCloudflareReleaseGateReport(inputs);

    expect(report.readiness.providerProofReady).toBe(true);
    expect(report.readiness.costPerformanceProofReady).toBe(true);
    expect(report.readiness.dataAuthRealtimeProofReady).toBe(true);
    expect(report.readiness.observabilitySupportProofReady).toBe(false);
    expect(report.readiness.productionCutoverReady).toBe(false);
    expect(
      report.gates.find(
        (gate) => gate.key === "agent-debug-production-readiness",
      ),
    ).toMatchObject({
      ready: false,
      blocker: expect.stringContaining(
        "hostedProofEnv, operationalIncidentAlerting, hostedProofArtifacts, supportMonitoring",
      ),
    });
  });

  it("keeps production cutover closed when the hosted observability proof route is stale", () => {
    const inputs = productionReadyInputs();
    inputs.observabilityProofRoute = source(
      OBSERVABILITY_PROOF_ROUTE_BLOCKED,
      "observability-proof-route.json",
    );

    const report = buildCloudflareReleaseGateReport(inputs);

    expect(report.readiness.observabilitySupportProofReady).toBe(false);
    expect(report.readiness.productionCutoverReady).toBe(false);
    expect(
      report.gates.find(
        (gate) => gate.key === "hosted-observability-proof-route",
      ),
    ).toMatchObject({
      ready: false,
      evidence: expect.stringContaining("routeStatus=route-not-found"),
      blocker: expect.stringContaining("Deploy the current Worker source"),
    });
  });

  it("keeps production cutover advisory by default but fails closed when production is required", () => {
    const report = buildCloudflareReleaseGateReport(currentLocalInputs());

    expect(report.readiness.localReleaseGateReportReady).toBe(true);
    expect(report.readiness.productionCutoverReady).toBe(false);
    expect(cloudflareReleaseGateExitCode(report, {})).toBe(0);
    expect(
      cloudflareReleaseGateExitCode(report, {
        CLOUDFLARE_RELEASE_REQUIRE_PRODUCTION: "1",
      }),
    ).toBe(1);
  });

  it("exits nonzero when local release-gate evidence is not ready", () => {
    const inputs = currentLocalInputs();
    inputs.deployDryRun = missing("dry-run-missing.json");
    const report = buildCloudflareReleaseGateReport(inputs);

    expect(report.readiness.localReleaseGateReportReady).toBe(false);
    expect(cloudflareReleaseGateExitCode(report, {})).toBe(1);
  });

  it("keeps production cutover closed when runtime is ready but production cost decision is not", () => {
    const inputs = currentLocalInputs();
    inputs.workerReadiness = source({
      ...WORKER_READINESS,
      deploymentSecretsReady: true,
      deploymentReady: true,
      providerSecretList: { checked: true, ready: true },
    });
    inputs.hostedRoutes = source(
      {
        configured: true,
        providerBacked: true,
        routeContractReady: true,
        hostedRouteProofReady: true,
        passed: true,
        results: [
          { key: "health", required: true, passed: true },
          { key: "home", required: true, passed: true },
        ],
      },
      "hosted-routes.json",
    );
    inputs.wranglerAuth = source({
      readiness: {
        wranglerCliAvailable: true,
        wranglerAuthCheckCompleted: true,
        wranglerApiAuthenticated: true,
        providerReadbackReady: true,
        productionDeployReady: false,
      },
    });
    inputs.providerResources = source(
      {
        readiness: {
          wranglerAuthenticated: true,
          providerReadbackAttempted: true,
          workerDeploymentReadbackReady: true,
          d1DatabaseReadbackReady: true,
          r2BucketReadbackReady: true,
          queuesReadbackReady: true,
          workerSecretNameReadbackReady: true,
          providerResourceReadbackReady: true,
        },
      },
      "provider-resources.json",
    );
    inputs.providerReadiness = source({
      dashboardInventoryReady: true,
      workersDeploymentReady: true,
      storageMediaReady: true,
      jobsReady: true,
      analyticsReady: true,
      productionCutoverReady: true,
    });
    inputs.costPerformanceWorkbook = source(
      {
        readiness: {
          currentProviderCostsReady: true,
          cloudflarePricingRefreshed: true,
          cloudflareUsageCostsReady: false,
          localPreviewPerformanceCaptured: true,
          hostedCredentialFreePerformanceCaptured: true,
          productionRuntimePerformanceReady: true,
          strictHostedClientP95Ready: false,
          aggregateHostedPerformanceReady: true,
          hostedPerformanceReady: false,
          productionCostDecisionReady: false,
        },
      },
      "workbook.json",
    );
    inputs.d1AuthRealtimeReadiness = source({
      readiness: {
        databaseInventoryReady: true,
        d1BindingReady: true,
        authReplacementReady: true,
        appLayerAuthzSpecReady: true,
        localRpcTransactionMechanicsReady: true,
        localBetaFeedbackD1SliceReady: true,
        localCollaborationInvitationD1SliceReady: true,
        localClosedBetaD1SliceReady: true,
        localComponentLibraryD1SliceReady: true,
        localEstimateHistoryD1SliceReady: true,
        rpcRewritePlanReady: true,
        realtimeReplacementReady: true,
      restoreProofReady: true,
      recoveryReceiptValid: true,
        performanceProofReady: true,
        localRedesignReadinessReportReady: true,
        productionD1AuthRealtimeReady: true,
      },
    });
    inputs.agentDebugSnapshot = source(
      AGENT_DEBUG_READY,
      "agent-debugging-snapshot.json",
    );
    inputs.productionObservability = source(
      PRODUCTION_OBSERVABILITY_READY,
      "production-observability.json",
    );
    inputs.observabilityProofRoute = source(
      OBSERVABILITY_PROOF_ROUTE_READY,
      "observability-proof-route.json",
    );
    inputs.supportMonitoring = source(
      SUPPORT_MONITORING_READY,
      "support-monitoring.json",
    );

    const report = buildCloudflareReleaseGateReport(inputs);

    expect(report.readiness.providerProofReady).toBe(true);
    expect(report.readiness.dataAuthRealtimeProofReady).toBe(true);
    expect(report.readiness.costPerformanceProofReady).toBe(false);
    expect(report.readiness.observabilitySupportProofReady).toBe(true);
    expect(report.readiness.productionCutoverReady).toBe(false);
    expect(report.blockers).toEqual(
      expect.arrayContaining([
        expect.stringContaining("Cloudflare usage cost inputs captured"),
        expect.stringContaining("Production cost decision ready"),
      ]),
    );
  });

  it("fails local report readiness when a required artifact is missing", () => {
    const inputs = currentLocalInputs();
    inputs.deployDryRun = missing("dry-run-missing.json");

    const report = buildCloudflareReleaseGateReport(inputs);

    expect(report.readiness.localRuntimeProofReady).toBe(false);
    expect(report.readiness.localReleaseGateReportReady).toBe(false);
    expect(
      report.gates.find((gate) => gate.key === "wrangler-deploy-dry-run"),
    ).toMatchObject({
      ready: false,
      blocker: "Required Cloudflare migration evidence artifact is missing.",
    });
  });

  it("writes markdown without copying unknown secret-looking fields", () => {
    const inputs = currentLocalInputs();
    inputs.providerReadiness = source({
      ...PROVIDER,
      tokenValue: "do-not-leak-this-token",
    } as typeof PROVIDER);
    const report = buildCloudflareReleaseGateReport(inputs);
    const dir = mkdtempSync(join(tmpdir(), "cloudflare-release-gates-"));
    try {
      const file = join(dir, "release-gates.md");
      writeMarkdown(report, file);
      const markdown = readFileSync(file, "utf8");
      expect(markdown).toContain("Cloudflare Release Gates");
      expect(markdown).toContain("Production cutover ready | no");
      expect(markdown).not.toContain("do-not-leak-this-token");
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});
