import { createHash, randomUUID } from "node:crypto";

import { NextResponse } from "next/server";

import { requireCurrentUserContext, type CurrentUserContext } from "@/lib/auth/session";
import { isWorkspaceEditorInD1 } from "@/lib/authz/d1-access";
import { getCloudflareD1Database } from "@/lib/cloudflare/d1";
import { logAppError } from "@/lib/observability/logger";
import { ensureDefaultWorkspace } from "@/lib/repositories/workspace-repository";
import { reserveUploadAdmission } from "@/lib/uploads/admission-control";
import { createMaterialImageUploadService } from "@/lib/uploads/material-image-service";
import { claimUploadAssetsForRemoval } from "@/lib/uploads/removal-claims";
import { createRuntimeUploadStorageProvider } from "@/lib/uploads/runtime-storage-provider";
import {
  createPrivateImageEntityTag,
  matchesIfNoneMatch,
  PRIVATE_IMAGE_SUCCESS_CACHE_CONTROL,
} from "@/lib/uploads/private-image-revalidation";
import {
  failReservedUploadAsset,
  finalizeReservedUploadAsset,
  renewReservedUploadCleanupLease,
  reserveUploadAsset,
} from "@/lib/uploads/upload-records";

export const runtime = "nodejs";

const COMPONENT_IMAGE_BUCKET = "component-images";
const COMPONENT_IMAGE_ROUTE = "/api/component-library/images";
const MAX_UPLOAD_BYTES = 12 * 1024 * 1024;
const PRIVATE_IMAGE_ERROR_CACHE_CONTROL = "private, no-cache, no-store, max-age=0, must-revalidate";

function jsonError(message: string, status = 400, headers?: HeadersInit) {
  return NextResponse.json({ error: message }, { status, headers });
}

function privateImageNotFound() {
  return NextResponse.json(
    { error: "Image could not be found." },
    {
      status: 404,
      headers: {
        "Cache-Control": PRIVATE_IMAGE_ERROR_CACHE_CONTROL,
      },
    },
  );
}

function safeUploadName(name: string) {
  const stem = name
    .replace(/\.[^.]+$/, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);
  return stem || "component-image";
}

function readUploadAttemptId(formData: FormData) {
  const value = formData.get("uploadAttemptId");
  if (value === null) return randomUUID();
  if (typeof value !== "string" || !/^[a-zA-Z0-9._:-]{8,128}$/.test(value)) return null;
  return value;
}

function createComponentImageRouteUrl(path: string) {
  const search = new URLSearchParams({ path });
  return `${COMPONENT_IMAGE_ROUTE}?${search.toString()}`;
}

function parseComponentImageStoragePath(path: string) {
  const normalized = path.trim();
  if (!normalized.endsWith(".webp")) return null;
  if (normalized.includes("..") || normalized.includes("//") || normalized.includes("\\")) return null;

  const segments = normalized.split("/");
  if (segments.length < 3) return null;
  const [workspaceId, ownerUserId] = segments;
  if (!workspaceId || !ownerUserId || segments.some((segment) => segment.length === 0)) return null;
  return { workspaceId, ownerUserId, path: normalized };
}

function uploadMetadataUnavailableResponse() {
  return jsonError("Something went wrong. Try again in a moment.", 503);
}

async function canManageLibrary(workspaceId: string, currentUser: CurrentUserContext) {
  const db = await getCloudflareD1Database();
  if (!db) return false;
  try {
    return await isWorkspaceEditorInD1(db, workspaceId, currentUser);
  } catch (error) {
    logAppError(error, {
      event: "component_image_authorization_error",
      action: "authorize_component_image_management",
      context: {
        route: "/api/component-library/images",
      },
    });
    return false;
  }
}

function isOwnedUploadPath(path: string, workspaceId: string, userId: string) {
  return path.startsWith(`${workspaceId}/${userId}/`) && path.endsWith(".webp") && !path.includes("..") && !path.includes("//");
}

function readStoragePaths(value: unknown) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return [];
  const rawPaths = (value as { path?: unknown; paths?: unknown }).paths ?? (value as { path?: unknown }).path;
  const paths = Array.isArray(rawPaths) ? rawPaths : [rawPaths];
  return paths.filter((path): path is string => typeof path === "string" && path.trim().length > 0).map((path) => path.trim());
}

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const parsedPath = parseComponentImageStoragePath(requestUrl.searchParams.get("path") ?? "");
  if (!parsedPath) return privateImageNotFound();

  const [{ workspace }] = await Promise.all([ensureDefaultWorkspace(), requireCurrentUserContext()]);
  if (parsedPath.workspaceId !== workspace.id) return privateImageNotFound();

  const storageProvider = await createRuntimeUploadStorageProvider();
  const ifNoneMatch = request.headers.get("if-none-match");
  if (ifNoneMatch && storageProvider.headObject) {
    const metadata = await storageProvider
      .headObject(COMPONENT_IMAGE_BUCKET, parsedPath.path)
      .catch(() => null);
    const entityTag = metadata
      ? createPrivateImageEntityTag(metadata)
      : null;
    if (entityTag && matchesIfNoneMatch(ifNoneMatch, entityTag)) {
      return new Response(null, {
        status: 304,
        headers: {
          "Cache-Control": PRIVATE_IMAGE_SUCCESS_CACHE_CONTROL,
          ETag: entityTag,
        },
      });
    }
  }

  const object = await storageProvider.downloadObject(COMPONENT_IMAGE_BUCKET, parsedPath.path).catch(() => null);
  if (!object) return privateImageNotFound();
  const entityTag = createPrivateImageEntityTag(object, object.body);

  if (entityTag && matchesIfNoneMatch(ifNoneMatch, entityTag)) {
    return new Response(null, {
      status: 304,
      headers: {
        "Cache-Control": PRIVATE_IMAGE_SUCCESS_CACHE_CONTROL,
        ETag: entityTag,
      },
    });
  }

  return new Response(object.body, {
    headers: {
      "Cache-Control": PRIVATE_IMAGE_SUCCESS_CACHE_CONTROL,
      "Content-Type": object.contentType ?? "image/webp",
      ETag: entityTag,
      "X-Content-Type-Options": "nosniff",
    },
  });
}

export async function POST(request: Request) {
  const contentLength = Number(request.headers.get("content-length") ?? 0);
  if (contentLength > MAX_UPLOAD_BYTES + 1024 * 1024) {
    return jsonError("Image upload is too large. Compress or choose an image under 12 MB.", 413);
  }

  const [{ workspace }, currentUser] = await Promise.all([ensureDefaultWorkspace(), requireCurrentUserContext()]);
  if (!(await canManageLibrary(workspace.id, currentUser))) {
    return jsonError("Only workspace editors/admins can manage the library.", 403);
  }

  const admission = reserveUploadAdmission({ surface: "component-image", workspaceId: workspace.id, userId: currentUser.userId, request });
  if (!admission.allowed) {
    return jsonError(admission.message, 429, { "Retry-After": String(admission.retryAfter) });
  }

  try {
    const formData = await request.formData();
    const file = formData.get("file");
    if (!(file instanceof File)) return jsonError("Image file is required.");
    const uploadAttemptId = readUploadAttemptId(formData);
    if (!uploadAttemptId) return jsonError("Image upload attempt is invalid.");
    const sourceBuffer = Buffer.from(await file.arrayBuffer());
    const uploadMetadataDb = await getCloudflareD1Database();
    if (!uploadMetadataDb) return uploadMetadataUnavailableResponse();

    const storageProvider = await createRuntimeUploadStorageProvider();
    const sourceSha256 = createHash("sha256").update(sourceBuffer).digest("hex");
    const baseName = `${safeUploadName(file.name)}-${sourceSha256}-${uploadAttemptId}`;
    const basePath = `${workspace.id}/${currentUser.userId}/${baseName}`;
    const imagePath = `${basePath}.webp`;
    const thumbnailPath = `${basePath}-thumb.webp`;
    const uploadMaterialImage = createMaterialImageUploadService({
      storageProvider,
      reserveUploadAsset: (input) => reserveUploadAsset(uploadMetadataDb, input),
      renewCleanupLease: (reservation) => renewReservedUploadCleanupLease(uploadMetadataDb, reservation),
      finalizeUploadAsset: (reservation) => finalizeReservedUploadAsset(uploadMetadataDb, reservation),
      failUploadAsset: (reservation, failureStage) => failReservedUploadAsset(uploadMetadataDb, reservation, failureStage),
    });
    const serviceResult = await uploadMaterialImage({
      surface: "component-image",
      workspaceId: workspace.id,
      actorUserId: currentUser.userId,
      targetEntityType: "component-library",
      targetEntityId: null,
      fileName: file.name,
      declaredMimeType: file.type,
      sourceBytes: sourceBuffer,
      imagePath,
      thumbnailPath,
      idempotencyKey: `component-image:${workspace.id}:${currentUser.userId}:${uploadAttemptId}`,
    });
    if (!serviceResult.ok) return jsonError(serviceResult.error.message, serviceResult.status);

    const result = serviceResult.result;
    return NextResponse.json({
      bucket: result.bucket,
      uploadSessionId: result.uploadSessionId,
      assetId: result.assetId,
      scanStatus: result.scanStatus,
      path: result.path,
      thumbnailPath: result.thumbnailPath,
      url: createComponentImageRouteUrl(result.path),
      thumbnailUrl: createComponentImageRouteUrl(result.thumbnailPath),
      width: result.width,
      height: result.height,
      thumbnailWidth: result.thumbnailWidth,
      thumbnailHeight: result.thumbnailHeight,
      originalBytes: result.originalBytes,
      optimizedBytes: result.sizeBytes,
      contentType: result.contentType,
    });
  } finally {
    admission.release();
  }
}

export async function DELETE(request: Request) {
  const [{ workspace }, currentUser] = await Promise.all([ensureDefaultWorkspace(), requireCurrentUserContext()]);
  if (!(await canManageLibrary(workspace.id, currentUser))) {
    return jsonError("Only workspace editors/admins can manage the library.", 403);
  }
  const metadataDb = await getCloudflareD1Database();
  if (!metadataDb) return uploadMetadataUnavailableResponse();

  const body = await request.json().catch(() => null);
  const paths = readStoragePaths(body).filter((path) => isOwnedUploadPath(path, workspace.id, currentUser.userId));
  if (paths.length === 0) return jsonError("No removable image paths were provided.");

  try {
    const claim = await claimUploadAssetsForRemoval(metadataDb, {
      workspaceId: workspace.id,
      actorUserId: currentUser.userId,
      surface: "component-image",
      bucket: COMPONENT_IMAGE_BUCKET,
      paths,
    });
    if (claim.status === "referenced") {
      return jsonError("Persisted component images cannot be removed from draft cleanup.", 409);
    }
    if (claim.status === "not_found") {
      return jsonError("No removable image uploads were found.", 404);
    }
    return NextResponse.json({
      removedPaths: claim.claimedPaths,
      blockedPaths: claim.blockedPaths,
      alreadyRemovedPaths: claim.alreadyRemovedPaths,
    });
  } catch (error) {
    logAppError(error, {
      event: "component_image_cleanup_metadata_error",
      action: "mark_component_image_upload_removed",
      context: {
        route: COMPONENT_IMAGE_ROUTE,
        requested_path_count: paths.length,
      },
    });
    return jsonError("Could not update image cleanup state.", 500);
  }
}
