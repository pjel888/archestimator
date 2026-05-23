import { createHash, randomUUID } from "node:crypto";

import { createClient } from "@supabase/supabase-js";

import type { AiRequestUserContext } from "@/lib/ai/auth";
import type { DeepSeekAskResult } from "@/lib/ai/deepseek";
import type { Database, Json, TablesInsert } from "@/lib/supabase/types";

type AiAskAuditStatus = "completed" | "failed";

type AiAskAuditInput = {
  runId?: string;
  userContext: AiRequestUserContext;
  message: string;
  routeContext: Record<string, string | undefined>;
  status: AiAskAuditStatus;
  provider: "deepseek";
  model?: string;
  usage?: DeepSeekAskResult["usage"] | null;
  errorClass?: string;
  requestHost?: string | null;
  userAgent?: string | null;
};

export type AiAskAuditEvent = {
  actionRun: TablesInsert<"ai_action_runs">;
  dataAccessEvent: TablesInsert<"ai_data_access_events">;
};

export type AiAuditRecorder = (input: AiAskAuditInput) => Promise<void>;

function createAiAuditSupabaseClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (!url || !serviceRoleKey) return null;

  return createClient<Database>(url, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
    global: {
      headers: {
        "X-Client-Info": "archestimator-ai-audit",
      },
    },
  });
}

function stableJson(value: unknown) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return JSON.stringify(value);
  const record = value as Record<string, unknown>;
  return JSON.stringify(
    Object.keys(record)
      .sort()
      .reduce<Record<string, unknown>>((next, key) => {
        next[key] = record[key];
        return next;
      }, {}),
  );
}

export function hashAiAuditValue(value: unknown) {
  return `sha256:${createHash("sha256").update(typeof value === "string" ? value : stableJson(value)).digest("hex")}`;
}

function toJsonObject(value: unknown): Json {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  return value as Json;
}

export function buildAiAskAuditEvent(input: AiAskAuditInput): AiAskAuditEvent | null {
  if (input.userContext.authMode !== "supabase" || !input.userContext.workspaceId) return null;

  const runId = input.runId ?? randomUUID();
  const actionRun: TablesInsert<"ai_action_runs"> = {
    run_id: runId,
    workspace_id: input.userContext.workspaceId,
    actor_user_id: input.userContext.userId,
    mode: "ask",
    status: input.status,
    provider: input.provider,
    model: input.model ?? "",
    request_message_hash: hashAiAuditValue(input.message),
    route_context_hash: hashAiAuditValue(input.routeContext),
    provider_send_categories: ["user_message", "bounded_route_context"],
    redaction_status: "metadata_only",
    usage: toJsonObject(input.usage ?? {}),
    error_class: input.errorClass,
    request_host: input.requestHost ?? null,
    user_agent_hash: input.userAgent ? hashAiAuditValue(input.userAgent) : null,
    metadata: {
      authMode: input.userContext.authMode,
      routeContextFields: Object.keys(input.routeContext).filter((key) => Boolean(input.routeContext[key])),
    },
    completed_at: new Date().toISOString(),
  };

  const dataAccessEvent: TablesInsert<"ai_data_access_events"> = {
    run_id: runId,
    workspace_id: input.userContext.workspaceId,
    actor_user_id: input.userContext.userId,
    event_name: "ask_route_context",
    source_tables: [],
    filter_hash: hashAiAuditValue(input.routeContext),
    row_count: 0,
    blocked_attempt: input.status === "failed",
    blocked_reason: input.errorClass,
    redaction_status: "metadata_only",
    safe_summary: "Ask-only request used bounded browser route context and no database read tools.",
  };

  return { actionRun, dataAccessEvent };
}

export async function recordAiAskAuditEvent(input: AiAskAuditInput) {
  const event = buildAiAskAuditEvent(input);
  if (!event) return;
  const supabase = createAiAuditSupabaseClient();
  if (!supabase) return;

  try {
    const { error: runError } = await supabase.from("ai_action_runs").insert(event.actionRun);
    if (runError) throw runError;

    const { error: accessError } = await supabase.from("ai_data_access_events").insert(event.dataAccessEvent);
    if (accessError) throw accessError;
  } catch {
    // Audit writes are best effort for the current Ask-only slice. The route
    // must never leak provider or database errors to the chat response.
  }
}
