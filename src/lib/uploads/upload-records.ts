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
  idempotencyKey?: string;
  scanStatus: UploadScanStatus;
  metadata?: Record<string, Json | undefined>;
};

export type RecordedUploadAsset = {
  uploadSessionId: string;
  assetId: string;
  scanStatus: UploadScanStatus;
};

export type ReservedUploadAsset = RecordedUploadAsset & {
  claimToken: string;
  reservationState: "acquired" | "finalized" | "in_progress";
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
const RESERVED_UPLOAD_CLEANUP_LEASE_MS = 2 * 60 * 1000;

function sha256Hex(bytes: Buffer | Uint8Array | null | undefined) {
  if (!bytes) return null;
  return createHash("sha256").update(bytes).digest("hex");
}

function sha256Text(value: string) {
  return createHash("sha256").update(value).digest("hex");
}

function canonicalJsonValue(value: Json | undefined): Json | undefined {
  if (Array.isArray(value)) return value.map((item) => canonicalJsonValue(item) ?? null);
  if (!value || typeof value !== "object") return value;
  return Object.fromEntries(
    Object.entries(value)
      .filter((entry) => entry[1] !== undefined)
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([key, item]) => [key, canonicalJsonValue(item)]),
  );
}

function metadataJson(metadata: Record<string, Json | undefined> | undefined) {
  return JSON.stringify(canonicalJsonValue(metadata ?? {}));
}

function stableUploadId(namespace: string, identity: string) {
  const hash = sha256Text(`${namespace}:${identity}`);
  return `${hash.slice(0, 8)}-${hash.slice(8, 12)}-4${hash.slice(13, 16)}-8${hash.slice(17, 20)}-${hash.slice(20, 32)}`;
}

type ReservedUploadSessionRow = {
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
  status: string;
  expires_at: string | null;
  metadata_json: string;
  created_at: string;
};

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

function uploadReservationTiming(options: ReserveUploadAssetOptions) {
  const now = options.now ?? new Date();
  const createdAt = now.toISOString();
  const expiresAt = options.expiresAt ?? new Date(now.getTime() + RESERVED_UPLOAD_TTL_MS).toISOString();
  if (!Number.isFinite(Date.parse(expiresAt)) || Date.parse(expiresAt) <= now.getTime()) {
    throw new Error("Upload reservation expiry must be in the future.");
  }
  return { createdAt, expiresAt };
}

function uploadReservationIdentity(input: RecordUploadAssetInput) {
  const idempotencyKey = input.idempotencyKey?.trim() || null;
  if (idempotencyKey && idempotencyKey.length > 512) throw new Error("Upload idempotency identity is too long.");
  const idempotencySha256 = idempotencyKey ? sha256Text(idempotencyKey) : null;
  const stableIdentity = idempotencySha256 ? `${input.workspaceId}:${input.actorUserId}:${input.surface}:${idempotencySha256}` : null;
  return {
    assetId: stableIdentity ? stableUploadId("upload-asset", stableIdentity) : randomUUID(),
    idempotencySha256,
    uploadSessionId: stableIdentity ? stableUploadId("upload-session", stableIdentity) : randomUUID(),
  };
}

function uploadReservationMetadata(input: RecordUploadAssetInput, checksumSha256: string | null, targetEntityId: string | null, targetEntityType: string | null, idempotencySha256: string | null) {
  const persistedIntent = {
    actorUserId: input.actorUserId,
    bucket: input.bucket,
    checksumSha256,
    contentType: input.contentType,
    fileName: input.fileName,
    metadata: input.metadata ?? {},
    path: input.path,
    scanStatus: input.scanStatus,
    sizeBytes: input.sizeBytes,
    surface: input.surface,
    targetEntityId,
    targetEntityType,
    thumbnailPath: input.thumbnailPath ?? null,
    workspaceId: input.workspaceId,
  } satisfies Record<string, Json | undefined>;
  const intentSha256 = sha256Text(metadataJson(persistedIntent));
  const claimToken = randomUUID();
  const assetMetadata = metadataJson({ ...(input.metadata ?? {}), uploadIdempotencySha256: idempotencySha256, uploadIntentSha256: intentSha256 });
  const sessionMetadata = metadataJson({
    ...(input.metadata ?? {}),
    uploadIdempotencySha256: idempotencySha256,
    uploadIntentSha256: intentSha256,
    uploadReservationClaim: claimToken,
    uploadThumbnailPath: input.thumbnailPath ?? null,
  });
  return { assetMetadata, claimToken, intentSha256, sessionMetadata };
}

function reservedUploadSessionStatement(db: D1DatabaseLike, input: RecordUploadAssetInput, uploadSessionId: string, targetEntityType: string | null, targetEntityId: string | null, expiresAt: string, metadata: string, createdAt: string, checksumSha256: string | null) {
  return db.prepare(`
    INSERT OR IGNORE INTO upload_sessions (
      id, workspace_id, actor_user_id, surface, target_entity_type, target_entity_id,
      storage_bucket, storage_path, file_name, content_type, size_bytes, checksum_sha256,
      status, expires_at, metadata_json, created_at, updated_at
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'reserved', ?, ?, ?, ?)
  `).bind(uploadSessionId,input.workspaceId,input.actorUserId,input.surface,targetEntityType,targetEntityId,input.bucket,input.path,input.fileName,input.contentType,input.sizeBytes,checksumSha256,expiresAt,metadata,createdAt,createdAt);
}

function retryableUploadSessionStatement(
  db: D1DatabaseLike,
  uploadSessionId: string,
  intentSha256: string,
  expiresAt: string,
  metadata: string,
  now: string,
) {
  return db.prepare(`
    UPDATE upload_sessions
    SET status = 'reserved',
        expires_at = ?,
        metadata_json = ?,
        updated_at = ?
    WHERE id = ?
      AND json_extract(metadata_json, '$.uploadIntentSha256') = ?
      AND (
        status = 'failed'
        OR (status = 'reserved' AND expires_at <= ?)
      )
  `).bind(expiresAt, metadata, now, uploadSessionId, intentSha256, now);
}

function reservedUploadEventStatement(db: D1DatabaseLike, input: RecordUploadAssetInput, uploadSessionId: string, expiresAt: string, createdAt: string) {
  return db.prepare(`
    INSERT OR IGNORE INTO upload_events (
      id, upload_session_id, upload_asset_id, workspace_id, actor_user_id,
      event_type, metadata_json, created_at
    )
    VALUES (?, ?, NULL, ?, ?, 'session_reserved', ?, ?)
  `).bind(stableUploadId("upload-reserved-event", uploadSessionId),uploadSessionId,input.workspaceId,input.actorUserId,metadataJson({...(input.metadata ?? {}),expiresAt}),createdAt);
}

function parsedUploadReservationMetadata(metadata: string) {
  try {
    const value = JSON.parse(metadata) as unknown;
    return value && typeof value === "object" && !Array.isArray(value)
      ? value as Record<string, unknown>
      : null;
  } catch {
    return null;
  }
}

function exactReservedUploadIntent(persisted: ReservedUploadSessionRow | null, input: RecordUploadAssetInput, targetEntityType: string | null, targetEntityId: string | null, checksumSha256: string | null, idempotencySha256: string | null, intentSha256: string) {
  if (!persisted) return false;
  const expected = [input.workspaceId,input.actorUserId,input.surface,targetEntityType,targetEntityId,input.bucket,input.path,input.fileName,input.contentType,input.sizeBytes,checksumSha256];
  const actual = [persisted.workspace_id,persisted.actor_user_id,persisted.surface,persisted.target_entity_type,persisted.target_entity_id,persisted.storage_bucket,persisted.storage_path,persisted.file_name,persisted.content_type,Number(persisted.size_bytes),persisted.checksum_sha256];
  const persistedMetadata = parsedUploadReservationMetadata(persisted.metadata_json);
  return expected.every((value, index) => value === actual[index])
    && persistedMetadata?.uploadIdempotencySha256 === idempotencySha256
    && persistedMetadata.uploadIntentSha256 === intentSha256;
}

async function readReservedUploadSession(db: D1DatabaseLike, uploadSessionId: string) {
  return db.prepare<ReservedUploadSessionRow>(`
    SELECT id, workspace_id, actor_user_id, surface, target_entity_type, target_entity_id,
           storage_bucket, storage_path, file_name, content_type, size_bytes,
           checksum_sha256, status, expires_at, metadata_json, created_at
    FROM upload_sessions
    WHERE id = ?
    LIMIT 1
  `).bind(uploadSessionId).first();
}

function uploadReservationState(persisted: ReservedUploadSessionRow, claimToken: string): ReservedUploadAsset["reservationState"] {
  if (persisted.status === "finalized") return "finalized";
  const persistedMetadata = parsedUploadReservationMetadata(persisted.metadata_json);
  return persistedMetadata?.uploadReservationClaim === claimToken ? "acquired" : "in_progress";
}

export async function reserveUploadAsset(
  db: D1DatabaseLike,
  input: RecordUploadAssetInput,
  options: ReserveUploadAssetOptions = {},
): Promise<ReservedUploadAsset> {
  const { createdAt, expiresAt } = uploadReservationTiming(options);
  const checksumSha256 = sha256Hex(input.checksumBytes);
  const targetEntityType = targetEntityValue(input.targetEntityType);
  const targetEntityId = targetEntityValue(input.targetEntityId);
  const projectId = projectIdForAsset(input);
  const estimateId = estimateIdForAsset(input);
  const { assetId, idempotencySha256, uploadSessionId } = uploadReservationIdentity(input);
  const reservationMetadata = uploadReservationMetadata(input, checksumSha256, targetEntityId, targetEntityType, idempotencySha256);
  const sessionStatement = reservedUploadSessionStatement(db,input,uploadSessionId,targetEntityType,targetEntityId,expiresAt,reservationMetadata.sessionMetadata,createdAt,checksumSha256);
  const retryStatement = retryableUploadSessionStatement(
    db,
    uploadSessionId,
    reservationMetadata.intentSha256,
    expiresAt,
    reservationMetadata.sessionMetadata,
    createdAt,
  );
  const eventStatement = reservedUploadEventStatement(db,input,uploadSessionId,expiresAt,createdAt);

  await runRequiredD1Batch(
    db,
    [sessionStatement, retryStatement, eventStatement],
    "Could not reserve the upload lifecycle atomically.",
  );

  const persisted = await readReservedUploadSession(db, uploadSessionId);
  if (!persisted || !exactReservedUploadIntent(persisted,input,targetEntityType,targetEntityId,checksumSha256,idempotencySha256,reservationMetadata.intentSha256)) {
    throw new Error("Upload idempotency identity is already in use for a different intent.");
  }
  if (persisted.status !== "reserved" && persisted.status !== "finalized") {
    throw new Error("Upload idempotency identity is no longer retryable.");
  }

  const reservationState = uploadReservationState(persisted, reservationMetadata.claimToken);
  const reservation: ReservedUploadAsset = {
    uploadSessionId,
    assetId,
    scanStatus: input.scanStatus,
    claimToken: reservationMetadata.claimToken,
    reservationState,
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
    metadataJson: reservationMetadata.assetMetadata,
    expiresAt: persisted.expires_at ?? expiresAt,
    createdAt: persisted.created_at,
  };
  if (reservationState !== "finalized") return reservation;
  const finalized = await readFinalizedReservedUploadAsset(db, reservation);
  if (!finalized) throw new Error("Finalized upload reservation has no matching durable asset.");
  return { ...reservation, ...finalized };
}

export async function finalizeReservedUploadAsset(
  db: D1DatabaseLike,
  reservation: ReservedUploadAsset,
  additionalStatements: D1PreparedStatementLike[] = [],
): Promise<RecordedUploadAsset> {
  const now = new Date().toISOString();
  const ownershipGuardStatement = db.prepare(`
    SELECT CASE WHEN EXISTS (
      SELECT 1
      FROM upload_sessions
      WHERE id = ?
        AND workspace_id = ?
        AND actor_user_id = ?
        AND status = 'reserved'
        AND expires_at > ?
        AND json_extract(metadata_json, '$.uploadReservationClaim') = ?
    ) THEN 1 ELSE json('') END AS upload_reservation_claim_guard
  `).bind(
    reservation.uploadSessionId,
    reservation.workspaceId,
    reservation.actorUserId,
    now,
    reservation.claimToken,
  );
  const sessionStatement = db.prepare(`
    UPDATE upload_sessions
    SET status = 'finalized',
        expires_at = NULL,
        updated_at = ?
    WHERE id = ?
      AND workspace_id = ?
      AND actor_user_id = ?
      AND status = 'reserved'
      AND expires_at > ?
      AND json_extract(metadata_json, '$.uploadReservationClaim') = ?
  `).bind(
    now,
    reservation.uploadSessionId,
    reservation.workspaceId,
    reservation.actorUserId,
    now,
    reservation.claimToken,
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
      [ownershipGuardStatement, sessionStatement, assetStatement, eventStatement, ...additionalStatements],
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
  const ownershipGuardStatement = db.prepare(`
    SELECT CASE WHEN EXISTS (
      SELECT 1
      FROM upload_sessions
      WHERE id = ?
        AND workspace_id = ?
        AND actor_user_id = ?
        AND status = 'reserved'
        AND json_extract(metadata_json, '$.uploadReservationClaim') = ?
    ) THEN 1 ELSE json('') END AS upload_reservation_claim_guard
  `).bind(
    reservation.uploadSessionId,
    reservation.workspaceId,
    reservation.actorUserId,
    reservation.claimToken,
  );
  const sessionStatement = db.prepare(`
    UPDATE upload_sessions
    SET status = 'failed',
        updated_at = ?
    WHERE id = ?
      AND workspace_id = ?
      AND actor_user_id = ?
      AND status = 'reserved'
      AND json_extract(metadata_json, '$.uploadReservationClaim') = ?
  `).bind(
    now,
    reservation.uploadSessionId,
    reservation.workspaceId,
    reservation.actorUserId,
    reservation.claimToken,
  );
  const assetStatement = db.prepare(`
    INSERT OR IGNORE INTO upload_assets (
      id, workspace_id, actor_user_id, project_id, estimate_id,
      upload_session_id, surface, target_entity_type, target_entity_id,
      status, file_name, content_type, size_bytes, checksum_sha256,
      scan_status, storage_bucket, storage_path, thumbnail_path,
      metadata_json, created_at, updated_at
    )
    SELECT ?, ?, ?, ?, ?, ?, ?, ?, ?, 'failed', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?
    WHERE EXISTS (
      SELECT 1 FROM upload_sessions
      WHERE id = ? AND workspace_id = ? AND actor_user_id = ? AND status = 'failed'
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
    SELECT ?, ?, ?, ?, ?, 'upload_failed', ?, ?
    WHERE EXISTS (
      SELECT 1
      FROM upload_sessions
      WHERE id = ?
        AND status = 'failed'
    )
  `).bind(
    randomUUID(),
    reservation.uploadSessionId,
    reservation.assetId,
    reservation.workspaceId,
    reservation.actorUserId,
    metadataJson({ failureStage }),
    now,
    reservation.uploadSessionId,
  );

  await runRequiredD1Batch(
    db,
    [ownershipGuardStatement, sessionStatement, assetStatement, eventStatement],
    "Could not retain the failed upload lifecycle.",
  );
}

export async function renewReservedUploadCleanupLease(
  db: D1DatabaseLike,
  reservation: ReservedUploadAsset,
  options: { now?: Date; expiresAt?: string } = {},
) {
  const now = options.now ?? new Date();
  const nowIso = now.toISOString();
  const expiresAt = options.expiresAt
    ?? new Date(now.getTime() + RESERVED_UPLOAD_CLEANUP_LEASE_MS).toISOString();
  if (!Number.isFinite(Date.parse(expiresAt)) || Date.parse(expiresAt) <= now.getTime()) {
    throw new Error("Upload cleanup lease expiry must be in the future.");
  }
  const ownershipGuardStatement = db.prepare(`
    SELECT CASE WHEN EXISTS (
      SELECT 1 FROM upload_sessions
      WHERE id = ?
        AND workspace_id = ?
        AND actor_user_id = ?
        AND status = 'reserved'
        AND json_extract(metadata_json, '$.uploadReservationClaim') = ?
    ) THEN 1 ELSE json('') END AS upload_cleanup_claim_guard
  `).bind(
    reservation.uploadSessionId,
    reservation.workspaceId,
    reservation.actorUserId,
    reservation.claimToken,
  );
  const leaseStatement = db.prepare(`
    UPDATE upload_sessions
    SET expires_at = ?, updated_at = ?
    WHERE id = ?
      AND workspace_id = ?
      AND actor_user_id = ?
      AND status = 'reserved'
      AND json_extract(metadata_json, '$.uploadReservationClaim') = ?
  `).bind(
    expiresAt,
    nowIso,
    reservation.uploadSessionId,
    reservation.workspaceId,
    reservation.actorUserId,
    reservation.claimToken,
  );
  await runRequiredD1Batch(
    db,
    [ownershipGuardStatement, leaseStatement],
    "Could not fence the upload cleanup lifecycle.",
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
