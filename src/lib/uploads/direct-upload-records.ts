import type { Json } from "@/lib/supabase/types";

import type { UploadSurface } from "./policy";
import type { RecordedUploadAsset, UploadScanStatus } from "./upload-records";

type RpcClient = {
  rpc: (
    functionName: string,
    args: Record<string, unknown>,
  ) => PromiseLike<{ data: unknown; error: { message?: string | null } | null }>;
};

type UploadSessionQuery<T> = {
  select: (columns: string) => UploadSessionQuery<T>;
  eq: (column: string, value: unknown) => UploadSessionQuery<T>;
  maybeSingle: () => PromiseLike<{ data: T | null; error: { message?: string | null } | null }>;
};

type UploadSessionReadClient = {
  from: (table: "upload_sessions") => UploadSessionQuery<UploadSessionForFinalize>;
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
};

export type PendingUploadSessionRecord = {
  uploadSessionId: string;
  expiresAt: string;
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

function isPendingUploadSessionRecord(value: unknown): value is PendingUploadSessionRecord {
  if (!value || typeof value !== "object") return false;
  const record = value as Partial<PendingUploadSessionRecord>;
  return typeof record.uploadSessionId === "string" && typeof record.expiresAt === "string";
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

export async function recordPendingUploadSession(
  client: unknown,
  input: RecordPendingUploadSessionInput,
): Promise<PendingUploadSessionRecord> {
  const { data, error } = await (client as RpcClient).rpc("create_upload_session", {
    target_workspace_id: input.workspaceId,
    actor_user_id: input.actorUserId,
    upload_surface: input.surface,
    target_entity_type: input.targetEntityType ?? null,
    target_entity_id: input.targetEntityId ?? null,
    storage_bucket: input.bucket,
    storage_path: input.path,
    file_name: input.fileName,
    content_type: input.contentType,
    size_bytes: input.sizeBytes,
    checksum_sha256: input.checksumSha256 ?? null,
    session_expires_at: input.expiresAt,
    metadata: input.metadata ?? {},
  });

  if (error) throw new Error(error.message ?? "Could not create upload session.");
  if (!isPendingUploadSessionRecord(data)) throw new Error("Upload session response was invalid.");
  return data;
}

export async function readUploadSessionForFinalize(
  client: unknown,
  input: { uploadSessionId: string; workspaceId: string; actorUserId: string },
): Promise<UploadSessionForFinalize | null> {
  const { data, error } = await (client as UploadSessionReadClient)
    .from("upload_sessions")
    .select("id, workspace_id, actor_user_id, surface, target_entity_type, target_entity_id, storage_bucket, storage_path, file_name, content_type, size_bytes, checksum_sha256, status, expires_at, metadata")
    .eq("id", input.uploadSessionId)
    .eq("workspace_id", input.workspaceId)
    .eq("actor_user_id", input.actorUserId)
    .maybeSingle();

  if (error) throw new Error(error.message ?? "Could not read upload session.");
  return data;
}

export async function finalizeUploadSessionAsset(
  client: unknown,
  input: FinalizeUploadSessionInput,
): Promise<RecordedUploadAsset> {
  const { data, error } = await (client as RpcClient).rpc("finalize_upload_session", {
    target_upload_session_id: input.uploadSessionId,
    target_workspace_id: input.workspaceId,
    actor_user_id: input.actorUserId,
    observed_content_type: input.observedContentType,
    observed_size_bytes: input.observedSizeBytes,
    observed_checksum_sha256: input.observedChecksumSha256 ?? null,
    observed_etag: input.observedEtag ?? null,
    scan_status: input.scanStatus,
    metadata: input.metadata ?? {},
  });

  if (error) throw new Error(error.message ?? "Could not finalize upload session.");
  if (!isRecordedUploadAsset(data)) throw new Error("Upload finalization response was invalid.");
  return data;
}
