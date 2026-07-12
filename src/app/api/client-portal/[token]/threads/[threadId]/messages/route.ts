import { listClientPortalThreadMessagesResponse, replyClientPortalThreadResponse } from "@/lib/client-portal/public-thread-handlers";

export const dynamic = "force-dynamic";

export async function POST(request: Request, { params }: { params: Promise<{ token: string; threadId: string }> }) {
  const { threadId, token } = await params;
  return replyClientPortalThreadResponse(request, token, threadId);
}

export async function GET(request: Request, { params }: { params: Promise<{ token: string; threadId: string }> }) {
  const { threadId, token } = await params;
  return listClientPortalThreadMessagesResponse(request, token, threadId);
}
