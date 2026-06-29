import { createHash } from "node:crypto";

import { NextResponse } from "next/server";

import { consoleAppLogger } from "@/lib/observability/logger";
import { redactForLog } from "@/lib/observability/redact";

const RATE_LIMIT_WINDOW_MS = 60_000;
const RATE_LIMIT_MAX = 10;
const MAX_BODY_BYTES = 16 * 1024;
const clientErrorRateLimits = new Map<string, { count: number; resetAt: number }>();

type ClientErrorPayload = {
  digest?: string;
  message?: string;
  name?: string;
  path?: string;
  route?: string;
  source?: string;
  stack?: string;
};

function noStoreJson(body: unknown, status: number) {
  return NextResponse.json(body, { status, headers: { "Cache-Control": "no-store" } });
}

function sameOrigin(request: Request) {
  const origin = request.headers.get("origin");
  if (!origin) return false;
  return origin === new URL(request.url).origin;
}

function passesFetchMetadata(request: Request) {
  const site = request.headers.get("sec-fetch-site");
  return !site || site === "same-origin" || site === "same-site" || site === "none";
}

function clientKey(request: Request) {
  return (
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip")?.trim() ||
    "unknown"
  );
}

function rateLimitAllows(request: Request) {
  const key = clientKey(request);
  const now = Date.now();
  const current = clientErrorRateLimits.get(key);
  if (!current || current.resetAt <= now) {
    clientErrorRateLimits.set(key, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
    return true;
  }
  if (current.count >= RATE_LIMIT_MAX) return false;
  current.count += 1;
  return true;
}

function bodyLengthTooLarge(request: Request) {
  const rawLength = request.headers.get("content-length");
  if (!rawLength) return false;
  const parsed = Number(rawLength);
  return Number.isFinite(parsed) && parsed > MAX_BODY_BYTES;
}

function safeString(value: unknown, maxLength: number) {
  return typeof value === "string" ? value.slice(0, maxLength) : undefined;
}

function normalizePath(value: string | undefined) {
  if (!value) return undefined;
  try {
    const parsed = value.startsWith("http") ? new URL(value) : new URL(value, "https://archestimator.local");
    return `${parsed.pathname}${parsed.search ? "?[REDACTED_QUERY]" : ""}`;
  } catch {
    return value.split("?")[0]?.slice(0, 500);
  }
}

function hashValue(value: string | null) {
  if (!value) return undefined;
  return createHash("sha256").update(value).digest("hex").slice(0, 16);
}

function normalizePayload(value: unknown): ClientErrorPayload | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const record = value as Record<string, unknown>;
  return {
    digest: safeString(record.digest, 160),
    message: safeString(record.message, 2000),
    name: safeString(record.name, 120),
    path: safeString(record.path, 500),
    route: safeString(record.route, 160),
    source: safeString(record.source, 120),
    stack: safeString(record.stack, 6000),
  };
}

async function parsePayload(request: Request): Promise<{ payload: ClientErrorPayload } | { tooLarge: true } | null> {
  if (bodyLengthTooLarge(request)) return { tooLarge: true };
  const raw = await request.text();
  if (Buffer.byteLength(raw, "utf8") > MAX_BODY_BYTES) return { tooLarge: true };
  try {
    const payload = normalizePayload(JSON.parse(raw));
    return payload ? { payload } : null;
  } catch {
    return null;
  }
}

export async function POST(request: Request) {
  if (!sameOrigin(request) || !passesFetchMetadata(request)) {
    return noStoreJson({ ok: false, error: "same_origin_required" }, 403);
  }

  if (!rateLimitAllows(request)) {
    return noStoreJson({ ok: false, error: "rate_limited" }, 429);
  }

  const parsed = await parsePayload(request);
  if (parsed && "tooLarge" in parsed) {
    return noStoreJson({ ok: false, error: "payload_too_large" }, 413);
  }
  if (!parsed) {
    return noStoreJson({ ok: false, error: "invalid_json" }, 400);
  }
  const { payload } = parsed;

  const logContext = {
    client_digest: payload.digest,
    client_message_redacted: payload.message,
    client_name: payload.name,
    client_stack_redacted: payload.stack,
    path_normalized: normalizePath(payload.path),
    route: payload.route,
    source: payload.source,
    user_agent_hashed: hashValue(request.headers.get("user-agent")),
  };
  const redacted = redactForLog(logContext);
  consoleAppLogger.log({
    timestamp: new Date().toISOString(),
    level: "error",
    event: "client_error",
    message: "Client error report",
    request_id: payload.digest,
    context: redacted.value,
    tainted_fields: redacted.taintedFields.map((field) => `context.${field}`),
  });

  return noStoreJson({ ok: true }, 202);
}
