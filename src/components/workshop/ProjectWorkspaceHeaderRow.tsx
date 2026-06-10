"use client";

import type { ReactNode } from "react";
import { usePathname } from "next/navigation";

import { ProjectWorkspaceProjectCode } from "./ProjectWorkspaceProjectCode";

type ProjectWorkspaceHeaderRowProps = {
  projectId: string;
  projectCode: string;
};

export function ProjectWorkspaceHeaderRow({
  projectId,
  projectCode,
}: ProjectWorkspaceHeaderRowProps) {
  const pathname = usePathname();
  const estimatesPath = `/workshop/projects/${projectId}/estimates`;
  const isEstimatesRoute = pathname === estimatesPath || Boolean(pathname?.startsWith(`${estimatesPath}/`));

  if (isEstimatesRoute) return null;

  const projectCodeHeader = (
    <ProjectWorkspaceProjectCode
      projectCode={projectCode}
      className="absolute inset-y-0 left-0 flex items-center pl-4 pr-2"
      style={{ width: "var(--estimate-tree-panel-width)" }}
      textClassName="font-medium"
    />
  );

  return <ProjectWorkspaceHeaderSurface>{projectCodeHeader}</ProjectWorkspaceHeaderSurface>;
}

function ProjectWorkspaceHeaderSurface({ children }: { children: ReactNode }) {
  return (
    <div className="relative h-10 shrink-0 border-b border-hairline bg-white" data-workshop-layout="project-workspace-header-row">
      {children}
    </div>
  );
}
