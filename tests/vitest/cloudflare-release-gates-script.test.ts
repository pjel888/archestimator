import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import {
  buildCloudflareReleaseGateReport,
  type ReleaseGateInputs,
  writeMarkdown,
} from "../../scripts/check-cloudflare-release-gates";

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
  };
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
    expect(report.readiness.productionCutoverReady).toBe(false);
    expect(report.blockers).toEqual(
      expect.arrayContaining([
        expect.stringContaining("Hosted Worker deployment and custom domain provider-proven"),
        expect.stringContaining("Hosted Worker route matrix proof captured"),
        expect.stringContaining("Wrangler/API auth readback ready"),
        expect.stringContaining("Provider resource readback ready"),
        expect.stringContaining("D1/Auth/Realtime production proof ready"),
        expect.stringContaining("Production cost decision ready"),
      ]),
    );
  });

  it("carries detailed provider resource blockers into the release summary", () => {
    const inputs = currentLocalInputs();
    inputs.providerResources = source({
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
    }, "provider-resources.json");

    const report = buildCloudflareReleaseGateReport(inputs);

    expect(report.blockers).toEqual(
      expect.arrayContaining([
        "Provider resource readback ready: Read-only Wrangler resource readback is incomplete: Worker secret name list: missing expected names BETTER_AUTH_GOOGLE_CLIENT_ID, BETTER_AUTH_GOOGLE_CLIENT_SECRET.",
      ]),
    );
  });

  it("passes production cutover only when provider and cost proof are complete", () => {
    const completeInputs = currentLocalInputs();
    completeInputs.workerReadiness = source({
      ...WORKER_READINESS,
      deploymentSecretsReady: true,
      deploymentReady: true,
      providerSecretList: { checked: true, ready: true },
    });
    completeInputs.hostedRoutes = source({
      configured: true,
      providerBacked: true,
      routeContractReady: true,
      hostedRouteProofReady: true,
      passed: true,
      results: [
        { key: "health", required: true, passed: true },
        { key: "home", required: true, passed: true },
      ],
    }, "hosted-routes.json");
    completeInputs.wranglerAuth = source({
      readiness: {
        wranglerCliAvailable: true,
        wranglerAuthCheckCompleted: true,
        wranglerApiAuthenticated: true,
        providerReadbackReady: true,
        productionDeployReady: false,
      },
    });
    completeInputs.providerResources = source({
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
    }, "provider-resources.json");
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
        strictHostedClientP95Ready: true,
        aggregateHostedPerformanceReady: true,
        hostedPerformanceReady: true,
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
        performanceProofReady: true,
        localRedesignReadinessReportReady: true,
        productionD1AuthRealtimeReady: true,
      },
      inventorySummary: {
        distinctRpcNames: 80,
        rlsPolicyStorageAuthMatches: 684,
      },
    });

    const report = buildCloudflareReleaseGateReport(completeInputs);

    expect(report.readiness.providerProofReady).toBe(true);
    expect(report.readiness.costPerformanceProofReady).toBe(true);
    expect(report.readiness.dataAuthRealtimeProofReady).toBe(true);
    expect(report.readiness.productionCutoverReady).toBe(true);
    expect(report.gates.find((gate) => gate.key === "d1-auth-realtime-production-proof")?.evidence).toContain(
      "estimateHistorySlice=yes",
    );
    expect(report.blockers).toEqual([]);
  });

  it("keeps production cutover closed when runtime is ready but production cost decision is not", () => {
    const inputs = currentLocalInputs();
    inputs.workerReadiness = source({
      ...WORKER_READINESS,
      deploymentSecretsReady: true,
      deploymentReady: true,
      providerSecretList: { checked: true, ready: true },
    });
    inputs.hostedRoutes = source({
      configured: true,
      providerBacked: true,
      routeContractReady: true,
      hostedRouteProofReady: true,
      passed: true,
      results: [
        { key: "health", required: true, passed: true },
        { key: "home", required: true, passed: true },
      ],
    }, "hosted-routes.json");
    inputs.wranglerAuth = source({
      readiness: {
        wranglerCliAvailable: true,
        wranglerAuthCheckCompleted: true,
        wranglerApiAuthenticated: true,
        providerReadbackReady: true,
        productionDeployReady: false,
      },
    });
    inputs.providerResources = source({
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
    }, "provider-resources.json");
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
        cloudflareUsageCostsReady: false,
        localPreviewPerformanceCaptured: true,
        hostedCredentialFreePerformanceCaptured: true,
        productionRuntimePerformanceReady: true,
        strictHostedClientP95Ready: false,
        aggregateHostedPerformanceReady: true,
        hostedPerformanceReady: false,
        productionCostDecisionReady: false,
      },
    }, "workbook.json");
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
        performanceProofReady: true,
        localRedesignReadinessReportReady: true,
        productionD1AuthRealtimeReady: true,
      },
    });

    const report = buildCloudflareReleaseGateReport(inputs);

    expect(report.readiness.providerProofReady).toBe(true);
    expect(report.readiness.dataAuthRealtimeProofReady).toBe(true);
    expect(report.readiness.costPerformanceProofReady).toBe(false);
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
    expect(report.gates.find((gate) => gate.key === "wrangler-deploy-dry-run")).toMatchObject({
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
