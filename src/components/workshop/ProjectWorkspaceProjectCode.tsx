import type { CSSProperties } from "react";

import { cn } from "@/lib/ui/cn";

type ProjectWorkspaceProjectCodeProps = {
  projectCode: string;
  className?: string;
  style?: CSSProperties;
  textClassName?: string;
};

export function ProjectWorkspaceProjectCode({ projectCode, className, style, textClassName }: ProjectWorkspaceProjectCodeProps) {
  return (
    <div className={cn("min-w-0", className)} style={style} data-workshop-layout="project-workspace-project-code">
      <h2 className={cn("truncate text-[9px] uppercase tracking-normal text-tertiary", textClassName)}>{projectCode}</h2>
    </div>
  );
}
