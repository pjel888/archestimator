import { assertSameOriginPublicPost, createSharedLinkSessionCookieName, verifySharedLinkSessionCookieValue } from "@/lib/publication/security";
import { submitSharedLinkDecision, createPublicationServiceClient } from "@/lib/publication/public-repository";

export const dynamic = "force-dynamic";

// Lightweight cookie parser (shared with comment route pattern)
function parseCookieValue(cookieHeader: string, name: string): string | undefined {
  const match = cookieHeader.match(new RegExp(`(?:^|;\\s*)${name}=([^;]*)`));
  return match ? decodeURIComponent(match[1]) : undefined;
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
  const allowedDecisions = ["accepted", "declined", "revision_requested"] as const;
  if (!allowedDecisions.includes(decision as any)) {
    return Response.json({ error: "Invalid decision. Must be accepted, declined, or revision_requested." }, { status: 400, headers: { "Cache-Control": "no-store" } });
  }

  const note = typeof body.note === "string" ? body.note : null;

  const cookieHeader = request.headers.get("cookie") || "";
  const sessionName = createSharedLinkSessionCookieName(token);
  const sessionValue = parseCookieValue(cookieHeader, sessionName);

  // Lightweight parse of signed P5 session payload for ids (no DB). Full crypto verify below.
  let publicationId = "unknown-pub";
  let snapshotVersion: string | number = "1";
  let recipientIdFromCookie: string | undefined;
  try {
    const prefix = "shared-link-session-v1";
    const parts = (sessionValue || "").split(":");
    if (parts[0] === prefix && parts[1]) {
      const p = JSON.parse(Buffer.from(parts[1], "base64url").toString("utf8"));
      if (p?.publicationId) publicationId = p.publicationId;
      if (p?.snapshotVersion) snapshotVersion = p.snapshotVersion;
      recipientIdFromCookie = p?.recipientId;
    }
  } catch {}

  // Verify P5 session (crypto + expiry + match, no DB required)
  const sessionOk = verifySharedLinkSessionCookieValue(sessionValue, {
    token,
    publicationId,
    snapshotVersion,
    recipientId: recipientIdFromCookie,
  });
  if (!sessionOk) {
    return Response.json({ error: "Valid recipient session required for decisions." }, { status: 401, headers: { "Cache-Control": "no-store" } });
  }

  const recipientId = recipientIdFromCookie;
  if (!recipientId) {
    return Response.json({ error: "Recipient context missing from session." }, { status: 400, headers: { "Cache-Control": "no-store" } });
  }

  try {
    const { id } = await submitSharedLinkDecision({
      publicationToken: token,
      recipientId,
      decision: decision as "accepted" | "declined" | "revision_requested",
      note,
    });

    // P8: best-effort owner email digest on decision (rate limited). Non-blocking.
    try {
      const { maybeTriggerSharedLinkActivityDigest } = await import("@/lib/publication/actions");
      if (publicationId && publicationId !== "unknown-pub") {
        maybeTriggerSharedLinkActivityDigest(publicationId, token, "decision");
      }
    } catch {}

    return Response.json({ id, decision, created: true }, { status: 201, headers: { "Cache-Control": "no-store" } });
  } catch (e: any) {
    const msg = e?.message || "Failed to submit decision.";
    if (/already submitted/i.test(msg)) {
      return Response.json({ error: "Decision already submitted." }, { status: 409, headers: { "Cache-Control": "no-store" } });
    }
    const status = /not found|expired|recipient/i.test(msg) ? 403 : 500;
    return Response.json({ error: msg }, { status, headers: { "Cache-Control": "no-store" } });
  }
}
