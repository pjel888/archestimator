import { handleProjectArtifactUpload } from "../_upload";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Context = { params: Promise<{ projectId: string }> };

export async function POST(request: Request, context: Context) {
  const { projectId } = await context.params;
  return handleProjectArtifactUpload(request, projectId);
}
