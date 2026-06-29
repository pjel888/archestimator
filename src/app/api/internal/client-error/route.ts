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

function safeString(value: unknown, maxLength: number) {
  return typeof value === "string" ? value.slice(0, maxLength) : undefined;
}

function normalizePayload(value: unknown): ClientErrorPayload | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const record = value as Record<string, unknown>;
  return {
    digest: safeString(record.digest, 160),
    message: safeString(record.message, 2000),
    name: safeString(record.name, 120),
    source: safeString(record.source, 120),
    stack: safeString(record.stack, 6000),
  };
}

async function parsePayload(request: Request): Promise<ClientErrorPayload | null> {
  const raw = await request.text();
  if (raw.length > MAX_BODY_BYTES) return null;
  try {
    return normalizePayload(JSON.parse(raw));
  } catch {
    return null;
  }
}

export async function POST(request: Request) {
  if (!sameOrigin(request)) {
    return noStoreJson({ ok: false, error: "same_origin_required" }, 403);
  }

  if (!rateLimitAllows(request)) {
    return noStoreJson({ ok: false, error: "rate_limited" }, 429);
  }

  const payload = await parsePayload(request);
  if (!payload) {
    return noStoreJson({ ok: false, error: "invalid_json" }, 400);
  }

  const redacted = redactForLog(payload);
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
