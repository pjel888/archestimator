"use server";

import { requireAuth, requireCurrentUserContext } from "@/lib/auth/session";
import { getCloudflareD1Database } from "@/lib/cloudflare/d1";
import type {
  ProjectEstimateSheet,
  ProjectPublicationSummary,
} from "@/lib/publication/types";
import type { ProjectCollaborationSummary } from "@/lib/collaboration/types";
import {
  getProjectCollaborationSummary,
  getProjectPublicationSummary,
  listCurrentWorkspaceProjects,
  listProjectEstimateSheets,
} from "@/lib/repositories/workspace-repository";
import {
  canManagePublisherRosterProject,
  canReadPublisherRosterProject,
} from "@/lib/publisher/permissions";
import { isClientPortalLegacyMigrationEnabled } from "@/lib/client-portal/rollout";

export type PublisherPublicationDrawerData = {
  collaborationSummary: ProjectCollaborationSummary | null;
  currentUserEmail: string | null;
  estimateSheets: ProjectEstimateSheet[];
  legacyMigrationEnabled: boolean;
  summary: ProjectPublicationSummary | null;
};

export async function updatePublisherProjectClientName({
  clientName,
  projectId,
}: {
  clientName: string;
  projectId: string;
}) {
  await requireAuth();
  const normalizedClientName = clientName.trim().replace(/\s+/g, " ");
  if (normalizedClientName.length > 160) {
    throw new Error("Client name must be 160 characters or fewer.");
  }

  const workspaceProjects = await listCurrentWorkspaceProjects();
  const project = workspaceProjects.projects.find((item) => item.project.id === projectId);
  if (!project || !canManagePublisherRosterProject(project.currentUserRole)) {
    throw new Error("You do not have permission to edit this Publisher project.");
  }

  const database = await getCloudflareD1Database();
  if (!database) throw new Error("Something went wrong. Try again in a moment.");
  await database
    .prepare(`
      UPDATE projects
      SET client_name = ?,
          publication_source_revision = publication_source_revision + 1,
          updated_at = ?
      WHERE id = ? AND workspace_id = ?
    `)
    .bind(
      normalizedClientName || null,
      new Date().toISOString(),
      projectId,
      project.project.workspace_id,
    )
    .run();

  return { clientName: normalizedClientName || null, ok: true };
}

function redactPublisherClientLinkForReadOnly(
  summary: ProjectPublicationSummary | null,
  canManagePublication: boolean,
): ProjectPublicationSummary | null {
  if (!summary || canManagePublication) return summary;
  return {
    ...summary,
    clientLinkPath: null,
    tokenCopyAvailable: false,
  };
}

export async function readPublisherPublicationDrawerData(
  projectId: string,
): Promise<PublisherPublicationDrawerData> {
  await requireAuth();
  const [currentUser, workspaceProjects] = await Promise.all([
    requireCurrentUserContext(),
    listCurrentWorkspaceProjects(),
  ]);
  const project = workspaceProjects.projects.find((item) => item.project.id === projectId);
  if (!project || !canReadPublisherRosterProject(project.currentUserRole)) {
    throw new Error("Project is not available in Publisher.");
  }
  const canManagePublication = canManagePublisherRosterProject(project.currentUserRole);

  const [summary, estimateSheets, collaborationSummary, legacyMigrationEnabled] = await Promise.all([
    getProjectPublicationSummary(projectId),
    listProjectEstimateSheets(projectId),
    getProjectCollaborationSummary(projectId),
    isClientPortalLegacyMigrationEnabled(),
  ]);

  return {
    collaborationSummary,
    currentUserEmail: currentUser.email ?? null,
    estimateSheets: estimateSheets.map((estimate) => ({
      id: estimate.id,
      name: estimate.name,
      sheetCode: estimate.sheetCode,
    })),
    legacyMigrationEnabled,
    summary: redactPublisherClientLinkForReadOnly(summary, canManagePublication),
  };
}
