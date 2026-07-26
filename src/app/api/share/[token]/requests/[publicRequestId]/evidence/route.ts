import { handleRecipientEvidenceByteUpload } from "./_route-core";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Context = {
  params: Promise<{ token: string; publicRequestId: string }>;
};

export async function POST(request: Request, context: Context) {
  const { token, publicRequestId } = await context.params;
  return handleRecipientEvidenceByteUpload(request, token, publicRequestId);
}
