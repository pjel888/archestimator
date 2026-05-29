import {
  assertSameOriginPublicPost,
  createSharedLinkSessionCookieName,
  verifySharedLinkSessionCookieValue,
  hashPublicationToken,
  readPublicationTokenHashSecret,
} from "@/lib/publication/security";
import { createPublicationServiceClient } from "@/lib/publication/public-repository";
import type { NextRequest } from "next/server";

// P8: GET /api/share/[token]/activity — public-safe read (filtered), supports optional recipient session.
// Always filters is_internal=true comments for unauthenticated or basic public views.
// Manager/owner uses the server action loadSharedLinkActivity for full (including internal).
export const dynamic = "force-dynamic";

function parseCookieValue(cookieHeader: string, name: string): string | undefined {
  const match = cookieHeader.match(new RegExp(`(?:^|;\\s*)${name}=([^;]*)`));
  return match ? decodeURIComponent(match[1]) : undefined;
}

export async function GET(request: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  const sameOrigin = assertSameOriginPublicPost(request as unknown as Request);
  if (!sameOrigin.ok) {
    return Response.json({ error: sameOrigin.message }, { status: sameOrigin.status, headers: { "Cache-Control": "no-store" } });
  }

  const { token } = await params;
  const supabase = createPublicationServiceClient();
  const pubHash = hashPublicationToken(token, readPublicationTokenHashSecret());

  const { data: pub, error: pubErr } = await supabase
    .from("project_publications")
    .select("id, status, revoked_at, expires_at")
    .eq("token_hash", pubHash)
    .maybeSingle();

  if (pubErr) throw pubErr;
  if (!pub || pub.status !== "published" || pub.revoked_at || (pub.expires_at && new Date(pub.expires_at) < new Date())) {
    return Response.json({ error: "Publication not found or inactive." }, { status: 404, headers: { "Cache-Control": "no-store" } });
  }

  const pubId = pub.id;
  const cookieHeader = request.headers.get("cookie") || "";
  const sessionName = createSharedLinkSessionCookieName(token);
  const sessionValue = parseCookieValue(cookieHeader, sessionName);

  // Optional session (P5) — if valid recipient, we still filter is_internal for the public activity view per task.
  // (Full internal visible only via authenticated manager server action.)
  let recipientId: string | undefined;
  try {
    const prefix = "shared-link-session-v1";
    const parts = (sessionValue || "").split(":");
    if (parts[0] === prefix && parts[1]) {
      const p = JSON.parse(Buffer.from(parts[1], "base64url").toString("utf8"));
      recipientId = p?.recipientId;
    }
  } catch {}
  const sessionOk = recipientId ? verifySharedLinkSessionCookieValue(sessionValue, { token, publicationId: pubId, snapshotVersion: "1", recipientId }) : false;

  // Load comments (filter is_internal for this public route), responses, events
  const [commentsRes, responsesRes, eventsRes] = await Promise.all([
    supabase
      .from("shared_link_comments" as any)
      .select("id, created_at, body, is_internal, author_email")
      .eq("publication_id", pubId)
      .eq("is_internal", false) // public/unauth view: never leak internal owner notes
      .order("created_at", { ascending: false })
      .limit(100),
    supabase
      .from("shared_link_responses" as any)
      .select("id, created_at, decision, note")
      .eq("publication_id", pubId)
      .order("created_at", { ascending: false })
      .limit(50),
    supabase
      .from("shared_link_events" as any)
      .select("id, created_at, event_type, metadata_json")
      .eq("publication_id", pubId)
      .order("created_at", { ascending: false })
      .limit(50),
  ]);

  const activities: any[] = [];
  (commentsRes.data ?? []).forEach((c: any) =>
    activities.push({ id: c.id, type: "comment", created_at: c.created_at, author: c.author_email, body: c.body, is_internal: false })
  );
  (responsesRes.data ?? []).forEach((r: any) =>
    activities.push({ id: r.id, type: "decision", created_at: r.created_at, decision: r.decision, body: r.note || undefined })
  );
  (eventsRes.data ?? []).forEach((e: any) =>
    activities.push({ id: e.id, type: "event", created_at: e.created_at, metadata: e.metadata_json || {} })
  );

  activities.sort((a, b) => (a.created_at < b.created_at ? 1 : -1));

  return Response.json({ activities: activities.slice(0, 100), hasMore: false }, { headers: { "Cache-Control": "no-store" } });
}

