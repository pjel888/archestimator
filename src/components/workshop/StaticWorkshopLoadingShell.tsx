import type { ReactNode } from "react";

import { MainSidebar } from "@/components/sidebar/MainSidebar";
import { cn } from "@/lib/ui/cn";
import { ESTIMATE_CENTER_COLUMN_CSS_VARIABLES } from "./EstimateCenterColumnBoundary";
import { WorkshopTitleHeader } from "./WorkshopTitleHeader";

type StaticWorkshopLoadingShellProps = {
  title: string;
  eyebrow?: string;
  showEyebrow?: boolean;
  contentClassName?: string;
  alignChromeToProjectSidebar?: boolean;
  children: ReactNode;
};

export function StaticWorkshopLoadingShell({
  title,
  eyebrow = "Workshop",
  showEyebrow = false,
  contentClassName,
  alignChromeToProjectSidebar = false,
  children,
}: StaticWorkshopLoadingShellProps) {
  const chromePaddingClass = alignChromeToProjectSidebar ? "p-2 lg:py-2 lg:pr-2 lg:pl-[25px]" : "p-2";

  return (
    <main data-workshop-page-shell-root className="h-[100dvh] overflow-hidden bg-canvas text-ink" aria-label={`${title} loading`}>
      <MainSidebar />
      <section
        data-workshop-page-shell-canvas
        className="flex h-full min-h-0 flex-col lg:pl-[64px]"
        style={ESTIMATE_CENTER_COLUMN_CSS_VARIABLES}
        aria-label={`${title} loading canvas`}
      >
        <WorkshopTitleHeader
          title={title}
          eyebrow={eyebrow}
          showEyebrow={showEyebrow}
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
            "relative flex min-h-12 shrink-0 items-center justify-between gap-2 overflow-visible border-t border-hairline bg-white text-[10px] text-tertiary",
            chromePaddingClass,
          ].join(" ")}
        />
      </section>
    </main>
  );
}
