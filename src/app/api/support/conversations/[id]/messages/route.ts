import { NO_STORE_HEADERS, assertAdminApiOrigin } from "@/lib/admin/require-admin";
import { getCurrentUserContext } from "@/lib/auth/session";
import { getCloudflareD1Database } from "@/lib/cloudflare/d1";
import { fanoutSupportInboxInvalidation } from "@/lib/cloudflare/support-inbox-fanout";
import {
  canAccessSupportConversationInD1,
  insertSupportMessageIfNewInD1,
  listSupportMessages,
  markSupportConversationReadForUserInD1,
} from "@/lib/repositories/support-conversations-repository";

export const dynamic = "force-dynamic";
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/iu;

async function ownedConversation(id: string) {
  const user = await getCurrentUserContext();
  const db = await getCloudflareD1Database();
  if (!user || !db || !UUID_PATTERN.test(id)) return { user, db, allowed: false };
  return { user, db, allowed: await canAccessSupportConversationInD1({ database: db, conversationId: id, userId: user.userId }) };
}

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const id = (await params).id;
  const access = await ownedConversation(id);
  if (!access.user) return Response.json({ error: "Authentication required." }, { status: 401, headers: NO_STORE_HEADERS });
  if (!access.db) return Response.json({ error: "Support storage unavailable." }, { status: 503, headers: NO_STORE_HEADERS });
  if (!access.allowed) return Response.json({ error: "Support conversation not found." }, { status: 404, headers: NO_STORE_HEADERS });
  await markSupportConversationReadForUserInD1(access.db, id, access.user.userId);
  const result = await listSupportMessages(id, { dbOverride: access.db, limit: 200 });
  return Response.json({ messages: result.data, degraded: Boolean(result.error), error: result.error }, { headers: NO_STORE_HEADERS });
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const originError = assertAdminApiOrigin(request);
  if (originError) return originError;
  const id = (await params).id;
  const access = await ownedConversation(id);
  if (!access.user) return Response.json({ error: "Authentication required." }, { status: 401, headers: NO_STORE_HEADERS });
  if (!access.db) return Response.json({ error: "Support storage unavailable." }, { status: 503, headers: NO_STORE_HEADERS });
  if (!access.allowed) return Response.json({ error: "Support conversation not found." }, { status: 404, headers: NO_STORE_HEADERS });
  const payload = await request.json().catch(() => null) as Record<string, unknown> | null;
  if (!payload || typeof payload.body !== "string" || typeof payload.clientMessageId !== "string") {
    return Response.json({ error: "A message and clientMessageId are required." }, { status: 400, headers: NO_STORE_HEADERS });
  }
  const inserted = await insertSupportMessageIfNewInD1(access.db, {
    conversationId: id, senderRole: "user", authorUserId: access.user.userId, bodyText: payload.body,
    clientMessageId: payload.clientMessageId, sendStatus: "sent", direction: "inbound", transport: "in_app",
  });
  let realtimeDegraded = false;
  if (inserted.inserted) {
    try {
      const { getCloudflareContext } = await import("@opennextjs/cloudflare");
      const context = await getCloudflareContext({ async: true }) as unknown as { env?: Record<string, unknown> };
      const realtime = await fanoutSupportInboxInvalidation({ env: context.env ?? {}, conversationId: id, messageId: inserted.message.id, subject: "user_in_app_reply" });
      realtimeDegraded = realtime.degraded;
    } catch {
      // D1 success remains valid when the relay is unavailable.
      realtimeDegraded = true;
    }
  }
  return Response.json({ message: inserted.message, realtimeDegraded }, { status: inserted.inserted ? 201 : 200, headers: NO_STORE_HEADERS });
}
