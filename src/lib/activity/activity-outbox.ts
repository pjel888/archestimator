export type ActivityOutboxRow = {
  id: string;
  workspace_id: string;
  event_id: string;
  status: "pending" | "delivered" | "failed";
  attempt_count: number;
};

export type ActivityOutboxStatement = {
  bind(...values: unknown[]): ActivityOutboxStatement;
  all<T>(): Promise<{ results?: T[]; success?: boolean }>;
  run(): Promise<{ success?: boolean; meta?: { changes?: number } }>;
};

export type ActivityOutboxDatabase = {
  prepare(sql: string): ActivityOutboxStatement;
};

export type ActivityOutboxReconciliationResult = {
  delivered: number;
  retried: number;
  scanned: number;
};

export type CreateActivityLegalHoldInput = {
  workspaceId: string;
  eventId: string;
  reason: string;
  createdByUserId?: string | null;
};

export const ANONYMIZED_ACTIVITY_ACTOR_ID = "anonymized-activity-actor";

function assertWorkspaceId(workspaceId: string) {
  if (!workspaceId.trim()) throw new Error("Activity lifecycle requires a workspace id.");
}

function assertNonEmpty(value: string, label: string) {
  if (!value.trim()) throw new Error(`Activity lifecycle requires a ${label}.`);
}

export async function createActivityLegalHold(
  database: ActivityOutboxDatabase,
  input: CreateActivityLegalHoldInput,
): Promise<void> {
  assertWorkspaceId(input.workspaceId);
  assertNonEmpty(input.eventId, "event id");
  assertNonEmpty(input.reason, "hold reason");
  const now = new Date().toISOString();
  const result = await database.prepare(
    `INSERT INTO activity_event_legal_holds (
       id, workspace_id, event_id, reason, created_by_user_id, created_at
     )
     SELECT ?, ?, event.id, ?, ?, ?
     FROM estimate_sheet_events event
     WHERE event.id = ? AND event.workspace_id = ?
     ON CONFLICT(event_id) WHERE released_at IS NULL DO NOTHING`,
  ).bind(
    crypto.randomUUID(),
    input.workspaceId,
    input.reason.trim(),
    input.createdByUserId ?? null,
    now,
    input.eventId,
    input.workspaceId,
  ).run();
  if (result.success === false) throw new Error("Activity legal hold write failed.");
}

export async function releaseActivityLegalHold(
  database: ActivityOutboxDatabase,
  input: { workspaceId: string; eventId: string; releasedByUserId?: string | null },
): Promise<void> {
  assertWorkspaceId(input.workspaceId);
  assertNonEmpty(input.eventId, "event id");
  const now = new Date().toISOString();
  const result = await database.prepare(
    `UPDATE activity_event_legal_holds
     SET released_at = ?, released_by_user_id = ?
     WHERE workspace_id = ? AND event_id = ? AND released_at IS NULL`,
  ).bind(now, input.releasedByUserId ?? null, input.workspaceId, input.eventId).run();
  if (result.success === false) throw new Error("Activity legal hold release failed.");
}

export async function anonymizeActivityActor(
  database: ActivityOutboxDatabase,
  input: { workspaceId: string; actorUserId: string },
): Promise<number> {
  assertWorkspaceId(input.workspaceId);
  assertNonEmpty(input.actorUserId, "actor user id");
  const result = await database.prepare(
    `UPDATE estimate_sheet_events
     SET actor_user_id = ?
     WHERE workspace_id = ? AND actor_user_id = ?`,
  ).bind(ANONYMIZED_ACTIVITY_ACTOR_ID, input.workspaceId, input.actorUserId).run();
  if (result.success === false) throw new Error("Activity actor anonymization failed.");
  return result.meta?.changes ?? 0;
}

function nextRetryAt(attemptCount: number, now: Date) {
  const delayMinutes = Math.min(60, 2 ** Math.min(Math.max(attemptCount, 0), 6));
  return new Date(now.getTime() + delayMinutes * 60_000).toISOString();
}

export async function reconcileActivityOutbox(
  database: ActivityOutboxDatabase | null | undefined,
  options: { limit?: number; now?: Date } = {},
): Promise<ActivityOutboxReconciliationResult> {
  if (!database) return { delivered: 0, retried: 0, scanned: 0 };
  const now = options.now ?? new Date();
  const limit = Math.max(1, Math.min(options.limit ?? 100, 500));
  const selected = await database.prepare(
    `SELECT id, workspace_id, event_id, status, attempt_count
     FROM activity_event_outbox
     WHERE status IN ('pending', 'failed')
       AND available_at <= ?
     ORDER BY available_at ASC, id ASC
     LIMIT ?`,
  ).bind(now.toISOString(), limit).all<ActivityOutboxRow>();
  if (selected.success === false) throw new Error("Activity outbox selection failed.");

  let delivered = 0;
  let retried = 0;
  const rows = selected.results ?? [];
  for (const row of rows) {
    assertWorkspaceId(row.workspace_id);
    const event = await database.prepare(
      `SELECT id
       FROM estimate_sheet_events
       WHERE id = ? AND workspace_id = ?
       LIMIT 1`,
    ).bind(row.event_id, row.workspace_id).all<{ id: string }>();
    if (event.success === false) throw new Error("Activity outbox event lookup failed.");

    if ((event.results ?? []).length > 0) {
      const result = await database.prepare(
        `UPDATE activity_event_outbox
         SET status = 'delivered', delivered_at = ?, updated_at = ?, last_error_code = NULL
         WHERE id = ? AND workspace_id = ? AND status IN ('pending', 'failed')`,
      ).bind(now.toISOString(), now.toISOString(), row.id, row.workspace_id).run();
      if (result.success === false) throw new Error("Activity outbox delivery acknowledgement failed.");
      delivered += 1;
      continue;
    }

    const result = await database.prepare(
      `UPDATE activity_event_outbox
       SET status = 'failed', attempt_count = attempt_count + 1, available_at = ?,
           last_error_code = 'history_event_missing', updated_at = ?
       WHERE id = ? AND workspace_id = ? AND status IN ('pending', 'failed')`,
    ).bind(nextRetryAt(row.attempt_count + 1, now), now.toISOString(), row.id, row.workspace_id).run();
    if (result.success === false) throw new Error("Activity outbox retry scheduling failed.");
    retried += 1;
  }

  return { delivered, retried, scanned: rows.length };
}
