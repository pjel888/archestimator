import { clientPortalEstimateRowsResponse } from "@/lib/client-portal/public-route-handlers";

export const dynamic = "force-dynamic";

export async function GET(request: Request, { params }: { params: Promise<{ token: string; sectionId: string }> }) {
  const { token, sectionId } = await params;
  return clientPortalEstimateRowsResponse(request, token, sectionId);
}
