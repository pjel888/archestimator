import { createHash } from "node:crypto";

import type { D1DatabaseLike } from "@/lib/cloudflare/d1";

import {
  admitMaterialImageSource,
  isSafeMaterialImageStoragePath,
  MATERIAL_IMAGE_CONTENT_TYPE,
  MATERIAL_IMAGE_MAX_EDGE,
  MATERIAL_IMAGE_MAX_PIXELS,
  MATERIAL_IMAGE_THUMBNAIL_EDGE,
  materialImageBucketForSurface,
  materialImageUploadFailure,
  type MaterialImageSurface,
  type MaterialImageStoredUploadResult,
  type MaterialImageUploadFailure,
} from "./material-image-contract";
import {
  processUploadImageToWebp,
  type ProcessedUploadImage,
} from "./server-image-processing";
import type { UploadStorageProvider } from "./storage-provider";
import type {
  RecordedUploadAsset,
  RecordUploadAssetInput,
  ReservedUploadAsset,
  ReservedUploadFailureStage,
} from "./upload-records";

type MaterialImageReserveUpload = (
  input: RecordUploadAssetInput,
) => Promise<ReservedUploadAsset>;

export type MaterialImageUploadDependencies = {
  storageProvider: Pick<UploadStorageProvider, "uploadObject" | "removeObjects">;
  reserveUploadAsset: MaterialImageReserveUpload;
  renewCleanupLease: (reservation: ReservedUploadAsset) => Promise<void>;
  finalizeUploadAsset: (reservation: ReservedUploadAsset) => Promise<RecordedUploadAsset>;
  failUploadAsset: (
    reservation: ReservedUploadAsset,
    failureStage: ReservedUploadFailureStage,
  ) => Promise<void>;
  processImage?: typeof processUploadImageToWebp;
};

export type MaterialImageUploadServiceInput = {
  surface: MaterialImageSurface;
  workspaceId: string;
  actorUserId: string;
  targetEntityType?: string | null;
  targetEntityId?: string | null;
  fileName: string;
  declaredMimeType?: string | null;
  sourceBytes: Buffer;
  imagePath: string;
  thumbnailPath: string;
  idempotencyKey?: string;
  metadata?: Record<string, string | number | boolean | null | undefined>;
};

export type MaterialImageUploadServiceResult =
  | { ok: true; result: MaterialImageStoredUploadResult }
  | MaterialImageUploadFailure;

export type DurableProjectImageAsset = {
  assetId: string;
  workspaceId: string;
  projectId: string;
  estimateId: string | null;
  targetEntityType: "project" | "estimate-row";
  targetEntityId: string;
  path: string;
  thumbnailPath: string | null;
  contentType: string;
};

export async function readDurableProjectImageAsset(
  database: D1DatabaseLike,
  assetId: string,
): Promise<DurableProjectImageAsset | null> {
  const row = await database.prepare<{
    id: string;
    workspace_id: string;
    project_id: string | null;
    estimate_id: string | null;
    target_entity_type: string | null;
    target_entity_id: string | null;
    storage_path: string;
    thumbnail_path: string | null;
    content_type: string;
  }>(`
    SELECT id, workspace_id, project_id, estimate_id, target_entity_type,
           target_entity_id, storage_path, thumbnail_path, content_type
    FROM upload_assets
    WHERE id = ?
      AND surface = 'project-image'
      AND storage_bucket = 'project-images'
      AND status = 'finalized'
      AND purge_state = 'active'
    LIMIT 1
  `).bind(assetId).first();
  if (
    !row?.id
    || !row.project_id
    || !row.target_entity_id
    || (row.target_entity_type !== "project" && row.target_entity_type !== "estimate-row")
    || !isSafeMaterialImageStoragePath(row.storage_path)
    || (row.thumbnail_path !== null && !isSafeMaterialImageStoragePath(row.thumbnail_path))
  ) return null;
  if (row.target_entity_type === "project" && (row.target_entity_id !== row.project_id || row.estimate_id !== null)) return null;
  if (row.target_entity_type === "estimate-row" && !row.estimate_id) return null;
  return {
    assetId: row.id,
    workspaceId: row.workspace_id,
    projectId: row.project_id,
    estimateId: row.estimate_id,
    targetEntityType: row.target_entity_type,
    targetEntityId: row.target_entity_id,
    path: row.storage_path,
    thumbnailPath: row.thumbnail_path,
    contentType: row.content_type,
  };
}

function processingFailure(status: Exclude<Awaited<ReturnType<typeof processUploadImageToWebp>>["status"], "ok">) {
  if (status === "cloudflare-image-processing-unavailable") {
    return materialImageUploadFailure("processing_unavailable");
  }
  if (status === "unsupported-encoding") return materialImageUploadFailure("unsupported_encoding");
  if (status === "missing-dimensions") return materialImageUploadFailure("missing_dimensions");
  if (status === "dimensions-too-large") return materialImageUploadFailure("too_many_pixels");
  return materialImageUploadFailure("decode_failed");
}

async function cleanUploadedPaths(
  storageProvider: MaterialImageUploadDependencies["storageProvider"],
  bucket: string,
  paths: string[],
) {
  if (paths.length === 0) return;
  await storageProvider.removeObjects(bucket, paths);
}

function isOwnedMaterialImagePath(input: MaterialImageUploadServiceInput, path: string) {
  const ownerPrefix = `${input.workspaceId}/${input.actorUserId}/`;
  return path.startsWith(ownerPrefix)
    && (input.surface !== "project-image" || path.includes("/project-images/"));
}

async function uploadProcessedImage(input: {
  storageProvider: MaterialImageUploadDependencies["storageProvider"];
  bucket: string;
  imagePath: string;
  thumbnailPath: string;
  processed: ProcessedUploadImage;
  uploadedPaths: string[];
}) {
  await input.storageProvider.uploadObject({
    bucket: input.bucket,
    path: input.imagePath,
    body: input.processed.optimized.data,
    contentType: MATERIAL_IMAGE_CONTENT_TYPE,
    cacheControl: "31536000",
  });
  input.uploadedPaths.push(input.imagePath);
  await input.storageProvider.uploadObject({
    bucket: input.bucket,
    path: input.thumbnailPath,
    body: input.processed.thumbnail.data,
    contentType: MATERIAL_IMAGE_CONTENT_TYPE,
    cacheControl: "31536000",
  });
  input.uploadedPaths.push(input.thumbnailPath);
}

export function createMaterialImageUploadService(dependencies: MaterialImageUploadDependencies) {
  const processImage = dependencies.processImage ?? processUploadImageToWebp;

  return async function uploadMaterialImage(
    input: MaterialImageUploadServiceInput,
  ): Promise<MaterialImageUploadServiceResult> {
    const admission = admitMaterialImageSource({
      sizeBytes: input.sourceBytes.byteLength,
      declaredMimeType: input.declaredMimeType,
      headerBytes: input.sourceBytes.subarray(0, 64),
    });
    if (!admission.ok) return admission;
    if (
      !isSafeMaterialImageStoragePath(input.imagePath)
      || !isSafeMaterialImageStoragePath(input.thumbnailPath)
      || input.imagePath === input.thumbnailPath
      || !isOwnedMaterialImagePath(input, input.imagePath)
      || !isOwnedMaterialImagePath(input, input.thumbnailPath)
    ) return materialImageUploadFailure("invalid_storage_path");

    let processedImage: Awaited<ReturnType<typeof processUploadImageToWebp>>;
    try {
      processedImage = await processImage({
        sourceBuffer: input.sourceBytes,
        magicMime: admission.magicMimeType,
        maxImagePixels: MATERIAL_IMAGE_MAX_PIXELS,
        maxImageEdge: MATERIAL_IMAGE_MAX_EDGE,
        thumbnailEdge: MATERIAL_IMAGE_THUMBNAIL_EDGE,
      });
    } catch {
      return materialImageUploadFailure("processing_unavailable");
    }
    if (processedImage.status !== "ok") return processingFailure(processedImage.status);

    const optimized = processedImage.image.optimized;
    const thumbnail = processedImage.image.thumbnail;
    const checksumSha256 = createHash("sha256").update(optimized.data).digest("hex");
    const bucket = materialImageBucketForSurface(input.surface);
    const uploadInput: RecordUploadAssetInput = {
      workspaceId: input.workspaceId,
      actorUserId: input.actorUserId,
      surface: input.surface,
      targetEntityType: input.targetEntityType,
      targetEntityId: input.targetEntityId,
      bucket,
      path: input.imagePath,
      thumbnailPath: input.thumbnailPath,
      fileName: input.fileName,
      contentType: MATERIAL_IMAGE_CONTENT_TYPE,
      sizeBytes: optimized.data.byteLength,
      checksumBytes: optimized.data,
      idempotencyKey: input.idempotencyKey,
      scanStatus: "not_required",
      metadata: {
        ...input.metadata,
        originalBytes: input.sourceBytes.byteLength,
        originalContentType: admission.magicMimeType,
        optimizedBytes: optimized.data.byteLength,
        thumbnailBytes: thumbnail.data.byteLength,
        width: optimized.info.width,
        height: optimized.info.height,
        thumbnailWidth: thumbnail.info.width,
        thumbnailHeight: thumbnail.info.height,
      },
    };
    let reservation: ReservedUploadAsset;
    try {
      reservation = await dependencies.reserveUploadAsset(uploadInput);
    } catch {
      return materialImageUploadFailure("recording_failed");
    }
    if (reservation.reservationState === "in_progress") {
      return materialImageUploadFailure("upload_in_progress");
    }

    let uploadRecord: RecordedUploadAsset = reservation;
    if (reservation.reservationState === "acquired") {
      const uploadedPaths: string[] = [];
      try {
        await uploadProcessedImage({
          storageProvider: dependencies.storageProvider,
          bucket,
          imagePath: input.imagePath,
          thumbnailPath: input.thumbnailPath,
          processed: processedImage.image,
          uploadedPaths,
        });
      } catch {
        try {
          await dependencies.renewCleanupLease(reservation);
        } catch {
          return materialImageUploadFailure("storage_failed");
        }
        let cleanupError: unknown;
        try {
          await cleanUploadedPaths(dependencies.storageProvider, bucket, uploadedPaths);
        } catch (error) {
          cleanupError = error;
        }
        await dependencies.failUploadAsset(reservation, "storage");
        if (cleanupError) throw cleanupError;
        return materialImageUploadFailure("storage_failed");
      }

      try {
        uploadRecord = await dependencies.finalizeUploadAsset(reservation);
      } catch {
        try {
          await dependencies.renewCleanupLease(reservation);
        } catch {
          return materialImageUploadFailure("recording_failed");
        }
        let cleanupError: unknown;
        try {
          await cleanUploadedPaths(dependencies.storageProvider, bucket, uploadedPaths);
        } catch (error) {
          cleanupError = error;
        }
        await dependencies.failUploadAsset(reservation, "finalization");
        if (cleanupError) throw cleanupError;
        return materialImageUploadFailure("recording_failed");
      }
    }

    return {
      ok: true,
      result: {
        assetId: uploadRecord.assetId,
        uploadSessionId: uploadRecord.uploadSessionId,
        bucket,
        path: input.imagePath,
        thumbnailPath: input.thumbnailPath,
        fileName: input.fileName,
        contentType: MATERIAL_IMAGE_CONTENT_TYPE,
        sizeBytes: optimized.data.byteLength,
        width: optimized.info.width,
        height: optimized.info.height,
        thumbnailWidth: thumbnail.info.width,
        thumbnailHeight: thumbnail.info.height,
        originalBytes: input.sourceBytes.byteLength,
        originalContentType: admission.magicMimeType,
        checksumSha256,
        scanStatus: uploadRecord.scanStatus,
      },
    };
  };
}
