import { handlePublicArtifactContent } from "./_route-core";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Context = { params: Promise<{ token: string; publicArtifactId: string }> };

export async function GET(request: Request, context: Context) {
  const { token, publicArtifactId } = await context.params;
  return handlePublicArtifactContent(request, token, publicArtifactId);
}
