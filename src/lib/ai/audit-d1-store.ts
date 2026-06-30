import "server-only";

import { randomUUID } from "node:crypto";

import { getCloudflareD1Database, type D1DatabaseLike } from "@/lib/cloudflare/d1";

export type JsonValue =
  | null
  | boolean
  | number
  | string
  | JsonValue[]
  | { [key: string]: JsonValue };

export type JsonObject = { [key: string]: JsonValue };

type AiInteractionMode = "ask" | "draft" | "apply" | "eval";
type AiRunStatus = "started" | "completed" | "failed" | "blocked";
type AiRedactionStatus = "metadata_only" | "redacted" | "synthetic" | "blocked";

export type AiActionRunAuditRow = {
  actor_user_id: string;
  blocked_reason?: string | null;
  completed_at?: string | null;
  created_at?: string;
  error_class?: string | null;
  id?: string;
  metadata?: JsonObject;
  mode: AiInteractionMode;
  model?: string;
  provider?: string;
  provider_response_id?: string | null;
  provider_send_categories?: string[];
  redaction_status?: AiRedactionStatus;
  request_host?: string | null;
  request_message_hash?: string | null;
  route_context_hash?: string | null;
  run_id?: string;
  started_at?: string;
  status?: AiRunStatus;
  usage?: JsonObject;
  user_agent_hash?: string | null;
  workspace_id: string;
};

export type AiToolCallAuditRow = {
  actor_user_id: string;
  args_hash?: string | null;
  completed_at?: string | null;
  created_at?: string;
  id?: string;
  mode: AiInteractionMode;
  result_hash?: string | null;
  run_id: string;
  safe_summary?: string;
  started_at?: string;
  status?: AiRunStatus;
  target_estimate_id?: string | null;
  target_node_id?: string | null;
  target_project_id?: string | null;
  target_row_id?: string | null;
  tool_name: string;
  validation_errors?: JsonValue;
  workspace_id: string;
};

export type AiDataAccessAuditRow = {
  actor_user_id: string;
  blocked_attempt?: boolean;
  blocked_reason?: string | null;
  created_at?: string;
  event_name: string;
  filter_hash?: string | null;
  id?: string;
  redaction_status?: AiRedactionStatus;
  row_count?: number;
  run_id: string;
  safe_summary?: string;
  source_tables?: string[];
  target_estimate_id?: string | null;
  target_node_id?: string | null;
  target_project_id?: string | null;
  target_row_id?: string | null;
  tool_call_id?: string | null;
  workspace_id: string;
};

export type AiPackageAuditD1Rows = {
  actionRun: AiActionRunAuditRow;
  toolCalls?: AiToolCallAuditRow[];
  dataAccessEvents?: AiDataAccessAuditRow[];
};

export type SecurityRateLimitEventD1Input = {
  expiresAt: string;
  keyHash: string;
  metadataJson?: JsonObject;
  occurredAt?: string;
  scope: string;
};

function nowIso() {
  return new Date().toISOString();
}

function jsonObjectText(value: JsonObject | undefined, fallback: JsonObject = {}) {
  return JSON.stringify(value ?? fallback);
}

function jsonArrayText(value: string[] | undefined) {
  return JSON.stringify(value ?? []);
}

function jsonValueArrayText(value: JsonValue | undefined) {
  return JSON.stringify(Array.isArray(value) ? value : []);
}

export async function getAiAuditD1Database() {
  return getCloudflareD1Database();
}

export async function upsertAiActionRunInD1(db: D1DatabaseLike, row: AiActionRunAuditRow) {
  const timestamp = nowIso();
  const id = row.id ?? randomUUID();
  const runId = row.run_id ?? randomUUID();
  const startedAt = row.started_at ?? timestamp;
  const createdAt = row.created_at ?? timestamp;

  return db
    .prepare(
      `
        INSERT INTO ai_action_runs (
          id,
          run_id,
          workspace_id,
          actor_user_id,
          mode,
          status,
          provider,
          model,
          provider_response_id,
          request_message_hash,
          route_context_hash,
          provider_send_categories_json,
          redaction_status,
          usage_json,
          error_class,
          blocked_reason,
          request_host,
          user_agent_hash,
          metadata_json,
          started_at,
          completed_at,
          created_at
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(run_id) DO UPDATE SET
          workspace_id = excluded.workspace_id,
          actor_user_id = excluded.actor_user_id,
          mode = excluded.mode,
          status = excluded.status,
          provider = excluded.provider,
          model = excluded.model,
          provider_response_id = excluded.provider_response_id,
          request_message_hash = excluded.request_message_hash,
          route_context_hash = excluded.route_context_hash,
          provider_send_categories_json = excluded.provider_send_categories_json,
          redaction_status = excluded.redaction_status,
          usage_json = excluded.usage_json,
          error_class = excluded.error_class,
          blocked_reason = excluded.blocked_reason,
          request_host = excluded.request_host,
          user_agent_hash = excluded.user_agent_hash,
          metadata_json = excluded.metadata_json,
          started_at = excluded.started_at,
          completed_at = excluded.completed_at
      `,
    )
    .bind(
      id,
      runId,
      row.workspace_id,
      row.actor_user_id,
      row.mode,
      row.status ?? "started",
      row.provider ?? "",
      row.model ?? "",
      row.provider_response_id ?? null,
      row.request_message_hash ?? null,
      row.route_context_hash ?? null,
      jsonArrayText(row.provider_send_categories),
      row.redaction_status ?? "metadata_only",
      jsonObjectText(row.usage),
      row.error_class ?? null,
      row.blocked_reason ?? null,
      row.request_host ?? null,
      row.user_agent_hash ?? null,
      jsonObjectText(row.metadata),
      startedAt,
      row.completed_at ?? null,
      createdAt,
    )
    .run();
}

export async function insertAiToolCallsInD1(db: D1DatabaseLike, rows: AiToolCallAuditRow[]) {
  for (const row of rows) {
    const timestamp = nowIso();
    await db
      .prepare(
        `
          INSERT INTO ai_tool_calls (
            id,
            run_id,
            workspace_id,
            actor_user_id,
            tool_name,
            mode,
            status,
            target_project_id,
            target_estimate_id,
            target_node_id,
            target_row_id,
            args_hash,
            result_hash,
            validation_errors_json,
            safe_summary,
            started_at,
            completed_at,
            created_at
          )
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          ON CONFLICT(id) DO NOTHING
        `,
      )
      .bind(
        row.id ?? randomUUID(),
        row.run_id,
        row.workspace_id,
        row.actor_user_id,
        row.tool_name,
        row.mode,
        row.status ?? "started",
        row.target_project_id ?? null,
        row.target_estimate_id ?? null,
        row.target_node_id ?? null,
        row.target_row_id ?? null,
        row.args_hash ?? null,
        row.result_hash ?? null,
        jsonValueArrayText(row.validation_errors),
        row.safe_summary ?? "",
        row.started_at ?? timestamp,
        row.completed_at ?? null,
        row.created_at ?? timestamp,
      )
      .run();
  }
}

export async function insertAiDataAccessEventsInD1(db: D1DatabaseLike, rows: AiDataAccessAuditRow[]) {
  for (const row of rows) {
    await db
      .prepare(
        `
          INSERT INTO ai_data_access_events (
            id,
            run_id,
            tool_call_id,
            workspace_id,
            actor_user_id,
            event_name,
            source_tables_json,
            target_project_id,
            target_estimate_id,
            target_node_id,
            target_row_id,
            filter_hash,
            row_count,
            blocked_attempt,
            blocked_reason,
            redaction_status,
            safe_summary,
            created_at
          )
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          ON CONFLICT(id) DO NOTHING
        `,
      )
      .bind(
        row.id ?? randomUUID(),
        row.run_id,
        row.tool_call_id ?? null,
        row.workspace_id,
        row.actor_user_id,
        row.event_name,
        jsonArrayText(row.source_tables),
        row.target_project_id ?? null,
        row.target_estimate_id ?? null,
        row.target_node_id ?? null,
        row.target_row_id ?? null,
        row.filter_hash ?? null,
        row.row_count ?? 0,
        row.blocked_attempt ? 1 : 0,
        row.blocked_reason ?? null,
        row.redaction_status ?? "metadata_only",
        row.safe_summary ?? "",
        row.created_at ?? nowIso(),
      )
      .run();
  }
}

export async function recordAiAskAuditEventInD1(
  db: D1DatabaseLike,
  input: {
    actionRun: AiActionRunAuditRow;
    dataAccessEvents: AiDataAccessAuditRow[];
    recordDataAccessEvents: boolean;
  },
) {
  await upsertAiActionRunInD1(db, input.actionRun);
  if (input.recordDataAccessEvents && input.dataAccessEvents.length > 0) {
    await insertAiDataAccessEventsInD1(db, input.dataAccessEvents);
  }
}

export async function recordAiPackageAuditRowsInD1(db: D1DatabaseLike, input: AiPackageAuditD1Rows) {
  await upsertAiActionRunInD1(db, input.actionRun);
  if (input.toolCalls?.length) await insertAiToolCallsInD1(db, input.toolCalls);
  if (input.dataAccessEvents?.length) await insertAiDataAccessEventsInD1(db, input.dataAccessEvents);
}

export async function recordAiPackageApplyAuthorizationInD1(db: D1DatabaseLike, actionRun: AiActionRunAuditRow) {
  await upsertAiActionRunInD1(db, actionRun);
}

export async function deleteExpiredSecurityRateLimitEventsInD1(db: D1DatabaseLike, now: string) {
  return db
    .prepare("DELETE FROM security_rate_limit_events WHERE expires_at < ?")
    .bind(now)
    .run();
}

export async function recordSecurityRateLimitEventInD1(
  db: D1DatabaseLike,
  input: SecurityRateLimitEventD1Input,
) {
  return db
    .prepare(
      `
        INSERT INTO security_rate_limit_events (
          id,
          scope,
          key_hash,
          metadata_json,
          occurred_at,
          expires_at
        )
        VALUES (?, ?, ?, ?, ?, ?)
      `,
    )
    .bind(
      randomUUID(),
      input.scope,
      input.keyHash,
      jsonObjectText(input.metadataJson),
      input.occurredAt ?? nowIso(),
      input.expiresAt,
    )
    .run();
}

export async function countSecurityRateLimitEventsInD1(
  db: D1DatabaseLike,
  input: {
    keyHash: string;
    scope: string;
    since: string;
  },
) {
  const row = await db
    .prepare<{ count: number }>(
      `
        SELECT COUNT(*) AS count
        FROM security_rate_limit_events
        WHERE scope = ?
          AND key_hash = ?
          AND occurred_at >= ?
      `,
    )
    .bind(input.scope, input.keyHash, input.since)
    .first<{ count: number }>();

  return Number(row?.count ?? 0);
}
