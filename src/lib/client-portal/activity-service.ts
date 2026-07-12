import "server-only";

import { randomUUID } from "node:crypto";

import type { D1DatabaseLike, D1PreparedStatementLike, D1Value } from "@/lib/cloudflare/d1";
import { evaluateClientPortalPolicy, type ClientPortalActor, type ClientPortalInternalActor } from "@/lib/client-portal/policy";

const ANALYTICS_EVENTS = new Set(["viewed", "section_viewed", "thread_opened", "thread_created", "decision_started", "decision_submitted"]);
const CLIENT_SAFE_AUDIT_EVENTS = new Set(["issue_issued", "issue_superseded", "thread_created", "message_created", "thread_resolved", "thread_reopened", "decision_submitted"]);
const REMINDER_COOLDOWN_MS = 7 * 24 * 60 * 60 * 1_000;

type PortalRow = { current_issue_id: string | null; id: string; project_id: string; status: "draft" | "ready" | "live" | "access_off" | "archived"; workspace_id: string };
type AuditRow = { actor_type: "internal_user" | "recipient" | "system"; event_type: string; id: string; issue_id: string | null; metadata_json: string; occurred_at: string; visibility: "client_safe" | "owner" | "security" };
type OwnerAuditRow = AuditRow & { actor_id: string | null };
type RecipientSummaryRow = {
  decision_submitted_at: string | null;
  delivery_state: "delivered" | "failed" | "pending" | null;
  display_name: string | null;
  first_viewed_at: string | null;
  id: string;
  last_reminder_at: string | null;
  last_viewed_at: string | null;
  open_thread_count: number;
  required_approver: number;
  role_template: string;
  section_view_count: number;
  status: "invited" | "active" | "revoked" | "expired";
  unsubscribed: number;
  verification_state: "unverified" | "verified" | "failed";
  waiting_on_owner_count: number;
};
type ReminderEligibilityRow = { decision_submitted_at: string | null; id: string; last_reminder_at: string | null; status: string; unsubscribed: number };

export class ClientPortalActivityError extends Error {
  constructor(readonly code: "client_portal_activity_denied" | "client_portal_activity_invalid" | "client_portal_activity_not_found" | "client_portal_activity_write_failed", message: string) { super(message); }
}

function statement(database: D1DatabaseLike, sql: string, values: D1Value[]): D1PreparedStatementLike { return database.prepare(sql).bind(...values); }
async function first<T>(database: D1DatabaseLike, sql: string, values: D1Value[]): Promise<T | null> { return database.prepare<T>(sql).bind(...values).first<T>(); }
async function all<T>(database: D1DatabaseLike, sql: string, values: D1Value[]): Promise<T[]> { const result = await database.prepare<T>(sql).bind(...values).all<T>(); if (result.success === false) throw new ClientPortalActivityError("client_portal_activity_write_failed", "Client Portal activity read failed."); return result.results ?? []; }
function metadata(value: Record<string, unknown> | undefined) { const safe = value ?? {}; const encoded = JSON.stringify(safe); if (encoded.length > 4_000) throw new ClientPortalActivityError("client_portal_activity_invalid", "Client Portal activity metadata is too large."); return encoded; }

async function portalFor(database: D1DatabaseLike, portalId: string) {
  const portal = await first<PortalRow>(database, "SELECT id, workspace_id, project_id, status, current_issue_id FROM client_portals WHERE id = ? LIMIT 1", [portalId]);
  if (!portal) throw new ClientPortalActivityError("client_portal_activity_not_found", "Client Portal was not found.");
  return portal;
}

function authorizeOwner(actor: ClientPortalInternalActor, portal: PortalRow) {
  if (!evaluateClientPortalPolicy({ actor, action: "audit:view", portal: { id: portal.id, workspaceId: portal.workspace_id, projectId: portal.project_id, status: portal.status, allowAnonymousView: false } }).allowed) throw new ClientPortalActivityError("client_portal_activity_denied", "Owner cannot access Client Portal activity.");
}

function safeMetadata(value: string) {
  try {
    const parsed = JSON.parse(value);
    return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed as Record<string, unknown> : {};
  } catch {
    return {};
  }
}

function reminderInCooldown(lastReminderAt: string | null, now: Date) {
  if (!lastReminderAt) return false;
  const sentAt = Date.parse(lastReminderAt);
  return Number.isFinite(sentAt) && sentAt + REMINDER_COOLDOWN_MS > now.getTime();
}

function recipientNextAction(recipient: RecipientSummaryRow, now: Date) {
  if (recipient.status === "revoked" || recipient.status === "expired" || recipient.unsubscribed) return "no_action";
  if (recipient.status !== "active") return "send_invitation";
  if (recipient.delivery_state === "failed") return "fix_delivery";
  if (recipient.verification_state !== "verified") return "verify_access";
  if (recipient.waiting_on_owner_count > 0) return "reply";
  if (recipient.required_approver && !recipient.decision_submitted_at) return "decision_pending";
  if (!recipient.first_viewed_at) return reminderInCooldown(recipient.last_reminder_at, now) ? "follow_up_complete" : "remind";
  return "no_action";
}

export async function recordClientPortalAnalyticsEvent({ actor, database, eventType, issueId, metadata: eventMetadata, portalId, userAgentClass = "human" }: { actor: ClientPortalActor; database: D1DatabaseLike; eventType: string; issueId?: string | null; metadata?: Record<string, unknown>; portalId: string; userAgentClass?: "bot" | "human" | "preview" }) {
  const portal = await portalFor(database, portalId);
  if (!ANALYTICS_EVENTS.has(eventType) || actor.kind !== "recipient" || actor.portalId !== portal.id || actor.status !== "active" || actor.verificationState !== "verified" || userAgentClass !== "human") return { recorded: false };
  if (eventType === "viewed") {
    const priorView = await first<{ id: string }>(database, "SELECT id FROM client_portal_analytics_events WHERE portal_id = ? AND issue_id IS ? AND recipient_id = ? AND event_type = 'viewed' AND verified_human = 1 LIMIT 1", [portal.id, issueId ?? null, actor.recipientId]);
    if (priorView) return { recorded: false };
  }
  const timestamp = new Date().toISOString();
  const result = await statement(database, "INSERT INTO client_portal_analytics_events (id, portal_id, issue_id, recipient_id, event_type, verified_human, occurred_at, metadata_json, created_at) VALUES (?, ?, ?, ?, ?, 1, ?, ?, ?)", [`analytics_${randomUUID()}`, portal.id, issueId ?? null, actor.recipientId, eventType, timestamp, metadata(eventMetadata), timestamp]).run();
  if (result.success === false) throw new ClientPortalActivityError("client_portal_activity_write_failed", "Client Portal analytics event could not be saved.");
  return { recorded: true };
}

export async function listClientPortalClientSafeActivity({ actor, database, portalId }: { actor: ClientPortalActor; database: D1DatabaseLike; portalId: string }) {
  const portal = await portalFor(database, portalId);
  if (!evaluateClientPortalPolicy({ actor, action: "portal:view", portal: { id: portal.id, workspaceId: portal.workspace_id, projectId: portal.project_id, status: portal.status, allowAnonymousView: false } }).allowed) throw new ClientPortalActivityError("client_portal_activity_denied", "Client Portal activity is unavailable.");
  const rows = await all<AuditRow>(database, "SELECT id, issue_id, actor_type, event_type, metadata_json, occurred_at, visibility FROM client_portal_audit_events WHERE portal_id = ? AND visibility = 'client_safe' ORDER BY occurred_at DESC, id DESC LIMIT 100", [portal.id]);
  return rows.filter((row) => CLIENT_SAFE_AUDIT_EVENTS.has(row.event_type)).map((row) => ({ eventType: row.event_type, id: row.id, issueId: row.issue_id, occurredAt: row.occurred_at }));
}

export async function listClientPortalOwnerAudit({ actor, database, limit = 100, portalId }: { actor: ClientPortalInternalActor; database: D1DatabaseLike; limit?: number; portalId: string }) {
  const portal = await portalFor(database, portalId); authorizeOwner(actor, portal);
  const boundedLimit = Math.max(1, Math.min(100, Math.floor(limit)));
  const rows = await all<OwnerAuditRow>(database, "SELECT id, issue_id, actor_type, actor_id, event_type, visibility, metadata_json, occurred_at FROM client_portal_audit_events WHERE portal_id = ? ORDER BY occurred_at DESC, id DESC LIMIT ?", [portal.id, boundedLimit]);
  return rows.map((row) => ({ actorId: row.actor_id, actorType: row.actor_type, eventType: row.event_type, id: row.id, issueId: row.issue_id, metadata: safeMetadata(row.metadata_json), occurredAt: row.occurred_at, visibility: row.visibility }));
}

export async function listClientPortalRecipientNextActions({ actor, database, portalId }: { actor: ClientPortalInternalActor; database: D1DatabaseLike; portalId: string }) {
  const portal = await portalFor(database, portalId); authorizeOwner(actor, portal);
  const recipients = await all<RecipientSummaryRow>(database, `SELECT
      r.id, r.display_name, r.role_template, r.status, r.verification_state, r.is_required_approver AS required_approver,
      MIN(CASE WHEN a.event_type = 'viewed' AND a.verified_human = 1 THEN a.occurred_at END) AS first_viewed_at,
      MAX(CASE WHEN a.event_type = 'viewed' AND a.verified_human = 1 THEN a.occurred_at END) AS last_viewed_at,
      COUNT(DISTINCT CASE WHEN a.event_type = 'section_viewed' AND a.verified_human = 1 THEN a.id END) AS section_view_count,
      COUNT(DISTINCT CASE WHEN t.status = 'open' THEN t.id END) AS open_thread_count,
      COUNT(DISTINCT CASE WHEN t.waiting_state = 'waiting_on_owner' THEN t.id END) AS waiting_on_owner_count,
      MAX(CASE WHEN d.voided_at IS NULL THEN d.submitted_at END) AS decision_submitted_at,
      MAX(CASE WHEN o.event_type = 'portal.recipient.reminded' AND o.state = 'delivered' THEN o.delivered_at ELSE NULL END) AS last_reminder_at,
      CASE WHEN MAX(CASE WHEN o.state = 'dead' THEN 1 ELSE 0 END) = 1 THEN 'failed' WHEN MAX(CASE WHEN o.state = 'delivered' THEN 1 ELSE 0 END) = 1 THEN 'delivered' WHEN MAX(CASE WHEN o.id IS NOT NULL THEN 1 ELSE 0 END) = 1 THEN 'pending' ELSE NULL END AS delivery_state,
      MAX(CASE WHEN ae.event_type IN ('portal.recipient.unsubscribed', 'recipient_unsubscribed') THEN 1 ELSE 0 END) AS unsubscribed
    FROM client_portal_recipients r
    LEFT JOIN client_portal_analytics_events a ON a.recipient_id = r.id AND a.portal_id = r.portal_id
    LEFT JOIN client_portal_threads t ON t.portal_id = r.portal_id AND t.created_by_actor_type = 'recipient' AND t.created_by_actor_id = r.id
    LEFT JOIN client_portal_decisions d ON d.portal_id = r.portal_id AND d.recipient_id = r.id AND d.issue_id IS ?
    LEFT JOIN client_portal_notification_outbox o ON o.portal_id = r.portal_id AND o.recipient_id = r.id
    LEFT JOIN client_portal_audit_events ae ON ae.portal_id = r.portal_id AND instr(ae.metadata_json, '"recipientId":"' || r.id || '"') > 0
    WHERE r.portal_id = ?
    GROUP BY r.id, r.display_name, r.role_template, r.status, r.verification_state, r.is_required_approver
    ORDER BY r.created_at ASC, r.id ASC`, [portal.current_issue_id, portal.id]);
  const now = new Date();
  return recipients.map((recipient) => ({
    decisionSubmittedAt: recipient.decision_submitted_at,
    deliveryState: recipient.delivery_state,
    displayName: recipient.display_name,
    firstViewedAt: recipient.first_viewed_at,
    lastReminderAt: recipient.last_reminder_at,
    lastViewedAt: recipient.last_viewed_at,
    nextAction: recipientNextAction(recipient, now),
    openThreadCount: recipient.open_thread_count,
    recipientId: recipient.id,
    role: recipient.role_template,
    sectionViewCount: recipient.section_view_count,
    verificationState: recipient.verification_state,
  }));
}

export async function enqueueClientPortalReminder({ actor, database, idempotencyKey, portalId, recipientId }: { actor: ClientPortalInternalActor; database: D1DatabaseLike; idempotencyKey: string; portalId: string; recipientId: string }) {
  const portal = await portalFor(database, portalId); authorizeOwner(actor, portal);
  const key = idempotencyKey.trim(); if (!key || key.length > 160) throw new ClientPortalActivityError("client_portal_activity_invalid", "Reminder idempotency key is invalid.");
  const recipient = await first<ReminderEligibilityRow>(database, `SELECT
      r.id, r.status,
      MAX(CASE WHEN o.event_type = 'portal.recipient.reminded' AND o.state = 'delivered' THEN o.delivered_at ELSE NULL END) AS last_reminder_at,
      MAX(CASE WHEN d.voided_at IS NULL THEN d.submitted_at ELSE NULL END) AS decision_submitted_at,
      MAX(CASE WHEN ae.event_type IN ('portal.recipient.unsubscribed', 'recipient_unsubscribed') THEN 1 ELSE 0 END) AS unsubscribed
    FROM client_portal_recipients r
    LEFT JOIN client_portal_notification_outbox o ON o.recipient_id = r.id AND o.portal_id = r.portal_id
    LEFT JOIN client_portal_decisions d ON d.recipient_id = r.id AND d.portal_id = r.portal_id AND d.issue_id IS ?
    LEFT JOIN client_portal_audit_events ae ON ae.portal_id = r.portal_id AND instr(ae.metadata_json, '"recipientId":"' || r.id || '"') > 0
    WHERE r.id = ? AND r.portal_id = ?
    GROUP BY r.id, r.status`, [portal.current_issue_id, recipientId, portal.id]);
  if (!recipient || recipient.status !== "active") throw new ClientPortalActivityError("client_portal_activity_not_found", "Recipient cannot receive a reminder.");
  const timestamp = new Date();
  if (recipient.unsubscribed || recipient.decision_submitted_at || reminderInCooldown(recipient.last_reminder_at, timestamp)) {
    return { id: null, replayed: false, suppressed: true };
  }
  const existing = await first<{ id:string }>(database, "SELECT id FROM client_portal_notification_outbox WHERE portal_id = ? AND idempotency_key = ? LIMIT 1", [portal.id, key]);
  if (existing) return { id: existing.id, replayed: true };
  if (!database.batch) throw new ClientPortalActivityError("client_portal_activity_write_failed", "Client Portal reminders require D1 batch support.");
  const outboxId = `outbox_${randomUUID()}`;
  const occurredAt = timestamp.toISOString();
  const results = await database.batch([
    statement(database, "INSERT INTO client_portal_notification_outbox (id, portal_id, issue_id, recipient_id, event_type, idempotency_key, payload_json, state, attempt_count, next_attempt_at, created_at, updated_at) VALUES (?, ?, NULL, ?, 'portal.recipient.reminded', ?, ?, 'pending', 0, ?, ?, ?) ON CONFLICT(portal_id, idempotency_key) DO NOTHING", [outboxId, portal.id, recipient.id, key, JSON.stringify({ recipientId: recipient.id }), occurredAt, occurredAt, occurredAt]),
    statement(database, "INSERT INTO client_portal_audit_events (id, workspace_id, portal_id, issue_id, actor_type, actor_id, event_type, visibility, metadata_json, occurred_at, created_at) VALUES (?, ?, ?, NULL, 'internal_user', ?, 'portal.recipient.reminded', 'owner', ?, ?, ?)", [`audit_${randomUUID()}`, portal.workspace_id, portal.id, actor.userId, JSON.stringify({ recipientId: recipient.id }), occurredAt, occurredAt]),
  ]);
  if (results.some((result) => result.success === false)) throw new ClientPortalActivityError("client_portal_activity_write_failed", "Client Portal reminder could not be queued.");
  if ((results[0]?.meta?.changes ?? 1) > 0) return { id: outboxId, replayed: false };
  const replayed = await first<{ id:string }>(database, "SELECT id FROM client_portal_notification_outbox WHERE portal_id = ? AND idempotency_key = ? LIMIT 1", [portal.id, key]);
  if (!replayed) throw new ClientPortalActivityError("client_portal_activity_write_failed", "Client Portal reminder idempotency state is unavailable.");
  return { id: replayed.id, replayed: true };
}
