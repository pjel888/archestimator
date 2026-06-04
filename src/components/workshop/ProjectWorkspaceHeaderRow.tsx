"use client";

import type { ReactNode } from "react";
import { usePathname } from "next/navigation";

import { EstimateCenterColumnBoundary } from "./EstimateCenterColumnBoundary";
import { ProjectEstimateMetadataStrip } from "./ProjectEstimateMetadataStrip";
import { ProjectPublicationHeader } from "./ProjectPublicationHeader";
import { ProjectTeamspaceHeader } from "./ProjectTeamspaceHeader";
import { ProjectWorkspaceProjectCode } from "./ProjectWorkspaceProjectCode";
import type { ProjectCollaborationSummary } from "@/lib/collaboration/types";
import type { ProjectEstimateSheet, ProjectPublicationSummary } from "@/lib/publication/types";

type ProjectWorkspaceHeaderRowProps = {
  projectId: string;
  projectCode: string;
  collaborationSummary: ProjectCollaborationSummary | null;
  publicationSummary?: ProjectPublicationSummary | null;
  projectEstimateSheets?: ProjectEstimateSheet[];
};

export function ProjectWorkspaceHeaderRow({
  projectId,
  projectCode,
  collaborationSummary,
  publicationSummary = null,
  projectEstimateSheets = [],
}: ProjectWorkspaceHeaderRowProps) {
  const pathname = usePathname();
  const isEstimateSheetRoute = Boolean(pathname?.startsWith(`/workshop/projects/${projectId}/estimates/`));
  const currentCollaborator = collaborationSummary?.collaborators.find(
    (collaborator) => collaborator.id === collaborationSummary.currentUserId,
  );
  const currentUserEmail = currentCollaborator?.email ?? null;
  const projectCodeHeader = isEstimateSheetRoute ? null : (
    <ProjectWorkspaceProjectCode
      projectCode={projectCode}
      className="absolute inset-y-0 left-0 flex items-center pl-4 pr-2"
      style={{ width: "var(--estimate-tree-panel-width)" }}
      textClassName="font-medium"
    />
  );

  return (
    <ProjectWorkspaceHeaderSurface
      centerContent={isEstimateSheetRoute ? <ProjectEstimateMetadataStrip /> : null}
      centerId="project-estimate-metadata-strip"
      centerDataColumn="metadata-strip"
      rightContent={
        <div className="flex h-full min-w-0 items-center justify-end">
          <ProjectPublicationHeader summary={publicationSummary} currentUserEmail={currentUserEmail} projectEstimateSheets={projectEstimateSheets} />
          <span className="h-4 w-px bg-hairline" aria-hidden="true" />
          <ProjectTeamspaceHeader summary={collaborationSummary} />
        </div>
      }
    >
      {projectCodeHeader}
    </ProjectWorkspaceHeaderSurface>
  );
}

function ProjectWorkspaceHeaderSurface({
  children,
  centerContent,
  centerId,
  centerDataColumn,
  rightContent,
}: {
  children: ReactNode;
  centerContent?: ReactNode;
  centerId?: string;
  centerDataColumn?: string;
  rightContent?: ReactNode;
}) {
  return (
    <div className="relative h-10 shrink-0 border-b border-hairline bg-white" data-workshop-layout="project-workspace-header-row">
      {children}
      {centerContent ? (
        <EstimateCenterColumnBoundary
          id={centerId}
          scope="project-workspace-row"
          className="pointer-events-none"
          data-estimate-center-column={centerDataColumn}
        >
          {centerContent}
        </EstimateCenterColumnBoundary>
      ) : null}
      {rightContent ? (
        <div
          className="absolute inset-y-0 right-0 z-10 flex min-w-0 items-center justify-end"
          style={{ width: "var(--estimate-library-panel-width)" }}
          data-workshop-layout="project-workspace-header-actions"
        >
          {rightContent}
        </div>
      ) : null}
    </div>
  );
}
