import { createHash } from "node:crypto";

import type { Json } from "@/lib/supabase/types";

import type { UploadSurface } from "./policy";

type UploadRecordClient = {
  rpc: (
    functionName: string,
    args: Record<string, unknown>,
  ) => PromiseLike<{ data: unknown; error: { message?: string | null } | null }>;
};

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

function isRecordedUploadAsset(value: unknown): value is RecordedUploadAsset {
  if (!value || typeof value !== "object") return false;
  const record = value as Partial<RecordedUploadAsset>;
  return (
    typeof record.uploadSessionId === "string"
    && typeof record.assetId === "string"
    && (record.scanStatus === "not_required" || record.scanStatus === "pending")
  );
}

export async function recordUploadAsset(
  client: unknown,
  input: RecordUploadAssetInput,
): Promise<RecordedUploadAsset> {
  const checksumSha256 = sha256Hex(input.checksumBytes);
  const metadata = input.metadata ?? {};

  const { data, error } = await (client as UploadRecordClient).rpc("record_upload_asset", {
    target_workspace_id: input.workspaceId,
    actor_user_id: input.actorUserId,
    upload_surface: input.surface,
    target_entity_type: input.targetEntityType ?? null,
    target_entity_id: input.targetEntityId ?? null,
    storage_bucket: input.bucket,
    storage_path: input.path,
    thumbnail_path: input.thumbnailPath ?? null,
    file_name: input.fileName,
    content_type: input.contentType,
    size_bytes: input.sizeBytes,
    checksum_sha256: checksumSha256,
    scan_status: input.scanStatus,
    metadata,
  });

  if (error) throw new Error(error.message ?? "Could not record upload asset.");
  if (!isRecordedUploadAsset(data)) throw new Error("Upload record response was invalid.");
  return data;
}
