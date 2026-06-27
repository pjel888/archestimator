import {
  classifyUploadImageReference,
  type UploadImageReferenceContext,
  type UploadImageReferenceRecord,
} from "./component-image-backfill";

export type UploadAssetDescriptorV1 = {
  kind: "upload-asset";
  schemaVersion: 1;
  assetId: string;
  uploadSessionId?: string | null;
  bucket: "component-images" | "project-images";
  path: string;
  thumbnailPath?: string | null;
  url?: string | null;
  thumbnailUrl?: string | null;
  fileName?: string | null;
  contentType: string;
  sizeBytes: number;
  scanStatus: string;
  width?: number | null;
  height?: number | null;
  thumbnailWidth?: number | null;
  thumbnailHeight?: number | null;
};

export type UploadProviderObjectLocator = {
  bucket: "component-images" | "project-images";
  path: string;
  thumbnailPath?: string | null;
};

export type UploadReferencePortabilityResult =
  | {
    ok: true;
    id: string;
    context: UploadImageReferenceContext;
    source: "asset_descriptor" | "brokered_private" | "legacy_public_component_image";
    action: "none" | "rewrite_legacy_public_to_broker";
    locator: UploadProviderObjectLocator;
    brokerUrl: string;
  }
  | {
    ok: true;
    id: string;
    context: UploadImageReferenceContext;
    source: "local_derivative" | "missing";
    action: "none";
    locator: null;
    brokerUrl: null;
  }
  | {
    ok: false;
    id: string;
    context: UploadImageReferenceContext;
    action: "manual_review";
    reason:
      | "descriptor_invalid"
      | "descriptor_url_mismatch"
      | "external_url"
      | "unsafe_url"
      | "unsupported_internal_route";
  };

export type UploadReferencePortabilitySummary = {
  total: number;
  providerBacked: number;
  needsLegacyRewrite: number;
  readyWithoutProviderObject: number;
  manualReview: number;
};

const COMPONENT_IMAGE_BUCKET = "component-images";
const PROJECT_IMAGE_BUCKET = "project-images";
const COMPONENT_IMAGE_ROUTE = "/api/component-library/images";
const PROJECT_IMAGE_ROUTE = "/api/projects/images";
const LEGACY_COMPONENT_IMAGE_PUBLIC_PATH_PREFIX = "/storage/v1/object/public/component-images/";

function readRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};
}

function readText(record: Record<string, unknown>, key: string) {
  const value = record[key];
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : null;
}

function isSafeStoragePath(path: string) {
  return Boolean(path && !path.startsWith("/") && !path.includes("..") && !path.includes("\\") && !path.includes("//"));
}

function bucketForRoute(pathname: string): UploadProviderObjectLocator["bucket"] | null {
  if (pathname === COMPONENT_IMAGE_ROUTE) return COMPONENT_IMAGE_BUCKET;
  if (pathname === PROJECT_IMAGE_ROUTE) return PROJECT_IMAGE_BUCKET;
  return null;
}

function routeForBucket(bucket: UploadProviderObjectLocator["bucket"]) {
  return bucket === COMPONENT_IMAGE_BUCKET ? COMPONENT_IMAGE_ROUTE : PROJECT_IMAGE_ROUTE;
}

export function createBrokeredUploadImageUrl(locator: UploadProviderObjectLocator) {
  return `${routeForBucket(locator.bucket)}?${new URLSearchParams({ path: locator.path }).toString()}`;
}

function parseBrokeredRoute(rawUrl: string): UploadProviderObjectLocator | null {
  if (!rawUrl.startsWith("/")) return null;
  const url = new URL(rawUrl, "https://archestimator.local");
  const bucket = bucketForRoute(url.pathname);
  const path = url.searchParams.get("path")?.trim();
  if (!bucket || !path || !isSafeStoragePath(path)) return null;
  return { bucket, path };
}

function parseLegacyPublicComponentImageUrl(rawUrl: string): UploadProviderObjectLocator | null {
  try {
    const url = new URL(rawUrl);
    if (url.username || url.password || url.hash || url.search) return null;
    if (!url.pathname.startsWith(LEGACY_COMPONENT_IMAGE_PUBLIC_PATH_PREFIX) || !url.pathname.endsWith(".webp")) {
      return null;
    }

    const path = decodeURIComponent(url.pathname.slice(LEGACY_COMPONENT_IMAGE_PUBLIC_PATH_PREFIX.length));
    if (!isSafeStoragePath(path)) return null;
    return { bucket: COMPONENT_IMAGE_BUCKET, path };
  } catch {
    return null;
  }
}

function parseReferenceUrl(rawUrl: string): UploadProviderObjectLocator | null {
  return parseBrokeredRoute(rawUrl) ?? parseLegacyPublicComponentImageUrl(rawUrl);
}

function sameLocator(left: UploadProviderObjectLocator, right: UploadProviderObjectLocator) {
  return left.bucket === right.bucket && left.path === right.path;
}

function parseAssetDescriptor(value: unknown): UploadAssetDescriptorV1 | null {
  const record = readRecord(value);
  const assetId = readText(record, "assetId");
  const bucket = readText(record, "bucket");
  const path = readText(record, "path");
  const contentType = readText(record, "contentType");
  const scanStatus = readText(record, "scanStatus");
  if (
    record.kind !== "upload-asset"
    || record.schemaVersion !== 1
    || !assetId
    || (bucket !== COMPONENT_IMAGE_BUCKET && bucket !== PROJECT_IMAGE_BUCKET)
    || !path
    || !isSafeStoragePath(path)
    || !contentType
    || typeof record.sizeBytes !== "number"
    || !Number.isFinite(record.sizeBytes)
    || record.sizeBytes <= 0
    || !scanStatus
  ) {
    return null;
  }

  const thumbnailPath = readText(record, "thumbnailPath");
  if (thumbnailPath && !isSafeStoragePath(thumbnailPath)) return null;

  return {
    kind: "upload-asset",
    schemaVersion: 1,
    assetId,
    uploadSessionId: readText(record, "uploadSessionId"),
    bucket,
    path,
    thumbnailPath,
    url: readText(record, "url"),
    thumbnailUrl: readText(record, "thumbnailUrl"),
    fileName: readText(record, "fileName"),
    contentType,
    sizeBytes: record.sizeBytes,
    scanStatus,
    width: typeof record.width === "number" && Number.isFinite(record.width) ? record.width : null,
    height: typeof record.height === "number" && Number.isFinite(record.height) ? record.height : null,
    thumbnailWidth: typeof record.thumbnailWidth === "number" && Number.isFinite(record.thumbnailWidth) ? record.thumbnailWidth : null,
    thumbnailHeight: typeof record.thumbnailHeight === "number" && Number.isFinite(record.thumbnailHeight) ? record.thumbnailHeight : null,
  };
}

function normalizeDescriptor(record: UploadImageReferenceRecord): UploadReferencePortabilityResult {
  const descriptor = parseAssetDescriptor(record.imageAsset);
  if (!descriptor) {
    return { ok: false, id: record.id, context: record.context, action: "manual_review", reason: "descriptor_invalid" };
  }

  const locator: UploadProviderObjectLocator = {
    bucket: descriptor.bucket,
    path: descriptor.path,
    thumbnailPath: descriptor.thumbnailPath ?? null,
  };
  const urlLocator = descriptor.url ? parseReferenceUrl(descriptor.url) : null;
  if (descriptor.url && (!urlLocator || !sameLocator(locator, urlLocator))) {
    return { ok: false, id: record.id, context: record.context, action: "manual_review", reason: "descriptor_url_mismatch" };
  }

  if (descriptor.thumbnailUrl && descriptor.thumbnailPath) {
    const thumbnailLocator = parseReferenceUrl(descriptor.thumbnailUrl);
    const expectedThumbnailLocator: UploadProviderObjectLocator = {
      bucket: descriptor.bucket,
      path: descriptor.thumbnailPath,
    };
    if (!thumbnailLocator || !sameLocator(expectedThumbnailLocator, thumbnailLocator)) {
      return { ok: false, id: record.id, context: record.context, action: "manual_review", reason: "descriptor_url_mismatch" };
    }
  }

  return {
    ok: true,
    id: record.id,
    context: record.context,
    source: "asset_descriptor",
    action: "none",
    locator,
    brokerUrl: createBrokeredUploadImageUrl(locator),
  };
}

export function normalizeUploadImageReferenceForProvider(
  record: UploadImageReferenceRecord,
): UploadReferencePortabilityResult {
  if (record.imageAsset !== null && record.imageAsset !== undefined) return normalizeDescriptor(record);

  const rawImageUrl = typeof record.imageUrl === "string" ? record.imageUrl.trim() : "";
  const brokeredLocator = parseBrokeredRoute(rawImageUrl);
  if (brokeredLocator) {
    return {
      ok: true,
      id: record.id,
      context: record.context,
      source: "brokered_private",
      action: "none",
      locator: brokeredLocator,
      brokerUrl: createBrokeredUploadImageUrl(brokeredLocator),
    };
  }

  const classification = classifyUploadImageReference(record);
  if (classification.status === "legacy_public_component_image") {
    const locator: UploadProviderObjectLocator = {
      bucket: COMPONENT_IMAGE_BUCKET,
      path: classification.storagePath,
    };
    return {
      ok: true,
      id: record.id,
      context: record.context,
      source: "legacy_public_component_image",
      action: "rewrite_legacy_public_to_broker",
      locator,
      brokerUrl: createBrokeredUploadImageUrl(locator),
    };
  }
  if (classification.status === "brokered_private") {
    const locator = parseBrokeredRoute(rawImageUrl);
    if (!locator) {
      return { ok: false, id: record.id, context: record.context, action: "manual_review", reason: "unsafe_url" };
    }
    return {
      ok: true,
      id: record.id,
      context: record.context,
      source: "brokered_private",
      action: "none",
      locator,
      brokerUrl: createBrokeredUploadImageUrl(locator),
    };
  }
  if (classification.status === "local_derivative" || classification.status === "missing") {
    return {
      ok: true,
      id: record.id,
      context: record.context,
      source: classification.status,
      action: "none",
      locator: null,
      brokerUrl: null,
    };
  }

  if (classification.status === "external_or_unsafe") {
    return {
      ok: false,
      id: record.id,
      context: record.context,
      action: "manual_review",
      reason: classification.reason,
    };
  }

  return {
    ok: false,
    id: record.id,
    context: record.context,
    action: "manual_review",
    reason: "descriptor_invalid",
  };
}

export function summarizeUploadReferencePortability(
  results: readonly UploadReferencePortabilityResult[],
): UploadReferencePortabilitySummary {
  let providerBacked = 0;
  let needsLegacyRewrite = 0;
  let readyWithoutProviderObject = 0;
  let manualReview = 0;

  for (const result of results) {
    if (!result.ok) {
      manualReview += 1;
    } else if (result.action === "rewrite_legacy_public_to_broker") {
      providerBacked += 1;
      needsLegacyRewrite += 1;
    } else if (result.locator) {
      providerBacked += 1;
    } else {
      readyWithoutProviderObject += 1;
    }
  }

  return {
    total: results.length,
    providerBacked,
    needsLegacyRewrite,
    readyWithoutProviderObject,
    manualReview,
  };
}
