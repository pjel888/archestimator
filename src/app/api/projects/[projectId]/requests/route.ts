import {
  createInternalChangeRequestResponse,
  listInternalChangeRequestsResponse,
} from "@/lib/change-requests/internal-handlers";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Context = { params: Promise<{ projectId: string }> };

export async function GET(request: Request, context: Context) {
  const { projectId } = await context.params;
  return listInternalChangeRequestsResponse(request, projectId);
}

export async function POST(request: Request, context: Context) {
  const { projectId } = await context.params;
  return createInternalChangeRequestResponse(request, projectId);
}
