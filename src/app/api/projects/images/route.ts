import { createHash, randomUUID } from "node:crypto";

import { NextResponse } from "next/server";

import {
  getCurrentUserContext,
  requireCurrentUserContext,
} from "@/lib/auth/session";
import {
  canAccessEstimateInD1,
  canAccessProjectInD1,
  canEditEstimateInD1,
  canEditProjectInD1,
  readEstimateInProjectFromD1,
  readEstimateRowItemInEstimateFromD1,
  readProjectFromD1,
} from "@/lib/authz/d1-access";
import { getCloudflareD1Database } from "@/lib/cloudflare/d1";
import { isUuid } from "@/lib/ids";
import { getCurrentUserTermsAcceptanceStatus } from "@/lib/legal/terms-acceptance";
import { logAppError } from "@/lib/observability/logger";
import { reserveUploadAdmission } from "@/lib/uploads/admission-control";
import {
  MATERIAL_IMAGE_MAX_BYTES,
  isMaterialImageMimeType,
  materialImageUploadFailure,
  toMaterialImageAssetDescriptor,
  toMaterialImageUploadResult,
  toOpaqueMaterialImageAssetDescriptor,
  toOpaqueMaterialImageUploadResult,
} from "@/lib/uploads/material-image-contract";
import {
  createMaterialImageUploadService,
  readDurableProjectImageAsset,
} from "@/lib/uploads/material-image-service";
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

const PROJECT_IMAGE_BUCKET = "project-images";
const PROJECT_IMAGE_ROUTE = "/api/projects/images";
const PROJECT_IMAGE_PATH_SEGMENT = "project-images";
const ESTIMATE_ROW_IMAGE_PATH_SEGMENT = "estimate-row-images";
const PRE_BODY_PROJECT_IMAGE_ADMISSION_WORKSPACE_ID =
  "pre-body-project-image-upload";
const PRIVATE_IMAGE_ERROR_CACHE_CONTROL =
  "private, no-cache, no-store, max-age=0, must-revalidate";

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
  return stem || "project-image";
}

function createProjectImageRouteUrl(assetId: string, variant: "image" | "thumbnail") {
  const search = new URLSearchParams({ assetId, variant });
  return `${PROJECT_IMAGE_ROUTE}?${search.toString()}`;
}

function readUploadAttemptId(formData: FormData) {
  const value = formData.get("uploadAttemptId");
  if (value === null) return randomUUID();
  if (typeof value !== "string" || !/^[a-zA-Z0-9._:-]{8,128}$/.test(value)) return null;
  return value;
}

function parseProjectImageStoragePath(path: string) {
  const normalized = path.trim();
  if (!normalized.endsWith(".webp")) return null;
  if (
    normalized.includes("..") ||
    normalized.includes("//") ||
    normalized.includes("\\")
  )
    return null;

  const segments = normalized.split("/");
  if (segments.length < 5) return null;
  const [workspaceId, ownerUserId, marker, projectId] = segments;
  if (marker !== PROJECT_IMAGE_PATH_SEGMENT) return null;
  if (!isUuid(workspaceId) || !ownerUserId || !isUuid(projectId)) return null;
  if (segments.some((segment) => segment.length === 0)) return null;

  if (segments[4] !== ESTIMATE_ROW_IMAGE_PATH_SEGMENT) {
    return {
      workspaceId,
      ownerUserId,
      projectId,
      estimateId: null,
      path: normalized,
    };
  }

  const estimateId = segments[5];
  if (segments.length < 7 || !estimateId || !isUuid(estimateId)) return null;
  return { workspaceId, ownerUserId, projectId, estimateId, path: normalized };
}

function uploadMetadataUnavailableResponse() {
  return jsonError("Something went wrong. Try again in a moment.", 503);
}

function isUserOwnedUploadPath(path: string, userId: string) {
  const parsed = parseProjectImageStoragePath(path);
  return Boolean(parsed && parsed.ownerUserId === userId);
}

function readStoragePaths(value: unknown) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return [];
  const rawPaths =
    (value as { path?: unknown; paths?: unknown }).paths ??
    (value as { path?: unknown }).path;
  const paths = Array.isArray(rawPaths) ? rawPaths : [rawPaths];
  return paths
    .filter(
      (path): path is string =>
        typeof path === "string" && path.trim().length > 0,
    )
    .map((path) => path.trim());
}

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const assetId = requestUrl.searchParams.get("assetId")?.trim() ?? "";
  const variant = requestUrl.searchParams.get("variant") ?? "image";
  if (!isUuid(assetId) || (variant !== "image" && variant !== "thumbnail")) return privateImageNotFound();

  const currentUser = await getCurrentUserContext();
  if (!currentUser) return privateImageNotFound();
  const acceptanceStatus = await getCurrentUserTermsAcceptanceStatus(
    currentUser.userId,
  );
  if (acceptanceStatus.requiresAcceptance) return privateImageNotFound();

  const db = await getCloudflareD1Database();
  if (!db) return privateImageNotFound();
  const asset = await readDurableProjectImageAsset(db, assetId).catch(() => null);
  if (!asset) return privateImageNotFound();
  const project = await readProjectFromD1(db, asset.projectId);

  if (!project || project.workspace_id !== asset.workspaceId) {
    return privateImageNotFound();
  }

  if (asset.targetEntityType === "estimate-row") {
    if (!asset.estimateId) return privateImageNotFound();
    const estimate = await readEstimateInProjectFromD1(
      db,
      asset.estimateId,
      asset.projectId,
    );
    if (!estimate) return privateImageNotFound();
    const estimateRow = await readEstimateRowItemInEstimateFromD1(db, asset.targetEntityId, asset.estimateId);
    if (!estimateRow) return privateImageNotFound();
    const hasEstimateAccess = await canAccessEstimateInD1(
      db,
      asset.estimateId,
      currentUser,
    );
    if (!hasEstimateAccess) return privateImageNotFound();
  } else {
    const hasProjectAccess = await canAccessProjectInD1(db, asset.projectId, currentUser);
    if (!hasProjectAccess) return privateImageNotFound();
  }

  const storagePath = variant === "thumbnail" ? asset.thumbnailPath : asset.path;
  if (!storagePath) return privateImageNotFound();

  const storageProvider = await createRuntimeUploadStorageProvider();
  const ifNoneMatch = request.headers.get("if-none-match");
  if (ifNoneMatch && storageProvider.headObject) {
    const metadata = await storageProvider
      .headObject(PROJECT_IMAGE_BUCKET, storagePath)
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

  const object = await storageProvider
    .downloadObject(PROJECT_IMAGE_BUCKET, storagePath)
    .catch(() => null);
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
      "Content-Type": object.contentType ?? asset.contentType ?? "image/webp",
      ETag: entityTag,
      "X-Content-Type-Options": "nosniff",
    },
  });
}

export async function POST(request: Request) {
  const contentLength = Number(request.headers.get("content-length") ?? 0);
  if (contentLength > MATERIAL_IMAGE_MAX_BYTES + 1024 * 1024) {
    const failure = materialImageUploadFailure("too_large");
    return jsonError(failure.error.message, failure.status);
  }

  const currentUser = await requireCurrentUserContext();
  const preBodyAdmission = reserveUploadAdmission({
    surface: "project-image",
    workspaceId: PRE_BODY_PROJECT_IMAGE_ADMISSION_WORKSPACE_ID,
    userId: currentUser.userId,
    request,
  });
  if (!preBodyAdmission.allowed) {
    return jsonError(preBodyAdmission.message, 429, {
      "Retry-After": String(preBodyAdmission.retryAfter),
    });
  }

  try {
    const formData = await request.formData();
    const projectId = String(formData.get("projectId") ?? "").trim();
    const estimateId = String(formData.get("estimateId") ?? "").trim();
    const rowItemId = String(formData.get("rowItemId") ?? "").trim();
    const file = formData.get("file");
    const uploadAttemptId = readUploadAttemptId(formData);
    if (!projectId) return jsonError("Project is required.");
    if (Boolean(estimateId) !== Boolean(rowItemId)) {
      return jsonError("Estimate and estimate row must be supplied together.");
    }
    if (!(file instanceof File)) return jsonError("Image file is required.");
    if (!uploadAttemptId) return jsonError("Image upload attempt is invalid.");
    if (file.type && !isMaterialImageMimeType(file.type)) {
      const failure = materialImageUploadFailure("unsupported_type");
      return jsonError(failure.error.message, failure.status);
    }
    if (file.size <= 0) {
      const failure = materialImageUploadFailure("empty_file");
      return jsonError(failure.error.message, failure.status);
    }
    if (file.size > MATERIAL_IMAGE_MAX_BYTES) {
      const failure = materialImageUploadFailure("too_large");
      return jsonError(failure.error.message, failure.status);
    }

    const uploadMetadataDb = await getCloudflareD1Database();
    if (!uploadMetadataDb) return uploadMetadataUnavailableResponse();
    const project = await readProjectFromD1(uploadMetadataDb, projectId);

    if (!project) return jsonError("Project could not be found.", 404);
    let targetEntityType = "project";
    let targetEntityId = projectId;
    if (estimateId && rowItemId) {
      const estimate = await readEstimateInProjectFromD1(uploadMetadataDb, estimateId, projectId);
      if (!estimate) return jsonError("Estimate could not be found.", 404);
      const estimateRow = await readEstimateRowItemInEstimateFromD1(uploadMetadataDb, rowItemId, estimateId);
      if (!estimateRow) return jsonError("Estimate row could not be found.", 404);
      const canEditEstimate = await canEditEstimateInD1(uploadMetadataDb, estimateId, currentUser);
      if (!canEditEstimate) {
        return jsonError("You do not have permission to edit this estimate.", 403);
      }
      targetEntityType = "estimate-row";
      targetEntityId = rowItemId;
    } else if (!(await canEditProjectInD1(uploadMetadataDb, projectId, currentUser))) {
      return jsonError("You do not have permission to edit this project.", 403);
    }
    const admission = reserveUploadAdmission({
      surface: "project-image",
      workspaceId: project.workspace_id,
      userId: currentUser.userId,
      request,
    });
    if (!admission.allowed) {
      return jsonError(admission.message, 429, {
        "Retry-After": String(admission.retryAfter),
      });
    }

    try {
      const sourceBuffer = Buffer.from(await file.arrayBuffer());
      const storageProvider = await createRuntimeUploadStorageProvider();
      const sourceSha256 = createHash("sha256").update(sourceBuffer).digest("hex");
      const baseName = `${safeUploadName(file.name)}-${sourceSha256}-${uploadAttemptId}`;
      const basePath = estimateId
        ? `${project.workspace_id}/${currentUser.userId}/${PROJECT_IMAGE_PATH_SEGMENT}/${projectId}/${ESTIMATE_ROW_IMAGE_PATH_SEGMENT}/${estimateId}/${baseName}`
        : `${project.workspace_id}/${currentUser.userId}/${PROJECT_IMAGE_PATH_SEGMENT}/${projectId}/${baseName}`;
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
        surface: "project-image",
        workspaceId: project.workspace_id,
        actorUserId: currentUser.userId,
        targetEntityType,
        targetEntityId,
        fileName: file.name,
        declaredMimeType: file.type,
        sourceBytes: sourceBuffer,
        imagePath,
        thumbnailPath,
        idempotencyKey: `project-image:${targetEntityType}:${targetEntityId}:${uploadAttemptId}`,
        metadata: {
          projectId,
          ...(estimateId ? { estimateId, rowItemId } : {}),
        },
      });
      if (!serviceResult.ok) {
        return jsonError(serviceResult.error.message, serviceResult.status);
      }

      const result = serviceResult.result;
      const serving = {
        url: createProjectImageRouteUrl(result.assetId, "image"),
        thumbnailUrl: createProjectImageRouteUrl(result.assetId, "thumbnail"),
      };
      if (estimateId) {
        const authorizedResult = toOpaqueMaterialImageUploadResult(result, serving);
        return NextResponse.json({
          ...authorizedResult,
          optimizedBytes: result.sizeBytes,
          contentSha256: result.checksumSha256,
          imageAsset: toOpaqueMaterialImageAssetDescriptor(authorizedResult),
        });
      }
      const authorizedResult = toMaterialImageUploadResult(result, serving);
      return NextResponse.json({
        ...authorizedResult,
        optimizedBytes: result.sizeBytes,
        contentSha256: result.checksumSha256,
        imageAsset: toMaterialImageAssetDescriptor(authorizedResult),
      });
    } finally {
      admission.release();
    }
  } finally {
    preBodyAdmission.release();
  }
}

export async function DELETE(request: Request) {
  const currentUser = await requireCurrentUserContext();
  const body = await request.json().catch(() => null);
  const parsedPaths = readStoragePaths(body)
    .filter((path) => isUserOwnedUploadPath(path, currentUser.userId))
    .map(parseProjectImageStoragePath)
    .filter(
      (
        parsed,
      ): parsed is NonNullable<
        ReturnType<typeof parseProjectImageStoragePath>
      > => Boolean(parsed),
    );
  if (parsedPaths.length === 0)
    return jsonError("No removable image paths were provided.");

  const db = await getCloudflareD1Database();
  if (!db) return uploadMetadataUnavailableResponse();
  const paths: string[] = [];
  const workspaceIds = new Set<string>();
  const projectIds = Array.from(
    new Set(parsedPaths.map((parsed) => parsed.projectId)),
  );
  for (const projectId of projectIds) {
    const project = await readProjectFromD1(db, projectId);
    if (!project) return jsonError("Project could not be found.", 404);
    const projectPaths = parsedPaths.filter(
      (parsed) =>
        parsed.projectId === projectId &&
        parsed.workspaceId === project.workspace_id,
    );
    if (projectPaths.length === 0) continue;
    workspaceIds.add(project.workspace_id);
    const canEditProject = await canEditProjectInD1(db, projectId, currentUser);
    for (const parsedPath of projectPaths) {
      if (!parsedPath.estimateId) {
        if (!canEditProject) {
          return jsonError(
            "You do not have permission to edit this project.",
            403,
          );
        }
        paths.push(parsedPath.path);
        continue;
      }

      if (canEditProject) {
        paths.push(parsedPath.path);
        continue;
      }

      const estimate = await readEstimateInProjectFromD1(
        db,
        parsedPath.estimateId,
        projectId,
      );
      const canEditEstimate = estimate
        ? await canEditEstimateInD1(db, parsedPath.estimateId, currentUser)
        : false;
      if (!estimate || !canEditEstimate) {
        return jsonError(
          "You do not have permission to edit this estimate.",
          403,
        );
      }
      paths.push(parsedPath.path);
    }
  }
  if (paths.length === 0) {
    return jsonError("No removable image paths were provided.");
  }

  try {
    const claim = await claimUploadAssetsForRemoval(db, {
      workspaceId: [...workspaceIds],
      actorUserId: currentUser.userId,
      surface: "project-image",
      bucket: PROJECT_IMAGE_BUCKET,
      paths,
    });
    if (claim.status === "referenced") {
      return jsonError("Persisted project images cannot be removed.", 409);
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
      event: "project_image_cleanup_metadata_error",
      action: "claim_project_image_upload_removal",
      context: {
        route: PROJECT_IMAGE_ROUTE,
        requested_path_count: paths.length,
      },
    });
    return jsonError("Could not update image cleanup state.", 500);
  }
}
