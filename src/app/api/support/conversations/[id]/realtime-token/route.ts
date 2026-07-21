import { NO_STORE_HEADERS } from "@/lib/admin/require-admin";
import { issueSupportInboxRealtimeToken } from "@/lib/collaboration/realtime-identity-actions";

export const dynamic = "force-dynamic";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const token = await issueSupportInboxRealtimeToken({ conversationId: (await params).id });
  if (!token) return Response.json({ error: "Support realtime access denied." }, { status: 403, headers: NO_STORE_HEADERS });
  return Response.json(token, { headers: NO_STORE_HEADERS });
}
