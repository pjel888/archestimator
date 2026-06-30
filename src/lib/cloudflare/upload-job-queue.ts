import {
  CLOUDFLARE_SCHEDULED_UPLOAD_JOBS,
  type CloudflareScheduledUploadJobEnv,
  type CloudflareScheduledUploadJobFetch,
  runCloudflareScheduledUploadJobs,
} from "./scheduled-upload-jobs";

export const CLOUDFLARE_UPLOAD_JOBS_QUEUE_BINDING = "UPLOAD_JOBS_QUEUE";
export const CLOUDFLARE_UPLOAD_JOBS_QUEUE_NAME = "archestimator-upload-jobs";
export const CLOUDFLARE_UPLOAD_JOBS_DLQ_NAME = "archestimator-upload-jobs-dlq";
export const CLOUDFLARE_UPLOAD_JOBS_MAX_RETRIES = 3;
export const CLOUDFLARE_UPLOAD_JOBS_RETRY_DELAY_SECONDS = 60;

export type CloudflareUploadJobQueueMessage = {
  version: 1;
  jobName: "upload-cleanup" | "upload-scan";
  cron: string;
  enqueuedAt: string;
  idempotencyKey: string;
  source: "cloudflare-cron";
};

type QueueSendRequest = {
  body: CloudflareUploadJobQueueMessage;
  contentType: "json";
};

type QueueBindingLike = {
  sendBatch(messages: Iterable<QueueSendRequest>): Promise<unknown> | unknown;
};

export type CloudflareUploadJobQueueEnv = CloudflareScheduledUploadJobEnv & {
  UPLOAD_JOBS_QUEUE?: QueueBindingLike;
};

type QueueRetryOptionsLike = {
  delaySeconds?: number;
};

export type CloudflareUploadJobQueueMessageLike = {
  id: string;
  attempts: number;
  body: unknown;
  ack(): void;
  retry(options?: QueueRetryOptionsLike): void;
};

export type CloudflareUploadJobQueueBatchLike = {
  queue: string;
  messages: readonly CloudflareUploadJobQueueMessageLike[];
};

export type CloudflareUploadJobQueueDispatchOutcome = {
  messageId: string;
  jobName: CloudflareUploadJobQueueMessage["jobName"] | "unknown";
  idempotencyKey: string | null;
  attempts: number;
  action: "ack" | "retry";
  reason: "executed" | "duplicate" | "invalid-message" | "missing-secret" | "unmatched-cron" | "job-failed" | "exception";
  deadLetterExpected: boolean;
  retryDelaySeconds: number | null;
  executedCount: number;
  skippedCount: number;
  error: string | null;
};

export type CloudflareUploadJobQueueBatchSummary = {
  queue: string;
  messageCount: number;
  ackedCount: number;
  retriedCount: number;
  duplicateAckCount: number;
  invalidAckCount: number;
  deadLetterExpectedCount: number;
  outcomes: CloudflareUploadJobQueueDispatchOutcome[];
};

export type CloudflareUploadJobQueueEnqueueSummary = {
  cron: string;
  queueBindingPresent: boolean;
  enqueued: CloudflareUploadJobQueueMessage[];
  skipped: Array<{
    jobName: CloudflareUploadJobQueueMessage["jobName"] | "unknown";
    reason: "missing_queue_binding" | "unmatched_cron";
  }>;
};

function normalizeDate(value: Date) {
  return value.toISOString();
}

function buildIdempotencyKey(jobName: CloudflareUploadJobQueueMessage["jobName"], cron: string, enqueuedAt: Date) {
  const minute = normalizeDate(enqueuedAt).slice(0, 16);
  return `${jobName}:${cron}:${minute}`;
}

export function buildCloudflareUploadJobQueueMessages({
  cron,
  enqueuedAt = new Date(),
}: {
  cron: string;
  enqueuedAt?: Date;
}) {
  return CLOUDFLARE_SCHEDULED_UPLOAD_JOBS
    .filter((job) => job.cron === cron)
    .map((job): CloudflareUploadJobQueueMessage => ({
      version: 1,
      jobName: job.name,
      cron,
      enqueuedAt: normalizeDate(enqueuedAt),
      idempotencyKey: buildIdempotencyKey(job.name, cron, enqueuedAt),
      source: "cloudflare-cron",
    }));
}

export async function enqueueCloudflareScheduledUploadJobs({
  cron,
  env,
  enqueuedAt,
}: {
  cron: string;
  env: CloudflareUploadJobQueueEnv;
  enqueuedAt?: Date;
}): Promise<CloudflareUploadJobQueueEnqueueSummary> {
  const messages = buildCloudflareUploadJobQueueMessages({ cron, enqueuedAt });
  const queue = env.UPLOAD_JOBS_QUEUE;
  const summary: CloudflareUploadJobQueueEnqueueSummary = {
    cron,
    queueBindingPresent: Boolean(queue),
    enqueued: [],
    skipped: [],
  };

  if (messages.length === 0) {
    summary.skipped.push({ jobName: "unknown", reason: "unmatched_cron" });
    return summary;
  }

  if (!queue) {
    summary.skipped.push(
      ...messages.map((message) => ({ jobName: message.jobName, reason: "missing_queue_binding" as const })),
    );
    return summary;
  }

  await queue.sendBatch(messages.map((message) => ({ body: message, contentType: "json" as const })));
  summary.enqueued.push(...messages);
  return summary;
}

function isUploadJobQueueMessage(value: unknown): value is CloudflareUploadJobQueueMessage {
  if (!value || typeof value !== "object") return false;
  const candidate = value as Partial<CloudflareUploadJobQueueMessage>;
  return candidate.version === 1
    && (candidate.jobName === "upload-cleanup" || candidate.jobName === "upload-scan")
    && typeof candidate.cron === "string"
    && typeof candidate.enqueuedAt === "string"
    && typeof candidate.idempotencyKey === "string"
    && candidate.source === "cloudflare-cron";
}

function matchingJobExists(body: CloudflareUploadJobQueueMessage) {
  return CLOUDFLARE_SCHEDULED_UPLOAD_JOBS.some((job) => job.name === body.jobName && job.cron === body.cron);
}

function ackOutcome(
  message: CloudflareUploadJobQueueMessageLike,
  body: CloudflareUploadJobQueueMessage | null,
  reason: CloudflareUploadJobQueueDispatchOutcome["reason"],
  executedCount = 0,
  skippedCount = 0,
): CloudflareUploadJobQueueDispatchOutcome {
  message.ack();
  return {
    messageId: message.id,
    jobName: body?.jobName ?? "unknown",
    idempotencyKey: body?.idempotencyKey ?? null,
    attempts: message.attempts,
    action: "ack",
    reason,
    deadLetterExpected: false,
    retryDelaySeconds: null,
    executedCount,
    skippedCount,
    error: null,
  };
}

function retryOutcome(
  message: CloudflareUploadJobQueueMessageLike,
  body: CloudflareUploadJobQueueMessage,
  reason: "job-failed" | "exception",
  error: string | null,
  executedCount = 0,
  skippedCount = 0,
): CloudflareUploadJobQueueDispatchOutcome {
  message.retry({ delaySeconds: CLOUDFLARE_UPLOAD_JOBS_RETRY_DELAY_SECONDS });
  return {
    messageId: message.id,
    jobName: body.jobName,
    idempotencyKey: body.idempotencyKey,
    attempts: message.attempts,
    action: "retry",
    reason,
    deadLetterExpected: message.attempts >= CLOUDFLARE_UPLOAD_JOBS_MAX_RETRIES,
    retryDelaySeconds: CLOUDFLARE_UPLOAD_JOBS_RETRY_DELAY_SECONDS,
    executedCount,
    skippedCount,
    error,
  };
}

export async function runCloudflareUploadJobQueueBatch({
  batch,
  env,
  fetcher,
}: {
  batch: CloudflareUploadJobQueueBatchLike;
  env: CloudflareUploadJobQueueEnv;
  fetcher: CloudflareScheduledUploadJobFetch;
}): Promise<CloudflareUploadJobQueueBatchSummary> {
  const seenIdempotencyKeys = new Set<string>();
  const outcomes: CloudflareUploadJobQueueDispatchOutcome[] = [];

  for (const message of batch.messages) {
    if (!isUploadJobQueueMessage(message.body)) {
      outcomes.push(ackOutcome(message, null, "invalid-message"));
      continue;
    }

    const body = message.body;
    if (seenIdempotencyKeys.has(body.idempotencyKey)) {
      outcomes.push(ackOutcome(message, body, "duplicate"));
      continue;
    }
    seenIdempotencyKeys.add(body.idempotencyKey);

    if (!matchingJobExists(body)) {
      outcomes.push(ackOutcome(message, body, "unmatched-cron"));
      continue;
    }

    try {
      const summary = await runCloudflareScheduledUploadJobs({ cron: body.cron, env, fetcher });
      const executedCount = summary.executed.length;
      const skippedCount = summary.skipped.length;
      const matchingExecution = summary.executed.find((job) => job.name === body.jobName);

      if (matchingExecution?.ok === true) {
        outcomes.push(ackOutcome(message, body, "executed", executedCount, skippedCount));
        continue;
      }

      if (matchingExecution && matchingExecution.ok === false) {
        outcomes.push(retryOutcome(message, body, "job-failed", null, executedCount, skippedCount));
        continue;
      }

      outcomes.push(ackOutcome(
        message,
        body,
        summary.skipped.some((job) => job.reason === "missing_secret") ? "missing-secret" : "unmatched-cron",
        executedCount,
        skippedCount,
      ));
    } catch (error) {
      outcomes.push(retryOutcome(
        message,
        body,
        "exception",
        error instanceof Error ? error.message : String(error),
      ));
    }
  }

  return {
    queue: batch.queue,
    messageCount: batch.messages.length,
    ackedCount: outcomes.filter((outcome) => outcome.action === "ack").length,
    retriedCount: outcomes.filter((outcome) => outcome.action === "retry").length,
    duplicateAckCount: outcomes.filter((outcome) => outcome.reason === "duplicate").length,
    invalidAckCount: outcomes.filter((outcome) => outcome.reason === "invalid-message").length,
    deadLetterExpectedCount: outcomes.filter((outcome) => outcome.deadLetterExpected).length,
    outcomes,
  };
}
