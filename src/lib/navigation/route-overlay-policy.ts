/**
 * Routes that own a segment `loading.tsx` skeleton. Suppress the global spinner
 * overlay on these targets so users see the skeleton instead of double feedback.
 * Threshold for non-suppressed routes remains SHOW_DELAY_MS=150 in navigation-ui-store.
 */
const SKELETON_ROUTE_PREFIXES = ["/workshop", "/share/", "/invite/"] as const;

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
  if (!pathname) return false;
  return SKELETON_ROUTE_PREFIXES.some((prefix) => {
    if (prefix.endsWith("/")) return pathname.startsWith(prefix);
    return pathname === prefix || pathname.startsWith(`${prefix}/`);
  });
}
