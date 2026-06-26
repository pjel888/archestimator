const ESTIMATE_SHEET_ROUTE_PATTERN =
  /^\/workshop\/projects\/[^/?#]+\/estimates\/[^/?#]+\/?$/;

function getPathname(href: string): string | null {
  try {
    return new URL(href, "https://archestimator.local").pathname;
  } catch {
    return null;
  }
}

export function shouldSuppressGlobalRouteOverlay(
  targetHref?: string | null,
): boolean {
  if (!targetHref) return false;
  const pathname = getPathname(targetHref);
  return pathname !== null && ESTIMATE_SHEET_ROUTE_PATTERN.test(pathname);
}
