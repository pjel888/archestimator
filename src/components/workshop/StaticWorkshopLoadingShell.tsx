import type { ReactNode } from "react";

import { MainSidebar } from "@/components/sidebar/MainSidebar";
import { WorkshopGlassBackdrop } from "@/components/workshop/WorkshopGlassBackdrop";
import { cn } from "@/lib/ui/cn";
import { ESTIMATE_CENTER_COLUMN_CSS_VARIABLES } from "./EstimateCenterColumnBoundary";
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
    <main data-workshop-page-shell-root className="h-[100dvh] overflow-hidden text-ink" aria-label={`${title} loading`}>
      <WorkshopGlassBackdrop />
      <MainSidebar />
      <section
        data-workshop-page-shell-canvas
        className="flex h-full min-h-0 flex-col p-2 lg:pl-[var(--sidebar-content-offset)]"
        style={ESTIMATE_CENTER_COLUMN_CSS_VARIABLES}
        aria-label={`${title} loading canvas`}
      >
        <div
          data-workshop-workspace-surface
          className="sidebar-glass-shadow workshop-workspace-glass-surface flex h-full min-h-0 flex-col overflow-hidden rounded-xs border"
        >
        <WorkshopTitleHeader
          title={title}
          eyebrow={eyebrow}
          showEyebrow={showEyebrow}
          hideTitle={hideTitle}
          className={chromePaddingClass}
        />

        <div className={cn("min-h-0 flex-1 overflow-hidden", contentClassName ?? "p-2")}>
          <div aria-hidden="true">{children}</div>
          <div role="status" aria-live="polite" aria-atomic="true" className="sr-only">
            Loading {title}
          </div>
        </div>

        <footer
          aria-hidden="true"
          className={[
            "workshop-shell-glass-chrome workshop-shell-glass-chrome--bottom relative flex min-h-12 shrink-0 items-center justify-between gap-2 overflow-visible border text-[10px] text-tertiary",
            chromePaddingClass,
          ].join(" ")}
        />
        </div>
      </section>
    </main>
  );
}
