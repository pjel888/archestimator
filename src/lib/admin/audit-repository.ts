import "server-only";

import { getCloudflareD1Database, type D1DatabaseLike } from "@/lib/cloudflare/d1";
import { emitLogRecord } from "@/lib/observability/logger";

export type AdminAuditEvent = {
  id: string;
  actor_user_id: string;
  actor_email: string;
  action: string;
  target_type: string | null;
  target_id: string | null;
  summary_json: string | null;
  request_id: string | null;
  created_at: string;
};

export type WriteAdminAuditEventInput = {
  actorUserId: string;
  actorEmail: string;
  action: string;
  targetType?: string | null;
  targetId?: string | null;
  summary?: Record<string, unknown> | null;
  requestId?: string | null;
};

export type ListAuditEventsInput = {
  page: number;
  limit: number;
  action?: string | null;
};

export type AdminQueryResult<T> = {
  data: T;
  error: string | null;
  count?: number;
};

type CountRow = {
  count: number;
};

function clampPositiveInteger(value: number, fallback: number, max: number): number {
  if (!Number.isFinite(value)) return fallback;
  return Math.min(Math.max(Math.floor(value), 1), max);
}

function logAdminAuditD1Failure(error: unknown, event: string) {
  emitLogRecord({
    level: "error",
    event,
    message: "Admin audit D1 operation failed.",
    context: {
      error_name: error instanceof Error ? error.name : "unknown",
    },
  });
}

export async function insertAdminAuditEventInD1(
  db: D1DatabaseLike,
  input: WriteAdminAuditEventInput,
): Promise<AdminAuditEvent> {
  const id = crypto.randomUUID();
  const createdAt = new Date().toISOString();
  const row: AdminAuditEvent = {
    id,
    actor_user_id: input.actorUserId,
    actor_email: input.actorEmail,
    action: input.action,
    target_type: input.targetType ?? null,
    target_id: input.targetId ?? null,
    summary_json: input.summary ? JSON.stringify(input.summary) : null,
    request_id: input.requestId ?? null,
    created_at: createdAt,
  };

  await db
    .prepare(
      `
        INSERT INTO admin_audit_events (
          id,
          actor_user_id,
          actor_email,
          action,
          target_type,
          target_id,
          summary_json,
          request_id,
          created_at
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `,
    )
    .bind(
      row.id,
      row.actor_user_id,
      row.actor_email,
      row.action,
      row.target_type,
      row.target_id,
      row.summary_json,
      row.request_id,
      row.created_at,
    )
    .run();

  return row;
}

export async function writeAdminAuditEvent(
  input: WriteAdminAuditEventInput,
): Promise<AdminQueryResult<AdminAuditEvent | null>> {
  try {
    const db = await getCloudflareD1Database();
    if (!db) return { data: null, error: "Something went wrong. Try again in a moment." };
    return { data: await insertAdminAuditEventInD1(db, input), error: null };
  } catch (error) {
    logAdminAuditD1Failure(error, "admin_audit_write_failed");
    return { data: null, error: "Admin audit event could not be written." };
  }
}

export async function listAuditEvents(
  input: ListAuditEventsInput,
): Promise<AdminQueryResult<AdminAuditEvent[]>> {
  const page = clampPositiveInteger(input.page, 1, 10_000);
  const limit = clampPositiveInteger(input.limit, 25, 100);
  const offset = (page - 1) * limit;
  const action = input.action?.trim() || null;

  try {
    const db = await getCloudflareD1Database();
    if (!db) return { data: [], error: "Something went wrong. Try again in a moment.", count: 0 };

    const whereClause = action ? "WHERE action = ?" : "";
    const countStatement = db.prepare<CountRow>(
      `
        SELECT COUNT(*) AS count
        FROM admin_audit_events
        ${whereClause}
      `,
    );
    const rowsStatement = db.prepare<AdminAuditEvent>(
      `
        SELECT id, actor_user_id, actor_email, action, target_type, target_id, summary_json, request_id, created_at
        FROM admin_audit_events
        ${whereClause}
        ORDER BY created_at DESC
        LIMIT ? OFFSET ?
      `,
    );

    // Run count and page-rows in parallel — they are independent queries.
    const [countRow, rows] = await Promise.all([
      action ? countStatement.bind(action).first<CountRow>() : countStatement.first<CountRow>(),
      action
        ? rowsStatement.bind(action, limit, offset).all<AdminAuditEvent>()
        : rowsStatement.bind(limit, offset).all<AdminAuditEvent>(),
    ]);

    return {
      data: rows.results ?? [],
      error: null,
      count: countRow?.count ?? 0,
    };
  } catch (error) {
    logAdminAuditD1Failure(error, "admin_audit_list_failed");
    return { data: [], error: "Admin audit events could not be read.", count: 0 };
  }
}
