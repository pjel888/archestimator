import { NextResponse } from "next/server";

import { getCloudflareD1Database } from "@/lib/cloudflare/d1";
import { logAppError } from "@/lib/observability/logger";
import { authorizeBearerRequest } from "@/lib/security/bearer-auth";
import { createConfiguredUploadScannerProvider } from "@/lib/uploads/clamd-scanner";
import { createRuntimeUploadStorageProvider } from "@/lib/uploads/runtime-storage-provider";
import {
  createUploadScanStorageFromProvider,
  createUploadScanResultWriter,
  listUploadScanJobRecords,
  runUploadScanJob,
} from "@/lib/uploads/scan-job";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const DEFAULT_ROUTE_LIMIT = 100;
const MAX_ROUTE_LIMIT = 500;
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

function summarizeUploadScanDryRun(records: Awaited<ReturnType<typeof listUploadScanJobRecords>>, limit: number) {
  const selectedRecords = records.slice(0, limit);

  return {
    mode: "dry-run",
    readRecordCount: records.length,
    selectedRecordCount: selectedRecords.length,
    downloadableBuckets: [...new Set(selectedRecords.map((record) => record.bucket))].sort(),
    pendingCount: selectedRecords.filter((record) => record.scanStatus === "pending").length,
    retryableCount: selectedRecords.filter((record) => record.scanStatus === "failed_transient").length,
    totalBytes: selectedRecords.reduce((sum, record) => sum + record.sizeBytes, 0),
    scannedCount: 0,
    writeFailedCount: 0,
    downloadFailedCount: 0,
    scannerFailedCount: 0,
    outcomeCounts: {
      clean: 0,
      infected: 0,
      unsupported: 0,
      failed_transient: 0,
      failed_permanent: 0,
    },
  };
}

async function handleUploadScanJob(request: Request) {
  const authorization = authorizeBearerRequest(request, [
    process.env.CRON_SECRET,
    process.env.UPLOAD_SCAN_JOB_SECRET,
  ]);
  if (authorization.status === "missing-secret") return jsonError("Upload scan job is not configured.", 503);
  if (authorization.status === "invalid-secret") return jsonError("Unauthorized.", 401);

  try {
    const limit = readLimit(request);
    const dryRun = isDryRun(request);
    if (!dryRun && !areUploadJobsEnabled()) return jsonError("Upload scan job is disabled.", 503);

    const db = await getCloudflareD1Database();
    if (!db) return jsonError("Upload scan job database is not configured.", 503);

    const records = await listUploadScanJobRecords(db, { limit });
    if (dryRun) return jsonOk(summarizeUploadScanDryRun(records, limit));
    const storageProvider = await createRuntimeUploadStorageProvider();

    const result = await runUploadScanJob({
      records,
      limit,
      storage: createUploadScanStorageFromProvider(storageProvider),
      scanner: createConfiguredUploadScannerProvider(),
      resultWriter: createUploadScanResultWriter(db),
    });

    return jsonOk(result);
  } catch (error) {
    logAppError(error, {
      event: "upload_scan_job_error",
      action: "run_upload_scan_job",
      context: {
        route: "/api/internal/upload-scan",
        route_handler: `${request.method} /api/internal/upload-scan`,
      },
    });
    return jsonError("Upload scan job failed.", 500);
  }
}

export async function GET(request: Request) {
  return handleUploadScanJob(request);
}

export async function POST(request: Request) {
  return handleUploadScanJob(request);
}
