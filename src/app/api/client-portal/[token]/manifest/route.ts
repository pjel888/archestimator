import { clientPortalManifestResponse } from "@/lib/client-portal/public-route-handlers";

export const dynamic = "force-dynamic";

export async function GET(request: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  return clientPortalManifestResponse(request, token);
}
