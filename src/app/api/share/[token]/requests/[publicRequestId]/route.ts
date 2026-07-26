import { readPublicChangeRequestResponse } from "@/lib/change-requests/public-handlers";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ publicRequestId: string; token: string }> },
) {
  const { publicRequestId, token } = await params;
  return readPublicChangeRequestResponse(request, token, publicRequestId);
}
