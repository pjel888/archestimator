import { NextResponse } from "next/server";

import { getCloudflareD1Database } from "@/lib/cloudflare/d1";
import { expireProjectComponentAttachmentRetentionHolds } from "@/lib/estimates/project-component-attachment-retention";
import { logAppError } from "@/lib/observability/logger";
import { authorizeBearerRequest } from "@/lib/security/bearer-auth";
import {
  buildUploadCleanupOperationalSnapshot,
  planUploadStorageCleanup,
  summarizeUploadCleanup,
} from "@/lib/uploads/cleanup";
import {
  createUploadCleanupCoordinator,
  createUploadCleanupStorageFromProvider,
  createUploadCleanupEventWriter,
  listUploadCleanupJobRecords,
  runUploadCleanupJob,
  summarizeUploadCleanupJobResult,
} from "@/lib/uploads/cleanup-job";
import { createRuntimeUploadStorageProvider } from "@/lib/uploads/runtime-storage-provider";
import { reconcileSupportPrivacyCleanup } from "@/lib/compliance/support-privacy-fulfillment";

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

function areUploadJobsEnabled() {
  return process.env.UPLOAD_JOBS_ENABLED?.trim() === "1";
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
  const authorization = authorizeBearerRequest(request, [
    process.env.CRON_SECRET,
    process.env.UPLOAD_CLEANUP_JOB_SECRET,
  ]);
  if (authorization.status === "missing-secret") return jsonError("Upload cleanup job is not configured.", 503);
  if (authorization.status === "invalid-secret") return jsonError("Unauthorized.", 401);

  try {
    const limit = readLimit(request);
    const dryRun = isDryRun(request);
    if (!dryRun && !areUploadJobsEnabled()) return jsonError("Upload cleanup job is disabled.", 503);

    const db = await getCloudflareD1Database();
    if (!db) return jsonError("Upload cleanup job database is not configured.", 503);

    const supportPrivacy = await reconcileSupportPrivacyCleanup({
      database: db,
      limit,
      dryRun,
    });

    if (!dryRun) await expireProjectComponentAttachmentRetentionHolds(db, { limit });
    const records = await listUploadCleanupJobRecords(db, { limit });
    if (dryRun) return jsonOk({ ...summarizeUploadCleanupDryRun(records, limit), supportPrivacy });
    const storageProvider = await createRuntimeUploadStorageProvider();

    const result = await runUploadCleanupJob({
      records,
      limit,
      storage: createUploadCleanupStorageFromProvider(storageProvider),
      eventWriter: createUploadCleanupEventWriter(db),
      coordinator: createUploadCleanupCoordinator(db),
    });

    return jsonOk({ ...summarizeUploadCleanupJobResult(result), supportPrivacy });
  } catch (error) {
    logAppError(error, {
      event: "upload_cleanup_job_error",
      action: "run_upload_cleanup_job",
      context: {
        route: "/api/internal/upload-cleanup",
        route_handler: `${request.method} /api/internal/upload-cleanup`,
      },
    });
    return jsonError("Upload cleanup job failed.", 500);
  }
}

export async function GET(request: Request) {
  return handleUploadCleanupJob(request);
}

export async function POST(request: Request) {
  return handleUploadCleanupJob(request);
}
