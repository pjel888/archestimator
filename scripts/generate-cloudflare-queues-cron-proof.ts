#!/usr/bin/env bun

import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";

import {
  CLOUDFLARE_UPLOAD_CLEANUP_CRON,
  CLOUDFLARE_UPLOAD_SCAN_CRON,
} from "../src/lib/cloudflare/scheduled-upload-jobs";
import {
  CLOUDFLARE_UPLOAD_JOBS_DLQ_NAME,
  CLOUDFLARE_UPLOAD_JOBS_MAX_RETRIES,
  CLOUDFLARE_UPLOAD_JOBS_QUEUE_BINDING,
  CLOUDFLARE_UPLOAD_JOBS_QUEUE_NAME,
  buildCloudflareUploadJobQueueMessages,
  enqueueCloudflareScheduledUploadJobs,
  type CloudflareUploadJobQueueBatchLike,
  type CloudflareUploadJobQueueMessageLike,
  runCloudflareUploadJobQueueBatch,
} from "../src/lib/cloudflare/upload-job-queue";

type WranglerQueuesConfig = {
  queues?: {
    producers?: Array<{
      binding?: string;
      queue?: string;
    }>;
    consumers?: Array<{
      queue?: string;
      max_batch_size?: number;
      max_batch_timeout?: number;
      max_retries?: number;
      dead_letter_queue?: string;
    }>;
  };
  triggers?: {
    crons?: string[];
  };
};

type CloudflareQueuesCronProofInputs = {
  generatedAt?: string;
  jobsRuntimeProof?: CloudflareJobsRuntimeProof | null;
  wranglerConfigText: string;
  workerText: string;
  sources?: Partial<CloudflareQueuesCronProofReport["sources"]>;
};

type CloudflareJobsRuntimeProof = {
  generatedAt?: string;
  readiness?: {
    providerBacked?: boolean;
    queueSendReady?: boolean;
    queueConsumerReceiptReady?: boolean;
    cronProviderExecutionProven?: boolean;
    productionJobsMessagingReady?: boolean;
  };
};

type QueueConfigReport = {
  producerBindingReady: boolean;
  consumerReady: boolean;
  deadLetterReady: boolean;
  cronTriggersReady: boolean;
  producer: {
    binding: string | null;
    queue: string | null;
  };
  consumer: {
    queue: string | null;
    maxBatchSize: number | null;
    maxBatchTimeout: number | null;
    maxRetries: number | null;
    deadLetterQueue: string | null;
  };
};

type WorkerQueueHandlerReport = {
  queueHandlerPresent: boolean;
  queueRunnerImported: boolean;
  openNextFetcherUsed: boolean;
  ready: boolean;
};

type LocalQueueSimulationReport = {
  enqueueSentCount: number;
  enqueueSkippedCount: number;
  messageCount: number;
  ackedCount: number;
  retriedCount: number;
  duplicateAckCount: number;
  invalidAckCount: number;
  deadLetterExpectedCount: number;
  outcomes: Array<{
    messageId: string;
    jobName: string;
    action: string;
    reason: string;
    attempts: number;
    deadLetterExpected: boolean;
    retryDelaySeconds: number | null;
  }>;
};

export type CloudflareQueuesCronProofReport = {
  generatedAt: string;
  mode: "cloudflare-queues-cron-proof";
  sources: {
    wranglerConfig: string;
    worker: string;
    plan: string;
  };
  readiness: {
    localQueueConfigReady: boolean;
    workerQueueHandlerReady: boolean;
    localQueueProducerReady: boolean;
    localConsumerAckReady: boolean;
    localRetryReady: boolean;
    localDeadLetterDecisionReady: boolean;
    localDuplicateDeliveryReady: boolean;
    localPoisonMessageReady: boolean;
    localQueuesCronProofReady: boolean;
    providerBacked: boolean;
    queueSendProviderReady: boolean;
    queueConsumerReceiptReady: boolean;
    cronProviderExecutionProven: boolean;
    productionJobsMessagingReady: boolean;
  };
  jobsRuntimeProof: {
    sourceGeneratedAt: string | null;
    present: boolean;
  };
  queueConfig: QueueConfigReport;
  workerQueueHandler: WorkerQueueHandlerReport;
  localSimulation: LocalQueueSimulationReport;
  blockers: string[];
  note: string;
};

const PLAN_ROOT = ".ai/03_plans/2026-06-29-Cloudflare-Migration-Codex";
const DEFAULT_JOBS_RUNTIME_PROOF_FILE = `${PLAN_ROOT}/evidence/2026-06-30-cloudflare-jobs-runtime-proof.json`;
const DEFAULT_OUTPUT_FILE = `${PLAN_ROOT}/evidence/2026-06-30-cloudflare-queues-cron-proof.json`;
const DEFAULT_MARKDOWN_FILE = `${PLAN_ROOT}/evidence/2026-06-30-cloudflare-queues-cron-proof.md`;

function readEnv(name: string) {
  const value = process.env[name];
  return value?.trim() || undefined;
}

function stripJsonComments(input: string) {
  let output = "";
  let inString = false;
  let escaped = false;

  for (let index = 0; index < input.length; index += 1) {
    const char = input[index];
    const next = input[index + 1];

    if (inString) {
      output += char;
      if (escaped) {
        escaped = false;
      } else if (char === "\\") {
        escaped = true;
      } else if (char === "\"") {
        inString = false;
      }
      continue;
    }

    if (char === "\"") {
      inString = true;
      output += char;
      continue;
    }

    if (char === "/" && next === "/") {
      while (index < input.length && input[index] !== "\n") index += 1;
      output += "\n";
      continue;
    }

    if (char === "/" && next === "*") {
      index += 2;
      while (index < input.length && !(input[index] === "*" && input[index + 1] === "/")) index += 1;
      index += 1;
      continue;
    }

    output += char;
  }

  return output;
}

function parseJsonc<T>(input: string): T {
  return JSON.parse(stripJsonComments(input)) as T;
}

function summarizeQueueConfig(wranglerConfigText: string): QueueConfigReport {
  const config = parseJsonc<WranglerQueuesConfig>(wranglerConfigText);
  const producer = (config.queues?.producers ?? []).find((candidate) =>
    candidate.binding === CLOUDFLARE_UPLOAD_JOBS_QUEUE_BINDING
      && candidate.queue === CLOUDFLARE_UPLOAD_JOBS_QUEUE_NAME
  );
  const consumer = (config.queues?.consumers ?? []).find((candidate) =>
    candidate.queue === CLOUDFLARE_UPLOAD_JOBS_QUEUE_NAME
  );
  const cronTriggers = new Set(config.triggers?.crons ?? []);

  return {
    producerBindingReady: Boolean(producer),
    consumerReady: Boolean(
      consumer
        && consumer.max_batch_size
        && consumer.max_batch_timeout
        && consumer.max_retries === CLOUDFLARE_UPLOAD_JOBS_MAX_RETRIES,
    ),
    deadLetterReady: consumer?.dead_letter_queue === CLOUDFLARE_UPLOAD_JOBS_DLQ_NAME,
    cronTriggersReady: cronTriggers.has(CLOUDFLARE_UPLOAD_CLEANUP_CRON)
      && cronTriggers.has(CLOUDFLARE_UPLOAD_SCAN_CRON),
    producer: {
      binding: producer?.binding ?? null,
      queue: producer?.queue ?? null,
    },
    consumer: {
      queue: consumer?.queue ?? null,
      maxBatchSize: consumer?.max_batch_size ?? null,
      maxBatchTimeout: consumer?.max_batch_timeout ?? null,
      maxRetries: consumer?.max_retries ?? null,
      deadLetterQueue: consumer?.dead_letter_queue ?? null,
    },
  };
}

function summarizeWorkerQueueHandler(workerText: string): WorkerQueueHandlerReport {
  const queueHandlerPresent = workerText.includes("queue(batch:");
  const queueRunnerImported = workerText.includes("runCloudflareUploadJobQueueBatch");
  const openNextFetcherUsed = workerText.includes("openNextWorker.fetch(request, env, ctx)");
  return {
    queueHandlerPresent,
    queueRunnerImported,
    openNextFetcherUsed,
    ready: queueHandlerPresent && queueRunnerImported && openNextFetcherUsed,
  };
}

class FakeQueueMessage implements CloudflareUploadJobQueueMessageLike {
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

async function simulateLocalQueue() {
  const enqueuedBatches: unknown[][] = [];
  const enqueuedAt = new Date("2026-06-30T03:00:00.000Z");
  const enqueueSummary = await enqueueCloudflareScheduledUploadJobs({
    cron: CLOUDFLARE_UPLOAD_CLEANUP_CRON,
    enqueuedAt,
    env: {
      UPLOAD_JOBS_QUEUE: {
        sendBatch(messages) {
          enqueuedBatches.push(Array.from(messages));
        },
      },
    },
  });

  const cleanupBody = buildCloudflareUploadJobQueueMessages({
    cron: CLOUDFLARE_UPLOAD_CLEANUP_CRON,
    enqueuedAt,
  })[0];
  const scanBody = buildCloudflareUploadJobQueueMessages({
    cron: CLOUDFLARE_UPLOAD_SCAN_CRON,
    enqueuedAt: new Date("2026-06-30T03:15:00.000Z"),
  })[0];
  const batch: CloudflareUploadJobQueueBatchLike = {
    queue: CLOUDFLARE_UPLOAD_JOBS_QUEUE_NAME,
    messages: [
      new FakeQueueMessage("cleanup-success", cleanupBody, 1),
      new FakeQueueMessage("cleanup-duplicate", cleanupBody, 2),
      new FakeQueueMessage("scan-failure-final-attempt", scanBody, CLOUDFLARE_UPLOAD_JOBS_MAX_RETRIES),
      new FakeQueueMessage("invalid-poison", { wrong: true }, 1),
    ],
  };
  const queueSummary = await runCloudflareUploadJobQueueBatch({
    batch,
    env: {
      CRON_SECRET: "local-proof-secret",
      UPLOAD_JOBS_ENABLED: "1",
      CLOUDFLARE_UPLOAD_JOBS_DRY_RUN: "0",
      CLOUDFLARE_UPLOAD_JOBS_ORIGIN: "https://archestimator.internal",
    },
    fetcher: async (request) => {
      if (request.url.includes("/api/internal/upload-scan")) {
        return Response.json({ ok: false }, { status: 503 });
      }
      return Response.json({ ok: true });
    },
  });

  return {
    enqueueSentCount: enqueuedBatches.flat().length,
    enqueueSkippedCount: enqueueSummary.skipped.length,
    messageCount: queueSummary.messageCount,
    ackedCount: queueSummary.ackedCount,
    retriedCount: queueSummary.retriedCount,
    duplicateAckCount: queueSummary.duplicateAckCount,
    invalidAckCount: queueSummary.invalidAckCount,
    deadLetterExpectedCount: queueSummary.deadLetterExpectedCount,
    outcomes: queueSummary.outcomes.map((outcome) => ({
      messageId: outcome.messageId,
      jobName: outcome.jobName,
      action: outcome.action,
      reason: outcome.reason,
      attempts: outcome.attempts,
      deadLetterExpected: outcome.deadLetterExpected,
      retryDelaySeconds: outcome.retryDelaySeconds,
    })),
  };
}

function blockersFor(readiness: CloudflareQueuesCronProofReport["readiness"]) {
  const blockers: string[] = [];
  if (!readiness.localQueueConfigReady) blockers.push("Wrangler Queues producer/consumer/DLQ config is incomplete.");
  if (!readiness.workerQueueHandlerReady) blockers.push("Worker queue() handler is missing or not wired to the upload job queue runner.");
  if (!readiness.localQueueProducerReady) blockers.push("Local queue producer simulation did not enqueue the expected upload job message.");
  if (!readiness.localConsumerAckReady) blockers.push("Local queue consumer simulation did not ack a successful upload job.");
  if (!readiness.localRetryReady) blockers.push("Local queue consumer simulation did not retry a failed upload job.");
  if (!readiness.localDeadLetterDecisionReady) blockers.push("Local queue consumer simulation did not mark a final retry as DLQ-eligible.");
  if (!readiness.localDuplicateDeliveryReady) blockers.push("Local queue consumer simulation did not acknowledge duplicate idempotency keys without re-running work.");
  if (!readiness.localPoisonMessageReady) blockers.push("Local queue consumer simulation did not acknowledge malformed messages safely.");
  if (!readiness.providerBacked) blockers.push("Cloudflare provider-backed Cron/Queues/DLQ execution evidence is still missing.");
  if (!readiness.queueSendProviderReady) blockers.push("Cloudflare Queue provider send proof is missing.");
  if (!readiness.queueConsumerReceiptReady) blockers.push("Cloudflare Queue consumer receipt proof is missing.");
  if (!readiness.cronProviderExecutionProven) blockers.push("Cloudflare Cron/scheduled dry-run provider execution proof is missing.");
  if (!readiness.productionJobsMessagingReady) blockers.push("Cloudflare production jobs messaging proof is incomplete.");
  return blockers;
}

function readJsonFile<T>(file: string): T | null {
  if (!file || !existsSync(file)) return null;
  return JSON.parse(readFileSync(file, "utf8")) as T;
}

export async function buildCloudflareQueuesCronProofReport(
  inputs: CloudflareQueuesCronProofInputs,
): Promise<CloudflareQueuesCronProofReport> {
  const queueConfig = summarizeQueueConfig(inputs.wranglerConfigText);
  const workerQueueHandler = summarizeWorkerQueueHandler(inputs.workerText);
  const localSimulation = await simulateLocalQueue();
  const jobsRuntimeProof = inputs.jobsRuntimeProof ?? null;
  const localQueueConfigReady = queueConfig.producerBindingReady
    && queueConfig.consumerReady
    && queueConfig.deadLetterReady
    && queueConfig.cronTriggersReady;
  const readiness = {
    localQueueConfigReady,
    workerQueueHandlerReady: workerQueueHandler.ready,
    localQueueProducerReady: localSimulation.enqueueSentCount === 1 && localSimulation.enqueueSkippedCount === 0,
    localConsumerAckReady: localSimulation.outcomes.some((outcome) =>
      outcome.action === "ack" && outcome.reason === "executed"
    ),
    localRetryReady: localSimulation.outcomes.some((outcome) =>
      outcome.action === "retry" && outcome.reason === "job-failed"
    ),
    localDeadLetterDecisionReady: localSimulation.deadLetterExpectedCount > 0
      && queueConfig.deadLetterReady
      && queueConfig.consumer.maxRetries === CLOUDFLARE_UPLOAD_JOBS_MAX_RETRIES,
    localDuplicateDeliveryReady: localSimulation.duplicateAckCount > 0,
    localPoisonMessageReady: localSimulation.invalidAckCount > 0,
    localQueuesCronProofReady: false,
    providerBacked: jobsRuntimeProof?.readiness?.providerBacked === true,
    queueSendProviderReady: jobsRuntimeProof?.readiness?.queueSendReady === true,
    queueConsumerReceiptReady: jobsRuntimeProof?.readiness?.queueConsumerReceiptReady === true,
    cronProviderExecutionProven: jobsRuntimeProof?.readiness?.cronProviderExecutionProven === true,
    productionJobsMessagingReady: false,
  };
  readiness.localQueuesCronProofReady = readiness.localQueueConfigReady
    && readiness.workerQueueHandlerReady
    && readiness.localQueueProducerReady
    && readiness.localConsumerAckReady
    && readiness.localRetryReady
    && readiness.localDeadLetterDecisionReady
    && readiness.localDuplicateDeliveryReady
    && readiness.localPoisonMessageReady;
  readiness.productionJobsMessagingReady = readiness.localQueuesCronProofReady
    && readiness.providerBacked
    && readiness.queueSendProviderReady
    && readiness.queueConsumerReceiptReady
    && readiness.cronProviderExecutionProven
    && jobsRuntimeProof?.readiness?.productionJobsMessagingReady === true;

  return {
    generatedAt: inputs.generatedAt ?? new Date().toISOString(),
    mode: "cloudflare-queues-cron-proof",
    sources: {
      wranglerConfig: inputs.sources?.wranglerConfig ?? "wrangler.jsonc",
      worker: inputs.sources?.worker ?? "worker.ts",
      plan: inputs.sources?.plan ?? `${PLAN_ROOT}/27_PROOF_SPIKE_BACKLOG.md`,
    },
    readiness,
    jobsRuntimeProof: {
      sourceGeneratedAt: jobsRuntimeProof?.generatedAt ?? null,
      present: Boolean(jobsRuntimeProof),
    },
    queueConfig,
    workerQueueHandler,
    localSimulation,
    blockers: blockersFor(readiness),
    note:
      "Cloudflare Queues/Cron proof. It validates wrangler queue/DLQ config, Worker queue() wiring, local enqueue, ack, retry, duplicate-idempotency, poison-message handling, and, when available, a sanitized provider runtime proof without printing secrets, changing DNS, billing, or replacing the live Vercel cron fallback.",
  };
}

function writeOutput(outputFile: string, report: CloudflareQueuesCronProofReport) {
  const outputPath = resolve(outputFile);
  mkdirSync(dirname(outputPath), { recursive: true });
  writeFileSync(outputPath, `${JSON.stringify(report, null, 2)}\n`);
}

function markdownRows(rows: string[][]) {
  return rows.map((row) => `| ${row.map((cell) => cell.replaceAll("|", "\\|")).join(" | ")} |`);
}

export function writeMarkdown(report: CloudflareQueuesCronProofReport, markdownFile: string) {
  const outputPath = resolve(markdownFile);
  mkdirSync(dirname(outputPath), { recursive: true });
  const readinessRows = Object.entries(report.readiness).map(([key, value]) => [key, value ? "yes" : "no"]);
  const outcomeRows = report.localSimulation.outcomes.map((outcome) => [
    outcome.messageId,
    outcome.jobName,
    outcome.action,
    outcome.reason,
    String(outcome.attempts),
    outcome.deadLetterExpected ? "yes" : "no",
  ]);
  const blockerLines = report.blockers.length > 0
    ? report.blockers.map((blocker) => `- ${blocker}`)
    : ["- (none)"];
  const lines = [
    "# Cloudflare Queues/Cron Local Proof",
    "",
    `Generated: ${report.generatedAt}`,
    "",
    report.note,
    "",
    `Jobs runtime proof present: ${report.jobsRuntimeProof.present ? "yes" : "no"}`,
    `Jobs runtime proof generated: ${report.jobsRuntimeProof.sourceGeneratedAt ?? "(none)"}`,
    "",
    "## Readiness",
    "",
    "| Gate | Ready |",
    "| --- | --- |",
    ...markdownRows(readinessRows),
    "",
    "## Queue Config",
    "",
    "| Check | Value |",
    "| --- | --- |",
    `| Producer binding | ${report.queueConfig.producer.binding ?? ""} |`,
    `| Producer queue | ${report.queueConfig.producer.queue ?? ""} |`,
    `| Consumer queue | ${report.queueConfig.consumer.queue ?? ""} |`,
    `| Consumer max retries | ${report.queueConfig.consumer.maxRetries ?? ""} |`,
    `| Dead-letter queue | ${report.queueConfig.consumer.deadLetterQueue ?? ""} |`,
    "",
    "## Local Simulation",
    "",
    "| Metric | Value |",
    "| --- | ---: |",
    `| Enqueued messages | ${report.localSimulation.enqueueSentCount} |`,
    `| Acked messages | ${report.localSimulation.ackedCount} |`,
    `| Retried messages | ${report.localSimulation.retriedCount} |`,
    `| Duplicate acked | ${report.localSimulation.duplicateAckCount} |`,
    `| Invalid acked | ${report.localSimulation.invalidAckCount} |`,
    `| DLQ expected | ${report.localSimulation.deadLetterExpectedCount} |`,
    "",
    "| Message | Job | Action | Reason | Attempts | DLQ expected |",
    "| --- | --- | --- | --- | ---: | --- |",
    ...markdownRows(outcomeRows),
    "",
    "## Blockers",
    "",
    ...blockerLines,
    "",
  ];
  writeFileSync(outputPath, lines.join("\n"));
}

async function main() {
  const outputFile = readEnv("CLOUDFLARE_QUEUES_CRON_PROOF_OUT") ?? DEFAULT_OUTPUT_FILE;
  const markdownFile = readEnv("CLOUDFLARE_QUEUES_CRON_PROOF_MD") ?? DEFAULT_MARKDOWN_FILE;
  const wranglerConfigFile = readEnv("CLOUDFLARE_QUEUES_CRON_WRANGLER_FILE") ?? "wrangler.jsonc";
  const workerFile = readEnv("CLOUDFLARE_QUEUES_CRON_WORKER_FILE") ?? "worker.ts";
  const jobsRuntimeProofFile = readEnv("CLOUDFLARE_JOBS_RUNTIME_PROOF_FILE") ?? DEFAULT_JOBS_RUNTIME_PROOF_FILE;
  const report = await buildCloudflareQueuesCronProofReport({
    jobsRuntimeProof: readJsonFile<CloudflareJobsRuntimeProof>(jobsRuntimeProofFile),
    wranglerConfigText: readFileSync(wranglerConfigFile, "utf8"),
    workerText: readFileSync(workerFile, "utf8"),
    sources: {
      wranglerConfig: wranglerConfigFile,
      worker: workerFile,
    },
  });

  writeOutput(outputFile, report);
  writeMarkdown(report, markdownFile);
  console.log(JSON.stringify({
    outputFile,
    markdownFile,
    localQueuesCronProofReady: report.readiness.localQueuesCronProofReady,
    providerBacked: report.readiness.providerBacked,
    productionJobsMessagingReady: report.readiness.productionJobsMessagingReady,
    blockers: report.blockers,
  }, null, 2));
}

if (import.meta.main) {
  main().catch((error) => {
    console.error(error);
    process.exit(1);
  });
}
