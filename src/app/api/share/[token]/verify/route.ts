import { clientPortalRecipientVerificationResponse } from "@/lib/client-portal/public-session-handler";

export const dynamic = "force-dynamic";

export async function POST(request: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  return clientPortalRecipientVerificationResponse(request, token);
}
