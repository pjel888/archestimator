import { NextResponse, type NextRequest } from "next/server";

import { requireCurrentUserContext } from "@/lib/auth/session";
import { isUuid } from "@/lib/ids";
import {
  PROJECT_COMMITMENT_EVENT_SOURCE_TYPES,
  type ProjectCommitmentEventSourceType,
} from "@/lib/project-ledger/contracts";
import { readProjectTimelinePage } from "@/lib/project-ledger/timeline-repository";
import { getCurrentWorkspaceProject } from "@/lib/repositories/workspace-repository";

export const dynamic = "force-dynamic";

const headers = {
  "Cache-Control": "private, no-store, max-age=0",
  "X-Content-Type-Options": "nosniff",
};

function response(body: unknown, status = 200) {
  return NextResponse.json(body, { status, headers });
}

export async function GET(request: NextRequest, { params }: { params: Promise<{ projectId: string }> }) {
  const [{ projectId }] = await Promise.all([params, requireCurrentUserContext()]);
  if (!isUuid(projectId)) return response({ error: "Invalid project." }, 400);
  const { project } = await getCurrentWorkspaceProject(projectId);
  if (!project) return response({ error: "Project not found." }, 404);
  const source = request.nextUrl.searchParams.get("source");
  const sourceTypes = source && PROJECT_COMMITMENT_EVENT_SOURCE_TYPES.includes(source as ProjectCommitmentEventSourceType)
    ? [source as ProjectCommitmentEventSourceType]
    : [];
  const rawLimit = Number(request.nextUrl.searchParams.get("limit") ?? 20);
  const limit = Number.isFinite(rawLimit) ? Math.max(1, Math.min(50, Math.trunc(rawLimit))) : 20;
  try {
    const page = await readProjectTimelinePage({
      cursor: request.nextUrl.searchParams.get("cursor"),
      filters: { portalId: request.nextUrl.searchParams.get("portal"), sourceTypes },
      limit,
      projectId: project.id,
    });
    return response(page);
  } catch (error) {
    return response({ error: error instanceof Error ? error.message : "Project timeline is unavailable." }, 400);
  }
}
