import "server-only";

import { createHash, randomUUID } from "node:crypto";

import type { D1DatabaseLike, D1PreparedStatementLike, D1Value } from "@/lib/cloudflare/d1";
import { clientPortalOwnerNotificationStatement } from "@/lib/client-portal/owner-notification";
import { evaluateClientPortalPolicy, type ClientPortalInternalActor, type ClientPortalPolicyPortal, type ClientPortalRecipientActor } from "@/lib/client-portal/policy";
import { sanitizeSharedLinkRecipientText } from "@/lib/share/sanitize-recipient-text";

type PortalRow = { id: string; workspace_id: string; project_id: string; status: "draft" | "ready" | "live" | "access_off" | "archived"; current_issue_id: string | null };
type IssueRow = { content_hash: string; currency_code: string; decision_policy_snapshot_json: string; id: string; issue_number: number; status: "issued" | "under_review" | "changes_requested" | "accepted" | "declined" | "superseded" | "withdrawn" | "archived"; total_cost: number; valid_through: string | null; version_label: string };
type RecipientRow = { display_name: string | null; email_normalized: string; is_required_approver: number; role_template: "viewer" | "commenter" | "reviewer" | "approver" };
type DecisionRow = { decision: ClientPortalDecision; id: string; intent_hash: string; issue_content_hash: string; issue_id: string; note: string | null; signer_name: string | null; submitted_at: string };
type DecisionPolicy = { requiredApprovals: number; requiredRecipientIds: readonly string[] };

export type ClientPortalDecision = "approved" | "changes_requested" | "declined";

export type ClientPortalDecisionReceipt = {
  currencyCode: string;
  decision: ClientPortalDecision;
  id: string;
  issueContentHash: string;
  issueId: string;
  issueNumber: number;
  note: string | null;
  replayed: boolean;
  signerName: string | null;
  submittedAt: string;
  total: number;
  versionLabel: string;
};

export class ClientPortalDecisionError extends Error {
  constructor(readonly code: "client_portal_decision_denied" | "client_portal_decision_duplicate" | "client_portal_decision_invalid" | "client_portal_decision_not_found" | "client_portal_decision_stale" | "client_portal_decision_write_failed", message: string) { super(message); }
}

function statement(database: D1DatabaseLike, sql: string, values: D1Value[]): D1PreparedStatementLike { return database.prepare(sql).bind(...values); }
async function first<T>(database: D1DatabaseLike, sql: string, values: D1Value[]): Promise<T | null> { return database.prepare<T>(sql).bind(...values).first<T>(); }

function text(value: string | null | undefined, maxLength: number) {
  if (value === undefined || value === null) return null;
  return sanitizeSharedLinkRecipientText(value, maxLength) || null;
}

function idempotencyKey(value: string) {
  const key = value.trim();
  if (!key || key.length > 120) throw new ClientPortalDecisionError("client_portal_decision_invalid", "A valid idempotency key is required.");
  return key;
}

function decisionAction(decision: ClientPortalDecision) { return decision === "changes_requested" ? "decision:submit_review" as const : "decision:submit_formal" as const; }

function intentHash(input: { decision: ClientPortalDecision; issueContentHash: string; note: string | null; signerName: string | null }) {
  return createHash("sha256").update(JSON.stringify(input)).digest("hex");
}

function decisionPolicy(value: string): DecisionPolicy {
  try {
    const parsed = JSON.parse(value) as Record<string, unknown>;
    const requiredApprovals = typeof parsed.requiredApprovals === "number" && Number.isInteger(parsed.requiredApprovals) && parsed.requiredApprovals > 0 ? parsed.requiredApprovals : 1;
    const requiredRecipientIds = Array.isArray(parsed.requiredRecipientIds) ? parsed.requiredRecipientIds.filter((entry): entry is string => typeof entry === "string") : [];
    return { requiredApprovals, requiredRecipientIds };
  } catch { return { requiredApprovals: 1, requiredRecipientIds: [] }; }
}

async function context(database: D1DatabaseLike, actor: ClientPortalRecipientActor, portalId: string, issueId: string, requireMutable = false) {
  const [portal, issue, recipient] = await Promise.all([
    first<PortalRow>(database, "SELECT id, workspace_id, project_id, status, current_issue_id FROM client_portals WHERE id = ? LIMIT 1", [portalId]),
    first<IssueRow>(database, "SELECT id, issue_number, version_label, status, content_hash, total_cost, currency_code, valid_through, decision_policy_snapshot_json FROM client_portal_issues WHERE id = ? AND portal_id = ? LIMIT 1", [issueId, portalId]),
    first<RecipientRow>(database, "SELECT email_normalized, display_name, role_template, is_required_approver FROM client_portal_recipients WHERE id = ? AND portal_id = ? AND status = 'active' LIMIT 1", [actor.recipientId, portalId]),
  ]);
  if (!portal || !issue || !recipient || portal.current_issue_id !== issue.id || issue.status === "withdrawn" || issue.status === "archived" || issue.status === "superseded") throw new ClientPortalDecisionError("client_portal_decision_stale", "Client Portal issue is unavailable.");
  if (requireMutable && (issue.status === "accepted" || issue.status === "declined" || (issue.valid_through && issue.valid_through < new Date().toISOString().slice(0, 10)))) throw new ClientPortalDecisionError("client_portal_decision_stale", "Client Portal issue no longer accepts decisions.");
  const policyPortal: ClientPortalPolicyPortal = { id: portal.id, workspaceId: portal.workspace_id, projectId: portal.project_id, status: portal.status, allowAnonymousView: false };
  const policyActor: ClientPortalRecipientActor = { ...actor, role: recipient.role_template, isRequiredApprover: recipient.is_required_approver === 1 };
  const policy = decisionPolicy(issue.decision_policy_snapshot_json);
  if (policy.requiredRecipientIds.length) policyActor.isRequiredApprover = policy.requiredRecipientIds.includes(actor.recipientId);
  return { issue, policy, policyActor, policyPortal, recipient };
}

function receipt(row: DecisionRow, issue: IssueRow, replayed: boolean): ClientPortalDecisionReceipt {
  return { id: row.id, decision: row.decision, issueId: issue.id, issueNumber: issue.issue_number, versionLabel: issue.version_label, total: issue.total_cost, currencyCode: issue.currency_code, issueContentHash: row.issue_content_hash, signerName: row.signer_name, note: row.note, submittedAt: row.submitted_at, replayed };
}

export async function submitClientPortalDecision({ actor, database, decision, expectedIssueContentHash, idempotencyKey: rawIdempotencyKey, issueId, note: rawNote, portalId, signerName: rawSignerName }: { actor: ClientPortalRecipientActor; database: D1DatabaseLike; decision: ClientPortalDecision; expectedIssueContentHash: string; idempotencyKey: string; issueId: string; note?: string | null; portalId: string; signerName?: string | null }): Promise<ClientPortalDecisionReceipt> {
  if (decision !== "approved" && decision !== "changes_requested" && decision !== "declined") throw new ClientPortalDecisionError("client_portal_decision_invalid", "Decision is invalid.");
  const idempotency = idempotencyKey(rawIdempotencyKey);
  const note = text(rawNote, 2_000);
  const signerName = text(rawSignerName, 120);
  const intendedHash = intentHash({ decision, issueContentHash: expectedIssueContentHash, note, signerName });
  const replay = await first<DecisionRow>(database, "SELECT id, issue_id, decision, note, signer_name, issue_content_hash, intent_hash, submitted_at FROM client_portal_decisions WHERE recipient_id = ? AND idempotency_key = ? LIMIT 1", [actor.recipientId, idempotency]);
  const readable = await context(database, actor, portalId, issueId);
  if (replay) {
    if (replay.issue_id !== issueId || replay.intent_hash !== intendedHash) throw new ClientPortalDecisionError("client_portal_decision_invalid", "Idempotency key already belongs to a different decision intent.");
    return receipt(replay, readable.issue, true);
  }
  const { issue, policy, policyActor, policyPortal, recipient } = await context(database, actor, portalId, issueId, true);
  if (expectedIssueContentHash !== issue.content_hash) throw new ClientPortalDecisionError("client_portal_decision_stale", "Client Portal issue changed. Reload before submitting a decision.");
  const authorization = evaluateClientPortalPolicy({ actor: policyActor, action: decisionAction(decision), portal: policyPortal, issue: { id: issue.id, status: issue.status, isCurrent: true } });
  if (!authorization.allowed) throw new ClientPortalDecisionError("client_portal_decision_denied", "Recipient cannot submit this decision.");
  const existing = await first<{ id: string }>(database, "SELECT id FROM client_portal_decisions WHERE issue_id = ? AND recipient_id = ? AND voided_at IS NULL LIMIT 1", [issue.id, actor.recipientId]);
  if (existing) throw new ClientPortalDecisionError("client_portal_decision_duplicate", "Recipient already submitted a decision for this issue.");
  const timestamp = new Date().toISOString();
  const row: DecisionRow = { id: `decision_${randomUUID()}`, issue_id: issue.id, decision, note, signer_name: signerName, issue_content_hash: issue.content_hash, intent_hash: intendedHash, submitted_at: timestamp };
  const requiredApproverClause = policy.requiredRecipientIds.length ? `decision_row.recipient_id IN (${policy.requiredRecipientIds.map(() => "?").join(", ")})` : "approver.is_required_approver = 1";
  if (!database.batch) throw new ClientPortalDecisionError("client_portal_decision_write_failed", "Client Portal decision writes require D1 batch support.");
  try {
    const result = await database.batch([
      statement(database, `INSERT INTO client_portal_decisions (id, portal_id, issue_id, recipient_id, scope_kind, scope_key, decision, note, signer_name, signer_email_snapshot, signer_role_snapshot, issue_content_hash, intent_hash, idempotency_key, submitted_at)
        SELECT ?, ?, issue.id, ?, 'issue', 'issue', ?, ?, ?, ?, ?, issue.content_hash, ?, ?, ?
        FROM client_portal_issues issue
        JOIN client_portals portal ON portal.id = issue.portal_id AND portal.current_issue_id = issue.id
        WHERE issue.id = ? AND issue.portal_id = ? AND issue.content_hash = ?
          AND issue.status IN ('issued', 'under_review', 'changes_requested')
          AND (issue.valid_through IS NULL OR issue.valid_through >= ?)`, [row.id, portalId, actor.recipientId, decision, note, signerName, recipient.email_normalized, recipient.role_template, intendedHash, idempotency, timestamp, issue.id, portalId, issue.content_hash, timestamp.slice(0, 10)]),
      statement(database, `UPDATE client_portal_issues
        SET status = CASE
          WHEN EXISTS (SELECT 1 FROM client_portal_decisions decision_row JOIN client_portal_recipients approver ON approver.id = decision_row.recipient_id WHERE decision_row.issue_id = client_portal_issues.id AND decision_row.voided_at IS NULL AND ${requiredApproverClause} AND decision_row.decision = 'declined') THEN 'declined'
          WHEN EXISTS (SELECT 1 FROM client_portal_decisions decision_row WHERE decision_row.issue_id = client_portal_issues.id AND decision_row.voided_at IS NULL AND decision_row.decision = 'changes_requested') THEN 'changes_requested'
          WHEN (SELECT count(*) FROM client_portal_decisions decision_row JOIN client_portal_recipients approver ON approver.id = decision_row.recipient_id WHERE decision_row.issue_id = client_portal_issues.id AND decision_row.voided_at IS NULL AND ${requiredApproverClause} AND decision_row.decision = 'approved') >= ? THEN 'accepted'
          ELSE 'under_review'
        END
        WHERE id = ? AND content_hash = ? AND EXISTS (SELECT 1 FROM client_portal_decisions WHERE id = ?)`, [...policy.requiredRecipientIds, ...policy.requiredRecipientIds, policy.requiredApprovals, issue.id, issue.content_hash, row.id]),
      statement(database, "INSERT INTO client_portal_audit_events (id, workspace_id, portal_id, issue_id, actor_type, actor_id, event_type, visibility, metadata_json, occurred_at, created_at) SELECT ?, ?, ?, issue.id, 'system', NULL, 'issue_decision_status_updated', 'client_safe', json_object('decisionId', ?, 'status', issue.status), ?, ? FROM client_portal_issues issue WHERE issue.id = ? AND EXISTS (SELECT 1 FROM client_portal_decisions WHERE id = ?)", [randomUUID(), policyPortal.workspaceId, portalId, row.id, timestamp, timestamp, issue.id, row.id]),
      statement(database, "INSERT INTO client_portal_audit_events (id, workspace_id, portal_id, issue_id, actor_type, actor_id, event_type, visibility, metadata_json, occurred_at, created_at) SELECT ?, ?, ?, ?, 'recipient', ?, 'decision_submitted', 'client_safe', ?, ?, ? WHERE EXISTS (SELECT 1 FROM client_portal_decisions WHERE id = ?)", [randomUUID(), policyPortal.workspaceId, portalId, issue.id, actor.recipientId, JSON.stringify({ decision, decisionId: row.id, issueNumber: issue.issue_number }), timestamp, timestamp, row.id]),
      statement(database, "INSERT INTO client_portal_analytics_events (id, portal_id, issue_id, recipient_id, event_type, verified_human, occurred_at, metadata_json, created_at) SELECT ?, ?, ?, ?, 'decision_submitted', 1, ?, ?, ? WHERE EXISTS (SELECT 1 FROM client_portal_decisions WHERE id = ?)", [`analytics_${randomUUID()}`, portalId, issue.id, actor.recipientId, timestamp, JSON.stringify({ decisionId: row.id }), timestamp, row.id]),
      clientPortalOwnerNotificationStatement(database, { eventType: "decision_submitted", idempotencyKey: `decision:${row.id}:submitted`, issueId: issue.id, payload: { decision, decisionId: row.id }, portalId, requiredDecisionId: row.id, timestamp }),
    ]);
    if (result.some((entry) => entry.success === false)) throw new ClientPortalDecisionError("client_portal_decision_write_failed", "Client Portal decision write failed.");
    if (result[0]?.meta?.changes === 0) throw new ClientPortalDecisionError("client_portal_decision_stale", "Client Portal issue changed before the decision was recorded.");
  } catch (error) {
    const raced = await first<DecisionRow>(database, "SELECT id, issue_id, decision, note, signer_name, issue_content_hash, intent_hash, submitted_at FROM client_portal_decisions WHERE recipient_id = ? AND idempotency_key = ? LIMIT 1", [actor.recipientId, idempotency]);
    if (raced?.issue_id === issueId && raced.intent_hash === intendedHash) return receipt(raced, issue, true);
    throw error;
  }
  return receipt(row, issue, false);
}

export async function summarizeClientPortalDecisions({ actor, database, issueId, portalId }: { actor: ClientPortalRecipientActor; database: D1DatabaseLike; issueId: string; portalId: string }) {
  const { issue, policy, policyActor, policyPortal } = await context(database, actor, portalId, issueId);
  const authorization = evaluateClientPortalPolicy({ actor: policyActor, action: "decision:view", portal: policyPortal, issue: { id: issue.id, status: issue.status, isCurrent: true } });
  if (!authorization.allowed) throw new ClientPortalDecisionError("client_portal_decision_denied", "Recipient cannot view Client Portal decisions.");
  const requiredPredicate = policy.requiredRecipientIds.length ? `decision_row.recipient_id IN (${policy.requiredRecipientIds.map(() => "?").join(", ")})` : "recipient.is_required_approver = 1";
  const [result, requiredResult, ownReceipt] = await Promise.all([
    database.prepare<{ decision: ClientPortalDecision; total: number }>("SELECT decision, count(*) AS total FROM client_portal_decisions WHERE issue_id = ? AND voided_at IS NULL GROUP BY decision").bind(issue.id).all<{ decision: ClientPortalDecision; total: number }>(),
    database.prepare<{ decision: ClientPortalDecision; total: number }>(`SELECT decision_row.decision, count(*) AS total FROM client_portal_decisions decision_row JOIN client_portal_recipients recipient ON recipient.id = decision_row.recipient_id WHERE decision_row.issue_id = ? AND decision_row.voided_at IS NULL AND ${requiredPredicate} GROUP BY decision_row.decision`).bind(issue.id, ...policy.requiredRecipientIds).all<{ decision: ClientPortalDecision; total: number }>(),
    first<DecisionRow>(database, "SELECT id, issue_id, decision, note, signer_name, issue_content_hash, intent_hash, submitted_at FROM client_portal_decisions WHERE issue_id = ? AND recipient_id = ? AND voided_at IS NULL LIMIT 1", [issue.id, actor.recipientId]),
  ]);
  return {
    issueId: issue.id,
    issueStatus: issue.status,
    requiredApprovals: policy.requiredApprovals,
    counts: Object.fromEntries((result.results ?? []).map((row) => [row.decision, Number(row.total)])) as Partial<Record<ClientPortalDecision, number>>,
    requiredCounts: Object.fromEntries((requiredResult.results ?? []).map((row) => [row.decision, Number(row.total)])) as Partial<Record<ClientPortalDecision, number>>,
    ownReceipt: ownReceipt ? receipt(ownReceipt, issue, true) : null,
  };
}

export async function voidClientPortalDecision({ actor, database, decisionId, portalId, reason: rawReason }: { actor: ClientPortalInternalActor; database: D1DatabaseLike; decisionId: string; portalId: string; reason: string }) {
  const reason = text(rawReason, 500);
  if (!reason) throw new ClientPortalDecisionError("client_portal_decision_invalid", "A decision void reason is required.");
  const [portal, decision] = await Promise.all([
    first<PortalRow>(database, "SELECT id, workspace_id, project_id, status, current_issue_id FROM client_portals WHERE id = ? LIMIT 1", [portalId]),
    first<{ id: string; issue_id: string }>(database, "SELECT id, issue_id FROM client_portal_decisions WHERE id = ? AND portal_id = ? AND voided_at IS NULL LIMIT 1", [decisionId, portalId]),
  ]);
  if (!portal || !decision) throw new ClientPortalDecisionError("client_portal_decision_not_found", "Client Portal decision was not found.");
  const policyPortal: ClientPortalPolicyPortal = { id: portal.id, workspaceId: portal.workspace_id, projectId: portal.project_id, status: portal.status, allowAnonymousView: false };
  const authorization = evaluateClientPortalPolicy({ actor, action: "decision:void", portal: policyPortal, issue: { id: decision.issue_id, status: "issued", isCurrent: portal.current_issue_id === decision.issue_id } });
  if (!authorization.allowed) throw new ClientPortalDecisionError("client_portal_decision_denied", "Owner cannot void this Client Portal decision.");
  if (!database.batch) throw new ClientPortalDecisionError("client_portal_decision_write_failed", "Client Portal decision writes require D1 batch support.");
  const timestamp = new Date().toISOString();
  const result = await database.batch([
    statement(database, "UPDATE client_portal_decisions SET voided_at = ?, voided_by = ?, void_reason = ? WHERE id = ? AND voided_at IS NULL", [timestamp, actor.userId, reason, decision.id]),
    statement(database, "INSERT INTO client_portal_audit_events (id, workspace_id, portal_id, issue_id, actor_type, actor_id, event_type, visibility, metadata_json, occurred_at, created_at) VALUES (?, ?, ?, ?, 'internal_user', ?, 'decision_voided', 'owner', ?, ?, ?)", [randomUUID(), portal.workspace_id, portal.id, decision.issue_id, actor.userId, JSON.stringify({ decisionId: decision.id }), timestamp, timestamp]),
  ]);
  if (result.some((entry) => entry.success === false)) throw new ClientPortalDecisionError("client_portal_decision_write_failed", "Client Portal decision void failed.");
  return { id: decision.id, voided: true };
}
