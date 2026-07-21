import { Suspense, type ReactNode } from "react";
import { cookies } from "next/headers";
import dynamic from "next/dynamic";

import { MainSidebar, type MainSidebarStatus } from "@/components/sidebar/MainSidebar";
import { MainSidebarWithStoreStatus } from "@/components/workshop/MainSidebarWithStoreStatus";
import { WorkshopGlassBackdrop } from "@/components/workshop/WorkshopGlassBackdrop";
import { WebVitalsProbe } from "@/components/workshop/WebVitalsProbe";
import { WorkshopFeedbackModal } from "@/components/workshop/WorkshopFeedbackModal";
import { isAskFlipUiEnabled } from "@/lib/ai/feature-flags";
import { getCurrentUserContext } from "@/lib/auth/session";
import {
  getDisabledWorkshopNavIds,
  isWorkshopMaintenanceModeEnabled,
} from "@/lib/feature-gates/enforce";
import { ensureDefaultWorkspace } from "@/lib/repositories/workspace-repository";
import { ESTIMATE_CENTER_COLUMN_CSS_VARIABLES } from "./estimate-center-column-boundary-vars";
import {
  getSidePanelActualWidth,
  getSidePanelWidthCookieName,
  SIDE_PANEL_WIDTH_CONFIGS,
} from "./side-panel-widths";

// Flag-gated copilot: only rendered when isAskFlipUiEnabled() (defaults OFF).
const AskFlipFooterAssistant = dynamic(() =>
  import("@/components/workshop/EstimateCopilotFloatingButton").then((module) => module.AskFlipFooterAssistant),
);

type WorkshopShellProps = {
  children: ReactNode;
  /** Optional initial sidebar status; home page also syncs via store (OPEN-1). */
  sidebarStatus?: MainSidebarStatus;
};

async function getSidePanelWidthCssVariables() {
  const cookieStore = await cookies();
  return SIDE_PANEL_WIDTH_CONFIGS.reduce<Record<string, string>>((variables, config) => {
    const savedWidth = Number.parseInt(cookieStore.get(getSidePanelWidthCookieName(config.storageKey))?.value ?? "", 10);
    variables[config.cssVariable] = `${getSidePanelActualWidth(config, savedWidth)}px`;
    return variables;
  }, {});
}

function MainSidebarShellFallback({
  status,
  disabledNavIds,
}: {
  status?: MainSidebarStatus;
  disabledNavIds?: readonly string[];
}) {
  return (
    <MainSidebar
      favoriteProjects={[]}
      favoriteProjectsFresh={false}
      favoritesScope={null}
      status={status}
      disabledNavIds={disabledNavIds}
    />
  );
}

async function AuthenticatedMainSidebar({
  status,
  disabledNavIds,
}: {
  status?: MainSidebarStatus;
  disabledNavIds?: readonly string[];
}) {
  const currentUser = await getCurrentUserContext();
  const workspaceBootstrap = currentUser ? await ensureDefaultWorkspace() : null;
  const favoritesScope = currentUser && workspaceBootstrap
    ? { workspaceId: workspaceBootstrap.workspace.id, userId: currentUser.userId }
    : null;
  const user = currentUser
    ? { displayName: currentUser.displayName, email: currentUser.email, avatarUrl: currentUser.avatarUrl }
    : undefined;

  return (
    <MainSidebarWithStoreStatus
      favoriteProjects={[]}
      favoriteProjectsFresh={false}
      favoritesScope={favoritesScope}
      status={status}
      user={user}
      disabledNavIds={disabledNavIds}
    />
  );
}

/**
 * Layout-owned persistent workshop chrome (sidebar, glass, footer).
 * Per-page headers live in WorkshopRouteHeader; canvas washes sync via WorkshopCanvasWash.
 */
export async function WorkshopShell({ children, sidebarStatus }: WorkshopShellProps) {
  const [sidePanelWidthCssVariables, disabledNavIdSet, maintenanceMode, showAskFlip] = await Promise.all([
    getSidePanelWidthCssVariables(),
    getDisabledWorkshopNavIds(),
    isWorkshopMaintenanceModeEnabled(),
    Promise.resolve(isAskFlipUiEnabled()),
  ]);
  const disabledNavIds = Array.from(disabledNavIdSet);

  return (
    <main
      data-workshop-page-shell-root
      className="h-[100dvh] overflow-hidden text-ink"
      aria-label="Workshop"
    >
      <WebVitalsProbe />
      <WorkshopGlassBackdrop />
      <Suspense fallback={<MainSidebarShellFallback status={sidebarStatus} disabledNavIds={disabledNavIds} />}>
        <AuthenticatedMainSidebar status={sidebarStatus} disabledNavIds={disabledNavIds} />
      </Suspense>
      <section
        data-workshop-page-shell-canvas
        className="flex h-full min-h-0 flex-col p-2 lg:pl-[var(--sidebar-content-offset)]"
        style={{ ...ESTIMATE_CENTER_COLUMN_CSS_VARIABLES, ...sidePanelWidthCssVariables }}
        aria-label="Workshop canvas"
      >
        <div
          data-workshop-workspace-surface
          className="sidebar-glass-shadow workshop-workspace-glass-surface flex h-full min-h-0 flex-col overflow-hidden rounded-xs border"
        >
          {maintenanceMode ? (
            <div
              role="status"
              className="shrink-0 border-b border-warning/25 bg-warning/10 px-2 py-1.5 text-[10px] leading-4 text-ink"
            >
              Maintenance mode is on. Workshop edits are paused for beta members; platform admins can still write.
            </div>
          ) : null}
          {/* Segment loading.tsx owns content fallbacks; avoid a second generic skeleton. */}
          {children}

          <footer
            data-workshop-shell-footer
            className="workshop-shell-glass-chrome workshop-shell-glass-chrome--bottom relative flex min-h-12 shrink-0 items-center justify-between gap-2 overflow-visible p-2 text-[10px] text-tertiary"
          >
            <div className="min-w-0 flex-1">
              <WorkshopFeedbackModal />
            </div>
            <div data-workshop-shell-footer-slot className="contents" />
            {showAskFlip ? <AskFlipFooterAssistant /> : null}
          </footer>
        </div>
      </section>
    </main>
  );
}
