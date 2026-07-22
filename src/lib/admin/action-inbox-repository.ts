import "server-only";

import {
  getCloudflareD1Database,
  type D1DatabaseLike,
  type D1PreparedStatementLike,
} from "@/lib/cloudflare/d1";
import { emitLogRecord } from "@/lib/observability/logger";
import { listOpenIncidents, type OperationalIncidentRow } from "@/lib/admin/incidents-repository";

// F2 (UNIT-003) Founder Action Inbox. Durable, deduped action items derived from
// operational sources. Admin display reads are bounded, while source upserts and
// lifecycle reconciliation always use canonical D1 predicates.

export type ActionItemSourceKind =
  | "incident"
  | "support"
  | "feedback"
  | "identity"
  | "job"
  | "upload_scan"
  | "followup";

export type ActionItemSeverity = "info" | "warning" | "critical";
export type ActionItemStatus = "open" | "snoozed" | "resolved" | "dismissed";

export type AdminActionItemRow = {
  id: string;
  derived_key: string;
  source_kind: ActionItemSourceKind;
  source_id: string;
  title: string;
  detail: string | null;
  severity: ActionItemSeverity;
  href: string | null;
  status: ActionItemStatus;
  priority: number;
  first_seen_at: string;
  last_seen_at: string;
  snooze_until: string | null;
  resolved_at: string | null;
};

export type ActionResult = { ok: boolean; changes: number };

const INCIDENT_SEVERITY: Record<OperationalIncidentRow["severity"], ActionItemSeverity> = {
  sev1: "critical",
  sev2: "warning",
  sev3: "info",
};
const INCIDENT_PRIORITY: Record<OperationalIncidentRow["severity"], number> = {
  sev1: 10,
  sev2: 30,
  sev3: 50,
};

function logFailure(error: unknown, event: string) {
  emitLogRecord({
    level: "error",
    event,
    message: "Admin action inbox D1 operation failed.",
    context: { error_name: error instanceof Error ? error.name : "unknown" },
  });
}

type ActionStatement = D1PreparedStatementLike;

function buildIncidentUpsert(db: D1DatabaseLike, incident: OperationalIncidentRow, now: string): ActionStatement {
  return db
    .prepare(
      `
        INSERT INTO admin_action_items
          (id, derived_key, source_kind, source_id, title, detail, severity, href,
           status, priority, first_seen_at, last_seen_at, snooze_until, resolved_at,
           created_at, updated_at)
        VALUES (?, ?, 'incident', ?, ?, ?, ?, ?, 'open', ?, ?, ?, NULL, NULL, ?, ?)
        ON CONFLICT(derived_key) DO UPDATE SET
          title = excluded.title,
          detail = excluded.detail,
          severity = excluded.severity,
          href = excluded.href,
          priority = excluded.priority,
          last_seen_at = excluded.last_seen_at,
          updated_at = excluded.updated_at,
          status = CASE
            WHEN admin_action_items.status IN ('resolved', 'dismissed') THEN admin_action_items.status
            WHEN admin_action_items.status = 'snoozed'
                 AND admin_action_items.snooze_until IS NOT NULL
                 AND admin_action_items.snooze_until > excluded.last_seen_at
              THEN 'snoozed'
            ELSE 'open'
          END,
          snooze_until = CASE
            WHEN admin_action_items.status = 'snoozed'
                 AND admin_action_items.snooze_until IS NOT NULL
                 AND admin_action_items.snooze_until > excluded.last_seen_at
              THEN admin_action_items.snooze_until
            ELSE NULL
          END
      `,
    )
    .bind(
      crypto.randomUUID(),
      `incident:${incident.id}`,
      incident.id,
      incident.summary || `Incident ${incident.id}`,
      incident.root_cause ?? null,
      INCIDENT_SEVERITY[incident.severity],
      "/admin/observability",
      INCIDENT_PRIORITY[incident.severity],
      now,
      now,
      now,
      now,
    );
}

function buildSupportUpsert(db: D1DatabaseLike, now: string): ActionStatement {
  return db
    .prepare(
      `
        INSERT INTO admin_action_items
          (id, derived_key, source_kind, source_id, title, detail, severity, href,
           status, priority, first_seen_at, last_seen_at, snooze_until, resolved_at,
           created_at, updated_at)
        SELECT
          lower(hex(randomblob(16))),
          'support:' || c.id,
          'support',
          c.id,
          COALESCE(NULLIF(trim(c.subject), ''), 'Support conversation ' || substr(c.id, 1, 8)),
          'status: ' || c.status,
          CASE WHEN c.unread_for_admin = 1 THEN 'warning' ELSE 'info' END,
          '/admin/support?c=' || c.id || '&folder=all',
          CASE WHEN t.snoozed_until > ? THEN 'snoozed' ELSE 'open' END,
          CASE WHEN c.unread_for_admin = 1 THEN 20 ELSE 60 END,
          ?,
          ?,
          CASE WHEN t.snoozed_until > ? THEN t.snoozed_until ELSE NULL END,
          NULL,
          ?,
          ?
        FROM support_conversations c
        LEFT JOIN support_conversation_triage t ON t.conversation_id = c.id
        WHERE c.status IN ('open', 'pending')
        ON CONFLICT(derived_key) DO UPDATE SET
          title = excluded.title,
          detail = excluded.detail,
          severity = excluded.severity,
          href = excluded.href,
          priority = excluded.priority,
          status = excluded.status,
          last_seen_at = excluded.last_seen_at,
          snooze_until = excluded.snooze_until,
          resolved_at = NULL,
          updated_at = excluded.updated_at
      `,
    )
    .bind(now, now, now, now, now, now);
}

function buildFeedbackUpsert(db: D1DatabaseLike, now: string): ActionStatement {
  return db
    .prepare(
      `
        INSERT INTO admin_action_items
          (id, derived_key, source_kind, source_id, title, detail, severity, href,
           status, priority, first_seen_at, last_seen_at, snooze_until, resolved_at,
           created_at, updated_at)
        SELECT
          lower(hex(randomblob(16))),
          'feedback:' || feedback.id,
          'feedback',
          feedback.id,
          'Legacy feedback: ' || feedback.feedback_type,
          CASE WHEN feedback.page_path IS NOT NULL AND feedback.page_path <> ''
            THEN 'page: ' || feedback.page_path ELSE NULL END,
          'warning',
          '/workshop/settings/feedback?feedback=' || feedback.id,
          'open',
          45,
          ?,
          ?,
          NULL,
          NULL,
          ?,
          ?
        FROM beta_feedback_submissions feedback
        WHERE feedback.status IN ('new', 'reviewing')
          AND NOT EXISTS (
            SELECT 1
            FROM support_legacy_feedback_imports mapped_feedback
            WHERE mapped_feedback.feedback_id = feedback.id
          )
        ON CONFLICT(derived_key) DO UPDATE SET
          title = excluded.title,
          detail = excluded.detail,
          severity = excluded.severity,
          href = excluded.href,
          priority = excluded.priority,
          status = 'open',
          last_seen_at = excluded.last_seen_at,
          snooze_until = NULL,
          resolved_at = NULL,
          updated_at = excluded.updated_at
      `,
    )
    .bind(now, now, now, now);
}

function resolveInactiveIncidents(db: D1DatabaseLike, now: string): ActionStatement {
  return db
    .prepare(
      `
        UPDATE admin_action_items
        SET status = 'resolved', resolved_at = ?, snooze_until = NULL, updated_at = ?
        WHERE source_kind = 'incident'
          AND status IN ('open', 'snoozed')
          AND NOT EXISTS (
            SELECT 1
            FROM operational_incidents source
            WHERE source.id = admin_action_items.source_id
              AND source.status IN ('open', 'contained')
          )
      `,
    )
    .bind(now, now);
}

function resolveInactiveSupport(db: D1DatabaseLike, now: string): ActionStatement {
  return db
    .prepare(
      `
        UPDATE admin_action_items
        SET status = 'resolved', resolved_at = ?, snooze_until = NULL, updated_at = ?
        WHERE source_kind = 'support'
          AND status IN ('open', 'snoozed', 'dismissed')
          AND NOT EXISTS (
            SELECT 1
            FROM support_conversations source
            WHERE source.id = admin_action_items.source_id
              AND source.status IN ('open', 'pending')
          )
      `,
    )
    .bind(now, now);
}

function resolveInactiveFeedback(db: D1DatabaseLike, now: string): ActionStatement {
  return db
    .prepare(
      `
        UPDATE admin_action_items
        SET status = 'resolved', resolved_at = ?, snooze_until = NULL, updated_at = ?
        WHERE source_kind = 'feedback'
          AND status IN ('open', 'snoozed', 'dismissed')
          AND NOT EXISTS (
            SELECT 1
            FROM beta_feedback_submissions source
            WHERE source.id = admin_action_items.source_id
              AND source.status IN ('new', 'reviewing')
              AND NOT EXISTS (
                SELECT 1
                FROM support_legacy_feedback_imports mapped_feedback
                WHERE mapped_feedback.feedback_id = source.id
              )
          )
      `,
    )
    .bind(now, now);
}

/**
 * Reconcile the inbox from its sources. Display reads remain bounded, but every
 * active/closed decision is source-truth based so a page cap cannot resolve a
 * row that was merely not returned in the current display slice.
 */
export async function deriveActionItemsFromSources(): Promise<boolean> {
  const db = await getCloudflareD1Database();
  if (!db || !db.batch) return false;

  try {
    const incidentsResult = await listOpenIncidents();
    const incidents = incidentsResult.data ?? [];
    const now = new Date().toISOString();
    await db.batch([
      ...incidents.map((incident) => buildIncidentUpsert(db, incident, now)),
      buildSupportUpsert(db, now),
      buildFeedbackUpsert(db, now),
      resolveInactiveIncidents(db, now),
      resolveInactiveSupport(db, now),
      resolveInactiveFeedback(db, now),
    ]);
    return true;
  } catch (error) {
    logFailure(error, "admin_action_inbox_derive_failed");
    return false;
  }
}

export async function listOpenActionItems(limit = 50): Promise<AdminActionItemRow[]> {
  const db = await getCloudflareD1Database();
  if (!db) return [];
  try {
    const now = new Date().toISOString();
    const result = await db
      .prepare<AdminActionItemRow>(
        `
          SELECT id, derived_key, source_kind, source_id, title, detail, severity, href,
                 status, priority, first_seen_at, last_seen_at, snooze_until, resolved_at
          FROM admin_action_items
          WHERE status = 'open'
             OR (status = 'snoozed' AND snooze_until IS NOT NULL AND snooze_until <= ?)
          ORDER BY priority ASC, last_seen_at DESC
          LIMIT ?
        `,
      )
      .bind(now, limit)
      .all<AdminActionItemRow>();
    return result.results ?? [];
  } catch (error) {
    logFailure(error, "admin_action_inbox_list_failed");
    return [];
  }
}

async function mutateStatus(
  mutation: "snooze" | "resolve" | "dismiss",
  itemId: string,
  snoozeUntil?: string,
): Promise<ActionResult> {
  const db = await getCloudflareD1Database();
  if (!db) return { ok: false, changes: 0 };
  const now = new Date().toISOString();
  try {
    let result;
    if (mutation === "snooze") {
      result = await db
        .prepare(
          `UPDATE admin_action_items
           SET status = 'snoozed', snooze_until = ?, updated_at = ?
           WHERE id = ? AND source_kind NOT IN ('support', 'feedback')
             AND status IN ('open', 'snoozed')`,
        )
        .bind(snoozeUntil ?? now, now, itemId)
        .run();
    } else if (mutation === "resolve") {
      result = await db
        .prepare(
          `UPDATE admin_action_items
           SET status = 'resolved', resolved_at = ?, snooze_until = NULL, updated_at = ?
           WHERE id = ? AND source_kind NOT IN ('support', 'feedback')
             AND status <> 'resolved'`,
        )
        .bind(now, now, itemId)
        .run();
    } else {
      result = await db
        .prepare(
          `UPDATE admin_action_items
           SET status = 'dismissed', snooze_until = NULL, updated_at = ?
           WHERE id = ? AND source_kind NOT IN ('support', 'feedback')
             AND status <> 'dismissed'`,
        )
        .bind(now, itemId)
        .run();
    }
    const changes = result.meta?.changes ?? 0;
    return { ok: changes > 0, changes };
  } catch (error) {
    logFailure(error, "admin_action_inbox_mutate_failed");
    return { ok: false, changes: 0 };
  }
}

export const snoozeActionItemInD1 = (itemId: string, snoozeUntil: string) =>
  mutateStatus("snooze", itemId, snoozeUntil);
export const resolveActionItemInD1 = (itemId: string) => mutateStatus("resolve", itemId);
export const dismissActionItemInD1 = (itemId: string) => mutateStatus("dismiss", itemId);
