import type { CSSProperties, HTMLAttributes, ReactNode } from "react";

import { cn } from "@/lib/ui/cn";

export const ESTIMATE_CENTER_COLUMN_CSS_VARIABLES = {
  "--workshop-page-shell-padding": "8px",
  "--project-mini-sidebar-width": "104px",
  "--estimate-tree-panel-width": "376px",
  "--estimate-library-panel-width": "380px",
} as CSSProperties;

type EstimateCenterColumnBoundaryScope = "workshop-title" | "project-workspace-row";

type EstimateCenterColumnBoundaryProps = Omit<HTMLAttributes<HTMLDivElement>, "children"> & {
  id?: string;
  scope: EstimateCenterColumnBoundaryScope;
  className?: string;
  children: ReactNode;
};

const scopeClassName: Record<EstimateCenterColumnBoundaryScope, string> = {
  "workshop-title": "inset-y-2",
  "project-workspace-row": "inset-y-0",
};

const scopeStyle: Record<EstimateCenterColumnBoundaryScope, CSSProperties> = {
  "workshop-title": {
    left: "calc(var(--workshop-page-shell-padding) + var(--project-mini-sidebar-width) + var(--estimate-tree-panel-width))",
    right: "calc(var(--workshop-page-shell-padding) + var(--estimate-library-panel-width))",
  },
  "project-workspace-row": {
    left: "var(--estimate-tree-panel-width)",
    right: "var(--estimate-library-panel-width)",
  },
};

export function EstimateCenterColumnBoundary({ id, scope, className, children, style, ...props }: EstimateCenterColumnBoundaryProps) {
  return (
    <div id={id} className={cn("absolute min-w-0", scopeClassName[scope], className)} style={{ ...scopeStyle[scope], ...style }} {...props}>
      {children}
    </div>
  );
}
