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
  readProjectFromD1,
} from "@/lib/authz/d1-access";
import { getCloudflareD1Database } from "@/lib/cloudflare/d1";
import { isUuid } from "@/lib/ids";
import { getCurrentUserTermsAcceptanceStatus } from "@/lib/legal/terms-acceptance";
import { reserveUploadAdmission } from "@/lib/uploads/admission-control";
import {
  CLOUDFLARE_IMAGE_PROCESSING_UNAVAILABLE_MESSAGE,
  processUploadImageToWebp,
} from "@/lib/uploads/server-image-processing";
import { createRuntimeUploadStorageProvider } from "@/lib/uploads/runtime-storage-provider";
import {
  createPrivateImageEntityTag,
  matchesIfNoneMatch,
  PRIVATE_IMAGE_SUCCESS_CACHE_CONTROL,
} from "@/lib/uploads/private-image-revalidation";
import type { UploadStorageProvider } from "@/lib/uploads/storage-provider";
import { recordUploadAsset } from "@/lib/uploads/upload-records";

export const runtime = "nodejs";

const PROJECT_IMAGE_BUCKET = "project-images";
const PROJECT_IMAGE_ROUTE = "/api/projects/images";
const PROJECT_IMAGE_PATH_SEGMENT = "project-images";
const ESTIMATE_ROW_IMAGE_PATH_SEGMENT = "estimate-row-images";
const MAX_UPLOAD_BYTES = 12 * 1024 * 1024;
const MAX_IMAGE_PIXELS = 24_000_000;
const MAX_IMAGE_EDGE = 1600;
const THUMBNAIL_EDGE = 512;
const PRE_BODY_PROJECT_IMAGE_ADMISSION_WORKSPACE_ID =
  "pre-body-project-image-upload";
const ALLOWED_MIME_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/avif",
]);
const AVIF_FTYP_BRANDS = new Set(["avif", "avis"]);
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

function readAscii(bytes: Uint8Array, start: number, end: number) {
  return String.fromCharCode(...bytes.subarray(start, end));
}

function readIsoBaseMediaBrands(bytes: Uint8Array) {
  if (bytes.length < 16 || readAscii(bytes, 4, 8) !== "ftyp") return [];
  const brands = [readAscii(bytes, 8, 12)];
  const readableLength = Math.min(bytes.length, 64);
  for (let index = 16; index + 4 <= readableLength; index += 4) {
    brands.push(readAscii(bytes, index, index + 4));
  }
  return brands;
}

function readMagicMime(bytes: Uint8Array): string | null {
  if (
    bytes.length >= 3 &&
    bytes[0] === 0xff &&
    bytes[1] === 0xd8 &&
    bytes[2] === 0xff
  )
    return "image/jpeg";
  if (
    bytes.length >= 8 &&
    bytes[0] === 0x89 &&
    bytes[1] === 0x50 &&
    bytes[2] === 0x4e &&
    bytes[3] === 0x47 &&
    bytes[4] === 0x0d &&
    bytes[5] === 0x0a &&
    bytes[6] === 0x1a &&
    bytes[7] === 0x0a
  ) {
    return "image/png";
  }
  if (
    bytes.length >= 12 &&
    bytes[0] === 0x52 &&
    bytes[1] === 0x49 &&
    bytes[2] === 0x46 &&
    bytes[3] === 0x46 &&
    bytes[8] === 0x57 &&
    bytes[9] === 0x45 &&
    bytes[10] === 0x42 &&
    bytes[11] === 0x50
  ) {
    return "image/webp";
  }
  const brands = readIsoBaseMediaBrands(bytes);
  if (brands.some((brand) => AVIF_FTYP_BRANDS.has(brand))) return "image/avif";
  return null;
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

function createProjectImageRouteUrl(path: string) {
  const search = new URLSearchParams({ path });
  return `${PROJECT_IMAGE_ROUTE}?${search.toString()}`;
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
  return jsonError("Cloudflare D1 upload metadata is not configured.", 503);
}

async function uploadWebp({
  buffer,
  path,
  storageProvider,
}: {
  buffer: Buffer;
  path: string;
  storageProvider: UploadStorageProvider;
}) {
  await storageProvider.uploadObject({
    bucket: PROJECT_IMAGE_BUCKET,
    path,
    body: buffer,
    contentType: "image/webp",
    cacheControl: "31536000",
  });
  return createProjectImageRouteUrl(path);
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
  const parsedPath = parseProjectImageStoragePath(
    requestUrl.searchParams.get("path") ?? "",
  );
  if (!parsedPath) return privateImageNotFound();

  const currentUser = await getCurrentUserContext();
  if (!currentUser) return privateImageNotFound();
  const acceptanceStatus = await getCurrentUserTermsAcceptanceStatus(
    currentUser.userId,
  );
  if (acceptanceStatus.requiresAcceptance) return privateImageNotFound();

  const db = await getCloudflareD1Database();
  if (!db) return privateImageNotFound();
  const project = await readProjectFromD1(db, parsedPath.projectId);

  if (!project || project.workspace_id !== parsedPath.workspaceId) {
    return privateImageNotFound();
  }

  if (parsedPath.estimateId) {
    const estimate = await readEstimateInProjectFromD1(
      db,
      parsedPath.estimateId,
      parsedPath.projectId,
    );
    if (!estimate) return privateImageNotFound();
  }

  const hasProjectAccess = await canAccessProjectInD1(
    db,
    parsedPath.projectId,
    currentUser,
  );
  if (!hasProjectAccess) {
    if (!parsedPath.estimateId) return privateImageNotFound();
    const hasEstimateAccess = await canAccessEstimateInD1(
      db,
      parsedPath.estimateId,
      currentUser,
    );
    if (!hasEstimateAccess) return privateImageNotFound();
  }

  const storageProvider = await createRuntimeUploadStorageProvider();
  const ifNoneMatch = request.headers.get("if-none-match");
  if (ifNoneMatch && storageProvider.headObject) {
    const metadata = await storageProvider
      .headObject(PROJECT_IMAGE_BUCKET, parsedPath.path)
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
    .downloadObject(PROJECT_IMAGE_BUCKET, parsedPath.path)
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
      "Content-Type": object.contentType ?? "image/webp",
      ETag: entityTag,
      "X-Content-Type-Options": "nosniff",
    },
  });
}

export async function POST(request: Request) {
  const contentLength = Number(request.headers.get("content-length") ?? 0);
  if (contentLength > MAX_UPLOAD_BYTES + 1024 * 1024) {
    return jsonError(
      "Image upload is too large. Compress or choose an image under 12 MB.",
      413,
    );
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
    const file = formData.get("file");
    if (!projectId) return jsonError("Project is required.");
    if (!(file instanceof File)) return jsonError("Image file is required.");
    if (file.type && !ALLOWED_MIME_TYPES.has(file.type))
      return jsonError("Use a JPG, PNG, WebP, or AVIF image.");
    if (file.size <= 0) return jsonError("Image file is empty.");
    if (file.size > MAX_UPLOAD_BYTES)
      return jsonError(
        "Image upload is too large. Compress or choose an image under 12 MB.",
        413,
      );

    const uploadMetadataDb = await getCloudflareD1Database();
    if (!uploadMetadataDb) return uploadMetadataUnavailableResponse();
    const project = await readProjectFromD1(uploadMetadataDb, projectId);

    if (!project) return jsonError("Project could not be found.", 404);
    if (!(await canEditProjectInD1(uploadMetadataDb, projectId, currentUser))) {
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
      const magicMime = readMagicMime(sourceBuffer.subarray(0, 64));
      if (!magicMime || !ALLOWED_MIME_TYPES.has(magicMime)) {
        return jsonError(
          "The uploaded file does not look like a supported image.",
        );
      }

      const processedImage = await processUploadImageToWebp({
        sourceBuffer,
        magicMime,
        maxImagePixels: MAX_IMAGE_PIXELS,
        maxImageEdge: MAX_IMAGE_EDGE,
        thumbnailEdge: THUMBNAIL_EDGE,
      });
      if (processedImage.status === "cloudflare-image-processing-unavailable") {
        return jsonError(CLOUDFLARE_IMAGE_PROCESSING_UNAVAILABLE_MESSAGE, 501);
      }
      if (processedImage.status === "unsupported-encoding")
        return jsonError("Unsupported image encoding.");
      if (processedImage.status === "missing-dimensions")
        return jsonError("Could not read image dimensions.");
      if (processedImage.status === "dimensions-too-large")
        return jsonError(
          "Image dimensions are too large. Use an image under 24 megapixels.",
          413,
        );
      if (processedImage.status === "decode-error") {
        return jsonError(
          "Could not decode image safely. Choose a standard JPG, PNG, WebP, or AVIF file.",
        );
      }
      const { optimized, thumbnail } = processedImage.image;
      const contentSha256 = createHash("sha256").update(optimized.data).digest("hex");

      const storageProvider = await createRuntimeUploadStorageProvider();
      const baseName = `${safeUploadName(file.name)}-${randomUUID()}`;
      const basePath = `${project.workspace_id}/${currentUser.userId}/${PROJECT_IMAGE_PATH_SEGMENT}/${projectId}/${baseName}`;
      const imagePath = `${basePath}.webp`;
      const thumbnailPath = `${basePath}-thumb.webp`;
      const uploadedPaths: string[] = [];

      try {
        const url = await uploadWebp({
          buffer: optimized.data,
          path: imagePath,
          storageProvider,
        });
        uploadedPaths.push(imagePath);
        const thumbnailUrl = await uploadWebp({
          buffer: thumbnail.data,
          path: thumbnailPath,
          storageProvider,
        });
        uploadedPaths.push(thumbnailPath);
        const uploadRecord = await recordUploadAsset(uploadMetadataDb, {
          workspaceId: project.workspace_id,
          actorUserId: currentUser.userId,
          surface: "project-image",
          targetEntityType: "project",
          targetEntityId: projectId,
          bucket: PROJECT_IMAGE_BUCKET,
          path: imagePath,
          thumbnailPath,
          fileName: file.name,
          contentType: "image/webp",
          sizeBytes: optimized.data.byteLength,
          checksumBytes: optimized.data,
          scanStatus: "not_required",
          metadata: {
            originalBytes: file.size,
            optimizedBytes: optimized.data.byteLength,
            thumbnailBytes: thumbnail.data.byteLength,
            width: optimized.info.width,
            height: optimized.info.height,
            thumbnailWidth: thumbnail.info.width,
            thumbnailHeight: thumbnail.info.height,
          },
        });

        return NextResponse.json({
          bucket: PROJECT_IMAGE_BUCKET,
          uploadSessionId: uploadRecord.uploadSessionId,
          assetId: uploadRecord.assetId,
          scanStatus: uploadRecord.scanStatus,
          path: imagePath,
          thumbnailPath,
          url,
          thumbnailUrl,
          width: optimized.info.width,
          height: optimized.info.height,
          thumbnailWidth: thumbnail.info.width,
          thumbnailHeight: thumbnail.info.height,
          originalBytes: file.size,
          optimizedBytes: optimized.data.byteLength,
          contentType: "image/webp",
          contentSha256,
        });
      } catch {
        if (uploadedPaths.length > 0) {
          await storageProvider
            .removeObjects(PROJECT_IMAGE_BUCKET, uploadedPaths)
            .catch(() => undefined);
        }
        return jsonError("Could not store image.", 500);
      }
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

  const storageProvider = await createRuntimeUploadStorageProvider();
  try {
    await storageProvider.removeObjects(PROJECT_IMAGE_BUCKET, paths);
  } catch {
    return jsonError("Could not remove uploaded image.", 500);
  }
  return NextResponse.json({ removedPaths: paths });
}
