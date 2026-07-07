import { after } from "next/server";

import {
  createPrivacyRequest,
  PRIVACY_REQUEST_KINDS,
  type PrivacyRequestKind,
} from "@/lib/compliance/privacy-request-repository";
import { getCloudflareD1Database, type D1DatabaseLike } from "@/lib/cloudflare/d1";
import { hashAccountSecurityValue } from "@/lib/auth/account-audit";

export const dynamic = "force-dynamic";

const NO_STORE = { "Cache-Control": "no-store" } as const;
const DESCRIPTION_MAX = 4000;
const REQUEST_BODY_MAX_BYTES = 16 * 1024;
const REQUESTER_EMAIL_MAX = 254;
const REQUESTER_NAME_MAX = 200;
const WORKSPACE_ID_MAX = 128;
const USER_AGENT_MAX = 512;
const METADATA_MAX_KEYS = 16;
const METADATA_KEY_MAX = 64;
const METADATA_STRING_MAX = 512;
const METADATA_JSON_MAX = 4096;
const RATE_LIMIT_WINDOW_SECONDS = 60 * 60;
const RATE_LIMIT_MAX_PER_IP = 5;
const RATE_LIMIT_MAX_PER_EMAIL = 3;

type ParsedPrivacyRequestBody = {
  requestKind?: unknown;
  description?: unknown;
  requesterEmail?: unknown;
  requesterName?: unknown;
  workspaceId?: unknown;
  metadata?: unknown;
};

type RateLimitCheck =
  | { allowed: true }
  | { allowed: false; retryAfter: number; message: string };

function jsonError(message: string, status: number, headers: Record<string, string> = {}) {
  return Response.json(
    { error: message },
    { status, headers: { ...NO_STORE, ...headers } },
  );
}

function deriveClientIp(request: Request): string | null {
  // Trust Cloudflare edge headers only — never X-Forwarded-For (spoofable).
  // Sibling pack 2026-07-02 closed spoofing on cf-connecting-ip.
  const cf = request.headers.get("cf-connecting-ip");
  if (cf && cf.trim().length > 0) return cf.trim();
  return null;
}

function parseBody(value: unknown): ParsedPrivacyRequestBody {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  const record = value as Record<string, unknown>;
  return {
    requestKind: record.requestKind,
    description: record.description,
    requesterEmail: record.requesterEmail,
    requesterName: record.requesterName,
    workspaceId: record.workspaceId,
    metadata: record.metadata,
  };
}

function utf8Length(value: string): number {
  return new TextEncoder().encode(value).length;
}

async function readJsonWithSizeLimit(request: Request): Promise<{ body?: unknown; error?: Response }> {
  const contentLength = request.headers.get("content-length");
  if (contentLength) {
    const declaredLength = Number(contentLength);
    if (!Number.isFinite(declaredLength) || declaredLength < 0) {
      return { error: jsonError("Invalid Content-Length header.", 400) };
    }
    if (declaredLength > REQUEST_BODY_MAX_BYTES) {
      return { error: jsonError("Request body is too large.", 413) };
    }
  }

  let text: string;
  try {
    text = await request.text();
  } catch {
    return { error: jsonError("Invalid request body.", 400) };
  }

  if (utf8Length(text) > REQUEST_BODY_MAX_BYTES) {
    return { error: jsonError("Request body is too large.", 413) };
  }

  try {
    return { body: JSON.parse(text) };
  } catch {
    return { error: jsonError("Invalid JSON body.", 400) };
  }
}

function cleanOptionalString(
  value: unknown,
  field: string,
  maxLength: number,
): { value: string | null; error?: string } {
  if (value == null) return { value: null };
  if (typeof value !== "string") return { value: null };
  const trimmed = value.trim();
  if (!trimmed) return { value: null };
  if (trimmed.length > maxLength) {
    return { value: null, error: `${field} must be ${maxLength} characters or fewer.` };
  }
  return { value: trimmed };
}

function sanitizeMetadataForIntake(value: unknown): { value: Record<string, unknown> | null; error?: string } {
  if (value == null) return { value: null };
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return { value: null, error: "metadata must be an object." };
  }

  const entries = Object.entries(value as Record<string, unknown>);
  if (entries.length > METADATA_MAX_KEYS) {
    return { value: null, error: `metadata must contain ${METADATA_MAX_KEYS} keys or fewer.` };
  }

  const out: Record<string, unknown> = {};
  for (const [key, entryValue] of entries) {
    if (key.length === 0 || key.length > METADATA_KEY_MAX) {
      return { value: null, error: `metadata keys must be ${METADATA_KEY_MAX} characters or fewer.` };
    }
    if (/token|secret|password|cookie|authorization/i.test(key)) continue;
    if (
      entryValue == null ||
      typeof entryValue === "boolean" ||
      (typeof entryValue === "number" && Number.isFinite(entryValue))
    ) {
      out[key] = entryValue;
      continue;
    }
    if (typeof entryValue === "string") {
      if (entryValue.length > METADATA_STRING_MAX) {
        return { value: null, error: `metadata string values must be ${METADATA_STRING_MAX} characters or fewer.` };
      }
      out[key] = entryValue;
      continue;
    }
    return { value: null, error: "metadata values must be strings, finite numbers, booleans, or null." };
  }

  if (JSON.stringify(out).length > METADATA_JSON_MAX) {
    return { value: null, error: `metadata JSON must be ${METADATA_JSON_MAX} characters or fewer.` };
  }
  return { value: out };
}

async function reserveRateLimitSlot({
  db,
  scope,
  rawKey,
  maxAttempts,
  now,
}: {
  db: D1DatabaseLike;
  scope: string;
  rawKey: string;
  maxAttempts: number;
  now: Date;
}): Promise<RateLimitCheck> {
  const keyHash = hashAccountSecurityValue(rawKey);
  const nowIso = now.toISOString();
  const windowStart = new Date(now.getTime() - RATE_LIMIT_WINDOW_SECONDS * 1000).toISOString();
  const expiresAt = new Date(now.getTime() + RATE_LIMIT_WINDOW_SECONDS * 1000).toISOString();

  await db.prepare("DELETE FROM security_rate_limit_events WHERE expires_at < ?").bind(nowIso).run();

  const recent = await db
    .prepare<{ count: number }>(
      "SELECT COUNT(*) AS count FROM security_rate_limit_events WHERE scope = ? AND key_hash = ? AND occurred_at >= ?",
    )
    .bind(scope, keyHash, windowStart)
    .first<{ count: number }>();
  const count = Number(recent?.count ?? 0);
  if (count >= maxAttempts) {
    return {
      allowed: false,
      retryAfter: RATE_LIMIT_WINDOW_SECONDS,
      message: "Too many privacy requests. Please try again later.",
    };
  }

  await db
    .prepare(
      `INSERT INTO security_rate_limit_events (id, scope, key_hash, metadata_json, occurred_at, expires_at)
       VALUES (?, ?, ?, ?, ?, ?)`,
    )
    .bind(crypto.randomUUID(), scope, keyHash, "{}", nowIso, expiresAt)
    .run();

  return { allowed: true };
}

export async function POST(request: Request) {
  const { body, error } = await readJsonWithSizeLimit(request);
  if (error) return error;

  const parsed = parseBody(body);

  if (
    typeof parsed.requestKind !== "string" ||
    !PRIVACY_REQUEST_KINDS.includes(parsed.requestKind as PrivacyRequestKind)
  ) {
    return jsonError(
      "requestKind must be one of: " + PRIVACY_REQUEST_KINDS.join(", "),
      400,
    );
  }

  if (
    typeof parsed.description !== "string" ||
    parsed.description.trim().length === 0
  ) {
    return jsonError("description is required.", 400);
  }
  if (parsed.description.length > DESCRIPTION_MAX) {
    return jsonError(`description must be ${DESCRIPTION_MAX} characters or fewer.`, 400);
  }

  const requesterEmail = cleanOptionalString(parsed.requesterEmail, "requesterEmail", REQUESTER_EMAIL_MAX);
  const requesterName = cleanOptionalString(parsed.requesterName, "requesterName", REQUESTER_NAME_MAX);
  const workspaceId = cleanOptionalString(parsed.workspaceId, "workspaceId", WORKSPACE_ID_MAX);
  const userAgent = cleanOptionalString(request.headers.get("user-agent"), "user-agent", USER_AGENT_MAX);
  const metadata = sanitizeMetadataForIntake(parsed.metadata);
  const validationError = requesterEmail.error ?? requesterName.error ?? workspaceId.error ?? userAgent.error ?? metadata.error;
  if (validationError) return jsonError(validationError, 400);

  const db = await getCloudflareD1Database();
  if (!db) {
    return jsonError("Could not record privacy request. Please try again or email support.", 500);
  }

  const clientIp = deriveClientIp(request);
  const now = new Date();
  if (clientIp) {
    const ipRateLimit = await reserveRateLimitSlot({
      db,
      scope: "privacy_request_ip",
      rawKey: clientIp,
      maxAttempts: RATE_LIMIT_MAX_PER_IP,
      now,
    });
    if (!ipRateLimit.allowed) {
      return jsonError(ipRateLimit.message, 429, { "Retry-After": String(ipRateLimit.retryAfter) });
    }
  }
  if (requesterEmail.value) {
    const emailRateLimit = await reserveRateLimitSlot({
      db,
      scope: "privacy_request_email",
      rawKey: requesterEmail.value.toLowerCase(),
      maxAttempts: RATE_LIMIT_MAX_PER_EMAIL,
      now,
    });
    if (!emailRateLimit.allowed) {
      return jsonError(emailRateLimit.message, 429, { "Retry-After": String(emailRateLimit.retryAfter) });
    }
  }

  try {
    const result = await createPrivacyRequest({
      requestKind: parsed.requestKind as PrivacyRequestKind,
      description: parsed.description,
      requesterEmail: requesterEmail.value,
      requesterName: requesterName.value,
      workspaceId: workspaceId.value,
      ipAddress: clientIp,
      userAgent: userAgent.value,
      metadata: metadata.value,
    }, db);

    // ponytail: email confirmation is a P1 follow-up gated on counsel sign-off
    // of the public privacy-notice wording (OPEN-DEC-002). The Cloudflare Email
    // binding is wired but not invoked here; keeping the intake response fast.
    after(() => Promise.resolve());

    return Response.json(
      {
        id: result.id,
        status: result.status,
        createdAt: result.createdAt,
      },
      { status: 201, headers: NO_STORE },
    );
  } catch (error) {
    // Opaque — never leak DB/provider details to anonymous intake callers.
    console.error({
      privacy_request_intake_failed: true,
      request_kind: parsed.requestKind,
      error_name: error instanceof Error ? error.name : "unknown",
    });
    return jsonError("Could not record privacy request. Please try again or email support.", 500);
  }
}
