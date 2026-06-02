import { type NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { buildClosedBetaAccessPath, getClosedBetaAccessForEmail } from "@/lib/auth/closed-beta-access";
import { getDevAuthBypassCredentialFromRequestParts, isDevAuthBypassRequest } from "@/lib/auth/dev-auth-gate";
import { AUTH_REQUEST_PATH_HEADER, DEFAULT_AUTH_DESTINATION, LOGIN_PATH, sanitizeNextPath } from "@/lib/auth/redirects";
import type { Database } from "@/lib/supabase/types";

const PROTECTED_PREFIXES = ["/workshop"];
const AUTH_ROUTES = [LOGIN_PATH];
const PUBLIC_ROUTE_PREFIXES = ["/about", "/features", "/pricing", "/contact", "/privacy", "/terms", "/invite", "/share", "/beta"];
const MARKETING_PAGE_PATHS = new Set(["/", "/about", "/features", "/pricing", "/contact", "/privacy", "/terms"]);
const MARKETING_PAGE_CACHE_CONTROL = "private, no-cache, max-age=0, must-revalidate";

function hasSupabaseProxyEnv() {
  return Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim());
}

function isPublicRoute(pathname: string) {
  return pathname === "/" || PUBLIC_ROUTE_PREFIXES.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`));
}

function isMarketingPage(pathname: string) {
  return MARKETING_PAGE_PATHS.has(pathname);
}

function createRequestPathResponse(request: NextRequest) {
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set(
    AUTH_REQUEST_PATH_HEADER,
    sanitizeNextPath(`${request.nextUrl.pathname}${request.nextUrl.search}`),
  );
  return NextResponse.next({ request: { headers: requestHeaders } });
}

export async function proxy(request: NextRequest) {
  const pathname = request.nextUrl.pathname;

  if (pathname.includes(".") || pathname.startsWith("/_next") || pathname.startsWith("/api")) {
    return NextResponse.next({ request });
  }

  const isProtected = PROTECTED_PREFIXES.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`));
  const isAuthRoute = AUTH_ROUTES.includes(pathname);

  const devAuthBypassCredential = getDevAuthBypassCredentialFromRequestParts(request.headers, request.cookies);

  if (isDevAuthBypassRequest(request.nextUrl.hostname, devAuthBypassCredential)) {
    if (isAuthRoute) {
      return NextResponse.redirect(new URL(DEFAULT_AUTH_DESTINATION, request.url));
    }

    return createRequestPathResponse(request);
  }

  let response = createRequestPathResponse(request);

  if (isPublicRoute(pathname)) {
    if (isMarketingPage(pathname)) {
      response.headers.set("Cache-Control", MARKETING_PAGE_CACHE_CONTROL);
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
      return NextResponse.redirect(loginUrl);
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

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user && isProtected) {
    const loginUrl = new URL(LOGIN_PATH, request.url);
    loginUrl.searchParams.set(
      "next",
      sanitizeNextPath(`${pathname}${request.nextUrl.search}`),
    );
    return NextResponse.redirect(loginUrl);
  }

  if (user && (isProtected || isAuthRoute)) {
    const access = await getClosedBetaAccessForEmail({
      email: user.email,
      supabase,
    });

    if (!access.allowed) {
      return NextResponse.redirect(new URL(buildClosedBetaAccessPath(access.status), request.url));
    }
  }

  if (user && isAuthRoute) {
    return NextResponse.redirect(new URL(DEFAULT_AUTH_DESTINATION, request.url));
  }

  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
