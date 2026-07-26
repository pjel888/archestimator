"use server";

import { revalidatePath } from "next/cache";

import { getCloudflareD1Database } from "@/lib/cloudflare/d1";
import type { ClientPortalIssueDraft } from "@/lib/client-portal/issue-draft-repository";
import {
  abandonClientPortalIssueDraft,
  markClientPortalIssueDraftReady,
  openClientPortalIssueDraft,
  saveClientPortalIssueDraft,
} from "@/lib/client-portal/issue-draft-service";
import { loadClientPortalIssueDraftSources } from "@/lib/client-portal/issue-draft-sources";
import { assertProjectPublicationManager } from "@/lib/publication/actions";

async function context(projectId: string) {
  const [manager, database] = await Promise.all([assertProjectPublicationManager(projectId), getCloudflareD1Database()]);
  if (!database) throw new Error("Something went wrong. Try again in a moment.");
  return { actorId: manager.currentUserId, database, projectId: manager.project.id, workspaceId: manager.project.workspace_id };
}

function detailPath(projectId: string, portalId: string) {
  return `/workshop/projects/${encodeURIComponent(projectId)}/client-portals/${encodeURIComponent(portalId)}?tab=content`;
}

export async function openClientPortalIssueDraftAction(input: { portalId: string; projectId: string }) {
  const scope = await context(input.projectId);
  const [{ draft }, sources] = await Promise.all([
    openClientPortalIssueDraft({
      actorId: scope.actorId,
      database: scope.database,
      now: new Date().toISOString(),
      portalId: input.portalId,
      projectId: scope.projectId,
      workspaceId: scope.workspaceId,
    }),
    loadClientPortalIssueDraftSources(scope.database, {
      portalId: input.portalId,
      projectId: scope.projectId,
      workspaceId: scope.workspaceId,
    }),
  ]);
  return { draft, sources };
}

export async function saveClientPortalIssueDraftAction(input: { draft: ClientPortalIssueDraft; portalId: string; projectId: string }) {
  const scope = await context(input.projectId);
  const draft = await saveClientPortalIssueDraft({
    actorId: scope.actorId,
    artifacts: input.draft.artifacts,
    database: scope.database,
    draftId: input.draft.id,
    estimates: input.draft.estimates,
    expectedRevision: input.draft.draftRevision,
    metadata: input.draft,
    now: new Date().toISOString(),
    portalId: input.portalId,
    projectId: scope.projectId,
    requests: input.draft.requests,
    workspaceId: scope.workspaceId,
  });
  revalidatePath(detailPath(scope.projectId, input.portalId));
  return draft;
}

export async function markClientPortalIssueDraftReadyAction(input: { draftId: string; expectedRevision: number; portalId: string; projectId: string }) {
  const scope = await context(input.projectId);
  const draft = await markClientPortalIssueDraftReady({
    actorId: scope.actorId,
    database: scope.database,
    draftId: input.draftId,
    expectedRevision: input.expectedRevision,
    now: new Date().toISOString(),
    portalId: input.portalId,
    projectId: scope.projectId,
    workspaceId: scope.workspaceId,
  });
  revalidatePath(detailPath(scope.projectId, input.portalId));
  return draft;
}

export async function abandonClientPortalIssueDraftAction(input: { draftId: string; expectedRevision: number; portalId: string; projectId: string }) {
  const scope = await context(input.projectId);
  const draft = await abandonClientPortalIssueDraft({
    actorId: scope.actorId,
    database: scope.database,
    draftId: input.draftId,
    expectedRevision: input.expectedRevision,
    now: new Date().toISOString(),
    portalId: input.portalId,
    projectId: scope.projectId,
    workspaceId: scope.workspaceId,
  });
  revalidatePath(detailPath(scope.projectId, input.portalId));
  return draft;
}
