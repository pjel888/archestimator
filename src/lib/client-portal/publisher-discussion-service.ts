import "server-only";

import { randomUUID } from "node:crypto";

import type { D1DatabaseLike, D1PreparedStatementLike, D1Value } from "@/lib/cloudflare/d1";
import type { ClientPortalDiscussionTargetKind } from "@/lib/client-portal/contracts";
import { evaluateClientPortalPolicy, type ClientPortalInternalActor, type ClientPortalPolicyPortal } from "@/lib/client-portal/policy";
import { sanitizeSharedLinkRecipientText } from "@/lib/share/sanitize-recipient-text";

type PortalRow = { id: string; workspace_id: string; project_id: string; status: "draft" | "ready" | "live" | "access_off" | "archived"; current_issue_id: string | null };
type IssueRow = { id: string; status: "issued" | "under_review" | "changes_requested" | "accepted" | "declined" | "superseded" | "withdrawn" | "archived" };
type ThreadRow = {
  id: string;
  issue_id: string | null;
  section_key: string | null;
  target_kind: ClientPortalDiscussionTargetKind;
  target_public_id: string | null;
  target_label: string;
  target_secondary_label: string | null;
  subject: string;
  status: "open" | "resolved" | "archived" | "closed_by_supersession" | "requires_revalidation";
  waiting_state: "waiting_on_owner" | "waiting_on_client" | "no_response_required";
  assignee_user_id: string | null;
  created_by_actor_id: string;
  created_at: string;
  updated_at: string;
};
type ExistingMessage = { body: string; id: string };
type MessageRow = { author_snapshot_json: string; body: string; created_at: string; edited_at: string | null; id: string; tombstoned_at: string | null; visibility: "client" | "internal" };

export type PublisherDiscussionThread = {
  assigneeUserId: string | null;
  createdAt: string;
  id: string;
  issueId: string | null;
  sectionId: string | null;
  status: ThreadRow["status"];
  subject: string;
  target: { kind: ClientPortalDiscussionTargetKind; label: string; publicId: string | null; secondaryLabel: string | null };
  updatedAt: string;
  waitingState: ThreadRow["waiting_state"];
};

export type PublisherDiscussionMessage = {
  body: string;
  createdAt: string;
  editedAt: string | null;
  id: string;
  side: "client" | "owner";
  tombstonedAt: string | null;
  visibility: "client" | "internal";
};

export class PublisherDiscussionError extends Error {
  constructor(
    readonly code: "client_portal_batch_required" | "client_portal_discussion_denied" | "client_portal_discussion_invalid" | "client_portal_discussion_not_found" | "client_portal_discussion_stale" | "client_portal_discussion_write_failed",
    message: string,
  ) { super(message); }
}

function statement(database: D1DatabaseLike, sql: string, values: D1Value[]): D1PreparedStatementLike {
  return database.prepare(sql).bind(...values);
}

async function first<T>(database: D1DatabaseLike, sql: string, values: D1Value[]): Promise<T | null> {
  return database.prepare<T>(sql).bind(...values).first<T>();
}

function requireText(value: string, label: string, maxLength: number) {
  const sanitized = sanitizeSharedLinkRecipientText(value, maxLength);
  if (!sanitized) throw new PublisherDiscussionError("client_portal_discussion_invalid", `${label} is required.`);
  return sanitized;
}

function requireIdempotencyKey(value: string) {
  const key = value.trim();
  if (!key || key.length > 120) throw new PublisherDiscussionError("client_portal_discussion_invalid", "A valid idempotency key is required.");
  return key;
}

function authorSnapshot(actor: ClientPortalInternalActor) {
  return JSON.stringify({ role: actor.projectRole, side: "owner" });
}

async function runBatch(database: D1DatabaseLike, statements: D1PreparedStatementLike[]) {
  if (!database.batch) throw new PublisherDiscussionError("client_portal_batch_required", "Client Portal discussion writes require D1 batch support.");
  const result = await database.batch(statements);
  if (result.some((entry) => entry.success === false)) throw new PublisherDiscussionError("client_portal_discussion_write_failed", "Client Portal discussion write failed.");
}

async function policyPortal(database: D1DatabaseLike, actor: ClientPortalInternalActor, portalId: string) {
  const portal = await first<PortalRow>(database, "SELECT id, workspace_id, project_id, status, current_issue_id FROM client_portals WHERE id = ? LIMIT 1", [portalId]);
  if (!portal) throw new PublisherDiscussionError("client_portal_discussion_not_found", "Client Portal was not found.");
  const policy: ClientPortalPolicyPortal = { id: portal.id, workspaceId: portal.workspace_id, projectId: portal.project_id, status: portal.status, allowAnonymousView: false };
  const decision = evaluateClientPortalPolicy({ actor, action: "thread:view", portal: policy });
  if (!decision.allowed) throw new PublisherDiscussionError("client_portal_discussion_denied", "Owner cannot access this Client Portal discussion.");
  return { portal, policy };
}

function authorize(actor: ClientPortalInternalActor, action: "internal_note:create" | "thread:assign" | "thread:carry_forward" | "thread:reopen" | "thread:reply" | "thread:resolve" | "thread:view", portal: ClientPortalPolicyPortal, thread: ThreadRow) {
  const decision = evaluateClientPortalPolicy({
    actor,
    action,
    portal,
    thread: { portalId: portal.id, issueId: thread.issue_id, audience: "client", status: thread.status, creatorActorId: thread.created_by_actor_id },
  });
  if (!decision.allowed) throw new PublisherDiscussionError("client_portal_discussion_denied", "Owner cannot perform this Client Portal discussion action.");
}

async function clientThread(database: D1DatabaseLike, portalId: string, threadId: string) {
  const thread = await first<ThreadRow>(database, "SELECT id, issue_id, section_key, target_kind, target_public_id, target_label, target_secondary_label, subject, status, waiting_state, assignee_user_id, created_by_actor_id, created_at, updated_at FROM client_portal_threads WHERE id = ? AND portal_id = ? AND audience = 'client' LIMIT 1", [threadId, portalId]);
  if (!thread) throw new PublisherDiscussionError("client_portal_discussion_not_found", "Client Portal discussion was not found.");
  return thread;
}

function recipientMentionIds(value: readonly string[] | undefined) {
  const ids = [...new Set((value ?? []).map((entry) => entry.trim()).filter(Boolean))];
  if (ids.length > 20 || ids.some((entry) => entry.length > 128)) throw new PublisherDiscussionError("client_portal_discussion_invalid", "Discussion mentions are invalid.");
  return ids;
}

async function activeRecipientMentionIds(database: D1DatabaseLike, portalId: string, recipientIds: readonly string[]) {
  if (!recipientIds.length) return [];
  const placeholders = recipientIds.map(() => "?").join(", ");
  const result = await database.prepare<{ id: string }>(`SELECT id FROM client_portal_recipients WHERE portal_id = ? AND status = 'active' AND id IN (${placeholders})`).bind(portalId, ...recipientIds).all<{ id: string }>();
  const activeIds = result.results?.map((recipient) => recipient.id) ?? [];
  if (activeIds.length !== recipientIds.length) throw new PublisherDiscussionError("client_portal_discussion_invalid", "Discussion mentions must be active portal recipients.");
  return activeIds;
}

function recipientMentionStatements(database: D1DatabaseLike, messageId: string, recipientIds: readonly string[], timestamp: string) {
  return recipientIds.map((recipientId) => statement(database, "INSERT INTO client_portal_message_mentions (message_id, mentioned_actor_type, mentioned_actor_id, created_at) VALUES (?, 'recipient', ?, ?)", [messageId, recipientId, timestamp]));
}

export async function listPublisherDiscussionThreads({ actor, database, portalId }: { actor: ClientPortalInternalActor; database: D1DatabaseLike; portalId: string }): Promise<PublisherDiscussionThread[]> {
  const { portal } = await policyPortal(database, actor, portalId);
  const result = await database.prepare<ThreadRow>("SELECT id, issue_id, section_key, target_kind, target_public_id, target_label, target_secondary_label, subject, status, waiting_state, assignee_user_id, created_by_actor_id, created_at, updated_at FROM client_portal_threads WHERE portal_id = ? AND audience = 'client' ORDER BY CASE waiting_state WHEN 'waiting_on_owner' THEN 0 ELSE 1 END, updated_at DESC, id DESC").bind(portal.id).all<ThreadRow>();
  return (result.results ?? []).map((thread) => ({
    id: thread.id,
    issueId: thread.issue_id,
    sectionId: thread.section_key,
    subject: thread.subject,
    status: thread.status,
    waitingState: thread.waiting_state,
    assigneeUserId: thread.assignee_user_id,
    createdAt: thread.created_at,
    updatedAt: thread.updated_at,
    target: { kind: thread.target_kind, publicId: thread.target_public_id, label: thread.target_label, secondaryLabel: thread.target_secondary_label },
  }));
}

export async function listPublisherDiscussionMessages({ actor, database, portalId, threadId }: { actor: ClientPortalInternalActor; database: D1DatabaseLike; portalId: string; threadId: string }): Promise<PublisherDiscussionMessage[]> {
  const { policy } = await policyPortal(database, actor, portalId);
  const thread = await clientThread(database, portalId, threadId);
  authorize(actor, "thread:view", policy, thread);
  const result = await database.prepare<MessageRow>("SELECT id, author_snapshot_json, body, created_at, edited_at, tombstoned_at, visibility FROM client_portal_messages WHERE thread_id = ? ORDER BY created_at ASC, id ASC").bind(thread.id).all<MessageRow>();
  return (result.results ?? []).map((message) => {
    let snapshot: Record<string, unknown> = {};
    try {
      const parsed = JSON.parse(message.author_snapshot_json) as unknown;
      if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) snapshot = parsed as Record<string, unknown>;
    } catch { }
    return {
      id: message.id,
      body: message.body,
      createdAt: message.created_at,
      editedAt: message.edited_at,
      tombstonedAt: message.tombstoned_at,
      visibility: message.visibility,
      side: snapshot.side === "owner" ? "owner" : "client",
    };
  });
}

export async function replyToClientPortalThreadAsOwner({ actor, body: rawBody, database, idempotencyKey: rawIdempotencyKey, mentionedRecipientIds, portalId, threadId }: { actor: ClientPortalInternalActor; body: string; database: D1DatabaseLike; idempotencyKey: string; mentionedRecipientIds?: readonly string[]; portalId: string; threadId: string }) {
  const body = requireText(rawBody, "Message", 4_000);
  const idempotencyKey = requireIdempotencyKey(rawIdempotencyKey);
  const { policy } = await policyPortal(database, actor, portalId);
  const thread = await clientThread(database, portalId, threadId);
  authorize(actor, "thread:reply", policy, thread);
  const replay = await first<ExistingMessage>(database, "SELECT id, body FROM client_portal_messages WHERE thread_id = ? AND actor_type = 'internal_user' AND actor_id = ? AND idempotency_key = ? LIMIT 1", [thread.id, actor.userId, idempotencyKey]);
  if (replay) {
    if (replay.body !== body) throw new PublisherDiscussionError("client_portal_discussion_invalid", "Idempotency key already belongs to a different message.");
    return { id: replay.id, replayed: true };
  }
  const mentions = await activeRecipientMentionIds(database, portalId, recipientMentionIds(mentionedRecipientIds));
  const timestamp = new Date().toISOString();
  const messageId = `message_${randomUUID()}`;
  await runBatch(database, [
    statement(database, "INSERT INTO client_portal_messages (id, thread_id, actor_type, actor_id, author_snapshot_json, body, reply_to_message_id, idempotency_key, visibility, created_at) VALUES (?, ?, 'internal_user', ?, ?, ?, NULL, ?, 'client', ?)", [messageId, thread.id, actor.userId, authorSnapshot(actor), body, idempotencyKey, timestamp]),
    ...recipientMentionStatements(database, messageId, mentions, timestamp),
    statement(database, "UPDATE client_portal_threads SET status = 'open', waiting_state = 'waiting_on_client', updated_at = ? WHERE id = ?", [timestamp, thread.id]),
    statement(database, "INSERT INTO client_portal_thread_reads (thread_id, actor_type, actor_id, last_read_message_id, read_at) VALUES (?, 'internal_user', ?, ?, ?) ON CONFLICT(thread_id, actor_type, actor_id) DO UPDATE SET last_read_message_id = excluded.last_read_message_id, read_at = excluded.read_at", [thread.id, actor.userId, messageId, timestamp]),
  ]);
  return { id: messageId, replayed: false };
}

export async function addClientPortalInternalNote({ actor, body: rawBody, database, idempotencyKey: rawIdempotencyKey, portalId, threadId }: { actor: ClientPortalInternalActor; body: string; database: D1DatabaseLike; idempotencyKey: string; portalId: string; threadId: string }) {
  const body = requireText(rawBody, "Internal note", 4_000);
  const idempotencyKey = requireIdempotencyKey(rawIdempotencyKey);
  const { policy } = await policyPortal(database, actor, portalId);
  const thread = await clientThread(database, portalId, threadId);
  authorize(actor, "internal_note:create", policy, thread);
  const replay = await first<ExistingMessage>(database, "SELECT id, body FROM client_portal_messages WHERE thread_id = ? AND actor_type = 'internal_user' AND actor_id = ? AND idempotency_key = ? LIMIT 1", [thread.id, actor.userId, idempotencyKey]);
  if (replay) {
    if (replay.body !== body) throw new PublisherDiscussionError("client_portal_discussion_invalid", "Idempotency key already belongs to a different message.");
    return { id: replay.id, replayed: true };
  }
  const timestamp = new Date().toISOString();
  const messageId = `message_${randomUUID()}`;
  await runBatch(database, [
    statement(database, "INSERT INTO client_portal_messages (id, thread_id, actor_type, actor_id, author_snapshot_json, body, reply_to_message_id, idempotency_key, visibility, created_at) VALUES (?, ?, 'internal_user', ?, ?, ?, NULL, ?, 'internal', ?)", [messageId, thread.id, actor.userId, authorSnapshot(actor), body, idempotencyKey, timestamp]),
    statement(database, "UPDATE client_portal_threads SET updated_at = ? WHERE id = ?", [timestamp, thread.id]),
  ]);
  return { id: messageId, replayed: false };
}

export async function assignClientPortalThread({ actor, assigneeUserId, database, portalId, threadId }: { actor: ClientPortalInternalActor; assigneeUserId: string | null; database: D1DatabaseLike; portalId: string; threadId: string }) {
  const { policy } = await policyPortal(database, actor, portalId);
  const thread = await clientThread(database, portalId, threadId);
  authorize(actor, "thread:assign", policy, thread);
  if (assigneeUserId !== null && (!assigneeUserId.trim() || assigneeUserId.length > 128)) throw new PublisherDiscussionError("client_portal_discussion_invalid", "Discussion assignee is invalid.");
  await runBatch(database, [statement(database, "UPDATE client_portal_threads SET assignee_user_id = ?, updated_at = ? WHERE id = ?", [assigneeUserId, new Date().toISOString(), thread.id])]);
}

export async function setClientPortalThreadStatusAsOwner({ actor, database, portalId, status, threadId }: { actor: ClientPortalInternalActor; database: D1DatabaseLike; portalId: string; status: "open" | "resolved"; threadId: string }) {
  const { policy } = await policyPortal(database, actor, portalId);
  const thread = await clientThread(database, portalId, threadId);
  if (thread.status !== "open" && thread.status !== "resolved") throw new PublisherDiscussionError("client_portal_discussion_stale", "Client Portal discussion cannot be updated.");
  authorize(actor, status === "resolved" ? "thread:resolve" : "thread:reopen", policy, thread);
  const timestamp = new Date().toISOString();
  await runBatch(database, [statement(database, "UPDATE client_portal_threads SET status = ?, waiting_state = 'no_response_required', resolved_at = ?, resolved_by_actor_id = ?, updated_at = ? WHERE id = ?", [status, status === "resolved" ? timestamp : null, status === "resolved" ? actor.userId : null, timestamp, thread.id])]);
  return { id: thread.id, status };
}

export async function carryForwardClientPortalThread({ actor, database, portalId, sourceThreadId, targetIssueId }: { actor: ClientPortalInternalActor; database: D1DatabaseLike; portalId: string; sourceThreadId: string; targetIssueId: string }) {
  const { portal, policy } = await policyPortal(database, actor, portalId);
  const source = await clientThread(database, portalId, sourceThreadId);
  authorize(actor, "thread:carry_forward", policy, source);
  const targetIssue = await first<IssueRow>(database, "SELECT id, status FROM client_portal_issues WHERE id = ? AND portal_id = ? LIMIT 1", [targetIssueId, portal.id]);
  if (!targetIssue || portal.current_issue_id !== targetIssue.id || targetIssue.status === "withdrawn" || targetIssue.status === "archived") throw new PublisherDiscussionError("client_portal_discussion_stale", "Target Client Portal issue is unavailable.");
  const timestamp = new Date().toISOString();
  const threadId = `thread_${randomUUID()}`;
  await runBatch(database, [
    statement(database, "INSERT INTO client_portal_threads (id, portal_id, issue_id, section_key, target_kind, target_public_id, target_label, target_secondary_label, subject, audience, status, waiting_state, assignee_user_id, created_by_actor_type, created_by_actor_id, carried_forward_from_thread_id, created_at, updated_at) VALUES (?, ?, ?, NULL, ?, ?, ?, ?, ?, 'client', 'requires_revalidation', 'no_response_required', ?, 'internal_user', ?, ?, ?, ?)", [threadId, portal.id, targetIssue.id, source.target_kind, source.target_public_id, source.target_label, source.target_secondary_label, source.subject, source.assignee_user_id, actor.userId, source.id, timestamp, timestamp]),
    statement(database, "UPDATE client_portal_threads SET status = 'closed_by_supersession', waiting_state = 'no_response_required', updated_at = ? WHERE id = ?", [timestamp, source.id]),
  ]);
  return { id: threadId, carriedForwardFromThreadId: source.id };
}
