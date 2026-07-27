import { createHash, randomUUID } from "node:crypto";

import type {
  D1DatabaseLike,
  D1PreparedStatementLike,
} from "@/lib/cloudflare/d1";
import { runRequiredD1Batch } from "@/lib/cloudflare/d1-batch";

import type { UploadSurface } from "./policy";

type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type UploadScanStatus = "not_required" | "pending";

export type RecordUploadAssetInput = {
  workspaceId: string;
  actorUserId: string;
  surface: UploadSurface;
  targetEntityType?: string | null;
  targetEntityId?: string | null;
  bucket: string;
  path: string;
  thumbnailPath?: string | null;
  fileName: string;
  contentType: string;
  sizeBytes: number;
  checksumBytes?: Buffer | Uint8Array | null;
  scanStatus: UploadScanStatus;
  metadata?: Record<string, Json | undefined>;
};

export type RecordedUploadAsset = {
  uploadSessionId: string;
  assetId: string;
  scanStatus: UploadScanStatus;
};

export type ReservedUploadAsset = RecordedUploadAsset & {
  workspaceId: string;
  actorUserId: string;
  surface: UploadSurface;
  targetEntityType: string | null;
  targetEntityId: string | null;
  projectId: string | null;
  estimateId: string | null;
  bucket: string;
  path: string;
  thumbnailPath: string | null;
  fileName: string;
  contentType: string;
  sizeBytes: number;
  checksumSha256: string | null;
  metadataJson: string;
  expiresAt: string;
  createdAt: string;
};

export type ReserveUploadAssetOptions = {
  now?: Date;
  expiresAt?: string;
};

export type ReservedUploadFailureStage = "storage" | "finalization";

const RESERVED_UPLOAD_TTL_MS = 15 * 60 * 1000;

function sha256Hex(bytes: Buffer | Uint8Array | null | undefined) {
  if (!bytes) return null;
  return createHash("sha256").update(bytes).digest("hex");
}

function metadataJson(metadata: Record<string, Json | undefined> | undefined) {
  return JSON.stringify(metadata ?? {});
}

function targetEntityValue(value: string | null | undefined) {
  return value?.trim() || null;
}

function metadataStringValue(
  metadata: Record<string, Json | undefined> | undefined,
  key: string,
) {
  const value = metadata?.[key];
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function projectIdForAsset(input: RecordUploadAssetInput) {
  if (input.surface === "component-attachment" && input.targetEntityType === "project-component") {
    return metadataStringValue(input.metadata, "projectId");
  }
  if (input.surface === "project-artifact" || input.surface === "portal-request-evidence") {
    if (input.targetEntityType === "project") return targetEntityValue(input.targetEntityId);
    return metadataStringValue(input.metadata, "projectId");
  }
  if (input.surface !== "project-image") return null;
  if (input.targetEntityType === "project") {
    return targetEntityValue(input.targetEntityId);
  }
  if (input.targetEntityType === "estimate-row") {
    return metadataStringValue(input.metadata, "projectId");
  }
  return null;
}

function estimateIdForAsset(input: RecordUploadAssetInput) {
  return metadataStringValue(input.metadata, "estimateId");
}

export async function reserveUploadAsset(
  db: D1DatabaseLike,
  input: RecordUploadAssetInput,
  options: ReserveUploadAssetOptions = {},
): Promise<ReservedUploadAsset> {
  const now = options.now ?? new Date();
  const createdAt = now.toISOString();
  const expiresAt = options.expiresAt
    ?? new Date(now.getTime() + RESERVED_UPLOAD_TTL_MS).toISOString();
  if (!Number.isFinite(Date.parse(expiresAt)) || Date.parse(expiresAt) <= now.getTime()) {
    throw new Error("Upload reservation expiry must be in the future.");
  }

  const uploadSessionId = randomUUID();
  const assetId = randomUUID();
  const checksumSha256 = sha256Hex(input.checksumBytes);
  const metadata = metadataJson(input.metadata);
  const targetEntityType = targetEntityValue(input.targetEntityType);
  const targetEntityId = targetEntityValue(input.targetEntityId);
  const projectId = projectIdForAsset(input);
  const estimateId = estimateIdForAsset(input);

  const sessionStatement = db.prepare(`
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
  `).bind(
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
    expiresAt,
    metadata,
    createdAt,
    createdAt,
  );

  const eventStatement = db.prepare(`
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
    VALUES (?, ?, NULL, ?, ?, 'session_reserved', ?, ?)
  `).bind(
    randomUUID(),
    uploadSessionId,
    input.workspaceId,
    input.actorUserId,
    metadataJson({
      ...(input.metadata ?? {}),
      expiresAt,
    }),
    createdAt,
  );

  await runRequiredD1Batch(
    db,
    [sessionStatement, eventStatement],
    "Could not reserve the upload lifecycle atomically.",
  );

  return {
    uploadSessionId,
    assetId,
    scanStatus: input.scanStatus,
    workspaceId: input.workspaceId,
    actorUserId: input.actorUserId,
    surface: input.surface,
    targetEntityType,
    targetEntityId,
    projectId,
    estimateId,
    bucket: input.bucket,
    path: input.path,
    thumbnailPath: input.thumbnailPath ?? null,
    fileName: input.fileName,
    contentType: input.contentType,
    sizeBytes: input.sizeBytes,
    checksumSha256,
    metadataJson: metadata,
    expiresAt,
    createdAt,
  };
}

export async function finalizeReservedUploadAsset(
  db: D1DatabaseLike,
  reservation: ReservedUploadAsset,
  additionalStatements: D1PreparedStatementLike[] = [],
): Promise<RecordedUploadAsset> {
  const now = new Date().toISOString();
  const sessionStatement = db.prepare(`
    UPDATE upload_sessions
    SET status = 'finalized',
        expires_at = NULL,
        updated_at = ?
    WHERE id = ?
      AND workspace_id = ?
      AND actor_user_id = ?
      AND status IN ('reserved', 'finalized')
      AND (status = 'finalized' OR expires_at > ?)
  `).bind(
    now,
    reservation.uploadSessionId,
    reservation.workspaceId,
    reservation.actorUserId,
    now,
  );

  const assetStatement = db.prepare(`
    INSERT INTO upload_assets (
      id,
      workspace_id,
      actor_user_id,
      project_id,
      estimate_id,
      upload_session_id,
      surface,
      target_entity_type,
      target_entity_id,
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
    SELECT ?, ?, ?, ?, ?, ?, ?, ?, ?, 'finalized', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?
    WHERE EXISTS (
      SELECT 1
      FROM upload_sessions
      WHERE id = ?
        AND workspace_id = ?
        AND actor_user_id = ?
        AND status = 'finalized'
    )
      AND NOT EXISTS (
        SELECT 1
        FROM upload_assets
        WHERE upload_session_id = ?
      )
  `).bind(
    reservation.assetId,
    reservation.workspaceId,
    reservation.actorUserId,
    reservation.projectId,
    reservation.estimateId,
    reservation.uploadSessionId,
    reservation.surface,
    reservation.targetEntityType,
    reservation.targetEntityId,
    reservation.fileName,
    reservation.contentType,
    reservation.sizeBytes,
    reservation.checksumSha256,
    reservation.scanStatus,
    reservation.bucket,
    reservation.path,
    reservation.thumbnailPath,
    reservation.metadataJson,
    reservation.createdAt,
    now,
    reservation.uploadSessionId,
    reservation.workspaceId,
    reservation.actorUserId,
    reservation.uploadSessionId,
  );

  const eventStatement = db.prepare(`
    INSERT OR IGNORE INTO upload_events (
      id,
      upload_session_id,
      upload_asset_id,
      workspace_id,
      actor_user_id,
      event_type,
      metadata_json,
      created_at
    )
    SELECT ?, ?, ?, ?, ?, ?, ?, ?
    WHERE EXISTS (
      SELECT 1
      FROM upload_assets
      WHERE id = ?
        AND upload_session_id = ?
    )
  `).bind(
    randomUUID(),
    reservation.uploadSessionId,
    reservation.assetId,
    reservation.workspaceId,
    reservation.actorUserId,
    reservation.scanStatus === "pending" ? "scan_pending" : "asset_finalized",
    metadataJson({ scanStatus: reservation.scanStatus }),
    now,
    reservation.assetId,
    reservation.uploadSessionId,
  );

  try {
    await runRequiredD1Batch(
      db,
      [sessionStatement, assetStatement, eventStatement, ...additionalStatements],
      "Could not finalize the reserved upload lifecycle atomically.",
    );
  } catch (error) {
    const winner = await readFinalizedReservedUploadAsset(db, reservation).catch(() => null);
    if (winner) return winner;
    throw error;
  }

  const finalized = await readFinalizedReservedUploadAsset(db, reservation);
  if (!finalized) throw new Error("Reserved upload lifecycle could not be finalized.");
  return finalized;
}

async function readFinalizedReservedUploadAsset(
  db: D1DatabaseLike,
  reservation: ReservedUploadAsset,
): Promise<RecordedUploadAsset | null> {
  const row = await db.prepare<{
    id: string;
    upload_session_id: string;
    scan_status: UploadScanStatus;
  }>(`
    SELECT id, upload_session_id, scan_status
    FROM upload_assets
    WHERE upload_session_id = ?
      AND id = ?
      AND workspace_id = ?
      AND actor_user_id = ?
      AND storage_bucket = ?
      AND storage_path = ?
      AND status = 'finalized'
    LIMIT 1
  `).bind(
    reservation.uploadSessionId,
    reservation.assetId,
    reservation.workspaceId,
    reservation.actorUserId,
    reservation.bucket,
    reservation.path,
  ).first();
  if (!row || row.scan_status !== reservation.scanStatus) return null;
  return {
    uploadSessionId: row.upload_session_id,
    assetId: row.id,
    scanStatus: row.scan_status,
  };
}

export async function failReservedUploadAsset(
  db: D1DatabaseLike,
  reservation: ReservedUploadAsset,
  failureStage: ReservedUploadFailureStage,
) {
  const now = new Date().toISOString();
  const sessionStatement = db.prepare(`
    UPDATE upload_sessions
    SET status = 'failed',
        updated_at = ?
    WHERE id = ?
      AND workspace_id = ?
      AND actor_user_id = ?
      AND status = 'reserved'
  `).bind(
    now,
    reservation.uploadSessionId,
    reservation.workspaceId,
    reservation.actorUserId,
  );
  const eventStatement = db.prepare(`
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
    SELECT ?, ?, NULL, ?, ?, 'upload_failed', ?, ?
    WHERE EXISTS (
      SELECT 1
      FROM upload_sessions
      WHERE id = ?
        AND status = 'failed'
    )
  `).bind(
    randomUUID(),
    reservation.uploadSessionId,
    reservation.workspaceId,
    reservation.actorUserId,
    metadataJson({ failureStage }),
    now,
    reservation.uploadSessionId,
  );

  await runRequiredD1Batch(
    db,
    [sessionStatement, eventStatement],
    "Could not retain the failed upload lifecycle.",
  );
}

export async function recordUploadAsset(
  db: D1DatabaseLike,
  input: RecordUploadAssetInput,
): Promise<RecordedUploadAsset> {
  const now = new Date().toISOString();
  const uploadSessionId = randomUUID();
  const assetId = randomUUID();
  const checksumSha256 = sha256Hex(input.checksumBytes);
  const metadata = metadataJson(input.metadata);
  const targetEntityType = targetEntityValue(input.targetEntityType);
  const targetEntityId = targetEntityValue(input.targetEntityId);
  const projectId = projectIdForAsset(input);
  const estimateId = estimateIdForAsset(input);

  const sessionStatement = db
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
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'finalized', NULL, ?, ?, ?)
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
      metadata,
      now,
      now,
    );

  const assetStatement = db
    .prepare(
      `
        INSERT INTO upload_assets (
          id,
          workspace_id,
          actor_user_id,
          project_id,
          estimate_id,
          upload_session_id,
          surface,
          target_entity_type,
          target_entity_id,
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
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'finalized', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `,
    )
    .bind(
      assetId,
      input.workspaceId,
      input.actorUserId,
      projectId,
      estimateId,
      uploadSessionId,
      input.surface,
      targetEntityType,
      targetEntityId,
      input.fileName,
      input.contentType,
      input.sizeBytes,
      checksumSha256,
      input.scanStatus,
      input.bucket,
      input.path,
      input.thumbnailPath ?? null,
      metadata,
      now,
      now,
    );

  const eventStatement = db
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
      uploadSessionId,
      assetId,
      input.workspaceId,
      input.actorUserId,
      input.scanStatus === "pending" ? "scan_pending" : "asset_finalized",
      metadataJson({
        ...(input.metadata ?? {}),
        scanStatus: input.scanStatus,
      }),
      now,
    );

  await runRequiredD1Batch(
    db,
    [sessionStatement, assetStatement, eventStatement],
    "Could not record the upload lifecycle atomically.",
  );

  return {
    uploadSessionId,
    assetId,
    scanStatus: input.scanStatus,
  };
}
