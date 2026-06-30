import { describe, expect, it } from "vitest";

import {
  CLOUDFLARE_UPLOAD_CLEANUP_CRON,
  CLOUDFLARE_UPLOAD_SCAN_CRON,
} from "@/lib/cloudflare/scheduled-upload-jobs";
import {
  CLOUDFLARE_UPLOAD_JOBS_MAX_RETRIES,
  buildCloudflareUploadJobQueueMessages,
  enqueueCloudflareScheduledUploadJobs,
  type CloudflareUploadJobQueueBatchLike,
  type CloudflareUploadJobQueueMessageLike,
  runCloudflareUploadJobQueueBatch,
} from "@/lib/cloudflare/upload-job-queue";

class FakeMessage implements CloudflareUploadJobQueueMessageLike {
  acked = false;
  retried = false;
  retryDelaySeconds: number | null = null;

  constructor(
    readonly id: string,
    readonly body: unknown,
    readonly attempts: number,
  ) {}

  ack() {
    this.acked = true;
  }

  retry(options?: { delaySeconds?: number }) {
    this.retried = true;
    this.retryDelaySeconds = options?.delaySeconds ?? null;
  }
}

describe("Cloudflare upload job queue", () => {
  it("builds deterministic queue messages from the existing cron map", () => {
    const messages = buildCloudflareUploadJobQueueMessages({
      cron: CLOUDFLARE_UPLOAD_CLEANUP_CRON,
      enqueuedAt: new Date("2026-06-30T03:00:15.000Z"),
    });

    expect(messages).toEqual([
      {
        version: 1,
        jobName: "upload-cleanup",
        cron: CLOUDFLARE_UPLOAD_CLEANUP_CRON,
        enqueuedAt: "2026-06-30T03:00:15.000Z",
        idempotencyKey: "upload-cleanup:0 3 * * *:2026-06-30T03:00",
        source: "cloudflare-cron",
      },
    ]);
  });

  it("enqueues scheduled upload jobs only when a queue binding is present", async () => {
    const sent: unknown[] = [];
    const missingQueue = await enqueueCloudflareScheduledUploadJobs({
      cron: CLOUDFLARE_UPLOAD_CLEANUP_CRON,
      env: {},
    });
    const withQueue = await enqueueCloudflareScheduledUploadJobs({
      cron: CLOUDFLARE_UPLOAD_CLEANUP_CRON,
      enqueuedAt: new Date("2026-06-30T03:00:00.000Z"),
      env: {
        UPLOAD_JOBS_QUEUE: {
          sendBatch(messages) {
            sent.push(...Array.from(messages));
          },
        },
      },
    });

    expect(missingQueue.enqueued).toEqual([]);
    expect(missingQueue.skipped).toEqual([{ jobName: "upload-cleanup", reason: "missing_queue_binding" }]);
    expect(withQueue.enqueued).toHaveLength(1);
    expect(withQueue.skipped).toEqual([]);
    expect(sent).toHaveLength(1);
  });

  it("acks successes, duplicate messages, and poison messages while retrying failed jobs", async () => {
    const cleanup = buildCloudflareUploadJobQueueMessages({
      cron: CLOUDFLARE_UPLOAD_CLEANUP_CRON,
      enqueuedAt: new Date("2026-06-30T03:00:00.000Z"),
    })[0];
    const scan = buildCloudflareUploadJobQueueMessages({
      cron: CLOUDFLARE_UPLOAD_SCAN_CRON,
      enqueuedAt: new Date("2026-06-30T03:15:00.000Z"),
    })[0];
    const messages = [
      new FakeMessage("cleanup-success", cleanup, 1),
      new FakeMessage("cleanup-duplicate", cleanup, 2),
      new FakeMessage("scan-failure", scan, CLOUDFLARE_UPLOAD_JOBS_MAX_RETRIES),
      new FakeMessage("invalid", { nope: true }, 1),
    ];
    const batch: CloudflareUploadJobQueueBatchLike = {
      queue: "archestimator-upload-jobs",
      messages,
    };

    const summary = await runCloudflareUploadJobQueueBatch({
      batch,
      env: {
        CRON_SECRET: "cron-secret",
        UPLOAD_JOBS_ENABLED: "1",
        CLOUDFLARE_UPLOAD_JOBS_DRY_RUN: "0",
      },
      fetcher: async (request) =>
        request.url.includes("/api/internal/upload-scan")
          ? Response.json({ ok: false }, { status: 503 })
          : Response.json({ ok: true }),
    });

    expect(summary.ackedCount).toBe(3);
    expect(summary.retriedCount).toBe(1);
    expect(summary.duplicateAckCount).toBe(1);
    expect(summary.invalidAckCount).toBe(1);
    expect(summary.deadLetterExpectedCount).toBe(1);
    expect(summary.outcomes.map((outcome) => outcome.reason)).toEqual([
      "executed",
      "duplicate",
      "job-failed",
      "invalid-message",
    ]);
    expect(messages[0].acked).toBe(true);
    expect(messages[1].acked).toBe(true);
    expect(messages[2].retried).toBe(true);
    expect(messages[3].acked).toBe(true);
  });
});
