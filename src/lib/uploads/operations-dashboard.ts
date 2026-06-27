import "server-only";

import { requireCurrentUserContext } from "@/lib/auth/session";
import { createSupabaseServiceRoleClient } from "@/lib/supabase/service-role";
import {
  buildUploadRetentionCutoffs,
  DEFAULT_UPLOAD_RETENTION_POLICY,
} from "@/lib/uploads/cleanup";
import { canApproveUploadScanOverride } from "@/lib/uploads/scan-override";

import type { UploadSurface } from "./policy";

const UPLOAD_SURFACES = ["project-image", "component-image", "component-attachment"] as const;
const SCAN_QUEUE_STATUSES = ["pending", "failed_transient"] as const;
const BLOCKED_SCAN_STATUSES = ["infected", "unsupported", "failed_permanent"] as const;
const DEFAULT_WINDOW_HOURS = 24;
const DEFAULT_ROW_LIMIT = 500;

type UploadOperationsReadError = {
  message?: string | null;
};

type UploadOperationsQueryResult<T> = {
  data: T[] | null;
  error: UploadOperationsReadError | null;
};

type UploadOperationsSelectQuery<T> = PromiseLike<UploadOperationsQueryResult<T>> & {
  select: (columns: string) => UploadOperationsSelectQuery<T>;
  gte: (column: string, value: unknown) => UploadOperationsSelectQuery<T>;
  order: (column: string, options?: { ascending?: boolean }) => UploadOperationsSelectQuery<T>;
  limit: (count: number) => UploadOperationsSelectQuery<T>;
};

type UploadOperationsReadClient = {
  from: (table: "upload_assets" | "upload_sessions" | "upload_events") => UploadOperationsSelectQuery<unknown>;
};

type UploadOperationsAssetRow = {
  workspace_id: string;
  surface: string;
  content_type: string | null;
  size_bytes: number | string | null;
  status: string;
  scan_status: string | null;
  scan_provider: string | null;
  created_at: string;
  updated_at: string;
};

type UploadOperationsSessionRow = {
  workspace_id: string;
  surface: string;
  content_type: string | null;
  size_bytes: number | string | null;
  status: string;
  created_at: string;
  expires_at: string | null;
};

type UploadOperationsEventRow = {
  workspace_id: string;
  event_type: string;
  created_at: string;
};

export type UploadSurfaceOperationsMetrics = {
  finalizedAssets: number;
  removedAssets: number;
  failedSessions: number;
  activeOrReservedSessions: number;
  totalBytes: number;
  contentTypes: Record<string, number>;
  sizeBuckets: Record<"lt_1mb" | "mb_1_to_10" | "mb_10_to_20" | "gt_20mb", number>;
};

export type UploadOperationsDashboardSnapshot = {
  generatedAt: string;
  windowStart: string;
  windowHours: number;
  bySurface: Record<UploadSurface, UploadSurfaceOperationsMetrics>;
  scanQueue: {
    queuedCount: number;
    queuedBytes: number;
    oldestQueuedAt: string | null;
    blockedCount: number;
    infectedCount: number;
    unsupportedCount: number;
    failedPermanentCount: number;
    providerCounts: Record<string, number>;
  };
  cleanupBacklog: {
    removedAssetCount: number;
    expiredSessionCount: number;
    cleanupQueuedEvents: number;
    cleanupFailedEvents: number;
    cleanupSucceededEvents: number;
    retentionCutoffs: ReturnType<typeof buildUploadRetentionCutoffs>;
    auditEventRetentionDays: number;
  };
  operationsEvents: {
    downloadUrlIssued: number;
    scanOverrideApproved: number;
    backpressureDenied: number;
    scanFailures: number;
  };
};

export type UploadOperationsDashboardReadResult = {
  authorized: boolean;
  error: string | null;
  snapshot: UploadOperationsDashboardSnapshot | null;
};

function normalizeWindowHours(value: number | undefined) {
  if (!Number.isFinite(value ?? DEFAULT_WINDOW_HOURS)) return DEFAULT_WINDOW_HOURS;
  return Math.min(168, Math.max(1, Math.trunc(value ?? DEFAULT_WINDOW_HOURS)));
}

function normalizeLimit(limit: number | undefined) {
  if (!Number.isFinite(limit ?? DEFAULT_ROW_LIMIT)) return DEFAULT_ROW_LIMIT;
  return Math.min(2_000, Math.max(1, Math.trunc(limit ?? DEFAULT_ROW_LIMIT)));
}

function isUploadSurface(value: string | null | undefined): value is UploadSurface {
  return UPLOAD_SURFACES.includes(value as UploadSurface);
}

function isScanQueueStatus(value: string | null | undefined): value is typeof SCAN_QUEUE_STATUSES[number] {
  return SCAN_QUEUE_STATUSES.includes(value as typeof SCAN_QUEUE_STATUSES[number]);
}

function isBlockedScanStatus(value: string | null | undefined): value is typeof BLOCKED_SCAN_STATUSES[number] {
  return BLOCKED_SCAN_STATUSES.includes(value as typeof BLOCKED_SCAN_STATUSES[number]);
}

function numberFromUnknown(value: number | string | null | undefined) {
  const parsed = typeof value === "number" ? value : Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 0;
}

function sizeBucket(sizeBytes: number): keyof UploadSurfaceOperationsMetrics["sizeBuckets"] {
  if (sizeBytes < 1_000_000) return "lt_1mb";
  if (sizeBytes < 10_000_000) return "mb_1_to_10";
  if (sizeBytes <= 20_000_000) return "mb_10_to_20";
  return "gt_20mb";
}

function createSurfaceMetrics(): UploadSurfaceOperationsMetrics {
  return {
    finalizedAssets: 0,
    removedAssets: 0,
    failedSessions: 0,
    activeOrReservedSessions: 0,
    totalBytes: 0,
    contentTypes: {},
    sizeBuckets: {
      lt_1mb: 0,
      mb_1_to_10: 0,
      mb_10_to_20: 0,
      gt_20mb: 0,
    },
  };
}

function emptySurfaceMap(): Record<UploadSurface, UploadSurfaceOperationsMetrics> {
  return {
    "project-image": createSurfaceMetrics(),
    "component-image": createSurfaceMetrics(),
    "component-attachment": createSurfaceMetrics(),
  };
}

function incrementRecord(record: Record<string, number>, key: string) {
  record[key] = (record[key] ?? 0) + 1;
}

function isExpired(value: string | null | undefined, now: Date) {
  if (!value) return false;
  const date = new Date(value);
  return Number.isFinite(date.getTime()) && date.getTime() <= now.getTime();
}

function hasError(...results: Array<UploadOperationsQueryResult<unknown>>) {
  return results.some((result) => Boolean(result.error));
}

function aggregateSnapshot(input: {
  now: Date;
  windowHours: number;
  assets: UploadOperationsAssetRow[];
  sessions: UploadOperationsSessionRow[];
  events: UploadOperationsEventRow[];
}): UploadOperationsDashboardSnapshot {
  const bySurface = emptySurfaceMap();
  const scanProviderCounts: Record<string, number> = {};
  let queuedCount = 0;
  let queuedBytes = 0;
  let oldestQueuedAt: string | null = null;
  let infectedCount = 0;
  let unsupportedCount = 0;
  let failedPermanentCount = 0;
  let removedAssetCount = 0;
  let expiredSessionCount = 0;

  for (const row of input.assets) {
    if (!isUploadSurface(row.surface)) continue;
    const surface = bySurface[row.surface];
    const sizeBytes = numberFromUnknown(row.size_bytes);
    surface.totalBytes += sizeBytes;
    surface.sizeBuckets[sizeBucket(sizeBytes)] += 1;
    if (row.content_type) incrementRecord(surface.contentTypes, row.content_type);

    if (row.status === "removed") {
      surface.removedAssets += 1;
      removedAssetCount += 1;
    } else if (row.status === "finalized") {
      surface.finalizedAssets += 1;
    }

    if (isScanQueueStatus(row.scan_status)) {
      queuedCount += 1;
      queuedBytes += sizeBytes;
      if (!oldestQueuedAt || row.created_at < oldestQueuedAt) oldestQueuedAt = row.created_at;
    }
    if (isBlockedScanStatus(row.scan_status)) {
      if (row.scan_status === "infected") infectedCount += 1;
      if (row.scan_status === "unsupported") unsupportedCount += 1;
      if (row.scan_status === "failed_permanent") failedPermanentCount += 1;
    }
    if (row.scan_provider) incrementRecord(scanProviderCounts, row.scan_provider);
  }

  for (const row of input.sessions) {
    if (!isUploadSurface(row.surface)) continue;
    const surface = bySurface[row.surface];
    if (row.status === "failed" || row.status === "aborted") {
      surface.failedSessions += 1;
    }
    if (row.status === "reserved" || row.status === "pending") {
      surface.activeOrReservedSessions += 1;
    }
    if ((row.status === "reserved" || row.status === "pending" || row.status === "failed" || row.status === "aborted") && isExpired(row.expires_at, input.now)) {
      expiredSessionCount += 1;
    }
  }

  const eventCounts = input.events.reduce<Record<string, number>>((accumulator, event) => {
    incrementRecord(accumulator, event.event_type);
    return accumulator;
  }, {});

  const scanFailures =
    (eventCounts.scan_failed_transient ?? 0)
    + (eventCounts.scan_failed_permanent ?? 0)
    + (eventCounts.scan_infected ?? 0)
    + (eventCounts.scan_unsupported ?? 0);

  const windowStart = new Date(input.now.getTime() - input.windowHours * 60 * 60 * 1000).toISOString();

  return {
    generatedAt: input.now.toISOString(),
    windowStart,
    windowHours: input.windowHours,
    bySurface,
    scanQueue: {
      queuedCount,
      queuedBytes,
      oldestQueuedAt,
      blockedCount: infectedCount + unsupportedCount + failedPermanentCount,
      infectedCount,
      unsupportedCount,
      failedPermanentCount,
      providerCounts: scanProviderCounts,
    },
    cleanupBacklog: {
      removedAssetCount,
      expiredSessionCount,
      cleanupQueuedEvents: eventCounts.cleanup_queued ?? 0,
      cleanupFailedEvents: eventCounts.cleanup_failed ?? 0,
      cleanupSucceededEvents: eventCounts.cleanup_succeeded ?? 0,
      retentionCutoffs: buildUploadRetentionCutoffs(input.now),
      auditEventRetentionDays: DEFAULT_UPLOAD_RETENTION_POLICY.auditEventRetentionDays,
    },
    operationsEvents: {
      downloadUrlIssued: eventCounts.download_url_issued ?? 0,
      scanOverrideApproved: eventCounts.scan_override_approved ?? 0,
      backpressureDenied: eventCounts.backpressure_denied ?? 0,
      scanFailures,
    },
  };
}

export async function readUploadOperationsDashboardSnapshot(
  options: { now?: Date; windowHours?: number; limit?: number } = {},
): Promise<UploadOperationsDashboardReadResult> {
  const context = await requireCurrentUserContext();
  if (!canApproveUploadScanOverride(context.role)) {
    return { authorized: false, error: null, snapshot: null };
  }

  const now = options.now ?? new Date();
  const windowHours = normalizeWindowHours(options.windowHours);
  const windowStart = new Date(now.getTime() - windowHours * 60 * 60 * 1000).toISOString();
  const limit = normalizeLimit(options.limit);
  const client = createSupabaseServiceRoleClient("archestimator-upload-operations-dashboard") as unknown as UploadOperationsReadClient;

  const [assetsResult, sessionsResult, eventsResult] = await Promise.all([
    client
      .from("upload_assets")
      .select("workspace_id, surface, content_type, size_bytes, status, scan_status, scan_provider, created_at, updated_at")
      .gte("created_at", windowStart)
      .order("created_at", { ascending: false })
      .limit(limit),
    client
      .from("upload_sessions")
      .select("workspace_id, surface, content_type, size_bytes, status, created_at, expires_at")
      .gte("created_at", windowStart)
      .order("created_at", { ascending: false })
      .limit(limit),
    client
      .from("upload_events")
      .select("workspace_id, event_type, created_at")
      .gte("created_at", windowStart)
      .order("created_at", { ascending: false })
      .limit(limit),
  ]);

  if (hasError(assetsResult, sessionsResult, eventsResult)) {
    return {
      authorized: true,
      error: "Upload operations dashboard metrics could not be loaded.",
      snapshot: null,
    };
  }

  return {
    authorized: true,
    error: null,
    snapshot: aggregateSnapshot({
      now,
      windowHours,
      assets: (assetsResult.data ?? []) as UploadOperationsAssetRow[],
      sessions: (sessionsResult.data ?? []) as UploadOperationsSessionRow[],
      events: (eventsResult.data ?? []) as UploadOperationsEventRow[],
    }),
  };
}
