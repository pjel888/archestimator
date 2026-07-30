export const MATERIAL_IMAGE_MAX_BYTES = 12 * 1024 * 1024;
export const MATERIAL_IMAGE_MAX_PIXELS = 24_000_000;
export const MATERIAL_IMAGE_MAX_EDGE = 1600;
export const MATERIAL_IMAGE_THUMBNAIL_EDGE = 512;
export const MATERIAL_IMAGE_CONTENT_TYPE = "image/webp" as const;

const MATERIAL_IMAGE_MIME_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/avif",
] as const;

export type MaterialImageMimeType = (typeof MATERIAL_IMAGE_MIME_TYPES)[number];
export type MaterialImageSurface = "project-image" | "component-image";
export type MaterialImageBucket = "project-images" | "component-images";
type MaterialImageScanStatus = "not_required" | "pending";

export type MaterialImageUploadErrorCode =
  | "empty_file"
  | "too_large"
  | "unsupported_type"
  | "invalid_magic"
  | "type_mismatch"
  | "unsupported_encoding"
  | "missing_dimensions"
  | "too_many_pixels"
  | "decode_failed"
  | "processing_unavailable"
  | "invalid_storage_path"
  | "invalid_serving_url"
  | "upload_in_progress"
  | "storage_failed"
  | "recording_failed"
  | "invalid_response";

type MaterialImageUploadError = {
  code: MaterialImageUploadErrorCode;
  message: string;
  retryable: boolean;
};

type MaterialImageUploadErrorEnvelope = {
  error: MaterialImageUploadError;
};

export type MaterialImageUploadFailure = MaterialImageUploadErrorEnvelope & {
  ok: false;
  status: number;
};

export type MaterialImageSourceAdmission =
  | { ok: true; declaredMimeType: MaterialImageMimeType | null; magicMimeType: MaterialImageMimeType }
  | MaterialImageUploadFailure;

export type MaterialImageStoredUploadResult = {
  assetId: string;
  uploadSessionId: string;
  bucket: MaterialImageBucket;
  path: string;
  thumbnailPath: string;
  fileName: string;
  contentType: typeof MATERIAL_IMAGE_CONTENT_TYPE;
  sizeBytes: number;
  width: number;
  height: number;
  thumbnailWidth: number;
  thumbnailHeight: number;
  originalBytes: number;
  originalContentType: MaterialImageMimeType;
  checksumSha256: string;
  scanStatus: MaterialImageScanStatus;
};

export type MaterialImageUploadResult = MaterialImageStoredUploadResult & {
  url: string;
  thumbnailUrl: string;
};

export type OpaqueMaterialImageUploadResult = Omit<
  MaterialImageUploadResult,
  "bucket" | "path" | "thumbnailPath"
>;

export type MaterialImageAssetDescriptor = {
  kind: "upload-asset";
  schemaVersion: 1;
  assetId: string;
  uploadSessionId: string;
  bucket: MaterialImageBucket;
  path: string;
  thumbnailPath: string;
  url: string;
  thumbnailUrl: string;
  fileName: string;
  contentType: typeof MATERIAL_IMAGE_CONTENT_TYPE;
  sizeBytes: number;
  scanStatus: MaterialImageScanStatus;
  width: number;
  height: number;
  thumbnailWidth: number;
  thumbnailHeight: number;
};

export type OpaqueMaterialImageAssetDescriptor = Omit<
  MaterialImageAssetDescriptor,
  "bucket" | "path" | "thumbnailPath"
>;

const MATERIAL_IMAGE_MIME_TYPE_SET = new Set<string>(MATERIAL_IMAGE_MIME_TYPES);
const SHA256_PATTERN = /^[a-f0-9]{64}$/;

const ERROR_DEFINITIONS = {
  empty_file: ["Image file is empty.", false, 400],
  too_large: ["Image upload is too large. Choose an image no larger than 12 MB.", false, 413],
  unsupported_type: ["Use a JPG, PNG, WebP, or AVIF image.", false, 400],
  invalid_magic: ["The uploaded file does not look like a supported image.", false, 400],
  type_mismatch: ["The image content does not match its declared file type.", false, 400],
  unsupported_encoding: ["Unsupported image encoding.", false, 400],
  missing_dimensions: ["Could not read image dimensions.", false, 400],
  too_many_pixels: ["Image dimensions are too large. Use an image under 24 megapixels.", false, 400],
  decode_failed: ["Could not decode image safely. Choose a standard JPG, PNG, WebP, or AVIF file.", false, 400],
  processing_unavailable: ["Image processing is temporarily unavailable. Try again in a moment.", true, 503],
  invalid_storage_path: ["Image storage path is invalid.", false, 400],
  invalid_serving_url: ["Image serving URL is invalid.", true, 500],
  upload_in_progress: ["This image upload is already in progress. Try again in a moment.", true, 409],
  storage_failed: ["Could not store image. Try again.", true, 500],
  recording_failed: ["Could not finalize image upload. Try again.", true, 500],
  invalid_response: ["Upload response was invalid. Try again.", true, 502],
} as const satisfies Record<MaterialImageUploadErrorCode, readonly [string, boolean, number]>;

export function materialImageUploadFailure(
  code: MaterialImageUploadErrorCode,
  overrides: { message?: string; retryable?: boolean; status?: number } = {},
): MaterialImageUploadFailure {
  const [defaultMessage, defaultRetryable, defaultStatus] = ERROR_DEFINITIONS[code];
  return {
    ok: false,
    status: overrides.status ?? defaultStatus,
    error: {
      code,
      message: overrides.message ?? defaultMessage,
      retryable: overrides.retryable ?? defaultRetryable,
    },
  };
}

export function isMaterialImageMimeType(value: unknown): value is MaterialImageMimeType {
  return typeof value === "string" && MATERIAL_IMAGE_MIME_TYPE_SET.has(value);
}

export function sniffMaterialImageMimeType(bytes: Uint8Array): MaterialImageMimeType | null {
  if (bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return "image/jpeg";
  if (
    bytes.length >= 8
    && bytes[0] === 0x89
    && bytes[1] === 0x50
    && bytes[2] === 0x4e
    && bytes[3] === 0x47
    && bytes[4] === 0x0d
    && bytes[5] === 0x0a
    && bytes[6] === 0x1a
    && bytes[7] === 0x0a
  ) return "image/png";
  if (
    bytes.length >= 12
    && bytes[0] === 0x52
    && bytes[1] === 0x49
    && bytes[2] === 0x46
    && bytes[3] === 0x46
    && bytes[8] === 0x57
    && bytes[9] === 0x45
    && bytes[10] === 0x42
    && bytes[11] === 0x50
  ) return "image/webp";
  if (
    bytes.length >= 12
    && bytes[4] === 0x66
    && bytes[5] === 0x74
    && bytes[6] === 0x79
    && bytes[7] === 0x70
    && ((bytes[8] === 0x61 && bytes[9] === 0x76 && bytes[10] === 0x69 && bytes[11] === 0x66)
      || (bytes[8] === 0x61 && bytes[9] === 0x76 && bytes[10] === 0x69 && bytes[11] === 0x73))
  ) return "image/avif";
  return null;
}

export function admitMaterialImageSource(input: {
  sizeBytes: number;
  declaredMimeType?: string | null;
  headerBytes: Uint8Array;
}): MaterialImageSourceAdmission {
  if (!Number.isSafeInteger(input.sizeBytes) || input.sizeBytes <= 0) {
    return materialImageUploadFailure("empty_file");
  }
  if (input.sizeBytes > MATERIAL_IMAGE_MAX_BYTES) return materialImageUploadFailure("too_large");

  const normalizedDeclaredMimeType = input.declaredMimeType?.trim() || null;
  if (normalizedDeclaredMimeType && !isMaterialImageMimeType(normalizedDeclaredMimeType)) {
    return materialImageUploadFailure("unsupported_type");
  }
  const declaredMimeType = normalizedDeclaredMimeType as MaterialImageMimeType | null;

  const magicMimeType = sniffMaterialImageMimeType(input.headerBytes);
  if (!magicMimeType) return materialImageUploadFailure("invalid_magic");
  if (declaredMimeType && declaredMimeType !== magicMimeType) {
    return materialImageUploadFailure("type_mismatch");
  }
  return { ok: true, declaredMimeType, magicMimeType };
}

export function materialImageBucketForSurface(surface: MaterialImageSurface): MaterialImageBucket {
  return surface === "project-image" ? "project-images" : "component-images";
}

export function isSafeMaterialImageStoragePath(value: unknown): value is string {
  return typeof value === "string"
    && value.length > 0
    && !value.startsWith("/")
    && !value.includes("..")
    && !value.includes("\\")
    && !value.includes("//")
    && value.endsWith(".webp");
}

export function isEstimateRowProjectImageStoragePath(
  value: unknown,
  expected: {
    workspaceId: string;
    actorUserId: string;
    projectId: string;
    estimateId: string;
  },
): value is string {
  if (!isSafeMaterialImageStoragePath(value)) return false;
  const segments = value.split("/");
  return segments.length === 7
    && segments[0] === expected.workspaceId
    && segments[1] === expected.actorUserId
    && segments[2] === "project-images"
    && segments[3] === expected.projectId
    && segments[4] === "estimate-row-images"
    && segments[5] === expected.estimateId
    && Boolean(segments[6]);
}

function isMaterialImageServingUrl(value: unknown): value is string {
  if (typeof value !== "string" || value.length === 0) return false;
  if (value.startsWith("/") && !value.startsWith("//")) return true;
  try {
    const url = new URL(value);
    return url.protocol === "https:" && !url.username && !url.password;
  } catch {
    return false;
  }
}

function isPrivateBrokeredMaterialImageUrl(value: unknown): value is string {
  return typeof value === "string" && value.startsWith("/") && !value.startsWith("//");
}

function readRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown>
    : null;
}

function readRequiredText(record: Record<string, unknown>, key: string) {
  const value = record[key];
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : null;
}

function readPositiveInteger(record: Record<string, unknown>, key: string) {
  const value = record[key];
  return typeof value === "number" && Number.isSafeInteger(value) && value > 0 ? value : null;
}

function isAuthorizedMaterialImageServingUrl(
  value: unknown,
  assetId: string,
  variant: "image" | "thumbnail",
) {
  if (!isMaterialImageServingUrl(value)) return false;
  const url = new URL(value as string, "https://archestimator.invalid");
  if (url.pathname !== "/api/projects/images") return true;
  return isPrivateBrokeredMaterialImageUrl(value)
    && url.searchParams.get("assetId") === assetId
    && url.searchParams.get("variant") === variant
    && !url.searchParams.has("path");
}

export function parseMaterialImageUploadResult(value: unknown): MaterialImageUploadResult | null {
  const record = readRecord(value);
  if (!record) return null;
  const assetId = readRequiredText(record, "assetId");
  const uploadSessionId = readRequiredText(record, "uploadSessionId");
  const bucket = record.bucket;
  const path = record.path;
  const thumbnailPath = record.thumbnailPath;
  const url = record.url;
  const thumbnailUrl = record.thumbnailUrl;
  const fileName = readRequiredText(record, "fileName");
  const sizeBytes = readPositiveInteger(record, "sizeBytes");
  const width = readPositiveInteger(record, "width");
  const height = readPositiveInteger(record, "height");
  const thumbnailWidth = readPositiveInteger(record, "thumbnailWidth");
  const thumbnailHeight = readPositiveInteger(record, "thumbnailHeight");
  const originalBytes = readPositiveInteger(record, "originalBytes");
  const checksumSha256 = readRequiredText(record, "checksumSha256");

  if (
    !assetId
    || !uploadSessionId
    || (bucket !== "project-images" && bucket !== "component-images")
    || !isSafeMaterialImageStoragePath(path)
    || !isSafeMaterialImageStoragePath(thumbnailPath)
    || path === thumbnailPath
    || !isAuthorizedMaterialImageServingUrl(url, assetId, "image")
    || !isAuthorizedMaterialImageServingUrl(thumbnailUrl, assetId, "thumbnail")
    || !fileName
    || record.contentType !== MATERIAL_IMAGE_CONTENT_TYPE
    || !sizeBytes
    || !width
    || !height
    || !thumbnailWidth
    || !thumbnailHeight
    || !originalBytes
    || !isMaterialImageMimeType(record.originalContentType)
    || !checksumSha256
    || !SHA256_PATTERN.test(checksumSha256)
    || (record.scanStatus !== "not_required" && record.scanStatus !== "pending")
  ) return null;

  return {
    assetId,
    uploadSessionId,
    bucket,
    path,
    thumbnailPath,
    url: url as string,
    thumbnailUrl: thumbnailUrl as string,
    fileName,
    contentType: MATERIAL_IMAGE_CONTENT_TYPE,
    sizeBytes,
    width,
    height,
    thumbnailWidth,
    thumbnailHeight,
    originalBytes,
    originalContentType: record.originalContentType,
    checksumSha256,
    scanStatus: record.scanStatus,
  };
}

export function toMaterialImageAssetDescriptor(result: MaterialImageUploadResult): MaterialImageAssetDescriptor {
  return {
    kind: "upload-asset",
    schemaVersion: 1,
    assetId: result.assetId,
    uploadSessionId: result.uploadSessionId,
    bucket: result.bucket,
    path: result.path,
    thumbnailPath: result.thumbnailPath,
    url: result.url,
    thumbnailUrl: result.thumbnailUrl,
    fileName: result.fileName,
    contentType: result.contentType,
    sizeBytes: result.sizeBytes,
    scanStatus: result.scanStatus,
    width: result.width,
    height: result.height,
    thumbnailWidth: result.thumbnailWidth,
    thumbnailHeight: result.thumbnailHeight,
  };
}

export function parseMaterialImageAssetDescriptor(value: unknown): MaterialImageAssetDescriptor | null {
  const record = readRecord(value);
  if (!record || record.kind !== "upload-asset" || record.schemaVersion !== 1) return null;
  const result = parseMaterialImageUploadResult({
    ...record,
    originalBytes: 1,
    originalContentType: "image/jpeg",
    checksumSha256: "0".repeat(64),
  });
  return result ? toMaterialImageAssetDescriptor(result) : null;
}

export function toMaterialImageUploadResult(
  stored: MaterialImageStoredUploadResult,
  serving: { url: string; thumbnailUrl: string },
): MaterialImageUploadResult {
  const result = {
    ...stored,
    url: serving.url,
    thumbnailUrl: serving.thumbnailUrl,
  } satisfies MaterialImageUploadResult;
  if (!parseMaterialImageUploadResult(result)) {
    throw new Error("Material image serving authorization is invalid.");
  }
  return result;
}

export function toOpaqueMaterialImageUploadResult(
  stored: MaterialImageStoredUploadResult,
  serving: { url: string; thumbnailUrl: string },
): OpaqueMaterialImageUploadResult {
  const result = toMaterialImageUploadResult(stored, serving);
  return {
    ...opaqueMaterialImageAssetFields(result),
    originalBytes: result.originalBytes,
    originalContentType: result.originalContentType,
    checksumSha256: result.checksumSha256,
  };
}

function opaqueMaterialImageAssetFields(result: OpaqueMaterialImageUploadResult) {
  return {
    assetId: result.assetId,
    uploadSessionId: result.uploadSessionId,
    url: result.url,
    thumbnailUrl: result.thumbnailUrl,
    fileName: result.fileName,
    contentType: result.contentType,
    sizeBytes: result.sizeBytes,
    width: result.width,
    height: result.height,
    thumbnailWidth: result.thumbnailWidth,
    thumbnailHeight: result.thumbnailHeight,
    scanStatus: result.scanStatus,
  };
}

export function toOpaqueMaterialImageAssetDescriptor(
  result: OpaqueMaterialImageUploadResult,
): OpaqueMaterialImageAssetDescriptor {
  return {
    kind: "upload-asset",
    schemaVersion: 1,
    ...opaqueMaterialImageAssetFields(result),
  };
}
