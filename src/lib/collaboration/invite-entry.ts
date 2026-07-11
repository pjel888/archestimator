import "server-only";

import { createHash, createHmac, randomBytes } from "node:crypto";
import {
  countSecurityRateLimitEventsInD1,
  deleteExpiredSecurityRateLimitEventsInD1,
  getAiAuditD1Database,
  recordSecurityRateLimitEventInD1,
} from "@/lib/ai/audit-d1-store";

const INVITE_TOKEN_PEPPER_ENV = "ARCHESTIMATOR_INVITE_TOKEN_PEPPER";
const INVITE_RATE_LIMIT_HASH_PEPPER_ENV = "ARCHESTIMATOR_INVITE_RATE_LIMIT_HASH_PEPPER";
const INVITE_TOKEN_HASH_VERSION = "v1";
const INVITE_TOKEN_BYTE_LENGTH = 32;
const INVITE_TOKEN_PEPPER_PATTERN = /^[a-f0-9]{64}$/i;

type InviteEntryEnv = Partial<
  Pick<NodeJS.ProcessEnv, "PROJECT_INVITE_ENTRY_ENABLED" | "ARCHESTIMATOR_INVITE_TOKEN_PEPPER">
> &
  Record<string, string | undefined>;

type InviteEntryConfig =
  | { enabled: true; pepper: string }
  | { enabled: false; reason: "disabled" | "missing-pepper" | "invalid-pepper" };

export function readInviteEntryConfig(env: InviteEntryEnv = process.env): InviteEntryConfig {
  if (env.PROJECT_INVITE_ENTRY_ENABLED !== "true") {
    return { enabled: false, reason: "disabled" };
  }

  const pepper = env.ARCHESTIMATOR_INVITE_TOKEN_PEPPER?.trim();
  if (!pepper) return { enabled: false, reason: "missing-pepper" };
  if (!INVITE_TOKEN_PEPPER_PATTERN.test(pepper)) {
    return { enabled: false, reason: "invalid-pepper" };
  }

  return { enabled: true, pepper };
}

export function isProjectInviteEntryEnabled(env: InviteEntryEnv = process.env) {
  return readInviteEntryConfig(env).enabled;
}

export function describeInviteEntryConfigFailure(config: Exclude<InviteEntryConfig, { enabled: true }>) {
  if (config.reason === "missing-pepper") {
    return "Project invite entry is missing ARCHESTIMATOR_INVITE_TOKEN_PEPPER.";
  }
  if (config.reason === "invalid-pepper") {
    return "Project invite entry requires ARCHESTIMATOR_INVITE_TOKEN_PEPPER to be a 64-character hex secret.";
  }
  return "Project invite entry is disabled.";
}

export function hashInviteToken(rawToken: string, pepper: string) {
  const normalizedToken = rawToken.trim();
  const normalizedPepper = pepper.trim();
  if (!normalizedToken) throw new Error("Invite token is required.");
  if (!normalizedPepper) throw new Error("Invite token pepper is required.");

  const digest = createHash("sha256")
    .update(`${INVITE_TOKEN_HASH_VERSION}:${normalizedPepper}:${normalizedToken}`)
    .digest("hex");
  return `${INVITE_TOKEN_HASH_VERSION}:${digest}`;
}

export function createInviteToken(env: InviteEntryEnv = process.env) {
  const config = readInviteEntryConfig(env);
  if (!config.enabled) throw new Error(describeInviteEntryConfigFailure(config));

  const rawToken = randomBytes(INVITE_TOKEN_BYTE_LENGTH).toString("base64url");
  return {
    rawToken,
    tokenHash: hashInviteToken(rawToken, config.pepper),
    tokenHint: rawToken.slice(-6),
  };
}

export function buildInviteEntryUrl(origin: string, rawToken: string) {
  return new URL(`/invite/${encodeURIComponent(rawToken)}`, origin).toString();
}

export type InviteRateLimitResult =
  | { allowed: true }
  | { allowed: false; message: string; retryAfter: number };

type HeaderReader = {
  get(name: string): string | null;
};

type InviteRateLimitScope =
  | "collaboration_invite_create"
  | "collaboration_invite_accept"
  | "collaboration_invite_continue"
  | "collaboration_invite_resolve"
  | "collaboration_invite_resend";

function getClientIp(headers: HeaderReader) {
  return headers.get("cf-connecting-ip")?.trim()
    || "unknown";
}

function hashRateLimitKey(scope: InviteRateLimitScope, parts: string[]) {
  return createHash("sha256")
    .update([scope, ...parts.map((part) => part.trim() || "-")].join("\u001f"))
    .digest("base64url");
}

function readInviteRateLimitHashPepper(env: InviteEntryEnv = process.env) {
  const pepper =
    env[INVITE_RATE_LIMIT_HASH_PEPPER_ENV]?.trim() ||
    env[INVITE_TOKEN_PEPPER_ENV]?.trim();
  if (!pepper) {
    throw new Error(
      "Invite rate limiting requires ARCHESTIMATOR_INVITE_RATE_LIMIT_HASH_PEPPER or ARCHESTIMATOR_INVITE_TOKEN_PEPPER on the server.",
    );
  }
  return pepper;
}

function hashIp(headers: HeaderReader) {
  return createHmac("sha256", readInviteRateLimitHashPepper()).update(getClientIp(headers)).digest("base64url");
}

function inviteRateLimitMessage(retryAfter: number) {
  return `Too many attempts. Please wait ${retryAfter} seconds.`;
}

async function recordInviteRateLimitEvent({
  keyHash,
  scope,
  windowSeconds,
}: {
  keyHash: string;
  scope: InviteRateLimitScope;
  windowSeconds: number;
}) {
  const db = await getAiAuditD1Database();
  if (!db) throw new Error("Invite rate limiting requires Cloudflare D1 audit storage.");
  const now = Date.now();
  const occurredAt = new Date(now).toISOString();
  await deleteExpiredSecurityRateLimitEventsInD1(db, occurredAt);
  await recordSecurityRateLimitEventInD1(db, {
    scope,
    keyHash,
    metadataJson: { route: scope },
    occurredAt,
    expiresAt: new Date(now + windowSeconds * 1000).toISOString(),
  });
}

async function countInviteRateLimitEvents({
  keyHash,
  scope,
  windowSeconds,
}: {
  keyHash: string;
  scope: InviteRateLimitScope;
  windowSeconds: number;
}) {
  const db = await getAiAuditD1Database();
  if (!db) throw new Error("Invite rate limiting requires Cloudflare D1 audit storage.");
  return countSecurityRateLimitEventsInD1(db, {
    scope,
    keyHash,
    since: new Date(Date.now() - windowSeconds * 1000).toISOString(),
  });
}

async function checkInviteRateLimit({
  headers,
  limit,
  rawToken,
  scope,
  userId,
  windowSeconds = 60,
}: {
  headers: HeaderReader;
  limit: number;
  rawToken: string;
  scope: InviteRateLimitScope;
  userId?: string | null;
  windowSeconds?: number;
}): Promise<InviteRateLimitResult> {
  const config = readInviteEntryConfig();
  if (!config.enabled) return { allowed: true };

  const tokenHash = hashInviteToken(rawToken, config.pepper);
  return checkInviteTokenHashRateLimit({ headers, limit, scope, tokenHash, userId, windowSeconds });
}

async function checkInviteTokenHashRateLimit({
  headers,
  limit,
  scope,
  tokenHash,
  userId,
  windowSeconds = 60,
}: {
  headers: HeaderReader;
  limit: number;
  scope: InviteRateLimitScope;
  tokenHash: string;
  userId?: string | null;
  windowSeconds?: number;
}): Promise<InviteRateLimitResult> {
  const keyHash = hashRateLimitKey(scope, [hashIp(headers), userId ?? "anonymous", tokenHash]);

  await recordInviteRateLimitEvent({ scope, keyHash, windowSeconds });
  const count = await countInviteRateLimitEvents({ scope, keyHash, windowSeconds });
  if (count > limit) {
    return { allowed: false, retryAfter: windowSeconds, message: inviteRateLimitMessage(windowSeconds) };
  }
  return { allowed: true };
}

async function checkInviteKeyRateLimit({
  headers,
  keyParts,
  limit,
  scope,
  windowSeconds,
}: {
  headers: HeaderReader;
  keyParts: string[];
  limit: number;
  scope: InviteRateLimitScope;
  windowSeconds: number;
}): Promise<InviteRateLimitResult> {
  const keyHash = hashRateLimitKey(scope, [hashIp(headers), ...keyParts]);

  await recordInviteRateLimitEvent({ scope, keyHash, windowSeconds });
  const count = await countInviteRateLimitEvents({ scope, keyHash, windowSeconds });
  if (count > limit) {
    return { allowed: false, retryAfter: windowSeconds, message: inviteRateLimitMessage(windowSeconds) };
  }
  return { allowed: true };
}

export async function checkInviteCreateRateLimit({
  headers,
  projectId,
  userId,
}: {
  headers: HeaderReader;
  projectId: string;
  userId: string;
}) {
  return checkInviteKeyRateLimit({
    headers,
    keyParts: [userId, projectId],
    scope: "collaboration_invite_create",
    limit: 20,
    windowSeconds: 60 * 60,
  });
}

export async function checkInviteResendRateLimit({
  headers,
  invitationId,
  userId,
}: {
  headers: HeaderReader;
  invitationId: string;
  userId: string;
}) {
  return checkInviteKeyRateLimit({
    headers,
    keyParts: [userId, invitationId],
    scope: "collaboration_invite_resend",
    limit: 5,
    windowSeconds: 60 * 60,
  });
}

export async function checkInviteResolutionRateLimit({
  headers,
  rawToken,
}: {
  headers: HeaderReader;
  rawToken: string;
}) {
  return checkInviteRateLimit({ headers, rawToken, scope: "collaboration_invite_resolve", limit: 30 });
}

export async function checkInviteContinueRateLimit({
  rawToken,
  request,
}: {
  rawToken: string;
  request: Request;
}) {
  return checkInviteRateLimit({ headers: request.headers, rawToken, scope: "collaboration_invite_continue", limit: 10 });
}

export async function checkInviteAcceptRateLimit({
  rawToken,
  request,
  userId,
}: {
  rawToken: string;
  request: Request;
  userId?: string | null;
}) {
  return checkInviteRateLimit({
    headers: request.headers,
    rawToken,
    scope: "collaboration_invite_accept",
    limit: 5,
    userId,
  });
}

/**
 * The post-auth bridge retains only the already-peppered token hash in its
 * signed cookie, so it cannot re-derive the raw-token rate-limit key.
 */
export async function checkInviteAcceptTokenHashRateLimit({
  invitationTokenHash,
  request,
  userId,
}: {
  invitationTokenHash: string;
  request: Request;
  userId?: string | null;
}) {
  const config = readInviteEntryConfig();
  if (!config.enabled) return { allowed: true } as const;

  return checkInviteTokenHashRateLimit({
    headers: request.headers,
    tokenHash: invitationTokenHash,
    scope: "collaboration_invite_accept",
    limit: 5,
    userId,
  });
}
