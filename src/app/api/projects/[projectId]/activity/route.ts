import { NextResponse, type NextRequest } from "next/server";

import { requireCurrentUserContext, type CurrentUserContext } from "@/lib/auth/session";
import { canEditProjectInD1 } from "@/lib/authz/d1-access";
import { getCloudflareD1Database } from "@/lib/cloudflare/d1";
import { isUuid } from "@/lib/ids";
import { readProjectActivityFeed } from "@/lib/repositories/project-activity-feed-repository";
import { getCurrentWorkspaceProject } from "@/lib/repositories/workspace-repository";
import { parseActivityUrlSearchParams } from "@/components/workshop/project-activity/url-state";

export const dynamic = "force-dynamic";

type ProjectActivityRouteContext = {
  params: Promise<{ projectId: string }>;
};

const noStoreHeaders = {
  "Cache-Control": "private, no-store, max-age=0",
  "X-Content-Type-Options": "nosniff",
};

async function canEditProject(projectId: string, currentUser: CurrentUserContext) {
  const db = await getCloudflareD1Database();
  if (!db) return false;
  try {
    return await canEditProjectInD1(db, projectId, currentUser);
  } catch {
    return false;
  }
}

function jsonResponse(body: unknown, init?: ResponseInit) {
  return NextResponse.json(body, {
    ...init,
    headers: {
      ...noStoreHeaders,
      ...(init?.headers ?? {}),
    },
  });
}

export async function GET(request: NextRequest, context: ProjectActivityRouteContext) {
  const [{ projectId }, currentUser] = await Promise.all([context.params, requireCurrentUserContext()]);
  if (!isUuid(projectId)) return jsonResponse({ error: "Invalid project." }, { status: 400 });

  const { project } = await getCurrentWorkspaceProject(projectId);
  if (!project) return jsonResponse({ error: "Project not found." }, { status: 404 });

  const canEdit = await canEditProject(project.id, currentUser);
  if (!canEdit) return jsonResponse({ error: "Project activity is not available." }, { status: 403 });

  const pageState = parseActivityUrlSearchParams(request.nextUrl.searchParams);
  const limitParam = Number(request.nextUrl.searchParams.get("limit") ?? 20);
  const limit = Number.isFinite(limitParam) ? Math.min(50, Math.max(1, Math.trunc(limitParam))) : 20;
  const cursor = request.nextUrl.searchParams.get("cursor");

  const page = await readProjectActivityFeed({
    projectId: project.id,
    scope: pageState.scope,
    filters: {
      actions: pageState.actions,
      actorUserId: pageState.actor,
      recipientId: pageState.client,
    },
    cursor,
    limit,
    includeCounts: request.nextUrl.searchParams.get("includeCounts") === "true",
  });

  return jsonResponse(page);
}
