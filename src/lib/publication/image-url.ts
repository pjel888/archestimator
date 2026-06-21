const LOCAL_COMPONENT_THUMBNAIL_PATTERN =
  /^\/component-thumbnails\/[A-Za-z0-9._-]+\.(?:avif|jpe?g|png|webp)$/i;

const SUPABASE_PUBLIC_IMAGE_PREFIXES = [
  "/storage/v1/object/public/component-images/",
];

const SUPABASE_PUBLIC_IMAGE_PATTERN = /\.(?:webp)$/i;

function getConfiguredSupabaseOrigin() {
  const rawUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  if (!rawUrl) return null;

  try {
    return new URL(rawUrl).origin;
  } catch {
    return null;
  }
}

export function normalizePublicationImageUrl(value: unknown): string | null {
  if (typeof value !== "string") return null;

  const rawUrl = value.trim();
  if (!rawUrl || rawUrl.length > 2048) return null;

  if (LOCAL_COMPONENT_THUMBNAIL_PATTERN.test(rawUrl)) {
    return rawUrl;
  }

  if (/%(?:2e|2f|5c)/i.test(rawUrl)) return null;

  const supabaseOrigin = getConfiguredSupabaseOrigin();
  if (!supabaseOrigin) return null;

  try {
    const imageUrl = new URL(rawUrl);
    if (imageUrl.origin !== supabaseOrigin) return null;
    if (imageUrl.username || imageUrl.password) return null;
    if (imageUrl.search || imageUrl.hash) return null;
    if (imageUrl.pathname.includes("..") || imageUrl.pathname.includes("\\")) return null;
    if (!SUPABASE_PUBLIC_IMAGE_PREFIXES.some((prefix) => imageUrl.pathname.startsWith(prefix))) return null;
    if (imageUrl.pathname.includes("/project-images/")) return null;
    if (!SUPABASE_PUBLIC_IMAGE_PATTERN.test(imageUrl.pathname)) return null;

    return imageUrl.href;
  } catch {
    return null;
  }
}
