import "server-only";

import { getCloudflareD1Database } from "@/lib/cloudflare/d1";
import { CLIENT_PORTAL_DISCUSSION_TARGET_KINDS, type ClientPortalDiscussionTargetKind } from "@/lib/client-portal/contracts";
import { CLIENT_PORTAL_NO_STORE_HEADERS, readClientPortalRecipientSession, requiresClientPortalPassword } from "@/lib/client-portal/public-repository";
import { ClientPortalThreadError, createClientPortalRecipientThread, editClientPortalRecipientMessage, listClientPortalRecipientThreadMessages, listClientPortalRecipientThreads, markClientPortalRecipientThreadRead, replyToClientPortalThread, setClientPortalRecipientThreadStatus, tombstoneClientPortalRecipientMessage } from "@/lib/client-portal/thread-repository";
import { readBoundedJsonBody } from "@/lib/http/read-bounded-body";
import { assertSameOriginPublicPost } from "@/lib/publication/security";
import { checkClientPortalThreadRateLimit, checkClientPortalThreadReadRateLimit } from "@/lib/publication/public-repository";

function unavailable() { return Response.json({ error: "Client Portal discussion unavailable." }, { status: 404, headers: CLIENT_PORTAL_NO_STORE_HEADERS }); }
function invalid(message: string) { return Response.json({ error: message }, { status: 400, headers: CLIENT_PORTAL_NO_STORE_HEADERS }); }
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
    cursor: searchParams.get("cursor"),
    limit: rawLimit === null ? undefined : Number(rawLimit),
  };
}

function mentionedRecipientIds(value: unknown) {
  if (value === undefined) return [];
  if (!Array.isArray(value) || value.some((entry) => typeof entry !== "string")) return null;
  return value;
}

function threadError(error: unknown) {
  if (!(error instanceof ClientPortalThreadError)) return unavailable();
  if (error.code === "client_portal_invalid_input") return invalid(error.message);
  if (error.code === "client_portal_thread_conflict") return Response.json({ error: error.message }, { status: 409, headers: CLIENT_PORTAL_NO_STORE_HEADERS });
  if (error.code === "client_portal_thread_denied") return Response.json({ error: error.message }, { status: 403, headers: CLIENT_PORTAL_NO_STORE_HEADERS });
  if (error.code === "client_portal_thread_stale") return Response.json({ error: error.message }, { status: 409, headers: CLIENT_PORTAL_NO_STORE_HEADERS });
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
  try {
    const thread = await createClientPortalRecipientThread({
      actor: context.actor, database: context.database, portalId: context.actor.portalId, issueId: body.value.issueId,
      sectionId: typeof body.value.sectionId === "string" ? body.value.sectionId : null, idempotencyKey: idempotencyKey(request), mentionedRecipientIds: mentions, subject: body.value.subject, body: body.value.body,
      target: { kind: targetRecord.kind as ClientPortalDiscussionTargetKind, publicId: typeof targetRecord.publicId === "string" ? targetRecord.publicId : null },
    });
    return Response.json({ thread }, { status: 201, headers: CLIENT_PORTAL_NO_STORE_HEADERS });
  } catch (error) { return threadError(error); }
}

export async function listClientPortalThreadsResponse(request: Request, token: string) {
  const context = await recipientReadRequest(request, token); if ("error" in context) return context.error;
  const rateLimit = await readRateLimit(context.actor); if (!rateLimit.allowed) return rateLimited(rateLimit.message, rateLimit.retryAfter);
  try {
    const page = await listClientPortalRecipientThreads({ actor: context.actor, database: context.database, portalId: context.actor.portalId, ...discussionPage(request) });
    return Response.json(page, { headers: CLIENT_PORTAL_NO_STORE_HEADERS });
  } catch (error) { return threadError(error); }
}

export async function listClientPortalThreadMessagesResponse(request: Request, token: string, threadId: string) {
  const context = await recipientReadRequest(request, token); if ("error" in context) return context.error;
  const rateLimit = await readRateLimit(context.actor); if (!rateLimit.allowed) return rateLimited(rateLimit.message, rateLimit.retryAfter);
  try {
    const page = await listClientPortalRecipientThreadMessages({ actor: context.actor, database: context.database, portalId: context.actor.portalId, threadId, ...discussionPage(request) });
    return Response.json(page, { headers: CLIENT_PORTAL_NO_STORE_HEADERS });
  } catch (error) { return threadError(error); }
}

export async function markClientPortalThreadReadResponse(request: Request, token: string, threadId: string) {
  const context = await recipientRequest(request, token); if ("error" in context) return context.error;
  const rateLimit = await mutationRateLimit(context.actor); if (!rateLimit.allowed) return rateLimited(rateLimit.message, rateLimit.retryAfter);
  try {
    await markClientPortalRecipientThreadRead({ actor: context.actor, database: context.database, portalId: context.actor.portalId, threadId });
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
    await editClientPortalRecipientMessage({ actor: context.actor, database: context.database, portalId: context.actor.portalId, messageId, body: body.value.body });
    return new Response(null, { status: 204, headers: CLIENT_PORTAL_NO_STORE_HEADERS });
  } catch (error) { return threadError(error); }
}

export async function tombstoneClientPortalMessageResponse(request: Request, token: string, messageId: string) {
  const context = await recipientRequest(request, token); if ("error" in context) return context.error;
  const rateLimit = await mutationRateLimit(context.actor); if (!rateLimit.allowed) return rateLimited(rateLimit.message, rateLimit.retryAfter);
  try {
    await tombstoneClientPortalRecipientMessage({ actor: context.actor, database: context.database, portalId: context.actor.portalId, messageId });
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
    const result = await replyToClientPortalThread({ actor: context.actor, database: context.database, portalId: context.actor.portalId, threadId, idempotencyKey: idempotencyKey(request), mentionedRecipientIds: mentions, body: body.value.body });
    return Response.json({ threadId: result.id, replayed: result.replayed }, { headers: CLIENT_PORTAL_NO_STORE_HEADERS });
  } catch (error) { return threadError(error); }
}

export async function updateClientPortalThreadStatusResponse(request: Request, token: string, threadId: string) {
  const context = await recipientRequest(request, token); if ("error" in context) return context.error;
  const rateLimit = await mutationRateLimit(context.actor); if (!rateLimit.allowed) return rateLimited(rateLimit.message, rateLimit.retryAfter);
  const body = await readBoundedJsonBody<{ status?: unknown }>(request, 128);
  if (!body.ok) return Response.json({ error: body.error }, { status: body.status, headers: CLIENT_PORTAL_NO_STORE_HEADERS });
  if (body.value.status !== "open" && body.value.status !== "resolved") return invalid("Discussion status is invalid.");
  try {
    const result = await setClientPortalRecipientThreadStatus({ actor: context.actor, database: context.database, portalId: context.actor.portalId, threadId, status: body.value.status });
    return Response.json({ threadId: result.id, status: result.status }, { headers: CLIENT_PORTAL_NO_STORE_HEADERS });
  } catch { return unavailable(); }
}
