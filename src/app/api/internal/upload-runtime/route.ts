import { NextResponse } from "next/server";

import { readRuntimeUploadStorageProvider } from "@/lib/uploads/runtime-storage-provider";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_BODY_PROBE_BYTES = 4 * 1024 * 1024;
const STORAGE_PROBE_BUCKET = "component-attachments";
const CLOUDFLARE_R2_PROVIDER = "cloudflare-r2";
const NO_STORE_HEADERS = {
  "Cache-Control": "private, no-cache, no-store, max-age=0, must-revalidate",
};

type R2ProbeBucket = {
  list: (options?: { prefix?: string; limit?: number }) => Promise<unknown>;
};

type BodyProbe =
  | {
    contentLengthBytes: number | null;
    receivedBytes: number;
    maxProbeBodyBytes: number;
  }
  | null;

function round(value: number, precision = 2) {
  const factor = 10 ** precision;
  return Math.round(value * factor) / factor;
}

function jsonError(error: string, status: number) {
  return NextResponse.json({ error }, { status, headers: NO_STORE_HEADERS });
}

function jsonOk(body: Record<string, unknown>) {
  return NextResponse.json(body, { headers: NO_STORE_HEADERS });
}

function readRuntimeSecrets() {
  const configuredSecrets = [
    process.env.CRON_SECRET?.trim(),
    process.env.UPLOAD_RUNTIME_PROOF_SECRET?.trim(),
  ].filter((secret): secret is string => Boolean(secret));

  return Array.from(new Set(configuredSecrets));
}

function isAuthorized(request: Request, secrets: string[]) {
  const authHeader = request.headers.get("authorization");
  return secrets.some((secret) => authHeader === `Bearer ${secret}`);
}

function parseOptionalNumber(value: string | undefined) {
  if (!value?.trim()) return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function memorySnapshot() {
  const usage = process.memoryUsage();
  return {
    rssMb: round(usage.rss / 1024 / 1024),
    heapUsedMb: round(usage.heapUsed / 1024 / 1024),
    externalMb: round(usage.external / 1024 / 1024),
    arrayBuffersMb: round(usage.arrayBuffers / 1024 / 1024),
  };
}

function configuredRuntimeLimits() {
  return {
    memoryMb: parseOptionalNumber(process.env.ARCH_UPLOAD_HOSTED_MEMORY_MB),
    bodyLimitBytes: parseOptionalNumber(process.env.ARCH_UPLOAD_HOSTED_BODY_LIMIT_BYTES),
    routeDurationMs: parseOptionalNumber(process.env.ARCH_UPLOAD_HOSTED_ROUTE_DURATION_MS),
    expectedConcurrentUploads: parseOptionalNumber(process.env.ARCH_UPLOAD_HOSTED_CONCURRENT_UPLOADS),
    storageLatencyP95Ms: parseOptionalNumber(process.env.ARCH_UPLOAD_STORAGE_LATENCY_P95_MS),
  };
}

function deploymentSnapshot() {
  return {
    targetRuntime: "cloudflare-workers-open-next",
    nodeVersion: process.version,
  };
}

async function readBodyProbe(request: Request): Promise<BodyProbe | NextResponse> {
  if (request.method !== "POST") return null;

  const contentLengthHeader = request.headers.get("content-length");
  const contentLengthBytes = contentLengthHeader ? Number(contentLengthHeader) : null;
  if (contentLengthBytes && Number.isFinite(contentLengthBytes) && contentLengthBytes > MAX_BODY_PROBE_BYTES) {
    return jsonError("Upload runtime body probe is too large.", 413);
  }

  const body = await request.arrayBuffer();
  if (body.byteLength > MAX_BODY_PROBE_BYTES) {
    return jsonError("Upload runtime body probe is too large.", 413);
  }

  return {
    contentLengthBytes: Number.isFinite(contentLengthBytes) ? contentLengthBytes : null,
    receivedBytes: body.byteLength,
    maxProbeBodyBytes: MAX_BODY_PROBE_BYTES,
  };
}

async function measureStorageLatency() {
  const startedAt = performance.now();
  let provider: string;

  try {
    provider = readRuntimeUploadStorageProvider();
  } catch (error) {
    return {
      provider: "unsupported",
      status: "failed",
      durationMs: round(performance.now() - startedAt),
      bucketReachable: false,
      bucketPublic: null,
      errorName: error instanceof Error ? error.name : "Error",
      statusCode: null,
    };
  }

  if (provider !== CLOUDFLARE_R2_PROVIDER) {
    return {
      provider,
      status: "not_selected",
      durationMs: round(performance.now() - startedAt),
      bucketReachable: false,
      bucketPublic: null,
      errorName: null,
      statusCode: null,
    };
  }

  try {
    const { getCloudflareContext } = await import("@opennextjs/cloudflare");
    const { env } = await getCloudflareContext({ async: true });
    const r2 = (env as { ARCH_UPLOADS_R2?: R2ProbeBucket }).ARCH_UPLOADS_R2;
    if (!r2) {
      return {
        provider,
        status: "failed",
        durationMs: round(performance.now() - startedAt),
        bucketReachable: false,
        bucketPublic: null,
        errorName: "MissingR2Binding",
        statusCode: null,
      };
    }

    await r2.list({ prefix: `${STORAGE_PROBE_BUCKET}/`, limit: 1 });
    return {
      provider,
      status: "ok",
      durationMs: round(performance.now() - startedAt),
      bucketReachable: true,
      bucketPublic: null,
      errorName: null,
      statusCode: null,
    };
  } catch (error) {
    return {
      provider,
      status: "failed",
      durationMs: round(performance.now() - startedAt),
      bucketReachable: false,
      bucketPublic: null,
      errorName: error instanceof Error ? error.name : "Error",
      statusCode: null,
    };
  }
}

async function handleUploadRuntimeProof(request: Request) {
  const secrets = readRuntimeSecrets();
  if (secrets.length === 0) return jsonError("Upload runtime proof is not configured.", 503);
  if (!isAuthorized(request, secrets)) return jsonError("Unauthorized.", 401);

  const startedAt = performance.now();
  const memoryBefore = memorySnapshot();
  const bodyProbe = await readBodyProbe(request);
  if (bodyProbe instanceof NextResponse) return bodyProbe;

  const storageLatency = await measureStorageLatency();
  const memoryAfter = memorySnapshot();

  return jsonOk({
    mode: "dry-run",
    proofSurface: "upload-hosted-runtime",
    runtime: "nodejs",
    durationMs: round(performance.now() - startedAt),
    deployment: deploymentSnapshot(),
    configuredLimits: configuredRuntimeLimits(),
    bodyProbe,
    memory: {
      before: memoryBefore,
      after: memoryAfter,
      rssDeltaMb: round(memoryAfter.rssMb - memoryBefore.rssMb),
      heapUsedDeltaMb: round(memoryAfter.heapUsedMb - memoryBefore.heapUsedMb),
    },
    storageLatency,
    note: "Secret-gated upload runtime proof route. It is non-mutating and does not return provider paths, object keys, bearer secrets, or uploaded bytes.",
  });
}

export async function GET(request: Request) {
  return handleUploadRuntimeProof(request);
}

export async function POST(request: Request) {
  return handleUploadRuntimeProof(request);
}
