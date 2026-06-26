import { StaticWorkshopLoadingShell } from "@/components/workshop/StaticWorkshopLoadingShell";
import { ProjectsListSkeleton } from "@/components/workshop/ProjectsListSkeleton";

export default function Loading() {
  return (
    <StaticWorkshopLoadingShell
      title="Projects"
      eyebrow="Workspace"
      showEyebrow={false}
      canvasClassName="projects-canvas-wash"
    >
      <ProjectsListSkeleton />
    </StaticWorkshopLoadingShell>
  );
}
