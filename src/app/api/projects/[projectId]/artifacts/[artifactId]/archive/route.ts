import { handleArchiveArtifact } from "../../_route-core";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Context = { params: Promise<{ projectId: string; artifactId: string }> };

export async function POST(request: Request, context: Context) {
  const { projectId, artifactId } = await context.params;
  return handleArchiveArtifact(request, projectId, artifactId);
}
