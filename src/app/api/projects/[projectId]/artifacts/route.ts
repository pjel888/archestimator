import {
  handleCreateArtifact,
  handleListArtifacts,
} from "./_route-core";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Context = { params: Promise<{ projectId: string }> };

export async function GET(request: Request, context: Context) {
  const { projectId } = await context.params;
  return handleListArtifacts(request, projectId);
}

export async function POST(request: Request, context: Context) {
  const { projectId } = await context.params;
  return handleCreateArtifact(request, projectId);
}
