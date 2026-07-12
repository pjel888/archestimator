import { createClientPortalThreadResponse, listClientPortalThreadsResponse } from "@/lib/client-portal/public-thread-handlers";

export const dynamic = "force-dynamic";

export async function POST(request: Request, { params }: { params: Promise<{ token: string }> }) {
  return createClientPortalThreadResponse(request, (await params).token);
}

export async function GET(request: Request, { params }: { params: Promise<{ token: string }> }) {
  return listClientPortalThreadsResponse(request, (await params).token);
}
