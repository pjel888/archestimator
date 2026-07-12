import "server-only";

import { getCloudflareD1Database } from "@/lib/cloudflare/d1";
import { CLIENT_PORTAL_DISCUSSION_TARGET_KINDS, type ClientPortalDiscussionTargetKind } from "@/lib/client-portal/contracts";
import { CLIENT_PORTAL_NO_STORE_HEADERS, readClientPortalRecipientSession, requiresClientPortalPassword } from "@/lib/client-portal/public-repository";
import { createClientPortalRecipientThread, replyToClientPortalThread, setClientPortalRecipientThreadStatus } from "@/lib/client-portal/thread-repository";
import { readBoundedJsonBody } from "@/lib/http/read-bounded-body";
import { assertSameOriginPublicPost } from "@/lib/publication/security";

function unavailable() { return Response.json({ error: "Client Portal discussion unavailable." }, { status: 404, headers: CLIENT_PORTAL_NO_STORE_HEADERS }); }
function invalid(message: string) { return Response.json({ error: message }, { status: 400, headers: CLIENT_PORTAL_NO_STORE_HEADERS }); }

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

function idempotencyKey(request: Request) { return request.headers.get("idempotency-key")?.trim() ?? ""; }

export async function createClientPortalThreadResponse(request: Request, token: string) {
  const context = await recipientRequest(request, token); if ("error" in context) return context.error;
  const body = await readBoundedJsonBody<{ issueId?: unknown; sectionId?: unknown; subject?: unknown; body?: unknown; target?: unknown }>(request, 8 * 1024);
  if (!body.ok) return Response.json({ error: body.error }, { status: body.status, headers: CLIENT_PORTAL_NO_STORE_HEADERS });
  const target = body.value.target;
  if (!target || typeof target !== "object" || Array.isArray(target)) return invalid("Discussion target is required.");
  const targetRecord = target as Record<string, unknown>;
  if (typeof body.value.issueId !== "string" || typeof body.value.subject !== "string" || typeof body.value.body !== "string" || typeof targetRecord.kind !== "string" || typeof targetRecord.label !== "string") return invalid("Discussion request is invalid.");
  if (!CLIENT_PORTAL_DISCUSSION_TARGET_KINDS.includes(targetRecord.kind as ClientPortalDiscussionTargetKind)) return invalid("Discussion target is invalid.");
  try {
    const thread = await createClientPortalRecipientThread({
      actor: context.actor, database: context.database, portalId: context.actor.portalId, issueId: body.value.issueId,
      sectionId: typeof body.value.sectionId === "string" ? body.value.sectionId : null, idempotencyKey: idempotencyKey(request), subject: body.value.subject, body: body.value.body,
      target: { kind: targetRecord.kind as ClientPortalDiscussionTargetKind, publicId: typeof targetRecord.publicId === "string" ? targetRecord.publicId : null, label: targetRecord.label, secondaryLabel: typeof targetRecord.secondaryLabel === "string" ? targetRecord.secondaryLabel : null },
    });
    return Response.json({ thread }, { status: 201, headers: CLIENT_PORTAL_NO_STORE_HEADERS });
  } catch { return unavailable(); }
}

export async function replyClientPortalThreadResponse(request: Request, token: string, threadId: string) {
  const context = await recipientRequest(request, token); if ("error" in context) return context.error;
  const body = await readBoundedJsonBody<{ body?: unknown }>(request, 5 * 1024);
  if (!body.ok) return Response.json({ error: body.error }, { status: body.status, headers: CLIENT_PORTAL_NO_STORE_HEADERS });
  if (typeof body.value.body !== "string") return invalid("Message is required.");
  try {
    const result = await replyToClientPortalThread({ actor: context.actor, database: context.database, portalId: context.actor.portalId, threadId, idempotencyKey: idempotencyKey(request), body: body.value.body });
    return Response.json({ threadId: result.id, replayed: result.replayed }, { headers: CLIENT_PORTAL_NO_STORE_HEADERS });
  } catch { return unavailable(); }
}

export async function updateClientPortalThreadStatusResponse(request: Request, token: string, threadId: string) {
  const context = await recipientRequest(request, token); if ("error" in context) return context.error;
  const body = await readBoundedJsonBody<{ status?: unknown }>(request, 128);
  if (!body.ok) return Response.json({ error: body.error }, { status: body.status, headers: CLIENT_PORTAL_NO_STORE_HEADERS });
  if (body.value.status !== "open" && body.value.status !== "resolved") return invalid("Discussion status is invalid.");
  try {
    const result = await setClientPortalRecipientThreadStatus({ actor: context.actor, database: context.database, portalId: context.actor.portalId, threadId, status: body.value.status });
    return Response.json({ threadId: result.id, status: result.status }, { headers: CLIENT_PORTAL_NO_STORE_HEADERS });
  } catch { return unavailable(); }
}
