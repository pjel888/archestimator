import type { D1DatabaseLike } from "@/lib/cloudflare/d1";
import {
  computeProjectArtifactSha256,
  validateProjectArtifactPdf,
} from "@/lib/project-artifacts/pdf-validation";
import { reserveUploadAdmission } from "@/lib/uploads/admission-control";
import { buildUploadObjectKey } from "@/lib/uploads/object-keys";
import { getUploadPolicy } from "@/lib/uploads/policy";
import { createRuntimeUploadStorageProvider } from "@/lib/uploads/runtime-storage-provider";
import type { UploadStorageProvider } from "@/lib/uploads/storage-provider";
import { recordUploadAsset, type RecordedUploadAsset } from "@/lib/uploads/upload-records";

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
  resolveAccess: (projectId: string, mode: "write") => Promise<InternalArtifactAccess | { ok: false; response: Response }>;
  createStorageProvider: () => Promise<UploadStorageProvider>;
  recordUpload: (
    database: D1DatabaseLike,
    input: Parameters<typeof recordUploadAsset>[1],
  ) => Promise<RecordedUploadAsset>;
};

const dependencies: ProjectArtifactUploadDependencies = {
  resolveAccess: resolveInternalArtifactAccess,
  createStorageProvider: createRuntimeUploadStorageProvider,
  recordUpload: recordUploadAsset,
};

function json(body: unknown, status = 200, headers?: HeadersInit) {
  return Response.json(body, { status, headers: { ...PRIVATE_HEADERS, ...headers } });
}

export async function handleProjectArtifactUpload(
  request: Request,
  projectId: string,
  routeDependencies: ProjectArtifactUploadDependencies = dependencies,
) {
  const contentLength = Number(request.headers.get("content-length") ?? 0);
  if (Number.isFinite(contentLength) && contentLength > MAX_PDF_BYTES + BODY_OVERHEAD_BYTES) {
    return json({ error: "Project PDF must be 25 MB or smaller." }, 413);
  }

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

  let uploadedPath: string | null = null;
  let storageProvider: UploadStorageProvider | null = null;
  try {
    const formData = await request.formData();
    const file = formData.get("file");
    if (!(file instanceof File)) return json({ error: "Project PDF is required." }, 400);

    const bytes = new Uint8Array(await file.arrayBuffer());
    const validated = validateProjectArtifactPdf(bytes, {
      declaredContentType: file.type,
      maxBytes: MAX_PDF_BYTES,
    });
    const checksumSha256 = await computeProjectArtifactSha256(bytes);
    const policy = getUploadPolicy("project-artifact");
    const path = buildUploadObjectKey({
      extension: "pdf",
      fileName: file.name,
      surface: "project-artifact",
      targetEntityId: access.projectId,
      userId: access.actor.id,
      workspaceId: access.workspaceId,
    });

    storageProvider = await routeDependencies.createStorageProvider();
    await storageProvider.uploadObject({
      body: bytes,
      bucket: policy.bucket,
      cacheControl: "private, no-store",
      contentType: validated.contentType,
      path,
    });
    uploadedPath = path;
    const upload = await routeDependencies.recordUpload(access.database, {
      actorUserId: access.actor.id,
      bucket: policy.bucket,
      checksumBytes: bytes,
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
    if (uploadedPath && storageProvider) {
      await storageProvider.removeObjects(getUploadPolicy("project-artifact").bucket, [uploadedPath]).catch(() => undefined);
    }
    const message = error instanceof Error ? error.message : "Project PDF could not be stored.";
    const status = message.includes("PDF") || message.includes("file") ? 400 : 500;
    return json({ error: message }, status);
  } finally {
    admission.release();
  }
}
