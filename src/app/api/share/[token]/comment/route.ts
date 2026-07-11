import { after } from "next/server";

import {
  assertSameOriginPublicPost,
  createSharedLinkSessionCookieName,
  hasPublicationAccessCookie,
  readPublicationViewSnapshotVersion,
  verifySharedLinkSessionCookieValue,
} from "@/lib/publication/security";
import { sharedLinkUnavailableErrorBody } from "@/lib/publication/share-copy";
import {
  checkSharedLinkCommentReadRateLimit,
  checkSharedLinkCommentRateLimit,
  insertSharedLinkComment,
  loadSharedLinkPublicComments,
  resolveProjectPublicationAccessByToken,
  hashPublicTelemetryValue,
} from "@/lib/publication/public-repository";
import { sanitizeSharedLinkRecipientText } from "@/lib/share/sanitize-recipient-text";
import { parseSharedLinkActivityCursor } from "@/lib/publication/activity-helpers";
import { emitLogRecord, logAppError } from "@/lib/observability/logger";
import { readBoundedJsonBody } from "@/lib/http/read-bounded-body";

export const dynamic = "force-dynamic";

// P12: circuit breaker for comment endpoint (>50% 5xx over 5min -> 503 for 2min cooldown)
// Reuses/extends P6 in-memory Map/TTL/LRU pattern (no external deps, additive).
const CIRCUIT_WINDOW_MS = 5 * 60 * 1000;
const CIRCUIT_COOLDOWN_MS = 2 * 60 * 1000;
const CIRCUIT_MIN_SAMPLES = 4;
const CIRCUIT_THRESHOLD = 0.5;

const bestEffortIsolateFailureShedding = (() => {
  let commentAttemptTimes: number[] = [];
  let comment5xxTimes: number[] = [];
  let commentCircuitOpenUntil = 0;
  let commentConsecutive5xx = 0;

  const pruneCircuit = (now: number) => {
    commentAttemptTimes = commentAttemptTimes.filter((time) => now - time < CIRCUIT_WINDOW_MS);
    comment5xxTimes = comment5xxTimes.filter((time) => now - time < CIRCUIT_WINDOW_MS);
  };

  const recordAttempt = (now: number) => {
    pruneCircuit(now);
    commentAttemptTimes.push(now);
  };

  const record5xx = (now: number) => {
    pruneCircuit(now);
    comment5xxTimes.push(now);
    commentConsecutive5xx += 1;
    const failures = comment5xxTimes.length;
    const attempts = Math.max(commentAttemptTimes.length, 1);
    if (
      commentConsecutive5xx >= CIRCUIT_MIN_SAMPLES ||
      (attempts >= CIRCUIT_MIN_SAMPLES && failures / attempts > CIRCUIT_THRESHOLD)
    ) {
      commentCircuitOpenUntil = now + CIRCUIT_COOLDOWN_MS;
    }
  };

  const recordSuccess = () => {
    commentConsecutive5xx = 0;
  };

  const isCircuitOpen = (now: number): boolean => {
    if (now < commentCircuitOpenUntil) return true;
    if (commentCircuitOpenUntil > 0 && now >= commentCircuitOpenUntil) {
      commentCircuitOpenUntil = 0;
      comment5xxTimes = [];
      commentAttemptTimes = [];
      commentConsecutive5xx = 0;
    }
    return false;
  };

  return { recordAttempt, record5xx, recordSuccess, isCircuitOpen };
})();

function getIpHash(request: Request): string {
  const ip = request.headers.get("cf-connecting-ip")
    || "unknown";
  return hashPublicTelemetryValue(ip) ?? "unknown";
}

function logStructured(level: "error" | "warn", route: string, errorCode: string, ipHash: string, extra?: Record<string, unknown>) {
  emitLogRecord({
    level,
    event: "shared_link_comment_route_event",
    message: "Shared-link comment route diagnostic.",
    action: "handle_shared_link_comment",
    context: {
      route,
      error_code: errorCode,
      ip_hash: ipHash,
      ...extra,
    },
  });
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

function scheduleOwnerDigest(publicationId: string, token: string, kind: "comment" | "decision") {
  const run = async () => {
    try {
      const { maybeTriggerSharedLinkActivityDigest } = await import("@/lib/publication/actions");
      await maybeTriggerSharedLinkActivityDigest(publicationId, token, kind);
    } catch (error) {
      logAppError(error, {
        event: "shared_link_owner_digest_error",
        action: "maybe_trigger_shared_link_activity_digest",
        context: {
          route: "/api/share/[token]/comment",
          route_handler: "POST /api/share/[token]/comment",
          digest_kind: kind,
          publication_id: publicationId,
        },
      });
    }
  };

  try {
    after(run);
  } catch {
    void run();
  }
}

const noStoreHeaders = { "Cache-Control": "no-store" };
const PUBLIC_REVIEW_TARGET_ERROR_MESSAGES = new Set([
  "Invalid review target: selected estimate is not part of this publication.",
  "Invalid review target: selected line item is not part of this publication.",
  "Invalid review target: selected line item does not belong to the selected estimate.",
]);
const COMMENT_RECIPIENT_ERROR_MESSAGES = new Set([
  "Publication not found for comment.",
  "Recipient not found for comment.",
]);
const CANONICAL_UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const PUBLIC_REVIEW_TARGET_ID_PATTERN = /^(?:est|row)_[A-Za-z0-9_-]{8,40}$/;

function readOptionalReviewTargetId(value: unknown, label: string): { ok: true; value: string | null } | { ok: false; message: string } {
  if (value == null) return { ok: true, value: null };
  if (typeof value !== "string") return { ok: false, message: `${label} must be a valid review target id.` };

  const trimmed = value.trim();
  if (!trimmed) return { ok: true, value: null };
  if (!CANONICAL_UUID_PATTERN.test(trimmed) && !PUBLIC_REVIEW_TARGET_ID_PATTERN.test(trimmed)) {
    return { ok: false, message: `${label} must be a valid review target id.` };
  }

  return { ok: true, value: CANONICAL_UUID_PATTERN.test(trimmed) ? trimmed.toLowerCase() : trimmed };
}

export async function GET(request: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token: routeToken } = await params;
  const token = routeToken.trim();
  const parsedCursor = parseSharedLinkActivityCursor(new URL(request.url).searchParams.get("cursor"));
  if (!parsedCursor.ok) {
    return Response.json({ error: parsedCursor.error }, { status: 400, headers: noStoreHeaders });
  }
  const access = await resolveProjectPublicationAccessByToken(token);
  if (!access) {
    return Response.json(sharedLinkUnavailableErrorBody(), { status: 404, headers: noStoreHeaders });
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
    return Response.json({ error: "password_required" }, { status: 423, headers: noStoreHeaders });
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

  const page = await loadSharedLinkPublicComments({
    publicationId: access.publicationId,
    cursor: parsedCursor.cursor,
    limit: 50,
  });
  return Response.json(page, { headers: noStoreHeaders });
}

export async function POST(request: Request, { params }: { params: Promise<{ token: string }> }) {
  const sameOrigin = assertSameOriginPublicPost(request);
  if (!sameOrigin.ok) {
    return Response.json({ error: sameOrigin.message }, { status: sameOrigin.status, headers: { "Cache-Control": "no-store" } });
  }

  const { token: routeToken } = await params;
  const token = routeToken.trim();
  const parsedBody = await readBoundedJsonBody<{
    body?: string;
    estimateId?: unknown;
    rowId?: unknown;
    viewToken?: unknown;
  }>(request, 2 * 1024);
  if (!parsedBody.ok) {
    return Response.json({ error: parsedBody.error }, { status: parsedBody.status, headers: { "Cache-Control": "no-store" } });
  }
  const body = parsedBody.value;

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
    return Response.json(sharedLinkUnavailableErrorBody(), { status: 404, headers: { "Cache-Control": "no-store" } });
  }

  if (
    access.passwordRequired &&
    !hasPublicationAccessCookie(cookieHeader, {
      token,
      publicationId: access.publicationId,
      credentialVersion: access.credentialVersion,
    })
  ) {
    const ipHash = getIpHash(request);
    logStructured("warn", "/api/share/[token]/comment", "PASSWORD_REQUIRED", ipHash);
    return Response.json(
      { error: "Publication password required.", passwordRequired: true },
      { status: 423, headers: { "Cache-Control": "no-store" } },
    );
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
    return Response.json(
      { error: "Publication snapshot changed. Please reload before posting a comment.", currentSnapshotVersion: access.snapshotVersion },
      { status: 409, headers: { "Cache-Control": "no-store" } },
    );
  }
  if (typeof viewedSnapshotVersion === "number" && viewedSnapshotVersion !== access.snapshotVersion) {
    const ipHash = getIpHash(request);
    logStructured("warn", "/api/share/[token]/comment", "VIEW_SNAPSHOT_STALE", ipHash, {
      viewedSnapshotVersion,
      currentSnapshotVersion: access.snapshotVersion,
    });
    return Response.json(
      { error: "Publication snapshot changed. Please reload before posting a comment.", currentSnapshotVersion: access.snapshotVersion },
      { status: 409, headers: { "Cache-Control": "no-store" } },
    );
  }
  const expectedSnapshotVersion = viewedSnapshotVersion ?? access.snapshotVersion;

  const recipientId = recipientIdFromCookie;
  if (!recipientId) {
    const ipHash = getIpHash(request);
    logStructured("error", "/api/share/[token]/comment", "RECIPIENT_MISSING", ipHash);
    return Response.json({ error: "Recipient context missing from session." }, { status: 400, headers: { "Cache-Control": "no-store" } });
  }

  const estimateId = readOptionalReviewTargetId(body.estimateId, "Estimate id");
  if (!estimateId.ok) {
    const ipHash = getIpHash(request);
    logStructured("warn", "/api/share/[token]/comment", "VALIDATION_INVALID_ESTIMATE_ID", ipHash);
    return Response.json({ error: estimateId.message }, { status: 400, headers: { "Cache-Control": "no-store" } });
  }

  const rowId = readOptionalReviewTargetId(body.rowId, "Row id");
  if (!rowId.ok) {
    const ipHash = getIpHash(request);
    logStructured("warn", "/api/share/[token]/comment", "VALIDATION_INVALID_ROW_ID", ipHash);
    return Response.json({ error: rowId.message }, { status: 400, headers: { "Cache-Control": "no-store" } });
  }

  // P12 circuit breaker check (early, before rate/RPC)
  const now = Date.now();
  bestEffortIsolateFailureShedding.recordAttempt(now);
  if (bestEffortIsolateFailureShedding.isCircuitOpen(now)) {
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
    bestEffortIsolateFailureShedding.recordSuccess();

    // P8/D9: best-effort owner email digest. `after()` keeps the public POST fast while
    // still letting Next drain the async send/log work instead of abandoning a raw promise.
    scheduleOwnerDigest(access.publicationId, token, "comment");

    return Response.json({ id, comment, created: true }, { status: 201, headers: { "Cache-Control": "no-store" } });
  } catch (error: unknown) {
    const msg = readErrorMessage(error, "Failed to post comment.");
    if (/snapshot|stale|changed/i.test(msg)) {
      const ipHash = getIpHash(request);
      logStructured("warn", "/api/share/[token]/comment", "SNAPSHOT_VERSION_CHANGED", ipHash);
      return Response.json(
        { error: "Publication snapshot changed. Please reload before posting a comment.", currentSnapshotVersion: access.snapshotVersion },
        { status: 409, headers: { "Cache-Control": "no-store" } },
      );
    }
    if (PUBLIC_REVIEW_TARGET_ERROR_MESSAGES.has(msg)) {
      const ipHash = getIpHash(request);
      logStructured("warn", "/api/share/[token]/comment", "INVALID_REVIEW_TARGET", ipHash);
      return Response.json({ error: msg }, { status: 400, headers: { "Cache-Control": "no-store" } });
    }
    if (/^Invalid review target:/i.test(msg)) {
      const ipHash = getIpHash(request);
      logStructured("warn", "/api/share/[token]/comment", "INVALID_REVIEW_TARGET", ipHash);
      return Response.json({ error: "Invalid review target." }, { status: 400, headers: { "Cache-Control": "no-store" } });
    }
    const knownRecipientFailure = COMMENT_RECIPIENT_ERROR_MESSAGES.has(msg);
    const status = knownRecipientFailure ? 403 : 500;
    const ipHash = getIpHash(request);
    if (status === 500) {
      bestEffortIsolateFailureShedding.record5xx(Date.now());
      logAppError(error, {
        event: "route_error",
        context: {
          public_error: "INSERT_FAILED",
          route: "/api/share/[token]/comment",
          route_handler: "POST /api/share/[token]/comment",
          status,
        },
      });
    }
    logStructured("error", "/api/share/[token]/comment", status === 500 ? "INSERT_FAILED" : "POST_ERROR", ipHash, { status });
    // SEC-15 (AC-SEC-15): never echo a raw RPC/DB error to the public client. The detailed
    // message is logged server-side (above). Only exact app-authored failure strings can affect
    // public status; provider/RPC text must never be classified with broad word regexes.
    const clientError = knownRecipientFailure
      ? "Comment could not be posted for this recipient."
      : "Something went wrong. Please try again.";
    return Response.json({ error: clientError }, { status, headers: { "Cache-Control": "no-store" } });
  }
}
