import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import {
  buildCloudflareQueuesCronProofReport,
  writeMarkdown,
} from "../../scripts/generate-cloudflare-queues-cron-proof";

const WRANGLER = JSON.stringify({
  queues: {
    producers: [{ binding: "UPLOAD_JOBS_QUEUE", queue: "archestimator-upload-jobs" }],
    consumers: [{
      queue: "archestimator-upload-jobs",
      max_batch_size: 5,
      max_batch_timeout: 30,
      max_retries: 3,
      dead_letter_queue: "archestimator-upload-jobs-dlq",
    }],
  },
  triggers: {
    crons: ["0 3 * * *", "15 3 * * *"],
  },
});

const WORKER = `
import { runCloudflareUploadJobQueueBatch } from "./src/lib/cloudflare/upload-job-queue";
export default {
  queue(batch: unknown, env: unknown, ctx: unknown) {
    return runCloudflareUploadJobQueueBatch({
      batch,
      env,
      fetcher: (request) => openNextWorker.fetch(request, env, ctx),
    });
  }
};
`;

describe("Cloudflare Queues/Cron local proof script", () => {
  it("generates local queue/cron proof while keeping provider readiness closed", async () => {
    const report = await buildCloudflareQueuesCronProofReport({
      generatedAt: "2026-06-30T00:00:00.000Z",
      wranglerConfigText: WRANGLER,
      workerText: WORKER,
    });

    expect(report.readiness.localQueueConfigReady).toBe(true);
    expect(report.readiness.workerQueueHandlerReady).toBe(true);
    expect(report.readiness.localQueueProducerReady).toBe(true);
    expect(report.readiness.localConsumerAckReady).toBe(true);
    expect(report.readiness.localRetryReady).toBe(true);
    expect(report.readiness.localDeadLetterDecisionReady).toBe(true);
    expect(report.readiness.localDuplicateDeliveryReady).toBe(true);
    expect(report.readiness.localPoisonMessageReady).toBe(true);
    expect(report.readiness.localQueuesCronProofReady).toBe(true);
    expect(report.readiness.providerBacked).toBe(false);
    expect(report.readiness.productionJobsMessagingReady).toBe(false);
    expect(report.localSimulation.outcomes.map((outcome) => outcome.reason)).toEqual([
      "executed",
      "duplicate",
      "job-failed",
      "invalid-message",
    ]);
    expect(report.blockers).toContain("Cloudflare provider-backed Cron/Queues/DLQ execution evidence is still missing.");
  });

  it("keeps local readiness closed when queue config is incomplete", async () => {
    const report = await buildCloudflareQueuesCronProofReport({
      wranglerConfigText: JSON.stringify({
        queues: {
          producers: [{ binding: "UPLOAD_JOBS_QUEUE", queue: "archestimator-upload-jobs" }],
          consumers: [{ queue: "archestimator-upload-jobs", max_retries: 1 }],
        },
        triggers: { crons: ["0 3 * * *"] },
      }),
      workerText: WORKER,
    });

    expect(report.readiness.localQueueConfigReady).toBe(false);
    expect(report.readiness.localQueuesCronProofReady).toBe(false);
    expect(report.blockers).toContain("Wrangler Queues producer/consumer/DLQ config is incomplete.");
  });

  it("writes markdown without leaking secret-looking local values", async () => {
    const report = await buildCloudflareQueuesCronProofReport({
      generatedAt: "2026-06-30T00:00:00.000Z",
      wranglerConfigText: WRANGLER,
      workerText: `${WORKER}\nconst SECRET_VALUE = "do-not-leak";`,
    });
    const dir = mkdtempSync(join(tmpdir(), "cloudflare-queues-cron-"));
    try {
      const file = join(dir, "queues-cron.md");
      writeMarkdown(report, file);
      const markdown = readFileSync(file, "utf8");
      expect(markdown).toContain("Cloudflare Queues/Cron Local Proof");
      expect(markdown).toContain("localQueuesCronProofReady | yes");
      expect(markdown).not.toContain("do-not-leak");
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it("reports the real repo config as local-ready without claiming provider proof", async () => {
    const report = await buildCloudflareQueuesCronProofReport({
      wranglerConfigText: readFileSync("wrangler.jsonc", "utf8"),
      workerText: readFileSync("worker.ts", "utf8"),
    });

    expect(report.readiness.localQueuesCronProofReady).toBe(true);
    expect(report.readiness.providerBacked).toBe(false);
    expect(report.readiness.productionJobsMessagingReady).toBe(false);
  });
});
