import { NextResponse } from "next/server";

import { createCloudflareBetterAuthNextHandlers } from "@/lib/auth/better-auth-cloudflare";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const NO_STORE_HEADERS = {
  "Cache-Control": "private, no-cache, no-store, max-age=0, must-revalidate",
};
const MIN_BETTER_AUTH_SECRET_LENGTH = 32;
const BETTER_AUTH_METHODS = ["GET", "POST", "PATCH", "PUT", "DELETE"] as const;

type BetterAuthMethod = (typeof BETTER_AUTH_METHODS)[number];
type CloudflareBetterAuthEnv = {
  ARCH_DB?: unknown;
};
type CloudflareBetterAuthContext = {
  env?: CloudflareBetterAuthEnv;
  ctx?: {
    waitUntil?: (promise: Promise<unknown>) => void;
  };
};
type BetterAuthRouteHandlers = Awaited<ReturnType<typeof createCloudflareBetterAuthNextHandlers>>;

function jsonError(error: string, status: number) {
  return NextResponse.json({ error }, { status, headers: NO_STORE_HEADERS });
}

function readBetterAuthSecret() {
  const secret = process.env.BETTER_AUTH_SECRET?.trim() ?? "";
  return secret.length >= MIN_BETTER_AUTH_SECRET_LENGTH ? secret : null;
}

function originFrom(value: string | null | undefined) {
  if (!value?.trim()) return null;
  try {
    return new URL(value).origin;
  } catch {
    return null;
  }
}

function splitOriginList(value: string | null | undefined) {
  return (value ?? "")
    .split(",")
    .map((item) => originFrom(item.trim()))
    .filter((item): item is string => Boolean(item));
}

function resolveBaseURL(request: Request) {
  return process.env.BETTER_AUTH_URL?.trim()
    || process.env.NEXT_PUBLIC_APP_URL?.trim()
    || process.env.NEXT_PUBLIC_SITE_URL?.trim()
    || new URL(request.url).origin;
}

function resolveTrustedOrigins(request: Request, baseURL: string) {
  return Array.from(new Set([
    originFrom(baseURL),
    originFrom(request.url),
    ...splitOriginList(process.env.BETTER_AUTH_TRUSTED_ORIGINS),
    ...splitOriginList(process.env.ARCHESTIMATOR_ALLOWED_APP_ORIGINS),
  ].filter((item): item is string => Boolean(item))));
}

async function loadCloudflareBetterAuthContext(): Promise<CloudflareBetterAuthContext | null> {
  try {
    const { getCloudflareContext } = await import("@opennextjs/cloudflare");
    return await getCloudflareContext({ async: true }) as CloudflareBetterAuthContext;
  } catch {
    return null;
  }
}

function bindWaitUntil(context: CloudflareBetterAuthContext | null) {
  const ctx = context?.ctx;
  const waitUntil = ctx?.waitUntil;
  return typeof waitUntil === "function" ? waitUntil.bind(ctx) : undefined;
}

async function createHandlers(request: Request): Promise<BetterAuthRouteHandlers | Response> {
  const secret = readBetterAuthSecret();
  if (!secret) return jsonError("Better Auth route is not configured.", 503);

  const context = await loadCloudflareBetterAuthContext();
  const d1Database = context?.env?.ARCH_DB;
  if (!d1Database) return jsonError("Better Auth D1 binding is not available.", 503);

  const baseURL = resolveBaseURL(request);
  return createCloudflareBetterAuthNextHandlers({
    d1Database,
    baseURL,
    secret,
    trustedOrigins: resolveTrustedOrigins(request, baseURL),
    waitUntil: bindWaitUntil(context),
  });
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
