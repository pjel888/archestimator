import { editClientPortalMessageResponse, tombstoneClientPortalMessageResponse } from "@/lib/client-portal/public-thread-handlers";

export const dynamic = "force-dynamic";

export async function PATCH(request: Request, { params }: { params: Promise<{ token: string; messageId: string }> }) {
  const { messageId, token } = await params;
  return editClientPortalMessageResponse(request, token, messageId);
}

export async function DELETE(request: Request, { params }: { params: Promise<{ token: string; messageId: string }> }) {
  const { messageId, token } = await params;
  return tombstoneClientPortalMessageResponse(request, token, messageId);
}
