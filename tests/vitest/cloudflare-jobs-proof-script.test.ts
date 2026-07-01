import { describe, expect, it } from "vitest";

import { buildReport } from "../../scripts/verify-cloudflare-jobs-proof";

function proofBody(input: { proofId: string; latencyMs: number }) {
  const requestedAt = "2026-06-30T03:00:00.000Z";
  const receiptGeneratedAt = new Date(Date.parse(requestedAt) + input.latencyMs).toISOString();
  return {
    mode: "cloudflare-jobs-runtime-proof",
    endpointProofScope: "queue-send-consumer-r2-receipt",
    proofId: input.proofId,
    queue: "archestimator-upload-jobs",
    proofReceiptKey: `provider-proof/jobs/${input.proofId}.json`,
    result: {
      queueSendReady: true,
      queueConsumerReceiptReady: true,
      cronProviderExecutionProven: true,
      consumerOutcome: {
        action: "ack",
        reason: "executed",
        attempts: 1,
        deadLetterExpected: false,
        executedCount: 1,
        skippedCount: 0,
        error: null,
      },
      queueLatency: {
        requestedAt,
        receiptGeneratedAt,
        latencyMs: input.latencyMs,
        p95Ms: input.latencyMs,
        sampleCount: 1,
        samples: [input.latencyMs],
      },
    },
    queueLatency: {
      requestedAt,
      receiptGeneratedAt,
      latencyMs: input.latencyMs,
      p95Ms: input.latencyMs,
      sampleCount: 1,
      samples: [input.latencyMs],
    },
    readiness: {
      providerBacked: true,
      queueSendReady: true,
      queueConsumerReceiptReady: true,
      cronProviderExecutionProven: true,
      productionJobsMessagingReady: true,
    },
    blockers: [],
  };
}

describe("Cloudflare jobs proof verifier script", () => {
  it("aggregates provider-returned queue latency samples into p95 evidence", async () => {
    const bodies = [
      proofBody({ proofId: "proof-sample-one-1234", latencyMs: 120 }),
      proofBody({ proofId: "proof-sample-two-1234", latencyMs: 240 }),
    ];
    const fetchImpl = async () => Response.json(bodies.shift());

    const report = await buildReport({
      baseUrl: "https://archestimator.example",
      secret: "cron-secret",
      secretInput: { name: "CRON_SECRET", present: true, source: "test" },
      fetchImpl,
      sampleCount: 2,
    });

    expect(report.readiness.productionJobsMessagingReady).toBe(true);
    expect(report.queueLatency).toEqual({
      sampleCount: 2,
      p95Ms: 240,
      samplesMs: [120, 240],
      latestRequestedAt: "2026-06-30T03:00:00.000Z",
      latestReceiptGeneratedAt: "2026-06-30T03:00:00.240Z",
    });
    expect(report.blockers).toEqual([]);
  });
});
