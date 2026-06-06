import { Suspense, type ReactNode } from "react";

import { ProjectEstimateMetadataStrip } from "@/components/workshop/ProjectEstimateMetadataStrip";
import { ProjectMiniSidebar } from "@/components/workshop/ProjectMiniSidebar";
import { ProjectRouteContentFallback } from "@/components/workshop/ProjectRouteContentFallback";
import { ProjectWorkspaceHeaderRow } from "@/components/workshop/ProjectWorkspaceHeaderRow";
import { WorkshopPageShell } from "@/components/workshop/WorkshopPageShell";
import { sampleProjects } from "@/components/workshop/workshop-sample-projects";
import {
  getCurrentWorkspaceProject,
  getProjectCollaborationSummary,
  getProjectPublicationSummary,
  listProjectEstimateSheets,
} from "@/lib/repositories/workspace-repository";

type ProjectLayoutProps = {
  children: ReactNode;
  params: Promise<{ projectId: string }>;
};

export default async function ProjectLayout({ children, params }: ProjectLayoutProps) {
  const { projectId } = await params;
  const { project: liveProject } = await getCurrentWorkspaceProject(projectId);
  const [collaborationSummary, publicationSummary, projectEstimateSheets] = liveProject
    ? await Promise.all([
        getProjectCollaborationSummary(projectId),
        getProjectPublicationSummary(projectId),
        listProjectEstimateSheets(projectId),
      ])
    : [null, null, []];
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
      alignChromeToProjectSidebar
      contentClassName="pt-0 pb-0 pr-2 pl-0"
      centerHeader={<ProjectEstimateMetadataStrip />}
      projectId={projectId}
    >
      <div className="flex h-full min-h-0 overflow-hidden bg-white">
        <ProjectMiniSidebar projectId={projectId} />
        <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden bg-canvas">
          <ProjectWorkspaceHeaderRow
            projectId={projectId}
            projectCode={projectCode}
            collaborationSummary={collaborationSummary}
            publicationSummary={publicationSummary}
            projectEstimateSheets={projectEstimateSheets}
          />
          <div className="min-h-0 flex-1 overflow-hidden">
            <Suspense fallback={<ProjectRouteContentFallback />}>{children}</Suspense>
          </div>
        </div>
      </div>
    </WorkshopPageShell>
  );
}
