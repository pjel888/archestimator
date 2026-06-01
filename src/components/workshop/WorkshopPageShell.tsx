import { Suspense, type ReactNode } from "react";
import { cookies } from "next/headers";

import { MainSidebar, type MainSidebarStatus } from "@/components/sidebar/MainSidebar";
import { AskFlipFooterAssistant } from "@/components/workshop/EstimateCopilotFloatingButton";
import { ProjectTotalHeader } from "@/components/workshop/ProjectTotalHeader";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/ui/cn";
import { getCurrentUserContext } from "@/lib/auth/session";
import { ESTIMATE_CENTER_COLUMN_CSS_VARIABLES } from "./EstimateCenterColumnBoundary";
import type { WorkshopBreadcrumb } from "./WorkshopBreadcrumbs";
import { WorkshopTitleHeader } from "./WorkshopTitleHeader";
import {
  getSidePanelActualWidth,
  getSidePanelWidthCookieName,
  SIDE_PANEL_WIDTH_CONFIGS,
} from "./side-panel-widths";

type WorkshopPageShellProps = {
  title: string;
  eyebrow?: string;
  showEyebrow?: boolean;
  description?: string;
  actions?: ReactNode;
  centerHeader?: ReactNode;
  breadcrumbs?: WorkshopBreadcrumb[];
  alignChromeToProjectSidebar?: boolean;
  contentClassName?: string;
  projectId?: string;
  sidebarStatus?: MainSidebarStatus;
  children: ReactNode;
};

async function getSidePanelWidthCssVariables() {
  const cookieStore = await cookies();
  return SIDE_PANEL_WIDTH_CONFIGS.reduce<Record<string, string>>((variables, config) => {
    const savedWidth = Number.parseInt(cookieStore.get(getSidePanelWidthCookieName(config.storageKey))?.value ?? "", 10);
    variables[config.cssVariable] = `${getSidePanelActualWidth(config, savedWidth)}px`;
    return variables;
  }, {});
}

function WorkshopShellContentFallback() {
  return (
    <div className="flex h-full min-h-0 flex-col gap-2" role="status" aria-label="Loading workspace">
      <div className="grid shrink-0 grid-cols-3 gap-2" aria-hidden="true">
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-10 w-full" />
      </div>
      <div className="min-h-0 flex-1 rounded-xs border border-hairline bg-white p-2" aria-hidden="true">
        <Skeleton className="h-full w-full" />
      </div>
      <span className="sr-only">Loading workspace</span>
    </div>
  );
}

export async function WorkshopPageShell({
  title,
  eyebrow = "Workshop",
  showEyebrow = true,
  description,
  actions,
  centerHeader,
  breadcrumbs,
  alignChromeToProjectSidebar = false,
  contentClassName,
  projectId,
  sidebarStatus,
  children,
}: WorkshopPageShellProps) {
  const [currentUser, sidePanelWidthCssVariables] = await Promise.all([
    getCurrentUserContext(),
    getSidePanelWidthCssVariables(),
  ]);
  const sidebarUser = currentUser
    ? { displayName: currentUser.displayName, email: currentUser.email, avatarUrl: currentUser.avatarUrl }
    : undefined;
  const resolvedBreadcrumbs = breadcrumbs ?? [eyebrow, title];
  const chromePaddingClass = alignChromeToProjectSidebar ? "p-2 lg:py-2 lg:pr-2 lg:pl-[25px]" : "p-2";

  return (
    <main data-workshop-page-shell-root className="h-[100dvh] overflow-hidden bg-canvas text-ink" aria-label={title}>
      <MainSidebar status={sidebarStatus} user={sidebarUser} />
      <section
        data-workshop-page-shell-canvas
        className="flex h-full min-h-0 flex-col lg:pl-[64px]"
        style={{ ...ESTIMATE_CENTER_COLUMN_CSS_VARIABLES, ...sidePanelWidthCssVariables }}
        aria-label={`${title} canvas`}
      >
        <WorkshopTitleHeader
          title={title}
          eyebrow={eyebrow}
          showEyebrow={showEyebrow}
          actions={actions}
          centerHeader={centerHeader}
          breadcrumbs={resolvedBreadcrumbs}
          projectId={projectId}
          className={chromePaddingClass}
        />

        <div className={cn("min-h-0 flex-1 overflow-hidden", contentClassName ?? "p-2")}>
          {description ? <p className="mb-2 max-w-2xl text-[10px] leading-4 text-tertiary">{description}</p> : null}
          <Suspense fallback={<WorkshopShellContentFallback />}>{children}</Suspense>
        </div>

        <footer className={["relative flex min-h-12 shrink-0 items-center justify-between gap-2 overflow-visible border-t border-hairline bg-white text-[10px] text-tertiary", chromePaddingClass].join(" ")}>
          <div className="min-w-0 flex-1" />
          {projectId ? (
            <div
              className="absolute inset-y-0 flex items-center"
              style={{
                left: "384px",
                right: "388px",
              }}
              data-estimate-center-column="project-total-footer"
              aria-label="Sheet running totals"
            >
              <ProjectTotalHeader projectId={projectId} />
            </div>
          ) : null}
          <AskFlipFooterAssistant />
        </footer>
      </section>
    </main>
  );
}
