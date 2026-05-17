import type { ReactNode } from "react";

import { ProjectMiniSidebar } from "@/components/workshop/ProjectMiniSidebar";
import { WorkshopPageShell } from "@/components/workshop/WorkshopPageShell";
import { sampleProjects } from "@/components/workshop/workshop-sample-projects";

type ProjectLayoutProps = {
  children: ReactNode;
  params: Promise<{ projectId: string }>;
};

export default async function ProjectLayout({ children, params }: ProjectLayoutProps) {
  const { projectId } = await params;
  const project = sampleProjects.find((item) => item.id === projectId);
  const title = project?.name ?? "Project";

  return (
    <WorkshopPageShell
      title={title}
      eyebrow="Project"
      footer={
        <>
          <span>{project?.client ?? projectId}</span>
          <span>Dashboard + estimates shell</span>
        </>
      }
    >
      <div className="flex h-full min-h-0 overflow-hidden rounded-xl border border-hairline bg-white">
        <ProjectMiniSidebar projectId={projectId} />
        <div className="min-h-0 min-w-0 flex-1 overflow-hidden bg-canvas">{children}</div>
      </div>
    </WorkshopPageShell>
  );
}
