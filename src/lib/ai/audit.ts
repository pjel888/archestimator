import { createHash, randomUUID } from "node:crypto";

import { createClient } from "@supabase/supabase-js";

import type { AiRequestUserContext } from "@/lib/ai/auth";
import type { DeepSeekAskResult } from "@/lib/ai/deepseek";
import type { Database, Json, TablesInsert } from "@/lib/supabase/types";

type AiAskAuditStatus = "started" | "completed" | "failed";

export type AiAskDataAccessAuditInput = {
  eventName: string;
  sourceTables: string[];
  filter?: unknown;
  rowCount: number;
  safeSummary: string;
  blockedAttempt?: boolean;
  blockedReason?: string;
  targetProjectId?: string | null;
  targetEstimateId?: string | null;
  targetNodeId?: string | null;
  targetRowId?: string | null;
};

type AiAskAuditInput = {
  runId?: string;
  userContext: AiRequestUserContext;
  message: string;
  routeContext: Record<string, string | undefined>;
  status: AiAskAuditStatus;
  provider: "deepseek";
  model?: string;
  usage?: DeepSeekAskResult["usage"] | null;
  dataAccessEvents?: AiAskDataAccessAuditInput[];
  errorClass?: string;
  requestHost?: string | null;
  userAgent?: string | null;
};

export type AiAskAuditEvent = {
  actionRun: TablesInsert<"ai_action_runs">;
  dataAccessEvent: TablesInsert<"ai_data_access_events"> | null;
  dataAccessEvents: TablesInsert<"ai_data_access_events">[];
};

export type AiAuditRecorder = (input: AiAskAuditInput) => Promise<void>;

export function createAiAuditSupabaseClient() {
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
  const readAccessEvents = input.dataAccessEvents?.length
    ? input.dataAccessEvents
    : [
        {
          eventName: "ask_route_context",
          sourceTables: [],
          filter: input.routeContext,
          rowCount: 0,
          blockedAttempt: input.status === "failed",
          blockedReason: input.errorClass,
          safeSummary: "Ask request used bounded browser route context and no database read tools.",
        },
      ];
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
    provider_send_categories: input.dataAccessEvents?.length
      ? ["user_message", "bounded_route_context", "server_scoped_read_context"]
      : ["user_message", "bounded_route_context"],
    redaction_status: "metadata_only",
    usage: toJsonObject(input.usage ?? {}),
    error_class: input.errorClass,
    request_host: input.requestHost ?? null,
    user_agent_hash: input.userAgent ? hashAiAuditValue(input.userAgent) : null,
    metadata: {
      authMode: input.userContext.authMode,
      routeContextFields: Object.keys(input.routeContext).filter((key) => Boolean(input.routeContext[key])),
    },
    completed_at: input.status === "completed" || input.status === "failed" ? new Date().toISOString() : null,
  };

  const dataAccessEvents = readAccessEvents
    .map((event) => buildAiDataAccessEvent({
      runId,
      userContext: input.userContext,
      eventName: event.eventName,
      sourceTables: event.sourceTables,
      filter: event.filter,
      rowCount: event.rowCount,
      safeSummary: event.safeSummary,
      blockedAttempt: event.blockedAttempt,
      blockedReason: event.blockedReason,
      targetProjectId: event.targetProjectId,
      targetEstimateId: event.targetEstimateId,
      targetNodeId: event.targetNodeId,
      targetRowId: event.targetRowId,
    }))
    .filter((event): event is TablesInsert<"ai_data_access_events"> => Boolean(event));

  return { actionRun, dataAccessEvent: dataAccessEvents[0] ?? null, dataAccessEvents };
}

export async function recordAiAskAuditEvent(input: AiAskAuditInput) {
  const event = buildAiAskAuditEvent(input);
  if (!event) throw new Error("AI Ask audit requires a Supabase workspace audit context.");
  const supabase = createAiAuditSupabaseClient();
  if (!supabase) throw new Error("AI Ask audit client is not configured.");

  const { error: runError } = await supabase
    .from("ai_action_runs")
    .upsert(event.actionRun, { onConflict: "run_id" });
  if (runError) throw runError;

  if (event.dataAccessEvents.length && (input.status === "started" || input.errorClass === "read_context_failed")) {
    const { error: accessError } = await supabase.from("ai_data_access_events").insert(event.dataAccessEvents);
    if (accessError) throw accessError;
  }
}

export type AiPackageAuditRows = {
  actionRun: TablesInsert<"ai_action_runs">;
  toolCalls?: TablesInsert<"ai_tool_calls">[];
  dataAccessEvents?: TablesInsert<"ai_data_access_events">[];
};

export type AiPackageActionRunInput = {
  runId: string;
  userContext: AiRequestUserContext;
  mode: "draft" | "apply" | "eval";
  status: "started" | "completed" | "failed" | "blocked";
  provider: string;
  model?: string;
  message?: string;
  routeContext?: Record<string, unknown>;
  providerSendCategories: string[];
  usage?: Json;
  errorClass?: string;
  blockedReason?: string;
  requestHost?: string | null;
  userAgent?: string | null;
  metadata?: Record<string, Json>;
};

export function buildAiPackageActionRun(input: AiPackageActionRunInput): TablesInsert<"ai_action_runs"> | null {
  if (input.userContext.authMode !== "supabase" || !input.userContext.workspaceId) return null;

  return {
    run_id: input.runId,
    workspace_id: input.userContext.workspaceId,
    actor_user_id: input.userContext.userId,
    mode: input.mode,
    status: input.status,
    provider: input.provider,
    model: input.model ?? "",
    request_message_hash: input.message ? hashAiAuditValue(input.message) : null,
    route_context_hash: input.routeContext ? hashAiAuditValue(input.routeContext) : null,
    provider_send_categories: input.providerSendCategories,
    redaction_status: "metadata_only",
    usage: input.usage ?? {},
    error_class: input.errorClass,
    blocked_reason: input.blockedReason,
    request_host: input.requestHost ?? null,
    user_agent_hash: input.userAgent ? hashAiAuditValue(input.userAgent) : null,
    metadata: input.metadata ?? {},
    completed_at: input.status === "completed" || input.status === "failed" || input.status === "blocked" ? new Date().toISOString() : null,
  };
}

export function buildAiPackageToolCall(input: {
  runId: string;
  userContext: AiRequestUserContext;
  mode: "draft" | "apply" | "eval";
  toolName: string;
  status: "started" | "completed" | "failed" | "blocked";
  args?: unknown;
  result?: unknown;
  validationErrors?: string[];
  safeSummary: string;
  targetProjectId?: string | null;
  targetEstimateId?: string | null;
  targetNodeId?: string | null;
  targetRowId?: string | null;
}): TablesInsert<"ai_tool_calls"> | null {
  if (input.userContext.authMode !== "supabase" || !input.userContext.workspaceId) return null;

  return {
    run_id: input.runId,
    workspace_id: input.userContext.workspaceId,
    actor_user_id: input.userContext.userId,
    tool_name: input.toolName,
    mode: input.mode,
    status: input.status,
    target_project_id: input.targetProjectId ?? null,
    target_estimate_id: input.targetEstimateId ?? null,
    target_node_id: input.targetNodeId ?? null,
    target_row_id: input.targetRowId ?? null,
    args_hash: input.args === undefined ? null : hashAiAuditValue(input.args),
    result_hash: input.result === undefined ? null : hashAiAuditValue(input.result),
    validation_errors: input.validationErrors ?? [],
    safe_summary: input.safeSummary,
    completed_at: input.status === "completed" || input.status === "failed" || input.status === "blocked" ? new Date().toISOString() : null,
  };
}

export function buildAiDataAccessEvent(input: {
  runId: string;
  userContext: AiRequestUserContext;
  eventName: string;
  sourceTables: string[];
  filter?: unknown;
  rowCount: number;
  safeSummary: string;
  blockedAttempt?: boolean;
  blockedReason?: string;
  targetProjectId?: string | null;
  targetEstimateId?: string | null;
  targetNodeId?: string | null;
  targetRowId?: string | null;
}): TablesInsert<"ai_data_access_events"> | null {
  if (input.userContext.authMode !== "supabase" || !input.userContext.workspaceId) return null;

  return {
    run_id: input.runId,
    workspace_id: input.userContext.workspaceId,
    actor_user_id: input.userContext.userId,
    event_name: input.eventName,
    source_tables: input.sourceTables,
    target_project_id: input.targetProjectId ?? null,
    target_estimate_id: input.targetEstimateId ?? null,
    target_node_id: input.targetNodeId ?? null,
    target_row_id: input.targetRowId ?? null,
    filter_hash: input.filter === undefined ? null : hashAiAuditValue(input.filter),
    row_count: input.rowCount,
    blocked_attempt: input.blockedAttempt ?? false,
    blocked_reason: input.blockedReason,
    redaction_status: "metadata_only",
    safe_summary: input.safeSummary,
  };
}

export function buildAiPackageDataAccessEvent(input: {
  runId: string;
  userContext: AiRequestUserContext;
  eventName: string;
  sourceTables: string[];
  filter?: unknown;
  rowCount: number;
  safeSummary: string;
  blockedAttempt?: boolean;
  blockedReason?: string;
  targetProjectId?: string | null;
  targetEstimateId?: string | null;
  targetNodeId?: string | null;
  targetRowId?: string | null;
}): TablesInsert<"ai_data_access_events"> | null {
  return buildAiDataAccessEvent(input);
}

export async function recordAiPackageAuditRows(input: AiPackageAuditRows | null) {
  if (!input) return;
  const supabase = createAiAuditSupabaseClient();
  if (!supabase) return;

  try {
    const { error: runError } = await supabase.from("ai_action_runs").insert(input.actionRun);
    if (runError) throw runError;

    if (input.toolCalls?.length) {
      const { error: toolError } = await supabase.from("ai_tool_calls").insert(input.toolCalls);
      if (toolError) throw toolError;
    }

    if (input.dataAccessEvents?.length) {
      const { error: accessError } = await supabase.from("ai_data_access_events").insert(input.dataAccessEvents);
      if (accessError) throw accessError;
    }
  } catch {
    // AI audit writes are metadata-only and best effort until a dedicated
    // package-builder RPC owns transactional audit persistence.
  }
}

export async function recordAiPackageApplyAuthorization(actionRun: TablesInsert<"ai_action_runs"> | null) {
  if (!actionRun) throw new Error("Package Apply authorization requires a Supabase workspace audit context.");
  const supabase = createAiAuditSupabaseClient();
  if (!supabase) throw new Error("AI package Apply authorization audit client is not configured.");

  const { error } = await supabase.from("ai_action_runs").insert(actionRun);
  if (error) throw error;
}
