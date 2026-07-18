import { createHash } from "node:crypto";

import { composeSharedLinkActivity, type ActivityViewModel, type SharedLinkActivityInput } from "@/lib/activity";
import {
  assertSameOrigin,
  createSharedLinkSessionCookieName,
  deriveCredentialVersion,
  hasPublicationAccessCookie,
  verifySharedLinkSessionCookieValue,
  hashPublicationToken,
  readPublicationTokenHashSecret,
} from "@/lib/publication/security";
import { sharedLinkUnavailableErrorBody } from "@/lib/publication/share-copy";
import {
  compareSharedLinkActivityDesc,
  createSharedLinkTargetLabelMapFromLabelsJson,
  encodeSharedLinkActivityCursor,
  isBeforeSharedLinkActivityCursor,
  parseSharedLinkActivityCursor,
  readSharedLinkRecipientDisplayName,
  resolveSharedLinkStoredTargetMetadata,
} from "@/lib/publication/activity-helpers";
import { checkProjectPublicationActivityRateLimit } from "@/lib/publication/public-rate-limits";
import { createPublicationServiceClient } from "@/lib/publication/public-repository";
import { filterMap } from "@/lib/util/array";
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
  "id" | "source" | "action" | "visibility" | "occurredAt" | "title" | "summary" | "badges" | "target" | "meta"
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

  const url = new URL(request.url);
  const limitParam = Number(url.searchParams.get("limit"));
  const limit = Math.min(Math.max(Number.isFinite(limitParam) && limitParam > 0 ? Math.floor(limitParam) : 100, 1), 100);
  const parsedCursor = parseSharedLinkActivityCursor(url.searchParams.get("cursor"));
  if (!parsedCursor.ok) {
    return Response.json({ error: parsedCursor.error }, { status: 400, headers: { "Cache-Control": "no-store" } });
  }
  const cursor = parsedCursor.cursor;

  const publicationStore = createPublicationServiceClient();
  const pubHash = hashPublicationToken(token, readPublicationTokenHashSecret());

  const pub = await publicationStore.getPublicationActivityContextByTokenHash(pubHash);

  if (!pub || pub.status !== "published" || pub.revoked_at || (pub.expires_at && new Date(pub.expires_at) < new Date())) {
    return Response.json(sharedLinkUnavailableErrorBody(), { status: 404, headers: { "Cache-Control": "no-store" } });
  }

  const pubId = pub.id;
  const cookieHeader = request.headers.get("cookie") || "";

  if (
    pub.password_hash &&
    !hasPublicationAccessCookie(cookieHeader, {
      token,
      publicationId: pubId,
      credentialVersion: deriveCredentialVersion(pub.password_hash),
    })
  ) {
    return Response.json(
      { error: "Publication password required.", passwordRequired: true },
      { status: 423, headers: { "Cache-Control": "no-store" } },
    );
  }

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
      credentialVersion: deriveCredentialVersion(pub.password_hash),
      recipientId,
    })
      ? recipientId
      : undefined;

  const [commentsRes, responsesRes, eventsRes] = await Promise.all([
    publicationStore.listPublicActivityComments({ publicationId: pubId, cursor, limit: limit + 1 }),
    verifiedRecipientId
      ? publicationStore.listRecipientActivityResponses({ publicationId: pubId, recipientId: verifiedRecipientId, cursor, limit: limit + 1 })
      : Promise.resolve([]),
    verifiedRecipientId
      ? publicationStore.listRecipientActivityEvents({ publicationId: pubId, recipientId: verifiedRecipientId, cursor, limit: limit + 1 })
      : Promise.resolve([]),
  ]);

  const recipientIds = new Set<string>();
  for (const comment of commentsRes) if (comment.recipient_id) recipientIds.add(comment.recipient_id);
  for (const response of responsesRes) if (response.recipient_id) recipientIds.add(response.recipient_id);
  for (const event of eventsRes) if (event.recipient_id) recipientIds.add(event.recipient_id);

  const recipientDisplayNames = new Map<string, string>();
  if (recipientIds.size) {
    const recipients = await publicationStore.listRecipientDisplayNames(pubId, Array.from(recipientIds));
    for (const recipient of recipients) {
      recipientDisplayNames.set(recipient.id, readSharedLinkRecipientDisplayName(recipient));
    }
  }

  const targetLabels = createSharedLinkTargetLabelMapFromLabelsJson(pub.activity_target_labels_json);
  const rawActivities: SharedLinkActivityInput[] = [];
  commentsRes.forEach((c) => {
    const target = resolveSharedLinkStoredTargetMetadata(targetLabels, c);
    rawActivities.push({
      id: c.id,
      type: "comment",
      created_at: c.created_at,
      author: recipientDisplayNames.get(c.recipient_id ?? "") ?? "Client",
      is_internal: false,
      recipientDisplayName: recipientDisplayNames.get(c.recipient_id ?? ""),
      metadata: {
        ...target,
        snapshotVersionAtComment: c.snapshot_version_at_comment,
      },
    });
  });
  responsesRes.forEach((r) => {
    const target = resolveSharedLinkStoredTargetMetadata(targetLabels, r);
    rawActivities.push({
      id: r.id,
      type: "decision",
      created_at: r.created_at,
      decision: r.decision,
      body: r.note || undefined,
      recipientDisplayName: r.recipient_id ? recipientDisplayNames.get(r.recipient_id) : undefined,
      metadata: target,
    });
  });
  eventsRes.forEach((e) => {
    const metadata = e.metadata_json && typeof e.metadata_json === "object" && !Array.isArray(e.metadata_json) ? e.metadata_json : {};
    rawActivities.push({
      id: e.id,
      type: "event",
      created_at: e.created_at,
      metadata: { ...metadata, eventType: e.event_type },
      recipientDisplayName: e.recipient_id ? recipientDisplayNames.get(e.recipient_id) : undefined,
    });
  });

  const sortedActivities = rawActivities
    .filter((activity) => isBeforeSharedLinkActivityCursor(activity, cursor))
    .sort(compareSharedLinkActivityDesc);
  const pageActivities = sortedActivities.slice(0, limit);
  const activities = filterMap(pageActivities, (activity) => {
    const composed = composeSharedLinkActivity(activity, { audience: "client", visibility: "public" });
    return composed.visibility !== "internal" ? toPublicActivityViewModel(composed) : null;
  });
  const hasMore = sortedActivities.length > limit;
  const nextCursor = hasMore && pageActivities.length ? encodeSharedLinkActivityCursor(pageActivities[pageActivities.length - 1]!) : undefined;

  return Response.json(
    {
      activities,
      hasMore,
      ...(nextCursor ? { nextCursor } : {}),
      recipientSession: Boolean(verifiedRecipientId),
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}
