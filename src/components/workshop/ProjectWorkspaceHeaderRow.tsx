"use client";

import type { ReactNode } from "react";
import { usePathname } from "next/navigation";

import { ProjectEstimateMetadataStrip } from "./ProjectEstimateMetadataStrip";
import { ProjectWorkspaceProjectCode } from "./ProjectWorkspaceProjectCode";

type ProjectWorkspaceHeaderRowProps = {
  projectCode: string;
};

export function ProjectWorkspaceHeaderRow({ projectCode }: ProjectWorkspaceHeaderRowProps) {
  const pathname = usePathname();
  const isEstimateSheetRoute = Boolean(pathname?.includes("/estimates/"));

  return (
    <ProjectWorkspaceHeaderSurface>
      {isEstimateSheetRoute ? (
        <ProjectEstimateMetadataStrip projectCode={projectCode} />
      ) : (
        <ProjectWorkspaceProjectCode
          projectCode={projectCode}
          className="absolute inset-y-0 left-0 flex w-[var(--estimate-tree-panel-width,272px)] items-center pl-4 pr-2"
          textClassName="font-bold"
        />
      )}
    </ProjectWorkspaceHeaderSurface>
  );
}

function ProjectWorkspaceHeaderSurface({ children }: { children: ReactNode }) {
  return (
    <div className="relative h-10 shrink-0 border-b border-hairline bg-white" data-workshop-layout="project-workspace-header-row">
      {children}
    </div>
  );
}
