import { CLOUDFLARE_UPLOAD_CLEANUP_CRON } from "./scheduled-upload-jobs";
import {
  CLOUDFLARE_UPLOAD_JOBS_PROVIDER_PROOF_PREFIX,
  CLOUDFLARE_UPLOAD_JOBS_QUEUE_NAME,
  type CloudflareUploadJobQueueMessage,
} from "./upload-job-queue";

type QueueSendRequest = {
  body: CloudflareUploadJobQueueMessage;
  contentType: "json";
};

type QueueBindingLike = {
  sendBatch(messages: Iterable<QueueSendRequest>): Promise<unknown> | unknown;
};

type R2ObjectLike = {
  arrayBuffer(): Promise<ArrayBuffer>;
};

type R2BucketLike = {
  get(key: string): Promise<R2ObjectLike | null>;
};

export type CloudflareJobsProofEnv = {
  ARCH_UPLOADS_R2?: R2BucketLike;
  CRON_SECRET?: string;
  UPLOAD_JOBS_QUEUE?: QueueBindingLike;
};

const JOBS_PROOF_PATH = "/__cloudflare/jobs-proof";
const POLL_INTERVAL_MS = 750;
const POST_POLL_ATTEMPTS = 24;

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body, null, 2), {
    status,
    headers: {
      "cache-control": "no-store",
      "content-type": "application/json; charset=utf-8",
    },
  });
}

function normalizeSecret(value: string | undefined) {
  return value?.trim() || undefined;
}

function isAuthorized(request: Request, env: CloudflareJobsProofEnv) {
  const secret = normalizeSecret(env.CRON_SECRET);
  if (!secret) return "missing-secret";
  return request.headers.get("authorization") === `Bearer ${secret}` ? "authorized" : "unauthorized";
}

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function receiptKey(proofId: string) {
  return `${CLOUDFLARE_UPLOAD_JOBS_PROVIDER_PROOF_PREFIX}/${proofId}.json`;
}

async function readReceipt(env: CloudflareJobsProofEnv, proofId: string) {
  if (!env.ARCH_UPLOADS_R2) return null;
  const object = await env.ARCH_UPLOADS_R2.get(receiptKey(proofId));
  if (!object) return null;
  const text = new TextDecoder().decode(await object.arrayBuffer());
  return JSON.parse(text) as {
    readiness?: {
      queueConsumerReceiptReady?: boolean;
      cronProviderExecutionProven?: boolean;
      productionJobsMessagingReady?: boolean;
    };
    outcome?: {
      action?: string;
      reason?: string;
      attempts?: number;
      deadLetterExpected?: boolean;
      executedCount?: number;
      skippedCount?: number;
      error?: string | null;
    };
  };
}

async function pollReceipt(env: CloudflareJobsProofEnv, proofId: string, attempts: number) {
  for (let attempt = 0; attempt < attempts; attempt += 1) {
    const receipt = await readReceipt(env, proofId);
    if (receipt) return receipt;
    await delay(POLL_INTERVAL_MS);
  }
  return null;
}

function buildProofMessage(proofId: string, requestedAt: string): CloudflareUploadJobQueueMessage {
  return {
    version: 1,
    jobName: "upload-cleanup",
    cron: CLOUDFLARE_UPLOAD_CLEANUP_CRON,
    enqueuedAt: requestedAt,
    idempotencyKey: `provider-proof:${proofId}`,
    source: "cloudflare-cron",
    providerProof: {
      id: proofId,
      requestedAt,
      kind: "cloudflare-jobs-runtime-proof",
    },
  };
}

function resultBody({
  proofId,
  queueSendReady,
  receipt,
}: {
  proofId: string;
  queueSendReady: boolean;
  receipt: Awaited<ReturnType<typeof readReceipt>>;
}) {
  const queueConsumerReceiptReady = receipt?.readiness?.queueConsumerReceiptReady === true;
  const cronProviderExecutionProven = receipt?.readiness?.cronProviderExecutionProven === true;
  const productionJobsMessagingReady = queueSendReady
    && queueConsumerReceiptReady
    && cronProviderExecutionProven
    && receipt?.readiness?.productionJobsMessagingReady === true;
  const blockers: string[] = [];

  if (!queueSendReady) blockers.push("Cloudflare Queue provider send did not pass.");
  if (!queueConsumerReceiptReady) blockers.push("Cloudflare Queue consumer receipt was not observed in R2.");
  if (!cronProviderExecutionProven) blockers.push("Cloudflare scheduled upload job dry-run execution was not provider-proven.");

  return {
    generatedAt: new Date().toISOString(),
    mode: "cloudflare-jobs-runtime-proof",
    endpointProofScope: "queue-send-consumer-r2-receipt",
    providerBacked: true,
    proofId,
    queue: CLOUDFLARE_UPLOAD_JOBS_QUEUE_NAME,
    proofReceiptKey: receiptKey(proofId),
    result: {
      queueSendReady,
      queueConsumerReceiptReady,
      cronProviderExecutionProven,
      consumerOutcome: receipt?.outcome ?? null,
    },
    readiness: {
      providerBacked: true,
      queueSendReady,
      queueConsumerReceiptReady,
      cronProviderExecutionProven,
      productionJobsMessagingReady,
    },
    blockers,
    note: "Protected Cloudflare jobs proof. It sends one dry-run upload-cleanup proof message through the real Queue binding and reads a sanitized consumer receipt from R2. It does not print secrets, change DNS, delete provider resources, or disable the Vercel fallback.",
  };
}

async function handlePost(env: CloudflareJobsProofEnv) {
  const proofId = crypto.randomUUID();
  const requestedAt = new Date().toISOString();
  const queue = env.UPLOAD_JOBS_QUEUE;

  if (!queue || !env.ARCH_UPLOADS_R2) {
    return jsonResponse({
      generatedAt: requestedAt,
      mode: "cloudflare-jobs-runtime-proof",
      providerBacked: true,
      proofId,
      result: {
        queueBindingPresent: Boolean(queue),
        r2BindingPresent: Boolean(env.ARCH_UPLOADS_R2),
        queueSendReady: false,
        queueConsumerReceiptReady: false,
        cronProviderExecutionProven: false,
      },
      readiness: {
        providerBacked: true,
        queueSendReady: false,
        queueConsumerReceiptReady: false,
        cronProviderExecutionProven: false,
        productionJobsMessagingReady: false,
      },
      blockers: [
        queue ? null : "UPLOAD_JOBS_QUEUE binding is missing.",
        env.ARCH_UPLOADS_R2 ? null : "ARCH_UPLOADS_R2 binding is missing.",
      ].filter(Boolean),
    }, 503);
  }

  await queue.sendBatch([{ body: buildProofMessage(proofId, requestedAt), contentType: "json" }]);
  const receipt = await pollReceipt(env, proofId, POST_POLL_ATTEMPTS);
  const body = resultBody({ proofId, queueSendReady: true, receipt });
  return jsonResponse(body, body.readiness.productionJobsMessagingReady ? 200 : 202);
}

async function handleGet(request: Request, env: CloudflareJobsProofEnv) {
  const proofId = new URL(request.url).searchParams.get("id")?.trim();
  if (!proofId || !/^[a-zA-Z0-9-]{16,80}$/.test(proofId)) {
    return jsonResponse({ error: "Valid proof id is required." }, 400);
  }

  const receipt = await readReceipt(env, proofId);
  const body = resultBody({ proofId, queueSendReady: true, receipt });
  return jsonResponse(body, body.readiness.productionJobsMessagingReady ? 200 : 202);
}

export async function routeCloudflareJobsProofRequest(request: Request, env: CloudflareJobsProofEnv) {
  const url = new URL(request.url);
  if (url.pathname !== JOBS_PROOF_PATH) return null;

  const auth = isAuthorized(request, env);
  if (auth === "missing-secret") return jsonResponse({ error: "CRON_SECRET is not configured." }, 503);
  if (auth === "unauthorized") return jsonResponse({ error: "Unauthorized." }, 401);

  if (request.method === "POST") return handlePost(env);
  if (request.method === "GET") return handleGet(request, env);
  return jsonResponse({ error: "Method not allowed." }, 405);
}
