import type { StorageCleanupReport, StorageCleanupTarget } from "@/lib/mass-deletion/bulk-action";

import type { UploadSurface } from "./policy";

const PROJECT_IMAGE_BUCKET = "project-images";
const COMPONENT_IMAGE_BUCKET = "component-images";
const COMPONENT_ATTACHMENT_BUCKET = "component-attachments";
const ATTACHMENT_EXTENSIONS = [".pdf", ".xls", ".xlsx"] as const;

export type UploadCleanupRecord = {
  assetId: string;
  uploadSessionId?: string | null;
  workspaceId: string;
  surface: UploadSurface;
  bucket: string;
  path: string;
  thumbnailPath?: string | null;
  status: string;
  scanStatus?: string | null;
  expiresAt?: string | Date | null;
};

export type UploadCleanupReason = "failed_record" | "expired_record" | "deleted_record";

export type UploadCleanupCandidate = {
  assetId: string;
  uploadSessionId: string | null;
  workspaceId: string;
  target: StorageCleanupTarget;
  reason: UploadCleanupReason;
};

export type UploadCleanupRejectedRecord = {
  assetId: string;
  bucket: string;
  path: string;
  reason: "not_cleanup_eligible" | "unsafe_path";
};

export type UploadCleanupPlan = {
  candidates: UploadCleanupCandidate[];
  rejected: UploadCleanupRejectedRecord[];
};

export type UploadCleanupMetrics = {
  candidateCount: number;
  removedCount: number;
  failedCount: number;
  rejectedCount: number;
  failedBuckets: string[];
};

export type UploadRetentionPolicy = {
  failedAssetRetentionDays: number;
  deletedAssetRetentionDays: number;
  expiredSessionRetentionDays: number;
  auditEventRetentionDays: number;
};

export type UploadCleanupOperationalSnapshot = {
  status: "healthy" | "attention" | "blocked";
  retryAfterSeconds: number | null;
  retentionCutoffs: {
    failedAssetsBefore: string;
    deletedAssetsBefore: string;
    expiredSessionsBefore: string;
    auditEventsBefore: string;
  };
  dashboardMetrics: {
    cleanupCandidates: number;
    cleanupRemoved: number;
    cleanupFailed: number;
    cleanupRejected: number;
    failedBucketCount: number;
  };
  alerts: Array<{
    code: "cleanup_failures" | "cleanup_rejections" | "cleanup_backlog";
    severity: "warning" | "critical";
    message: string;
  }>;
};

export const DEFAULT_UPLOAD_RETENTION_POLICY: UploadRetentionPolicy = {
  failedAssetRetentionDays: 7,
  deletedAssetRetentionDays: 30,
  expiredSessionRetentionDays: 1,
  auditEventRetentionDays: 365,
};

const CLEANUP_RETRY_AFTER_SECONDS = 300;
const CLEANUP_BACKLOG_WARNING_THRESHOLD = 250;
const CLEANUP_BACKLOG_CRITICAL_THRESHOLD = 500;

function isSafeStoragePath(path: string) {
  return Boolean(path && path.trim() === path && !path.startsWith("/") && !path.includes("..") && !path.includes("//") && !path.includes("\\"));
}

function workspacePrefixMatches(path: string, workspaceId: string) {
  return path.split("/")[0] === workspaceId;
}

function isExpired(record: UploadCleanupRecord, now: Date) {
  if (!record.expiresAt) return false;
  const expiresAt = record.expiresAt instanceof Date ? record.expiresAt : new Date(record.expiresAt);
  return Number.isFinite(expiresAt.getTime()) && expiresAt.getTime() <= now.getTime();
}

function cleanupReasonFor(record: UploadCleanupRecord, now: Date): UploadCleanupReason | null {
  if (record.status === "failed") return "failed_record";
  if (record.status === "deleted") return "deleted_record";
  if (record.status === "expired" || (record.status === "reserved" && isExpired(record, now))) return "expired_record";
  return null;
}

function isAllowedUploadCleanupTarget(record: UploadCleanupRecord, target: StorageCleanupTarget) {
  if (!isSafeStoragePath(target.path) || !workspacePrefixMatches(target.path, record.workspaceId)) return false;

  if (record.surface === "project-image") {
    return target.bucket === PROJECT_IMAGE_BUCKET
      && record.bucket === PROJECT_IMAGE_BUCKET
      && target.path.endsWith(".webp")
      && target.path.includes("/project-images/");
  }

  if (record.surface === "component-image") {
    return target.bucket === COMPONENT_IMAGE_BUCKET
      && record.bucket === COMPONENT_IMAGE_BUCKET
      && target.path.endsWith(".webp");
  }

  return target.bucket === COMPONENT_ATTACHMENT_BUCKET
    && record.bucket === COMPONENT_ATTACHMENT_BUCKET
    && ATTACHMENT_EXTENSIONS.some((extension) => target.path.endsWith(extension));
}

function cleanupTargetsFor(record: UploadCleanupRecord) {
  const targets: StorageCleanupTarget[] = [{ bucket: record.bucket, path: record.path }];
  if (record.thumbnailPath) targets.push({ bucket: record.bucket, path: record.thumbnailPath });
  return targets;
}

export function planUploadStorageCleanup(
  records: readonly UploadCleanupRecord[],
  options: {
    now?: Date;
    limit?: number;
  } = {},
): UploadCleanupPlan {
  const now = options.now ?? new Date();
  const limit = options.limit ?? 500;
  const candidates: UploadCleanupCandidate[] = [];
  const rejected: UploadCleanupRejectedRecord[] = [];
  const seen = new Set<string>();

  for (const record of records) {
    if (candidates.length >= limit) break;

    const reason = cleanupReasonFor(record, now);
    if (!reason) {
      rejected.push({
        assetId: record.assetId,
        bucket: record.bucket,
        path: record.path,
        reason: "not_cleanup_eligible",
      });
      continue;
    }

    for (const target of cleanupTargetsFor(record)) {
      if (candidates.length >= limit) break;
      const key = `${target.bucket}:${target.path}`;
      if (seen.has(key)) continue;
      seen.add(key);

      if (!isAllowedUploadCleanupTarget(record, target)) {
        rejected.push({
          assetId: record.assetId,
          bucket: target.bucket,
          path: target.path,
          reason: "unsafe_path",
        });
        continue;
      }

      candidates.push({
        assetId: record.assetId,
        uploadSessionId: record.uploadSessionId ?? null,
        workspaceId: record.workspaceId,
        target,
        reason,
      });
    }
  }

  return { candidates, rejected };
}

export function summarizeUploadCleanup(plan: UploadCleanupPlan, report: StorageCleanupReport): UploadCleanupMetrics {
  return {
    candidateCount: plan.candidates.length,
    removedCount: report.removed.length,
    failedCount: report.failed.length,
    rejectedCount: plan.rejected.length + report.rejected.length,
    failedBuckets: [...new Set(report.failed.map((failure) => failure.bucket))].sort(),
  };
}

function daysBefore(now: Date, days: number) {
  return new Date(now.getTime() - days * 24 * 60 * 60 * 1000).toISOString();
}

export function buildUploadRetentionCutoffs(
  now: Date,
  policy: UploadRetentionPolicy = DEFAULT_UPLOAD_RETENTION_POLICY,
) {
  return {
    failedAssetsBefore: daysBefore(now, policy.failedAssetRetentionDays),
    deletedAssetsBefore: daysBefore(now, policy.deletedAssetRetentionDays),
    expiredSessionsBefore: daysBefore(now, policy.expiredSessionRetentionDays),
    auditEventsBefore: daysBefore(now, policy.auditEventRetentionDays),
  };
}

export function buildUploadCleanupOperationalSnapshot(
  plan: UploadCleanupPlan,
  metrics: UploadCleanupMetrics,
  options: {
    now?: Date;
    retentionPolicy?: UploadRetentionPolicy;
    backlogWarningThreshold?: number;
    backlogCriticalThreshold?: number;
  } = {},
): UploadCleanupOperationalSnapshot {
  const warningThreshold = options.backlogWarningThreshold ?? CLEANUP_BACKLOG_WARNING_THRESHOLD;
  const criticalThreshold = options.backlogCriticalThreshold ?? CLEANUP_BACKLOG_CRITICAL_THRESHOLD;
  const alerts: UploadCleanupOperationalSnapshot["alerts"] = [];

  if (metrics.failedCount > 0) {
    alerts.push({
      code: "cleanup_failures",
      severity: "critical",
      message: "Storage cleanup failed and must be retried before claiming production cleanup health.",
    });
  }

  if (metrics.rejectedCount > 0) {
    alerts.push({
      code: "cleanup_rejections",
      severity: "warning",
      message: "Storage cleanup rejected unsafe or ineligible records; investigation history must be preserved.",
    });
  }

  if (plan.candidates.length >= criticalThreshold) {
    alerts.push({
      code: "cleanup_backlog",
      severity: "critical",
      message: "Storage cleanup backlog is at or above the critical threshold.",
    });
  } else if (plan.candidates.length >= warningThreshold) {
    alerts.push({
      code: "cleanup_backlog",
      severity: "warning",
      message: "Storage cleanup backlog is above the warning threshold.",
    });
  }

  const status = alerts.some((alert) => alert.severity === "critical")
    ? "blocked"
    : alerts.length > 0 ? "attention" : "healthy";

  return {
    status,
    retryAfterSeconds: metrics.failedCount > 0 ? CLEANUP_RETRY_AFTER_SECONDS : null,
    retentionCutoffs: buildUploadRetentionCutoffs(options.now ?? new Date(), options.retentionPolicy),
    dashboardMetrics: {
      cleanupCandidates: metrics.candidateCount,
      cleanupRemoved: metrics.removedCount,
      cleanupFailed: metrics.failedCount,
      cleanupRejected: metrics.rejectedCount,
      failedBucketCount: metrics.failedBuckets.length,
    },
    alerts,
  };
}
