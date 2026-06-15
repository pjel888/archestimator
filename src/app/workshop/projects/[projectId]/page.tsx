import { notFound, redirect } from "next/navigation";

import { ProjectDashboardClient } from "@/components/workshop/ProjectDashboardClient";
import type { ProjectActivityListItem } from "@/components/workshop/dashboard/ProjectActivityList";
import { sampleProjects } from "@/components/workshop/workshop-sample-projects";
import { isUuid } from "@/lib/ids";
import { getProjectActivity } from "@/lib/repositories/project-activity-repository";
import { getProjectDashboardSummary } from "@/lib/repositories/project-dashboard-repository";
import { getCurrentWorkspaceProject } from "@/lib/repositories/workspace-repository";
import { isProjectActivityEnabled } from "@/lib/workshop/dashboard-flags";

type ProjectDashboardPageProps = {
  params: Promise<{ projectId: string }>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
};

export default async function ProjectDashboardPage({ params, searchParams }: ProjectDashboardPageProps) {
  const { projectId } = await params;
  const resolvedSearchParams = await searchParams;
  const selectedEstimateId = readFirstSearchParam(resolvedSearchParams.estimate);
  const selectedGroupingMode = readFirstSearchParam(resolvedSearchParams.mode);
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

  const summary = project ? await getProjectDashboardSummary(projectId, { selectedEstimateId, selectedGroupingMode }) : null;
  const activity = project && isProjectActivityEnabled() ? toProjectActivityListItems(await getProjectActivity(projectId)) : null;

  return <ProjectDashboardClient project={project} fallback={fallback} summary={summary} activity={activity} />;
}

function toProjectActivityListItems(activity: Awaited<ReturnType<typeof getProjectActivity>>): ProjectActivityListItem[] {
  return activity.map(({ id, title, occurredAt }) => ({ id, title, occurredAt }));
}

function readFirstSearchParam(value: string | string[] | undefined): string | null {
  const firstValue = Array.isArray(value) ? value[0] : value;
  return typeof firstValue === "string" && firstValue.trim().length > 0 ? firstValue : null;
}
