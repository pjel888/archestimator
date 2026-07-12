import { clientPortalSectionResponse } from "@/lib/client-portal/public-route-handlers";

export const dynamic = "force-dynamic";

export async function GET(request: Request, { params }: { params: Promise<{ token: string; sectionId: string }> }) {
  const { token, sectionId } = await params;
  return clientPortalSectionResponse(request, token, sectionId);
}
