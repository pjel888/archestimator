import { describe, expect, it } from "vitest";

import { routeCloudflareJobsProofRequest } from "../../src/lib/cloudflare/jobs-proof-router";
import { CLOUDFLARE_UPLOAD_JOBS_PROVIDER_PROOF_PREFIX } from "../../src/lib/cloudflare/upload-job-queue";

class FakeR2Object {
  constructor(private readonly value: string) {}

  async arrayBuffer() {
    return new TextEncoder().encode(this.value).buffer;
  }
}

function createEnv() {
  const objects = new Map<string, string>();
  const r2 = {
    async get(key: string) {
      const value = objects.get(key);
      return value ? new FakeR2Object(value) : null;
    },
    async put(key: string, value: string) {
      objects.set(key, value);
    },
  };
  const queue = {
    async sendBatch(messages: Iterable<{ body: { providerProof?: { id?: string; requestedAt?: string } }; contentType: "json" }>) {
      for (const message of messages) {
        const proofId = message.body.providerProof?.id;
        if (!proofId) continue;
        const requestedAt = message.body.providerProof?.requestedAt ?? null;
        const receiptGeneratedAt = requestedAt
          ? new Date(Date.parse(requestedAt) + 1_250).toISOString()
          : "2026-06-30T00:00:00.000Z";
        await r2.put(
          `${CLOUDFLARE_UPLOAD_JOBS_PROVIDER_PROOF_PREFIX}/${proofId}.json`,
          JSON.stringify({
            generatedAt: receiptGeneratedAt,
            mode: "cloudflare-jobs-runtime-proof-receipt",
            proofId,
            requestedAt,
            queueLatency: {
              requestedAt,
              receiptGeneratedAt,
              latencyMs: 1_250,
              sampleCount: 1,
            },
            queue: "archestimator-upload-jobs",
            cron: "0 3 * * *",
            jobName: "upload-cleanup",
            jobExecution: {
              dryRun: true,
              executed: [{
                name: "upload-cleanup",
                path: "/api/internal/upload-cleanup",
                status: 200,
                ok: true,
              }],
              skipped: [],
            },
            outcome: {
              messageId: "test-message",
              action: "ack",
              reason: "executed",
              attempts: 1,
              deadLetterExpected: false,
              retryDelaySeconds: null,
              executedCount: 1,
              skippedCount: 0,
              error: null,
            },
            readiness: {
              queueConsumerReceiptReady: true,
              cronProviderExecutionProven: true,
              productionJobsMessagingReady: true,
            },
          }),
        );
      }
    },
  };
  return { CRON_SECRET: "secret", ARCH_UPLOADS_R2: r2, UPLOAD_JOBS_QUEUE: queue };
}

describe("Cloudflare jobs proof router", () => {
  it("ignores unrelated paths", async () => {
    await expect(routeCloudflareJobsProofRequest(new Request("https://example.com/nope"), createEnv())).resolves.toBeNull();
  });

  it("requires the cron bearer secret", async () => {
    const response = await routeCloudflareJobsProofRequest(
      new Request("https://example.com/__cloudflare/jobs-proof", { method: "POST" }),
      createEnv(),
    );

    expect(response?.status).toBe(401);
  });

  it("sends a provider proof message and returns the sanitized R2 consumer receipt", async () => {
    const response = await routeCloudflareJobsProofRequest(
      new Request("https://example.com/__cloudflare/jobs-proof", {
        method: "POST",
        headers: { authorization: "Bearer secret" },
      }),
      createEnv(),
    );
    const body = await response?.json();

    expect(response?.status).toBe(200);
    expect(body.mode).toBe("cloudflare-jobs-runtime-proof");
    expect(body.result.queueSendReady).toBe(true);
    expect(body.result.queueConsumerReceiptReady).toBe(true);
    expect(body.result.cronProviderExecutionProven).toBe(true);
    expect(body.result.jobExecution).toEqual({
      dryRun: true,
      executed: [{
        name: "upload-cleanup",
        path: "/api/internal/upload-cleanup",
        status: 200,
        ok: true,
      }],
      skipped: [],
    });
    expect(body.result.queueLatency).toMatchObject({
      latencyMs: 1_250,
      p95Ms: 1_250,
      sampleCount: 1,
      samples: [1_250],
    });
    expect(body.queueLatency).toMatchObject(body.result.queueLatency);
    expect(body.readiness.productionJobsMessagingReady).toBe(true);
    expect(body.blockers).toEqual([]);
  });
});
