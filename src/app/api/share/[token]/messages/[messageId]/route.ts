import { editClientPortalMessageResponse, tombstoneClientPortalMessageResponse } from "@/lib/client-portal/public-thread-handlers";
import { CLIENT_PORTAL_NO_STORE_HEADERS, isClientPortalToken } from "@/lib/client-portal/public-repository";

export const dynamic = "force-dynamic";

export async function PATCH(request: Request, { params }: { params: Promise<{ token: string; messageId: string }> }) {
  const { messageId, token } = await params;
  if (!await isClientPortalToken(token)) return Response.json({ error: "Shared-link discussion unavailable." }, { status: 404, headers: CLIENT_PORTAL_NO_STORE_HEADERS });
  return editClientPortalMessageResponse(request, token, messageId);
}

export async function DELETE(request: Request, { params }: { params: Promise<{ token: string; messageId: string }> }) {
  const { messageId, token } = await params;
  if (!await isClientPortalToken(token)) return Response.json({ error: "Shared-link discussion unavailable." }, { status: 404, headers: CLIENT_PORTAL_NO_STORE_HEADERS });
  return tombstoneClientPortalMessageResponse(request, token, messageId);
}
