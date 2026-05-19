import type { CSSProperties, HTMLAttributes, ReactNode } from "react";

import { cn } from "@/lib/ui/cn";

export const ESTIMATE_CENTER_COLUMN_CSS_VARIABLES = {
  "--workshop-page-shell-padding": "8px",
  "--project-mini-sidebar-width": "104px",
} as CSSProperties;

type EstimateCenterColumnBoundaryScope = "workshop-title" | "project-workspace-row";

type EstimateCenterColumnBoundaryProps = Omit<HTMLAttributes<HTMLDivElement>, "children"> & {
  id?: string;
  scope: EstimateCenterColumnBoundaryScope;
  className?: string;
  children: ReactNode;
};

const scopeClassName: Record<EstimateCenterColumnBoundaryScope, string> = {
  "workshop-title":
    "inset-y-2 left-[calc(var(--workshop-page-shell-padding,8px)+var(--project-mini-sidebar-width,104px)+var(--estimate-tree-panel-width,272px))] right-[calc(var(--workshop-page-shell-padding,8px)+var(--estimate-library-panel-width,380px))]",
  "project-workspace-row": "inset-y-0 left-[var(--estimate-tree-panel-width,272px)] right-[var(--estimate-library-panel-width,380px)]",
};

export function EstimateCenterColumnBoundary({ id, scope, className, children, ...props }: EstimateCenterColumnBoundaryProps) {
  return (
    <div id={id} className={cn("absolute min-w-0", scopeClassName[scope], className)} {...props}>
      {children}
    </div>
  );
}
