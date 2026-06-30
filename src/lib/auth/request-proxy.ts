import { type NextRequest, NextResponse } from "next/server";
import { isCloudflareBetterAuthProviderEnabled } from "@/lib/auth/auth-provider-selection";
import type { BetterAuthRouteGateUserIdentity } from "@/lib/auth/better-auth-cloudflare";
import { getDevAuthBypassCredentialFromRequestParts, isDevAuthBypassRequest } from "@/lib/auth/dev-auth-gate";
import {
  clearProtectedRouteGateRequestHeaders,
  markProtectedRouteGateRequestHeaders,
} from "@/lib/auth/protected-route-gate";
import { AUTH_REQUEST_PATH_HEADER, DEFAULT_AUTH_DESTINATION, LOGIN_PATH, sanitizeNextPath } from "@/lib/auth/redirects";
import {
  TERMS_GATE_COOKIE_NAME,
  verifyTermsGateCookieValue,
} from "@/lib/legal/terms-gate-cookie";
import { shouldBypassTermsAcceptanceGate } from "@/lib/legal/terms-gate";

const PROTECTED_PREFIXES = ["/workshop"];
const AUTH_ROUTES = [LOGIN_PATH];
const PUBLIC_ROUTE_PREFIXES = ["/about", "/features", "/pricing", "/contact", "/privacy", "/terms", "/trust", "/signup", "/invite", "/share", "/access-required"];
const MARKETING_PAGE_PATHS = new Set(["/", "/about", "/features", "/pricing", "/contact", "/privacy", "/terms", "/trust", "/signup"]);
const MARKETING_PAGE_CACHE_CONTROL = "s-maxage=31536000";
const SENSITIVE_ROUTE_CACHE_CONTROL = "private, no-cache, no-store, max-age=0, must-revalidate";
type ProtectedRouteGateState = {
  authVerified?: boolean;
  termsAccepted?: boolean;
};
type ProxyAuthIdentity = {
  id: string;
  email: string | null;
};
type CloudflareBetterAuthRuntime = typeof import("@/lib/auth/cloudflare-better-auth-runtime");

let cloudflareBetterAuthRuntimePromise: Promise<CloudflareBetterAuthRuntime> | null = null;

function loadCloudflareBetterAuthRuntime() {
  cloudflareBetterAuthRuntimePromise ??= import("@/lib/auth/cloudflare-better-auth-runtime");
  return cloudflareBetterAuthRuntimePromise;
}

function isPublicRoute(pathname: string) {
  return pathname === "/" || PUBLIC_ROUTE_PREFIXES.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`));
}

function isMarketingPage(pathname: string) {
  return MARKETING_PAGE_PATHS.has(pathname);
}

function isShareRoute(pathname: string) {
  return pathname === "/share" || pathname.startsWith("/share/");
}

function createRequestPathResponse(
  request: NextRequest,
  responseHeaders?: HeadersInit,
  protectedRouteGateState?: ProtectedRouteGateState,
) {
  const requestHeaders = new Headers(request.headers);
  clearProtectedRouteGateRequestHeaders(requestHeaders);
  requestHeaders.set(
    AUTH_REQUEST_PATH_HEADER,
    sanitizeNextPath(`${request.nextUrl.pathname}${request.nextUrl.search}`),
  );
  if (protectedRouteGateState) {
    markProtectedRouteGateRequestHeaders(requestHeaders, protectedRouteGateState);
  }
  return NextResponse.next({ request: { headers: requestHeaders }, headers: responseHeaders });
}

function withSensitiveRouteCacheControl(response: NextResponse) {
  response.headers.set("Cache-Control", SENSITIVE_ROUTE_CACHE_CONTROL);
  return response;
}

function redirectWithSensitiveRouteCacheControl(url: URL) {
  return withSensitiveRouteCacheControl(NextResponse.redirect(url));
}

function toProxyIdentityFromBetterAuth(identity: BetterAuthRouteGateUserIdentity | null): ProxyAuthIdentity | null {
  if (!identity) return null;
  return {
    id: identity.id,
    email: identity.email,
  };
}

export async function proxy(request: NextRequest) {
  const pathname = request.nextUrl.pathname;
  const requestPath = sanitizeNextPath(`${pathname}${request.nextUrl.search}`);
  const bypassesTermsGate = shouldBypassTermsAcceptanceGate(requestPath);

  if (pathname.includes(".") || pathname.startsWith("/_next") || pathname.startsWith("/api")) {
    return NextResponse.next({ request });
  }

  const isProtected = PROTECTED_PREFIXES.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`));
  const isAuthRoute = AUTH_ROUTES.includes(pathname);

  const devAuthBypassCredential = getDevAuthBypassCredentialFromRequestParts(request.headers, request.cookies);

  if (isDevAuthBypassRequest(request.nextUrl.hostname, devAuthBypassCredential)) {
    if (isAuthRoute) {
      return redirectWithSensitiveRouteCacheControl(new URL(DEFAULT_AUTH_DESTINATION, request.url));
    }

    return createRequestPathResponse(
      request,
      undefined,
      isProtected ? { authVerified: true, termsAccepted: true } : undefined,
    );
  }

  let response = createRequestPathResponse(request);

  if (isPublicRoute(pathname)) {
    if (isMarketingPage(pathname)) {
      response.headers.set("Cache-Control", MARKETING_PAGE_CACHE_CONTROL);
    } else if (isShareRoute(pathname)) {
      return createRequestPathResponse(request, { "Cache-Control": SENSITIVE_ROUTE_CACHE_CONTROL });
    }
    return response;
  }

  const useBetterAuthProvider = isCloudflareBetterAuthProviderEnabled();

  if (!useBetterAuthProvider) {
    if (isProtected) {
      const loginUrl = new URL(LOGIN_PATH, request.url);
      loginUrl.searchParams.set(
        "next",
        sanitizeNextPath(`${pathname}${request.nextUrl.search}`),
      );
      return redirectWithSensitiveRouteCacheControl(loginUrl);
    }

    return response;
  }

  let user: ProxyAuthIdentity | null = null;
  const { getCloudflareBetterAuthIdentityFromRequest } = await loadCloudflareBetterAuthRuntime();
  user = toProxyIdentityFromBetterAuth(
    await getCloudflareBetterAuthIdentityFromRequest({
      headers: request.headers,
      requestUrl: request.url,
    }),
  );

  if (!user && isProtected) {
    const loginUrl = new URL(LOGIN_PATH, request.url);
      loginUrl.searchParams.set(
        "next",
        sanitizeNextPath(`${pathname}${request.nextUrl.search}`),
      );
    return redirectWithSensitiveRouteCacheControl(loginUrl);
  }

  const termsAcceptedByProxy = user && isProtected && !bypassesTermsGate
      ? await verifyTermsGateCookieValue(request.cookies.get(TERMS_GATE_COOKIE_NAME)?.value, user.id)
      : false;

  if (user && isAuthRoute) {
    return redirectWithSensitiveRouteCacheControl(new URL(DEFAULT_AUTH_DESTINATION, request.url));
  }

  if (user && isProtected) {
    return createRequestPathResponse(request, undefined, {
      authVerified: true,
      termsAccepted: bypassesTermsGate || termsAcceptedByProxy,
    });
  }

  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
