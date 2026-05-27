import "server-only";

import { createHash, randomBytes } from "node:crypto";

export const PROJECT_INVITE_ENTRY_FLAG = "PROJECT_INVITE_ENTRY_ENABLED";
export const INVITE_TOKEN_PEPPER_ENV = "ARCHESTIMATOR_INVITE_TOKEN_PEPPER";
export const INVITE_TOKEN_HASH_VERSION = "v1";
export const INVITE_TOKEN_BYTE_LENGTH = 32;

type InviteEntryEnv = Partial<
  Pick<NodeJS.ProcessEnv, "PROJECT_INVITE_ENTRY_ENABLED" | "ARCHESTIMATOR_INVITE_TOKEN_PEPPER">
> &
  Record<string, string | undefined>;

type InviteEntryConfig =
  | { enabled: true; pepper: string }
  | { enabled: false; reason: "disabled" | "missing-pepper" };

export function readInviteEntryConfig(env: InviteEntryEnv = process.env): InviteEntryConfig {
  if (env.PROJECT_INVITE_ENTRY_ENABLED !== "true") {
    return { enabled: false, reason: "disabled" };
  }

  const pepper = env.ARCHESTIMATOR_INVITE_TOKEN_PEPPER?.trim();
  if (!pepper) return { enabled: false, reason: "missing-pepper" };

  return { enabled: true, pepper };
}

export function isProjectInviteEntryEnabled(env: InviteEntryEnv = process.env) {
  return readInviteEntryConfig(env).enabled;
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
  if (!config.enabled) throw new Error("Project invite entry is disabled.");

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
