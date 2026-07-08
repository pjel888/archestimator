import { NextResponse } from "next/server";

import { createCloudflareBetterAuthNextHandlersForRequest } from "@/lib/auth/cloudflare-better-auth-runtime";
import { logAppError } from "@/lib/observability/logger";
import { normalizeBetterAuthOAuthStateCookieHeader } from "@/lib/auth/set-cookie-forwarding";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const NO_STORE_HEADERS = {
  "Cache-Control": "private, no-cache, no-store, max-age=0, must-revalidate",
};
const BETTER_AUTH_METHODS = ["GET", "POST", "PATCH", "PUT", "DELETE"] as const;

type BetterAuthMethod = (typeof BETTER_AUTH_METHODS)[number];
type BetterAuthRouteHandlers = NonNullable<Awaited<ReturnType<typeof createCloudflareBetterAuthNextHandlersForRequest>>>;

function jsonError(error: string, status: number) {
  return NextResponse.json({ error }, { status, headers: NO_STORE_HEADERS });
}

function hasNoStoreCacheControl(response: Response) {
  return response.headers.get("cache-control")?.toLowerCase().split(",").map((part) => part.trim()).includes("no-store")
    ?? false;
}

function withAuthNoStore(response: Response) {
  if (hasNoStoreCacheControl(response)) return response;

  const headers = new Headers(response.headers);
  headers.set("Cache-Control", NO_STORE_HEADERS["Cache-Control"]);

  return new Response(response.body, {
    headers,
    status: response.status,
    statusText: response.statusText,
  });
}

async function createHandlers(request: Request): Promise<BetterAuthRouteHandlers | Response> {
  const handlers = await createCloudflareBetterAuthNextHandlersForRequest(request);
  if (!handlers) return jsonError("Better Auth route is not configured.", 503);
  return handlers;
}

async function handleBetterAuthRoute(request: Request, method: BetterAuthMethod) {
  try {
    const routedRequest = normalizeOAuthCallbackRequest(request);
    const handlers = await createHandlers(routedRequest);
    if (handlers instanceof Response) return handlers;
    return withAuthNoStore(await handlers[method](routedRequest));
  } catch (error) {
    logAppError(error, {
      event: "better_auth_route_error",
      action: "handle_better_auth_route",
      context: {
        route: "/api/auth/[...all]",
        route_handler: `${method} /api/auth/[...all]`,
      },
    });
    return jsonError("Better Auth route failed.", 500);
  }
}

function normalizeOAuthCallbackRequest(request: Request) {
  const url = new URL(request.url);
  if (!url.pathname.endsWith("/callback/google")) return request;

  const headers = normalizeBetterAuthOAuthStateCookieHeader(request.headers, url.searchParams.get("state"));
  return headers === request.headers ? request : new Request(request, { headers });
}

export async function GET(request: Request) {
  return handleBetterAuthRoute(request, "GET");
}

export async function POST(request: Request) {
  return handleBetterAuthRoute(request, "POST");
}

export async function PATCH(request: Request) {
  return handleBetterAuthRoute(request, "PATCH");
}

export async function PUT(request: Request) {
  return handleBetterAuthRoute(request, "PUT");
}

export async function DELETE(request: Request) {
  return handleBetterAuthRoute(request, "DELETE");
}
