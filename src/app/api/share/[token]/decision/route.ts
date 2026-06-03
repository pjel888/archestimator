import {
  assertSameOriginPublicPost,
  createSharedLinkSessionCookieName,
  hasPublicationAccessCookie,
  verifySharedLinkSessionCookieValue,
} from "@/lib/publication/security";
import {
  checkSharedLinkDecisionReadRateLimit,
  checkSharedLinkDecisionRateLimit,
  loadSharedLinkRecipientDecision,
  resolveProjectPublicationAccessByToken,
  submitSharedLinkDecision,
} from "@/lib/publication/public-repository";
import { createHash } from "crypto";

export const dynamic = "force-dynamic";

// Lightweight cookie parser (shared with comment route pattern)
function parseCookieValue(cookieHeader: string, name: string): string | undefined {
  const match = cookieHeader.match(new RegExp(`(?:^|;\\s*)${name}=([^;]*)`));
  return match ? decodeURIComponent(match[1]) : undefined;
}

// P12: structured error logging (additive) for decision route
function getIpHash(request: Request): string {
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0].trim()
    || request.headers.get("cf-connecting-ip")
    || request.headers.get("x-real-ip")
    || "unknown";
  return createHash("sha256").update(ip).digest("hex").slice(0, 12);
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
      snapshotVersion?: unknown;
      recipientId?: unknown;
    };
    return {
      publicationId: typeof payload.publicationId === "string" ? payload.publicationId : undefined,
      snapshotVersion:
        typeof payload.snapshotVersion === "string" || typeof payload.snapshotVersion === "number"
          ? payload.snapshotVersion
          : undefined,
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
      snapshotVersion: access.snapshotVersion,
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
      snapshotVersion: access.snapshotVersion,
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

  const { token } = await params;
  const body = (await request.json().catch(() => ({}))) as {
    decision?: string;
    note?: string | null;
  };

  const decision = (body.decision || "").toString().trim();
  if (!isDecisionType(decision)) {
    const ipHash = getIpHash(request);
    logStructured("error", "/api/share/[token]/decision", "VALIDATION_INVALID_DECISION", ipHash);
    return Response.json({ error: "Invalid decision. Must be accepted, declined, or revision_requested." }, { status: 400, headers: { "Cache-Control": "no-store" } });
  }

  const note = typeof body.note === "string" ? body.note : null;

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
    return Response.json({ error: "Publication not found." }, { status: 404, headers: { "Cache-Control": "no-store" } });
  }

  // Verify P5 session against the current DB publication snapshot, not the cookie-derived snapshot.
  const sessionOk = verifySharedLinkSessionCookieValue(sessionValue, {
    token,
    publicationId: access.publicationId,
    snapshotVersion: access.snapshotVersion,
    recipientId: recipientIdFromCookie,
  });
  if (!sessionOk) {
    const ipHash = getIpHash(request);
    logStructured("error", "/api/share/[token]/decision", "SESSION_INVALID", ipHash);
    return Response.json({ error: "Valid recipient session required for decisions." }, { status: 401, headers: { "Cache-Control": "no-store" } });
  }

  const recipientId = recipientIdFromCookie;
  if (!recipientId) {
    const ipHash = getIpHash(request);
    logStructured("error", "/api/share/[token]/decision", "RECIPIENT_MISSING", ipHash);
    return Response.json({ error: "Recipient context missing from session." }, { status: 400, headers: { "Cache-Control": "no-store" } });
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
      expectedSnapshotVersion: access.snapshotVersion,
      decision,
      note,
    });

    // P8: best-effort owner email digest on decision (rate limited). Non-blocking.
    try {
      const { maybeTriggerSharedLinkActivityDigest } = await import("@/lib/publication/actions");
      maybeTriggerSharedLinkActivityDigest(access.publicationId, token, "decision");
    } catch {}

    return Response.json({ id, decision, created: true }, { status: 201, headers: { "Cache-Control": "no-store" } });
  } catch (error: unknown) {
    const msg = readErrorMessage(error, "Failed to submit decision.");
    if (/already submitted/i.test(msg)) {
      const ipHash = getIpHash(request);
      logStructured("warn", "/api/share/[token]/decision", "DECISION_ALREADY_SUBMITTED", ipHash);
      return Response.json({ error: "Decision already submitted." }, { status: 409, headers: { "Cache-Control": "no-store" } });
    }
    if (/snapshot|stale|changed/i.test(msg)) {
      const ipHash = getIpHash(request);
      logStructured("warn", "/api/share/[token]/decision", "SNAPSHOT_VERSION_CHANGED", ipHash);
      return Response.json({ error: "Publication snapshot changed. Please reload before submitting a decision." }, { status: 409, headers: { "Cache-Control": "no-store" } });
    }
    const status = /not found|expired|recipient/i.test(msg) ? 403 : 500;
    const ipHash = getIpHash(request);
    logStructured("error", "/api/share/[token]/decision", "SUBMIT_FAILED", ipHash, { status, msg: msg.slice(0, 120) });
    return Response.json({ error: msg }, { status, headers: { "Cache-Control": "no-store" } });
  }
}
