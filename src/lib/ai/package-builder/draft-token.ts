import { createHmac, timingSafeEqual } from "node:crypto";

import type { AiRequestUserContext } from "@/lib/ai/auth";
import type { PackageBuilderDraft } from "@/lib/ai/package-builder/schemas";

const DRAFT_TOKEN_VERSION = 1;
const DEFAULT_TOKEN_TTL_MS = 30 * 60 * 1000;

type PackageDraftTokenPayload = {
  version: typeof DRAFT_TOKEN_VERSION;
  draftId: string;
  draftHash: string;
  userId: string;
  workspaceId: string | null;
  provider: string;
  model: string;
  expiresAt: string;
};

function getDraftSigningSecret() {
  const secret = process.env.AI_PACKAGE_BUILDER_DRAFT_SIGNING_SECRET?.trim();
  if (secret) return secret;
  if (process.env.NODE_ENV !== "production") return "archestimator-local-package-builder-draft-token";
  throw new Error("AI package-builder draft signing secret is not configured.");
}

function base64urlEncode(value: string) {
  return Buffer.from(value, "utf8").toString("base64url");
}

function base64urlDecode(value: string) {
  return Buffer.from(value, "base64url").toString("utf8");
}

function signPayload(encodedPayload: string) {
  return createHmac("sha256", getDraftSigningSecret()).update(encodedPayload).digest("base64url");
}

function parsePayload(value: string): PackageDraftTokenPayload {
  const parsed = JSON.parse(value) as Partial<PackageDraftTokenPayload>;
  if (
    parsed.version !== DRAFT_TOKEN_VERSION
    || typeof parsed.draftId !== "string"
    || typeof parsed.draftHash !== "string"
    || typeof parsed.userId !== "string"
    || !(typeof parsed.workspaceId === "string" || parsed.workspaceId === null)
    || typeof parsed.provider !== "string"
    || typeof parsed.model !== "string"
    || typeof parsed.expiresAt !== "string"
  ) {
    throw new Error("Draft token payload is invalid.");
  }
  return parsed as PackageDraftTokenPayload;
}

export function createPackageDraftToken({
  draft,
  draftHash,
  userContext,
  provider,
  model,
  ttlMs = DEFAULT_TOKEN_TTL_MS,
}: {
  draft: PackageBuilderDraft;
  draftHash: string;
  userContext: AiRequestUserContext;
  provider: string;
  model: string;
  ttlMs?: number;
}) {
  const payload: PackageDraftTokenPayload = {
    version: DRAFT_TOKEN_VERSION,
    draftId: draft.draftId,
    draftHash,
    userId: userContext.userId,
    workspaceId: userContext.workspaceId ?? null,
    provider,
    model,
    expiresAt: new Date(Date.now() + ttlMs).toISOString(),
  };
  const encodedPayload = base64urlEncode(JSON.stringify(payload));
  return `${encodedPayload}.${signPayload(encodedPayload)}`;
}

export function verifyPackageDraftToken({
  draftToken,
  draft,
  draftHash,
  userContext,
}: {
  draftToken: string;
  draft: PackageBuilderDraft;
  draftHash: string;
  userContext: AiRequestUserContext;
}) {
  const [encodedPayload, signature] = draftToken.split(".");
  if (!encodedPayload || !signature) throw new Error("Package Apply requires a server-issued draft token.");

  const expectedSignature = signPayload(encodedPayload);
  const signatureBuffer = Buffer.from(signature, "base64url");
  const expectedBuffer = Buffer.from(expectedSignature, "base64url");
  if (signatureBuffer.length !== expectedBuffer.length || !timingSafeEqual(signatureBuffer, expectedBuffer)) {
    throw new Error("Package draft token is invalid.");
  }

  const payload = parsePayload(base64urlDecode(encodedPayload));
  if (Date.parse(payload.expiresAt) <= Date.now()) throw new Error("Package draft token expired.");
  if (payload.draftId !== draft.draftId || payload.draftHash !== draftHash) throw new Error("Package draft token does not match this draft.");
  if (payload.userId !== userContext.userId || payload.workspaceId !== (userContext.workspaceId ?? null)) {
    throw new Error("Package draft token does not belong to this user workspace.");
  }

  return payload;
}
