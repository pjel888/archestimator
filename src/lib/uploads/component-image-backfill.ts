import type { ProjectPublicationSnapshot } from "@/lib/publication/types";

export type UploadImageReferenceContext =
  | "component-library"
  | "estimate-row-source-snapshot"
  | "publication-snapshot";

export type UploadImageReferenceRecord = {
  id: string;
  context: UploadImageReferenceContext;
  imageUrl?: string | null;
  imageAsset?: unknown;
};

export type UploadImageReferenceClassification =
  | {
    id: string;
    context: UploadImageReferenceContext;
    status: "asset_backed" | "brokered_private" | "local_derivative" | "missing";
    action: "none";
  }
  | {
    id: string;
    context: UploadImageReferenceContext;
    status: "legacy_public_component_image";
    action: "backfill_to_private_resolver";
    storagePath: string;
  }
  | {
    id: string;
    context: UploadImageReferenceContext;
    status: "external_or_unsafe";
    action: "manual_review";
    reason: "external_url" | "unsafe_url" | "unsupported_internal_route";
  };

export type UploadComponentImageBackfillReadiness = {
  total: number;
  ready: number;
  needsBackfill: number;
  manualReview: number;
  missing: number;
  hasLegacyPublicReferences: boolean;
  hasManualReviewReferences: boolean;
};

type UploadImageUrlClassification =
  | { status: "brokered_private" | "local_derivative" | "missing"; action: "none" }
  | { status: "legacy_public_component_image"; action: "backfill_to_private_resolver"; storagePath: string }
  | { status: "external_or_unsafe"; action: "manual_review"; reason: "external_url" | "unsafe_url" | "unsupported_internal_route" };

const LEGACY_COMPONENT_IMAGE_PUBLIC_PATH_PREFIX = "/storage/v1/object/public/component-images/";
const BROKERED_COMPONENT_IMAGE_ROUTE = "/api/component-library/images";
const BROKERED_PROJECT_IMAGE_ROUTE = "/api/projects/images";
const LOCAL_COMPONENT_THUMBNAIL_PATTERN =
  /^\/component-thumbnails\/[A-Za-z0-9._-]+\.(?:avif|jpe?g|png|webp)$/i;

function readRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};
}

function hasAssetDescriptor(value: unknown) {
  const record = readRecord(value);
  return typeof record.assetId === "string"
    && typeof record.bucket === "string"
    && typeof record.path === "string"
    && typeof record.url === "string";
}

function isSafeStoragePath(path: string) {
  return Boolean(path && !path.startsWith("/") && !path.includes("..") && !path.includes("\\") && !path.includes("//"));
}

function classifyInternalRoute(pathname: string) {
  if (pathname === BROKERED_COMPONENT_IMAGE_ROUTE || pathname === BROKERED_PROJECT_IMAGE_ROUTE) return "brokered_private";
  if (LOCAL_COMPONENT_THUMBNAIL_PATTERN.test(pathname)) return "local_derivative";
  return null;
}

function classifyUrl(rawUrl: string): UploadImageUrlClassification {
  if (!rawUrl.trim()) return { status: "missing", action: "none" };
  if (rawUrl.length > 2048 || /%(?:2e|2f|5c)/i.test(rawUrl)) {
    return { status: "external_or_unsafe", action: "manual_review", reason: "unsafe_url" };
  }

  if (rawUrl.startsWith("/")) {
    const routeStatus = classifyInternalRoute(rawUrl.split("?")[0] ?? rawUrl);
    if (routeStatus) return { status: routeStatus, action: "none" };
    return { status: "external_or_unsafe", action: "manual_review", reason: "unsupported_internal_route" };
  }

  try {
    const url = new URL(rawUrl);
    if (url.username || url.password || url.hash || url.search) {
      return { status: "external_or_unsafe", action: "manual_review", reason: "unsafe_url" };
    }
    if (url.pathname.startsWith(LEGACY_COMPONENT_IMAGE_PUBLIC_PATH_PREFIX) && url.pathname.endsWith(".webp")) {
      const storagePath = decodeURIComponent(url.pathname.slice(LEGACY_COMPONENT_IMAGE_PUBLIC_PATH_PREFIX.length));
      if (!isSafeStoragePath(storagePath)) {
        return { status: "external_or_unsafe", action: "manual_review", reason: "unsafe_url" };
      }
      return { status: "legacy_public_component_image", action: "backfill_to_private_resolver", storagePath };
    }
    return { status: "external_or_unsafe", action: "manual_review", reason: "external_url" };
  } catch {
    return { status: "external_or_unsafe", action: "manual_review", reason: "unsafe_url" };
  }
}

export function classifyUploadImageReference(
  record: UploadImageReferenceRecord,
): UploadImageReferenceClassification {
  if (hasAssetDescriptor(record.imageAsset)) {
    return {
      id: record.id,
      context: record.context,
      status: "asset_backed",
      action: "none",
    };
  }

  const urlClassification = classifyUrl(typeof record.imageUrl === "string" ? record.imageUrl.trim() : "");
  return {
    id: record.id,
    context: record.context,
    ...urlClassification,
  } as UploadImageReferenceClassification;
}

export function summarizeUploadComponentImageBackfillReadiness(
  classifications: readonly UploadImageReferenceClassification[],
): UploadComponentImageBackfillReadiness {
  let ready = 0;
  let needsBackfill = 0;
  let manualReview = 0;
  let missing = 0;

  for (const classification of classifications) {
    if (classification.status === "legacy_public_component_image") {
      needsBackfill += 1;
    } else if (classification.status === "external_or_unsafe") {
      manualReview += 1;
    } else if (classification.status === "missing") {
      missing += 1;
    } else {
      ready += 1;
    }
  }

  return {
    total: classifications.length,
    ready,
    needsBackfill,
    manualReview,
    missing,
    hasLegacyPublicReferences: needsBackfill > 0,
    hasManualReviewReferences: manualReview > 0,
  };
}

export function collectPublicationSnapshotImageReferences(
  snapshot: ProjectPublicationSnapshot,
): UploadImageReferenceRecord[] {
  const records: UploadImageReferenceRecord[] = [];

  for (const estimate of snapshot.estimates ?? []) {
    for (const row of estimate.rows ?? []) {
      records.push({
        id: `publication:${estimate.id}:row:${row.id}`,
        context: "publication-snapshot",
        imageUrl: row.imageUrl ?? null,
      });
    }

    for (const tab of estimate.tabs ?? []) {
      for (const row of tab.rows ?? []) {
        records.push({
          id: `publication:${estimate.id}:tab:${tab.id}:row:${row.id}`,
          context: "publication-snapshot",
          imageUrl: row.imageUrl ?? null,
        });
      }
    }
  }

  return records;
}
