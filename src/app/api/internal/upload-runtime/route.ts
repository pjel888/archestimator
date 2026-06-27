import { NextResponse } from "next/server";

import { createSupabaseServiceRoleClient } from "@/lib/supabase/service-role";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_BODY_PROBE_BYTES = 4 * 1024 * 1024;
const STORAGE_PROBE_BUCKET = "component-attachments";
const NO_STORE_HEADERS = {
  "Cache-Control": "private, no-cache, no-store, max-age=0, must-revalidate",
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
    vercel: process.env.VERCEL === "1",
    vercelEnvPresent: Boolean(process.env.VERCEL_ENV),
    vercelRegionPresent: Boolean(process.env.VERCEL_REGION),
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
  const serviceRole = createSupabaseServiceRoleClient("archestimator-upload-runtime-proof");
  const startedAt = performance.now();

  try {
    const result = await serviceRole.storage.getBucket(STORAGE_PROBE_BUCKET);
    return {
      status: result.error ? "failed" : "ok",
      durationMs: round(performance.now() - startedAt),
      bucketReachable: !result.error,
      bucketPublic: result.data?.public ?? null,
      errorName: result.error?.name ?? null,
      statusCode: result.error?.statusCode ?? null,
    };
  } catch (error) {
    return {
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
