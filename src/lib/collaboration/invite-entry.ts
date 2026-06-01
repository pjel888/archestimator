import "server-only";

import { createHash, randomBytes } from "node:crypto";
import { createClient } from "@supabase/supabase-js";

import type { Database, Json } from "@/lib/supabase/types";

export const PROJECT_INVITE_ENTRY_FLAG = "PROJECT_INVITE_ENTRY_ENABLED";
export const INVITE_TOKEN_PEPPER_ENV = "ARCHESTIMATOR_INVITE_TOKEN_PEPPER";
export const INVITE_TOKEN_HASH_VERSION = "v1";
export const INVITE_TOKEN_BYTE_LENGTH = 32;
export const INVITE_TOKEN_PEPPER_PATTERN = /^[a-f0-9]{64}$/i;

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

function createInviteRateLimitServiceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (!url || !serviceRoleKey) {
    throw new Error("Invite rate limiting requires NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY on the server.");
  }

  return createClient<Database>(url, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
    global: {
      headers: {
        "X-Client-Info": "archestimator-invite-rate-limit",
      },
    },
  });
}

function getClientIp(headers: HeaderReader) {
  const forwardedFor = headers.get("x-forwarded-for");
  if (forwardedFor) return forwardedFor.split(",")[0].trim();
  return headers.get("x-real-ip") || headers.get("cf-connecting-ip") || "unknown";
}

function hashRateLimitKey(scope: InviteRateLimitScope, parts: string[]) {
  return createHash("sha256")
    .update([scope, ...parts.map((part) => part.trim() || "-")].join("\u001f"))
    .digest("base64url");
}

function hashIp(headers: HeaderReader) {
  return createHash("sha256").update(getClientIp(headers)).digest("base64url");
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
  const supabase = createInviteRateLimitServiceClient();
  const { error: cleanupError } = await supabase
    .from("security_rate_limit_events")
    .delete()
    .lt("expires_at", new Date().toISOString());
  if (cleanupError) throw cleanupError;

  const { error } = await supabase.from("security_rate_limit_events").insert({
    scope,
    key_hash: keyHash,
    metadata_json: { route: scope } as Json,
    expires_at: new Date(Date.now() + windowSeconds * 1000).toISOString(),
  });
  if (error) throw error;
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
  const supabase = createInviteRateLimitServiceClient();
  const { count, error } = await supabase
    .from("security_rate_limit_events")
    .select("id", { count: "exact", head: true })
    .eq("scope", scope)
    .eq("key_hash", keyHash)
    .gte("occurred_at", new Date(Date.now() - windowSeconds * 1000).toISOString());
  if (error) throw error;
  return count ?? 0;
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
