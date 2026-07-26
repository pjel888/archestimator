import { ProjectArtifactsWorkspace } from "@/components/workshop/project-timeline/ProjectArtifactsWorkspace";

type ProjectArtifactsPageProps = {
  params: Promise<{ projectId: string }>;
};

export default async function ProjectArtifactsPage({ params }: ProjectArtifactsPageProps) {
  const { projectId } = await params;
  return <ProjectArtifactsWorkspace projectId={projectId} />;
}
