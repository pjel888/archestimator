import { NextResponse } from "next/server";

import { createSupabaseServiceRoleClient } from "@/lib/supabase/service-role";
import {
  buildUploadCleanupOperationalSnapshot,
  planUploadStorageCleanup,
  summarizeUploadCleanup,
} from "@/lib/uploads/cleanup";
import {
  createSupabaseUploadCleanupStorage,
  createUploadCleanupEventWriter,
  listUploadCleanupJobRecords,
  runUploadCleanupJob,
  summarizeUploadCleanupJobResult,
} from "@/lib/uploads/cleanup-job";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const DEFAULT_ROUTE_LIMIT = 100;
const MAX_ROUTE_LIMIT = 1_000;
const NO_STORE_HEADERS = {
  "Cache-Control": "private, no-cache, no-store, max-age=0, must-revalidate",
};

function jsonError(error: string, status: number) {
  return NextResponse.json({ error }, { status, headers: NO_STORE_HEADERS });
}

function jsonOk(body: Record<string, unknown>) {
  return NextResponse.json(body, { headers: NO_STORE_HEADERS });
}

function readCleanupSecrets() {
  const configuredSecrets = [
    process.env.CRON_SECRET?.trim(),
    process.env.UPLOAD_CLEANUP_JOB_SECRET?.trim(),
  ].filter((secret): secret is string => Boolean(secret));

  return Array.from(new Set(configuredSecrets));
}

function isAuthorized(request: Request, secrets: string[]) {
  const authHeader = request.headers.get("authorization");
  return secrets.some((secret) => authHeader === `Bearer ${secret}`);
}

function readLimit(request: Request) {
  const url = new URL(request.url);
  const parsed = Number(url.searchParams.get("limit") ?? DEFAULT_ROUTE_LIMIT);
  if (!Number.isFinite(parsed)) return DEFAULT_ROUTE_LIMIT;
  return Math.min(MAX_ROUTE_LIMIT, Math.max(1, Math.trunc(parsed)));
}

function isDryRun(request: Request) {
  const url = new URL(request.url);
  const value = url.searchParams.get("dryRun")?.trim().toLowerCase();
  return value === "1" || value === "true";
}

function summarizeRejectedReasons(rejected: Array<{ reason: string }>) {
  return rejected.reduce<Record<string, number>>((accumulator, item) => {
    accumulator[item.reason] = (accumulator[item.reason] ?? 0) + 1;
    return accumulator;
  }, {});
}

function summarizeUploadCleanupDryRun(records: Awaited<ReturnType<typeof listUploadCleanupJobRecords>>, limit: number) {
  const plan = planUploadStorageCleanup(records, { limit });
  const metrics = summarizeUploadCleanup(plan, { removed: [], failed: [], rejected: [] });
  const operationalSnapshot = buildUploadCleanupOperationalSnapshot(plan, metrics);

  return {
    mode: "dry-run",
    readRecordCount: records.length,
    planner: {
      candidateCount: plan.candidates.length,
      rejectedCount: plan.rejected.length,
      rejectedReasons: summarizeRejectedReasons(plan.rejected),
      candidateBuckets: [...new Set(plan.candidates.map((candidate) => candidate.target.bucket))].sort(),
    },
    storage: {
      removedCount: 0,
      failedCount: 0,
      rejectedCount: plan.rejected.length,
      failedBuckets: [],
    },
    audit: {
      queuedCount: 0,
      succeededCount: 0,
      failedCount: 0,
      writeFailureCount: 0,
      eventTypes: {
        cleanup_queued: 0,
        cleanup_failed: 0,
        cleanup_succeeded: 0,
      },
    },
    operationalSnapshot,
  };
}

async function handleUploadCleanupJob(request: Request) {
  const secrets = readCleanupSecrets();
  if (secrets.length === 0) return jsonError("Upload cleanup job is not configured.", 503);
  if (!isAuthorized(request, secrets)) return jsonError("Unauthorized.", 401);

  try {
    const limit = readLimit(request);
    const serviceRole = createSupabaseServiceRoleClient("archestimator-upload-cleanup-job");
    const records = await listUploadCleanupJobRecords(serviceRole, { limit });
    if (isDryRun(request)) return jsonOk(summarizeUploadCleanupDryRun(records, limit));

    const result = await runUploadCleanupJob({
      records,
      limit,
      storage: createSupabaseUploadCleanupStorage(serviceRole),
      eventWriter: createUploadCleanupEventWriter(serviceRole),
    });

    return jsonOk(summarizeUploadCleanupJobResult(result));
  } catch (error) {
    console.error("Upload cleanup job failed", error);
    return jsonError("Upload cleanup job failed.", 500);
  }
}

export async function GET(request: Request) {
  return handleUploadCleanupJob(request);
}

export async function POST(request: Request) {
  return handleUploadCleanupJob(request);
}
