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
  checkSharedLinkDecisionReadRateLimit,
  checkSharedLinkDecisionRateLimit,
  loadSharedLinkRecipientDecision,
  resolveProjectPublicationAccessByToken,
  submitSharedLinkDecision,
  hashPublicTelemetryValue,
} from "@/lib/publication/public-repository";
import { sanitizeSharedLinkRecipientText } from "@/lib/share/sanitize-recipient-text";
import { logAppError } from "@/lib/observability/logger";

export const dynamic = "force-dynamic";

// Lightweight cookie parser (shared with comment route pattern)
function parseCookieValue(cookieHeader: string, name: string): string | undefined {
  const match = cookieHeader.match(new RegExp(`(?:^|;\\s*)${name}=([^;]*)`));
  return match ? decodeURIComponent(match[1]) : undefined;
}

// P12: structured error logging (additive) for decision route
function getIpHash(request: Request): string {
  const ip = request.headers.get("cf-connecting-ip")
    || "unknown";
  return hashPublicTelemetryValue(ip) ?? "unknown";
}

function logStructured(level: "error" | "warn", route: string, errorCode: string, ipHash: string, extra?: Record<string, unknown>) {
  console.error({ level, route, errorCode, ipHash, ts: new Date().toISOString(), ...extra });
}

const allowedDecisions = ["accepted", "declined", "revision_requested"] as const;
type DecisionType = (typeof allowedDecisions)[number];

function isDecisionType(value: string): value is DecisionType {
  return allowedDecisions.some((decision) => decision === value);
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
      console.error("[share] deferred owner digest failed", {
        error: readErrorMessage(error, "digest-send-failed"),
        kind,
        publicationId,
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
const DECISION_RECIPIENT_ERROR_MESSAGES = new Set([
  "Publication not found for decision.",
  "Recipient not found for decision.",
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
    return Response.json({ error: "Valid recipient session required for decisions." }, { status: 401, headers: noStoreHeaders });
  }

  const rateCheck = await checkSharedLinkDecisionReadRateLimit({
    publicationId: access.publicationId,
    recipientId,
  });
  if (!rateCheck.allowed) {
    return Response.json(
      { error: rateCheck.message },
      { status: 429, headers: { ...noStoreHeaders, "Retry-After": String(rateCheck.retryAfter) } },
    );
  }

  const decision = await loadSharedLinkRecipientDecision({
    publicationId: access.publicationId,
    recipientId,
  });

  return Response.json({ decision }, { headers: noStoreHeaders });
}

export async function POST(request: Request, { params }: { params: Promise<{ token: string }> }) {
  const sameOrigin = assertSameOriginPublicPost(request);
  if (!sameOrigin.ok) {
    return Response.json({ error: sameOrigin.message }, { status: sameOrigin.status, headers: { "Cache-Control": "no-store" } });
  }

  const { token: routeToken } = await params;
  const token = routeToken.trim();
  const body = (await request.json().catch(() => ({}))) as {
    decision?: string;
    estimateId?: unknown;
    note?: string | null;
    rowId?: unknown;
    signerName?: unknown;
    viewToken?: unknown;
  };

  const decision = (body.decision || "").toString().trim();
  if (!isDecisionType(decision)) {
    const ipHash = getIpHash(request);
    logStructured("error", "/api/share/[token]/decision", "VALIDATION_INVALID_DECISION", ipHash);
    return Response.json({ error: "Invalid decision. Must be accepted, declined, or revision_requested." }, { status: 400, headers: { "Cache-Control": "no-store" } });
  }

  const note = typeof body.note === "string" ? sanitizeSharedLinkRecipientText(body.note, 2000) || null : null;
  const signerName = typeof body.signerName === "string" ? sanitizeSharedLinkRecipientText(body.signerName, 120) || null : null;
  const estimateId = readOptionalReviewTargetId(body.estimateId, "Estimate id");
  if (!estimateId.ok) {
    const ipHash = getIpHash(request);
    logStructured("warn", "/api/share/[token]/decision", "VALIDATION_INVALID_ESTIMATE_ID", ipHash);
    return Response.json({ error: estimateId.message }, { status: 400, headers: { "Cache-Control": "no-store" } });
  }
  const rowId = readOptionalReviewTargetId(body.rowId, "Row id");
  if (!rowId.ok) {
    const ipHash = getIpHash(request);
    logStructured("warn", "/api/share/[token]/decision", "VALIDATION_INVALID_ROW_ID", ipHash);
    return Response.json({ error: rowId.message }, { status: 400, headers: { "Cache-Control": "no-store" } });
  }

  const cookieHeader = request.headers.get("cookie") || "";
  const sessionName = createSharedLinkSessionCookieName(token);
  const sessionValue = parseCookieValue(cookieHeader, sessionName);

  // Lightweight parse of signed P5 session payload for ids (no DB). Full crypto verify below.
  const sessionPayload = readSessionPayload(sessionValue);
  const recipientIdFromCookie = sessionPayload.recipientId;

  const access = await resolveProjectPublicationAccessByToken(token);
  if (!access) {
    const ipHash = getIpHash(request);
    logStructured("warn", "/api/share/[token]/decision", "PUBLICATION_NOT_FOUND", ipHash);
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
    logStructured("warn", "/api/share/[token]/decision", "PASSWORD_REQUIRED", ipHash);
    return Response.json(
      { error: "Publication password required.", passwordRequired: true },
      { status: 423, headers: { "Cache-Control": "no-store" } },
    );
  }

  // Verify P5 session against the current DB publication snapshot, not the cookie-derived snapshot.
  const sessionOk = verifySharedLinkSessionCookieValue(sessionValue, {
    token,
    publicationId: access.publicationId,
    credentialVersion: access.credentialVersion,
    recipientId: recipientIdFromCookie,
  });
  if (!sessionOk) {
    const ipHash = getIpHash(request);
    logStructured("error", "/api/share/[token]/decision", "SESSION_INVALID", ipHash);
    return Response.json({ error: "Valid recipient session required for decisions." }, { status: 401, headers: { "Cache-Control": "no-store" } });
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
    logStructured("warn", "/api/share/[token]/decision", "VIEW_SNAPSHOT_INVALID", ipHash);
    return Response.json(
      { error: "Publication snapshot changed. Please reload before submitting a decision.", currentSnapshotVersion: access.snapshotVersion },
      { status: 409, headers: { "Cache-Control": "no-store" } },
    );
  }
  if (typeof viewedSnapshotVersion === "number" && viewedSnapshotVersion !== access.snapshotVersion) {
    const ipHash = getIpHash(request);
    logStructured("warn", "/api/share/[token]/decision", "VIEW_SNAPSHOT_STALE", ipHash, {
      viewedSnapshotVersion,
      currentSnapshotVersion: access.snapshotVersion,
    });
    return Response.json(
      { error: "Publication snapshot changed. Please reload before submitting a decision.", currentSnapshotVersion: access.snapshotVersion },
      { status: 409, headers: { "Cache-Control": "no-store" } },
    );
  }
  const expectedSnapshotVersion = viewedSnapshotVersion ?? access.snapshotVersion;

  const recipientId = recipientIdFromCookie;
  if (!recipientId) {
    const ipHash = getIpHash(request);
    logStructured("error", "/api/share/[token]/decision", "RECIPIENT_MISSING", ipHash);
    return Response.json({ error: "Recipient context missing from session." }, { status: 400, headers: { "Cache-Control": "no-store" } });
  }

  if (decision === "accepted" && !signerName) {
    const ipHash = getIpHash(request);
    logStructured("error", "/api/share/[token]/decision", "VALIDATION_SIGNER_NAME_REQUIRED", ipHash);
    return Response.json({ error: "Your name is required to approve this proposal." }, { status: 400, headers: { "Cache-Control": "no-store" } });
  }

  const rateCheck = await checkSharedLinkDecisionRateLimit({ publicationId: access.publicationId, recipientId });
  if (!rateCheck.allowed) {
    const ipHash = getIpHash(request);
    logStructured("warn", "/api/share/[token]/decision", "RATE_LIMITED", ipHash, { status: 429 });
    return Response.json(
      { error: rateCheck.message },
      { status: 429, headers: { "Cache-Control": "no-store", "Retry-After": String(rateCheck.retryAfter) } },
    );
  }

  try {
    const { id } = await submitSharedLinkDecision({
      publicationToken: token,
      recipientId,
      expectedSnapshotVersion,
      decision,
      note,
      signerName,
      estimateId: estimateId.value,
      rowId: rowId.value,
    });

    // P8/D9: best-effort owner email digest. `after()` keeps the public POST fast while
    // still letting Next drain the async send/log work instead of abandoning a raw promise.
    scheduleOwnerDigest(access.publicationId, token, "decision");

    return Response.json({ id, decision, signerName, created: true }, { status: 201, headers: { "Cache-Control": "no-store" } });
  } catch (error: unknown) {
    const msg = readErrorMessage(error, "Failed to submit decision.");
    if (msg === "Decision already submitted.") {
      const ipHash = getIpHash(request);
      logStructured("warn", "/api/share/[token]/decision", "DECISION_ALREADY_SUBMITTED", ipHash);
      return Response.json({ error: "Decision already submitted." }, { status: 409, headers: { "Cache-Control": "no-store" } });
    }
    if (/snapshot|stale|changed/i.test(msg)) {
      const ipHash = getIpHash(request);
      logStructured("warn", "/api/share/[token]/decision", "SNAPSHOT_VERSION_CHANGED", ipHash);
      return Response.json(
        { error: "Publication snapshot changed. Please reload before submitting a decision.", currentSnapshotVersion: access.snapshotVersion },
        { status: 409, headers: { "Cache-Control": "no-store" } },
      );
    }
    if (PUBLIC_REVIEW_TARGET_ERROR_MESSAGES.has(msg)) {
      const ipHash = getIpHash(request);
      logStructured("warn", "/api/share/[token]/decision", "INVALID_REVIEW_TARGET", ipHash);
      return Response.json({ error: msg }, { status: 400, headers: { "Cache-Control": "no-store" } });
    }
    if (/^Invalid review target:/i.test(msg)) {
      const ipHash = getIpHash(request);
      logStructured("warn", "/api/share/[token]/decision", "INVALID_REVIEW_TARGET", ipHash);
      return Response.json({ error: "Invalid review target." }, { status: 400, headers: { "Cache-Control": "no-store" } });
    }
    const knownRecipientFailure = DECISION_RECIPIENT_ERROR_MESSAGES.has(msg);
    const status = knownRecipientFailure ? 403 : 500;
    const ipHash = getIpHash(request);
    if (status === 500) {
      logAppError(error, {
        event: "route_error",
        context: {
          public_error: "SUBMIT_FAILED",
          route: "/api/share/[token]/decision",
          route_handler: "POST /api/share/[token]/decision",
          status,
        },
      });
    }
    logStructured("error", "/api/share/[token]/decision", "SUBMIT_FAILED", ipHash, { status, msg: msg.slice(0, 120) });
    // SEC-15 (AC-SEC-15): never echo a raw RPC/DB error to the public client. The detailed
    // message is logged server-side (above). Only exact app-authored failure strings can affect
    // public status; provider/RPC text must never be classified with broad word regexes.
    const clientError = knownRecipientFailure
      ? "Decision could not be submitted for this recipient."
      : "Something went wrong. Please try again.";
    return Response.json({ error: clientError }, { status, headers: { "Cache-Control": "no-store" } });
  }
}
