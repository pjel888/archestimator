import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import {
  checkCloudflareProviderReadiness,
  writeMarkdown,
} from "../../scripts/check-cloudflare-provider-readiness";

const archivedEvidenceRoot = ".ai/09_archive/2026-06-29-Cloudflare-Migration-Codex/evidence";

const CURRENT_SANITIZED_EVIDENCE = {
  capturedAt: "2026-06-29T14:04:58.000Z",
  account: {
    name: "Philipjonlewis@gmail.com's Account",
    id: "7f6229cfea61b59f6f48b517fde86039",
  },
  zone: {
    name: "archestimator.com",
    id: "3c6fcddb743342bfe8b0097ba5ba7c19",
    plan: "Free",
    dnsImportedRecordCount: 9,
    dnsImportedReviewed: true,
    assignedNameservers: ["carl.ns.cloudflare.com", "ziggy.ns.cloudflare.com"],
    registrarNameservers: ["dns1.registrar-servers.com", "dns2.registrar-servers.com"],
  },
  workers: {
    plan: "Free",
    workersPaidPurchased: false,
    projectCount: 0,
    accountSubdomain: "philipjonlewis.workers.dev",
    deployedWorkerUrl: null,
    customDomainActive: false,
    apiAuthConfigured: false,
    sanitizedSecretListCaptured: false,
  },
  storageAndMedia: {
    r2ProofBucketsCreated: false,
    r2HostedReadbackProven: false,
    imagesBindingProviderProven: false,
  },
  jobsAndMessaging: {
    cronProviderExecutionProven: false,
    queuesProofCreated: false,
    deadLetterProofCreated: false,
  },
  analytics: {
    webAnalyticsPropertyCreated: true,
    webAnalyticsReceivingDataProven: false,
  },
  actionsIntentionallyNotTaken: ["Workers Paid checkout", "API token creation"],
};

const AUTHENTICATED_WRANGLER = {
  generatedAt: "2026-06-30T12:30:00.000Z",
  auth: {
    authenticated: true,
    accountNames: ["Philipjonlewis@gmail.com's Account"],
    accountIds: ["7f6229cfea61b59f6f48b517fde86039"],
  },
  readiness: {
    wranglerAuthCheckCompleted: true,
    wranglerApiAuthenticated: true,
    providerReadbackReady: true,
  },
};

const PROVIDER_RESOURCE_READBACK = {
  generatedAt: "2026-06-30T12:45:00.000Z",
  readiness: {
    workerDeploymentReadbackReady: true,
    r2BucketReadbackReady: true,
    queuesReadbackReady: true,
    workerSecretNameReadbackReady: true,
    providerResourceReadbackReady: true,
  },
};

describe("Cloudflare provider readiness checker", () => {
  it("treats the current sanitized dashboard inventory as incomplete for production", () => {
    const result = checkCloudflareProviderReadiness(CURRENT_SANITIZED_EVIDENCE, "source.json");

    expect(result.dashboardInventoryReady).toBe(true);
    expect(result.workersDeploymentReady).toBe(false);
    expect(result.storageMediaReady).toBe(false);
    expect(result.jobsReady).toBe(false);
    expect(result.analyticsReady).toBe(false);
    expect(result.productionCutoverReady).toBe(false);
    expect(result.checks.find((check) => check.key === "workers-paid")).toMatchObject({
      ready: false,
      blocker: "Workers Paid has not been purchased.",
    });
    expect(result.checks.find((check) => check.key === "nameservers-active")?.blocker).toContain("Registrar nameservers");
  });

  it("passes all gates when sanitized provider proof is complete", () => {
    const complete = {
      ...CURRENT_SANITIZED_EVIDENCE,
      zone: {
        ...CURRENT_SANITIZED_EVIDENCE.zone,
        registrarNameservers: ["carl.ns.cloudflare.com", "ziggy.ns.cloudflare.com"],
      },
      workers: {
        ...CURRENT_SANITIZED_EVIDENCE.workers,
        plan: "Paid",
        workersPaidPurchased: true,
        projectCount: 1,
        deployedWorkerUrl: "https://archestimator.example.workers.dev",
        customDomainActive: true,
        apiAuthConfigured: true,
        sanitizedSecretListCaptured: true,
      },
      storageAndMedia: {
        r2ProofBucketsCreated: true,
        r2HostedReadbackProven: true,
        imagesBindingProviderProven: true,
      },
      jobsAndMessaging: {
        cronProviderExecutionProven: true,
        queuesProofCreated: true,
        deadLetterProofCreated: true,
      },
      analytics: {
        webAnalyticsPropertyCreated: true,
        webAnalyticsReceivingDataProven: true,
      },
    };

    const result = checkCloudflareProviderReadiness(complete, "complete.json");

    expect(result.productionCutoverReady).toBe(true);
    expect(result.checks.every((check) => check.ready)).toBe(true);
  });

  it("uses public DNS delegation evidence for the nameserver gate when present", () => {
    const result = checkCloudflareProviderReadiness(
      CURRENT_SANITIZED_EVIDENCE,
      "source.json",
      {
        generatedAt: "2026-06-30T12:00:00.000Z",
        zoneName: "archestimator.com",
        assignedNameservers: ["carl.ns.cloudflare.com", "ziggy.ns.cloudflare.com"],
        publicDnsNameservers: ["ziggy.ns.cloudflare.com.", "carl.ns.cloudflare.com."],
        publicDnsChecked: true,
        nameserversActive: true,
      },
      "dns-delegation.json",
    );

    const nameservers = result.checks.find((check) => check.key === "nameservers-active");
    expect(nameservers).toMatchObject({
      ready: true,
      blocker: null,
    });
    expect(nameservers?.evidence).toContain("publicDns=carl.ns.cloudflare.com, ziggy.ns.cloudflare.com");
    expect(result.nameserverEvidenceSource).toBe("public-dns");
    expect(result.dnsDelegationSource).toBe("dns-delegation.json");
    expect(result.workersDeploymentReady).toBe(false);
    expect(result.productionCutoverReady).toBe(false);
  });

  it("requires custom-domain HTTPS proof when DNS evidence captures it", () => {
    const result = checkCloudflareProviderReadiness(
      {
        ...CURRENT_SANITIZED_EVIDENCE,
        workers: {
          ...CURRENT_SANITIZED_EVIDENCE.workers,
          customDomainActive: true,
        },
      },
      "source.json",
      {
        generatedAt: "2026-07-01T06:45:00.000Z",
        zoneName: "archestimator.com",
        assignedNameservers: ["carl.ns.cloudflare.com", "ziggy.ns.cloudflare.com"],
        publicDnsNameservers: ["ziggy.ns.cloudflare.com.", "carl.ns.cloudflare.com."],
        publicDnsChecked: true,
        nameserversActive: true,
        customDomainHttpChecked: true,
        customDomainHttpReady: false,
      },
      "dns-delegation.json",
    );

    expect(result.checks.find((check) => check.key === "custom-domain")).toMatchObject({
      ready: false,
      blocker: "Worker custom domain is attached but apex/www HTTPS checks are not yet serving through Cloudflare.",
    });
    expect(result.workersDeploymentReady).toBe(false);
    expect(result.productionCutoverReady).toBe(false);
  });

  it("writes markdown without secret values from unrelated evidence fields", () => {
    const result = checkCloudflareProviderReadiness(
      {
        ...CURRENT_SANITIZED_EVIDENCE,
        // Unknown fields are intentionally ignored by the checker and Markdown writer.
        tokenValue: "do-not-leak-this-token",
      } as typeof CURRENT_SANITIZED_EVIDENCE,
      "source.json",
    );
    const dir = mkdtempSync(join(tmpdir(), "cloudflare-provider-readiness-"));
    try {
      const file = join(dir, "readiness.md");
      writeMarkdown(result, file);
      const markdown = readFileSync(file, "utf8");
      expect(markdown).toContain("Cloudflare Provider Readiness");
      expect(markdown).not.toContain("do-not-leak-this-token");
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it("matches the checked-in sanitized provider evidence source", () => {
    const evidence = JSON.parse(
      readFileSync(
        `${archivedEvidenceRoot}/2026-06-30-cloudflare-provider-readiness-source.json`,
        "utf8",
      ),
    );
    const result = checkCloudflareProviderReadiness(evidence, "repo-source.json");

    expect(result.dashboardInventoryReady).toBe(true);
    expect(result.productionCutoverReady).toBe(false);
    expect(result.checks.find((check) => check.key === "workers-paid")).toMatchObject({
      ready: true,
      blocker: null,
    });
    expect(result.actionsIntentionallyNotTaken).toContain("paid checkout/subscription purchase by Codex");
  });

  it("uses Wrangler auth evidence for the API auth gate when actual CLI readback is authenticated", () => {
    const result = checkCloudflareProviderReadiness(
      CURRENT_SANITIZED_EVIDENCE,
      "source.json",
      null,
      null,
      AUTHENTICATED_WRANGLER,
      "wrangler-auth.json",
    );

    const apiAuth = result.checks.find((check) => check.key === "api-auth");
    expect(apiAuth).toMatchObject({
      ready: true,
      blocker: null,
    });
    expect(apiAuth?.evidence).toContain("wranglerApiAuthenticated=yes");
    expect(result.wranglerAuthSource).toBe("wrangler-auth.json");
    expect(result.workersDeploymentReady).toBe(false);
    expect(result.productionCutoverReady).toBe(false);
  });

  it("uses live provider resource readback for Worker, secret-name, and R2 gates", () => {
    const result = checkCloudflareProviderReadiness(
      CURRENT_SANITIZED_EVIDENCE,
      "source.json",
      null,
      null,
      AUTHENTICATED_WRANGLER,
      "wrangler-auth.json",
      PROVIDER_RESOURCE_READBACK,
      "provider-resource-readback.json",
    );

    expect(result.checks.find((check) => check.key === "workers-project")).toMatchObject({
      ready: true,
      blocker: null,
    });
    expect(result.checks.find((check) => check.key === "worker-secrets")).toMatchObject({
      ready: true,
      blocker: null,
    });
    expect(result.checks.find((check) => check.key === "r2-provider")).toMatchObject({
      ready: true,
      blocker: null,
    });
    expect(result.providerResourceReadbackSource).toBe("provider-resource-readback.json");
    expect(result.storageMediaReady).toBe(false);
    expect(result.productionCutoverReady).toBe(false);
  });

  it("surfaces provider resource secret-name blockers instead of hiding them behind generic wording", () => {
    const result = checkCloudflareProviderReadiness(
      CURRENT_SANITIZED_EVIDENCE,
      "source.json",
      null,
      null,
      AUTHENTICATED_WRANGLER,
      "wrangler-auth.json",
      {
        ...PROVIDER_RESOURCE_READBACK,
        readiness: {
          ...PROVIDER_RESOURCE_READBACK.readiness,
          workerSecretNameReadbackReady: false,
          providerResourceReadbackReady: false,
        },
        blockers: [
          "Worker secret name list: missing expected names BETTER_AUTH_GOOGLE_CLIENT_ID, BETTER_AUTH_GOOGLE_CLIENT_SECRET.",
        ],
      },
      "provider-resource-readback.json",
    );

    expect(result.checks.find((check) => check.key === "worker-secrets")).toMatchObject({
      ready: false,
      blocker:
        "Worker secret name readback is incomplete: Worker secret name list: missing expected names BETTER_AUTH_GOOGLE_CLIENT_ID, BETTER_AUTH_GOOGLE_CLIENT_SECRET.",
    });
  });

  it("uses provider runtime proof for Images and R2 storage/media readiness", () => {
    const result = checkCloudflareProviderReadiness(
      CURRENT_SANITIZED_EVIDENCE,
      "source.json",
      null,
      null,
      AUTHENTICATED_WRANGLER,
      "wrangler-auth.json",
      PROVIDER_RESOURCE_READBACK,
      "provider-resource-readback.json",
      {
        generatedAt: "2026-06-30T13:00:00.000Z",
        readiness: {
          imagesProviderProofReady: true,
          r2ProviderProofReady: true,
          providerRuntimeProofReady: true,
        },
      },
      "provider-runtime-proof.json",
    );

    expect(result.checks.find((check) => check.key === "images-provider")).toMatchObject({
      ready: true,
      blocker: null,
    });
    expect(result.checks.find((check) => check.key === "r2-provider")?.evidence).toContain("providerRuntimeR2Proof=yes");
    expect(result.providerRuntimeProofSource).toBe("provider-runtime-proof.json");
    expect(result.storageMediaReady).toBe(true);
    expect(result.productionCutoverReady).toBe(false);
  });

  it("uses live jobs runtime proof plus queue readback for jobs readiness", () => {
    const result = checkCloudflareProviderReadiness(
      CURRENT_SANITIZED_EVIDENCE,
      "source.json",
      null,
      null,
      AUTHENTICATED_WRANGLER,
      "wrangler-auth.json",
      PROVIDER_RESOURCE_READBACK,
      "provider-resource-readback.json",
      null,
      null,
      {
        generatedAt: "2026-06-30T13:15:00.000Z",
        readiness: {
          providerBacked: true,
          queueSendReady: true,
          queueConsumerReceiptReady: true,
          cronProviderExecutionProven: true,
          productionJobsMessagingReady: true,
        },
      },
      "jobs-runtime-proof.json",
    );

    expect(result.checks.find((check) => check.key === "jobs-provider")).toMatchObject({
      ready: true,
      blocker: null,
    });
    expect(result.checks.find((check) => check.key === "jobs-provider")?.evidence).toContain("jobsRuntimeProductionProof=yes");
    expect(result.jobsRuntimeProofSource).toBe("jobs-runtime-proof.json");
    expect(result.jobsReady).toBe(true);
    expect(result.productionCutoverReady).toBe(false);
  });

  it("uses Workers Observability proof for analytics readiness", () => {
    const result = checkCloudflareProviderReadiness(
      CURRENT_SANITIZED_EVIDENCE,
      "source.json",
      null,
      null,
      AUTHENTICATED_WRANGLER,
      "wrangler-auth.json",
      PROVIDER_RESOURCE_READBACK,
      "provider-resource-readback.json",
      null,
      null,
      null,
      null,
      {
        generatedAt: "2026-06-30T13:30:00.000Z",
        observability: {
          sampledProbeEventCount: 20,
        },
        readiness: {
          workersObservabilityReceivingDataProven: true,
          currentWorkerVersionObserved: true,
          probeEventsObserved: true,
          analyticsReady: true,
        },
      },
      "observability-proof.json",
    );

    expect(result.checks.find((check) => check.key === "analytics-provider")).toMatchObject({
      ready: true,
      blocker: null,
    });
    expect(result.checks.find((check) => check.key === "analytics-provider")?.evidence).toContain("observedProbeEvents=20");
    expect(result.observabilityProofSource).toBe("observability-proof.json");
    expect(result.analyticsReady).toBe(true);
    expect(result.productionCutoverReady).toBe(false);
  });
});
