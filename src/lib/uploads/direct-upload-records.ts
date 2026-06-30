import { randomUUID } from "node:crypto";

import type { D1DatabaseLike } from "@/lib/cloudflare/d1";

import type { UploadSurface } from "./policy";
import type { RecordedUploadAsset, UploadScanStatus } from "./upload-records";

type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

type ActiveUploadSessionRow = {
  expires_at: string | null;
};

type UploadSessionForFinalizeRow = {
  id: string;
  workspace_id: string;
  actor_user_id: string;
  surface: UploadSurface;
  target_entity_type: string | null;
  target_entity_id: string | null;
  storage_bucket: string;
  storage_path: string;
  file_name: string;
  content_type: string;
  size_bytes: number;
  checksum_sha256: string | null;
  status: "reserved" | "finalized" | "failed" | "expired" | "deleted";
  expires_at: string | null;
  metadata_json: string | null;
};

type ExistingUploadAssetRow = {
  id: string;
  upload_session_id: string;
  scan_status: UploadScanStatus | null;
};

export type RecordPendingUploadSessionInput = {
  workspaceId: string;
  actorUserId: string;
  surface: UploadSurface;
  targetEntityType?: string | null;
  targetEntityId?: string | null;
  bucket: string;
  path: string;
  fileName: string;
  contentType: string;
  sizeBytes: number;
  checksumSha256?: string | null;
  expiresAt: string;
  metadata?: Record<string, Json | undefined>;
  capacity?: {
    maxActiveActorSessions: number;
    maxActiveWorkspaceSessions: number;
    now?: Date;
  };
};

export type PendingUploadSessionRecord = {
  uploadSessionId: string;
  expiresAt: string;
};

export type UploadSessionCapacityQuotaClass = "active_actor" | "active_workspace";

export class UploadSessionCapacityExceededError extends Error {
  readonly quotaClass: UploadSessionCapacityQuotaClass;

  constructor(quotaClass: UploadSessionCapacityQuotaClass, message?: string | null) {
    super(message ?? "Upload direct session capacity exceeded.");
    this.name = "UploadSessionCapacityExceededError";
    this.quotaClass = quotaClass;
  }
}

export type ActiveUploadSessionCapacity = {
  actorCount: number;
  workspaceCount: number;
  actorRetryAfterSeconds: number;
  workspaceRetryAfterSeconds: number;
};

export type UploadSessionForFinalize = {
  id: string;
  workspace_id: string;
  actor_user_id: string;
  surface: UploadSurface;
  target_entity_type: string | null;
  target_entity_id: string | null;
  storage_bucket: string;
  storage_path: string;
  file_name: string;
  content_type: string;
  size_bytes: number;
  checksum_sha256: string | null;
  status: "reserved" | "finalized" | "failed" | "expired" | "deleted";
  expires_at: string | null;
  metadata: Json;
};

export type FinalizeUploadSessionInput = {
  uploadSessionId: string;
  workspaceId: string;
  actorUserId: string;
  observedContentType: string | null;
  observedSizeBytes: number;
  observedChecksumSha256?: string | null;
  observedEtag?: string | null;
  scanStatus: UploadScanStatus;
  metadata?: Record<string, Json | undefined>;
};

export function isUploadSessionCapacityExceededError(error: unknown): error is UploadSessionCapacityExceededError {
  return error instanceof UploadSessionCapacityExceededError;
}

function retryAfterSeconds(rows: readonly ActiveUploadSessionRow[], now: Date) {
  const soonestExpiry = rows
    .map((row) => (row.expires_at ? Date.parse(row.expires_at) : Number.NaN))
    .filter(Number.isFinite)
    .sort((left, right) => left - right)[0];

  if (soonestExpiry === undefined) return 60;
  return Math.max(1, Math.ceil((soonestExpiry - now.getTime()) / 1000));
}

function normalizeChecksum(value: string | null | undefined) {
  const normalized = value?.trim().toLowerCase() ?? "";
  return normalized || null;
}

function normalizeJsonObject(value: Record<string, Json | undefined> | undefined) {
  return JSON.stringify(value ?? {});
}

function parseMetadataJson(value: string | null): Json {
  if (!value) return {};
  try {
    const parsed = JSON.parse(value) as Json;
    return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed : {};
  } catch {
    return {};
  }
}

function mergeMetadataJson(
  left: Json,
  right: Record<string, Json | undefined> | undefined,
  extra: Record<string, Json | undefined> = {},
) {
  const base = left && typeof left === "object" && !Array.isArray(left) ? left as Record<string, Json | undefined> : {};
  return JSON.stringify({
    ...base,
    ...extra,
    ...(right ?? {}),
  });
}

async function readReservedUploadSessions(
  db: D1DatabaseLike,
  input: {
    workspaceId: string;
    actorUserId?: string;
    surface: UploadSurface;
    now: Date;
  },
) {
  const actorClause = input.actorUserId ? "AND actor_user_id = ?" : "";
  const statement = db
    .prepare<ActiveUploadSessionRow>(
      `
        SELECT expires_at
        FROM upload_sessions
        WHERE workspace_id = ?
          AND surface = ?
          AND status = 'reserved'
          AND expires_at > ?
          ${actorClause}
        ORDER BY expires_at ASC
      `,
    );
  const values = input.actorUserId
    ? [input.workspaceId, input.surface, input.now.toISOString(), input.actorUserId]
    : [input.workspaceId, input.surface, input.now.toISOString()];
  const { results } = await statement.bind(...values).all<ActiveUploadSessionRow>();
  return results ?? [];
}

export async function readActiveUploadSessionCapacity(
  db: D1DatabaseLike,
  input: {
    workspaceId: string;
    actorUserId: string;
    surface: UploadSurface;
    now?: Date;
  },
): Promise<ActiveUploadSessionCapacity> {
  const now = input.now ?? new Date();
  const [actorRows, workspaceRows] = await Promise.all([
    readReservedUploadSessions(db, { ...input, now }),
    readReservedUploadSessions(db, {
      workspaceId: input.workspaceId,
      surface: input.surface,
      now,
    }),
  ]);

  return {
    actorCount: actorRows.length,
    workspaceCount: workspaceRows.length,
    actorRetryAfterSeconds: retryAfterSeconds(actorRows, now),
    workspaceRetryAfterSeconds: retryAfterSeconds(workspaceRows, now),
  };
}

export async function recordPendingUploadSession(
  db: D1DatabaseLike,
  input: RecordPendingUploadSessionInput,
): Promise<PendingUploadSessionRecord> {
  const now = input.capacity?.now ?? new Date();
  const uploadSessionId = randomUUID();
  const metadataJson = normalizeJsonObject(input.metadata);
  const checksumSha256 = normalizeChecksum(input.checksumSha256);
  const createdAt = now.toISOString();
  const targetEntityType = input.targetEntityType?.trim() || null;
  const targetEntityId = input.targetEntityId?.trim() || null;

  const capacity = input.capacity;
  const insertResult = capacity
    ? await db
      .prepare(
        `
          INSERT INTO upload_sessions (
            id,
            workspace_id,
            actor_user_id,
            surface,
            target_entity_type,
            target_entity_id,
            storage_bucket,
            storage_path,
            file_name,
            content_type,
            size_bytes,
            checksum_sha256,
            status,
            expires_at,
            metadata_json,
            created_at,
            updated_at
          )
          SELECT ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'reserved', ?, ?, ?, ?
          WHERE (
            SELECT COUNT(*)
            FROM upload_sessions
            WHERE workspace_id = ?
              AND actor_user_id = ?
              AND surface = ?
              AND status = 'reserved'
              AND expires_at > ?
          ) < ?
          AND (
            SELECT COUNT(*)
            FROM upload_sessions
            WHERE workspace_id = ?
              AND surface = ?
              AND status = 'reserved'
              AND expires_at > ?
          ) < ?
        `,
      )
      .bind(
        uploadSessionId,
        input.workspaceId,
        input.actorUserId,
        input.surface,
        targetEntityType,
        targetEntityId,
        input.bucket,
        input.path,
        input.fileName,
        input.contentType,
        input.sizeBytes,
        checksumSha256,
        input.expiresAt,
        metadataJson,
        createdAt,
        createdAt,
        input.workspaceId,
        input.actorUserId,
        input.surface,
        createdAt,
        capacity.maxActiveActorSessions,
        input.workspaceId,
        input.surface,
        createdAt,
        capacity.maxActiveWorkspaceSessions,
      )
      .run()
    : await db
      .prepare(
        `
          INSERT INTO upload_sessions (
            id,
            workspace_id,
            actor_user_id,
            surface,
            target_entity_type,
            target_entity_id,
            storage_bucket,
            storage_path,
            file_name,
            content_type,
            size_bytes,
            checksum_sha256,
            status,
            expires_at,
            metadata_json,
            created_at,
            updated_at
          )
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'reserved', ?, ?, ?, ?)
        `,
      )
      .bind(
        uploadSessionId,
        input.workspaceId,
        input.actorUserId,
        input.surface,
        targetEntityType,
        targetEntityId,
        input.bucket,
        input.path,
        input.fileName,
        input.contentType,
        input.sizeBytes,
        checksumSha256,
        input.expiresAt,
        metadataJson,
        createdAt,
        createdAt,
      )
      .run();

  if ((insertResult.meta?.changes ?? 0) === 0) {
    const currentCapacity = await readActiveUploadSessionCapacity(db, {
      workspaceId: input.workspaceId,
      actorUserId: input.actorUserId,
      surface: input.surface,
      now,
    });
    if (capacity && currentCapacity.actorCount >= capacity.maxActiveActorSessions) {
      throw new UploadSessionCapacityExceededError("active_actor", "Upload direct session actor capacity exceeded.");
    }
    throw new UploadSessionCapacityExceededError("active_workspace", "Upload direct session workspace capacity exceeded.");
  }

  await db
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
        VALUES (?, ?, NULL, ?, ?, ?, ?, ?)
      `,
    )
    .bind(
      randomUUID(),
      uploadSessionId,
      input.workspaceId,
      input.actorUserId,
      "session_reserved",
      normalizeJsonObject({
        ...(input.metadata ?? {}),
        expiresAt: input.expiresAt,
      }),
      createdAt,
    )
    .run();

  return { uploadSessionId, expiresAt: input.expiresAt };
}

export async function readUploadSessionForFinalize(
  db: D1DatabaseLike,
  input: { uploadSessionId: string; workspaceId: string; actorUserId: string },
): Promise<UploadSessionForFinalize | null> {
  const row = await db
    .prepare<UploadSessionForFinalizeRow>(
      `
        SELECT
          id,
          workspace_id,
          actor_user_id,
          surface,
          target_entity_type,
          target_entity_id,
          storage_bucket,
          storage_path,
          file_name,
          content_type,
          size_bytes,
          checksum_sha256,
          status,
          expires_at,
          metadata_json
        FROM upload_sessions
        WHERE id = ?
          AND workspace_id = ?
          AND actor_user_id = ?
        LIMIT 1
      `,
    )
    .bind(input.uploadSessionId, input.workspaceId, input.actorUserId)
    .first<UploadSessionForFinalizeRow>();

  if (!row) return null;
  return {
    ...row,
    metadata: parseMetadataJson(row.metadata_json),
  };
}

async function readExistingUploadAsset(db: D1DatabaseLike, uploadSessionId: string) {
  return db
    .prepare<ExistingUploadAssetRow>(
      `
        SELECT id, upload_session_id, scan_status
        FROM upload_assets
        WHERE upload_session_id = ?
        LIMIT 1
      `,
    )
    .bind(uploadSessionId)
    .first<ExistingUploadAssetRow>();
}

export async function finalizeUploadSessionAsset(
  db: D1DatabaseLike,
  input: FinalizeUploadSessionInput,
): Promise<RecordedUploadAsset> {
  if (input.scanStatus !== "not_required" && input.scanStatus !== "pending") {
    throw new Error("Initial upload finalization only accepts not_required or pending scan status.");
  }

  const session = await readUploadSessionForFinalize(db, input);
  if (!session) throw new Error("Upload session was not found.");

  if (session.status === "finalized") {
    const existing = await readExistingUploadAsset(db, session.id);
    if (!existing?.scan_status) throw new Error("Finalized upload session has no asset.");
    return {
      uploadSessionId: existing.upload_session_id,
      assetId: existing.id,
      scanStatus: existing.scan_status,
    };
  }

  if (session.status !== "reserved") throw new Error("Upload session is not reserved.");
  if (session.expires_at && Date.parse(session.expires_at) <= Date.now()) {
    throw new Error("Upload session expired.");
  }
  if (session.content_type !== input.observedContentType) {
    throw new Error("Upload content type mismatch.");
  }
  if (session.size_bytes !== input.observedSizeBytes) {
    throw new Error("Upload size mismatch.");
  }

  const expectedChecksum = normalizeChecksum(session.checksum_sha256);
  const observedChecksum = normalizeChecksum(input.observedChecksumSha256);
  const observedEtag = input.observedEtag?.trim() || null;
  if (expectedChecksum && observedChecksum && expectedChecksum !== observedChecksum) {
    throw new Error("Upload checksum mismatch.");
  }
  if (!observedChecksum && !observedEtag) {
    throw new Error("Upload finalization requires checksum or ETag proof.");
  }

  const now = new Date().toISOString();
  const assetId = randomUUID();
  const mergedMetadataJson = mergeMetadataJson(session.metadata, input.metadata, {
    providerEtag: observedEtag,
  });
  const finalChecksum = expectedChecksum ?? observedChecksum;
  const updateResult = await db
    .prepare(
      `
        UPDATE upload_sessions
        SET status = 'finalized',
            metadata_json = ?,
            updated_at = ?
        WHERE id = ?
          AND workspace_id = ?
          AND actor_user_id = ?
          AND status = 'reserved'
      `,
    )
    .bind(mergedMetadataJson, now, session.id, input.workspaceId, input.actorUserId)
    .run();

  if ((updateResult.meta?.changes ?? 0) === 0) {
    const existing = await readExistingUploadAsset(db, session.id);
    if (existing?.scan_status) {
      return {
        uploadSessionId: existing.upload_session_id,
        assetId: existing.id,
        scanStatus: existing.scan_status,
      };
    }
    throw new Error("Upload session could not be finalized.");
  }

  await db
    .prepare(
      `
        INSERT INTO upload_assets (
          id,
          workspace_id,
          actor_user_id,
          upload_session_id,
          surface,
          status,
          file_name,
          content_type,
          size_bytes,
          checksum_sha256,
          scan_status,
          storage_bucket,
          storage_path,
          thumbnail_path,
          metadata_json,
          created_at,
          updated_at
        )
        VALUES (?, ?, ?, ?, ?, 'finalized', ?, ?, ?, ?, ?, ?, ?, NULL, ?, ?, ?)
      `,
    )
    .bind(
      assetId,
      session.workspace_id,
      session.actor_user_id,
      session.id,
      session.surface,
      session.file_name,
      session.content_type,
      session.size_bytes,
      finalChecksum,
      input.scanStatus,
      session.storage_bucket,
      session.storage_path,
      mergedMetadataJson,
      now,
      now,
    )
    .run();

  await db
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
      session.id,
      assetId,
      session.workspace_id,
      session.actor_user_id,
      input.scanStatus === "pending" ? "scan_pending" : "asset_finalized",
      mergeMetadataJson({}, input.metadata, {
        scanStatus: input.scanStatus,
        providerEtag: observedEtag,
      }),
      now,
    )
    .run();

  return {
    uploadSessionId: session.id,
    assetId,
    scanStatus: input.scanStatus,
  };
}
