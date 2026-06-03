import { createHash } from "node:crypto";

import { createAiAuditSupabaseClient } from "@/lib/ai/audit";
import type { AiRequestUserContext } from "@/lib/ai/auth";
import { getClientIp } from "@/lib/publication/security";
import type { Json } from "@/lib/supabase/types";

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
  if (userContext.authMode !== "supabase" || !userContext.workspaceId) {
    throw new Error("AI Ask quota requires an authenticated Supabase workspace user.");
  }

  const supabase = createAiAuditSupabaseClient();
  if (!supabase) throw new Error("AI Ask quota requires Supabase audit storage.");

  const now = Date.now();
  const maxWindowSeconds = Math.max(...AI_ASK_QUOTA_WINDOWS.map((window) => window.seconds));
  const keyHash = hashAiAskQuotaKey([userContext.workspaceId, userContext.userId, getClientIp(request)]);

  const { error: cleanupError } = await supabase
    .from("security_rate_limit_events")
    .delete()
    .lt("expires_at", new Date(now).toISOString());
  if (cleanupError) throw cleanupError;

  const { error: insertError } = await supabase.from("security_rate_limit_events").insert({
    scope: AI_ASK_RATE_LIMIT_SCOPE,
    key_hash: keyHash,
    metadata_json: { route: "ai_ask" } satisfies Json,
    expires_at: new Date(now + maxWindowSeconds * 1000).toISOString(),
  });
  if (insertError) throw insertError;

  for (const window of AI_ASK_QUOTA_WINDOWS) {
    const since = new Date(now - window.seconds * 1000).toISOString();
    const { count, error } = await supabase
      .from("security_rate_limit_events")
      .select("id", { count: "exact", head: true })
      .eq("scope", AI_ASK_RATE_LIMIT_SCOPE)
      .eq("key_hash", keyHash)
      .gte("occurred_at", since);
    if (error) throw error;
    if ((count ?? 0) > window.limit) {
      return { allowed: false, retryAfter: window.seconds, message: quotaMessage(window.seconds) };
    }
  }

  return { allowed: true };
}
