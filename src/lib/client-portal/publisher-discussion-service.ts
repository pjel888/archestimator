import "server-only";

import { randomUUID } from "node:crypto";

import type { D1DatabaseLike, D1PreparedStatementLike, D1Value } from "@/lib/cloudflare/d1";
import type { ClientPortalDiscussionTargetKind } from "@/lib/client-portal/contracts";
import { resolveClientPortalIssuedTarget } from "@/lib/client-portal/issued-target-resolver";
import { evaluateClientPortalPolicy, type ClientPortalInternalActor, type ClientPortalPolicyPortal } from "@/lib/client-portal/policy";
import { prepareProjectCommitmentEventWrites } from "@/lib/project-ledger/event-service";
import { sanitizeSharedLinkRecipientText } from "@/lib/share/sanitize-recipient-text";

type PortalRow = { id: string; workspace_id: string; project_id: string; status: "draft" | "ready" | "live" | "access_off" | "archived"; current_issue_id: string | null };
type IssueRow = { id: string; issue_number: number; status: "issued" | "under_review" | "changes_requested" | "accepted" | "declined" | "superseded" | "withdrawn" | "archived"; version_label: string };
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

function policyStrings(value: unknown) {
  return Array.isArray(value) ? value.filter((entry): entry is string => typeof entry === "string" && Boolean(entry.trim())) : [];
}

async function discussionCommitmentContext(database: D1DatabaseLike, portal: PortalRow, thread: ThreadRow) {
  if (!thread.issue_id) return null;
  const issue = await first<IssueRow>(database, "SELECT id, issue_number, status, version_label FROM client_portal_issues WHERE id = ? AND portal_id = ? LIMIT 1", [thread.issue_id, portal.id]);
  if (!issue) return null;
  let sectionPolicy: Record<string, unknown> = {};
  if (thread.section_key) {
    const section = await first<{ policy_snapshot_json: string }>(database, "SELECT policy_snapshot_json FROM client_portal_issue_sections WHERE id = ? AND issue_id = ? LIMIT 1", [thread.section_key, issue.id]);
    try {
      const parsed = section ? JSON.parse(section.policy_snapshot_json) as unknown : null;
      if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) sectionPolicy = parsed as Record<string, unknown>;
    } catch { }
  }
  const allowedOrganizations = policyStrings(sectionPolicy.allowedOrganizations);
  const allowedRecipientIds = policyStrings(sectionPolicy.allowedRecipientIds);
  return {
    issue,
    exposurePolicy: {
      capability: "timeline:view",
      issueNumber: issue.issue_number,
      ...(allowedOrganizations.length ? { allowedOrganizations } : {}),
      ...(allowedRecipientIds.length ? { allowedRecipientIds } : {}),
    },
  };
}

function ownerDiscussionEventStatements(input: {
  actor: ClientPortalInternalActor;
  context: NonNullable<Awaited<ReturnType<typeof discussionCommitmentContext>>>;
  correlationId: string;
  database: D1DatabaseLike;
  eventType: "discussion.reopened" | "discussion.resolved" | "discussion.started" | "discussion.updated";
  expose?: boolean;
  internalMetadata: Record<string, unknown>;
  occurredAt: string;
  portal: PortalRow;
  summary: string | null;
  title: string;
}) {
  return prepareProjectCommitmentEventWrites({
    actor: { actorId: input.actor.userId, actorType: "internal_user", domainRoleSnapshot: input.actor.projectRole },
    clientSafeSnapshot: {
      issueNumber: input.context.issue.issue_number,
      status: input.context.issue.status,
      versionLabel: input.context.issue.version_label,
    },
    correlationId: input.correlationId,
    database: input.database,
    eventType: input.eventType,
    exposure: input.expose === false ? null : {
      exposureKind: "automatic",
      policySnapshot: input.context.exposurePolicy,
      portalId: input.portal.id,
      publicEventId: `discussion_event_${randomUUID()}`,
    },
    internalMetadata: input.internalMetadata,
    occurredAt: input.occurredAt,
    originPortalId: input.portal.id,
    projectId: input.portal.project_id,
    source: { issueId: input.context.issue.id, sourceType: "issue" },
    summary: input.summary,
    title: input.title,
    workspaceId: input.portal.workspace_id,
  }).statements;
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

async function activeThreadSubscriberIds(database: D1DatabaseLike, portalId: string, threadId: string) {
  const result = await database.prepare<{ id: string }>(`SELECT recipient.id
    FROM client_portal_thread_subscriptions subscription
    JOIN client_portal_recipients recipient ON recipient.id = subscription.actor_id
    WHERE subscription.thread_id = ?
      AND subscription.actor_type = 'recipient'
      AND subscription.unsubscribed_at IS NULL
      AND recipient.portal_id = ?
      AND recipient.status = 'active'
    ORDER BY recipient.id`).bind(threadId, portalId).all<{ id: string }>();
  return result.results?.map((recipient) => recipient.id) ?? [];
}

function recipientMentionStatements(database: D1DatabaseLike, messageId: string, recipientIds: readonly string[], timestamp: string) {
  return recipientIds.map((recipientId) => statement(database, "INSERT INTO client_portal_message_mentions (message_id, mentioned_actor_type, mentioned_actor_id, created_at) VALUES (?, 'recipient', ?, ?)", [messageId, recipientId, timestamp]));
}

function recipientNotificationStatements(database: D1DatabaseLike, input: { issueId: string; messageId: string; portalId: string; recipientIds: readonly string[]; threadId: string; timestamp: string }) {
  return input.recipientIds.map((recipientId) => statement(database, `INSERT INTO client_portal_notification_outbox
    (id, portal_id, issue_id, recipient_id, event_type, idempotency_key, payload_json, state, attempt_count, next_attempt_at, created_at, updated_at)
    VALUES (?, ?, ?, ?, 'message_created', ?, ?, 'pending', 0, ?, ?, ?)
    ON CONFLICT(portal_id, idempotency_key) DO NOTHING`, [
    `outbox_${randomUUID()}`,
    input.portalId,
    input.issueId,
    recipientId,
    `message:${input.messageId}:recipient:${recipientId}`,
    JSON.stringify({ audience: "recipient", messageId: input.messageId, recipientId, threadId: input.threadId }),
    input.timestamp,
    input.timestamp,
    input.timestamp,
  ]));
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
  const { policy, portal } = await policyPortal(database, actor, portalId);
  const thread = await clientThread(database, portalId, threadId);
  authorize(actor, "thread:reply", policy, thread);
  const replay = await first<ExistingMessage>(database, "SELECT id, body FROM client_portal_messages WHERE thread_id = ? AND actor_type = 'internal_user' AND actor_id = ? AND idempotency_key = ? LIMIT 1", [thread.id, actor.userId, idempotencyKey]);
  if (replay) {
    if (replay.body !== body) throw new PublisherDiscussionError("client_portal_discussion_invalid", "Idempotency key already belongs to a different message.");
    return { id: replay.id, replayed: true };
  }
  const mentions = await activeRecipientMentionIds(database, portalId, recipientMentionIds(mentionedRecipientIds));
  const subscribers = await activeThreadSubscriberIds(database, portalId, thread.id);
  const notificationRecipientIds = [...new Set([...subscribers, ...mentions])].sort();
  const timestamp = new Date().toISOString();
  const messageId = `message_${randomUUID()}`;
  const commitmentContext = await discussionCommitmentContext(database, portal, thread);
  const commitmentStatements = commitmentContext ? ownerDiscussionEventStatements({
    actor,
    context: commitmentContext,
    correlationId: `discussion:${thread.id}:message:${messageId}`,
    database,
    eventType: "discussion.updated",
    internalMetadata: { messageId, threadId: thread.id },
    occurredAt: timestamp,
    portal,
    summary: thread.target_label,
    title: `Discussion updated: ${thread.subject}`,
  }) : [];
  await runBatch(database, [
    statement(database, "INSERT INTO client_portal_messages (id, thread_id, actor_type, actor_id, author_snapshot_json, body, reply_to_message_id, idempotency_key, visibility, created_at) VALUES (?, ?, 'internal_user', ?, ?, ?, NULL, ?, 'client', ?)", [messageId, thread.id, actor.userId, authorSnapshot(actor), body, idempotencyKey, timestamp]),
    ...recipientMentionStatements(database, messageId, mentions, timestamp),
    statement(database, "UPDATE client_portal_threads SET status = 'open', waiting_state = 'waiting_on_client', updated_at = ? WHERE id = ?", [timestamp, thread.id]),
    statement(database, "INSERT INTO client_portal_thread_reads (thread_id, actor_type, actor_id, last_read_message_id, read_at) VALUES (?, 'internal_user', ?, ?, ?) ON CONFLICT(thread_id, actor_type, actor_id) DO UPDATE SET last_read_message_id = excluded.last_read_message_id, read_at = excluded.read_at", [thread.id, actor.userId, messageId, timestamp]),
    statement(database, "INSERT INTO client_portal_audit_events (id, workspace_id, portal_id, issue_id, actor_type, actor_id, event_type, visibility, metadata_json, occurred_at, created_at) VALUES (?, ?, ?, ?, 'internal_user', ?, 'message_created', 'client_safe', ?, ?, ?)", [randomUUID(), portal.workspace_id, portal.id, thread.issue_id, actor.userId, JSON.stringify({ messageId, threadId: thread.id }), timestamp, timestamp]),
    ...recipientNotificationStatements(database, { issueId: thread.issue_id!, messageId, portalId: portal.id, recipientIds: notificationRecipientIds, threadId: thread.id, timestamp }),
    ...commitmentStatements,
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
  // The TS type is erased at runtime for server actions; validate the enum explicitly so a
  // malformed client can't write an arbitrary status string to the thread.
  if (status !== "open" && status !== "resolved") throw new PublisherDiscussionError("client_portal_discussion_invalid", "Status must be 'open' or 'resolved'.");
  const { policy, portal } = await policyPortal(database, actor, portalId);
  const thread = await clientThread(database, portalId, threadId);
  if (thread.status !== "open" && thread.status !== "resolved") throw new PublisherDiscussionError("client_portal_discussion_stale", "Client Portal discussion cannot be updated.");
  authorize(actor, status === "resolved" ? "thread:resolve" : "thread:reopen", policy, thread);
  const timestamp = new Date().toISOString();
  const commitmentContext = await discussionCommitmentContext(database, portal, thread);
  const commitmentStatements = commitmentContext ? ownerDiscussionEventStatements({
    actor,
    context: commitmentContext,
    correlationId: `discussion:${thread.id}:status:${status}:${timestamp}`,
    database,
    eventType: status === "resolved" ? "discussion.resolved" : "discussion.reopened",
    internalMetadata: { threadId: thread.id },
    occurredAt: timestamp,
    portal,
    summary: thread.target_label,
    title: status === "resolved" ? `Discussion resolved: ${thread.subject}` : `Discussion reopened: ${thread.subject}`,
  }) : [];
  await runBatch(database, [
    statement(database, "UPDATE client_portal_threads SET status = ?, waiting_state = 'no_response_required', resolved_at = ?, resolved_by_actor_id = ?, updated_at = ? WHERE id = ?", [status, status === "resolved" ? timestamp : null, status === "resolved" ? actor.userId : null, timestamp, thread.id]),
    ...commitmentStatements,
  ]);
  return { id: thread.id, status };
}

export async function carryForwardClientPortalThread({ actor, database, portalId, sourceThreadId, targetIssueId }: { actor: ClientPortalInternalActor; database: D1DatabaseLike; portalId: string; sourceThreadId: string; targetIssueId: string }) {
  const { portal, policy } = await policyPortal(database, actor, portalId);
  const source = await clientThread(database, portalId, sourceThreadId);
  authorize(actor, "thread:carry_forward", policy, source);
  const targetIssue = await first<IssueRow>(database, "SELECT id, issue_number, status, version_label FROM client_portal_issues WHERE id = ? AND portal_id = ? LIMIT 1", [targetIssueId, portal.id]);
  if (!targetIssue || portal.current_issue_id !== targetIssue.id || targetIssue.status === "withdrawn" || targetIssue.status === "archived") throw new PublisherDiscussionError("client_portal_discussion_stale", "Target Client Portal issue is unavailable.");
  let semanticPublicId = source.target_kind === "issue" ? targetIssue.id : source.target_public_id;
  if (source.target_kind === "section" && source.target_public_id) {
    const targetSection = await first<{ id: string }>(database, "SELECT target.id FROM client_portal_issue_sections source JOIN client_portal_issue_sections target ON target.section_key = source.section_key WHERE source.id = ? AND target.issue_id = ? LIMIT 1", [source.target_public_id, targetIssue.id]);
    semanticPublicId = targetSection?.id ?? null;
  }
  const resolvedTarget = await resolveClientPortalIssuedTarget({
    database,
    issueId: targetIssue.id,
    portalId: portal.id,
    target: { kind: source.target_kind, publicId: semanticPublicId },
  });
  const target = resolvedTarget ?? { kind: "issue" as const, publicId: targetIssue.id, label: targetIssue.version_label || "Current issue", secondaryLabel: "Original target requires owner review", sectionId: null };
  const revalidated = Boolean(resolvedTarget);
  const timestamp = new Date().toISOString();
  const threadId = `thread_${randomUUID()}`;
  const sourceContext = await discussionCommitmentContext(database, portal, source);
  const targetThread: ThreadRow = {
    ...source,
    id: threadId,
    issue_id: targetIssue.id,
    section_key: target.sectionId,
    target_kind: target.kind,
    target_public_id: target.publicId,
    target_label: target.label,
    target_secondary_label: target.secondaryLabel,
  };
  const targetContext = await discussionCommitmentContext(database, portal, targetThread);
  const sourceEventStatements = sourceContext ? ownerDiscussionEventStatements({
    actor,
    context: sourceContext,
    correlationId: `discussion:${source.id}:carried-forward:${threadId}`,
    database,
    eventType: "discussion.updated",
    internalMetadata: { carriedForwardToThreadId: threadId, threadId: source.id },
    occurredAt: timestamp,
    portal,
    summary: source.target_label,
    title: `Discussion carried forward: ${source.subject}`,
  }) : [];
  const targetEventStatements = targetContext ? ownerDiscussionEventStatements({
    actor,
    context: targetContext,
    correlationId: `discussion:${threadId}:started:carry-forward`,
    database,
    eventType: "discussion.started",
    expose: revalidated,
    internalMetadata: { carriedForwardFromThreadId: source.id, revalidated, threadId },
    occurredAt: timestamp,
    portal,
    summary: target.label,
    title: `Discussion carried forward: ${source.subject}`,
  }) : [];
  await runBatch(database, [
    statement(database, "INSERT INTO client_portal_threads (id, portal_id, issue_id, section_key, target_kind, target_public_id, target_label, target_secondary_label, subject, audience, status, waiting_state, assignee_user_id, created_by_actor_type, created_by_actor_id, carried_forward_from_thread_id, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'client', ?, ?, ?, 'internal_user', ?, ?, ?, ?)", [threadId, portal.id, targetIssue.id, target.sectionId, target.kind, target.publicId, target.label, target.secondaryLabel, source.subject, revalidated ? "open" : "requires_revalidation", revalidated ? "waiting_on_owner" : "no_response_required", source.assignee_user_id, actor.userId, source.id, timestamp, timestamp]),
    statement(database, "UPDATE client_portal_threads SET status = 'closed_by_supersession', waiting_state = 'no_response_required', updated_at = ? WHERE id = ?", [timestamp, source.id]),
    ...sourceEventStatements,
    ...targetEventStatements,
  ]);
  return { id: threadId, carriedForwardFromThreadId: source.id, revalidated };
}
