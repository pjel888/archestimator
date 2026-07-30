import type { D1DatabaseLike } from "@/lib/cloudflare/d1";
import { readBoundedFormData } from "@/lib/http/read-bounded-body";
import { logAppError } from "@/lib/observability/logger";
import { ProjectArtifactError } from "@/lib/project-artifacts/errors";
import {
  computeProjectArtifactSha256,
  validateProjectArtifactPdf,
} from "@/lib/project-artifacts/pdf-validation";
import { reserveUploadAdmission } from "@/lib/uploads/admission-control";
import { buildUploadObjectKey } from "@/lib/uploads/object-keys";
import { getUploadPolicy } from "@/lib/uploads/policy";
import { createRuntimeUploadStorageProvider } from "@/lib/uploads/runtime-storage-provider";
import type { UploadStorageProvider } from "@/lib/uploads/storage-provider";
import {
  failReservedUploadAsset,
  finalizeReservedUploadAsset,
  renewReservedUploadCleanupLease,
  reserveUploadAsset,
} from "@/lib/uploads/upload-records";

import {
  resolveInternalArtifactAccess,
  type InternalArtifactAccess,
} from "./_route-core";

const MAX_PDF_BYTES = 25 * 1024 * 1024;
const BODY_OVERHEAD_BYTES = 1024 * 1024;
const PRIVATE_HEADERS = {
  "Cache-Control": "private, no-store, max-age=0, must-revalidate",
  "X-Content-Type-Options": "nosniff",
};

export type ProjectArtifactUploadDependencies = {
  assertSameOrigin: (request: Request) => { ok: true } | { ok: false; status: 403; message: string };
  resolveAccess: (projectId: string, mode: "write") => Promise<InternalArtifactAccess | { ok: false; response: Response }>;
  readFormData: typeof readBoundedFormData;
  createStorageProvider: () => Promise<UploadStorageProvider>;
  reserveUpload: (
    database: D1DatabaseLike,
    input: Parameters<typeof reserveUploadAsset>[1],
  ) => ReturnType<typeof reserveUploadAsset>;
  finalizeUpload: typeof finalizeReservedUploadAsset;
  failUpload: typeof failReservedUploadAsset;
  renewCleanupLease: typeof renewReservedUploadCleanupLease;
};

const dependencies: ProjectArtifactUploadDependencies = {
  assertSameOrigin: assertSameOriginInternalUpload,
  resolveAccess: resolveInternalArtifactAccess,
  readFormData: readBoundedFormData,
  createStorageProvider: createRuntimeUploadStorageProvider,
  reserveUpload: reserveUploadAsset,
  finalizeUpload: finalizeReservedUploadAsset,
  failUpload: failReservedUploadAsset,
  renewCleanupLease: renewReservedUploadCleanupLease,
};

function json(body: unknown, status = 200, headers?: HeadersInit) {
  return Response.json(body, { status, headers: { ...PRIVATE_HEADERS, ...headers } });
}

function assertSameOriginInternalUpload(request: Request) {
  const origin = request.headers.get("origin");
  if (!origin || origin !== new URL(request.url).origin) {
    return { ok: false as const, status: 403 as const, message: "Cross-origin uploads are blocked." };
  }
  return { ok: true as const };
}

type ProjectArtifactFile = {
  arrayBuffer: () => Promise<ArrayBuffer>;
  name: string;
  type: string;
};

function isProjectArtifactFile(value: unknown): value is ProjectArtifactFile {
  if (!value || typeof value !== "object") return false;
  const candidate = value as Partial<ProjectArtifactFile>;
  return typeof candidate.arrayBuffer === "function"
    && typeof candidate.name === "string"
    && typeof candidate.type === "string";
}

function uploadRequestError(request: Request, routeDependencies: ProjectArtifactUploadDependencies) {
  const origin = routeDependencies.assertSameOrigin(request);
  if (!origin.ok) return json({ error: origin.message }, origin.status);
  const contentLength = Number(request.headers.get("content-length") ?? 0);
  return Number.isFinite(contentLength) && contentLength > MAX_PDF_BYTES + BODY_OVERHEAD_BYTES
    ? json({ error: "Project PDF must be 25 MB or smaller." }, 413)
    : null;
}

async function readValidatedArtifactFile(request: Request, routeDependencies: ProjectArtifactUploadDependencies) {
  const parsed = await routeDependencies.readFormData(request, MAX_PDF_BYTES + BODY_OVERHEAD_BYTES);
  if (!parsed.ok) {
    const message = parsed.status === 413 ? "Project PDF must be 25 MB or smaller." : parsed.error;
    return { errorResponse: json({ error: message }, parsed.status), file: null };
  }
  const file = parsed.value.get("file");
  if (!isProjectArtifactFile(file)) return { errorResponse: json({ error: "Project PDF is required." }, 400), file: null };
  const bytes = new Uint8Array(await file.arrayBuffer());
  const validated = validateProjectArtifactPdf(bytes, { declaredContentType: file.type, maxBytes: MAX_PDF_BYTES });
  return { bytes, errorResponse: null, file, validated };
}

async function finalizeProjectArtifactUpload(
  routeDependencies: ProjectArtifactUploadDependencies,
  database: D1DatabaseLike,
  reservation: Awaited<ReturnType<typeof reserveUploadAsset>>,
) {
  let finalizationError: unknown;
  for (let attempt = 0; attempt < 2; attempt += 1) {
    try {
      return await routeDependencies.finalizeUpload(database, reservation);
    } catch (error) {
      finalizationError = error;
    }
  }
  throw finalizationError;
}

async function cleanupFailedProjectArtifactUpload(input: {
  access: InternalArtifactAccess;
  objectStored: boolean;
  reservation: Awaited<ReturnType<typeof reserveUploadAsset>> | null;
  routeDependencies: ProjectArtifactUploadDependencies;
  storageAttempted: boolean;
  storageProvider: UploadStorageProvider | null;
}) {
  if (!input.reservation || input.reservation.reservationState !== "acquired") return;
  try {
    await input.routeDependencies.renewCleanupLease(input.access.database, input.reservation);
  } catch (error) {
    logAppError(error, {
      action: "fence_project_artifact_cleanup",
      context: { uploadSessionId: input.reservation.uploadSessionId },
      event: "project_artifact_cleanup_fence_rejected",
    });
    return;
  }
  if (!input.objectStored && input.storageAttempted && input.storageProvider) {
    try {
      await input.storageProvider.removeObjects(input.reservation.bucket, [input.reservation.path]);
    } catch (error) {
      logAppError(error, {
        action: "remove_failed_project_artifact_object",
        context: { uploadSessionId: input.reservation.uploadSessionId },
        event: "project_artifact_cleanup_failed",
      });
    }
  }
  try {
    await input.routeDependencies.failUpload(
      input.access.database,
      input.reservation,
      input.objectStored ? "finalization" : "storage",
    );
  } catch (error) {
    logAppError(error, {
      action: "record_failed_project_artifact_upload",
      context: { uploadSessionId: input.reservation.uploadSessionId },
      event: "project_artifact_failure_record_failed",
    });
  }
}

function uploadFailureResponse(error: unknown, objectStored: boolean) {
  if (error instanceof ProjectArtifactError
    && (error.code === "project_artifact_invalid_file" || error.code === "project_artifact_invalid_input")) {
    return json({ error: error.message }, 400);
  }
  logAppError(error, {
    action: "store_project_artifact_upload",
    context: { objectStored, route: "/api/projects/[projectId]/artifacts" },
    event: "project_artifact_upload_failed",
  });
  return json({ error: "Project PDF could not be stored." }, objectStored ? 503 : 500);
}

export async function handleProjectArtifactUpload(
  request: Request,
  projectId: string,
  routeDependencies: ProjectArtifactUploadDependencies = dependencies,
) {
  const requestError = uploadRequestError(request, routeDependencies);
  if (requestError) return requestError;

  const access = await routeDependencies.resolveAccess(projectId, "write");
  if (!access.ok) return access.response;
  const admission = reserveUploadAdmission({
    surface: "project-artifact",
    workspaceId: access.workspaceId,
    userId: access.actor.id,
    request,
  });
  if (!admission.allowed) {
    return json({ error: admission.message }, 429, { "Retry-After": String(admission.retryAfter) });
  }

  let reservation: Awaited<ReturnType<typeof reserveUploadAsset>> | null = null;
  let storageProvider: UploadStorageProvider | null = null;
  let storageAttempted = false;
  let objectStored = false;
  try {
    const artifactFile = await readValidatedArtifactFile(request, routeDependencies);
    if (!artifactFile.file) return artifactFile.errorResponse;
    const { bytes, file, validated } = artifactFile;
    const checksumSha256 = await computeProjectArtifactSha256(bytes);
    const policy = getUploadPolicy("project-artifact");
    const path = buildUploadObjectKey({
      contentSha256: checksumSha256,
      extension: "pdf",
      fileName: file.name,
      surface: "project-artifact",
      targetEntityId: access.projectId,
      userId: access.actor.id,
      workspaceId: access.workspaceId,
    });

    reservation = await routeDependencies.reserveUpload(access.database, {
      actorUserId: access.actor.id,
      bucket: policy.bucket,
      checksumBytes: bytes,
      idempotencyKey: `project-artifact:${access.projectId}:${checksumSha256}`,
      contentType: validated.contentType,
      fileName: file.name,
      metadata: { projectId: access.projectId, uploadKind: "project-artifact-pdf" },
      path,
      scanStatus: "pending",
      sizeBytes: validated.sizeBytes,
      surface: "project-artifact",
      targetEntityId: access.projectId,
      targetEntityType: "project",
      workspaceId: access.workspaceId,
    });
    if (reservation.reservationState === "finalized") {
      return json({
        assetId: reservation.assetId,
        checksumSha256,
        contentType: validated.contentType,
        fileName: file.name,
        scanStatus: reservation.scanStatus,
        sizeBytes: validated.sizeBytes,
        uploadSessionId: reservation.uploadSessionId,
      });
    }
    if (reservation.reservationState === "in_progress") {
      return json({ error: "This project PDF upload is already in progress." }, 409, { "Retry-After": "1" });
    }

    storageProvider = await routeDependencies.createStorageProvider();
    storageAttempted = true;
    await storageProvider.uploadObject({
      body: bytes,
      bucket: policy.bucket,
      cacheControl: "private, no-store",
      contentType: validated.contentType,
      path,
    });
    objectStored = true;
    const upload = await finalizeProjectArtifactUpload(routeDependencies, access.database, reservation);

    return json({
      assetId: upload.assetId,
      checksumSha256,
      contentType: validated.contentType,
      fileName: file.name,
      scanStatus: upload.scanStatus,
      sizeBytes: validated.sizeBytes,
      uploadSessionId: upload.uploadSessionId,
    }, 201);
  } catch (error) {
    await cleanupFailedProjectArtifactUpload({ access, objectStored, reservation, routeDependencies, storageAttempted, storageProvider });
    return uploadFailureResponse(error, objectStored);
  } finally {
    admission.release();
  }
}
