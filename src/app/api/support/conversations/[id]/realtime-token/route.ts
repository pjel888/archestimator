import { issueSupportInboxRealtimeToken } from "@/lib/collaboration/realtime-identity-actions";
import { SUPPORT_NO_STORE_HEADERS, supportJsonError } from "@/lib/support/http";
import { supportRealtimeProtocols } from "@/lib/support/realtime-protocol";

export const dynamic = "force-dynamic";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const token = await issueSupportInboxRealtimeToken({ conversationId: (await params).id });
  if (!token) return supportJsonError("Support conversation not found.", 404);
  return Response.json(
    {
      roomToken: token.roomToken,
      protocols: supportRealtimeProtocols(token.roomToken),
    },
    { headers: SUPPORT_NO_STORE_HEADERS },
  );
}
