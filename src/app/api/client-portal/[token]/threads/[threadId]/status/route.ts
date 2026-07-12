import { updateClientPortalThreadStatusResponse } from "@/lib/client-portal/public-thread-handlers";

export const dynamic = "force-dynamic";

export async function POST(request: Request, { params }: { params: Promise<{ token: string; threadId: string }> }) {
  const { threadId, token } = await params;
  return updateClientPortalThreadStatusResponse(request, token, threadId);
}
