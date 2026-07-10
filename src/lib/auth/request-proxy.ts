import { type NextRequest, NextResponse } from "next/server";
import { isCloudflareBetterAuthProviderEnabled } from "@/lib/auth/auth-provider-selection";
import {
  getDevAuthBypassCredentialFromRequestParts,
  isDevAuthBypassRequest,
} from "@/lib/auth/dev-auth-gate";
import {
  clearProtectedRouteGateRequestHeaders,
  markProtectedRouteGateRequestHeaders,
} from "@/lib/auth/protected-route-gate";
import {
  AUTH_REQUEST_PATH_HEADER,
  DEFAULT_AUTH_DESTINATION,
  LOGIN_PATH,
  sanitizeNextPath,
} from "@/lib/auth/redirects";
import { shouldBypassTermsAcceptanceGate } from "@/lib/legal/terms-gate";

const PROTECTED_PREFIXES = ["/workshop", "/admin"];
const AUTH_ROUTES = [LOGIN_PATH];
const PUBLIC_ROUTE_PREFIXES = [
  "/about",
  "/features",
  "/pricing",
  "/contact",
  "/privacy",
  "/terms",
  "/trust",
  "/signup",
  "/invite",
  "/share",
  "/access-required",
];
const MARKETING_PAGE_PATHS = new Set([
  "/",
  "/about",
  "/features",
  "/pricing",
  "/contact",
  "/privacy",
  "/terms",
  "/trust",
  "/signup",
]);
const MARKETING_PAGE_CACHE_CONTROL = "s-maxage=31536000";
const SENSITIVE_ROUTE_CACHE_CONTROL =
  "private, no-cache, no-store, max-age=0, must-revalidate";
const STATE_MISMATCH_ERROR = "state_mismatch";
const OAUTH_STATE_RESET_PARAM = "oauth_state_reset";
const OAUTH_STATE_RESET_CLEAR_SITE_DATA = '"cache", "cookies", "storage"';
const OAUTH_STATE_COOKIE_NAMES = [
  "better-auth.state",
  "__Secure-better-auth.state",
  "better-auth.oauth_state",
  "__Secure-better-auth.oauth_state",
];
const BETTER_AUTH_SESSION_COOKIE_NAMES = [
  "better-auth.session_token",
  "__Secure-better-auth.session_token",
];
type ProtectedRouteGateState = {
  authVerified?: boolean;
  termsAccepted?: boolean;
};

function isPublicRoute(pathname: string) {
  return (
    pathname === "/" ||
    PUBLIC_ROUTE_PREFIXES.some(
      (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
    )
  );
}

function isMarketingPage(pathname: string) {
  return MARKETING_PAGE_PATHS.has(pathname);
}

function isShareRoute(pathname: string) {
  return pathname === "/share" || pathname.startsWith("/share/");
}

function isLocalDevelopmentHost(hostname: string) {
  return (
    process.env.NODE_ENV !== "production" &&
    (hostname === "localhost" ||
      hostname === "127.0.0.1" ||
      hostname === "::1" ||
      hostname.endsWith(".localhost"))
  );
}

function hasBetterAuthSessionCookie(request: NextRequest) {
  return BETTER_AUTH_SESSION_COOKIE_NAMES.some((name) =>
    Boolean(request.cookies.get(name)?.value),
  );
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
    markProtectedRouteGateRequestHeaders(
      requestHeaders,
      protectedRouteGateState,
    );
  }
  return NextResponse.next({
    request: { headers: requestHeaders },
    headers: responseHeaders,
  });
}

function withSensitiveRouteCacheControl(response: NextResponse) {
  response.headers.set("Cache-Control", SENSITIVE_ROUTE_CACHE_CONTROL);
  return response;
}

function redirectWithSensitiveRouteCacheControl(url: URL) {
  return withSensitiveRouteCacheControl(NextResponse.redirect(url));
}

function redirectStateMismatchToCleanLogin(request: NextRequest) {
  if (
    request.method !== "GET" ||
    request.nextUrl.searchParams.get("error") !== STATE_MISMATCH_ERROR
  ) {
    return null;
  }

  const loginUrl = new URL(LOGIN_PATH, request.url);
  loginUrl.searchParams.set("next", DEFAULT_AUTH_DESTINATION);
  loginUrl.searchParams.set(OAUTH_STATE_RESET_PARAM, "1");

  const response = redirectWithSensitiveRouteCacheControl(loginUrl);
  response.headers.set("Clear-Site-Data", OAUTH_STATE_RESET_CLEAR_SITE_DATA);
  for (const name of OAUTH_STATE_COOKIE_NAMES) {
    response.cookies.set(name, "", {
      httpOnly: true,
      maxAge: 0,
      path: "/",
      sameSite: "lax",
      secure: true,
    });
  }
  return response;
}

export async function proxy(request: NextRequest) {
  const pathname = request.nextUrl.pathname;
  const requestPath = sanitizeNextPath(`${pathname}${request.nextUrl.search}`);
  const bypassesTermsGate = shouldBypassTermsAcceptanceGate(requestPath);

  if (
    pathname.includes(".") ||
    pathname.startsWith("/_next") ||
    pathname.startsWith("/api")
  ) {
    return NextResponse.next({ request });
  }

  const stateMismatchRedirect = redirectStateMismatchToCleanLogin(request);
  if (stateMismatchRedirect) return stateMismatchRedirect;

  const isProtected = PROTECTED_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
  const isAuthRoute = AUTH_ROUTES.includes(pathname);

  const devAuthBypassCredential = getDevAuthBypassCredentialFromRequestParts(
    request.headers,
    request.cookies,
  );

  if (
    isDevAuthBypassRequest(request.nextUrl.hostname, devAuthBypassCredential)
  ) {
    if (isAuthRoute) {
      return redirectWithSensitiveRouteCacheControl(
        new URL(DEFAULT_AUTH_DESTINATION, request.url),
      );
    }

    return createRequestPathResponse(
      request,
      undefined,
      isProtected ? { authVerified: true, termsAccepted: true } : undefined,
    );
  }

  const response = createRequestPathResponse(request);

  if (isPublicRoute(pathname)) {
    if (isMarketingPage(pathname)) {
      response.headers.set("Cache-Control", MARKETING_PAGE_CACHE_CONTROL);
    } else if (isShareRoute(pathname)) {
      return createRequestPathResponse(request, {
        "Cache-Control": SENSITIVE_ROUTE_CACHE_CONTROL,
      });
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

  const hasBetterAuthCookie = hasBetterAuthSessionCookie(request);
  if (isProtected && !hasBetterAuthCookie) {
    const loginUrl = new URL(LOGIN_PATH, request.url);
    loginUrl.searchParams.set(
      "next",
      sanitizeNextPath(`${pathname}${request.nextUrl.search}`),
    );
    return redirectWithSensitiveRouteCacheControl(loginUrl);
  }

  if (hasBetterAuthCookie && isAuthRoute) {
    return redirectWithSensitiveRouteCacheControl(
      new URL(DEFAULT_AUTH_DESTINATION, request.url),
    );
  }

  if (hasBetterAuthCookie && isProtected) {
    if (isLocalDevelopmentHost(request.nextUrl.hostname)) {
      return createRequestPathResponse(request);
    }

    return createRequestPathResponse(request);
  }

  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
