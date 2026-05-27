import "server-only";

import { createHmac, timingSafeEqual } from "node:crypto";

import {
  hashInviteToken,
  readInviteEntryConfig,
} from "@/lib/collaboration/invite-entry";

export const PENDING_INVITE_COOKIE = "archestimator_pending_invite";
export const PENDING_INVITE_MAX_AGE_SECONDS = 30 * 60;

type PendingInviteEnv = Partial<
  Pick<NodeJS.ProcessEnv, "PROJECT_INVITE_ENTRY_ENABLED" | "ARCHESTIMATOR_INVITE_TOKEN_PEPPER">
> &
  Record<string, string | undefined>;

export type PendingInviteBridge = {
  version: 1;
  tokenHash: string;
  createdAt: number;
};

function encodePayload(payload: PendingInviteBridge) {
  return Buffer.from(JSON.stringify(payload), "utf8").toString("base64url");
}

function signPayload(payload: string, pepper: string) {
  return createHmac("sha256", pepper).update(payload).digest("base64url");
}

function signaturesMatch(left: string, right: string) {
  const leftBuffer = Buffer.from(left);
  const rightBuffer = Buffer.from(right);
  return leftBuffer.length === rightBuffer.length && timingSafeEqual(leftBuffer, rightBuffer);
}

export function createPendingInviteBridge(rawToken: string, env: PendingInviteEnv = process.env) {
  const config = readInviteEntryConfig(env);
  if (!config.enabled) throw new Error("Project invite entry is disabled.");

  const payload: PendingInviteBridge = {
    version: 1,
    tokenHash: hashInviteToken(rawToken, config.pepper),
    createdAt: Date.now(),
  };
  const encodedPayload = encodePayload(payload);
  const signature = signPayload(encodedPayload, config.pepper);

  return {
    cookieValue: `v1.${encodedPayload}.${signature}`,
    tokenHash: payload.tokenHash,
  };
}

export function readPendingInviteBridge(value: string | null | undefined, env: PendingInviteEnv = process.env): PendingInviteBridge | null {
  const config = readInviteEntryConfig(env);
  if (!config.enabled || !value) return null;

  const [version, encodedPayload, signature] = value.split(".");
  if (version !== "v1" || !encodedPayload || !signature) return null;

  const expectedSignature = signPayload(encodedPayload, config.pepper);
  if (!signaturesMatch(signature, expectedSignature)) return null;

  try {
    const payload = JSON.parse(Buffer.from(encodedPayload, "base64url").toString("utf8")) as PendingInviteBridge;
    if (payload.version !== 1 || !payload.tokenHash || typeof payload.createdAt !== "number") return null;
    if (Date.now() - payload.createdAt > PENDING_INVITE_MAX_AGE_SECONDS * 1000) return null;
    return payload;
  } catch {
    return null;
  }
}
