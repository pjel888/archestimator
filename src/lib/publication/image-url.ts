const LOCAL_COMPONENT_THUMBNAIL_PATTERN =
  /^\/component-thumbnails\/[A-Za-z0-9._-]+\.(?:avif|jpe?g|png|webp)$/i;
const LOCAL_BROKERED_IMAGE_ROUTE_PATTERN =
  /^\/api\/(?:projects|component-library)\/images\?path=[A-Za-z0-9._~!$&'()*+,;=:@/%-]+$/i;

export function normalizePublicationImageUrl(value: unknown): string | null {
  if (typeof value !== "string") return null;

  const rawUrl = value.trim();
  if (!rawUrl || rawUrl.length > 2048) return null;

  if (LOCAL_COMPONENT_THUMBNAIL_PATTERN.test(rawUrl)) {
    return rawUrl;
  }

  if (LOCAL_BROKERED_IMAGE_ROUTE_PATTERN.test(rawUrl)) {
    const imageUrl = new URL(rawUrl, "https://archestimator.local");
    const path = imageUrl.searchParams.get("path") ?? "";
    if (!path || path.includes("..") || path.includes("\\")) return null;
    if (!/\.(?:avif|jpe?g|png|webp)$/i.test(path)) return null;
    return `${imageUrl.pathname}?${imageUrl.searchParams.toString()}`;
  }

  return null;
}
