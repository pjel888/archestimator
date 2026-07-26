import { actOnInternalChangeRequestResponse } from "@/lib/change-requests/internal-handlers";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Context = { params: Promise<{ projectId: string; requestId: string }> };

export async function POST(request: Request, context: Context) {
  const { projectId, requestId } = await context.params;
  return actOnInternalChangeRequestResponse(request, projectId, requestId);
}
