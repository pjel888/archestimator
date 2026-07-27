import type { D1DatabaseLike } from "@/lib/cloudflare/d1";
import { readBoundedFormData } from "@/lib/http/read-bounded-body";
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
};

const dependencies: ProjectArtifactUploadDependencies = {
  assertSameOrigin: assertSameOriginInternalUpload,
  resolveAccess: resolveInternalArtifactAccess,
  readFormData: readBoundedFormData,
  createStorageProvider: createRuntimeUploadStorageProvider,
  reserveUpload: reserveUploadAsset,
  finalizeUpload: finalizeReservedUploadAsset,
  failUpload: failReservedUploadAsset,
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

export async function handleProjectArtifactUpload(
  request: Request,
  projectId: string,
  routeDependencies: ProjectArtifactUploadDependencies = dependencies,
) {
  const origin = routeDependencies.assertSameOrigin(request);
  if (!origin.ok) return json({ error: origin.message }, origin.status);

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

  let reservation: Awaited<ReturnType<typeof reserveUploadAsset>> | null = null;
  let storageProvider: UploadStorageProvider | null = null;
  let storageAttempted = false;
  let objectStored = false;
  try {
    const parsed = await routeDependencies.readFormData(
      request,
      MAX_PDF_BYTES + BODY_OVERHEAD_BYTES,
    );
    if (!parsed.ok) {
      const message = parsed.status === 413 ? "Project PDF must be 25 MB or smaller." : parsed.error;
      return json({ error: message }, parsed.status);
    }
    const formData = parsed.value;
    const file = formData.get("file");
    if (!isProjectArtifactFile(file)) return json({ error: "Project PDF is required." }, 400);

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

    reservation = await routeDependencies.reserveUpload(access.database, {
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
    let upload: Awaited<ReturnType<typeof finalizeReservedUploadAsset>> | null = null;
    let finalizationError: unknown;
    for (let attempt = 0; attempt < 2 && !upload; attempt += 1) {
      try {
        upload = await routeDependencies.finalizeUpload(access.database, reservation);
      } catch (error) {
        finalizationError = error;
      }
    }
    if (!upload) throw finalizationError;

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
    if (reservation && !objectStored) {
      if (storageAttempted && storageProvider) {
        await storageProvider.removeObjects(reservation.bucket, [reservation.path]).catch(() => undefined);
      }
      await routeDependencies.failUpload(
        access.database,
        reservation,
        "storage",
      ).catch(() => undefined);
    }
    const message = error instanceof Error ? error.message : "Project PDF could not be stored.";
    const status = objectStored ? 503 : message.includes("PDF") || message.includes("file") ? 400 : 500;
    return json({ error: message }, status);
  } finally {
    admission.release();
  }
}
