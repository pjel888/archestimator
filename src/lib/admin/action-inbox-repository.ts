import "server-only";

import { getCloudflareD1Database } from "@/lib/cloudflare/d1";
import { emitLogRecord } from "@/lib/observability/logger";
import { listOpenIncidents, type OperationalIncidentRow } from "@/lib/admin/incidents-repository";
import { listOpenSupportConversations } from "@/lib/admin/support-attention-repository";
import { listHighSeverityFeedback } from "@/lib/admin/feedback-attention-repository";

// F2 (UNIT-003) Founder Action Inbox. Durable, deduped action items derived from
// operational sources. v1 source: open incidents. The derivation is idempotent
// (upsert on derived_key) and reconciles closed sources to 'resolved'.

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

/**
 * Reconcile the inbox from its sources. Currently derives from open incidents:
 * upserts each as an action item (refreshing payload, preserving operator
 * resolved/dismissed, reopening expired snoozes) and auto-resolves incident items
 * whose source incident is no longer open. Best-effort: a failure logs and returns
 * false but never throws, so rendering Today still shows the last-known list.
 */
export async function deriveActionItemsFromSources(): Promise<boolean> {
  const db = await getCloudflareD1Database();
  if (!db || !db.batch) return false;

  try {
    const [incidentsResult, supportResult, feedbackResult] = await Promise.all([
      listOpenIncidents(),
      listOpenSupportConversations(),
      listHighSeverityFeedback(),
    ]);
    const incidents = incidentsResult.data ?? [];
    const support = supportResult;
    const feedback = feedbackResult;
    const now = new Date().toISOString();

    const buildUpsert = (
      derivedKey: string,
      sourceKind: "incident" | "support" | "feedback",
      sourceId: string,
      title: string,
      detail: string | null,
      severity: ActionItemSeverity,
      priority: number,
      href: string,
    ) =>
      db
        .prepare(
          `
            INSERT INTO admin_action_items
              (id, derived_key, source_kind, source_id, title, detail, severity, href,
               status, priority, first_seen_at, last_seen_at, snooze_until, resolved_at,
               created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'open', ?, ?, ?, NULL, NULL, ?, ?)
            ON CONFLICT(derived_key) DO UPDATE SET
              title = excluded.title,
              detail = excluded.detail,
              severity = excluded.severity,
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
          derivedKey,
          sourceKind,
          sourceId,
          title,
          detail,
          severity,
          href,
          priority,
          now,
          now,
          now,
          now,
        );

    const upserts: ReturnType<typeof buildUpsert>[] = [
      ...incidents.map((incident) =>
        buildUpsert(
          `incident:${incident.id}`,
          "incident",
          incident.id,
          incident.summary || `Incident ${incident.id}`,
          incident.root_cause ?? null,
          INCIDENT_SEVERITY[incident.severity],
          INCIDENT_PRIORITY[incident.severity],
          "/admin/observability",
        ),
      ),
      // F4: open/pending support conversations become action items. Awaiting-reply
      // (unread_for_admin=1) triages above read ones.
      ...support.map((conv) =>
        buildUpsert(
          `support:${conv.id}`,
          "support",
          conv.id,
          conv.subject?.trim() || `Support conversation ${conv.id.slice(0, 8)}`,
          `status: ${conv.status}`,
          conv.unread_for_admin === 1 ? "warning" : "info",
          conv.unread_for_admin === 1 ? 20 : 60,
          "/admin/support",
        ),
      ),
      // F4/F2: high-severity beta feedback (blocker/high) becomes action items.
      ...feedback.map((item) =>
        buildUpsert(
          `feedback:${item.id}`,
          "feedback",
          item.id,
          `${item.severity} feedback: ${item.feedback_type}`,
          item.page_path ? `page: ${item.page_path}` : null,
          item.severity === "blocker" ? "critical" : "warning",
          item.severity === "blocker" ? 15 : 45,
          "/admin",
        ),
      ),
    ];

    // Auto-resolve items whose source is no longer open, per source kind.
    const buildResolve = (sourceKind: "incident" | "support" | "feedback", openIds: string[]) => {
      if (openIds.length > 0) {
        const placeholders = openIds.map(() => "?").join(", ");
        return db
          .prepare(
            `
              UPDATE admin_action_items
              SET status = 'resolved', resolved_at = ?, snooze_until = NULL, updated_at = ?
              WHERE source_kind = ? AND status IN ('open', 'snoozed')
                AND source_id NOT IN (${placeholders})
            `,
          )
          .bind(now, now, sourceKind, ...openIds);
      }
      return db
        .prepare(
          `
            UPDATE admin_action_items
            SET status = 'resolved', resolved_at = ?, snooze_until = NULL, updated_at = ?
            WHERE source_kind = ? AND status IN ('open', 'snoozed')
          `,
        )
        .bind(now, now, sourceKind);
    };

    await db.batch([
      ...upserts,
      buildResolve("incident", incidents.map((i) => i.id)),
      buildResolve("support", support.map((c) => c.id)),
      buildResolve("feedback", feedback.map((f) => f.id)),
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
           WHERE id = ? AND status IN ('open', 'snoozed')`,
        )
        .bind(snoozeUntil ?? now, now, itemId)
        .run();
    } else if (mutation === "resolve") {
      result = await db
        .prepare(
          `UPDATE admin_action_items
           SET status = 'resolved', resolved_at = ?, snooze_until = NULL, updated_at = ?
           WHERE id = ? AND status <> 'resolved'`,
        )
        .bind(now, now, itemId)
        .run();
    } else {
      result = await db
        .prepare(
          `UPDATE admin_action_items
           SET status = 'dismissed', snooze_until = NULL, updated_at = ?
           WHERE id = ? AND status <> 'dismissed'`,
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
