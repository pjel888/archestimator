import "server-only";

import { getCloudflareD1Database } from "@/lib/cloudflare/d1";
import { CLIENT_PORTAL_DISCUSSION_TARGET_KINDS, type ClientPortalDiscussionTargetKind } from "@/lib/client-portal/contracts";
import { CLIENT_PORTAL_NO_STORE_HEADERS, readClientPortalRecipientSession, requiresClientPortalPassword } from "@/lib/client-portal/public-repository";
import { ClientPortalThreadError, createClientPortalRecipientThread, editClientPortalRecipientMessage, listClientPortalRecipientThreadMessages, listClientPortalRecipientThreads, markClientPortalRecipientThreadRead, replyToClientPortalThread, setClientPortalRecipientThreadStatus, tombstoneClientPortalRecipientMessage } from "@/lib/client-portal/thread-repository";
import { readBoundedJsonBody } from "@/lib/http/read-bounded-body";
import { assertSameOriginPublicPost } from "@/lib/publication/security";
import { checkClientPortalThreadRateLimit, checkClientPortalThreadReadRateLimit } from "@/lib/client-portal/public-rate-limits";
import {
  createClientPortalPublicCursor,
  createClientPortalPublicIdentifier,
  parseClientPortalPublicCursor,
  resolveClientPortalPublicIdentifier,
} from "@/lib/client-portal/public-identifiers";
import { toUserFacingErrorMessage } from "@/lib/observability/user-facing-error";

function unavailable() { return Response.json({ error: "Client Portal discussion unavailable." }, { status: 404, headers: CLIENT_PORTAL_NO_STORE_HEADERS }); }
function invalid(message: string) {
  return Response.json(
    { error: toUserFacingErrorMessage(new Error(message), "Discussion request is invalid.") },
    { status: 400, headers: CLIENT_PORTAL_NO_STORE_HEADERS },
  );
}
function rateLimited(message: string, retryAfter: number) { return Response.json({ error: message }, { status: 429, headers: { ...CLIENT_PORTAL_NO_STORE_HEADERS, "Retry-After": String(retryAfter) } }); }

async function mutationRateLimit(actor: { portalId: string; recipientId: string }) {
  return checkClientPortalThreadRateLimit({ portalId: actor.portalId, recipientId: actor.recipientId });
}

async function readRateLimit(actor: { portalId: string; recipientId: string }) {
  return checkClientPortalThreadReadRateLimit({ portalId: actor.portalId, recipientId: actor.recipientId });
}

async function recipientRequest(request: Request, token: string) {
  const origin = assertSameOriginPublicPost(request);
  if (!origin.ok) return { error: Response.json({ error: origin.message }, { status: origin.status, headers: CLIENT_PORTAL_NO_STORE_HEADERS }) };
  const cookie = request.headers.get("cookie") ?? "";
  if (await requiresClientPortalPassword(token, cookie)) return { error: Response.json({ error: "Client Portal password required.", passwordRequired: true }, { status: 423, headers: CLIENT_PORTAL_NO_STORE_HEADERS }) };
  const actor = await readClientPortalRecipientSession(token, cookie);
  if (!actor) return { error: Response.json({ error: "Recipient session required." }, { status: 401, headers: CLIENT_PORTAL_NO_STORE_HEADERS }) };
  const database = await getCloudflareD1Database();
  return database ? { actor, database } : { error: unavailable() };
}

async function recipientReadRequest(request: Request, token: string) {
  const cookie = request.headers.get("cookie") ?? "";
  if (await requiresClientPortalPassword(token, cookie)) return { error: Response.json({ error: "Client Portal password required.", passwordRequired: true }, { status: 423, headers: CLIENT_PORTAL_NO_STORE_HEADERS }) };
  const actor = await readClientPortalRecipientSession(token, cookie);
  if (!actor) return { error: Response.json({ error: "Recipient session required." }, { status: 401, headers: CLIENT_PORTAL_NO_STORE_HEADERS }) };
  const database = await getCloudflareD1Database();
  return database ? { actor, database } : { error: unavailable() };
}

function idempotencyKey(request: Request) { return request.headers.get("idempotency-key")?.trim() ?? ""; }

function discussionPage(request: Request) {
  const searchParams = new URL(request.url).searchParams;
  const rawLimit = searchParams.get("limit");
  return {
    limit: rawLimit === null ? undefined : Number(rawLimit),
  };
}

type PublicDatabase = NonNullable<Awaited<ReturnType<typeof getCloudflareD1Database>>>;

async function candidateIds(database: PublicDatabase, sql: string, values: readonly string[]) {
  const result = await database.prepare<{ id: string }>(sql).bind(...values).all<{ id: string }>();
  return (result.results ?? []).map((row) => row.id);
}

async function currentIssueId(database: PublicDatabase, portalId: string, token: string, publicIssueId: string) {
  const portal = await database.prepare<{ current_issue_id: string | null }>("SELECT current_issue_id FROM client_portals WHERE id = ? LIMIT 1")
    .bind(portalId)
    .first<{ current_issue_id: string | null }>();
  return portal?.current_issue_id
    ? resolveClientPortalPublicIdentifier(token, "issue", publicIssueId, [portal.current_issue_id])
    : null;
}

async function sectionId(database: PublicDatabase, issueId: string, token: string, publicSectionId: string) {
  const ids = await candidateIds(database, "SELECT id FROM client_portal_issue_sections WHERE issue_id = ?", [issueId]);
  return resolveClientPortalPublicIdentifier(token, "section", publicSectionId, ids);
}

async function resolveThreadId(database: PublicDatabase, portalId: string, token: string, publicThreadId: string) {
  const ids = await candidateIds(database, "SELECT id FROM client_portal_threads WHERE portal_id = ? AND audience = 'client'", [portalId]);
  return resolveClientPortalPublicIdentifier(token, "thread", publicThreadId, ids);
}

async function resolveMessageId(database: PublicDatabase, portalId: string, token: string, publicMessageId: string) {
  const ids = await candidateIds(database, "SELECT message.id FROM client_portal_messages message JOIN client_portal_threads thread ON thread.id = message.thread_id WHERE thread.portal_id = ? AND thread.audience = 'client' AND message.visibility = 'client'", [portalId]);
  return resolveClientPortalPublicIdentifier(token, "message", publicMessageId, ids);
}

async function internalCursor(request: Request, database: PublicDatabase, token: string, kind: "message" | "thread", portalId: string, resolvedThreadId?: string) {
  const value = new URL(request.url).searchParams.get("cursor");
  if (!value) return { ok: true as const, value: null };
  const parsed = parseClientPortalPublicCursor(value);
  if (!parsed) return { ok: false as const };
  const ids = kind === "thread"
    ? await candidateIds(database, "SELECT id FROM client_portal_threads WHERE portal_id = ? AND audience = 'client' AND updated_at = ?", [portalId, parsed.timestamp])
    : await candidateIds(database, "SELECT id FROM client_portal_messages WHERE thread_id = ? AND visibility = 'client' AND created_at = ?", [resolvedThreadId ?? "", parsed.timestamp]);
  const id = resolveClientPortalPublicIdentifier(token, kind, parsed.publicId, ids);
  return id ? { ok: true as const, value: `${parsed.timestamp}|${id}` } : { ok: false as const };
}

function publicTarget(token: string, target: { kind: ClientPortalDiscussionTargetKind; publicId?: string | null; label: string; secondaryLabel?: string | null }) {
  const publicId = target.publicId && target.kind === "issue"
    ? createClientPortalPublicIdentifier(token, "issue", target.publicId)
    : target.publicId && target.kind === "section"
      ? createClientPortalPublicIdentifier(token, "section", target.publicId)
      : target.publicId ?? null;
  return { ...target, publicId };
}

function publicThread<T extends { id: string; issueId: string | null; sectionId: string | null; target: { kind: ClientPortalDiscussionTargetKind; publicId?: string | null; label: string; secondaryLabel?: string | null } }>(token: string, thread: T) {
  return {
    ...thread,
    id: createClientPortalPublicIdentifier(token, "thread", thread.id),
    issueId: thread.issueId ? createClientPortalPublicIdentifier(token, "issue", thread.issueId) : null,
    sectionId: thread.sectionId ? createClientPortalPublicIdentifier(token, "section", thread.sectionId) : null,
    target: publicTarget(token, thread.target),
  };
}

function mentionedRecipientIds(value: unknown) {
  if (value === undefined) return [];
  if (!Array.isArray(value) || value.some((entry) => typeof entry !== "string")) return null;
  return value;
}

function threadError(error: unknown) {
  if (!(error instanceof ClientPortalThreadError)) return unavailable();
  const safeMessage = toUserFacingErrorMessage(error, "Client Portal discussion unavailable.");
  if (error.code === "client_portal_invalid_input") return invalid(safeMessage);
  if (error.code === "client_portal_thread_conflict") return Response.json({ error: safeMessage }, { status: 409, headers: CLIENT_PORTAL_NO_STORE_HEADERS });
  if (error.code === "client_portal_thread_denied") return Response.json({ error: safeMessage }, { status: 403, headers: CLIENT_PORTAL_NO_STORE_HEADERS });
  if (error.code === "client_portal_thread_stale") return Response.json({ error: safeMessage }, { status: 409, headers: CLIENT_PORTAL_NO_STORE_HEADERS });
  return unavailable();
}

export async function createClientPortalThreadResponse(request: Request, token: string) {
  const context = await recipientRequest(request, token); if ("error" in context) return context.error;
  const rateLimit = await mutationRateLimit(context.actor); if (!rateLimit.allowed) return rateLimited(rateLimit.message, rateLimit.retryAfter);
  const body = await readBoundedJsonBody<{ issueId?: unknown; mentionedRecipientIds?: unknown; sectionId?: unknown; subject?: unknown; body?: unknown; target?: unknown }>(request, 8 * 1024);
  if (!body.ok) return Response.json({ error: body.error }, { status: body.status, headers: CLIENT_PORTAL_NO_STORE_HEADERS });
  const target = body.value.target;
  if (!target || typeof target !== "object" || Array.isArray(target)) return invalid("Discussion target is required.");
  const mentions = mentionedRecipientIds(body.value.mentionedRecipientIds);
  if (!mentions) return invalid("Discussion mentions are invalid.");
  const targetRecord = target as Record<string, unknown>;
  if (typeof body.value.issueId !== "string" || typeof body.value.subject !== "string" || typeof body.value.body !== "string" || typeof targetRecord.kind !== "string") return invalid("Discussion request is invalid.");
  if (!CLIENT_PORTAL_DISCUSSION_TARGET_KINDS.includes(targetRecord.kind as ClientPortalDiscussionTargetKind)) return invalid("Discussion target is invalid.");
  const resolvedIssueId = await currentIssueId(context.database, context.actor.portalId, token, body.value.issueId);
  if (!resolvedIssueId) return unavailable();
  const resolvedSectionId = typeof body.value.sectionId === "string"
    ? await sectionId(context.database, resolvedIssueId, token, body.value.sectionId)
    : null;
  if (typeof body.value.sectionId === "string" && !resolvedSectionId) return unavailable();
  let targetPublicId = typeof targetRecord.publicId === "string" ? targetRecord.publicId : null;
  if (targetRecord.kind === "issue") {
    if (!targetPublicId || await currentIssueId(context.database, context.actor.portalId, token, targetPublicId) !== resolvedIssueId) return unavailable();
    targetPublicId = resolvedIssueId;
  } else if (targetRecord.kind === "section") {
    const resolvedTargetSectionId = targetPublicId ? await sectionId(context.database, resolvedIssueId, token, targetPublicId) : null;
    if (!resolvedTargetSectionId) return unavailable();
    targetPublicId = resolvedTargetSectionId;
  }
  try {
    const thread = await createClientPortalRecipientThread({
      actor: context.actor, database: context.database, portalId: context.actor.portalId, issueId: resolvedIssueId,
      sectionId: resolvedSectionId, idempotencyKey: idempotencyKey(request), mentionedRecipientIds: mentions, subject: body.value.subject, body: body.value.body,
      target: { kind: targetRecord.kind as ClientPortalDiscussionTargetKind, publicId: targetPublicId },
    });
    return Response.json({ thread: publicThread(token, {
      id: thread.id,
      issueId: thread.issue_id,
      sectionId: thread.section_key,
      status: thread.status,
      subject: thread.subject,
      target: { kind: thread.target_kind, publicId: thread.target_public_id, label: thread.target_label, secondaryLabel: thread.target_secondary_label },
      waitingState: thread.waiting_state,
      createdAt: thread.created_at,
      updatedAt: thread.updated_at,
      unreadCount: 0,
    }) }, { status: 201, headers: CLIENT_PORTAL_NO_STORE_HEADERS });
  } catch (error) { return threadError(error); }
}

export async function listClientPortalThreadsResponse(request: Request, token: string) {
  const context = await recipientReadRequest(request, token); if ("error" in context) return context.error;
  const rateLimit = await readRateLimit(context.actor); if (!rateLimit.allowed) return rateLimited(rateLimit.message, rateLimit.retryAfter);
  try {
    const cursor = await internalCursor(request, context.database, token, "thread", context.actor.portalId);
    if (!cursor.ok) return unavailable();
    const page = await listClientPortalRecipientThreads({ actor: context.actor, database: context.database, portalId: context.actor.portalId, cursor: cursor.value, ...discussionPage(request) });
    return Response.json({ ...page, threads: page.threads.map((thread) => publicThread(token, thread)), nextCursor: createClientPortalPublicCursor(token, "thread", page.nextCursor) }, { headers: CLIENT_PORTAL_NO_STORE_HEADERS });
  } catch (error) { return threadError(error); }
}

export async function listClientPortalThreadMessagesResponse(request: Request, token: string, threadId: string) {
  const context = await recipientReadRequest(request, token); if ("error" in context) return context.error;
  const rateLimit = await readRateLimit(context.actor); if (!rateLimit.allowed) return rateLimited(rateLimit.message, rateLimit.retryAfter);
  try {
    const resolvedThreadId = await resolveThreadId(context.database, context.actor.portalId, token, threadId);
    if (!resolvedThreadId) return unavailable();
    const cursor = await internalCursor(request, context.database, token, "message", context.actor.portalId, resolvedThreadId);
    if (!cursor.ok) return unavailable();
    const page = await listClientPortalRecipientThreadMessages({ actor: context.actor, database: context.database, portalId: context.actor.portalId, threadId: resolvedThreadId, cursor: cursor.value, ...discussionPage(request) });
    return Response.json({ ...page, messages: page.messages.map((message) => ({ ...message, id: createClientPortalPublicIdentifier(token, "message", message.id) })), nextCursor: createClientPortalPublicCursor(token, "message", page.nextCursor) }, { headers: CLIENT_PORTAL_NO_STORE_HEADERS });
  } catch (error) { return threadError(error); }
}

export async function markClientPortalThreadReadResponse(request: Request, token: string, threadId: string) {
  const context = await recipientRequest(request, token); if ("error" in context) return context.error;
  const rateLimit = await mutationRateLimit(context.actor); if (!rateLimit.allowed) return rateLimited(rateLimit.message, rateLimit.retryAfter);
  try {
    const resolvedThreadId = await resolveThreadId(context.database, context.actor.portalId, token, threadId);
    if (!resolvedThreadId) return unavailable();
    await markClientPortalRecipientThreadRead({ actor: context.actor, database: context.database, portalId: context.actor.portalId, threadId: resolvedThreadId });
    return new Response(null, { status: 204, headers: CLIENT_PORTAL_NO_STORE_HEADERS });
  } catch (error) { return threadError(error); }
}

export async function editClientPortalMessageResponse(request: Request, token: string, messageId: string) {
  const context = await recipientRequest(request, token); if ("error" in context) return context.error;
  const rateLimit = await mutationRateLimit(context.actor); if (!rateLimit.allowed) return rateLimited(rateLimit.message, rateLimit.retryAfter);
  const body = await readBoundedJsonBody<{ body?: unknown }>(request, 5 * 1024);
  if (!body.ok) return Response.json({ error: body.error }, { status: body.status, headers: CLIENT_PORTAL_NO_STORE_HEADERS });
  if (typeof body.value.body !== "string") return invalid("Message is required.");
  try {
    const resolvedMessageId = await resolveMessageId(context.database, context.actor.portalId, token, messageId);
    if (!resolvedMessageId) return unavailable();
    await editClientPortalRecipientMessage({ actor: context.actor, database: context.database, portalId: context.actor.portalId, messageId: resolvedMessageId, body: body.value.body });
    return new Response(null, { status: 204, headers: CLIENT_PORTAL_NO_STORE_HEADERS });
  } catch (error) { return threadError(error); }
}

export async function tombstoneClientPortalMessageResponse(request: Request, token: string, messageId: string) {
  const context = await recipientRequest(request, token); if ("error" in context) return context.error;
  const rateLimit = await mutationRateLimit(context.actor); if (!rateLimit.allowed) return rateLimited(rateLimit.message, rateLimit.retryAfter);
  try {
    const resolvedMessageId = await resolveMessageId(context.database, context.actor.portalId, token, messageId);
    if (!resolvedMessageId) return unavailable();
    await tombstoneClientPortalRecipientMessage({ actor: context.actor, database: context.database, portalId: context.actor.portalId, messageId: resolvedMessageId });
    return new Response(null, { status: 204, headers: CLIENT_PORTAL_NO_STORE_HEADERS });
  } catch (error) { return threadError(error); }
}

export async function replyClientPortalThreadResponse(request: Request, token: string, threadId: string) {
  const context = await recipientRequest(request, token); if ("error" in context) return context.error;
  const rateLimit = await mutationRateLimit(context.actor); if (!rateLimit.allowed) return rateLimited(rateLimit.message, rateLimit.retryAfter);
  const body = await readBoundedJsonBody<{ body?: unknown; mentionedRecipientIds?: unknown }>(request, 5 * 1024);
  if (!body.ok) return Response.json({ error: body.error }, { status: body.status, headers: CLIENT_PORTAL_NO_STORE_HEADERS });
  if (typeof body.value.body !== "string") return invalid("Message is required.");
  const mentions = mentionedRecipientIds(body.value.mentionedRecipientIds);
  if (!mentions) return invalid("Discussion mentions are invalid.");
  try {
    const resolvedThreadId = await resolveThreadId(context.database, context.actor.portalId, token, threadId);
    if (!resolvedThreadId) return unavailable();
    const result = await replyToClientPortalThread({ actor: context.actor, database: context.database, portalId: context.actor.portalId, threadId: resolvedThreadId, idempotencyKey: idempotencyKey(request), mentionedRecipientIds: mentions, body: body.value.body });
    return Response.json({ threadId: createClientPortalPublicIdentifier(token, "thread", result.id), replayed: result.replayed }, { headers: CLIENT_PORTAL_NO_STORE_HEADERS });
  } catch (error) { return threadError(error); }
}

export async function updateClientPortalThreadStatusResponse(request: Request, token: string, threadId: string) {
  const context = await recipientRequest(request, token); if ("error" in context) return context.error;
  const rateLimit = await mutationRateLimit(context.actor); if (!rateLimit.allowed) return rateLimited(rateLimit.message, rateLimit.retryAfter);
  const body = await readBoundedJsonBody<{ status?: unknown }>(request, 128);
  if (!body.ok) return Response.json({ error: body.error }, { status: body.status, headers: CLIENT_PORTAL_NO_STORE_HEADERS });
  if (body.value.status !== "open" && body.value.status !== "resolved") return invalid("Discussion status is invalid.");
  try {
    const resolvedThreadId = await resolveThreadId(context.database, context.actor.portalId, token, threadId);
    if (!resolvedThreadId) return unavailable();
    const result = await setClientPortalRecipientThreadStatus({ actor: context.actor, database: context.database, portalId: context.actor.portalId, threadId: resolvedThreadId, status: body.value.status });
    return Response.json({ threadId: createClientPortalPublicIdentifier(token, "thread", result.id), status: result.status }, { headers: CLIENT_PORTAL_NO_STORE_HEADERS });
  } catch { return unavailable(); }
}
