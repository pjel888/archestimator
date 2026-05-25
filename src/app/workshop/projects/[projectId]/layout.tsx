import type { ReactNode } from "react";

import { ProjectMiniSidebar } from "@/components/workshop/ProjectMiniSidebar";
import { ProjectTotalHeader } from "@/components/workshop/ProjectTotalHeader";
import { ProjectWorkspaceHeaderRow } from "@/components/workshop/ProjectWorkspaceHeaderRow";
import { WorkshopPageShell } from "@/components/workshop/WorkshopPageShell";
import { sampleProjects } from "@/components/workshop/workshop-sample-projects";
import { getCurrentWorkspaceProject } from "@/lib/repositories/workspace-repository";

type ProjectLayoutProps = {
  children: ReactNode;
  params: Promise<{ projectId: string }>;
};

export default async function ProjectLayout({ children, params }: ProjectLayoutProps) {
  const { projectId } = await params;
  const { project: liveProject } = await getCurrentWorkspaceProject(projectId);
  const sampleProject = sampleProjects.find((item) => item.id === projectId);
  const project = liveProject ?? sampleProject;
  const title = project?.name ?? "Project";
  const projectClient = liveProject?.client_name ?? sampleProject?.client ?? projectId;
  const projectCode = liveProject?.project_code ?? projectId;

  return (
    <WorkshopPageShell
      title={title}
      eyebrow={projectClient}
      breadcrumbs={[
        { label: "Workshop", href: "/workshop" },
        { label: "Projects", href: "/workshop/projects" },
        { label: title, href: `/workshop/projects/${projectId}` },
      ]}
      centerHeader={<ProjectTotalHeader projectId={projectId} />}
      alignChromeToProjectSidebar
      contentClassName="py-2 pr-2 pl-0"
      footer={
        <>
          <span>Dashboard + estimates shell</span>
        </>
      }
    >
      <div className="flex h-full min-h-0 overflow-hidden rounded-xs border border-hairline bg-white">
        <ProjectMiniSidebar projectId={projectId} />
        <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden bg-canvas">
          <ProjectWorkspaceHeaderRow projectId={projectId} projectCode={projectCode} />
          <div className="min-h-0 flex-1 overflow-hidden">{children}</div>
        </div>
      </div>
    </WorkshopPageShell>
  );
}
