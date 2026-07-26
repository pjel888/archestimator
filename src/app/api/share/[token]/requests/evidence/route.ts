import { handleRecipientEvidenceUpload } from "./_route-core";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Context = { params: Promise<{ token: string }> };

export async function POST(request: Request, context: Context) {
  const { token } = await context.params;
  return handleRecipientEvidenceUpload(request, token);
}
