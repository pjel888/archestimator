import { cn } from "@/lib/ui/cn";

type ProjectWorkspaceProjectCodeProps = {
  projectCode: string;
  className?: string;
  textClassName?: string;
};

export function ProjectWorkspaceProjectCode({ projectCode, className, textClassName }: ProjectWorkspaceProjectCodeProps) {
  return (
    <div className={cn("min-w-0", className)} data-workshop-layout="project-workspace-project-code">
      <h2 className={cn("truncate text-[9px] uppercase tracking-[0.14em] text-tertiary", textClassName)}>{projectCode}</h2>
    </div>
  );
}
