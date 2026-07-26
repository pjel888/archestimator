import {
  createPublicChangeRequestResponse,
  listPublicChangeRequestsResponse,
} from "@/lib/change-requests/public-handlers";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(request: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  return listPublicChangeRequestsResponse(request, token);
}

export async function POST(request: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  return createPublicChangeRequestResponse(request, token);
}
