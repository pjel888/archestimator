import { sanitizeNextPath } from "@/lib/auth/redirects";

export const TERMS_ACCEPTANCE_ROUTE = "/workshop/terms";
export const TERMS_GATE_FALLBACK_NEXT = "/workshop";

export function shouldBypassTermsAcceptanceGate(requestPath: string | null | undefined) {
  const rawPath = typeof requestPath === "string" && requestPath.trim() ? requestPath.trim() : TERMS_GATE_FALLBACK_NEXT;
  let pathname = rawPath;
  try {
    pathname = new URL(rawPath, "https://archestimator.local").pathname;
  } catch {
    pathname = rawPath.split("?")[0] ?? rawPath;
  }

  return pathname === TERMS_ACCEPTANCE_ROUTE || pathname.startsWith(`${TERMS_ACCEPTANCE_ROUTE}/`);
}

export function buildTermsAcceptanceRedirectPath(requestPath: string | null | undefined) {
  const safeNext = sanitizeNextPath(requestPath, TERMS_GATE_FALLBACK_NEXT);
  const params = new URLSearchParams({ next: safeNext });
  return `${TERMS_ACCEPTANCE_ROUTE}?${params.toString()}`;
}
