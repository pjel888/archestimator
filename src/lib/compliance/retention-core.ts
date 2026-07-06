export type RetentionD1Value = string | number | boolean | null | ArrayBuffer;

export type RetentionD1Result<T = Record<string, unknown>> = {
  results?: T[];
  success?: boolean;
  meta?: {
    changes?: number;
  };
};

export type RetentionD1PreparedStatementLike<T = Record<string, unknown>> = {
  bind(...values: RetentionD1Value[]): RetentionD1PreparedStatementLike<T>;
  all<R = T>(): Promise<RetentionD1Result<R>>;
  run(): Promise<RetentionD1Result<T>>;
};

export type RetentionD1DatabaseLike = {
  prepare<T = Record<string, unknown>>(sql: string): RetentionD1PreparedStatementLike<T>;
};

export type RetentionAction =
  | "tombstoned"
  | "anonymized"
  | "purged"
  | "soft_deleted"
  | "skipped_legal_hold";

export type RetentionClassName =
  | "account_security_events"
  | "account_audit_legacy_sha256"
  | "collaboration_audit_events"
  | "ai_action_runs"
  | "ai_tool_calls"
  | "ai_data_access_events"
  | "shared_link_events"
  | "estimate_sheet_events"
  | "privacy_requests_completed"
  | "privacy_requests_rejected"
  | "logs_worker_observability"
  | "logs_email_delivery"
  | "uploads_orphaned"
  | "sessions_expired";

export type RetentionRule = {
  className: RetentionClassName;
  ttlDays: number;
  action: RetentionAction;
  selectSql: string;
  applySql: string;
};

export type RetentionRunResult = {
  className: RetentionClassName;
  action: RetentionAction;
  rowsAffected: number;
  cutoffTimestamp: string;
  ranAt: string;
  skipped: boolean;
  notes: string | null;
};

export type RecordRetentionEventInput = {
  className: RetentionClassName;
  action: RetentionAction;
  rowsAffected: number;
  cutoffTimestamp: string;
  cronRunId?: string;
  notes?: string | null;
  metadata?: Record<string, unknown>;
};

export type RetentionPassOptions = {
  dryRun?: boolean;
  cronRunId?: string;
};

// ponytail: rule registry is exported as data, not a class. The cron reads this
// and the schedule doc; counsel sign-off on OPEN-DEC-004 updates the TTLs here.
export const DEFAULT_RETENTION_RULES: readonly RetentionRule[] = [
  {
    className: "account_security_events",
    ttlDays: 365,
    action: "purged",
    selectSql:
      "SELECT id FROM account_security_events WHERE created_at < ?1 LIMIT 500",
    applySql:
      "DELETE FROM account_security_events WHERE id IN (SELECT value FROM json_each(?1))",
  },
  {
    className: "account_audit_legacy_sha256",
    ttlDays: 180,
    action: "purged",
    selectSql:
      "SELECT id FROM account_security_events WHERE created_at < ?1 AND ip_hash LIKE 'sha256:%' LIMIT 500",
    applySql:
      "DELETE FROM account_security_events WHERE id IN (SELECT value FROM json_each(?1))",
  },
  {
    className: "collaboration_audit_events",
    ttlDays: 365,
    action: "purged",
    selectSql:
      "SELECT id FROM collaboration_audit_events WHERE created_at < ?1 LIMIT 500",
    applySql:
      "DELETE FROM collaboration_audit_events WHERE id IN (SELECT value FROM json_each(?1))",
  },
  {
    className: "shared_link_events",
    ttlDays: 90,
    action: "purged",
    selectSql:
      "SELECT id FROM shared_link_events WHERE created_at < ?1 LIMIT 500",
    applySql:
      "DELETE FROM shared_link_events WHERE id IN (SELECT value FROM json_each(?1))",
  },
  {
    className: "estimate_sheet_events",
    ttlDays: 365,
    action: "purged",
    selectSql:
      "SELECT id FROM estimate_sheet_events WHERE created_at < ?1 LIMIT 500",
    applySql:
      "DELETE FROM estimate_sheet_events WHERE id IN (SELECT value FROM json_each(?1))",
  },
  {
    className: "privacy_requests_completed",
    ttlDays: 2555,
    action: "purged",
    selectSql:
      "SELECT id FROM privacy_requests WHERE status = 'completed' AND created_at < ?1 LIMIT 100",
    applySql:
      "DELETE FROM privacy_requests WHERE id IN (SELECT value FROM json_each(?1))",
  },
  {
    className: "privacy_requests_rejected",
    ttlDays: 365,
    action: "purged",
    selectSql:
      "SELECT id FROM privacy_requests WHERE status = 'rejected' AND created_at < ?1 LIMIT 100",
    applySql:
      "DELETE FROM privacy_requests WHERE id IN (SELECT value FROM json_each(?1))",
  },
];

export async function recordRetentionEventInD1(
  db: RetentionD1DatabaseLike | null | undefined,
  input: RecordRetentionEventInput,
): Promise<{ id: string }> {
  const id = crypto.randomUUID();
  if (!db) {
    // Cron runs in Workers where D1 is bound. If unavailable, no-op rather
    // than crash so the next run can catch up.
    return { id };
  }
  await db
    .prepare(
      `
        INSERT INTO data_retention_events (
          id, class_name, action, rows_affected,
          cutoff_timestamp, ran_at, cron_run_id, notes, metadata_json
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `,
    )
    .bind(
      id,
      input.className,
      input.action,
      input.rowsAffected,
      input.cutoffTimestamp,
      new Date().toISOString(),
      input.cronRunId ?? null,
      input.notes ?? null,
      JSON.stringify(input.metadata ?? {}),
    )
    .run();
  return { id };
}

export async function runRetentionPassInD1(
  db: RetentionD1DatabaseLike | null | undefined,
  rules: readonly RetentionRule[] = DEFAULT_RETENTION_RULES,
  options: RetentionPassOptions = {},
): Promise<RetentionRunResult[]> {
  const now = new Date();
  const results: RetentionRunResult[] = [];
  if (!db) return results;

  for (const rule of rules) {
    const cutoffDate = new Date(now.getTime() - rule.ttlDays * 24 * 60 * 60 * 1000);
    const cutoffTimestamp = cutoffDate.toISOString();

    try {
      const selectStmt = db.prepare(rule.selectSql);
      const selectResult = await selectStmt
        .bind(cutoffTimestamp)
        .all<{ id: string }>();
      const ids = (selectResult.results ?? []).map((r) => r.id);
      if (ids.length === 0) {
        results.push({
          className: rule.className,
          action: rule.action,
          rowsAffected: 0,
          cutoffTimestamp,
          ranAt: now.toISOString(),
          skipped: true,
          notes: "no rows past cutoff",
        });
        continue;
      }

      if (options.dryRun) {
        results.push({
          className: rule.className,
          action: rule.action,
          rowsAffected: ids.length,
          cutoffTimestamp,
          ranAt: now.toISOString(),
          skipped: true,
          notes: `dry-run; would have affected ${ids.length} rows`,
        });
        continue;
      }

      const applyStmt = db.prepare(rule.applySql);
      const applyResult = await applyStmt
        .bind(JSON.stringify(ids))
        .run();
      const rowsAffected = applyResult.meta?.changes ?? 0;

      await recordRetentionEventInD1(db, {
        className: rule.className,
        action: rule.action,
        rowsAffected,
        cutoffTimestamp,
        cronRunId: options.cronRunId,
        metadata: { selected_count: ids.length },
      });

      results.push({
        className: rule.className,
        action: rule.action,
        rowsAffected,
        cutoffTimestamp,
        ranAt: now.toISOString(),
        skipped: false,
        notes: null,
      });
    } catch (error) {
      console.error({
        retention_pass_failed: true,
        class_name: rule.className,
        error_name: error instanceof Error ? error.name : "unknown",
      });
      results.push({
        className: rule.className,
        action: rule.action,
        rowsAffected: 0,
        cutoffTimestamp,
        ranAt: now.toISOString(),
        skipped: true,
        notes: `error: ${error instanceof Error ? error.name : "unknown"}`,
      });
    }
  }

  return results;
}
