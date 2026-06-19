import { notFound, redirect } from "next/navigation";

import { ProjectDashboardClient, type ProjectPublicationDashboardStatus } from "@/components/workshop/ProjectDashboardClient";
import { sampleProjects } from "@/components/workshop/workshop-sample-projects";
import { isUuid } from "@/lib/ids";
import { createEmptyProjectActivityPage, listProjectActivityPage } from "@/lib/repositories/project-activity-repository";
import { listRecentProjectEstimateSheets } from "@/lib/repositories/project-estimate-sheets-repository";
import { getProjectLocation } from "@/lib/repositories/project-location-repository";
import { getCurrentWorkspaceProject, getProjectPublicationSummary } from "@/lib/repositories/workspace-repository";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { ProjectPublicationSummary } from "@/lib/publication/types";

type ProjectDashboardPageProps = {
  params: Promise<{ projectId: string }>;
};

function createPublicationDashboardStatus(summary: ProjectPublicationSummary | null): ProjectPublicationDashboardStatus {
  if (!summary) {
    return {
      status: "unpublished",
      clientLinkPath: null,
      selectedEstimateCount: 0,
      passwordRequired: false,
      latestOpenedAt: null,
      openCount: 0,
      isStale: false,
      canCopy: false,
      canOpen: false,
    };
  }

  const hasPublishedLink = summary.status === "published" && Boolean(summary.clientLinkPath);
  return {
    status: summary.status,
    clientLinkPath: summary.clientLinkPath,
    selectedEstimateCount: summary.selectedEstimateCount,
    passwordRequired: summary.passwordRequired,
    latestOpenedAt: summary.latestOpenedAt,
    openCount: summary.openCount,
    isStale: Boolean(summary.staleSnapshotWarning),
    canCopy: hasPublishedLink && summary.tokenCopyAvailable,
    canOpen: hasPublishedLink,
  };
}

async function canEditProject(projectId: string) {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.rpc("can_edit_project", { target_project_id: projectId });
  if (error) return false;
  return data === true;
}

export default async function ProjectDashboardPage({ params }: ProjectDashboardPageProps) {
  const { projectId } = await params;
  const { project } = await getCurrentWorkspaceProject(projectId);
  const sampleProject = sampleProjects.find((item) => item.id === projectId);

  if (!project && !sampleProject) {
    if (isUuid(projectId)) redirect(`/workshop?removedProject=${encodeURIComponent(projectId)}`);
    notFound();
  }

  const fallback = {
    id: projectId,
    name: sampleProject?.name ?? "Project",
    client: sampleProject?.client ?? "No client yet",
    location: sampleProject?.location ?? "No location",
    projectCode: "No project code",
    currencyCode: "PHP",
  };

  const [recentSheets, publicationSummary, activity, canEdit] = project
    ? await Promise.all([
      listRecentProjectEstimateSheets(project.id),
      getProjectPublicationSummary(project.id),
      listProjectActivityPage({ projectId: project.id }),
      canEditProject(project.id),
    ])
    : [[], null, createEmptyProjectActivityPage(), false];
  const projectLocation = project && canEdit ? await getProjectLocation(project.id) : null;

  return (
    <ProjectDashboardClient
      project={project}
      fallback={fallback}
      recentSheets={recentSheets}
      publicationStatus={createPublicationDashboardStatus(publicationSummary)}
      activity={activity}
      projectLocation={projectLocation}
      canEditProject={canEdit}
    />
  );
}
