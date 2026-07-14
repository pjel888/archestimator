import { NextResponse } from "next/server";

import { requireCurrentUserContext, type CurrentUserContext } from "@/lib/auth/session";
import { canEditProjectInD1, isWorkspaceEditorInD1, readProjectFromD1 } from "@/lib/authz/d1-access";
import { getCloudflareD1Database, type D1DatabaseLike } from "@/lib/cloudflare/d1";
import { isUuid } from "@/lib/ids";
import { logAppError } from "@/lib/observability/logger";
import { ensureDefaultWorkspace } from "@/lib/repositories/workspace-repository";
import { reserveUploadAdmission } from "@/lib/uploads/admission-control";
import {
  finalizeUploadSessionAsset,
  isUploadSessionCapacityExceededError,
  readActiveUploadSessionCapacity,
  readUploadSessionForActor,
  recordPendingUploadSession,
  type UploadSessionForFinalize,
} from "@/lib/uploads/direct-upload-records";
import { buildUploadObjectKey } from "@/lib/uploads/object-keys";
import { reportUploadAdmissionRejected } from "@/lib/uploads/operational-telemetry";
import { validateProviderObjectHead } from "@/lib/uploads/provider-portability";
import {
  createRuntimeUploadStorageProvider,
  readRuntimeUploadStorageProvider,
} from "@/lib/uploads/runtime-storage-provider";
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
const CLOUDFLARE_R2_PROVIDER = "cloudflare-r2";
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

type AttachmentUploadTarget = {
  ownerScope: "library" | "project";
  workspaceId: string;
  targetEntityType: "component-library" | "project-component";
  targetEntityId: string | null;
  projectId: string | null;
  projectComponentId: string | null;
};

function jsonError(message: string, status = 400, headers?: HeadersInit) {
  return NextResponse.json({ error: message }, { status, headers });
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

function storageProviderFromSessionMetadata(metadata: unknown) {
  if (!metadata || typeof metadata !== "object" || Array.isArray(metadata)) return null;
  const provider = (metadata as { provider?: unknown }).provider;
  return typeof provider === "string" ? provider : null;
}

function stringFromSessionMetadata(metadata: unknown, key: string) {
  if (!metadata || typeof metadata !== "object" || Array.isArray(metadata)) return null;
  const value = (metadata as Record<string, unknown>)[key];
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function optionalUuid(value: unknown) {
  if (value === undefined || value === null || value === "") return { valid: true, value: null } as const;
  if (typeof value !== "string") return { valid: false, value: null } as const;
  const normalized = value.trim();
  if (!normalized) return { valid: true, value: null } as const;
  return isUuid(normalized)
    ? { valid: true, value: normalized } as const
    : { valid: false, value: null } as const;
}

function readRequestedProjectTarget(body: Record<string, unknown> | null) {
  const projectId = optionalUuid(body?.projectId);
  const projectComponentId = optionalUuid(body?.projectComponentId);
  if (!projectId.valid || !projectComponentId.valid) return null;
  if (Boolean(projectId.value) !== Boolean(projectComponentId.value)) return null;
  return {
    projectId: projectId.value,
    projectComponentId: projectComponentId.value,
  };
}

async function resolveCreateUploadTarget(
  db: D1DatabaseLike,
  currentUser: CurrentUserContext,
  body: Record<string, unknown> | null,
): Promise<{ target: AttachmentUploadTarget; response?: never } | { target?: never; response: Response }> {
  const requestedTarget = readRequestedProjectTarget(body);
  if (!requestedTarget) {
    return { response: jsonError("Project component upload target is invalid.") };
  }

  if (!requestedTarget.projectId || !requestedTarget.projectComponentId) {
    const { workspace } = await ensureDefaultWorkspace();
    const canManageLibrary = await isWorkspaceEditorInD1(db, workspace.id, currentUser);
    if (!canManageLibrary) {
      return { response: jsonError("Only workspace editors/admins can manage the library.", 403) };
    }
    return {
      target: {
        ownerScope: "library",
        workspaceId: workspace.id,
        targetEntityType: "component-library",
        targetEntityId: null,
        projectId: null,
        projectComponentId: null,
      },
    };
  }

  const project = await readProjectFromD1(db, requestedTarget.projectId).catch(() => null);
  const canEditProject = project
    ? await canEditProjectInD1(db, requestedTarget.projectId, currentUser)
    : false;
  if (!project || !canEditProject) {
    return { response: jsonError("Project edit access is required to upload this attachment.", 403) };
  }

  return {
    target: {
      ownerScope: "project",
      workspaceId: project.workspace_id,
      targetEntityType: "project-component",
      targetEntityId: requestedTarget.projectComponentId,
      projectId: requestedTarget.projectId,
      projectComponentId: requestedTarget.projectComponentId,
    },
  };
}

function readSessionUploadTarget(session: UploadSessionForFinalize): AttachmentUploadTarget | null {
  if (session.target_entity_type === "component-library") {
    if (session.target_entity_id?.trim()) return null;
    return {
      ownerScope: "library",
      workspaceId: session.workspace_id,
      targetEntityType: "component-library",
      targetEntityId: null,
      projectId: null,
      projectComponentId: null,
    };
  }

  if (session.target_entity_type !== "project-component") return null;
  const projectId = stringFromSessionMetadata(session.metadata, "projectId");
  const projectComponentId = session.target_entity_id?.trim() ?? "";
  const metadataProjectComponentId = stringFromSessionMetadata(session.metadata, "projectComponentId");
  if (!projectId || !isUuid(projectId) || !isUuid(projectComponentId)) return null;
  if (metadataProjectComponentId && metadataProjectComponentId !== projectComponentId) return null;
  return {
    ownerScope: "project",
    workspaceId: session.workspace_id,
    targetEntityType: "project-component",
    targetEntityId: projectComponentId,
    projectId,
    projectComponentId,
  };
}

async function canManageUploadTarget(
  db: D1DatabaseLike,
  currentUser: CurrentUserContext,
  target: AttachmentUploadTarget,
) {
  if (target.ownerScope === "library") {
    return isWorkspaceEditorInD1(db, target.workspaceId, currentUser);
  }
  const project = await readProjectFromD1(db, target.projectId!).catch(() => null);
  if (!project || project.workspace_id !== target.workspaceId) return false;
  return canEditProjectInD1(db, target.projectId!, currentUser);
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
  return jsonError("Direct attachment uploads require Cloudflare R2 storage.", 501);
}

function directUploadMetadataUnavailableResponse() {
  return jsonError("Cloudflare D1 upload metadata is not configured.", 503);
}

function isCloudflareR2RuntimeSelected() {
  try {
    return readRuntimeUploadStorageProvider() === CLOUDFLARE_R2_PROVIDER;
  } catch {
    return false;
  }
}

async function openUploadMetadataDatabase() {
  return getCloudflareD1Database();
}

function cloudflareDirectUploadUrl(request: Request, uploadSessionId: string) {
  const uploadUrl = new URL(FINALIZE_ROUTE, request.url);
  uploadUrl.searchParams.set("uploadSessionId", uploadSessionId);
  return uploadUrl.toString();
}

function uploadSessionExpiresAt(expiresInSeconds: number) {
  return new Date(Date.now() + expiresInSeconds * 1000).toISOString();
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

async function checkDurableDirectUploadCapacity(db: D1DatabaseLike, input: { workspaceId: string; userId: string }) {
  const capacity = await readActiveUploadSessionCapacity(db, {
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
  db: D1DatabaseLike,
  input: Parameters<typeof recordPendingUploadSession>[1],
) {
  try {
    return {
      ok: true,
      session: await recordPendingUploadSession(db, {
        ...input,
        capacity: {
          maxActiveActorSessions: MAX_RESERVED_DIRECT_UPLOAD_SESSIONS_PER_ACTOR,
          maxActiveWorkspaceSessions: MAX_RESERVED_DIRECT_UPLOAD_SESSIONS_PER_WORKSPACE,
        },
      }),
    } as const;
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
  currentUser: CurrentUserContext,
  body: Record<string, unknown> | null,
) {
  const userId = currentUser.userId;
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

  if (!isCloudflareR2RuntimeSelected()) {
    return directUploadStorageProviderUnsupportedResponse();
  }
  if (strategy.kind === "multipart_resumable") {
    return jsonError("Resumable attachment uploads need Cloudflare R2 multipart support before they can be enabled.", 501);
  }

  const extension = EXTENSION_BY_MIME_TYPE.get(contentType);
  if (!extension) return jsonError("Use a PDF, XLS, or XLSX attachment.");

  const db = await openUploadMetadataDatabase();
  if (!db) return directUploadMetadataUnavailableResponse();
  const targetResult = await resolveCreateUploadTarget(db, currentUser, body);
  if (!targetResult.target) return targetResult.response;
  const target = targetResult.target;
  const workspaceId = target.workspaceId;
  const admission = reserveUploadAdmission({ surface: "component-attachment", workspaceId, userId, request });
  if (!admission.allowed) {
    return jsonError(admission.message, 429, { "Retry-After": String(admission.retryAfter) });
  }

  try {
    const path = buildUploadObjectKey({
      surface: "component-attachment",
      workspaceId,
      userId,
      fileName,
      extension,
    });
    const durableCapacity = await checkDurableDirectUploadCapacity(db, { workspaceId, userId });
    if (!durableCapacity.allowed) {
      return durableCapacity.response;
    }

    const expiresAt = uploadSessionExpiresAt(strategy.expiresInSeconds);
    const pendingSessionResult = await recordPendingDirectUploadSession(db, {
      workspaceId,
      actorUserId: userId,
      surface: "component-attachment",
      targetEntityType: target.targetEntityType,
      targetEntityId: target.targetEntityId,
      bucket: COMPONENT_ATTACHMENT_BUCKET,
      path,
      fileName,
      contentType,
      sizeBytes,
      checksumSha256: typeof checksumSha256 === "string" ? checksumSha256 : null,
      expiresAt,
      metadata: {
        provider: CLOUDFLARE_R2_PROVIDER,
        uploadMode: "signed_single_part",
        route: "component-attachment-direct-upload",
        ...(target.projectId ? { projectId: target.projectId } : {}),
        ...(target.projectComponentId ? { projectComponentId: target.projectComponentId } : {}),
      },
    });
    if (!pendingSessionResult.ok) return pendingSessionResult.response;
    const pendingSession = pendingSessionResult.session;

    return NextResponse.json({
      provider: CLOUDFLARE_R2_PROVIDER,
      uploadMode: "signed_single_part",
      uploadSessionId: pendingSession.uploadSessionId,
      bucket: COMPONENT_ATTACHMENT_BUCKET,
      path,
      fileName,
      contentType,
      sizeBytes,
      checksumSha256: typeof checksumSha256 === "string" ? checksumSha256 : null,
      uploadUrl: cloudflareDirectUploadUrl(request, pendingSession.uploadSessionId),
      method: "PUT",
      expiresAt: pendingSession.expiresAt,
      requiresFinalizeRpc: true,
      finalizeUrl: FINALIZE_ROUTE,
      scanStatus: "pending",
    });
  } finally {
    admission.release();
  }
}

async function finalizeSignedUpload(currentUser: CurrentUserContext, body: Record<string, unknown> | null) {
  const uploadSessionId = typeof body?.uploadSessionId === "string" ? body.uploadSessionId.trim() : "";
  if (!isUuid(uploadSessionId)) return jsonError("Upload session is required.");

  const db = await openUploadMetadataDatabase();
  if (!db) return directUploadMetadataUnavailableResponse();

  const session = await readUploadSessionForActor(db, { uploadSessionId, actorUserId: currentUser.userId });
  if (!session) return jsonError("Upload session could not be found.", 404);
  if (session.surface !== "component-attachment" || session.storage_bucket !== COMPONENT_ATTACHMENT_BUCKET) {
    return jsonError("Upload session does not match component attachments.", 409);
  }
  const uploadTarget = readSessionUploadTarget(session);
  if (!uploadTarget) return jsonError("Upload session target is invalid.", 409);
  if (!(await canManageUploadTarget(db, currentUser, uploadTarget))) {
    return jsonError(uploadTarget.ownerScope === "project"
      ? "Project edit access is required to upload this attachment."
      : "Only workspace editors/admins can manage the library.", 403);
  }
  const workspaceId = session.workspace_id;
  const userId = currentUser.userId;
  if (session.status === "failed" || session.status === "expired" || session.status === "deleted") {
    return jsonError("Upload session is no longer active.", 409);
  }

  if (session.status === "finalized") {
    const existingRecord = await finalizeUploadSessionAsset(db, {
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

  if (storageProviderFromSessionMetadata(session.metadata) !== CLOUDFLARE_R2_PROVIDER) {
    return directUploadStorageProviderUnsupportedResponse();
  }
  if (!isCloudflareR2RuntimeSelected()) {
    return directUploadStorageProviderUnsupportedResponse();
  }

  const storageProvider = await createRuntimeUploadStorageProvider().catch((error) => {
    logAppError(error, {
      event: "component_attachment_direct_upload_storage_error",
      action: "create_runtime_upload_storage_provider",
      context: {
        route: "/api/component-library/attachments/direct-upload",
        route_handler: "POST /api/component-library/attachments/direct-upload",
        upload_mode: "finalize",
      },
    });
    return null;
  });
  if (!storageProvider) return jsonError("Cloudflare R2 upload storage is not configured.", 503);

  const object = await (
    storageProvider.headObject?.(session.storage_bucket, session.storage_path)
    ?? storageProvider.downloadObject(session.storage_bucket, session.storage_path)
  ).catch(() => null);
  if (!object) return jsonError("Uploaded object could not be finalized.", 409);
  const uploadMode = uploadModeFromSessionMetadata(session.metadata);
  const validation = validateProviderObjectHead({
    bucket: session.storage_bucket,
    path: session.storage_path,
    contentType: session.content_type,
    sizeBytes: session.size_bytes,
    maxBytes: uploadMode === "tus_resumable" ? RESUMABLE_COMPONENT_ATTACHMENT_MAX_BYTES : SIGNED_SINGLE_PART_MAX_BYTES,
    checksumSha256: session.checksum_sha256,
  }, {
    bucket: session.storage_bucket,
    path: session.storage_path,
    contentType: object.contentType,
    sizeBytes: object.sizeBytes,
    checksumSha256: object.checksumSha256 ?? null,
    etag: object.etag ?? null,
  });
  if (!validation.ok) return jsonError("Uploaded object could not be finalized.", 409);

  const uploadRecord = await finalizeUploadSessionAsset(db, {
    uploadSessionId,
    workspaceId,
    actorUserId: userId,
    observedContentType: object.contentType,
    observedSizeBytes: object.sizeBytes,
    observedChecksumSha256: object.checksumSha256 ?? null,
    observedEtag: object.etag ?? null,
    scanStatus: "pending",
    metadata: {
      provider: CLOUDFLARE_R2_PROVIDER,
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

async function uploadToCloudflareR2(request: Request, currentUser: CurrentUserContext) {
  if (!isCloudflareR2RuntimeSelected()) {
    return directUploadStorageProviderUnsupportedResponse();
  }

  const uploadSessionId = new URL(request.url).searchParams.get("uploadSessionId")?.trim() ?? "";
  if (!isUuid(uploadSessionId)) return jsonError("Upload session is required.");

  const db = await openUploadMetadataDatabase();
  if (!db) return directUploadMetadataUnavailableResponse();

  const session = await readUploadSessionForActor(db, { uploadSessionId, actorUserId: currentUser.userId });
  if (!session) return jsonError("Upload session could not be found.", 404);
  if (session.surface !== "component-attachment" || session.storage_bucket !== COMPONENT_ATTACHMENT_BUCKET) {
    return jsonError("Upload session does not match component attachments.", 409);
  }
  const uploadTarget = readSessionUploadTarget(session);
  if (!uploadTarget) return jsonError("Upload session target is invalid.", 409);
  if (!(await canManageUploadTarget(db, currentUser, uploadTarget))) {
    return jsonError(uploadTarget.ownerScope === "project"
      ? "Project edit access is required to upload this attachment."
      : "Only workspace editors/admins can manage the library.", 403);
  }
  if (storageProviderFromSessionMetadata(session.metadata) !== CLOUDFLARE_R2_PROVIDER) {
    return directUploadStorageProviderUnsupportedResponse();
  }
  if (uploadModeFromSessionMetadata(session.metadata) !== "signed_single_part") {
    return jsonError("Use the resumable upload route for this upload session.", 409);
  }
  if (session.status !== "reserved") return jsonError("Upload session is no longer active.", 409);
  if (session.expires_at && Date.parse(session.expires_at) <= Date.now()) {
    return jsonError("Upload session expired.", 410);
  }

  const requestContentType = request.headers.get("content-type")?.split(";")[0]?.trim() ?? "";
  if (requestContentType !== session.content_type) {
    return jsonError("Uploaded object content type did not match the reserved session.", 409);
  }

  const body = new Uint8Array(await request.arrayBuffer());
  if (body.byteLength !== session.size_bytes || body.byteLength > SIGNED_SINGLE_PART_MAX_BYTES) {
    return jsonError("Uploaded object size did not match the reserved session.", 409);
  }

  const storageProvider = await createRuntimeUploadStorageProvider().catch((error) => {
    logAppError(error, {
      event: "component_attachment_direct_upload_storage_error",
      action: "create_runtime_upload_storage_provider",
      context: {
        route: "/api/component-library/attachments/direct-upload",
        route_handler: "POST /api/component-library/attachments/direct-upload",
        upload_mode: "signed_single_part",
      },
    });
    return null;
  });
  if (!storageProvider) return jsonError("Cloudflare R2 upload storage is not configured.", 503);

  await storageProvider.uploadObject({
    bucket: session.storage_bucket,
    path: session.storage_path,
    body,
    contentType: session.content_type,
  });

  return NextResponse.json({
    provider: CLOUDFLARE_R2_PROVIDER,
    uploadSessionId,
    bucket: session.storage_bucket,
    path: session.storage_path,
    sizeBytes: session.size_bytes,
  });
}

export async function POST(request: Request) {
  const currentUser = await requireCurrentUserContext();
  const body = await readJsonBody(request);
  if (body?.action === "create") return createSignedUpload(request, currentUser, body);
  if (body?.action === "finalize") return finalizeSignedUpload(currentUser, body);
  return jsonError("Unsupported direct upload action.");
}

export async function PUT(request: Request) {
  const currentUser = await requireCurrentUserContext();
  return uploadToCloudflareR2(request, currentUser);
}
