import { createHash } from "node:crypto";

import { composeSharedLinkActivity, type ActivityViewModel, type SharedLinkActivityInput } from "@/lib/activity";
import {
  assertSameOrigin,
  createSharedLinkSessionCookieName,
  verifySharedLinkSessionCookieValue,
  hashPublicationToken,
  readPublicationTokenHashSecret,
} from "@/lib/publication/security";
import { checkProjectPublicationActivityRateLimit, createPublicationServiceClient } from "@/lib/publication/public-repository";
import type { Tables } from "@/lib/supabase/types";
import type { NextRequest } from "next/server";

// P8: GET /api/share/[token]/activity — public-safe read (filtered), supports optional recipient session.
// Always filters is_internal=true comments for unauthenticated or basic public views.
// Manager/owner uses the server action loadSharedLinkActivity for full (including internal).
export const dynamic = "force-dynamic";

function parseCookieValue(cookieHeader: string, name: string): string | undefined {
  const match = cookieHeader.match(new RegExp(`(?:^|;\\s*)${name}=([^;]*)`));
  return match ? decodeURIComponent(match[1]) : undefined;
}

type PublicActivityViewModel = Pick<
  ActivityViewModel,
  "id" | "source" | "action" | "visibility" | "occurredAt" | "title" | "summary" | "body" | "badges" | "target" | "meta"
>;

function readRecipientIdFromSession(value: string | undefined) {
  try {
    const prefix = "shared-link-session-v1";
    const parts = (value || "").split(":");
    if (parts[0] !== prefix || !parts[1]) return undefined;
    const payload = JSON.parse(Buffer.from(parts[1], "base64url").toString("utf8")) as {
      recipientId?: unknown;
    };
    return typeof payload.recipientId === "string" ? payload.recipientId : undefined;
  } catch {
    return undefined;
  }
}

function createPublicActivityId(source: ActivityViewModel["source"], rawId: string) {
  return `act_${createHash("sha256").update(`${source}:${rawId}`).digest("hex").slice(0, 16)}`;
}

function toPublicActivityViewModel(activity: ActivityViewModel): PublicActivityViewModel {
  return {
    id: createPublicActivityId(activity.source, activity.id),
    source: activity.source,
    action: activity.action,
    visibility: "public",
    occurredAt: activity.occurredAt,
    title: activity.title,
    summary: activity.summary,
    body: activity.body,
    badges: activity.badges,
    target: {
      kind: activity.target.kind,
      label: activity.target.label,
      secondaryLabel: activity.target.secondaryLabel,
    },
    meta: activity.meta,
  };
}

export async function GET(request: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  const sameOrigin = assertSameOrigin(request as unknown as Request);
  if (!sameOrigin.ok) {
    return Response.json({ error: sameOrigin.message }, { status: sameOrigin.status, headers: { "Cache-Control": "no-store" } });
  }

  const { token } = await params;
  const rateLimit = await checkProjectPublicationActivityRateLimit({ token, request });
  if (!rateLimit.allowed) {
    return Response.json(
      { error: rateLimit.message },
      {
        status: 429,
        headers: { "Cache-Control": "no-store", "Retry-After": String(rateLimit.retryAfter) },
      },
    );
  }

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
  // Full internal visibility is available only through the authenticated manager server action.
  const recipientId = readRecipientIdFromSession(sessionValue);
  const verifiedRecipientId =
    recipientId &&
    verifySharedLinkSessionCookieValue(sessionValue, {
      token,
      publicationId: pubId,
      snapshotVersion: "1",
      recipientId,
    })
      ? recipientId
      : undefined;

  const [commentsRes, responsesRes, eventsRes] = await Promise.all([
    supabase
      .from("shared_link_comments")
      .select("id, created_at, body, is_internal, author_email")
      .eq("publication_id", pubId)
      .eq("is_internal", false)
      .order("created_at", { ascending: false })
      .limit(100),
    supabase
      .from("shared_link_responses")
      .select("id, created_at, decision, note")
      .eq("publication_id", pubId)
      .order("created_at", { ascending: false })
      .limit(50),
    supabase
      .from("shared_link_events")
      .select("id, created_at, event_type, metadata_json")
      .eq("publication_id", pubId)
      .order("created_at", { ascending: false })
      .limit(50),
  ]);

  const rawActivities: SharedLinkActivityInput[] = [];
  (commentsRes.data ?? []).forEach((c: Pick<Tables<"shared_link_comments">, "author_email" | "body" | "created_at" | "id">) => {
    rawActivities.push({ id: c.id, type: "comment", created_at: c.created_at, author: c.author_email, body: c.body, is_internal: false });
  });
  (responsesRes.data ?? []).forEach((r: Pick<Tables<"shared_link_responses">, "created_at" | "decision" | "id" | "note">) => {
    rawActivities.push({ id: r.id, type: "decision", created_at: r.created_at, decision: r.decision, body: r.note || undefined });
  });
  (eventsRes.data ?? []).forEach((e: Pick<Tables<"shared_link_events">, "created_at" | "event_type" | "id" | "metadata_json">) => {
    const metadata = e.metadata_json && typeof e.metadata_json === "object" && !Array.isArray(e.metadata_json) ? e.metadata_json : {};
    rawActivities.push({
      id: e.id,
      type: "event",
      created_at: e.created_at,
      metadata: { ...metadata, eventType: e.event_type },
    });
  });

  const activities = rawActivities
    .sort((a, b) => (a.created_at < b.created_at ? 1 : -1))
    .slice(0, 100)
    .map((activity) => composeSharedLinkActivity(activity, { audience: "client", visibility: "public" }))
    .filter((activity) => activity.visibility !== "internal")
    .map(toPublicActivityViewModel);

  return Response.json(
    {
      activities,
      hasMore: false,
      recipientSession: Boolean(verifiedRecipientId),
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}
