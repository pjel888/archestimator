const LOCAL_COMPONENT_THUMBNAIL_PATTERN =
  /^\/component-thumbnails\/[A-Za-z0-9._-]+\.(?:avif|jpe?g|png|webp)$/i;
const LOCAL_BROKERED_IMAGE_ROUTE_PATTERN =
  /^\/api\/(?:projects|component-library)\/images\?path=[A-Za-z0-9._~!$&'()*+,;=:@/%-]+$/i;
const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function hasOnlyPathParam(url: URL) {
  const params = Array.from(url.searchParams.entries());
  return params.length === 1 && params[0]?.[0] === "path";
}

function isSafeComponentLibraryImagePath(path: string) {
  if (!path || path.includes("..") || path.includes("\\")) return false;
  if (!/\.(?:avif|jpe?g|png|webp)$/i.test(path)) return false;
  return !(
    path === "project-images"
    || path.startsWith("project-images/")
    || path.includes("/project-images/")
  );
}

function isSafeProjectImagePath(path: string) {
  if (!path || path.includes("..") || path.includes("//") || path.includes("\\")) return false;
  if (!path.endsWith(".webp")) return false;

  const segments = path.split("/");
  if (segments.length < 5) return false;
  const [workspaceId, ownerUserId, marker, projectId] = segments;
  const hasProjectThumbnailShape =
    segments.length === 5
    && /^[A-Za-z0-9][A-Za-z0-9._-]*\.webp$/i.test(segments[4] ?? "");
  const hasEstimateRowThumbnailShape =
    segments.length === 7
    && segments[4] === "estimate-row-images"
    && UUID_PATTERN.test(segments[5] ?? "")
    && /^[A-Za-z0-9][A-Za-z0-9._-]*\.webp$/i.test(segments[6] ?? "");

  return Boolean(
    workspaceId
      && ownerUserId
      && marker === "project-images"
      && UUID_PATTERN.test(workspaceId)
      && UUID_PATTERN.test(projectId ?? "")
      && segments.every((segment) => segment.length > 0)
      && (hasProjectThumbnailShape || hasEstimateRowThumbnailShape),
  );
}

export function normalizePublicationImageUrl(value: unknown): string | null {
  if (typeof value !== "string") return null;

  const rawUrl = value.trim();
  if (!rawUrl || rawUrl.length > 2048) return null;

  if (LOCAL_COMPONENT_THUMBNAIL_PATTERN.test(rawUrl)) {
    return rawUrl;
  }

  if (LOCAL_BROKERED_IMAGE_ROUTE_PATTERN.test(rawUrl)) {
    const imageUrl = new URL(rawUrl, "https://archestimator.local");
    if (!hasOnlyPathParam(imageUrl)) return null;
    const path = imageUrl.searchParams.get("path") ?? "";
    if (imageUrl.pathname === "/api/projects/images") {
      if (!isSafeProjectImagePath(path)) return null;
    } else if (imageUrl.pathname === "/api/component-library/images") {
      if (!isSafeComponentLibraryImagePath(path)) return null;
    } else {
      return null;
    }
    return `${imageUrl.pathname}?${imageUrl.searchParams.toString()}`;
  }

  return null;
}

export function normalizeIssuedPublicationImageUrl(value: unknown): string | null {
  const imageUrl = normalizePublicationImageUrl(value);
  if (!imageUrl || LOCAL_BROKERED_IMAGE_ROUTE_PATTERN.test(imageUrl)) return null;
  return imageUrl;
}
