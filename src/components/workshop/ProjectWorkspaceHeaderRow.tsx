"use client";

import type { ReactNode } from "react";
import { usePathname } from "next/navigation";

import { EstimateCenterColumnBoundary } from "./EstimateCenterColumnBoundary";
import { ProjectEstimateMetadataStrip } from "./ProjectEstimateMetadataStrip";
import { ProjectWorkspaceProjectCode } from "./ProjectWorkspaceProjectCode";

type ProjectWorkspaceHeaderRowProps = {
  projectId: string;
  projectCode: string;
};

export function ProjectWorkspaceHeaderRow({ projectId, projectCode }: ProjectWorkspaceHeaderRowProps) {
  const pathname = usePathname();
  const isEstimateSheetRoute = Boolean(pathname?.startsWith(`/workshop/projects/${projectId}/estimates/`));
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
}: {
  children: ReactNode;
  centerContent?: ReactNode;
  centerId?: string;
  centerDataColumn?: string;
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
    </div>
  );
}
