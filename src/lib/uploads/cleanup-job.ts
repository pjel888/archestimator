import { createHash, randomUUID } from "node:crypto";

import type { D1DatabaseLike } from "@/lib/cloudflare/d1";
import type { StorageCleanupReport, StorageCleanupTarget } from "@/lib/mass-deletion/bulk-action";

import {
  buildUploadCleanupOperationalSnapshot,
  buildUploadRetentionCutoffs,
  planUploadStorageCleanup,
  summarizeUploadCleanup,
  type UploadCleanupCandidate,
  type UploadCleanupMetrics,
  type UploadCleanupOperationalSnapshot,
  type UploadCleanupPlan,
  type UploadCleanupRecord,
} from "./cleanup";
import { reportUploadCleanupJobTelemetry } from "./operational-telemetry";
import type { UploadStorageProvider } from "./storage-provider";

const STORAGE_REMOVE_CHUNK_SIZE = 100;
const DEFAULT_UPLOAD_CLEANUP_JOB_LIMIT = 500;
const MAX_UPLOAD_CLEANUP_JOB_LIMIT = 1_000;

export type UploadCleanupJobRecord = UploadCleanupRecord & {
  actorUserId?: string | null;
  uploadAssetId?: string | null;
};

export type UploadCleanupEventType = "cleanup_queued" | "cleanup_failed" | "cleanup_succeeded";

export type UploadCleanupEventMetadata = Record<string, string | number | boolean | null>;

export type UploadCleanupEventPayload = {
  uploadSessionId: string | null;
  uploadAssetId: string | null;
  workspaceId: string;
  actorUserId: string | null;
  eventType: UploadCleanupEventType;
  metadata: UploadCleanupEventMetadata;
};

export type UploadCleanupEventWriter = {
  record: (event: UploadCleanupEventPayload) => Promise<void>;
};

export type UploadCleanupStorage = {
  remove: (targets: readonly StorageCleanupTarget[]) => Promise<StorageCleanupReport>;
};

export type UploadCleanupJobAuditSummary = {
  queuedCount: number;
  succeededCount: number;
  failedCount: number;
  writeFailureCount: number;
  eventTypes: Record<UploadCleanupEventType, number>;
};

export type UploadCleanupJobResult = {
  runId: string;
  startedAt: string;
  completedAt: string;
  plan: UploadCleanupPlan;
  storageReport: StorageCleanupReport;
  metrics: UploadCleanupMetrics;
  operationalSnapshot: UploadCleanupOperationalSnapshot;
  audit: UploadCleanupJobAuditSummary;
};

export type UploadCleanupJobPublicReport = {
  runId: string;
  startedAt: string;
  completedAt: string;
  planner: {
    candidateCount: number;
    rejectedCount: number;
    rejectedReasons: Record<string, number>;
    candidateBuckets: string[];
  };
  storage: {
    removedCount: number;
    failedCount: number;
    rejectedCount: number;
    failedBuckets: string[];
  };
  audit: UploadCleanupJobAuditSummary;
  operationalSnapshot: UploadCleanupOperationalSnapshot;
};

type UploadAssetCleanupRow = {
  id: string;
  upload_session_id: string | null;
  workspace_id: string;
  actor_user_id: string | null;
  surface: UploadCleanupRecord["surface"];
  storage_bucket: string;
  storage_path: string;
  thumbnail_path: string | null;
  status: string;
  updated_at?: string | null;
};

type UploadSessionCleanupRow = {
  id: string;
  workspace_id: string;
  actor_user_id: string | null;
  surface: UploadCleanupRecord["surface"];
  storage_bucket: string;
  storage_path: string;
  status: string;
  expires_at: string | null;
};

function sha256Hex(value: string) {
  return createHash("sha256").update(value).digest("hex");
}

function targetKey(target: Pick<StorageCleanupTarget, "bucket" | "path">) {
  return `${target.bucket}:${target.path}`;
}

function candidateKey(candidate: UploadCleanupCandidate) {
  return `${candidate.assetId}:${targetKey(candidate.target)}`;
}

function targetKeysForRecord(record: UploadCleanupJobRecord) {
  return [
    `${record.assetId}:${record.bucket}:${record.path}`,
    record.thumbnailPath ? `${record.assetId}:${record.bucket}:${record.thumbnailPath}` : null,
  ].filter((key): key is string => Boolean(key));
}

function buildRecordByCandidateKey(records: readonly UploadCleanupJobRecord[]) {
  const lookup = new Map<string, UploadCleanupJobRecord>();

  for (const record of records) {
    for (const key of targetKeysForRecord(record)) {
      if (!lookup.has(key)) lookup.set(key, record);
    }
  }

  return lookup;
}

function normalizeLimit(limit: number | undefined) {
  if (!Number.isFinite(limit ?? DEFAULT_UPLOAD_CLEANUP_JOB_LIMIT)) return DEFAULT_UPLOAD_CLEANUP_JOB_LIMIT;
  return Math.min(MAX_UPLOAD_CLEANUP_JOB_LIMIT, Math.max(1, Math.trunc(limit ?? DEFAULT_UPLOAD_CLEANUP_JOB_LIMIT)));
}

function classifyFailure(message: string | null | undefined) {
  const normalized = (message ?? "").toLowerCase();
  if (normalized.includes("timeout")) return "timeout";
  if (normalized.includes("rate") || normalized.includes("429")) return "rate_limited";
  if (normalized.includes("auth") || normalized.includes("permission")) return "authorization";
  if (normalized.includes("network") || normalized.includes("fetch")) return "network";
  return "storage_error";
}

function metadataForCleanupEvent(
  eventType: UploadCleanupEventType,
  candidate: UploadCleanupCandidate,
  record: UploadCleanupJobRecord | undefined,
  options: { runId: string; failureMessage?: string | null },
): UploadCleanupEventMetadata {
  const failureMessage = options.failureMessage ?? null;

  return {
    cleanupRunId: options.runId,
    cleanupReason: candidate.reason,
    cleanupEvent: eventType,
    surface: record?.surface ?? null,
    storageBucket: candidate.target.bucket,
    storagePathSha256: sha256Hex(candidate.target.path),
    storagePathRecorded: false,
    retryable: eventType === "cleanup_failed",
    failureCategory: eventType === "cleanup_failed" ? classifyFailure(failureMessage) : null,
    failureMessageSha256: failureMessage ? sha256Hex(failureMessage) : null,
  };
}

async function recordCleanupEvent(
  eventWriter: UploadCleanupEventWriter,
  eventType: UploadCleanupEventType,
  candidate: UploadCleanupCandidate,
  record: UploadCleanupJobRecord | undefined,
  options: { runId: string; failureMessage?: string | null },
) {
  await eventWriter.record({
    uploadSessionId: candidate.uploadSessionId,
    uploadAssetId: record?.uploadAssetId ?? null,
    workspaceId: candidate.workspaceId,
    actorUserId: record?.actorUserId ?? null,
    eventType,
    metadata: metadataForCleanupEvent(eventType, candidate, record, options),
  });
}

function emptyStorageReport(): StorageCleanupReport {
  return { removed: [], rejected: [], failed: [] };
}

function combineStorageReports(...reports: StorageCleanupReport[]): StorageCleanupReport {
  return {
    removed: reports.flatMap((report) => report.removed),
    rejected: reports.flatMap((report) => report.rejected),
    failed: reports.flatMap((report) => report.failed),
  };
}

export function createUploadCleanupStorageFromProvider(storageProvider: UploadStorageProvider): UploadCleanupStorage {
  return {
    async remove(targets) {
      const removed: StorageCleanupReport["removed"] = [];
      const rejected: StorageCleanupReport["rejected"] = [];
      const failed: StorageCleanupReport["failed"] = [];
      const targetsByBucket = new Map<string, string[]>();

      for (const target of targets) {
        targetsByBucket.set(target.bucket, [...(targetsByBucket.get(target.bucket) ?? []), target.path]);
      }

      for (const [bucket, paths] of targetsByBucket.entries()) {
        for (let index = 0; index < paths.length; index += STORAGE_REMOVE_CHUNK_SIZE) {
          const chunk = paths.slice(index, index + STORAGE_REMOVE_CHUNK_SIZE);

          try {
            await storageProvider.removeObjects(bucket, chunk);
            removed.push(...chunk.map((path) => ({ bucket, path })));
          } catch (error) {
            failed.push(...chunk.map((path) => ({
              bucket,
              path,
              message: error instanceof Error ? error.message : "Storage cleanup failed.",
            })));
          }
        }
      }

      return { removed, rejected, failed };
    },
  };
}

export function createUploadCleanupEventWriter(db: D1DatabaseLike): UploadCleanupEventWriter {
  return {
    async record(event) {
      const result = await db
        .prepare(
          `
            INSERT INTO upload_events (
              id,
              upload_session_id,
              upload_asset_id,
              workspace_id,
              actor_user_id,
              event_type,
              metadata_json,
              created_at
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
          `,
        )
        .bind(
          randomUUID(),
          event.uploadSessionId,
          event.uploadAssetId,
          event.workspaceId,
          event.actorUserId,
          event.eventType,
          JSON.stringify(event.metadata),
          new Date().toISOString(),
        )
        .run();

      if (result.success === false) throw new Error("Could not record upload cleanup event.");
    },
  };
}

export async function runUploadCleanupJob({
  records,
  storage,
  eventWriter,
  now = new Date(),
  limit,
  runId = randomUUID(),
}: {
  records: readonly UploadCleanupJobRecord[];
  storage: UploadCleanupStorage;
  eventWriter: UploadCleanupEventWriter;
  now?: Date;
  limit?: number;
  runId?: string;
}): Promise<UploadCleanupJobResult> {
  const startedAt = now.toISOString();
  const normalizedLimit = normalizeLimit(limit);
  const plan = planUploadStorageCleanup(records, { now, limit: normalizedLimit });
  const recordByKey = buildRecordByCandidateKey(records);
  const audit: UploadCleanupJobAuditSummary = {
    queuedCount: 0,
    succeededCount: 0,
    failedCount: 0,
    writeFailureCount: 0,
    eventTypes: {
      cleanup_queued: 0,
      cleanup_failed: 0,
      cleanup_succeeded: 0,
    },
  };
  const queuedCandidates: UploadCleanupCandidate[] = [];
  const queueFailures: StorageCleanupReport["failed"] = [];
  const auditFailures: StorageCleanupReport["failed"] = [];

  for (const candidate of plan.candidates) {
    const record = recordByKey.get(candidateKey(candidate));
    try {
      await recordCleanupEvent(eventWriter, "cleanup_queued", candidate, record, { runId });
      audit.queuedCount += 1;
      audit.eventTypes.cleanup_queued += 1;
      queuedCandidates.push(candidate);
    } catch (error) {
      audit.writeFailureCount += 1;
      queueFailures.push({
        ...candidate.target,
        message: error instanceof Error ? error.message : "Cleanup queue audit failed.",
      });
    }
  }

  const storageReport = queuedCandidates.length > 0
    ? await storage.remove(queuedCandidates.map((candidate) => candidate.target))
    : emptyStorageReport();
  const removedKeys = new Set(storageReport.removed.map(targetKey));
  const failedByKey = new Map(storageReport.failed.map((failure) => [targetKey(failure), failure.message]));

  for (const candidate of queuedCandidates) {
    const record = recordByKey.get(candidateKey(candidate));
    const key = targetKey(candidate.target);
    const failedMessage = failedByKey.get(key);
    const eventType: UploadCleanupEventType = removedKeys.has(key) ? "cleanup_succeeded" : "cleanup_failed";

    if (!failedMessage && eventType === "cleanup_failed") continue;

    try {
      await recordCleanupEvent(eventWriter, eventType, candidate, record, {
        runId,
        failureMessage: failedMessage,
      });

      if (eventType === "cleanup_succeeded") {
        audit.succeededCount += 1;
        audit.eventTypes.cleanup_succeeded += 1;
      } else {
        audit.failedCount += 1;
        audit.eventTypes.cleanup_failed += 1;
      }
    } catch (error) {
      audit.writeFailureCount += 1;
      auditFailures.push({
        ...candidate.target,
        message: error instanceof Error ? error.message : `Could not record ${eventType} cleanup event.`,
      });
    }
  }

  const combinedReport = combineStorageReports(storageReport, {
    removed: [],
    rejected: [],
    failed: [...queueFailures, ...auditFailures],
  });
  const metrics = summarizeUploadCleanup(plan, combinedReport);

  const result: UploadCleanupJobResult = {
    runId,
    startedAt,
    completedAt: new Date().toISOString(),
    plan,
    storageReport: combinedReport,
    metrics,
    operationalSnapshot: buildUploadCleanupOperationalSnapshot(plan, metrics, { now }),
    audit,
  };

  reportUploadCleanupJobTelemetry(result);
  return result;
}

export function summarizeUploadCleanupJobResult(result: UploadCleanupJobResult): UploadCleanupJobPublicReport {
  return {
    runId: result.runId,
    startedAt: result.startedAt,
    completedAt: result.completedAt,
    planner: {
      candidateCount: result.plan.candidates.length,
      rejectedCount: result.plan.rejected.length,
      rejectedReasons: result.plan.rejected.reduce<Record<string, number>>((accumulator, rejected) => {
        accumulator[rejected.reason] = (accumulator[rejected.reason] ?? 0) + 1;
        return accumulator;
      }, {}),
      candidateBuckets: [...new Set(result.plan.candidates.map((candidate) => candidate.target.bucket))].sort(),
    },
    storage: {
      removedCount: result.storageReport.removed.length,
      failedCount: result.storageReport.failed.length,
      rejectedCount: result.storageReport.rejected.length + result.plan.rejected.length,
      failedBuckets: [...new Set(result.storageReport.failed.map((failure) => failure.bucket))].sort(),
    },
    audit: result.audit,
    operationalSnapshot: result.operationalSnapshot,
  };
}

function assertUploadAssetRows(data: unknown): UploadAssetCleanupRow[] {
  return Array.isArray(data) ? data as UploadAssetCleanupRow[] : [];
}

function assertUploadSessionRows(data: unknown): UploadSessionCleanupRow[] {
  return Array.isArray(data) ? data as UploadSessionCleanupRow[] : [];
}

function cleanupRecordFromAssetRow(row: UploadAssetCleanupRow): UploadCleanupJobRecord {
  return {
    assetId: row.id,
    uploadAssetId: row.id,
    uploadSessionId: row.upload_session_id,
    workspaceId: row.workspace_id,
    actorUserId: row.actor_user_id,
    surface: row.surface,
    bucket: row.storage_bucket,
    path: row.storage_path,
    thumbnailPath: row.thumbnail_path,
    status: row.status === "removed" ? "deleted" : row.status,
  };
}

function cleanupRecordFromSessionRow(row: UploadSessionCleanupRow): UploadCleanupJobRecord {
  const status = row.status === "failed" || row.status === "expired" || row.status === "deleted"
    ? row.status
    : "reserved";

  return {
    assetId: row.id,
    uploadAssetId: null,
    uploadSessionId: row.id,
    workspaceId: row.workspace_id,
    actorUserId: row.actor_user_id,
    surface: row.surface,
    bucket: row.storage_bucket,
    path: row.storage_path,
    status,
    expiresAt: row.expires_at,
  };
}

export async function listUploadCleanupJobRecords(
  db: D1DatabaseLike,
  options: { now?: Date; limit?: number } = {},
): Promise<UploadCleanupJobRecord[]> {
  const limit = normalizeLimit(options.limit);
  const now = options.now ?? new Date();
  const cutoffs = buildUploadRetentionCutoffs(now);

  const [assetResult, sessionResult] = await Promise.all([
    db
      .prepare<UploadAssetCleanupRow>(
        `
          SELECT id, upload_session_id, workspace_id, actor_user_id, surface, storage_bucket, storage_path, thumbnail_path, status, updated_at
          FROM upload_assets
          WHERE status = ?
            AND updated_at <= ?
          ORDER BY updated_at ASC
          LIMIT ?
        `,
      )
      .bind("deleted", cutoffs.deletedAssetsBefore, limit)
      .all<UploadAssetCleanupRow>(),
    db
      .prepare<UploadSessionCleanupRow>(
        `
          SELECT id, workspace_id, actor_user_id, surface, storage_bucket, storage_path, status, expires_at
          FROM upload_sessions
          WHERE status IN (?, ?, ?, ?)
            AND expires_at <= ?
          ORDER BY expires_at ASC
          LIMIT ?
        `,
      )
      .bind("reserved", "failed", "expired", "deleted", cutoffs.expiredSessionsBefore, limit)
      .all<UploadSessionCleanupRow>(),
  ]);

  if (assetResult.success === false) throw new Error("Could not read cleanup upload assets.");
  if (sessionResult.success === false) throw new Error("Could not read cleanup upload sessions.");

  return [
    ...assertUploadAssetRows(assetResult.results ?? []).map(cleanupRecordFromAssetRow),
    ...assertUploadSessionRows(sessionResult.results ?? []).map(cleanupRecordFromSessionRow),
  ].slice(0, limit);
}
