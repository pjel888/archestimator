import { Suspense, type ReactNode } from "react";
import { cookies } from "next/headers";

import { MainSidebar, type MainSidebarStatus } from "@/components/sidebar/MainSidebar";
import { WorkshopGlassBackdrop } from "@/components/workshop/WorkshopGlassBackdrop";
import { AskFlipFooterAssistant } from "@/components/workshop/EstimateCopilotFloatingButton";
import { ProjectTotalHeader } from "@/components/workshop/ProjectTotalHeader";
import { Skeleton } from "@/components/ui/skeleton";
import { WorkshopNotificationEntry } from "@/features/notifications/components/WorkshopNotificationEntry";
import { WebVitalsProbe } from "@/components/workshop/WebVitalsProbe";
import { isAskFlipUiEnabled } from "@/lib/ai/feature-flags";
import { cn } from "@/lib/ui/cn";
import { getCurrentUserContext } from "@/lib/auth/session";
import { ensureDefaultWorkspace, listMainSidebarFavoriteProjects } from "@/lib/repositories/workspace-repository";
import { ESTIMATE_CENTER_COLUMN_CSS_VARIABLES } from "./EstimateCenterColumnBoundary";
import type { WorkshopBreadcrumb } from "./WorkshopBreadcrumbs";
import { WorkshopFeedbackModal } from "./WorkshopFeedbackModal";
import { WorkshopSettingsModal } from "./WorkshopSettingsModal";
import { WorkshopSettingsModalContent } from "./WorkshopSettingsModalContent";
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
  subHeader?: ReactNode;
  /** Replaces the title bar's default title/breadcrumb block. */
  titleSlot?: ReactNode;
  /** Hides the default route title block while preserving header actions. */
  hideTitle?: boolean;
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
  subHeader,
  titleSlot,
  hideTitle = false,
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
  const sidebarFavoriteScope = currentUser
    ? { workspaceId: (await ensureDefaultWorkspace()).workspace.id, userId: currentUser.userId }
    : null;
  const sidebarFavoriteProjects = sidebarFavoriteScope ? await listMainSidebarFavoriteProjects() : [];
  const sidebarUser = currentUser
    ? { displayName: currentUser.displayName, email: currentUser.email, avatarUrl: currentUser.avatarUrl }
    : undefined;
  const canManagePlatformSettings = currentUser?.role === "ceo" || currentUser?.role === "admin";
  const showAskFlip = isAskFlipUiEnabled();
  const resolvedBreadcrumbs = breadcrumbs ?? [eyebrow, title];
  const settingsModalLocation = [
    ...resolvedBreadcrumbs.map((breadcrumb) => (typeof breadcrumb === "string" ? breadcrumb : breadcrumb.label)),
    "Settings",
  ].join(" / ");
  const chromePaddingClass = alignChromeToProjectSidebar ? "p-2 lg:py-2 lg:px-2" : "p-2";
  const headerActions = (
    <div className="flex h-10 min-w-0 items-center justify-end gap-1">
      {actions}
      <WorkshopNotificationEntry />
      <WorkshopSettingsModal location={settingsModalLocation}>
        <WorkshopSettingsModalContent canManagePlatform={canManagePlatformSettings} />
      </WorkshopSettingsModal>
    </div>
  );

  return (
    <main data-workshop-page-shell-root className="h-[100dvh] overflow-hidden text-ink" aria-label={title}>
      <WebVitalsProbe />
      <WorkshopGlassBackdrop />
      <MainSidebar
        favoriteProjects={sidebarFavoriteProjects}
        favoritesScope={sidebarFavoriteScope}
        status={sidebarStatus}
        user={sidebarUser}
      />
      <section
        data-workshop-page-shell-canvas
        className="flex h-full min-h-0 flex-col p-2 lg:pl-[var(--sidebar-content-offset)]"
        style={{ ...ESTIMATE_CENTER_COLUMN_CSS_VARIABLES, ...sidePanelWidthCssVariables }}
        aria-label={`${title} canvas`}
      >
        {/* Floating white workspace surface over the grey canvas. Header + content
            + footer stay one card (no internal gaps) so the estimate centre-column
            alignment is preserved. */}
        <div
          data-workshop-workspace-surface
          className="sidebar-glass-shadow workshop-workspace-glass-surface flex h-full min-h-0 flex-col overflow-hidden rounded-xs border"
        >
          <WorkshopTitleHeader
            title={title}
            eyebrow={eyebrow}
            showEyebrow={showEyebrow}
            actions={headerActions}
            centerHeader={centerHeader}
            titleSlot={titleSlot}
            hideTitle={hideTitle}
            breadcrumbs={resolvedBreadcrumbs}
            projectId={projectId}
            className={chromePaddingClass}
          />

          {subHeader}

          <div className={cn("min-h-0 flex-1 overflow-hidden", contentClassName ?? "p-2")}>
            {description ? <p className="mb-2 max-w-2xl text-[10px] leading-4 text-tertiary">{description}</p> : null}
            <Suspense fallback={<WorkshopShellContentFallback />}>{children}</Suspense>
          </div>

          <footer
            className={["workshop-shell-glass-chrome workshop-shell-glass-chrome--bottom relative flex min-h-12 shrink-0 items-center justify-between gap-2 overflow-visible text-[10px] text-tertiary", chromePaddingClass].join(" ")}
          >
            <div className="min-w-0 flex-1">
              <WorkshopFeedbackModal />
            </div>
            {projectId ? (
              <div
                className="absolute inset-y-0 flex items-center"
                style={{
                  left: "384px",
                  right: "388px",
                }}
                data-estimate-center-column="project-total-footer"
                aria-label="Estimate running totals"
              >
                <ProjectTotalHeader projectId={projectId} />
              </div>
            ) : null}
            {showAskFlip ? <AskFlipFooterAssistant /> : null}
          </footer>
        </div>
      </section>
    </main>
  );
}
