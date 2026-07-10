import type { ReactNode } from "react";

import { cn } from "@/lib/ui/cn";
import { WorkshopTitleHeader } from "./WorkshopTitleHeader";

type StaticWorkshopLoadingShellProps = {
  title: string;
  eyebrow?: string;
  showEyebrow?: boolean;
  hideTitle?: boolean;
  contentClassName?: string;
  alignChromeToProjectSidebar?: boolean;
  children: ReactNode;
};

/**
 * Content-only loading chrome for rare callers. Top-level workshop loading.tsx
 * files should prefer page-local skeletons; layout-owned WorkshopShell owns the sidebar.
 */
export function StaticWorkshopLoadingShell({
  title,
  eyebrow = "Workshop",
  showEyebrow = false,
  hideTitle = false,
  contentClassName,
  alignChromeToProjectSidebar = false,
  children,
}: StaticWorkshopLoadingShellProps) {
  const chromePaddingClass = alignChromeToProjectSidebar ? "p-2 lg:py-2 lg:px-2" : "p-2";

  return (
    <div className="flex h-full min-h-0 flex-col" aria-label={`${title} loading`}>
      <WorkshopTitleHeader
        title={title}
        eyebrow={eyebrow}
        showEyebrow={showEyebrow}
        hideTitle={hideTitle}
        className={chromePaddingClass}
      />
      <div className={cn("min-h-0 flex-1 overflow-hidden", contentClassName ?? "p-2")}>
        <div aria-hidden="true">{children}</div>
        <output aria-live="polite" aria-atomic="true" className="sr-only">
          Loading {title}
        </output>
      </div>
    </div>
  );
}
