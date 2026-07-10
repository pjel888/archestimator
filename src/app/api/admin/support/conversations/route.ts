import { gateAdminApiGet, NO_STORE_HEADERS } from "@/lib/admin/require-admin";
import { listSupportConversations } from "@/lib/repositories/support-conversations-repository";

export const dynamic = "force-dynamic";

export async function GET() {
  const gate = await gateAdminApiGet();
  if (!gate.ok) return gate.response;

  const result = await listSupportConversations({ limit: 100 });
  return Response.json(
    {
      conversations: result.data,
      degraded: Boolean(result.error),
      error: result.error,
    },
    { headers: NO_STORE_HEADERS },
  );
}
