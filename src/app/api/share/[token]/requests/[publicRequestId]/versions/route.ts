import { amendPublicChangeRequestResponse } from "@/lib/change-requests/public-handlers";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ publicRequestId: string; token: string }> },
) {
  const { publicRequestId, token } = await params;
  return amendPublicChangeRequestResponse(request, token, publicRequestId);
}
