import { notFound } from "next/navigation";

import { ProjectDashboardClient } from "@/components/workshop/ProjectDashboardClient";
import { sampleProjects } from "@/components/workshop/workshop-sample-projects";
import { getCurrentWorkspaceProject } from "@/lib/repositories/workspace-repository";

type ProjectDashboardPageProps = {
  params: Promise<{ projectId: string }>;
};

export default async function ProjectDashboardPage({ params }: ProjectDashboardPageProps) {
  const { projectId } = await params;
  const { project } = await getCurrentWorkspaceProject(projectId);
  const sampleProject = sampleProjects.find((item) => item.id === projectId);

  if (!project && !sampleProject) notFound();

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
