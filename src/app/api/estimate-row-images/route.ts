import { randomUUID } from "node:crypto";

import { NextResponse } from "next/server";

import { requireCurrentUserContext } from "@/lib/auth/session";
import {
  canEditEstimateInD1,
  canEditProjectInD1,
  readEstimateInProjectFromD1,
  readEstimateRowItemInEstimateFromD1,
  readProjectFromD1,
} from "@/lib/authz/d1-access";
import { getCloudflareD1Database } from "@/lib/cloudflare/d1";
import { reserveUploadAdmission } from "@/lib/uploads/admission-control";
import {
  CLOUDFLARE_IMAGE_PROCESSING_UNAVAILABLE_MESSAGE,
  processUploadImageToWebp,
} from "@/lib/uploads/server-image-processing";
import { createRuntimeUploadStorageProvider } from "@/lib/uploads/runtime-storage-provider";
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

function jsonError(message: string, status = 400, headers?: HeadersInit) {
  return NextResponse.json({ error: message }, { status, headers });
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
  return stem || "estimate-row-image";
}

function createProjectImageRouteUrl(path: string) {
  const search = new URLSearchParams({ path });
  return `${PROJECT_IMAGE_ROUTE}?${search.toString()}`;
}

function uploadMetadataUnavailableResponse() {
  return jsonError("Something went wrong. Try again in a moment.", 503);
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
    const estimateId = String(formData.get("estimateId") ?? "").trim();
    const rowItemId = String(formData.get("rowItemId") ?? "").trim();
    const file = formData.get("file");

    if (!projectId) return jsonError("Project is required.");
    if (!estimateId) return jsonError("Estimate is required.");
    if (!rowItemId) return jsonError("Estimate row is required.");
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

    const estimate = await readEstimateInProjectFromD1(
      uploadMetadataDb,
      estimateId,
      projectId,
    );
    if (!estimate) return jsonError("Estimate could not be found.", 404);

    const [canEditProject, canEditEstimate] = await Promise.all([
      canEditProjectInD1(uploadMetadataDb, projectId, currentUser),
      canEditEstimateInD1(uploadMetadataDb, estimateId, currentUser),
    ]);
    if (!canEditProject && !canEditEstimate) {
      return jsonError(
        "You do not have permission to edit this estimate.",
        403,
      );
    }

    const estimateRow = await readEstimateRowItemInEstimateFromD1(
      uploadMetadataDb,
      rowItemId,
      estimateId,
    );
    if (!estimateRow) return jsonError("Estimate row could not be found.", 404);
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

      const storageProvider = await createRuntimeUploadStorageProvider();
      const baseName = `${safeUploadName(file.name)}-${randomUUID()}`;
      const basePath = `${project.workspace_id}/${currentUser.userId}/${PROJECT_IMAGE_PATH_SEGMENT}/${projectId}/${ESTIMATE_ROW_IMAGE_PATH_SEGMENT}/${estimateId}/${baseName}`;
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
          targetEntityType: "estimate-row",
          targetEntityId: rowItemId,
          bucket: PROJECT_IMAGE_BUCKET,
          path: imagePath,
          thumbnailPath,
          fileName: file.name,
          contentType: "image/webp",
          sizeBytes: optimized.data.byteLength,
          checksumBytes: optimized.data,
          scanStatus: "not_required",
          metadata: {
            projectId,
            estimateId,
            rowItemId,
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
          imageAsset: {
            kind: "upload-asset",
            schemaVersion: 1,
            assetId: uploadRecord.assetId,
            uploadSessionId: uploadRecord.uploadSessionId,
            bucket: PROJECT_IMAGE_BUCKET,
            path: imagePath,
            thumbnailPath,
            url,
            thumbnailUrl,
            fileName: file.name,
            contentType: "image/webp",
            sizeBytes: optimized.data.byteLength,
            scanStatus: uploadRecord.scanStatus,
            width: optimized.info.width,
            height: optimized.info.height,
            thumbnailWidth: thumbnail.info.width,
            thumbnailHeight: thumbnail.info.height,
          },
          width: optimized.info.width,
          height: optimized.info.height,
          thumbnailWidth: thumbnail.info.width,
          thumbnailHeight: thumbnail.info.height,
          originalBytes: file.size,
          optimizedBytes: optimized.data.byteLength,
          contentType: "image/webp",
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
