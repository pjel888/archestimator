import { clientPortalPasswordResponse } from "@/lib/client-portal/public-password-handler";

export const dynamic = "force-dynamic";

export async function POST(request: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  return clientPortalPasswordResponse(request, token);
}
