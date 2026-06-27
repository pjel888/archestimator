import type { Json } from "@/lib/supabase/types";

import type { UploadSurface } from "./policy";
import type { RecordedUploadAsset, UploadScanStatus } from "./upload-records";

type RpcClient = {
  rpc: (
    functionName: string,
    args: Record<string, unknown>,
  ) => PromiseLike<{ data: unknown; error: { message?: string | null; code?: string | null } | null }>;
};

type UploadSessionQuery<T> = {
  select: (columns: string) => UploadSessionQuery<T>;
  eq: (column: string, value: unknown) => UploadSessionQuery<T>;
  maybeSingle: () => PromiseLike<{ data: T | null; error: { message?: string | null } | null }>;
};

type UploadSessionReadClient = {
  from: (table: "upload_sessions") => UploadSessionQuery<UploadSessionForFinalize>;
};

type ActiveUploadSessionQuery = {
  select: (columns: string) => ActiveUploadSessionQuery;
  eq: (column: string, value: unknown) => ActiveUploadSessionQuery;
  gt: (column: string, value: unknown) => PromiseLike<{ data: ActiveUploadSessionRow[] | null; error: { message?: string | null } | null }>;
};

type ActiveUploadSessionReadClient = {
  from: (table: "upload_sessions") => ActiveUploadSessionQuery;
};

type ActiveUploadSessionRow = {
  expires_at: string | null;
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

function capacityQuotaClassFromRpcError(error: { message?: string | null } | null) {
  const message = error?.message ?? "";
  if (message.includes("Upload direct session actor capacity exceeded.")) return "active_actor" as const;
  if (message.includes("Upload direct session workspace capacity exceeded.")) return "active_workspace" as const;
  return null;
}

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

async function readReservedUploadSessions(
  client: unknown,
  input: {
    workspaceId: string;
    actorUserId?: string;
    surface: UploadSurface;
    now: Date;
  },
) {
  let query = (client as ActiveUploadSessionReadClient)
    .from("upload_sessions")
    .select("expires_at")
    .eq("workspace_id", input.workspaceId)
    .eq("surface", input.surface)
    .eq("status", "reserved");

  if (input.actorUserId) {
    query = query.eq("actor_user_id", input.actorUserId);
  }

  const { data, error } = await query.gt("expires_at", input.now.toISOString());
  if (error) throw new Error(error.message ?? "Could not read active upload sessions.");
  return data ?? [];
}

export async function readActiveUploadSessionCapacity(
  client: unknown,
  input: {
    workspaceId: string;
    actorUserId: string;
    surface: UploadSurface;
    now?: Date;
  },
): Promise<ActiveUploadSessionCapacity> {
  const now = input.now ?? new Date();
  const [actorRows, workspaceRows] = await Promise.all([
    readReservedUploadSessions(client, { ...input, now }),
    readReservedUploadSessions(client, {
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

  if (error) {
    const quotaClass = capacityQuotaClassFromRpcError(error);
    if (quotaClass) throw new UploadSessionCapacityExceededError(quotaClass, error.message);
    throw new Error(error.message ?? "Could not create upload session.");
  }
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
