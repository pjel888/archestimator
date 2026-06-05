const SAFE_COMPONENT_SOURCE_PROTOCOLS = new Set(["http:", "https:"]);

function hasControlCharacters(value: string) {
  return /[\u0000-\u001f\u007f]/.test(value);
}

export function sanitizeComponentSourceUrl(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const sourceUrl = value.trim();
  if (!sourceUrl || hasControlCharacters(sourceUrl)) return null;

  if (sourceUrl.startsWith("/")) {
    return sourceUrl.startsWith("//") || sourceUrl.startsWith("/\\") ? null : sourceUrl;
  }

  try {
    const url = new URL(sourceUrl);
    return SAFE_COMPONENT_SOURCE_PROTOCOLS.has(url.protocol) ? sourceUrl : null;
  } catch {
    return null;
  }
}

export function readComponentSourceUrlInput(value: unknown, label = "Source URL") {
  if (typeof value !== "string" || !value.trim()) return null;
  const sourceUrl = sanitizeComponentSourceUrl(value);
  if (!sourceUrl) throw new Error(`${label} must use http, https, or an internal path.`);
  return sourceUrl;
}
