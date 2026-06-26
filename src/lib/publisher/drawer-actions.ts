"use server";

import { requireAuth, requireCurrentUserContext } from "@/lib/auth/session";
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

export type PublisherPublicationDrawerData = {
  collaborationSummary: ProjectCollaborationSummary | null;
  currentUserEmail: string | null;
  estimateSheets: ProjectEstimateSheet[];
  summary: ProjectPublicationSummary | null;
};

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

  const [summary, estimateSheets, collaborationSummary] = await Promise.all([
    getProjectPublicationSummary(projectId),
    listProjectEstimateSheets(projectId),
    getProjectCollaborationSummary(projectId),
  ]);

  return {
    collaborationSummary,
    currentUserEmail: currentUser.email ?? null,
    estimateSheets: estimateSheets.map((estimate) => ({
      id: estimate.id,
      name: estimate.name,
      sheetCode: estimate.sheetCode,
    })),
    summary: redactPublisherClientLinkForReadOnly(summary, canManagePublication),
  };
}
