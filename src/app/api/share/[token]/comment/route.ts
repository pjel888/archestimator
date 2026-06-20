import {
  assertSameOriginPublicPost,
  createSharedLinkSessionCookieName,
  hasPublicationAccessCookie,
  readPublicationViewSnapshotVersion,
  verifySharedLinkSessionCookieValue,
} from "@/lib/publication/security";
import {
  checkSharedLinkCommentReadRateLimit,
  checkSharedLinkCommentRateLimit,
  insertSharedLinkComment,
  loadSharedLinkPublicComments,
  resolveProjectPublicationAccessByToken,
  hashPublicTelemetryValue,
} from "@/lib/publication/public-repository";
import { sanitizeSharedLinkRecipientText } from "@/lib/share/sanitize-recipient-text";

export const dynamic = "force-dynamic";

// P12: circuit breaker for comment endpoint (>50% 5xx over 5min -> 503 for 2min cooldown)
// Reuses/extends P6 in-memory Map/TTL/LRU pattern (no external deps, additive).
const CIRCUIT_WINDOW_MS = 5 * 60 * 1000;
const CIRCUIT_COOLDOWN_MS = 2 * 60 * 1000;
const CIRCUIT_MIN_SAMPLES = 4;
const CIRCUIT_THRESHOLD = 0.5;

let commentAttemptTimes: number[] = [];
let comment5xxTimes: number[] = [];
let commentCircuitOpenUntil = 0;

function pruneCircuit(now: number) {
  commentAttemptTimes = commentAttemptTimes.filter((t) => now - t < CIRCUIT_WINDOW_MS);
  comment5xxTimes = comment5xxTimes.filter((t) => now - t < CIRCUIT_WINDOW_MS);
}

function recordAttempt(now: number) {
  pruneCircuit(now);
  commentAttemptTimes.push(now);
}

function record5xx(now: number) {
  pruneCircuit(now);
  comment5xxTimes.push(now);
  const fails = comment5xxTimes.length;
  const attempts = Math.max(commentAttemptTimes.length, 1);
  if (attempts >= CIRCUIT_MIN_SAMPLES && fails / attempts > CIRCUIT_THRESHOLD) {
    commentCircuitOpenUntil = now + CIRCUIT_COOLDOWN_MS;
  }
}

function isCircuitOpen(now: number): boolean {
  if (now < commentCircuitOpenUntil) return true;
  // auto close if cooldown passed
  if (commentCircuitOpenUntil > 0 && now >= commentCircuitOpenUntil) {
    commentCircuitOpenUntil = 0;
    comment5xxTimes = [];
    commentAttemptTimes = [];
  }
  return false;
}

function getIpHash(request: Request): string {
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0].trim()
    || request.headers.get("cf-connecting-ip")
    || request.headers.get("x-real-ip")
    || "unknown";
  return hashPublicTelemetryValue(ip) ?? "unknown";
}

function logStructured(level: "error" | "warn", route: string, errorCode: string, ipHash: string, extra?: Record<string, unknown>) {
  // Additive structured logging (no PII/secrets, per P12 + existing console patterns in resend)
  console.error({ level, route, errorCode, ipHash, ts: new Date().toISOString(), ...extra });
}

function parseCookieValue(cookieHeader: string, name: string): string | undefined {
  const match = cookieHeader.match(new RegExp(`(?:^|;\\s*)${name}=([^;]*)`));
  return match ? decodeURIComponent(match[1]) : undefined;
}

function readSessionPayload(value: string | undefined) {
  try {
    const prefix = "shared-link-session-v1";
    const parts = (value || "").split(":");
    if (parts[0] !== prefix || !parts[1]) return {};
    const payload = JSON.parse(Buffer.from(parts[1], "base64url").toString("utf8")) as {
      publicationId?: unknown;
      recipientId?: unknown;
    };
    return {
      publicationId: typeof payload.publicationId === "string" ? payload.publicationId : undefined,
      recipientId: typeof payload.recipientId === "string" ? payload.recipientId : undefined,
    };
  } catch {
    return {};
  }
}

function readErrorMessage(error: unknown, fallback: string) {
  return error instanceof Error ? error.message : fallback;
}

const noStoreHeaders = { "Cache-Control": "no-store" };
const CANONICAL_UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function readOptionalUuid(value: unknown, label: string): { ok: true; value: string | null } | { ok: false; message: string } {
  if (value == null) return { ok: true, value: null };
  if (typeof value !== "string") return { ok: false, message: `${label} must be a UUID.` };

  const trimmed = value.trim();
  if (!trimmed) return { ok: true, value: null };
  if (!CANONICAL_UUID_PATTERN.test(trimmed)) return { ok: false, message: `${label} must be a UUID.` };

  return { ok: true, value: trimmed.toLowerCase() };
}

export async function GET(request: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const access = await resolveProjectPublicationAccessByToken(token);
  if (!access) {
    return Response.json({ error: "Publication not found." }, { status: 404, headers: noStoreHeaders });
  }

  const cookieHeader = request.headers.get("cookie") || "";
  if (
    access.passwordRequired &&
    !hasPublicationAccessCookie(cookieHeader, {
      token,
      publicationId: access.publicationId,
      credentialVersion: access.credentialVersion,
    })
  ) {
    return Response.json({ error: "password_required" }, { status: 401, headers: noStoreHeaders });
  }

  const sessionName = createSharedLinkSessionCookieName(token);
  const sessionValue = parseCookieValue(cookieHeader, sessionName);
  const sessionPayload = readSessionPayload(sessionValue);
  const recipientId = sessionPayload.recipientId;

  if (
    !recipientId ||
    !verifySharedLinkSessionCookieValue(sessionValue, {
      token,
      publicationId: access.publicationId,
      credentialVersion: access.credentialVersion,
      recipientId,
    })
  ) {
    return Response.json({ error: "Valid recipient session required for comments." }, { status: 401, headers: noStoreHeaders });
  }

  const rateCheck = await checkSharedLinkCommentReadRateLimit({
    publicationId: access.publicationId,
    recipientId,
  });
  if (!rateCheck.allowed) {
    return Response.json(
      { error: rateCheck.message },
      { status: 429, headers: { ...noStoreHeaders, "Retry-After": String(rateCheck.retryAfter) } },
    );
  }

  const comments = await loadSharedLinkPublicComments({ publicationId: access.publicationId });
  return Response.json({ comments }, { headers: noStoreHeaders });
}

export async function POST(request: Request, { params }: { params: Promise<{ token: string }> }) {
  const sameOrigin = assertSameOriginPublicPost(request);
  if (!sameOrigin.ok) {
    return Response.json({ error: sameOrigin.message }, { status: sameOrigin.status, headers: { "Cache-Control": "no-store" } });
  }

  const { token } = await params;
  const body = (await request.json().catch(() => ({}))) as {
    body?: string;
    estimateId?: unknown;
    rowId?: unknown;
    viewToken?: unknown;
  };

  const rawBody = (body.body || "").toString();
  if (!rawBody.trim()) {
    const ipHash = getIpHash(request);
    logStructured("error", "/api/share/[token]/comment", "VALIDATION_EMPTY_BODY", ipHash);
    return Response.json({ error: "Comment body is required." }, { status: 400, headers: { "Cache-Control": "no-store" } });
  }

  const cookieHeader = request.headers.get("cookie") || "";
  const sessionName = createSharedLinkSessionCookieName(token);
  const sessionValue = parseCookieValue(cookieHeader, sessionName);

  // Lightweight parse of signed P5 session payload for the recipient id.
  // The publication id and snapshot must come from the current DB row below.
  const sessionPayload = readSessionPayload(sessionValue);
  const recipientIdFromCookie = sessionPayload.recipientId;

  const access = await resolveProjectPublicationAccessByToken(token);
  if (!access) {
    const ipHash = getIpHash(request);
    logStructured("warn", "/api/share/[token]/comment", "PUBLICATION_NOT_FOUND", ipHash);
    return Response.json({ error: "Publication not found." }, { status: 404, headers: { "Cache-Control": "no-store" } });
  }

  // Verify P5 session against the current DB publication snapshot, not the cookie-derived snapshot.
  const sessionOk = Boolean(recipientIdFromCookie) && verifySharedLinkSessionCookieValue(sessionValue, {
    token,
    publicationId: access.publicationId,
    credentialVersion: access.credentialVersion,
    recipientId: recipientIdFromCookie,
  });
  if (!sessionOk) {
    const ipHash = getIpHash(request);
    logStructured("error", "/api/share/[token]/comment", "SESSION_INVALID", ipHash);
    return Response.json({ error: "Valid recipient session required for comments." }, { status: 401, headers: { "Cache-Control": "no-store" } });
  }
  const requestViewToken = typeof body.viewToken === "string" ? body.viewToken : undefined;
  const viewedSnapshotVersion = requestViewToken
    ? readPublicationViewSnapshotVersion(requestViewToken, {
        token,
        publicationId: access.publicationId,
      })
    : undefined;
  if (requestViewToken && !viewedSnapshotVersion) {
    const ipHash = getIpHash(request);
    logStructured("warn", "/api/share/[token]/comment", "VIEW_SNAPSHOT_INVALID", ipHash);
    return Response.json({ error: "Publication snapshot changed. Please reload before posting a comment." }, { status: 409, headers: { "Cache-Control": "no-store" } });
  }
  if (typeof viewedSnapshotVersion === "number" && viewedSnapshotVersion !== access.snapshotVersion) {
    const ipHash = getIpHash(request);
    logStructured("warn", "/api/share/[token]/comment", "VIEW_SNAPSHOT_STALE", ipHash, {
      viewedSnapshotVersion,
      currentSnapshotVersion: access.snapshotVersion,
    });
    return Response.json({ error: "Publication snapshot changed. Please reload before posting a comment." }, { status: 409, headers: { "Cache-Control": "no-store" } });
  }
  const expectedSnapshotVersion = viewedSnapshotVersion ?? access.snapshotVersion;

  const recipientId = recipientIdFromCookie;
  if (!recipientId) {
    const ipHash = getIpHash(request);
    logStructured("error", "/api/share/[token]/comment", "RECIPIENT_MISSING", ipHash);
    return Response.json({ error: "Recipient context missing from session." }, { status: 400, headers: { "Cache-Control": "no-store" } });
  }

  const estimateId = readOptionalUuid(body.estimateId, "Estimate id");
  if (!estimateId.ok) {
    const ipHash = getIpHash(request);
    logStructured("warn", "/api/share/[token]/comment", "VALIDATION_INVALID_ESTIMATE_ID", ipHash);
    return Response.json({ error: estimateId.message }, { status: 400, headers: { "Cache-Control": "no-store" } });
  }

  const rowId = readOptionalUuid(body.rowId, "Row id");
  if (!rowId.ok) {
    const ipHash = getIpHash(request);
    logStructured("warn", "/api/share/[token]/comment", "VALIDATION_INVALID_ROW_ID", ipHash);
    return Response.json({ error: rowId.message }, { status: 400, headers: { "Cache-Control": "no-store" } });
  }

  // P12 circuit breaker check (early, before rate/RPC)
  const now = Date.now();
  recordAttempt(now);
  if (isCircuitOpen(now)) {
    const ipHash = getIpHash(request);
    logStructured("error", "/api/share/[token]/comment", "CIRCUIT_OPEN", ipHash, { status: 503 });
    return Response.json({ error: "Service temporarily unavailable due to high error rate. Please retry shortly." }, { status: 503, headers: { "Cache-Control": "no-store", "Retry-After": "120" } });
  }

  // Durable rate limit (server, per-recipient).
  const rateCheck = await checkSharedLinkCommentRateLimit({ publicationId: access.publicationId, recipientId });
  if (!rateCheck.allowed) {
    const ipHash = getIpHash(request);
    logStructured("warn", "/api/share/[token]/comment", "RATE_LIMITED", ipHash, { status: 429 });
    return Response.json(
      { error: rateCheck.message },
      { status: 429, headers: { "Cache-Control": "no-store", "Retry-After": String(rateCheck.retryAfter) } }
    );
  }

  // Sanitize
  const sanitized = sanitizeSharedLinkRecipientText(rawBody, 1000);
  if (!sanitized) {
    const ipHash = getIpHash(request);
    logStructured("error", "/api/share/[token]/comment", "SANITIZE_FAILED", ipHash);
    return Response.json({ error: "Comment body is invalid after sanitization." }, { status: 400, headers: { "Cache-Control": "no-store" } });
  }

  try {
    const { id, comment } = await insertSharedLinkComment({
      publicationToken: token,
      recipientId,
      expectedSnapshotVersion,
      body: sanitized,
      estimateId: estimateId.value,
      rowId: rowId.value,
    });

    // P8: best-effort lightweight owner email digest (rate-limited 1/15min inside helper). Non-blocking for receiver.
    try {
      const { maybeTriggerSharedLinkActivityDigest } = await import("@/lib/publication/actions");
      maybeTriggerSharedLinkActivityDigest(access.publicationId, token, "comment");
    } catch {}

    return Response.json({ id, comment, created: true }, { status: 201, headers: { "Cache-Control": "no-store" } });
  } catch (error: unknown) {
    const msg = readErrorMessage(error, "Failed to post comment.");
    if (/snapshot|stale|changed/i.test(msg)) {
      const ipHash = getIpHash(request);
      logStructured("warn", "/api/share/[token]/comment", "SNAPSHOT_VERSION_CHANGED", ipHash);
      return Response.json({ error: "Publication snapshot changed. Please reload before posting a comment." }, { status: 409, headers: { "Cache-Control": "no-store" } });
    }
    const status = /rate|too many/i.test(msg) ? 429 : /not found|expired|recipient/i.test(msg) ? 403 : 500;
    const ipHash = getIpHash(request);
    if (status === 500) {
      record5xx(Date.now());
    }
    logStructured("error", "/api/share/[token]/comment", status === 500 ? "INSERT_FAILED" : "POST_ERROR", ipHash, { status, msg: msg.slice(0, 120) });
    // SEC-15 (AC-SEC-15): never echo a raw RPC/DB error to the public client. The detailed
    // message is logged server-side (above). Known client-facing cases (429 rate limit, 403
    // not-found/expired/recipient) keep their app-authored message; only the unexpected 500
    // path returns a generic envelope.
    const clientError = status === 500 ? "Something went wrong. Please try again." : msg;
    return Response.json({ error: clientError }, { status, headers: { "Cache-Control": "no-store" } });
  }
}
