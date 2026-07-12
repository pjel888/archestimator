import { replyClientPortalThreadResponse } from "@/lib/client-portal/public-thread-handlers";
import { CLIENT_PORTAL_NO_STORE_HEADERS, isClientPortalToken } from "@/lib/client-portal/public-repository";

export const dynamic = "force-dynamic";

export async function POST(request: Request, { params }: { params: Promise<{ token: string; threadId: string }> }) {
  const { threadId, token } = await params;
  if (!await isClientPortalToken(token)) return Response.json({ error: "Shared-link discussion unavailable." }, { status: 404, headers: CLIENT_PORTAL_NO_STORE_HEADERS });
  return replyClientPortalThreadResponse(request, token, threadId);
}
