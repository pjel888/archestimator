import { createHash } from "node:crypto";
import { createClient } from "@supabase/supabase-js";

import { getClientIp, hashPublicationToken, readPublicationTokenHashSecret, verifyPublicationPassword } from "@/lib/publication/security";
import { sanitizeProjectPublicationSnapshotForPublicRead } from "@/lib/publication/snapshot";
import type { ProjectPublicationSnapshot } from "@/lib/publication/types";
import type { Database, Json, Tables } from "@/lib/supabase/types";

export type ProjectPublicationEventType = "open" | "password_success" | "password_failure" | "download_attempt_blocked" | "password_attempt";

export type ProjectPublicationAccessStage =
  | "page_visit"
  | "password_gate_viewed"
  | "password_unlocked"
  | "proposal_viewed"
  | "recipient_session_started";

export type ResolvedProjectPublicationAccess = {
  publicationId: string;
  status: "published";
  passwordRequired: boolean;
  snapshotVersion: number;
};

export type ResolvedProjectPublicationSnapshot = ResolvedProjectPublicationAccess & {
  snapshot: ProjectPublicationSnapshot;
};

export type ResolvedSharedLinkRecipientIdentity = {
  recipientId: string;
  recipientEmail: string;
  recipientDisplayName: string | null;
};

export type SharedLinkPublicComment = {
  id: string;
  content: string;
  createdAt: string;
  authorName: string;
  authorType: "owner" | "recipient";
};

export type SharedLinkRecipientDecision = {
  type: "accepted" | "declined" | "revision_requested";
  note: string | null;
  submittedAt: string;
  final: true;
};

type PublicationLookupRow = Pick<
  Tables<"project_publications">,
  "expires_at" | "id" | "password_hash" | "revoked_at" | "snapshot_version" | "status"
>;

type PublicationSnapshotLookupRow = PublicationLookupRow & Pick<Tables<"project_publications">, "snapshot_json">;

export function createPublicationServiceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (!url || !serviceRoleKey) {
    throw new Error("Public publication lookup requires NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY on the server.");
  }

  return createClient<Database>(url, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
    global: {
      headers: {
        "X-Client-Info": "archestimator-project-publication",
      },
    },
  });
}

function isActivePublication(row: PublicationLookupRow) {
  if (row.status !== "published") return false;
  if (row.revoked_at) return false;
  if (row.expires_at && new Date(row.expires_at).getTime() <= Date.now()) return false;
  return true;
}

function readTokenHash(token: string) {
  return hashPublicationToken(token, readPublicationTokenHashSecret());
}

function hashRequestValue(value: string | null) {
  if (!value) return null;
  return createHash("sha256").update(value).digest("base64url");
}

export function isProjectPublicationAccessTelemetryEnabled(env: Partial<Pick<NodeJS.ProcessEnv, "NODE_ENV" | "ARCHESTIMATOR_ACCESS_TELEMETRY_ENABLED" | "ARCHESTIMATOR_ACCESS_TELEMETRY_PRODUCTION_READY">> = process.env) {
  if (env.ARCHESTIMATOR_ACCESS_TELEMETRY_ENABLED !== "true") return false;
  if (env.NODE_ENV === "production" && env.ARCHESTIMATOR_ACCESS_TELEMETRY_PRODUCTION_READY !== "true") return false;
  return true;
}

function readTrustedCountry(request: Request) {
  const country = request.headers.get("x-vercel-ip-country") ?? request.headers.get("cf-ipcountry");
  const normalized = country?.trim().toUpperCase();
  return normalized && /^[A-Z]{2}$/.test(normalized) ? normalized : undefined;
}

function readDeviceType(userAgent: string): "desktop" | "mobile" | "tablet" | "bot" | "unknown" {
  if (!userAgent.trim()) return "unknown";
  if (/bot|crawler|spider|preview|facebookexternalhit|slackbot|discordbot/i.test(userAgent)) return "bot";
  if (/ipad|tablet|kindle|silk/i.test(userAgent)) return "tablet";
  if (/mobile|iphone|android.*mobile/i.test(userAgent)) return "mobile";
  if (/macintosh|windows|linux|x11|cros/i.test(userAgent)) return "desktop";
  return "unknown";
}

function readBrowserFamily(userAgent: string): "Chrome" | "Safari" | "Firefox" | "Edge" | "unknown" {
  if (/edg\//i.test(userAgent)) return "Edge";
  if (/firefox\//i.test(userAgent)) return "Firefox";
  if (/chrome\//i.test(userAgent) || /crios\//i.test(userAgent)) return "Chrome";
  if (/safari\//i.test(userAgent)) return "Safari";
  return "unknown";
}

function readOsFamily(userAgent: string): "macOS" | "Windows" | "iOS" | "Android" | "unknown" {
  if (/iphone|ipad|ipod/i.test(userAgent)) return "iOS";
  if (/android/i.test(userAgent)) return "Android";
  if (/macintosh|mac os x/i.test(userAgent)) return "macOS";
  if (/windows/i.test(userAgent)) return "Windows";
  return "unknown";
}

function buildAccessTelemetryMetadata({
  accessStage,
  passwordSuccess,
  recipientKnown,
  request,
}: {
  accessStage: ProjectPublicationAccessStage;
  passwordSuccess?: boolean;
  recipientKnown: boolean;
  request: Request;
}) {
  const userAgent = request.headers.get("user-agent") ?? "";
  const deviceType = readDeviceType(userAgent);
  return {
    observed_at: new Date().toISOString(),
    access_stage: accessStage,
    recipient_known: recipientKnown,
    ...(typeof passwordSuccess === "boolean" ? { password_success: passwordSuccess } : {}),
    device_type: deviceType,
    browser_family: deviceType === "bot" ? "unknown" : readBrowserFamily(userAgent),
    os_family: deviceType === "bot" ? "unknown" : readOsFamily(userAgent),
    ...(readTrustedCountry(request) ? { country: readTrustedCountry(request) } : {}),
    bot: deviceType === "bot",
  } satisfies Record<string, Json>;
}

export type DurableRateLimitResult =
  | { allowed: true }
  | { allowed: false; message: string; retryAfter: number };

type RateLimitWindow = {
  limit: number;
  message: (retryAfter: number) => string;
  seconds: number;
};

type RateLimitScope =
  | "project_publication_activity"
  | "project_publication_event"
  | "project_publication_password"
  | "project_publication_snapshot"
  | "shared_link_comment"
  | "shared_link_comment_read"
  | "shared_link_decision_read"
  | "shared_link_decision";

function hashRateLimitKey(scope: RateLimitScope, parts: Array<string | null | undefined>) {
  return createHash("sha256")
    .update([scope, ...parts.map((part) => part?.trim() || "-")].join("\u001f"))
    .digest("base64url");
}

function genericRateLimitMessage(retryAfter: number) {
  return `Too many attempts. Please wait ${retryAfter} seconds.`;
}

function commentRateLimitMessage(retryAfter: number) {
  return `Too many comments. Please wait ${retryAfter} seconds.`;
}

async function cleanupExpiredRateLimitEvents(now = Date.now()) {
  const supabase = createPublicationServiceClient();
  const { error } = await supabase
    .from("security_rate_limit_events")
    .delete()
    .lt("expires_at", new Date(now).toISOString());
  if (error) throw error;
}

async function countRateLimitEvents({
  keyHash,
  scope,
  since,
}: {
  keyHash: string;
  scope: RateLimitScope;
  since: string;
}) {
  const supabase = createPublicationServiceClient();
  const { count, error } = await supabase
    .from("security_rate_limit_events")
    .select("id", { count: "exact", head: true })
    .eq("scope", scope)
    .eq("key_hash", keyHash)
    .gte("occurred_at", since);
  if (error) throw error;
  return count ?? 0;
}

async function recordRateLimitEvent({
  keyHash,
  metadata,
  scope,
  ttlSeconds,
}: {
  keyHash: string;
  metadata?: Record<string, Json>;
  scope: RateLimitScope;
  ttlSeconds: number;
}) {
  const supabase = createPublicationServiceClient();
  const { error } = await supabase.from("security_rate_limit_events").insert({
    scope,
    key_hash: keyHash,
    metadata_json: (metadata ?? {}) as Json,
    expires_at: new Date(Date.now() + ttlSeconds * 1000).toISOString(),
  });
  if (error) throw error;
}

async function deleteRateLimitEvents(scope: RateLimitScope, keyHash: string) {
  const supabase = createPublicationServiceClient();
  const { error } = await supabase
    .from("security_rate_limit_events")
    .delete()
    .eq("scope", scope)
    .eq("key_hash", keyHash);
  if (error) throw error;
}

async function checkRecordedRateLimit({
  keyParts,
  metadata,
  scope,
  windows,
}: {
  keyParts: Array<string | null | undefined>;
  metadata?: Record<string, Json>;
  scope: RateLimitScope;
  windows: RateLimitWindow[];
}): Promise<DurableRateLimitResult> {
  const now = Date.now();
  const keyHash = hashRateLimitKey(scope, keyParts);
  const maxWindowSeconds = Math.max(...windows.map((window) => window.seconds));

  await cleanupExpiredRateLimitEvents(now);
  await recordRateLimitEvent({ keyHash, metadata, scope, ttlSeconds: maxWindowSeconds });

  for (const window of windows) {
    const since = new Date(now - window.seconds * 1000).toISOString();
    const count = await countRateLimitEvents({ keyHash, scope, since });
    if (count > window.limit) {
      return { allowed: false, retryAfter: window.seconds, message: window.message(window.seconds) };
    }
  }

  return { allowed: true };
}

async function checkExistingRateLimit({
  keyParts,
  scope,
  window,
}: {
  keyParts: Array<string | null | undefined>;
  scope: RateLimitScope;
  window: RateLimitWindow;
}): Promise<DurableRateLimitResult> {
  const keyHash = hashRateLimitKey(scope, keyParts);
  const since = new Date(Date.now() - window.seconds * 1000).toISOString();
  const count = await countRateLimitEvents({ keyHash, scope, since });
  if (count >= window.limit) {
    return { allowed: false, retryAfter: window.seconds, message: window.message(window.seconds) };
  }
  return { allowed: true };
}

function publicationRequestRateLimitKey(token: string, request: Request) {
  return [readTokenHash(token), hashRequestValue(getClientIp(request)) ?? "unknown"];
}

export async function checkProjectPublicationSnapshotRateLimit({
  token,
  request,
}: {
  token: string;
  request: Request;
}): Promise<DurableRateLimitResult> {
  return checkRecordedRateLimit({
    scope: "project_publication_snapshot",
    keyParts: publicationRequestRateLimitKey(token, request),
    metadata: { route: "snapshot" },
    windows: [{ seconds: 60, limit: 60, message: genericRateLimitMessage }],
  });
}

export async function checkProjectPublicationEventRateLimit({
  token,
  request,
}: {
  token: string;
  request: Request;
}): Promise<DurableRateLimitResult> {
  return checkRecordedRateLimit({
    scope: "project_publication_event",
    keyParts: publicationRequestRateLimitKey(token, request),
    metadata: { route: "event" },
    windows: [{ seconds: 60, limit: 60, message: genericRateLimitMessage }],
  });
}

export async function checkProjectPublicationActivityRateLimit({
  token,
  request,
}: {
  token: string;
  request: Request;
}): Promise<DurableRateLimitResult> {
  return checkRecordedRateLimit({
    scope: "project_publication_activity",
    keyParts: publicationRequestRateLimitKey(token, request),
    metadata: { route: "activity" },
    windows: [{ seconds: 60, limit: 60, message: genericRateLimitMessage }],
  });
}

export async function checkProjectPublicationPasswordRateLimit({
  token,
  request,
}: {
  token: string;
  request: Request;
}): Promise<DurableRateLimitResult> {
  return checkExistingRateLimit({
    scope: "project_publication_password",
    keyParts: publicationRequestRateLimitKey(token, request),
    window: { seconds: 15 * 60, limit: 5, message: genericRateLimitMessage },
  });
}

export async function recordProjectPublicationPasswordFailure({
  token,
  request,
}: {
  token: string;
  request: Request;
}): Promise<{ delayMs: number }> {
  const keyParts = publicationRequestRateLimitKey(token, request);
  const now = Date.now();
  const keyHash = hashRateLimitKey("project_publication_password", keyParts);

  await cleanupExpiredRateLimitEvents(now);
  await recordRateLimitEvent({
    scope: "project_publication_password",
    keyHash,
    metadata: { route: "password", success: false },
    ttlSeconds: 15 * 60,
  });

  const since = new Date(now - 15 * 60 * 1000).toISOString();
  const failureCount = await countRateLimitEvents({
    scope: "project_publication_password",
    keyHash,
    since,
  });
  const delays = [1000, 2000, 4000, 8000, 16000, 30000];
  return { delayMs: delays[Math.min(Math.max(failureCount - 1, 0), delays.length - 1)] ?? 0 };
}

export async function clearProjectPublicationPasswordFailures({
  token,
  request,
}: {
  token: string;
  request: Request;
}) {
  const keyHash = hashRateLimitKey("project_publication_password", publicationRequestRateLimitKey(token, request));
  await deleteRateLimitEvents("project_publication_password", keyHash);
}

export async function checkSharedLinkCommentRateLimit({
  publicationId,
  recipientId,
}: {
  publicationId: string;
  recipientId: string;
}): Promise<DurableRateLimitResult> {
  return checkRecordedRateLimit({
    scope: "shared_link_comment",
    keyParts: [publicationId, recipientId],
    metadata: { route: "comment" },
    windows: [
      { seconds: 60, limit: 5, message: commentRateLimitMessage },
      { seconds: 60 * 60, limit: 20, message: commentRateLimitMessage },
    ],
  });
}

export async function checkSharedLinkCommentReadRateLimit({
  publicationId,
  recipientId,
}: {
  publicationId: string;
  recipientId: string;
}): Promise<DurableRateLimitResult> {
  return checkRecordedRateLimit({
    scope: "shared_link_comment_read",
    keyParts: [publicationId, recipientId],
    metadata: { route: "comment_read" },
    windows: [{ seconds: 60, limit: 60, message: genericRateLimitMessage }],
  });
}

export async function checkSharedLinkDecisionRateLimit({
  publicationId,
  recipientId,
}: {
  publicationId: string;
  recipientId: string;
}): Promise<DurableRateLimitResult> {
  return checkRecordedRateLimit({
    scope: "shared_link_decision",
    keyParts: [publicationId, recipientId],
    metadata: { route: "decision" },
    windows: [{ seconds: 60, limit: 5, message: genericRateLimitMessage }],
  });
}

export async function checkSharedLinkDecisionReadRateLimit({
  publicationId,
  recipientId,
}: {
  publicationId: string;
  recipientId: string;
}): Promise<DurableRateLimitResult> {
  return checkRecordedRateLimit({
    scope: "shared_link_decision_read",
    keyParts: [publicationId, recipientId],
    metadata: { route: "decision_read" },
    windows: [{ seconds: 60, limit: 60, message: genericRateLimitMessage }],
  });
}

function toResolvedAccess(data: PublicationLookupRow): ResolvedProjectPublicationAccess {
  return {
    publicationId: data.id,
    status: "published",
    passwordRequired: Boolean(data.password_hash),
    snapshotVersion: data.snapshot_version,
  };
}

export async function resolveProjectPublicationAccessByToken(token: string): Promise<ResolvedProjectPublicationAccess | null> {
  if (!token.trim()) return null;

  const supabase = createPublicationServiceClient();
  const { data, error } = await supabase
    .from("project_publications")
    .select("id, status, password_hash, expires_at, revoked_at, snapshot_version")
    .eq("token_hash", readTokenHash(token))
    .maybeSingle();

  if (error) throw error;
  if (!data || !isActivePublication(data)) return null;

  return toResolvedAccess(data);
}

export async function resolveProjectPublicationSnapshotByToken(token: string): Promise<ResolvedProjectPublicationSnapshot | null> {
  if (!token.trim()) return null;

  const supabase = createPublicationServiceClient();
  const { data, error } = await supabase
    .from("project_publications")
    .select("id, status, password_hash, snapshot_json, expires_at, revoked_at, snapshot_version")
    .eq("token_hash", readTokenHash(token))
    .maybeSingle();

  if (error) throw error;
  if (!data || !isActivePublication(data as PublicationSnapshotLookupRow)) return null;

  return {
    ...toResolvedAccess(data),
    snapshot: sanitizeProjectPublicationSnapshotForPublicRead(data.snapshot_json as ProjectPublicationSnapshot),
  };
}

export async function verifyProjectPublicationPasswordByToken(token: string, password: string) {
  if (!token.trim() || !password) return false;

  const supabase = createPublicationServiceClient();
  const { data, error } = await supabase
    .from("project_publications")
    .select("id, status, password_hash, expires_at, revoked_at, snapshot_version")
    .eq("token_hash", readTokenHash(token))
    .maybeSingle();

  if (error) throw error;
  if (!data || !isActivePublication(data) || !data.password_hash) return false;

  const passwordValid = await verifyPublicationPassword(password, data.password_hash);
  return passwordValid ? toResolvedAccess(data) : null;
}

export async function recordProjectPublicationAnalyticsEvent({
  token,
  eventType,
  accessStage,
  request,
  recipientId,
  recipientKnown = Boolean(recipientId),
  passwordSuccess,
}: {
  token: string;
  eventType: ProjectPublicationEventType;
  accessStage: ProjectPublicationAccessStage;
  request: Request;
  recipientId?: string;
  recipientKnown?: boolean;
  passwordSuccess?: boolean;
}): Promise<{ recorded: boolean; reason?: "disabled" | "inactive" }> {
  if (!isProjectPublicationAccessTelemetryEnabled()) return { recorded: false, reason: "disabled" };

  const supabase = createPublicationServiceClient();
  const { data: publication, error: publicationError } = await supabase
    .from("project_publications")
    .select("id, status, password_hash, expires_at, revoked_at, snapshot_version")
    .eq("token_hash", readTokenHash(token))
    .maybeSingle();

  if (publicationError) throw publicationError;
  if (!publication || !isActivePublication(publication)) return { recorded: false, reason: "inactive" };

  const ipHash = hashRequestValue(request.headers.get("x-forwarded-for") ?? getClientIp(request));
  const userAgentHash = hashRequestValue(request.headers.get("user-agent"));
  const metadata = buildAccessTelemetryMetadata({ accessStage, passwordSuccess, recipientKnown, request });
  const eventMetadata = recipientId ? { ...metadata, recipient_known: true } : metadata;

  const { error: eventError } = await supabase.from("project_publication_events").insert({
    publication_id: publication.id,
    event_type: eventType,
    metadata_json: eventMetadata as Json,
    ip_hash: ipHash,
    user_agent_hash: userAgentHash,
  });
  if (eventError) throw eventError;

  return { recorded: true };
}

export async function recordProjectPublicationEvent({
  token,
  eventType,
  request,
  metadata = {},
  recipientId,
}: {
  token: string;
  eventType: ProjectPublicationEventType;
  request: Request;
  metadata?: Record<string, unknown>;
  recipientId?: string;
}) {
  const supabase = createPublicationServiceClient();
  const { data: publication, error: publicationError } = await supabase
    .from("project_publications")
    .select("id, status, password_hash, expires_at, revoked_at, snapshot_version")
    .eq("token_hash", readTokenHash(token))
    .maybeSingle();

  if (publicationError) throw publicationError;
  if (!publication || !isActivePublication(publication)) return;

  const eventMetadata = recipientId ? { ...metadata, recipient_id: recipientId } : metadata;
  const ipHash = hashRequestValue(request.headers.get("x-forwarded-for"));
  const userAgentHash = hashRequestValue(request.headers.get("user-agent"));

  const { error: eventError } = await supabase.from("project_publication_events").insert({
    publication_id: publication.id,
    event_type: eventType,
    metadata_json: eventMetadata as Json,
    ip_hash: ipHash,
    user_agent_hash: userAgentHash,
  });
  if (eventError) throw eventError;

  if (eventType === "open") {
    const { error: incrementError } = await supabase.rpc("increment_project_publication_open", {
      target_publication_id: publication.id,
    });
    if (incrementError) throw incrementError;

    if (recipientId) {
      const openedAt = new Date().toISOString();
      const { error: recipientError } = await supabase
        .from("shared_link_recipients")
        .update({
          delivery_status: "opened",
          last_opened_at: openedAt,
          updated_at: openedAt,
        })
        .eq("id", recipientId)
        .eq("publication_id", publication.id);
      if (recipientError) throw recipientError;

      const { error: sharedEventError } = await supabase.from("shared_link_events").insert({
        publication_id: publication.id,
        recipient_id: recipientId,
        event_type: "open",
        metadata_json: eventMetadata as Json,
        ip_hash: ipHash,
        user_agent_hash: userAgentHash,
      });
      if (sharedEventError) throw sharedEventError;
    }
  }
}

// ============================================================================
// P5: Verify recipient token for shared link session (additive, uses P3 shared_link_recipients table)
// Hashes the raw recipient token with the same publication hash secret, matches against
// recipient_token_hash + publication linkage. Returns context for cookie + future RPCs.
// ============================================================================
export async function verifySharedLinkRecipientToken(
  publicationToken: string,
  recipientToken: string,
): Promise<({ publicationId: string; snapshotVersion: number } & ResolvedSharedLinkRecipientIdentity) | null> {
  if (!publicationToken.trim() || !recipientToken.trim()) return null;

  const supabase = createPublicationServiceClient();
  const pubHash = readTokenHash(publicationToken);

  const { data: pub, error: pubErr } = await supabase
    .from("project_publications")
    .select("id, status, expires_at, revoked_at, snapshot_version")
    .eq("token_hash", pubHash)
    .maybeSingle();

  if (pubErr) throw pubErr;
  if (!pub || !isActivePublication(pub as PublicationLookupRow)) return null;

  const recHash = hashPublicationToken(recipientToken, readPublicationTokenHashSecret());

  const { data: rec, error: recErr } = await supabase
    .from("shared_link_recipients")
    .select("id, email, display_name")
    .eq("recipient_token_hash", recHash)
    .eq("publication_id", pub.id)
    .maybeSingle();

  if (recErr) throw recErr;
  if (!rec?.email) return null;

  return {
    publicationId: pub.id,
    snapshotVersion: pub.snapshot_version,
    recipientId: rec.id,
    recipientEmail: rec.email,
    recipientDisplayName: rec.display_name,
  };
}

export async function unsubscribeSharedLinkRecipientByToken(
  publicationToken: string,
  recipientToken: string,
): Promise<ResolvedSharedLinkRecipientIdentity | null> {
  if (!publicationToken.trim() || !recipientToken.trim()) return null;

  const supabase = createPublicationServiceClient();
  const pubHash = readTokenHash(publicationToken);

  const { data: pub, error: pubErr } = await supabase
    .from("project_publications")
    .select("id, status, password_hash, expires_at, revoked_at, snapshot_version")
    .eq("token_hash", pubHash)
    .maybeSingle();

  if (pubErr) throw pubErr;
  if (!pub || !isActivePublication(pub as PublicationLookupRow)) return null;

  const recipientTokenHash = hashPublicationToken(recipientToken, readPublicationTokenHashSecret());
  const unsubscribedAt = new Date().toISOString();
  const { data: recipient, error: recipientError } = await supabase
    .from("shared_link_recipients")
    .update({
      email_unsubscribed_at: unsubscribedAt,
      updated_at: unsubscribedAt,
    })
    .eq("publication_id", pub.id)
    .eq("recipient_token_hash", recipientTokenHash)
    .select("id, email, display_name")
    .maybeSingle();

  if (recipientError) throw recipientError;
  if (!recipient?.email) return null;

  return {
    recipientId: recipient.id,
    recipientEmail: recipient.email,
    recipientDisplayName: recipient.display_name,
  };
}

export async function resolveSharedLinkRecipientIdentity({
  publicationId,
  recipientId,
}: {
  publicationId: string;
  recipientId: string | undefined;
}): Promise<ResolvedSharedLinkRecipientIdentity | null> {
  if (!publicationId.trim() || !recipientId?.trim()) return null;

  const supabase = createPublicationServiceClient();
  const { data, error } = await supabase
    .from("shared_link_recipients")
    .select("id, email, display_name")
    .eq("publication_id", publicationId)
    .eq("id", recipientId)
    .maybeSingle();

  if (error) throw error;
  if (!data?.email) return null;

  return {
    recipientId: data.id,
    recipientEmail: data.email,
    recipientDisplayName: data.display_name,
  };
}

export async function loadSharedLinkPublicComments({
  publicationId,
}: {
  publicationId: string;
}): Promise<SharedLinkPublicComment[]> {
  if (!publicationId.trim()) return [];

  const supabase = createPublicationServiceClient();
  const { data, error } = await supabase
    .from("shared_link_comments")
    .select("id, created_at, body, author_name, author_email, recipient_id")
    .eq("publication_id", publicationId)
    .eq("is_internal", false)
    .order("created_at", { ascending: true })
    .order("id", { ascending: true })
    .limit(200);

  if (error) throw error;

  return (data ?? []).map((comment) => ({
    id: comment.id,
    content: comment.body,
    createdAt: comment.created_at,
    authorName: comment.author_name || (comment.recipient_id ? "Client" : "Project team"),
    authorType: comment.recipient_id ? "recipient" : "owner",
  }));
}

function isSharedLinkDecisionType(value: string): value is SharedLinkRecipientDecision["type"] {
  return value === "accepted" || value === "declined" || value === "revision_requested";
}

export async function loadSharedLinkRecipientDecision({
  publicationId,
  recipientId,
}: {
  publicationId: string;
  recipientId: string;
}): Promise<SharedLinkRecipientDecision | null> {
  if (!publicationId.trim() || !recipientId.trim()) return null;

  const supabase = createPublicationServiceClient();
  const { data, error } = await supabase
    .from("shared_link_responses")
    .select("decision, note, created_at")
    .eq("publication_id", publicationId)
    .eq("recipient_id", recipientId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) throw error;
  if (!data || !isSharedLinkDecisionType(data.decision)) return null;

  return {
    type: data.decision,
    note: data.note,
    submittedAt: data.created_at,
    final: true,
  };
}

// ============================================================================
// P6: Insert client comment via the P3 SECURITY DEFINER RPC (additive only)
// - Reuses createPublicationServiceClient + hash helpers
// - Looks up recipient_token_hash from P3 table using recipientId (from P5 session)
// - Server-side sanitize + truncate defense-in-depth (RPC also truncates)
// - Returns comment id or throws on validation failure (publication/recipient active)
// - Called exclusively from the new POST /api/share/[token]/comment after CSRF + session + rate
// ============================================================================
export async function insertSharedLinkComment(params: {
  publicationToken: string;
  recipientId: string;
  expectedSnapshotVersion: number;
  body: string;
  estimateId?: string | null;
  rowId?: string | null;
}): Promise<{ id: string }> {
  if (!Number.isInteger(params.expectedSnapshotVersion) || params.expectedSnapshotVersion < 1) {
    throw new Error("Expected snapshot version is required.");
  }

  const supabase = createPublicationServiceClient();
  const pubHash = readTokenHash(params.publicationToken); // uses same secret as P3/P4/P5

  // Lookup recipient_token_hash (P3 table — cast as in verify fn)
  const { data: rec, error: recErr } = await supabase
    .from("shared_link_recipients")
    .select("recipient_token_hash")
    .eq("id", params.recipientId)
    .maybeSingle();

  if (recErr) throw recErr;
  if (!rec?.recipient_token_hash) {
    throw new Error("Recipient not found for comment.");
  }
  const recipientTokenHash = rec.recipient_token_hash;

  const sanitizedBody = params.body.trim().slice(0, 1000);

  // Call the exact P3 RPC (validates active pub + recipient match internally)
  // P3 RPC (insert_client_comment) + shared_link_* tables are runtime-verified; generated types lag local Supabase regen.
  const { data: commentId, error: rpcErr } = await supabase.rpc("insert_client_comment", {
    p_token_hash: pubHash,
    p_recipient_token_hash: recipientTokenHash,
    p_estimate_id: params.estimateId ?? null,
    p_row_id: params.rowId ?? null,
    p_body: sanitizedBody,
    p_expected_snapshot_version: params.expectedSnapshotVersion,
  });

  if (rpcErr) throw new Error(rpcErr.message);
  if (!commentId) throw new Error("Failed to insert comment.");

  return { id: commentId as string };
}

// (readTokenHash / hash helpers already defined earlier in this module for P3/P5 paths)

// ============================================================================
// P7: Submit client decision via the P3 SECURITY DEFINER RPC submit_client_response
// - Additive only. Mirrors insertSharedLinkComment exactly for lookup + RPC shape.
// - snapshot_version locking + duplicate detection (unique on recipient+publication) handled inside RPC.
// - Raises 'Decision already submitted.' on conflict (mapped to 409 by caller route).
// - Optional note truncated to 2000 chars (RPC also enforces).
// - Called exclusively from the new POST /api/share/[token]/decision after CSRF + P5 session.
// ============================================================================
export async function submitSharedLinkDecision(params: {
  publicationToken: string;
  recipientId: string;
  expectedSnapshotVersion: number;
  decision: "accepted" | "declined" | "revision_requested";
  note?: string | null;
}): Promise<{ id: string }> {
  if (!Number.isInteger(params.expectedSnapshotVersion) || params.expectedSnapshotVersion < 1) {
    throw new Error("Expected snapshot version is required.");
  }

  const supabase = createPublicationServiceClient();
  const pubHash = readTokenHash(params.publicationToken);

  // Lookup recipient_token_hash (P3 table — same pattern as comments)
  const { data: rec, error: recErr } = await supabase
    .from("shared_link_recipients")
    .select("recipient_token_hash")
    .eq("id", params.recipientId)
    .maybeSingle();

  if (recErr) throw recErr;
  if (!rec?.recipient_token_hash) {
    throw new Error("Recipient not found for decision.");
  }
  const recipientTokenHash = rec.recipient_token_hash;

  const trimmedNote = params.note ? params.note.trim().slice(0, 2000) : null;

  // Call the exact P3 RPC (validates active pub + recipient + performs snapshot_version_at_decision lock + unique conflict)
  // P3 RPC (submit_client_response) + shared_link_responses table are runtime-verified; generated types lag local Supabase regen.
  const { data: responseId, error: rpcErr } = await supabase.rpc("submit_client_response", {
    p_token_hash: pubHash,
    p_recipient_token_hash: recipientTokenHash,
    p_decision: params.decision,
    p_note: trimmedNote,
    p_expected_snapshot_version: params.expectedSnapshotVersion,
  });

  if (rpcErr) throw new Error(rpcErr.message);
  if (!responseId) {
    throw new Error("Decision already submitted.");
  }

  return { id: responseId as string };
}
