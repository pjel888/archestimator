import type { BeforeSendEvent } from "@vercel/analytics/next";

const ANALYTICS_URL_BASE = "https://archestimator.local";
const URL_SCHEME_PATTERN = /^[a-z][a-z\d+\-.]*:/i;
const TOKENIZED_PATH_PREFIXES = ["/share", "/invite"] as const;
const AUTHENTICATED_PATH_PREFIXES = ["/workshop"] as const;

function isPathWithinPrefix(pathname: string, prefix: string) {
  return pathname === prefix || pathname.startsWith(`${prefix}/`);
}

function isSensitiveAnalyticsPath(pathname: string) {
  return (
    TOKENIZED_PATH_PREFIXES.some((prefix) => isPathWithinPrefix(pathname, prefix)) ||
    AUTHENTICATED_PATH_PREFIXES.some((prefix) => isPathWithinPrefix(pathname, prefix))
  );
}

function parseAnalyticsUrl(rawUrl: string) {
  try {
    return {
      url: new URL(rawUrl, ANALYTICS_URL_BASE),
      wasRelative: !URL_SCHEME_PATTERN.test(rawUrl),
    };
  } catch {
    return null;
  }
}

function normalizedAnalyticsUrl(rawUrl: string) {
  const parsed = parseAnalyticsUrl(rawUrl);
  if (!parsed) return null;
  if (isSensitiveAnalyticsPath(parsed.url.pathname)) return null;

  if (parsed.wasRelative) return parsed.url.pathname;
  return `${parsed.url.origin}${parsed.url.pathname}`;
}

export function redactVercelAnalyticsEvent(event: BeforeSendEvent): BeforeSendEvent | null {
  if (typeof event.url !== "string") return null;

  const sanitizedUrl = normalizedAnalyticsUrl(event.url);
  if (!sanitizedUrl) return null;

  return {
    ...event,
    url: sanitizedUrl,
  };
}
