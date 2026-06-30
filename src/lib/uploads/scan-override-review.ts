import "server-only";

import { requireCurrentUserContext } from "@/lib/auth/session";
import { getCloudflareD1Database } from "@/lib/cloudflare/d1";
import { canApproveUploadScanOverride } from "@/lib/uploads/scan-override";

export const UPLOAD_SCAN_OVERRIDE_REVIEW_STATUSES = ["failed_permanent", "unsupported"] as const;

export type UploadScanOverrideReviewStatus = typeof UPLOAD_SCAN_OVERRIDE_REVIEW_STATUSES[number];

export type UploadScanOverrideReviewRow = {
  id: string;
  checksumSha256: string | null;
  contentType: string;
  createdAt: string;
  fileName: string;
  scanProvider: string | null;
  scanStatus: UploadScanOverrideReviewStatus;
  scannedAt: string | null;
  sizeBytes: number;
  updatedAt: string;
  workspaceId: string;
};

export type UploadScanOverrideReviewQueue = {
  authorized: boolean;
  error: string | null;
  rows: UploadScanOverrideReviewRow[];
};

type UploadScanOverrideAssetRow = {
  id: string;
  workspace_id: string;
  file_name: string;
  content_type: string;
  size_bytes: number;
  checksum_sha256: string | null;
  scan_status: string;
  scan_provider: string | null;
  scanned_at: string | null;
  created_at: string;
  updated_at: string;
};

const SHA256_RE = /^[a-f0-9]{64}$/i;
const DEFAULT_SCAN_OVERRIDE_QUEUE_LIMIT = 50;

export function isUploadScanOverrideReviewStatus(value: string | null | undefined): value is UploadScanOverrideReviewStatus {
  return value === "failed_permanent" || value === "unsupported";
}

function normalizeLimit(limit: number | undefined) {
  if (!Number.isFinite(limit ?? DEFAULT_SCAN_OVERRIDE_QUEUE_LIMIT)) return DEFAULT_SCAN_OVERRIDE_QUEUE_LIMIT;
  return Math.min(100, Math.max(1, Math.trunc(limit ?? DEFAULT_SCAN_OVERRIDE_QUEUE_LIMIT)));
}

function normalizeRow(row: UploadScanOverrideAssetRow): UploadScanOverrideReviewRow | null {
  if (!isUploadScanOverrideReviewStatus(row.scan_status)) return null;
  const checksumSha256 = typeof row.checksum_sha256 === "string" && SHA256_RE.test(row.checksum_sha256)
    ? row.checksum_sha256.toLowerCase()
    : null;

  return {
    id: row.id,
    checksumSha256,
    contentType: row.content_type,
    createdAt: row.created_at,
    fileName: row.file_name,
    scanProvider: row.scan_provider,
    scanStatus: row.scan_status,
    scannedAt: row.scanned_at,
    sizeBytes: row.size_bytes,
    updatedAt: row.updated_at,
    workspaceId: row.workspace_id,
  };
}

export async function readUploadScanOverrideReviewQueue(
  status?: string,
  options: { limit?: number } = {},
): Promise<UploadScanOverrideReviewQueue> {
  const context = await requireCurrentUserContext();
  if (!canApproveUploadScanOverride(context.role)) {
    return { authorized: false, error: null, rows: [] };
  }

  const db = await getCloudflareD1Database();
  if (!db) {
    return { authorized: true, error: "Upload scan overrides could not be loaded.", rows: [] };
  }

  try {
    const statusFilter = isUploadScanOverrideReviewStatus(status)
      ? "scan_status = ?"
      : `scan_status IN (${UPLOAD_SCAN_OVERRIDE_REVIEW_STATUSES.map(() => "?").join(", ")})`;
    const statusValues = isUploadScanOverrideReviewStatus(status)
      ? [status]
      : [...UPLOAD_SCAN_OVERRIDE_REVIEW_STATUSES];
    const { results } = await db
      .prepare<UploadScanOverrideAssetRow>(
        `
          SELECT
            id,
            workspace_id,
            file_name,
            content_type,
            size_bytes,
            checksum_sha256,
            scan_status,
            scan_provider,
            scanned_at,
            created_at,
            updated_at
          FROM upload_assets
          WHERE surface = ?
            AND status = ?
            AND ${statusFilter}
          ORDER BY created_at DESC
          LIMIT ?
        `,
      )
      .bind("component-attachment", "finalized", ...statusValues, normalizeLimit(options.limit))
      .all<UploadScanOverrideAssetRow>();

    return {
      authorized: true,
      error: null,
      rows: (results ?? [])
        .map(normalizeRow)
        .filter((row): row is UploadScanOverrideReviewRow => Boolean(row)),
    };
  } catch {
    return { authorized: true, error: "Upload scan overrides could not be loaded.", rows: [] };
  }
}
