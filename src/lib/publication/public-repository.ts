import { createHash, createHmac } from "node:crypto";
import { cache } from "react";
import { createClient } from "@supabase/supabase-js";

import { deriveCredentialVersion, getClientIp, hashPublicationToken, readPublicationTokenHashSecret, verifyPublicationPassword } from "@/lib/publication/security";
import {
  createSharedLinkTargetLabelMapFromLabelsJson,
  resolveSharedLinkStoredTargetMetadata,
  validateSharedLinkReviewTarget,
} from "@/lib/publication/activity-helpers";
import {
  createPublicationSnapshotIdMaps,
  resolvePublicationSnapshotPublicId,
  sanitizeProjectPublicationSnapshotForPublicRead,
} from "@/lib/publication/snapshot";
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
  credentialVersion: string;
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
  estimateId: string | null;
  rowId: string | null;
  targetKind: "proposal" | "estimate" | "row";
  targetLabel: string | null;
  targetSecondaryLabel: string | null;
  snapshotVersionAtComment: number | null;
};

type SharedLinkPublicCommentRow = Pick<
  Tables<"shared_link_comments">,
  | "id"
  | "created_at"
  | "body"
  | "author_name"
  | "recipient_id"
  | "estimate_id"
  | "row_id"
  | "target_kind"
  | "target_label"
  | "target_secondary_label"
  | "snapshot_version_at_comment"
>;

export type SharedLinkRecipientDecision = {
  type: "accepted" | "declined" | "revision_requested";
  note: string | null;
  submittedAt: string;
  final: true;
  estimateId: string | null;
  rowId: string | null;
  targetKind: "proposal" | "estimate" | "row";
  targetLabel: string | null;
  targetSecondaryLabel: string | null;
  signerName: string | null;
  signatureIntentHash: string | null;
};

type PublicationLookupRow = Pick<
  Tables<"project_publications">,
  "expires_at" | "id" | "password_hash" | "revoked_at" | "snapshot_version" | "status"
>;
type PublicationWriteContextRow = Pick<
  Tables<"project_publications">,
  "activity_target_labels_json" | "id" | "snapshot_json" | "snapshot_version"
>;

type PublicationSnapshotLookupRow = PublicationLookupRow & Pick<Tables<"project_publications">, "snapshot_json">;
type InsertClientCommentRpcArgs = Omit<
  Database["public"]["Functions"]["insert_client_comment"]["Args"],
  "p_estimate_id" | "p_row_id" | "p_target_kind" | "p_target_label" | "p_target_secondary_label"
> & {
  p_estimate_id: string | null;
  p_row_id: string | null;
  p_target_kind: "proposal" | "estimate" | "row";
  p_target_label: string | null;
  p_target_secondary_label: string | null;
};
type SubmitClientResponseRpcArgs = Omit<
  Database["public"]["Functions"]["submit_client_response"]["Args"],
  | "p_estimate_id"
  | "p_note"
  | "p_row_id"
  | "p_signature_intent_hash"
  | "p_signer_name"
  | "p_target_kind"
  | "p_target_label"
  | "p_target_secondary_label"
> & {
  p_estimate_id: string | null;
  p_note: string | null;
  p_row_id: string | null;
  p_signature_intent_hash: string | null;
  p_signer_name: string | null;
  p_target_kind: "proposal" | "estimate" | "row";
  p_target_label: string | null;
  p_target_secondary_label: string | null;
};

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

// OPT-3 (PERF-04): one service-role client per request. `React.cache` memoises the
// factory for the duration of a single request render (page + generateMetadata),
// collapsing the ≥5 per-call client allocations into one. The service-role config is
// fully static (no per-request header mutation) so reuse is safe; `persistSession:false`
// keeps it stateless. Outside a request scope (route handlers / tests) `cache` is a
// transparent passthrough — every call simply re-constructs, preserving prior behaviour.
const getRequestPublicationServiceClient = cache(createPublicationServiceClient);

// OPT-2 (PERF-03): de-duplicate the publication-row lookup. The same `token_hash` row is
// otherwise SELECT-ed up to 4× on the render path (access + analytics + event) plus again
// in generateMetadata. `React.cache` memoises per request (and across the page render AND
// generateMetadata), so repeated calls with the same token collapse to one round-trip.
// Two distinct cached readers keep the AC-PERF-03 target of "1 access read + 1 snapshot
// read": the access reader pulls only the lightweight active-state columns; the snapshot
// reader additionally pulls the heavy `snapshot_json` blob and is only used by the snapshot
// resolver. Both are per-request memoised — never cached across requests — so the
// active-state gate (revoked/expired) is re-evaluated on every visit.
const ACCESS_LOOKUP_COLUMNS = "id, status, password_hash, expires_at, revoked_at, snapshot_version";
const SNAPSHOT_LOOKUP_COLUMNS = "id, status, password_hash, snapshot_json, expires_at, revoked_at, snapshot_version";

const getCachedPublicationAccessRowByToken = cache(async (token: string): Promise<PublicationLookupRow | null> => {
  const supabase = getRequestPublicationServiceClient();
  const { data, error } = await supabase
    .from("project_publications")
    .select(ACCESS_LOOKUP_COLUMNS)
    .eq("token_hash", readTokenHash(token))
    .maybeSingle();

  if (error) throw error;
  return data ?? null;
});

const getCachedPublicationSnapshotRowByToken = cache(async (token: string): Promise<PublicationSnapshotLookupRow | null> => {
  const supabase = getRequestPublicationServiceClient();
  const { data, error } = await supabase
    .from("project_publications")
    .select(SNAPSHOT_LOOKUP_COLUMNS)
    .eq("token_hash", readTokenHash(token))
    .maybeSingle();

  if (error) throw error;
  return (data as PublicationSnapshotLookupRow | null) ?? null;
});

function isActivePublication(row: PublicationLookupRow) {
  if (row.status !== "published") return false;
  if (row.revoked_at) return false;
  if (row.expires_at && new Date(row.expires_at).getTime() <= Date.now()) return false;
  return true;
}

function readTokenHash(token: string) {
  return hashPublicationToken(token, readPublicationTokenHashSecret());
}

// SEC-06 (AC-SEC-06): resolve a publication's id from its token hash so recipient lookups in
// the comment/decision write paths can be constrained by publication_id. Returns null when no
// publication matches the token hash (the caller treats that as "publication not found").
async function resolvePublicationContextByTokenHash(
  supabase: ReturnType<typeof createPublicationServiceClient>,
  tokenHash: string,
): Promise<PublicationWriteContextRow | null> {
  const { data, error } = await supabase
    .from("project_publications")
    .select("id, activity_target_labels_json, snapshot_json, snapshot_version")
    .eq("token_hash", tokenHash)
    .maybeSingle();

  if (error) throw error;
  return data ?? null;
}

async function loadPublicationSnapshotForPublicIds(publicationId: string): Promise<ProjectPublicationSnapshot | null> {
  const supabase = createPublicationServiceClient();
  const { data, error } = await supabase
    .from("project_publications")
    .select("snapshot_json")
    .eq("id", publicationId)
    .maybeSingle();
  if (error) throw error;
  return (data?.snapshot_json as ProjectPublicationSnapshot | null) ?? null;
}

function toPublicSnapshotId(snapshot: ProjectPublicationSnapshot | null, id: string | null) {
  if (!snapshot || !id) return id;
  return createPublicationSnapshotIdMaps(snapshot).rawToPublic.get(id.toLowerCase()) ?? id;
}

function resolveSubmittedReviewTargetIds(
  snapshot: ProjectPublicationSnapshot | null | undefined,
  input: { estimateId?: string | null; rowId?: string | null },
) {
  if (!snapshot) {
    return {
      estimateId: input.estimateId ?? null,
      rowId: input.rowId ?? null,
    };
  }

  return {
    estimateId: resolvePublicationSnapshotPublicId(snapshot, input.estimateId),
    rowId: resolvePublicationSnapshotPublicId(snapshot, input.rowId),
  };
}

// SEC-02 (AC-SEC-02): the telemetry hash pepper. An unsalted sha256(ip) is reversible —
// the IPv4 space is small enough to rainbow-table — so the "hashed" IP/user-agent stored
// in project_publication_events / shared_link_events would be recoverable PII. Keying the
// hash with a server-only pepper makes the stored value non-reversible without the secret.
// Prefer a dedicated ARCHESTIMATOR_TELEMETRY_HASH_PEPPER, but fall back to the publication
// token hash secret (which already has a prod-required + dev-fallback contract) so no new
// env wiring is required to run locally or in CI.
function readTelemetryHashPepper() {
  return process.env.ARCHESTIMATOR_TELEMETRY_HASH_PEPPER?.trim() || readPublicationTokenHashSecret();
}

// SEC-02 (AC-SEC-02): keyed HMAC of an IP / user-agent for the *_hash telemetry columns.
// MUST be the only path that hashes ip/user-agent for those fields — never write a bare
// createHash("sha256")(ip) for ip_hash / user_agent_hash. Keeps the null-passthrough so a
// missing value still stores null (no value hashed = no PII written).
function hashRequestValue(value: string | null) {
  if (!value) return null;
  return createHmac("sha256", readTelemetryHashPepper()).update(value).digest("base64url");
}

export function hashPublicTelemetryValue(value: string | null) {
  return hashRequestValue(value);
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
  | "publication_digest"
  | "proposal_export"
  | "shared_link_session_start"
  | "shared_link_comment"
  | "shared_link_comment_read"
  | "shared_link_decision_read"
  | "shared_link_decision"
  | "shared_link_unsubscribe";

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

const RATE_LIMIT_CLEANUP_INTERVAL_MS = 60_000;
let lastRateLimitCleanupAt = 0;
let rateLimitCleanupPromise: Promise<void> | null = null;

async function cleanupExpiredRateLimitEventsIfDue(now = Date.now()) {
  if (rateLimitCleanupPromise) {
    await rateLimitCleanupPromise;
    return;
  }
  if (now - lastRateLimitCleanupAt < RATE_LIMIT_CLEANUP_INTERVAL_MS) return;
  lastRateLimitCleanupAt = now;
  rateLimitCleanupPromise = cleanupExpiredRateLimitEvents(now)
    .catch((error) => {
      lastRateLimitCleanupAt = 0;
      throw error;
    })
    .finally(() => {
      rateLimitCleanupPromise = null;
    });
  await rateLimitCleanupPromise;
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

  await cleanupExpiredRateLimitEventsIfDue(now);
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

// P1-T10 (security MEDIUM): the proposal XLSX export is the heaviest endpoint in this
// surface (per-tab DB fan-out + ExcelJS workbook build) and had no rate limiting. Per-user
// (+ client IP) durable limit reusing the same checkRecordedRateLimit machinery as the
// publication limiters — not a new limiter shape.
export async function checkProposalExportRateLimit({
  userId,
  request,
}: {
  userId: string;
  request: Request;
}): Promise<DurableRateLimitResult> {
  return checkRecordedRateLimit({
    scope: "proposal_export",
    keyParts: [userId, getClientIp(request)],
    metadata: { route: "proposal_export" },
    windows: [
      { seconds: 60, limit: 12, message: genericRateLimitMessage },
      { seconds: 60 * 60, limit: 120, message: genericRateLimitMessage },
    ],
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

export async function checkSharedLinkSessionStartRateLimit({
  token,
  request,
}: {
  token: string;
  request: Request;
}): Promise<DurableRateLimitResult> {
  return checkRecordedRateLimit({
    scope: "shared_link_session_start",
    keyParts: publicationRequestRateLimitKey(token, request),
    metadata: { route: "recipient_session" },
    windows: [
      { seconds: 60, limit: 10, message: genericRateLimitMessage },
      { seconds: 60 * 60, limit: 50, message: genericRateLimitMessage },
    ],
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

  await cleanupExpiredRateLimitEventsIfDue(now);
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

export async function checkSharedLinkUnsubscribeRateLimit({
  token,
  recipientToken,
  request,
}: {
  token: string;
  recipientToken: string;
  request: Request;
}): Promise<DurableRateLimitResult> {
  return checkRecordedRateLimit({
    scope: "shared_link_unsubscribe",
    keyParts: [
      ...publicationRequestRateLimitKey(token, request),
      hashPublicationToken(recipientToken, readPublicationTokenHashSecret()),
    ],
    metadata: { route: "unsubscribe" },
    windows: [
      { seconds: 60, limit: 5, message: genericRateLimitMessage },
      { seconds: 60 * 60, limit: 20, message: genericRateLimitMessage },
    ],
  });
}

function toResolvedAccess(data: PublicationLookupRow): ResolvedProjectPublicationAccess {
  return {
    publicationId: data.id,
    status: "published",
    passwordRequired: Boolean(data.password_hash),
    snapshotVersion: data.snapshot_version,
    credentialVersion: deriveCredentialVersion(data.password_hash),
  };
}

export async function resolveProjectPublicationAccessByToken(token: string): Promise<ResolvedProjectPublicationAccess | null> {
  if (!token.trim()) return null;

  // OPT-2: shared per-request memoised access-row read. The active-state gate
  // (isActivePublication) runs on every call so revoked/expired still resolve to null.
  const data = await getCachedPublicationAccessRowByToken(token);
  if (!data || !isActivePublication(data)) return null;

  return toResolvedAccess(data);
}

export async function resolveProjectPublicationSnapshotByToken(token: string): Promise<ResolvedProjectPublicationSnapshot | null> {
  if (!token.trim()) return null;

  // OPT-2: dedicated per-request memoised snapshot read (includes snapshot_json). Distinct
  // from the access reader so a happy-path visit performs exactly one snapshot SELECT
  // (shared by page render + generateMetadata) without ever pulling the blob on the
  // access-only / password-gate paths.
  const data = await getCachedPublicationSnapshotRowByToken(token);
  if (!data || !isActivePublication(data)) return null;

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

  const supabase = getRequestPublicationServiceClient();
  // OPT-2: reuse the per-request memoised access row instead of re-SELECTing it. The
  // active-state gate still runs here, so telemetry is never written for an inactive
  // publication.
  const publication = await getCachedPublicationAccessRowByToken(token);
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
  const supabase = getRequestPublicationServiceClient();
  // OPT-2: reuse the per-request memoised access row instead of re-SELECTing it. The
  // active-state gate still runs here, so the open counter / recipient bookkeeping is never
  // written for a revoked or expired publication.
  const publication = await getCachedPublicationAccessRowByToken(token);
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
    // MOD-MET-01: gate the public "Opened N times" counter on real visitors only.
    // Crawlers, link-preview unfurlers, and bot reloads otherwise inflate the count on
    // every fetch. The raw project_publication_events audit row above and the recipient
    // bookkeeping below stay unconditional (the latter only fires for known recipients).
    const isBot = readDeviceType(request.headers.get("user-agent") ?? "") === "bot";
    if (!isBot) {
      const { error: incrementError } = await supabase.rpc("increment_project_publication_open", {
        target_publication_id: publication.id,
      });
      if (incrementError) throw incrementError;
    }

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
): Promise<({ publicationId: string; snapshotVersion: number; credentialVersion: string } & ResolvedSharedLinkRecipientIdentity) | null> {
  if (!publicationToken.trim() || !recipientToken.trim()) return null;

  const supabase = createPublicationServiceClient();
  const pubHash = readTokenHash(publicationToken);

  const { data: pub, error: pubErr } = await supabase
    .from("project_publications")
    .select("id, status, expires_at, revoked_at, snapshot_version, password_hash")
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
    credentialVersion: deriveCredentialVersion(pub.password_hash),
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
    .select("id, created_at, body, author_name, author_email, recipient_id, estimate_id, row_id, target_kind, target_label, target_secondary_label, snapshot_version_at_comment")
    .eq("publication_id", publicationId)
    .eq("is_internal", false)
    .order("created_at", { ascending: true })
    .order("id", { ascending: true })
    .limit(200);

  if (error) throw error;

  const snapshot = await loadPublicationSnapshotForPublicIds(publicationId);
  return (data ?? []).map((comment) => mapSharedLinkPublicComment(comment, snapshot));
}

function mapSharedLinkPublicComment(comment: SharedLinkPublicCommentRow, snapshot: ProjectPublicationSnapshot | null): SharedLinkPublicComment {
  return {
    id: comment.id,
    content: comment.body,
    createdAt: comment.created_at,
    authorName: comment.author_name || (comment.recipient_id ? "Client" : "Project team"),
    authorType: comment.recipient_id ? "recipient" : "owner",
    estimateId: toPublicSnapshotId(snapshot, comment.estimate_id),
    rowId: toPublicSnapshotId(snapshot, comment.row_id),
    targetKind: comment.target_kind,
    targetLabel: comment.target_label,
    targetSecondaryLabel: comment.target_secondary_label,
    snapshotVersionAtComment: comment.snapshot_version_at_comment,
  };
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
  const [{ data, error }, snapshot] = await Promise.all([
    supabase
      .from("shared_link_responses")
      .select(
        "decision, note, created_at, estimate_id, row_id, target_kind, target_label, target_secondary_label, signer_name, signature_intent_hash",
      )
      .eq("publication_id", publicationId)
      .eq("recipient_id", recipientId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
    loadPublicationSnapshotForPublicIds(publicationId),
  ]);

  if (error) throw error;
  if (!data || !isSharedLinkDecisionType(data.decision)) return null;

  return {
    type: data.decision,
    note: data.note,
    submittedAt: data.created_at,
    final: true,
    estimateId: toPublicSnapshotId(snapshot, data.estimate_id),
    rowId: toPublicSnapshotId(snapshot, data.row_id),
    targetKind: data.target_kind,
    targetLabel: data.target_label,
    targetSecondaryLabel: data.target_secondary_label,
    signerName: data.signer_name ?? null,
    signatureIntentHash: data.signature_intent_hash ?? null,
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
}): Promise<{ id: string; comment?: SharedLinkPublicComment }> {
  if (!Number.isInteger(params.expectedSnapshotVersion) || params.expectedSnapshotVersion < 1) {
    throw new Error("Expected snapshot version is required.");
  }

  const supabase = createPublicationServiceClient();
  const pubHash = readTokenHash(params.publicationToken); // uses same secret as P3/P4/P5

  // SEC-06 (AC-SEC-06): resolve the publication owning THIS token so the recipient lookup
  // below can be constrained by publication_id. Without this an `id` from publication A could
  // (at the app layer) resolve a recipient_token_hash even when posting against publication B.
  // The downstream RPC also re-validates the recipient belongs to the publication, but we close
  // the app-layer seam too (defense-in-depth — see SEC-06 in 06_SECURITY_AUDIT.md).
  const publicationContext = await resolvePublicationContextByTokenHash(supabase, pubHash);
  if (!publicationContext) {
    throw new Error("Publication not found for comment.");
  }
  const publicationId = publicationContext.id;

  // Lookup recipient_token_hash (P3 table — cast as in verify fn), scoped to the publication.
  const { data: rec, error: recErr } = await supabase
    .from("shared_link_recipients")
    .select("recipient_token_hash")
    .eq("id", params.recipientId)
    .eq("publication_id", publicationId)
    .maybeSingle();

  if (recErr) throw recErr;
  if (!rec?.recipient_token_hash) {
    throw new Error("Recipient not found for comment.");
  }
  const recipientTokenHash = rec.recipient_token_hash;

  const sanitizedBody = params.body.trim().slice(0, 1000);
  const labels = createSharedLinkTargetLabelMapFromLabelsJson(publicationContext.activity_target_labels_json);
  const resolvedTargetIds = resolveSubmittedReviewTargetIds(publicationContext.snapshot_json as ProjectPublicationSnapshot, {
    estimateId: params.estimateId,
    rowId: params.rowId,
  });
  const validatedTarget = validateSharedLinkReviewTarget(labels, {
    estimate_id: resolvedTargetIds.estimateId,
    row_id: resolvedTargetIds.rowId,
  });
  const targetContext = resolveSharedLinkStoredTargetMetadata(labels, {
    estimate_id: validatedTarget.estimateId,
    row_id: validatedTarget.rowId,
  });

  // Call the exact P3 RPC (validates active pub + recipient match internally)
  const insertClientCommentArgs: InsertClientCommentRpcArgs = {
    p_token_hash: pubHash,
    p_recipient_token_hash: recipientTokenHash,
    p_estimate_id: validatedTarget.estimateId,
    p_row_id: validatedTarget.rowId,
    p_body: sanitizedBody,
    p_expected_snapshot_version: params.expectedSnapshotVersion,
    p_target_kind: targetContext.targetKind,
    p_target_label: targetContext.targetLabel,
    p_target_secondary_label: targetContext.targetSecondaryLabel ?? null,
  };
  const { data: commentId, error: rpcErr } = await supabase.rpc(
    "insert_client_comment",
    insertClientCommentArgs as Database["public"]["Functions"]["insert_client_comment"]["Args"],
  );

  if (rpcErr) throw new Error(rpcErr.message);
  if (!commentId) throw new Error("Failed to insert comment.");

  const id = String(commentId);
  const { data: insertedComment, error: insertedCommentErr } = await supabase
    .from("shared_link_comments")
    .select("id, created_at, body, author_name, recipient_id, estimate_id, row_id, target_kind, target_label, target_secondary_label, snapshot_version_at_comment")
    .eq("publication_id", publicationId)
    .eq("id", id)
    .eq("is_internal", false)
    .maybeSingle();

  if (insertedCommentErr || !insertedComment) {
    return { id };
  }

  return {
    id,
    comment: mapSharedLinkPublicComment(insertedComment, publicationContext.snapshot_json as ProjectPublicationSnapshot),
  };
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
  signerName?: string | null;
  estimateId?: string | null;
  rowId?: string | null;
}): Promise<{ id: string }> {
  if (!Number.isInteger(params.expectedSnapshotVersion) || params.expectedSnapshotVersion < 1) {
    throw new Error("Expected snapshot version is required.");
  }

  const supabase = createPublicationServiceClient();
  const pubHash = readTokenHash(params.publicationToken);

  // SEC-06 (AC-SEC-06): scope the recipient lookup to the publication owning THIS token so a
  // recipient `id` from publication A cannot resolve under publication B at the app layer.
  // The RPC re-validates publication+recipient too; this closes the app-layer seam.
  const publicationContext = await resolvePublicationContextByTokenHash(supabase, pubHash);
  if (!publicationContext) {
    throw new Error("Publication not found for decision.");
  }
  const publicationId = publicationContext.id;

  // Lookup recipient_token_hash (P3 table — same pattern as comments), scoped to the publication.
  const { data: rec, error: recErr } = await supabase
    .from("shared_link_recipients")
    .select("recipient_token_hash")
    .eq("id", params.recipientId)
    .eq("publication_id", publicationId)
    .maybeSingle();

  if (recErr) throw recErr;
  if (!rec?.recipient_token_hash) {
    throw new Error("Recipient not found for decision.");
  }
  const recipientTokenHash = rec.recipient_token_hash;

  const trimmedNote = params.note ? params.note.trim().slice(0, 2000) : null;
  const signerName = params.signerName ? params.signerName.trim().slice(0, 120) : null;
  const labels = createSharedLinkTargetLabelMapFromLabelsJson(publicationContext.activity_target_labels_json);
  const resolvedTargetIds = resolveSubmittedReviewTargetIds(publicationContext.snapshot_json as ProjectPublicationSnapshot, {
    estimateId: params.estimateId,
    rowId: params.rowId,
  });
  const validatedTarget = validateSharedLinkReviewTarget(labels, {
    estimate_id: resolvedTargetIds.estimateId,
    row_id: resolvedTargetIds.rowId,
  });
  const targetContext = resolveSharedLinkStoredTargetMetadata(labels, {
    estimate_id: validatedTarget.estimateId,
    row_id: validatedTarget.rowId,
  });

  // Call the exact P3 RPC (validates active pub + recipient + performs snapshot_version_at_decision lock + unique conflict)
  const submitClientResponseArgs: SubmitClientResponseRpcArgs = {
    p_token_hash: pubHash,
    p_recipient_token_hash: recipientTokenHash,
    p_decision: params.decision,
    p_note: trimmedNote,
    p_expected_snapshot_version: params.expectedSnapshotVersion,
    p_estimate_id: validatedTarget.estimateId,
    p_row_id: validatedTarget.rowId,
    p_signer_name: signerName,
    p_signature_intent_hash: null,
    p_target_kind: targetContext.targetKind,
    p_target_label: targetContext.targetLabel,
    p_target_secondary_label: targetContext.targetSecondaryLabel ?? null,
  };
  const { data: responseId, error: rpcErr } = await supabase.rpc(
    "submit_client_response",
    submitClientResponseArgs as Database["public"]["Functions"]["submit_client_response"]["Args"],
  );

  if (rpcErr) throw new Error(rpcErr.message);
  if (!responseId) {
    throw new Error("Decision already submitted.");
  }

  return { id: responseId as string };
}
