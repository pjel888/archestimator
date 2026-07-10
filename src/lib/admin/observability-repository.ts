import "server-only";

import { getCloudflareD1Database, type D1DatabaseLike } from "@/lib/cloudflare/d1";

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
  if (!db) throw new Error("Cloudflare D1 is not available.");
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
  } catch {
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
