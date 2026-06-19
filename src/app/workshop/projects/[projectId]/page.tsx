import { notFound, redirect } from "next/navigation";

import { ProjectDashboardClient, type ProjectPublicationDashboardStatus } from "@/components/workshop/ProjectDashboardClient";
import { sampleProjects } from "@/components/workshop/workshop-sample-projects";
import { isUuid } from "@/lib/ids";
import { listRecentProjectEstimateSheets } from "@/lib/repositories/project-estimate-sheets-repository";
import { getCurrentWorkspaceProject, getProjectPublicationSummary } from "@/lib/repositories/workspace-repository";
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

  const [recentSheets, publicationSummary] = project
    ? await Promise.all([listRecentProjectEstimateSheets(project.id), getProjectPublicationSummary(project.id)])
    : [[], null];

  return (
    <ProjectDashboardClient
      project={project}
      fallback={fallback}
      recentSheets={recentSheets}
      publicationStatus={createPublicationDashboardStatus(publicationSummary)}
    />
  );
}
