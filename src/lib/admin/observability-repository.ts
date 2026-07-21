import "server-only";

import { getCloudflareD1Database, type D1DatabaseLike } from "@/lib/cloudflare/d1";
import { emitLogRecord } from "@/lib/observability/logger";

export type AdminObservabilityResult<T> = {
  data: T;
  error: string | null;
};

export type CronRunEventRow = {
  id: string;
  cron_name: string;
  started_at: string;
  finished_at: string | null;
  status: "running" | "ok" | "error" | "skipped";
  summary_json: string | null;
  error_class: string | null;
  created_at: string;
};

export type ClientErrorEventRow = {
  id: string;
  user_id: string | null;
  route: string | null;
  error_class: string;
  message_redacted: string;
  stack_hash: string | null;
  user_agent: string | null;
  created_at: string;
};

export type WebVitalEventRow = {
  id: string;
  user_id: string | null;
  route: string | null;
  metric_name: string;
  metric_value: number;
  rating: string | null;
  created_at: string;
};

export type OpsRunEventRow = {
  id: string;
  ops_name: string;
  status: "ok" | "error" | "skipped";
  summary_json: string | null;
  created_at: string;
};

async function resolveObservabilityDb(dbOverride?: D1DatabaseLike): Promise<D1DatabaseLike> {
  const db = dbOverride ?? (await getCloudflareD1Database());
  if (!db) throw new Error("Something went wrong. Try again in a moment.");
  return db;
}

function clampLimit(limit: number | undefined): number {
  return Math.max(1, Math.min(limit ?? 10, 50));
}

async function listRecentRows<T>(
  dbOverride: D1DatabaseLike | undefined,
  sql: string,
  limit: number | undefined,
  error: string,
): Promise<AdminObservabilityResult<T[]>> {
  try {
    const db = await resolveObservabilityDb(dbOverride);
    const rows = await db.prepare<T>(sql).bind(clampLimit(limit)).all<T>();
    return { data: rows.results ?? [], error: null };
  } catch (error_) {
    // Unlike other admin repositories which emitLogRecord on failure, this
    // previously swallowed errors silently. Log so D1 schema mismatches or
    // binding failures are diagnosable.
    emitLogRecord({
      level: "error",
      event: "admin_observability_read_failed",
      message: error,
      context: {
        error_name: error_ instanceof Error ? error_.name : "unknown",
      },
    });
    return { data: [], error };
  }
}

export function listRecentCronRunEvents(limit?: number, dbOverride?: D1DatabaseLike) {
  return listRecentRows<CronRunEventRow>(
    dbOverride,
    `
      SELECT id, cron_name, started_at, finished_at, status, summary_json, error_class, created_at
      FROM cron_run_events
      ORDER BY started_at DESC
      LIMIT ?
    `,
    limit,
    "Cron run events could not be read.",
  );
}

export function listRecentClientErrorEvents(limit?: number, dbOverride?: D1DatabaseLike) {
  return listRecentRows<ClientErrorEventRow>(
    dbOverride,
    `
      SELECT id, user_id, route, error_class, message_redacted, stack_hash, user_agent, created_at
      FROM client_error_events
      ORDER BY created_at DESC
      LIMIT ?
    `,
    limit,
    "Client error events could not be read.",
  );
}

export function listRecentWebVitalEvents(limit?: number, dbOverride?: D1DatabaseLike) {
  return listRecentRows<WebVitalEventRow>(
    dbOverride,
    `
      SELECT id, user_id, route, metric_name, metric_value, rating, created_at
      FROM web_vital_events
      ORDER BY created_at DESC
      LIMIT ?
    `,
    limit,
    "Web vital events could not be read.",
  );
}

export function listRecentOpsRunEvents(limit?: number, dbOverride?: D1DatabaseLike) {
  return listRecentRows<OpsRunEventRow>(
    dbOverride,
    `
      SELECT id, ops_name, status, summary_json, created_at
      FROM ops_run_events
      ORDER BY created_at DESC
      LIMIT ?
    `,
    limit,
    "Ops run events could not be read.",
  );
}

// --- Writers ---

function genId(): string {
  return crypto.randomUUID();
}

/**
 * Persists a client error event to D1. Called from the client-error API route.
 * Best-effort: failures are logged but do not block the response.
 */
export async function recordClientErrorEvent(input: {
  userId: string | null;
  route: string;
  errorClass: string;
  messageRedacted: string;
  stackHash: string | null;
  userAgent: string | null;
}): Promise<void> {
  try {
    const db = await getCloudflareD1Database();
    if (!db) return;
    await db
      .prepare(
        `
          INSERT INTO client_error_events (id, user_id, route, error_class, message_redacted, stack_hash, user_agent, created_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `,
      )
      .bind(
        genId(),
        input.userId,
        input.route.slice(0, 500),
        input.errorClass.slice(0, 200),
        input.messageRedacted.slice(0, 1000),
        input.stackHash?.slice(0, 128) ?? null,
        input.userAgent?.slice(0, 500) ?? null,
        new Date().toISOString(),
      )
      .run();
  } catch (error) {
    emitLogRecord({
      level: "warn",
      event: "admin_client_error_persist_failed",
      message: "Client error event could not be persisted to D1.",
      context: {
        error_name: error instanceof Error ? error.name : "unknown",
      },
    });
  }
}

/**
 * Persists a web vital event to D1. Called from the web-vitals POST route.
 * Best-effort: failures are logged but do not block the response.
 */
export async function recordWebVitalEvent(input: {
  userId: string | null;
  route: string;
  metricName: string;
  metricValue: number;
  rating: string;
}): Promise<void> {
  try {
    const db = await getCloudflareD1Database();
    if (!db) return;
    await db
      .prepare(
        `
          INSERT INTO web_vital_events (id, user_id, route, metric_name, metric_value, rating, created_at)
          VALUES (?, ?, ?, ?, ?, ?, ?)
        `,
      )
      .bind(
        genId(),
        input.userId,
        input.route.slice(0, 500),
        input.metricName.slice(0, 50),
        input.metricValue,
        input.rating.slice(0, 20),
        new Date().toISOString(),
      )
      .run();
  } catch (error) {
    emitLogRecord({
      level: "warn",
      event: "admin_web_vital_persist_failed",
      message: "Web vital event could not be persisted to D1.",
      context: {
        error_name: error instanceof Error ? error.name : "unknown",
      },
    });
  }
}

/**
 * Persists a cron run event to D1. Called from the worker cron handler.
 */
export async function recordCronRunEvent(input: {
  cronName: string;
  startedAt: string;
  finishedAt: string | null;
  status: "running" | "ok" | "error" | "skipped";
  summaryJson: string | null;
  errorClass: string | null;
}): Promise<void> {
  try {
    const db = await getCloudflareD1Database();
    if (!db) return;
    await db
      .prepare(
        `
          INSERT INTO cron_run_events (id, cron_name, started_at, finished_at, status, summary_json, error_class, created_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `,
      )
      .bind(
        genId(),
        input.cronName.slice(0, 128),
        input.startedAt,
        input.finishedAt,
        input.status,
        input.summaryJson,
        input.errorClass?.slice(0, 200) ?? null,
        new Date().toISOString(),
      )
      .run();
  } catch (error) {
    emitLogRecord({
      level: "warn",
      event: "admin_cron_run_persist_failed",
      message: "Cron run event could not be persisted to D1.",
      context: {
        error_name: error instanceof Error ? error.name : "unknown",
      },
    });
  }
}

/**
 * Persists an ops run event to D1. Called from ops scripts.
 */
export async function recordOpsRunEvent(input: {
  opsName: string;
  status: "ok" | "error" | "skipped";
  summaryJson: string | null;
}): Promise<void> {
  try {
    const db = await getCloudflareD1Database();
    if (!db) return;
    await db
      .prepare(
        `
          INSERT INTO ops_run_events (id, ops_name, status, summary_json, created_at)
          VALUES (?, ?, ?, ?, ?)
        `,
      )
      .bind(
        genId(),
        input.opsName.slice(0, 128),
        input.status,
        input.summaryJson,
        new Date().toISOString(),
      )
      .run();
  } catch (error) {
    emitLogRecord({
      level: "warn",
      event: "admin_ops_run_persist_failed",
      message: "Ops run event could not be persisted to D1.",
      context: {
        error_name: error instanceof Error ? error.name : "unknown",
      },
    });
  }
}
