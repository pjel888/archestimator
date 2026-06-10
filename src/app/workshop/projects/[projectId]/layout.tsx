import { Suspense, type ReactNode } from "react";

import { ProjectEstimateMetadataStrip } from "@/components/workshop/ProjectEstimateMetadataStrip";
import { ProjectMiniSidebar } from "@/components/workshop/ProjectMiniSidebar";
import { ProjectPublicationHeader } from "@/components/workshop/ProjectPublicationHeader";
import { ProjectRouteContentFallback } from "@/components/workshop/ProjectRouteContentFallback";
import { ProjectTeamspaceHeader } from "@/components/workshop/ProjectTeamspaceHeader";
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
  const currentCollaborator = collaborationSummary?.collaborators.find(
    (collaborator) => collaborator.id === collaborationSummary.currentUserId,
  );
  const currentUserEmail = currentCollaborator?.email ?? null;

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
      actions={
        <div className="flex h-10 min-w-0 items-center justify-end">
          <ProjectPublicationHeader
            summary={publicationSummary}
            currentUserEmail={currentUserEmail}
            projectEstimateSheets={projectEstimateSheets}
          />
          <span className="mx-2 h-4 w-px bg-hairline" aria-hidden="true" />
          <ProjectTeamspaceHeader summary={collaborationSummary} />
        </div>
      }
    >
      <div className="flex h-full min-h-0 overflow-hidden bg-white">
        <ProjectMiniSidebar projectId={projectId} />
        <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden bg-canvas">
          <div className="min-h-0 flex-1 overflow-hidden">
            <Suspense fallback={<ProjectRouteContentFallback />}>{children}</Suspense>
          </div>
        </div>
      </div>
    </WorkshopPageShell>
  );
}
