import { type NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { buildClosedBetaAccessPath, getClosedBetaAccessForEmail } from "@/lib/auth/closed-beta-access";
import { getDevAuthBypassCredentialFromRequestParts, isDevAuthBypassRequest } from "@/lib/auth/dev-auth-gate";
import {
  clearProtectedRouteGateRequestHeaders,
  markProtectedRouteGateRequestHeaders,
} from "@/lib/auth/protected-route-gate";
import { AUTH_REQUEST_PATH_HEADER, DEFAULT_AUTH_DESTINATION, LOGIN_PATH, sanitizeNextPath } from "@/lib/auth/redirects";
import {
  readCurrentUserTermsAcceptanceStatusFromClient,
  toLegalTermsAcceptanceClient,
} from "@/lib/legal/terms-acceptance-status";
import {
  createTermsGateCookieValue,
  getExpiredTermsGateCookieOptions,
  getTermsGateCookieOptions,
  TERMS_GATE_COOKIE_NAME,
  verifyTermsGateCookieValue,
} from "@/lib/legal/terms-gate-cookie";
import { buildTermsAcceptanceRedirectPath, shouldBypassTermsAcceptanceGate } from "@/lib/legal/terms-gate";
import type { Database } from "@/lib/supabase/types";

const PROTECTED_PREFIXES = ["/workshop"];
const AUTH_ROUTES = [LOGIN_PATH];
const PUBLIC_ROUTE_PREFIXES = ["/about", "/features", "/pricing", "/contact", "/privacy", "/terms", "/invite", "/share", "/access-required"];
const MARKETING_PAGE_PATHS = new Set(["/", "/about", "/features", "/pricing", "/contact", "/privacy", "/terms"]);
const MARKETING_PAGE_CACHE_CONTROL = "private, no-cache, max-age=0, must-revalidate";
const SENSITIVE_ROUTE_CACHE_CONTROL = "private, no-cache, no-store, max-age=0, must-revalidate";
type ProtectedRouteGateState = {
  authVerified?: boolean;
  termsAccepted?: boolean;
};
type ProxyAuthIdentity = {
  id: string;
  email: string | null;
};

function hasSupabaseProxyEnv() {
  return Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim());
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

function copyResponseCookies(target: NextResponse, source: NextResponse) {
  source.cookies.getAll().forEach((cookie) => {
    target.cookies.set(cookie);
  });
  return target;
}

function redirectWithResponseCookies(url: URL, response: NextResponse) {
  return copyResponseCookies(redirectWithSensitiveRouteCacheControl(url), response);
}

function clearTermsGateCookie(response: NextResponse) {
  response.cookies.set(TERMS_GATE_COOKIE_NAME, "", getExpiredTermsGateCookieOptions());
  return response;
}

async function setTermsGateCookie(response: NextResponse, userId: string) {
  const value = await createTermsGateCookieValue(userId);
  if (value) response.cookies.set(TERMS_GATE_COOKIE_NAME, value, getTermsGateCookieOptions());
  return response;
}

function readAuthIdentityFromClaims(data: unknown): ProxyAuthIdentity | null {
  const claims = data && typeof data === "object" && "claims" in data
    ? (data as { claims?: Record<string, unknown> }).claims
    : null;
  const id = typeof claims?.sub === "string" ? claims.sub : "";
  if (!id) return null;
  return {
    id,
    email: typeof claims?.email === "string" ? claims.email : null,
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

  if (!hasSupabaseProxyEnv()) {
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

  const supabase = createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = createRequestPathResponse(request);
          cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
        },
      },
    },
  );

  const { data: claimsData } = await supabase.auth.getClaims();
  const user = readAuthIdentityFromClaims(claimsData);

  if (!user && isProtected) {
    const loginUrl = new URL(LOGIN_PATH, request.url);
      loginUrl.searchParams.set(
        "next",
        sanitizeNextPath(`${pathname}${request.nextUrl.search}`),
      );
    return redirectWithSensitiveRouteCacheControl(loginUrl);
  }

  if (user && (isProtected || isAuthRoute)) {
    const hasTermsGateCookie = isProtected && !bypassesTermsGate
      ? await verifyTermsGateCookieValue(request.cookies.get(TERMS_GATE_COOKIE_NAME)?.value, user.id)
      : false;
    const [access, acceptanceStatus] = await Promise.all([
      getClosedBetaAccessForEmail({
        email: user.email,
        supabase,
      }),
      isProtected && !bypassesTermsGate && !hasTermsGateCookie
        ? readCurrentUserTermsAcceptanceStatusFromClient(toLegalTermsAcceptanceClient(supabase), user.id)
        : Promise.resolve(null),
    ]);

    if (!access.allowed) {
      await supabase.auth.signOut();
      return redirectWithResponseCookies(new URL(buildClosedBetaAccessPath(access.status), request.url), response);
    }

    if (acceptanceStatus?.requiresAcceptance) {
      return clearTermsGateCookie(
        redirectWithResponseCookies(
          new URL(buildTermsAcceptanceRedirectPath(requestPath), request.url),
          response,
        ),
      );
    }

    if (isProtected && !bypassesTermsGate && !hasTermsGateCookie) {
      await setTermsGateCookie(response, user.id);
    }
  }

  if (user && isAuthRoute) {
    return redirectWithSensitiveRouteCacheControl(new URL(DEFAULT_AUTH_DESTINATION, request.url));
  }

  if (user && isProtected) {
    const protectedResponse = copyResponseCookies(
      createRequestPathResponse(request, undefined, {
        authVerified: true,
        termsAccepted: true,
      }),
      response,
    );
    if (!bypassesTermsGate) await setTermsGateCookie(protectedResponse, user.id);
    return protectedResponse;
  }

  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
