import { gateAdminApiGet, NO_STORE_HEADERS } from "@/lib/admin/require-admin";
import { getCloudflareD1Database } from "@/lib/cloudflare/d1";
import {
  listSupportAttachmentsForConversationInD1,
  listSupportMessages,
  markSupportConversationReadForAdminInD1,
} from "@/lib/repositories/support-conversations-repository";

export const dynamic = "force-dynamic";

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/iu;

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  const gate = await gateAdminApiGet();
  if (!gate.ok) return gate.response;

  const { id } = await context.params;

  if (!UUID_PATTERN.test(id)) {
    return Response.json({ error: "Invalid conversation ID." }, { status: 400, headers: NO_STORE_HEADERS });
  }

  const db = await getCloudflareD1Database();
  if (db) {
    await markSupportConversationReadForAdminInD1(db, id).catch(() => undefined);
  }

  const result = await listSupportMessages(id, { limit: 200 });
  const attachments = db ? await listSupportAttachmentsForConversationInD1(db, id).catch(() => []) : [];

  return Response.json(
    {
      messages: result.data,
      attachments,
      degraded: Boolean(result.error),
      error: result.error,
    },
    { headers: NO_STORE_HEADERS },
  );
}
