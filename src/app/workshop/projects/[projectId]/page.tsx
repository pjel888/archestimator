import { notFound, redirect } from "next/navigation";

import { ProjectDashboardClient } from "@/components/workshop/ProjectDashboardClient";
import { sampleProjects } from "@/components/workshop/workshop-sample-projects";
import { isUuid } from "@/lib/ids";
import { getCurrentWorkspaceProject } from "@/lib/repositories/workspace-repository";

type ProjectDashboardPageProps = {
  params: Promise<{ projectId: string }>;
};

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

  return <ProjectDashboardClient project={project} fallback={fallback} />;
}
