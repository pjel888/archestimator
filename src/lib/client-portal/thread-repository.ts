import "server-only";

import { randomUUID } from "node:crypto";

import type { D1DatabaseLike, D1PreparedStatementLike, D1Value } from "@/lib/cloudflare/d1";
import { CLIENT_PORTAL_DISCUSSION_TARGET_KINDS, type ClientPortalDiscussionTargetKind } from "@/lib/client-portal/contracts";
import { resolveClientPortalIssuedTarget } from "@/lib/client-portal/issued-target-resolver";
import { clientPortalOwnerNotificationStatement } from "@/lib/client-portal/owner-notification";
import { evaluateClientPortalPolicy, type ClientPortalPolicyPortal, type ClientPortalPolicySection, type ClientPortalRecipientActor } from "@/lib/client-portal/policy";
import { sanitizeSharedLinkRecipientText } from "@/lib/share/sanitize-recipient-text";
import { prepareProjectCommitmentEventWrites } from "@/lib/project-ledger/event-service";

type PortalRow = { id: string; workspace_id: string; project_id: string; status: "draft" | "ready" | "live" | "access_off" | "archived"; current_issue_id: string | null };
type IssueRow = { id: string; issue_number: number; status: "issued" | "under_review" | "changes_requested" | "accepted" | "declined" | "superseded" | "withdrawn" | "archived"; valid_through: string | null; version_label: string };
type SectionRow = { id: string; policy_snapshot_json: string };
type ThreadRow = { id: string; issue_id: string | null; section_key: string | null; target_kind: ClientPortalDiscussionTargetKind; target_public_id: string | null; target_label: string; target_secondary_label: string | null; subject: string; status: "open" | "resolved" | "archived" | "closed_by_supersession" | "requires_revalidation"; waiting_state: "waiting_on_owner" | "waiting_on_client" | "no_response_required"; created_by_actor_id: string; created_at: string; updated_at: string };
type ExistingMessage = { body: string; thread_id: string };
type RecipientMessageRow = { id: string; created_at: string; tombstoned_at: string | null; thread_id: string };
type ClientVisibleMessageRow = { author_snapshot_json: string; body: string; created_at: string; edited_at: string | null; id: string; tombstoned_at: string | null };
type ThreadSummaryRow = ThreadRow & { issue_status: IssueRow["status"] | null; issue_valid_through: string | null; section_policy_snapshot_json: string | null; unread_count: number };

const CLIENT_PORTAL_THREAD_PAGE_SIZE = 25;
const CLIENT_PORTAL_THREAD_PAGE_LIMIT = 50;

type ClientPortalPageCursor = { id: string; timestamp: string };

export type ClientPortalRecipientThreadSummary = {
  createdAt: string;
  id: string;
  issueId: string | null;
  sectionId: string | null;
  status: ThreadRow["status"];
  subject: string;
  target: ClientPortalThreadTarget;
  unreadCount: number;
  updatedAt: string;
  waitingState: ThreadRow["waiting_state"];
};

export type ClientPortalThreadTarget = {
  kind: ClientPortalDiscussionTargetKind;
  publicId?: string | null;
  label: string;
  secondaryLabel?: string | null;
};

export type ClientPortalThreadTargetInput = {
  kind: ClientPortalDiscussionTargetKind;
  publicId?: string | null;
};

export type ClientPortalRecipientThreadMessage = {
  author: { displayName: string | null; side: "client" | "owner" };
  body: string;
  createdAt: string;
  editedAt: string | null;
  id: string;
  tombstonedAt: string | null;
};

export type ClientPortalRecipientThreadPage = {
  hasMore: boolean;
  nextCursor: string | null;
  threads: ClientPortalRecipientThreadSummary[];
};

export type ClientPortalRecipientThreadMessagePage = {
  hasMore: boolean;
  messages: ClientPortalRecipientThreadMessage[];
  nextCursor: string | null;
};

export type ClientPortalRecipientThreadInput = {
  actor: ClientPortalRecipientActor;
  body: string;
  database: D1DatabaseLike;
  idempotencyKey: string;
  issueId: string;
  mentionedRecipientIds?: readonly string[];
  portalId: string;
  sectionId?: string | null;
  subject: string;
  target: ClientPortalThreadTargetInput;
};

export class ClientPortalThreadError extends Error {
  constructor(
    readonly code: "client_portal_batch_required" | "client_portal_invalid_input" | "client_portal_thread_conflict" | "client_portal_thread_denied" | "client_portal_thread_not_found" | "client_portal_thread_stale" | "client_portal_thread_write_failed",
    message: string,
  ) { super(message); }
}

function statement(database: D1DatabaseLike, sql: string, values: D1Value[]): D1PreparedStatementLike {
  return database.prepare(sql).bind(...values);
}

async function first<T>(database: D1DatabaseLike, sql: string, values: D1Value[]): Promise<T | null> {
  return database.prepare<T>(sql).bind(...values).first<T>();
}

function record(value: string) {
  try {
    const parsed = JSON.parse(value) as unknown;
    return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed as Record<string, unknown> : {};
  } catch { return {}; }
}

function strings(value: unknown) {
  return Array.isArray(value) ? value.filter((entry): entry is string => typeof entry === "string") : [];
}

function pageLimit(limit: number | undefined) {
  if (limit === undefined) return CLIENT_PORTAL_THREAD_PAGE_SIZE;
  if (!Number.isInteger(limit) || limit < 1) throw new ClientPortalThreadError("client_portal_invalid_input", "Discussion page limit is invalid.");
  return Math.min(limit, CLIENT_PORTAL_THREAD_PAGE_LIMIT);
}

function pageCursor(value: string | null | undefined): ClientPortalPageCursor | null {
  if (!value) return null;
  if (value.length > 300) throw new ClientPortalThreadError("client_portal_invalid_input", "Discussion cursor is invalid.");
  const separator = value.lastIndexOf("|");
  const timestamp = value.slice(0, separator);
  const id = value.slice(separator + 1);
  if (separator < 1 || !id || !Number.isFinite(Date.parse(timestamp))) {
    throw new ClientPortalThreadError("client_portal_invalid_input", "Discussion cursor is invalid.");
  }
  return { id, timestamp };
}

function encodePageCursor(timestamp: string, id: string) {
  return `${timestamp}|${id}`;
}

function policySection(row: SectionRow): ClientPortalPolicySection {
  const policy = record(row.policy_snapshot_json);
  const recipientIds = strings(policy.allowedRecipientIds);
  const organizations = strings(policy.allowedOrganizations);
  return {
    id: row.id,
    enabled: policy.enabled === true,
    minimumCapability: typeof policy.minimumCapability === "string" ? policy.minimumCapability as ClientPortalPolicySection["minimumCapability"] : undefined,
    allowedRecipientIds: recipientIds.length ? recipientIds : undefined,
    allowedOrganizations: organizations.length ? organizations : undefined,
    commentable: policy.commentable === true,
    downloadable: policy.downloadable === true,
    visibleFields: strings(policy.visibleFields),
  };
}

function requireText(value: string, label: string, maxLength: number) {
  const sanitized = sanitizeSharedLinkRecipientText(value, maxLength);
  if (!sanitized) throw new ClientPortalThreadError("client_portal_invalid_input", `${label} is required.`);
  return sanitized;
}

function requireIdempotencyKey(value: string) {
  const key = value.trim();
  if (!key || key.length > 120) throw new ClientPortalThreadError("client_portal_invalid_input", "A valid idempotency key is required.");
  return key;
}

function recipientMentionIds(value: readonly string[] | undefined, actorId: string) {
  const ids = [...new Set((value ?? []).map((entry) => entry.trim()).filter((entry) => entry && entry !== actorId))];
  if (ids.length > 20 || ids.some((entry) => entry.length > 128)) {
    throw new ClientPortalThreadError("client_portal_invalid_input", "Discussion mentions are invalid.");
  }
  return ids;
}

async function activeRecipientMentionIds(database: D1DatabaseLike, portalId: string, recipientIds: readonly string[]) {
  if (!recipientIds.length) return [];
  const placeholders = recipientIds.map(() => "?").join(", ");
  const result = await database.prepare<{ id: string }>(`SELECT id FROM client_portal_recipients WHERE portal_id = ? AND status = 'active' AND id IN (${placeholders})`).bind(portalId, ...recipientIds).all<{ id: string }>();
  const activeIds = result.results?.map((recipient) => recipient.id) ?? [];
  if (activeIds.length !== recipientIds.length) {
    throw new ClientPortalThreadError("client_portal_invalid_input", "Discussion mentions must be active portal recipients.");
  }
  return activeIds;
}

function recipientMentionStatements(database: D1DatabaseLike, messageId: string, recipientIds: readonly string[], timestamp: string) {
  return recipientIds.map((recipientId) => statement(database, "INSERT INTO client_portal_message_mentions (message_id, mentioned_actor_type, mentioned_actor_id, created_at) VALUES (?, 'recipient', ?, ?)", [messageId, recipientId, timestamp]));
}

async function context(database: D1DatabaseLike, portalId: string, issueId: string, sectionId?: string | null, requireCurrent = true) {
  const portal = await first<PortalRow>(database, "SELECT id, workspace_id, project_id, status, current_issue_id FROM client_portals WHERE id = ? LIMIT 1", [portalId]);
  const issue = await first<IssueRow>(database, "SELECT id, issue_number, version_label, status, valid_through FROM client_portal_issues WHERE id = ? AND portal_id = ? LIMIT 1", [issueId, portalId]);
  if (!portal || !issue || (requireCurrent && portal.current_issue_id !== issue.id) || issue.status === "withdrawn" || issue.status === "archived") {
    throw new ClientPortalThreadError("client_portal_thread_stale", "Client Portal issue is unavailable.");
  }
  if (requireCurrent && (issue.status === "accepted" || issue.status === "declined" || issue.status === "superseded" || (issue.valid_through && issue.valid_through < new Date().toISOString().slice(0, 10)))) {
    throw new ClientPortalThreadError("client_portal_thread_stale", "Client Portal issue no longer accepts discussion changes.");
  }
  const policyPortal: ClientPortalPolicyPortal = { id: portal.id, workspaceId: portal.workspace_id, projectId: portal.project_id, status: portal.status, allowAnonymousView: false };
  const section = sectionId
    ? await first<SectionRow>(database, "SELECT id, policy_snapshot_json FROM client_portal_issue_sections WHERE id = ? AND issue_id = ? LIMIT 1", [sectionId, issue.id])
    : null;
  if (sectionId && !section) throw new ClientPortalThreadError("client_portal_invalid_input", "Discussion section is unavailable.");
  return { issue, policyPortal, portal, section: section ? policySection(section) : null };
}

function authorize(actor: ClientPortalRecipientActor, action: "thread:create" | "thread:reply" | "thread:resolve" | "thread:reopen" | "thread:view", policyPortal: ClientPortalPolicyPortal, issue: IssueRow, section: ClientPortalPolicySection | null, thread?: { portalId: string; issueId: string | null; status: ThreadRow["status"]; creatorActorId: string }, isCurrent = true) {
  const decision = evaluateClientPortalPolicy({
    actor,
    action,
    portal: policyPortal,
    issue: { id: issue.id, status: issue.status, isCurrent },
    section,
    thread: thread ? { portalId: thread.portalId, issueId: thread.issueId, audience: "client", status: thread.status, creatorActorId: thread.creatorActorId } : undefined,
  });
  if (!decision.allowed) throw new ClientPortalThreadError(decision.hideResource ? "client_portal_thread_not_found" : "client_portal_thread_denied", decision.hideResource ? "Client Portal thread was not found." : "Recipient cannot perform this discussion action.");
}

async function threadAccessContext(database: D1DatabaseLike, actor: ClientPortalRecipientActor, portalId: string, thread: ThreadRow, requireCurrent: boolean, action: "thread:reply" | "thread:resolve" | "thread:reopen" | "thread:view") {
  if (!thread.issue_id) throw new ClientPortalThreadError("client_portal_thread_not_found", "Client Portal thread was not found.");
  if (thread.status === "requires_revalidation") throw new ClientPortalThreadError(action === "thread:view" ? "client_portal_thread_not_found" : "client_portal_thread_stale", action === "thread:view" ? "Client Portal thread was not found." : "Client Portal thread requires owner revalidation.");
  const current = await context(database, portalId, thread.issue_id, thread.section_key, requireCurrent);
  authorize(actor, action, current.policyPortal, current.issue, current.section, {
    portalId,
    issueId: thread.issue_id,
    status: thread.status,
    creatorActorId: thread.created_by_actor_id,
  }, current.portal.current_issue_id === current.issue.id);
  return current;
}

async function runBatch(database: D1DatabaseLike, statements: D1PreparedStatementLike[]) {
  if (!database.batch) throw new ClientPortalThreadError("client_portal_batch_required", "Client Portal thread writes require D1 batch support.");
  const result = await database.batch(statements);
  if (result.some((entry) => entry.success === false)) throw new ClientPortalThreadError("client_portal_thread_write_failed", "Client Portal thread write failed.");
}

function authorSnapshot(actor: ClientPortalRecipientActor) {
  return JSON.stringify({ displayName: actor.displayName ?? null, role: actor.role, side: "client" });
}

function timelineExposurePolicy(issueNumber: number, section: ClientPortalPolicySection | null) {
  return {
    capability: "timeline:view",
    issueNumber,
    ...(section?.allowedOrganizations ? { allowedOrganizations: section.allowedOrganizations } : {}),
    ...(section?.allowedRecipientIds ? { allowedRecipientIds: section.allowedRecipientIds } : {}),
  };
}

async function replayMessage(database: D1DatabaseLike, actor: ClientPortalRecipientActor, idempotencyKey: string) {
  return first<ExistingMessage>(database, "SELECT body, thread_id FROM client_portal_messages WHERE actor_type = 'recipient' AND actor_id = ? AND idempotency_key = ? LIMIT 1", [actor.recipientId, idempotencyKey]);
}

export async function createClientPortalRecipientThread(input: ClientPortalRecipientThreadInput): Promise<ThreadRow> {
  const body = requireText(input.body, "Message", 4_000);
  const subject = requireText(input.subject, "Thread subject", 180);
  const idempotencyKey = requireIdempotencyKey(input.idempotencyKey);
  if (!CLIENT_PORTAL_DISCUSSION_TARGET_KINDS.includes(input.target.kind)) throw new ClientPortalThreadError("client_portal_invalid_input", "Discussion target is invalid.");
  if (input.target.kind !== "portal" && !input.target.publicId?.trim()) throw new ClientPortalThreadError("client_portal_invalid_input", "Discussion target is required.");

  const replay = await replayMessage(input.database, input.actor, idempotencyKey);
  if (replay) {
    if (replay.body !== body) throw new ClientPortalThreadError("client_portal_invalid_input", "Idempotency key already belongs to a different message.");
    const thread = await first<ThreadRow>(input.database, "SELECT id, issue_id, section_key, target_kind, target_public_id, target_label, target_secondary_label, subject, status, waiting_state, created_by_actor_id, created_at, updated_at FROM client_portal_threads WHERE id = ? AND audience = 'client' LIMIT 1", [replay.thread_id]);
    if (thread && thread.issue_id === input.issueId && thread.subject === subject && thread.target_kind === input.target.kind && thread.target_public_id === (input.target.publicId?.trim() ?? null)) return thread;
    throw new ClientPortalThreadError("client_portal_thread_conflict", "Idempotency key already belongs to a different discussion.");
  }

  const current = await context(input.database, input.portalId, input.issueId, input.sectionId);
  authorize(input.actor, "thread:create", current.policyPortal, current.issue, current.section);
  const resolvedTarget = await resolveClientPortalIssuedTarget({ database: input.database, issueId: input.issueId, portalId: input.portalId, sectionId: input.sectionId, target: input.target });
  if (!resolvedTarget) throw new ClientPortalThreadError("client_portal_invalid_input", "Discussion target does not belong to this issued Client Portal content.");
  if (input.sectionId && resolvedTarget.sectionId && input.sectionId !== resolvedTarget.sectionId) throw new ClientPortalThreadError("client_portal_invalid_input", "Discussion target does not belong to this section.");
  const mentionIds = await activeRecipientMentionIds(input.database, input.portalId, recipientMentionIds(input.mentionedRecipientIds, input.actor.recipientId));
  const timestamp = new Date().toISOString();
  const thread: ThreadRow = {
    id: `thread_${randomUUID()}`, issue_id: input.issueId, section_key: resolvedTarget.sectionId ?? input.sectionId ?? null, target_kind: resolvedTarget.kind,
    target_public_id: resolvedTarget.publicId, target_label: resolvedTarget.label, target_secondary_label: resolvedTarget.secondaryLabel,
    subject, status: "open", waiting_state: "waiting_on_owner", created_by_actor_id: input.actor.recipientId, created_at: timestamp, updated_at: timestamp,
  };
  const messageId = `message_${randomUUID()}`;
  const commitmentEvent = prepareProjectCommitmentEventWrites({
    actor: {
      actorId: input.actor.recipientId,
      actorType: "recipient",
      domainRoleSnapshot: input.actor.role,
      nameSnapshot: input.actor.displayName ?? null,
    },
    clientSafeSnapshot: {
      issueNumber: current.issue.issue_number,
      status: current.issue.status,
      versionLabel: current.issue.version_label,
    },
    correlationId: `discussion:${thread.id}:started`,
    database: input.database,
    eventType: "discussion.started",
    exposure: {
      exposureKind: "automatic",
      policySnapshot: timelineExposurePolicy(current.issue.issue_number, current.section),
      portalId: input.portalId,
      publicEventId: `discussion_event_${randomUUID()}`,
    },
    internalMetadata: { messageId, targetKind: thread.target_kind, targetPublicId: thread.target_public_id, threadId: thread.id },
    occurredAt: timestamp,
    originPortalId: input.portalId,
    projectId: current.portal.project_id,
    source: { issueId: input.issueId, sourceType: "issue" },
    summary: thread.target_label,
    title: `Discussion opened: ${thread.subject}`,
    workspaceId: current.portal.workspace_id,
  });
  try {
    await runBatch(input.database, [
      statement(input.database, `INSERT INTO client_portal_threads (id, portal_id, issue_id, section_key, target_kind, target_public_id, target_label, target_secondary_label, subject, audience, status, waiting_state, assignee_user_id, created_by_actor_type, created_by_actor_id, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'client', 'open', 'waiting_on_owner', NULL, 'recipient', ?, ?, ?)`, [thread.id, input.portalId, thread.issue_id, thread.section_key, thread.target_kind, thread.target_public_id, thread.target_label, thread.target_secondary_label, thread.subject, input.actor.recipientId, timestamp, timestamp]),
      statement(input.database, `INSERT INTO client_portal_messages (id, thread_id, actor_type, actor_id, author_snapshot_json, body, reply_to_message_id, idempotency_key, visibility, created_at) VALUES (?, ?, 'recipient', ?, ?, ?, NULL, ?, 'client', ?)`, [messageId, thread.id, input.actor.recipientId, authorSnapshot(input.actor), body, idempotencyKey, timestamp]),
      ...recipientMentionStatements(input.database, messageId, mentionIds, timestamp),
      statement(input.database, "INSERT INTO client_portal_thread_subscriptions (thread_id, actor_type, actor_id, subscribed_at, unsubscribed_at) VALUES (?, 'recipient', ?, ?, NULL)", [thread.id, input.actor.recipientId, timestamp]),
      statement(input.database, "INSERT INTO client_portal_thread_reads (thread_id, actor_type, actor_id, last_read_message_id, read_at) VALUES (?, 'recipient', ?, ?, ?)", [thread.id, input.actor.recipientId, messageId, timestamp]),
      statement(input.database, "INSERT INTO client_portal_audit_events (id, workspace_id, portal_id, issue_id, actor_type, actor_id, event_type, visibility, metadata_json, occurred_at, created_at) VALUES (?, ?, ?, ?, 'recipient', ?, 'thread_created', 'client_safe', ?, ?, ?)", [randomUUID(), current.portal.workspace_id, input.portalId, input.issueId, input.actor.recipientId, JSON.stringify({ threadId: thread.id }), timestamp, timestamp]),
      statement(input.database, "INSERT INTO client_portal_analytics_events (id, portal_id, issue_id, recipient_id, event_type, verified_human, occurred_at, metadata_json, created_at) VALUES (?, ?, ?, ?, 'thread_created', 1, ?, ?, ?)", [`analytics_${randomUUID()}`, input.portalId, input.issueId, input.actor.recipientId, timestamp, JSON.stringify({ threadId: thread.id }), timestamp]),
      clientPortalOwnerNotificationStatement(input.database, { eventType: "thread_created", idempotencyKey: `thread:${thread.id}:created`, issueId: input.issueId, payload: { messageId, threadId: thread.id }, portalId: input.portalId, timestamp }),
      ...commitmentEvent.statements,
    ]);
  } catch (error) {
    const raced = await replayMessage(input.database, input.actor, idempotencyKey);
    const racedThread = raced?.body === body ? await first<ThreadRow>(input.database, "SELECT id, issue_id, section_key, target_kind, target_public_id, target_label, target_secondary_label, subject, status, waiting_state, created_by_actor_id, created_at, updated_at FROM client_portal_threads WHERE id = ? AND audience = 'client' LIMIT 1", [raced.thread_id]) : null;
    if (racedThread && racedThread.issue_id === input.issueId && racedThread.subject === subject && racedThread.target_kind === resolvedTarget.kind && racedThread.target_public_id === resolvedTarget.publicId) return racedThread;
    throw error;
  }
  return thread;
}

export async function replyToClientPortalThread({ actor, body: rawBody, database, idempotencyKey: rawIdempotencyKey, mentionedRecipientIds, portalId, threadId }: { actor: ClientPortalRecipientActor; body: string; database: D1DatabaseLike; idempotencyKey: string; mentionedRecipientIds?: readonly string[]; portalId: string; threadId: string }) {
  const body = requireText(rawBody, "Message", 4_000);
  const idempotencyKey = requireIdempotencyKey(rawIdempotencyKey);
  const replay = await replayMessage(database, actor, idempotencyKey);
  if (replay) {
    if (replay.body !== body || replay.thread_id !== threadId) throw new ClientPortalThreadError("client_portal_invalid_input", "Idempotency key already belongs to a different message.");
    return { id: threadId, replayed: true };
  }
  const thread = await first<ThreadRow>(database, "SELECT id, issue_id, section_key, target_kind, target_public_id, target_label, target_secondary_label, subject, status, waiting_state, created_by_actor_id, created_at, updated_at FROM client_portal_threads WHERE id = ? AND portal_id = ? AND audience = 'client' LIMIT 1", [threadId, portalId]);
  if (!thread?.issue_id) throw new ClientPortalThreadError("client_portal_thread_not_found", "Client Portal thread was not found.");
  const current = await threadAccessContext(database, actor, portalId, thread, true, "thread:reply");
  const mentionIds = await activeRecipientMentionIds(database, portalId, recipientMentionIds(mentionedRecipientIds, actor.recipientId));
  const timestamp = new Date().toISOString(); const messageId = `message_${randomUUID()}`;
  const commitmentEvent = prepareProjectCommitmentEventWrites({
    actor: { actorId: actor.recipientId, actorType: "recipient", domainRoleSnapshot: actor.role, nameSnapshot: actor.displayName ?? null },
    clientSafeSnapshot: { issueNumber: current.issue.issue_number, status: current.issue.status, versionLabel: current.issue.version_label },
    correlationId: `discussion:${thread.id}:message:${messageId}`,
    database,
    eventType: "discussion.updated",
    exposure: {
      exposureKind: "automatic",
      policySnapshot: timelineExposurePolicy(current.issue.issue_number, current.section),
      portalId,
      publicEventId: `discussion_event_${randomUUID()}`,
    },
    internalMetadata: { messageId, threadId: thread.id },
    occurredAt: timestamp,
    originPortalId: portalId,
    projectId: current.portal.project_id,
    source: { issueId: thread.issue_id, sourceType: "issue" },
    summary: thread.target_label,
    title: `Discussion updated: ${thread.subject}`,
    workspaceId: current.portal.workspace_id,
  });
  try {
    await runBatch(database, [
      statement(database, "INSERT INTO client_portal_messages (id, thread_id, actor_type, actor_id, author_snapshot_json, body, reply_to_message_id, idempotency_key, visibility, created_at) VALUES (?, ?, 'recipient', ?, ?, ?, NULL, ?, 'client', ?)", [messageId, thread.id, actor.recipientId, authorSnapshot(actor), body, idempotencyKey, timestamp]),
      ...recipientMentionStatements(database, messageId, mentionIds, timestamp),
      statement(database, "UPDATE client_portal_threads SET status = 'open', waiting_state = 'waiting_on_owner', updated_at = ? WHERE id = ?", [timestamp, thread.id]),
      statement(database, "INSERT INTO client_portal_thread_reads (thread_id, actor_type, actor_id, last_read_message_id, read_at) VALUES (?, 'recipient', ?, ?, ?) ON CONFLICT(thread_id, actor_type, actor_id) DO UPDATE SET last_read_message_id = excluded.last_read_message_id, read_at = excluded.read_at", [thread.id, actor.recipientId, messageId, timestamp]),
      statement(database, "INSERT INTO client_portal_audit_events (id, workspace_id, portal_id, issue_id, actor_type, actor_id, event_type, visibility, metadata_json, occurred_at, created_at) VALUES (?, ?, ?, ?, 'recipient', ?, 'message_created', 'client_safe', ?, ?, ?)", [randomUUID(), current.portal.workspace_id, portalId, thread.issue_id, actor.recipientId, JSON.stringify({ messageId, threadId: thread.id }), timestamp, timestamp]),
      clientPortalOwnerNotificationStatement(database, { eventType: "message_created", idempotencyKey: `message:${messageId}:created`, issueId: thread.issue_id, payload: { messageId, threadId: thread.id }, portalId, timestamp }),
      ...commitmentEvent.statements,
    ]);
  } catch (error) {
    const raced = await replayMessage(database, actor, idempotencyKey);
    if (raced?.body === body && raced.thread_id === threadId) return { id: threadId, replayed: true };
    throw error;
  }
  return { id: thread.id, replayed: false };
}

export async function setClientPortalRecipientThreadStatus({ actor, database, portalId, status, threadId }: { actor: ClientPortalRecipientActor; database: D1DatabaseLike; portalId: string; status: "open" | "resolved"; threadId: string }) {
  const thread = await first<ThreadRow>(database, "SELECT id, issue_id, section_key, target_kind, target_public_id, target_label, target_secondary_label, subject, status, waiting_state, created_by_actor_id, created_at, updated_at FROM client_portal_threads WHERE id = ? AND portal_id = ? AND audience = 'client' LIMIT 1", [threadId, portalId]);
  if (!thread?.issue_id) throw new ClientPortalThreadError("client_portal_thread_not_found", "Client Portal thread was not found.");
  if (thread.status !== "open" && thread.status !== "resolved") throw new ClientPortalThreadError("client_portal_thread_stale", "Client Portal thread cannot be updated.");
  const current = await threadAccessContext(database, actor, portalId, thread, true, status === "resolved" ? "thread:resolve" : "thread:reopen");
  const timestamp = new Date().toISOString();
  const commitmentEvent = prepareProjectCommitmentEventWrites({
    actor: { actorId: actor.recipientId, actorType: "recipient", domainRoleSnapshot: actor.role, nameSnapshot: actor.displayName ?? null },
    clientSafeSnapshot: { issueNumber: current.issue.issue_number, status: current.issue.status, versionLabel: current.issue.version_label },
    correlationId: `discussion:${thread.id}:status:${status}:${timestamp}`,
    database,
    eventType: status === "resolved" ? "discussion.resolved" : "discussion.reopened",
    exposure: {
      exposureKind: "automatic",
      policySnapshot: timelineExposurePolicy(current.issue.issue_number, current.section),
      portalId,
      publicEventId: `discussion_event_${randomUUID()}`,
    },
    internalMetadata: { threadId: thread.id },
    occurredAt: timestamp,
    originPortalId: portalId,
    projectId: current.portal.project_id,
    source: { issueId: thread.issue_id, sourceType: "issue" },
    summary: thread.target_label,
    title: status === "resolved" ? `Discussion resolved: ${thread.subject}` : `Discussion reopened: ${thread.subject}`,
    workspaceId: current.portal.workspace_id,
  });
  await runBatch(database, [
    statement(
      database,
      "UPDATE client_portal_threads SET status = ?, waiting_state = 'no_response_required', resolved_at = ?, resolved_by_actor_id = ?, updated_at = ? WHERE id = ?",
      [status, status === "resolved" ? timestamp : null, status === "resolved" ? actor.recipientId : null, timestamp, thread.id],
    ),
    statement(database, "INSERT INTO client_portal_audit_events (id, workspace_id, portal_id, issue_id, actor_type, actor_id, event_type, visibility, metadata_json, occurred_at, created_at) VALUES (?, ?, ?, ?, 'recipient', ?, ?, 'client_safe', ?, ?, ?)", [randomUUID(), current.portal.workspace_id, portalId, thread.issue_id, actor.recipientId, status === "resolved" ? "thread_resolved" : "thread_reopened", JSON.stringify({ threadId: thread.id }), timestamp, timestamp]),
    ...commitmentEvent.statements,
  ]);
  return { id: thread.id, status };
}

export async function listClientPortalRecipientThreads({ actor, cursor: rawCursor, database, limit: rawLimit, portalId }: { actor: ClientPortalRecipientActor; cursor?: string | null; database: D1DatabaseLike; limit?: number; portalId: string }): Promise<ClientPortalRecipientThreadPage> {
  const limit = pageLimit(rawLimit);
  const cursor = pageCursor(rawCursor);
  const portal = await first<PortalRow>(database, "SELECT id, workspace_id, project_id, status, current_issue_id FROM client_portals WHERE id = ? LIMIT 1", [portalId]);
  if (!portal) return { threads: [], hasMore: false, nextCursor: null };
  const policyPortal: ClientPortalPolicyPortal = { id: portal.id, workspaceId: portal.workspace_id, projectId: portal.project_id, status: portal.status, allowAnonymousView: false };
  const canView = evaluateClientPortalPolicy({ actor, action: "thread:view", portal: policyPortal });
  if (!canView.allowed) return { threads: [], hasMore: false, nextCursor: null };
  const cursorClause = cursor ? "AND (t.updated_at < ? OR (t.updated_at = ? AND t.id < ?))" : "";
  const result = await database.prepare<ThreadSummaryRow>(`
    SELECT t.id, t.issue_id, t.section_key, t.target_kind, t.target_public_id, t.target_label, t.target_secondary_label,
           t.subject, t.status, t.waiting_state, t.created_by_actor_id, t.created_at, t.updated_at,
           i.status AS issue_status, i.valid_through AS issue_valid_through,
           s.policy_snapshot_json AS section_policy_snapshot_json,
           (SELECT count(*) FROM client_portal_messages m
             WHERE m.thread_id = t.id AND m.actor_type != 'recipient'
               AND m.created_at > COALESCE((SELECT prior.created_at FROM client_portal_messages prior WHERE prior.id = r.last_read_message_id), '')) AS unread_count
    FROM client_portal_threads t
    LEFT JOIN client_portal_issues i ON i.id = t.issue_id AND i.portal_id = t.portal_id
    LEFT JOIN client_portal_issue_sections s ON s.id = t.section_key AND s.issue_id = t.issue_id
    LEFT JOIN client_portal_thread_reads r ON r.thread_id = t.id AND r.actor_type = 'recipient' AND r.actor_id = ?
    WHERE t.portal_id = ? AND t.audience = 'client'
      ${cursorClause}
    ORDER BY t.updated_at DESC, t.id DESC
    LIMIT ?
  `).bind(actor.recipientId, portal.id, ...(cursor ? [cursor.timestamp, cursor.timestamp, cursor.id] : []), limit + 1).all<ThreadSummaryRow>();
  const rows = result.results ?? [];
  const visibleRows = rows.filter((thread) => {
    if (!thread.issue_id || !thread.issue_status) return false;
    if (thread.status === "requires_revalidation") return false;
    if (thread.section_key && !thread.section_policy_snapshot_json) return false;
    const section = thread.section_key && thread.section_policy_snapshot_json
      ? policySection({ id: thread.section_key, policy_snapshot_json: thread.section_policy_snapshot_json })
      : null;
    return evaluateClientPortalPolicy({
      actor,
      action: "thread:view",
      portal: policyPortal,
      issue: { id: thread.issue_id, status: thread.issue_status, isCurrent: portal.current_issue_id === thread.issue_id },
      section,
      thread: { portalId: portal.id, issueId: thread.issue_id, audience: "client", status: thread.status, creatorActorId: thread.created_by_actor_id },
    }).allowed;
  });
  const pageRows = visibleRows.slice(0, limit);
  const threads = pageRows.map((thread) => ({
    id: thread.id, issueId: thread.issue_id, sectionId: thread.section_key, subject: thread.subject, status: thread.status,
    waitingState: thread.waiting_state, createdAt: thread.created_at, updatedAt: thread.updated_at, unreadCount: Number(thread.unread_count) || 0,
    target: { kind: thread.target_kind, publicId: thread.target_public_id, label: thread.target_label, secondaryLabel: thread.target_secondary_label },
  }));
  const hasMore = rows.length > limit;
  const cursorRow = hasMore ? (visibleRows.length > limit ? visibleRows[limit - 1] : rows.at(-1)) : null;
  return { threads, hasMore, nextCursor: cursorRow ? encodePageCursor(cursorRow.updated_at, cursorRow.id) : null };
}

export async function markClientPortalRecipientThreadRead({ actor, database, portalId, threadId }: { actor: ClientPortalRecipientActor; database: D1DatabaseLike; portalId: string; threadId: string }) {
  const thread = await first<ThreadRow>(database, "SELECT id, issue_id, section_key, target_kind, target_public_id, target_label, target_secondary_label, subject, status, waiting_state, created_by_actor_id, created_at, updated_at FROM client_portal_threads WHERE id = ? AND portal_id = ? AND audience = 'client' LIMIT 1", [threadId, portalId]);
  if (!thread) throw new ClientPortalThreadError("client_portal_thread_not_found", "Client Portal thread was not found.");
  await threadAccessContext(database, actor, portalId, thread, false, "thread:view");
  const lastMessage = await first<{ id: string }>(database, "SELECT id FROM client_portal_messages WHERE thread_id = ? ORDER BY created_at DESC, id DESC LIMIT 1", [thread.id]);
  const timestamp = new Date().toISOString();
  await runBatch(database, [statement(database, "INSERT INTO client_portal_thread_reads (thread_id, actor_type, actor_id, last_read_message_id, read_at) VALUES (?, 'recipient', ?, ?, ?) ON CONFLICT(thread_id, actor_type, actor_id) DO UPDATE SET last_read_message_id = excluded.last_read_message_id, read_at = excluded.read_at", [thread.id, actor.recipientId, lastMessage?.id ?? null, timestamp])]);
}

export async function listClientPortalRecipientThreadMessages({ actor, cursor: rawCursor, database, limit: rawLimit, portalId, threadId }: { actor: ClientPortalRecipientActor; cursor?: string | null; database: D1DatabaseLike; limit?: number; portalId: string; threadId: string }): Promise<ClientPortalRecipientThreadMessagePage> {
  const limit = pageLimit(rawLimit);
  const cursor = pageCursor(rawCursor);
  const thread = await first<ThreadRow>(database, "SELECT id, issue_id, section_key, target_kind, target_public_id, target_label, target_secondary_label, subject, status, waiting_state, created_by_actor_id, created_at, updated_at FROM client_portal_threads WHERE id = ? AND portal_id = ? AND audience = 'client' LIMIT 1", [threadId, portalId]);
  if (!thread) throw new ClientPortalThreadError("client_portal_thread_not_found", "Client Portal thread was not found.");
  await threadAccessContext(database, actor, portalId, thread, false, "thread:view");
  const cursorClause = cursor ? "AND (created_at > ? OR (created_at = ? AND id > ?))" : "";
  const result = await database.prepare<ClientVisibleMessageRow>(`SELECT id, author_snapshot_json, body, created_at, edited_at, tombstoned_at FROM client_portal_messages WHERE thread_id = ? AND visibility = 'client' ${cursorClause} ORDER BY created_at ASC, id ASC LIMIT ?`).bind(thread.id, ...(cursor ? [cursor.timestamp, cursor.timestamp, cursor.id] : []), limit + 1).all<ClientVisibleMessageRow>();
  const rows = result.results ?? [];
  const messages = rows.slice(0, limit).map((message) => {
    const snapshot = record(message.author_snapshot_json);
    return {
      id: message.id,
      body: message.body,
      createdAt: message.created_at,
      editedAt: message.edited_at,
      tombstonedAt: message.tombstoned_at,
      author: { displayName: typeof snapshot.displayName === "string" ? snapshot.displayName : null, side: snapshot.side === "owner" ? "owner" as const : "client" as const },
    };
  });
  const hasMore = rows.length > limit;
  const cursorRow = hasMore ? rows[limit - 1] : null;
  return { messages, hasMore, nextCursor: cursorRow ? encodePageCursor(cursorRow.created_at, cursorRow.id) : null };
}

async function recipientMessage(database: D1DatabaseLike, portalId: string, recipientId: string, messageId: string) {
  const message = await first<RecipientMessageRow>(database, `
    SELECT m.id, m.created_at, m.tombstoned_at, m.thread_id
    FROM client_portal_messages m
    JOIN client_portal_threads t ON t.id = m.thread_id
    WHERE m.id = ? AND m.actor_type = 'recipient' AND m.actor_id = ? AND t.portal_id = ? AND t.audience = 'client'
    LIMIT 1
  `, [messageId, recipientId, portalId]);
  if (!message) throw new ClientPortalThreadError("client_portal_thread_not_found", "Client Portal message was not found.");
  return message;
}

function canEditRecipientMessage(createdAt: string) {
  const created = new Date(createdAt).getTime();
  return Number.isFinite(created) && Date.now() - created <= 15 * 60 * 1000;
}

export async function editClientPortalRecipientMessage({ actor, body: rawBody, database, messageId, portalId }: { actor: ClientPortalRecipientActor; body: string; database: D1DatabaseLike; messageId: string; portalId: string }) {
  const body = requireText(rawBody, "Message", 4_000);
  const message = await recipientMessage(database, portalId, actor.recipientId, messageId);
  const thread = await first<ThreadRow>(database, "SELECT id, issue_id, section_key, target_kind, target_public_id, target_label, target_secondary_label, subject, status, waiting_state, created_by_actor_id, created_at, updated_at FROM client_portal_threads WHERE id = ? AND portal_id = ? AND audience = 'client' LIMIT 1", [message.thread_id, portalId]);
  if (!thread) throw new ClientPortalThreadError("client_portal_thread_not_found", "Client Portal thread was not found.");
  await threadAccessContext(database, actor, portalId, thread, true, "thread:reply");
  if (message.tombstoned_at || !canEditRecipientMessage(message.created_at)) throw new ClientPortalThreadError("client_portal_thread_stale", "Client Portal message can no longer be edited.");
  const timestamp = new Date().toISOString();
  await runBatch(database, [statement(database, "UPDATE client_portal_messages SET body = ?, edited_at = ? WHERE id = ? AND tombstoned_at IS NULL", [body, timestamp, message.id])]);
}

export async function tombstoneClientPortalRecipientMessage({ actor, database, messageId, portalId }: { actor: ClientPortalRecipientActor; database: D1DatabaseLike; messageId: string; portalId: string }) {
  const message = await recipientMessage(database, portalId, actor.recipientId, messageId);
  const thread = await first<ThreadRow>(database, "SELECT id, issue_id, section_key, target_kind, target_public_id, target_label, target_secondary_label, subject, status, waiting_state, created_by_actor_id, created_at, updated_at FROM client_portal_threads WHERE id = ? AND portal_id = ? AND audience = 'client' LIMIT 1", [message.thread_id, portalId]);
  if (!thread) throw new ClientPortalThreadError("client_portal_thread_not_found", "Client Portal thread was not found.");
  await threadAccessContext(database, actor, portalId, thread, true, "thread:reply");
  if (message.tombstoned_at || !canEditRecipientMessage(message.created_at)) throw new ClientPortalThreadError("client_portal_thread_stale", "Client Portal message can no longer be removed.");
  const timestamp = new Date().toISOString();
  await runBatch(database, [statement(database, "UPDATE client_portal_messages SET body = 'Message removed by its author.', tombstoned_at = ?, tombstoned_by_actor_id = ? WHERE id = ? AND tombstoned_at IS NULL", [timestamp, actor.recipientId, message.id])]);
}
