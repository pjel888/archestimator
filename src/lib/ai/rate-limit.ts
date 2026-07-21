import { createHash } from "node:crypto";

import {
  countSecurityRateLimitEventsInD1,
  deleteExpiredSecurityRateLimitEventsInD1,
  getAiAuditD1Database,
  recordSecurityRateLimitEventInD1,
} from "@/lib/ai/audit-d1-store";
import { isProviderBackedAiUserContext, type AiRequestUserContext } from "@/lib/ai/auth";
import { getClientIp } from "@/lib/publication/security";

export type AiAskQuotaResult =
  | { allowed: true }
  | { allowed: false; message: string; retryAfter: number };

type AiAskQuotaWindow = {
  limit: number;
  seconds: number;
};

const AI_ASK_RATE_LIMIT_SCOPE = "ai_ask";
const AI_ASK_QUOTA_WINDOWS: AiAskQuotaWindow[] = [
  { seconds: 60, limit: 10 },
  { seconds: 60 * 60, limit: 60 },
];

function hashAiAskQuotaKey(parts: Array<string | null | undefined>) {
  return createHash("sha256")
    .update([AI_ASK_RATE_LIMIT_SCOPE, ...parts.map((part) => part?.trim() || "-")].join("\u001f"))
    .digest("base64url");
}

function quotaMessage(retryAfter: number) {
  return `AI quota exceeded. Please wait ${retryAfter} seconds.`;
}

export async function checkAiAskQuota({
  request,
  userContext,
}: {
  request: Request;
  userContext: AiRequestUserContext;
}): Promise<AiAskQuotaResult> {
  if (!isProviderBackedAiUserContext(userContext)) {
    throw new Error("Something went wrong. Try again in a moment.");
  }

  const db = await getAiAuditD1Database();
  if (!db) throw new Error("Something went wrong. Try again in a moment.");

  const now = Date.now();
  const occurredAt = new Date(now).toISOString();
  const maxWindowSeconds = Math.max(...AI_ASK_QUOTA_WINDOWS.map((window) => window.seconds));
  const keyHash = hashAiAskQuotaKey([userContext.workspaceId, userContext.userId, getClientIp(request)]);

  await deleteExpiredSecurityRateLimitEventsInD1(db, occurredAt);
  await recordSecurityRateLimitEventInD1(db, {
    scope: AI_ASK_RATE_LIMIT_SCOPE,
    keyHash,
    metadataJson: { route: "ai_ask" },
    occurredAt,
    expiresAt: new Date(now + maxWindowSeconds * 1000).toISOString(),
  });

  for (const window of AI_ASK_QUOTA_WINDOWS) {
    const since = new Date(now - window.seconds * 1000).toISOString();
    const count = await countSecurityRateLimitEventsInD1(db, {
      scope: AI_ASK_RATE_LIMIT_SCOPE,
      keyHash,
      since,
    });
    if (count > window.limit) {
      return { allowed: false, retryAfter: window.seconds, message: quotaMessage(window.seconds) };
    }
  }

  return { allowed: true };
}
