import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

import { requireCurrentUserContext } from "@/lib/auth/session";
import { isUuid } from "@/lib/ids";
import { ensureDefaultWorkspace } from "@/lib/repositories/workspace-repository";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { Database } from "@/lib/supabase/types";
import { reserveUploadAdmission } from "@/lib/uploads/admission-control";
import {
  finalizeUploadSessionAsset,
  isUploadSessionCapacityExceededError,
  readActiveUploadSessionCapacity,
  readUploadSessionForFinalize,
  recordPendingUploadSession,
} from "@/lib/uploads/direct-upload-records";
import { buildUploadObjectKey } from "@/lib/uploads/object-keys";
import { reportUploadAdmissionRejected } from "@/lib/uploads/operational-telemetry";
import {
  createSupabaseDirectUploadProvider,
  validateProviderObjectHead,
} from "@/lib/uploads/provider-portability";
import { readRuntimeUploadStorageProvider } from "@/lib/uploads/runtime-storage-provider";
import { chooseUploadSessionStrategy } from "@/lib/uploads/session-strategy";

export const runtime = "nodejs";

const COMPONENT_ATTACHMENT_BUCKET = "component-attachments";
const FINALIZE_ROUTE = "/api/component-library/attachments/direct-upload";
const MULTIPART_THRESHOLD_BYTES = 64 * 1024 * 1024;
const SIGNED_SINGLE_PART_MAX_BYTES = MULTIPART_THRESHOLD_BYTES - 1;
const RESUMABLE_COMPONENT_ATTACHMENT_MAX_BYTES = 512 * 1024 * 1024;
const DIRECT_UPLOAD_SESSION_EXPIRES_SECONDS = 300;
const MAX_RESERVED_DIRECT_UPLOAD_SESSIONS_PER_ACTOR = 3;
const MAX_RESERVED_DIRECT_UPLOAD_SESSIONS_PER_WORKSPACE = 6;
const ALLOWED_MIME_TYPES = new Set([
  "application/pdf",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
]);

const EXTENSION_BY_MIME_TYPE = new Map([
  ["application/pdf", "pdf"],
  ["application/vnd.ms-excel", "xls"],
  ["application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", "xlsx"],
]);

function jsonError(message: string, status = 400, headers?: HeadersInit) {
  return NextResponse.json({ error: message }, { status, headers });
}

async function createStorageSupabaseClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (url && serviceRoleKey) {
    return createClient<Database>(url, serviceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
      global: {
        headers: {
          "X-Client-Info": "archestimator-component-attachment-direct-upload",
        },
      },
    });
  }

  return createSupabaseServerClient();
}

async function canManageLibrary(workspaceId: string) {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.rpc("is_workspace_editor", {
    target_workspace_id: workspaceId,
  });
  if (error) {
    console.error("Component attachment direct-upload authorization failed", error);
    return false;
  }
  return data === true;
}

function normalizeChecksumSha256(value: unknown) {
  if (value === null || value === undefined || value === "") return null;
  if (typeof value !== "string" || !/^[a-f0-9]{64}$/i.test(value.trim())) {
    return { error: "Checksum must be a SHA-256 hex string." } as const;
  }
  return value.trim().toLowerCase();
}

function readSizeBytes(value: unknown) {
  const sizeBytes = Number(value);
  if (!Number.isSafeInteger(sizeBytes) || sizeBytes <= 0) return null;
  return sizeBytes;
}

function uploadModeFromSessionMetadata(metadata: unknown) {
  if (!metadata || typeof metadata !== "object" || Array.isArray(metadata)) return "signed_single_part";
  const uploadMode = (metadata as { uploadMode?: unknown }).uploadMode;
  return uploadMode === "tus_resumable" ? "tus_resumable" : "signed_single_part";
}

async function readJsonBody(request: Request) {
  return request.json().catch(() => null) as Promise<Record<string, unknown> | null>;
}

function directUploadCapacityMessage(quotaClass: "active_actor" | "active_workspace") {
  if (quotaClass === "active_actor") {
    return "Too many attachment upload sessions are already reserved. Finish or retry after one expires.";
  }
  return "Attachment upload capacity is busy for this workspace. Wait for an upload session to finish or expire.";
}

function directUploadStorageProviderUnsupportedResponse() {
  return jsonError("Direct attachment uploads are not supported by the selected storage provider.", 501);
}

function directUploadCapacityResponse(input: {
  workspaceId: string;
  quotaClass: "active_actor" | "active_workspace";
  retryAfterSeconds: number;
}) {
  reportUploadAdmissionRejected({
    surface: "component-attachment",
    workspaceId: input.workspaceId,
    quotaClass: input.quotaClass,
    retryAfterSeconds: input.retryAfterSeconds,
  });
  return jsonError(directUploadCapacityMessage(input.quotaClass), 429, {
    "Retry-After": String(input.retryAfterSeconds),
  });
}

async function checkDurableDirectUploadCapacity(client: unknown, input: { workspaceId: string; userId: string }) {
  const capacity = await readActiveUploadSessionCapacity(client, {
    workspaceId: input.workspaceId,
    actorUserId: input.userId,
    surface: "component-attachment",
  });

  if (capacity.actorCount >= MAX_RESERVED_DIRECT_UPLOAD_SESSIONS_PER_ACTOR) {
    return {
      allowed: false,
      response: directUploadCapacityResponse({
        workspaceId: input.workspaceId,
        quotaClass: "active_actor",
        retryAfterSeconds: capacity.actorRetryAfterSeconds,
      }),
    } as const;
  }

  if (capacity.workspaceCount >= MAX_RESERVED_DIRECT_UPLOAD_SESSIONS_PER_WORKSPACE) {
    return {
      allowed: false,
      response: directUploadCapacityResponse({
        workspaceId: input.workspaceId,
        quotaClass: "active_workspace",
        retryAfterSeconds: capacity.workspaceRetryAfterSeconds,
      }),
    } as const;
  }

  return { allowed: true } as const;
}

async function recordPendingDirectUploadSession(
  client: unknown,
  input: Parameters<typeof recordPendingUploadSession>[1],
) {
  try {
    return { ok: true, session: await recordPendingUploadSession(client, input) } as const;
  } catch (error) {
    if (!isUploadSessionCapacityExceededError(error)) throw error;
    return {
      ok: false,
      response: directUploadCapacityResponse({
        workspaceId: input.workspaceId,
        quotaClass: error.quotaClass,
        retryAfterSeconds: DIRECT_UPLOAD_SESSION_EXPIRES_SECONDS,
      }),
    } as const;
  }
}

async function createSignedUpload(
  request: Request,
  workspaceId: string,
  userId: string,
  body: Record<string, unknown> | null,
) {
  const admission = reserveUploadAdmission({ surface: "component-attachment", workspaceId, userId, request });
  if (!admission.allowed) {
    return jsonError(admission.message, 429, { "Retry-After": String(admission.retryAfter) });
  }

  try {
    const fileName = typeof body?.fileName === "string" ? body.fileName.trim() : "";
    const contentType = typeof body?.contentType === "string" ? body.contentType.trim() : "";
    const sizeBytes = readSizeBytes(body?.sizeBytes);
    const checksumSha256 = normalizeChecksumSha256(body?.checksumSha256);

    if (!fileName) return jsonError("Attachment file name is required.");
    if (!ALLOWED_MIME_TYPES.has(contentType)) return jsonError("Use a PDF, XLS, or XLSX attachment.");
    if (sizeBytes === null) return jsonError("Attachment size is required.");
    if (checksumSha256 && typeof checksumSha256 === "object") return jsonError(checksumSha256.error);

    const strategy = chooseUploadSessionStrategy({
      surface: "component-attachment",
      sizeBytes,
      multipartThresholdBytes: MULTIPART_THRESHOLD_BYTES,
    });
    if (strategy.kind === "server_mediated") {
      return jsonError("Use the standard attachment upload for files up to 20 MB.", 409);
    }
    if (strategy.kind === "rejected") {
      return jsonError("Attachment upload is too large or missing required size information.", 413);
    }
    if (readRuntimeUploadStorageProvider() !== "supabase") {
      return directUploadStorageProviderUnsupportedResponse();
    }

    const extension = EXTENSION_BY_MIME_TYPE.get(contentType);
    if (!extension) return jsonError("Use a PDF, XLS, or XLSX attachment.");

    const path = buildUploadObjectKey({
      surface: "component-attachment",
      workspaceId,
      userId,
      fileName,
      extension,
    });
    const supabase = await createStorageSupabaseClient();
    const provider = createSupabaseDirectUploadProvider(supabase);
    const durableCapacity = await checkDurableDirectUploadCapacity(supabase, { workspaceId, userId });
    if (!durableCapacity.allowed) {
      return durableCapacity.response;
    }

    if (strategy.kind === "multipart_resumable") {
      if (!provider.createTusResumableUploadSession) {
        return jsonError("Resumable attachment uploads are not supported by this storage provider.", 501);
      }

      const tusSession = await provider.createTusResumableUploadSession({
        bucket: COMPONENT_ATTACHMENT_BUCKET,
        path,
        contentType,
        sizeBytes,
        maxBytes: RESUMABLE_COMPONENT_ATTACHMENT_MAX_BYTES,
        checksumSha256: typeof checksumSha256 === "string" ? checksumSha256 : null,
        expiresInSeconds: DIRECT_UPLOAD_SESSION_EXPIRES_SECONDS,
      });
      const pendingSessionResult = await recordPendingDirectUploadSession(supabase, {
        workspaceId,
        actorUserId: userId,
        surface: "component-attachment",
        targetEntityType: "component-library",
        targetEntityId: null,
        bucket: COMPONENT_ATTACHMENT_BUCKET,
        path,
        fileName,
        contentType,
        sizeBytes,
        checksumSha256: typeof checksumSha256 === "string" ? checksumSha256 : null,
        expiresAt: tusSession.expiresAt,
        metadata: {
          provider: "supabase-storage",
          uploadMode: "tus_resumable",
          route: "component-attachment-direct-upload",
          chunkSizeBytes: tusSession.chunkSizeBytes,
        },
      });
      if (!pendingSessionResult.ok) return pendingSessionResult.response;
      const pendingSession = pendingSessionResult.session;

      return NextResponse.json({
        provider: "supabase-storage",
        uploadMode: "tus_resumable",
        uploadSessionId: pendingSession.uploadSessionId,
        bucket: COMPONENT_ATTACHMENT_BUCKET,
        path,
        fileName,
        contentType,
        sizeBytes,
        checksumSha256: typeof checksumSha256 === "string" ? checksumSha256 : null,
        endpoint: tusSession.endpoint,
        uploadToken: tusSession.uploadToken,
        uploadMetadata: tusSession.uploadMetadata,
        chunkSizeBytes: tusSession.chunkSizeBytes,
        expiresAt: pendingSession.expiresAt,
        requiresFinalizeRpc: true,
        finalizeUrl: FINALIZE_ROUTE,
        scanStatus: "pending",
      });
    }

    const signedSession = await provider.createSignedUploadSession({
      bucket: COMPONENT_ATTACHMENT_BUCKET,
      path,
      contentType,
      sizeBytes,
      maxBytes: SIGNED_SINGLE_PART_MAX_BYTES,
      checksumSha256: typeof checksumSha256 === "string" ? checksumSha256 : null,
      expiresInSeconds: strategy.expiresInSeconds,
    });
    const pendingSessionResult = await recordPendingDirectUploadSession(supabase, {
      workspaceId,
      actorUserId: userId,
      surface: "component-attachment",
      targetEntityType: "component-library",
      targetEntityId: null,
      bucket: COMPONENT_ATTACHMENT_BUCKET,
      path,
      fileName,
      contentType,
      sizeBytes,
      checksumSha256: typeof checksumSha256 === "string" ? checksumSha256 : null,
      expiresAt: signedSession.expiresAt,
      metadata: {
        provider: "supabase-storage",
        uploadMode: "signed_single_part",
        route: "component-attachment-direct-upload",
      },
    });
    if (!pendingSessionResult.ok) return pendingSessionResult.response;
    const pendingSession = pendingSessionResult.session;

    return NextResponse.json({
      provider: "supabase-storage",
      uploadMode: "signed_single_part",
      uploadSessionId: pendingSession.uploadSessionId,
      bucket: COMPONENT_ATTACHMENT_BUCKET,
      path,
      fileName,
      contentType,
      sizeBytes,
      checksumSha256: typeof checksumSha256 === "string" ? checksumSha256 : null,
      uploadUrl: signedSession.uploadUrl,
      method: signedSession.method,
      expiresAt: pendingSession.expiresAt,
      requiresFinalizeRpc: true,
      finalizeUrl: FINALIZE_ROUTE,
      scanStatus: "pending",
    });
  } finally {
    admission.release();
  }
}

async function finalizeSignedUpload(workspaceId: string, userId: string, body: Record<string, unknown> | null) {
  const uploadSessionId = typeof body?.uploadSessionId === "string" ? body.uploadSessionId.trim() : "";
  if (!isUuid(uploadSessionId)) return jsonError("Upload session is required.");

  const supabase = await createStorageSupabaseClient();
  const session = await readUploadSessionForFinalize(supabase, { uploadSessionId, workspaceId, actorUserId: userId });
  if (!session) return jsonError("Upload session could not be found.", 404);
  if (session.surface !== "component-attachment" || session.storage_bucket !== COMPONENT_ATTACHMENT_BUCKET) {
    return jsonError("Upload session does not match component attachments.", 409);
  }
  if (session.status === "failed" || session.status === "expired" || session.status === "deleted") {
    return jsonError("Upload session is no longer active.", 409);
  }

  if (session.status === "finalized") {
    const existingRecord = await finalizeUploadSessionAsset(supabase, {
      uploadSessionId,
      workspaceId,
      actorUserId: userId,
      observedContentType: session.content_type,
      observedSizeBytes: session.size_bytes,
      observedChecksumSha256: session.checksum_sha256,
      observedEtag: null,
      scanStatus: "pending",
    });
    return NextResponse.json({
      bucket: session.storage_bucket,
      uploadSessionId: existingRecord.uploadSessionId,
      assetId: existingRecord.assetId,
      scanStatus: existingRecord.scanStatus,
      path: session.storage_path,
      fileName: session.file_name,
      contentType: session.content_type,
      sizeBytes: session.size_bytes,
      providerProof: "already_finalized",
    });
  }

  if (session.expires_at && Date.parse(session.expires_at) <= Date.now()) {
    return jsonError("Upload session expired.", 410);
  }

  const provider = createSupabaseDirectUploadProvider(supabase);
  const head = await provider.headObject({ bucket: session.storage_bucket, path: session.storage_path }).catch(() => null);
  if (!head) return jsonError("Uploaded object could not be finalized.", 409);
  const uploadMode = uploadModeFromSessionMetadata(session.metadata);
  const validation = validateProviderObjectHead({
    bucket: session.storage_bucket,
    path: session.storage_path,
    contentType: session.content_type,
    sizeBytes: session.size_bytes,
    maxBytes: uploadMode === "tus_resumable" ? RESUMABLE_COMPONENT_ATTACHMENT_MAX_BYTES : SIGNED_SINGLE_PART_MAX_BYTES,
    checksumSha256: session.checksum_sha256,
  }, head);
  if (!validation.ok) return jsonError("Uploaded object could not be finalized.", 409);

  const uploadRecord = await finalizeUploadSessionAsset(supabase, {
    uploadSessionId,
    workspaceId,
    actorUserId: userId,
    observedContentType: head.contentType,
    observedSizeBytes: head.sizeBytes,
    observedChecksumSha256: head.checksumSha256 ?? null,
    observedEtag: head.etag ?? null,
    scanStatus: "pending",
    metadata: {
      provider: "supabase-storage",
      uploadMode,
      providerFinalizeProof: validation.proof,
    },
  });

  return NextResponse.json({
    bucket: session.storage_bucket,
    uploadSessionId: uploadRecord.uploadSessionId,
    assetId: uploadRecord.assetId,
    scanStatus: uploadRecord.scanStatus,
    path: session.storage_path,
    fileName: session.file_name,
    contentType: session.content_type,
    sizeBytes: session.size_bytes,
    providerProof: validation.proof,
  });
}

export async function POST(request: Request) {
  const [{ workspace }, currentUser] = await Promise.all([ensureDefaultWorkspace(), requireCurrentUserContext()]);
  if (!(await canManageLibrary(workspace.id))) {
    return jsonError("Only workspace editors/admins can manage the library.", 403);
  }

  const body = await readJsonBody(request);
  if (body?.action === "create") return createSignedUpload(request, workspace.id, currentUser.userId, body);
  if (body?.action === "finalize") return finalizeSignedUpload(workspace.id, currentUser.userId, body);
  return jsonError("Unsupported direct upload action.");
}
