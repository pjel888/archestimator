import { createHash, randomUUID } from "node:crypto";

import type { D1DatabaseLike } from "@/lib/cloudflare/d1";
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
