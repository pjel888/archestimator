import { NO_STORE_HEADERS, assertAdminApiOrigin } from "@/lib/admin/require-admin";
import { getCurrentUserContext } from "@/lib/auth/session";
import { getCloudflareD1Database } from "@/lib/cloudflare/d1";
import { fanoutSupportInboxInvalidation } from "@/lib/cloudflare/support-inbox-fanout";
import {
  createSupportConversation,
  listSupportConversationsForUserInD1,
} from "@/lib/repositories/support-conversations-repository";

export const dynamic = "force-dynamic";

async function currentUser() {
  const user = await getCurrentUserContext();
  if (!user) return null;
  return user;
}

export async function GET() {
  const user = await currentUser();
  if (!user) return Response.json({ error: "Authentication required." }, { status: 401, headers: NO_STORE_HEADERS });
  const db = await getCloudflareD1Database();
  if (!db) return Response.json({ error: "Support storage unavailable." }, { status: 503, headers: NO_STORE_HEADERS });
  const conversations = await listSupportConversationsForUserInD1(db, user.userId);
  return Response.json({ conversations }, { headers: NO_STORE_HEADERS });
}

export async function POST(request: Request) {
  const originError = assertAdminApiOrigin(request);
  if (originError) return originError;
  const user = await currentUser();
  if (!user) return Response.json({ error: "Authentication required." }, { status: 401, headers: NO_STORE_HEADERS });
  const payload = await request.json().catch(() => null) as Record<string, unknown> | null;
  if (!payload || typeof payload.body !== "string" || typeof payload.clientMessageId !== "string") {
    return Response.json({ error: "A message and clientMessageId are required." }, { status: 400, headers: NO_STORE_HEADERS });
  }
  const result = await createSupportConversation({
    userId: user.userId,
    subject: typeof payload.subject === "string" ? payload.subject : undefined,
    initialBody: payload.body,
    clientMessageId: payload.clientMessageId,
  });
  if (result.error || !result.data) return Response.json({ error: result.error || "Support conversation could not be created." }, { status: 400, headers: NO_STORE_HEADERS });

  let realtimeDegraded = false;
  try {
    const { getCloudflareContext } = await import("@opennextjs/cloudflare");
    const context = await getCloudflareContext({ async: true }) as unknown as { env?: Record<string, unknown> };
    const realtime = await fanoutSupportInboxInvalidation({
      env: context.env ?? {},
      conversationId: result.data.conversation.id,
      messageId: result.data.message.id,
      subject: "user_in_app_conversation",
    });
    realtimeDegraded = realtime.degraded;
  } catch {
    // D1 is authoritative; clients backfill when the optional relay is unavailable.
    realtimeDegraded = true;
  }
  return Response.json({ ...result.data, realtimeDegraded }, { status: 201, headers: NO_STORE_HEADERS });
}
