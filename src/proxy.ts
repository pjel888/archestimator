import { type NextRequest, NextResponse } from "next/server";
import { AUTH_REQUEST_PATH_HEADER, sanitizeNextPath } from "@/lib/auth/redirects";

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

  // Teaser/prelaunch: only the landing page is live — redirect everything else
  if (pathname !== "/") {
    return NextResponse.redirect(new URL("/", request.url));
  }

  return createRequestPathResponse(request);
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
