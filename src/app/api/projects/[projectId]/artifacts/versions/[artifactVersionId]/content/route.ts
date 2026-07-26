import { handleInternalArtifactContent } from "./_route-core";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Context = { params: Promise<{ projectId: string; artifactVersionId: string }> };

export async function GET(request: Request, context: Context) {
  const { projectId, artifactVersionId } = await context.params;
  return handleInternalArtifactContent(request, projectId, artifactVersionId);
}
