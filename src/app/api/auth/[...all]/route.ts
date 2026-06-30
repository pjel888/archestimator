import { NextResponse } from "next/server";

import { createCloudflareBetterAuthNextHandlersForRequest } from "@/lib/auth/cloudflare-better-auth-runtime";

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

async function createHandlers(request: Request): Promise<BetterAuthRouteHandlers | Response> {
  const handlers = await createCloudflareBetterAuthNextHandlersForRequest(request);
  if (!handlers) return jsonError("Better Auth route is not configured.", 503);
  return handlers;
}

async function handleBetterAuthRoute(request: Request, method: BetterAuthMethod) {
  try {
    const handlers = await createHandlers(request);
    if (handlers instanceof Response) return handlers;
    return handlers[method](request);
  } catch (error) {
    console.error("Cloudflare Better Auth route failed", error);
    return jsonError("Better Auth route failed.", 500);
  }
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
