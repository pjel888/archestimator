import { createHash, createHmac } from "node:crypto";
import { cache } from "react";

import { deriveCredentialVersion, getClientIp, hashPublicationToken, isPublicationTokenShape, readPublicationTokenHashSecret, verifyPublicationPassword } from "@/lib/publication/security";
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
import {
  createPublicationD1Store,
  type JsonValue,
  type PublicationAccessRow,
  type PublicationD1Store,
  type PublicationSnapshotRow,
  type PublicationWriteContextRow,
  type SharedLinkCommentD1Row,
} from "@/lib/publication/d1-store";

type Json = JsonValue;

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

type SharedLinkPublicCommentRow = SharedLinkCommentD1Row;

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

type PublicationLookupRow = PublicationAccessRow;
type PublicationSnapshotLookupRow = PublicationSnapshotRow;

export function createPublicationServiceClient() {
  return createPublicationD1Store();
}

// OPT-3 (PERF-04): one D1 store per request. `React.cache` memoises the
// factory for the duration of a single request render (page + generateMetadata),
// collapsing repeated store construction into one. Outside a request scope
// (route handlers / tests) `cache` is a transparent passthrough.
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
const getCachedPublicationAccessRowByToken = cache(async (token: string): Promise<PublicationLookupRow | null> => {
  const store = getRequestPublicationServiceClient();
  return store.getPublicationAccessByTokenHash(readTokenHash(token));
});

const getCachedPublicationSnapshotRowByToken = cache(async (token: string): Promise<PublicationSnapshotLookupRow | null> => {
  const store = getRequestPublicationServiceClient();
  return store.getPublicationSnapshotByTokenHash(readTokenHash(token));
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
  store: PublicationD1Store,
  tokenHash: string,
): Promise<PublicationWriteContextRow | null> {
  return store.getPublicationWriteContextByTokenHash(tokenHash);
}

async function loadPublicationSnapshotForPublicIds(publicationId: string): Promise<ProjectPublicationSnapshot | null> {
  const store = createPublicationServiceClient();
  return (await store.getPublicationSnapshotById(publicationId)) as ProjectPublicationSnapshot | null;
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
  const country = request.headers.get("cf-ipcountry");
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

const PROJECT_PUBLICATION_PASSWORD_FAILURE_WINDOW_SECONDS = 60 * 60;
const PROJECT_PUBLICATION_PASSWORD_FAILURE_LIMIT = 5;

function commentRateLimitMessage(retryAfter: number) {
  return `Too many comments. Please wait ${retryAfter} seconds.`;
}

async function cleanupExpiredRateLimitEvents(now = Date.now()) {
  const store = createPublicationServiceClient();
  await store.cleanupExpiredRateLimitEvents(now);
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
  activeAt,
  keyHash,
  scope,
  since,
}: {
  activeAt?: string;
  keyHash: string;
  scope: RateLimitScope;
  since: string;
}) {
  const store = createPublicationServiceClient();
  return activeAt
    ? store.countRateLimitEvents({ activeAt, keyHash, scope, since })
    : store.countRateLimitEvents({ keyHash, scope, since });
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
  const store = createPublicationServiceClient();
  await store.insertRateLimitEvent({ keyHash, metadata, scope, ttlSeconds });
}

async function deleteRateLimitEvents(scope: RateLimitScope, keyHash: string) {
  const store = createPublicationServiceClient();
  await store.deleteRateLimitEvents(scope, keyHash);
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
  const now = Date.now();
  await cleanupExpiredRateLimitEventsIfDue(now);
  const activeAt = new Date(now).toISOString();
  const since = new Date(now - window.seconds * 1000).toISOString();
  const count = await countRateLimitEvents({ activeAt, keyHash, scope, since });
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
    window: {
      seconds: PROJECT_PUBLICATION_PASSWORD_FAILURE_WINDOW_SECONDS,
      limit: PROJECT_PUBLICATION_PASSWORD_FAILURE_LIMIT,
      message: genericRateLimitMessage,
    },
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
    ttlSeconds: PROJECT_PUBLICATION_PASSWORD_FAILURE_WINDOW_SECONDS,
  });

  const since = new Date(now - PROJECT_PUBLICATION_PASSWORD_FAILURE_WINDOW_SECONDS * 1000).toISOString();
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
  const normalizedToken = token.trim();
  if (!isPublicationTokenShape(normalizedToken)) return null;

  // OPT-2: shared per-request memoised access-row read. The active-state gate
  // (isActivePublication) runs on every call so revoked/expired still resolve to null.
  const data = await getCachedPublicationAccessRowByToken(normalizedToken);
  if (!data || !isActivePublication(data)) return null;

  return toResolvedAccess(data);
}

export async function resolveProjectPublicationSnapshotByToken(token: string): Promise<ResolvedProjectPublicationSnapshot | null> {
  const normalizedToken = token.trim();
  if (!isPublicationTokenShape(normalizedToken)) return null;

  // OPT-2: dedicated per-request memoised snapshot read (includes snapshot_json). Distinct
  // from the access reader so a happy-path visit performs exactly one snapshot SELECT
  // (shared by page render + generateMetadata) without ever pulling the blob on the
  // access-only / password-gate paths.
  const data = await getCachedPublicationSnapshotRowByToken(normalizedToken);
  if (!data || !isActivePublication(data)) return null;

  return {
    ...toResolvedAccess(data),
    snapshot: sanitizeProjectPublicationSnapshotForPublicRead(data.snapshot_json as ProjectPublicationSnapshot),
  };
}

export async function verifyProjectPublicationPasswordByToken(token: string, password: string) {
  const normalizedToken = token.trim();
  if (!isPublicationTokenShape(normalizedToken) || !password) return false;

  const store = createPublicationServiceClient();
  const data = await store.getPublicationAccessByTokenHash(readTokenHash(normalizedToken));

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

  const store = getRequestPublicationServiceClient();
  // OPT-2: reuse the per-request memoised access row instead of re-SELECTing it. The
  // active-state gate still runs here, so telemetry is never written for an inactive
  // publication.
  const publication = await getCachedPublicationAccessRowByToken(token);
  if (!publication || !isActivePublication(publication)) return { recorded: false, reason: "inactive" };

  const ipHash = hashRequestValue(getClientIp(request));
  const userAgentHash = hashRequestValue(request.headers.get("user-agent"));
  const metadata = buildAccessTelemetryMetadata({ accessStage, passwordSuccess, recipientKnown, request });
  const eventMetadata = recipientId ? { ...metadata, recipient_known: true } : metadata;

  await store.insertPublicationEvent({
    publicationId: publication.id,
    eventType,
    metadata: eventMetadata as Record<string, Json>,
    ipHash,
    userAgentHash,
  });

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
  const store = getRequestPublicationServiceClient();
  // OPT-2: reuse the per-request memoised access row instead of re-SELECTing it. The
  // active-state gate still runs here, so the open counter / recipient bookkeeping is never
  // written for a revoked or expired publication.
  const publication = await getCachedPublicationAccessRowByToken(token);
  if (!publication || !isActivePublication(publication)) return;

  const eventMetadata = recipientId ? { ...metadata, recipient_id: recipientId } : metadata;
  const ipHash = hashRequestValue(getClientIp(request));
  const userAgentHash = hashRequestValue(request.headers.get("user-agent"));

  await store.insertPublicationEvent({
    publicationId: publication.id,
    eventType,
    metadata: eventMetadata as Record<string, Json>,
    ipHash,
    userAgentHash,
  });

  if (eventType === "open") {
    // MOD-MET-01: gate the public "Opened N times" counter on real visitors only.
    // Crawlers, link-preview unfurlers, and bot reloads otherwise inflate the count on
    // every fetch. The raw project_publication_events audit row above and the recipient
    // bookkeeping below stay unconditional (the latter only fires for known recipients).
    const isBot = readDeviceType(request.headers.get("user-agent") ?? "") === "bot";
    if (!isBot) {
      await store.incrementPublicationOpen(publication.id);
    }

    if (recipientId) {
      const openedAt = new Date().toISOString();
      await store.markRecipientOpened({ publicationId: publication.id, recipientId, openedAt });

      await store.insertSharedLinkEvent({
        publicationId: publication.id,
        recipientId,
        eventType: "open",
        metadata: eventMetadata as Record<string, Json>,
        ipHash,
        userAgentHash,
      });
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

  const store = createPublicationServiceClient();
  const pubHash = readTokenHash(publicationToken);

  const pub = await store.getPublicationAccessByTokenHash(pubHash);

  if (!pub || !isActivePublication(pub as PublicationLookupRow)) return null;

  const recHash = hashPublicationToken(recipientToken, readPublicationTokenHashSecret());
  const rec = await store.getRecipientByTokenHash(pub.id, recHash);
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

  const store = createPublicationServiceClient();
  const pubHash = readTokenHash(publicationToken);

  const pub = await store.getPublicationAccessByTokenHash(pubHash);

  if (!pub || !isActivePublication(pub as PublicationLookupRow)) return null;

  const recipientTokenHash = hashPublicationToken(recipientToken, readPublicationTokenHashSecret());
  const recipient = await store.markRecipientUnsubscribed(pub.id, recipientTokenHash);
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

  const store = createPublicationServiceClient();
  const data = await store.getRecipientIdentity(publicationId, recipientId);
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

  const store = createPublicationServiceClient();
  const data = await store.listPublicComments(publicationId, 200);

  const snapshot = await loadPublicationSnapshotForPublicIds(publicationId);
  return data.map((comment) => mapSharedLinkPublicComment(comment, snapshot));
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

  const store = createPublicationServiceClient();
  const [data, snapshot] = await Promise.all([
    store.getLatestRecipientDecision(publicationId, recipientId),
    loadPublicationSnapshotForPublicIds(publicationId),
  ]);

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
// P6: Insert client comment through the D1 publication store.
// - Reuses createPublicationServiceClient + hash helpers
// - Looks up recipient_token_hash from P3 table using recipientId (from P5 session)
// - Server-side sanitize + truncate defense-in-depth.
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

  const store = createPublicationServiceClient();
  const pubHash = readTokenHash(params.publicationToken); // uses same secret as P3/P4/P5

  // SEC-06 (AC-SEC-06): resolve the publication owning THIS token so the recipient lookup
  // below can be constrained by publication_id. Without this an `id` from publication A could
  // (at the app layer) resolve a recipient_token_hash even when posting against publication B.
  // The downstream RPC also re-validates the recipient belongs to the publication, but we close
  // the app-layer seam too (defense-in-depth — see SEC-06 in 06_SECURITY_AUDIT.md).
  const publicationContext = await resolvePublicationContextByTokenHash(store, pubHash);
  if (!publicationContext) {
    throw new Error("Publication not found for comment.");
  }
  const publicationId = publicationContext.id;

  const recipientTokenHash = await store.getRecipientTokenHash(publicationId, params.recipientId);
  if (!recipientTokenHash) {
    throw new Error("Recipient not found for comment.");
  }

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

  const commentId = await store.insertClientComment({
    tokenHash: pubHash,
    recipientTokenHash,
    publicationId,
    estimateId: validatedTarget.estimateId,
    rowId: validatedTarget.rowId,
    body: sanitizedBody,
    expectedSnapshotVersion: params.expectedSnapshotVersion,
    targetKind: targetContext.targetKind,
    targetLabel: targetContext.targetLabel,
    targetSecondaryLabel: targetContext.targetSecondaryLabel ?? null,
  });
  if (!commentId) throw new Error("Failed to insert comment.");

  const id = String(commentId);
  const insertedComment = await store.getComment(publicationId, id);

  if (!insertedComment) {
    return { id };
  }

  return {
    id,
    comment: mapSharedLinkPublicComment(insertedComment, publicationContext.snapshot_json as ProjectPublicationSnapshot),
  };
}

// (readTokenHash / hash helpers already defined earlier in this module for P3/P5 paths)

// ============================================================================
// P7: Submit client decision through the D1 publication store.
// - Additive only. Mirrors insertSharedLinkComment exactly for lookup + write shape.
// - snapshot_version locking + duplicate detection (unique on recipient+publication) handled in the store.
// - Raises 'Decision already submitted.' on conflict (mapped to 409 by caller route).
// - Optional note truncated to 2000 chars.
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

  const store = createPublicationServiceClient();
  const pubHash = readTokenHash(params.publicationToken);

  // SEC-06 (AC-SEC-06): scope the recipient lookup to the publication owning THIS token so a
  // recipient `id` from publication A cannot resolve under publication B at the app layer.
  // The RPC re-validates publication+recipient too; this closes the app-layer seam.
  const publicationContext = await resolvePublicationContextByTokenHash(store, pubHash);
  if (!publicationContext) {
    throw new Error("Publication not found for decision.");
  }
  const publicationId = publicationContext.id;

  const recipientTokenHash = await store.getRecipientTokenHash(publicationId, params.recipientId);
  if (!recipientTokenHash) {
    throw new Error("Recipient not found for decision.");
  }

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

  const responseId = await store.submitClientResponse({
    tokenHash: pubHash,
    recipientTokenHash,
    publicationId,
    decision: params.decision,
    note: trimmedNote,
    expectedSnapshotVersion: params.expectedSnapshotVersion,
    estimateId: validatedTarget.estimateId,
    rowId: validatedTarget.rowId,
    signerName,
    targetKind: targetContext.targetKind,
    targetLabel: targetContext.targetLabel,
    targetSecondaryLabel: targetContext.targetSecondaryLabel ?? null,
  });
  if (!responseId) {
    throw new Error("Decision already submitted.");
  }

  return { id: responseId };
}
