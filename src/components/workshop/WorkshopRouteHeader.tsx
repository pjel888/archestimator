import { Suspense, type ReactNode } from "react";

import { WorkshopNotificationEntry } from "@/features/notifications/components/WorkshopNotificationEntry";
import { isPlatformAdminRole } from "@/lib/auth/roles";
import { getCurrentUserContext } from "@/lib/auth/session";
import { cn } from "@/lib/ui/cn";
import type { WorkshopBreadcrumb } from "./WorkshopBreadcrumbs";
import { WorkshopSettingsModal } from "./WorkshopSettingsModal";
import { WorkshopSettingsModalContent } from "./WorkshopSettingsModalContent";
import { WorkshopTitleHeader } from "./WorkshopTitleHeader";

type WorkshopRouteHeaderProps = {
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
  children?: ReactNode;
};

function WorkshopSettingsEntryFallback({ location }: { location: ReactNode }) {
  return (
    <WorkshopSettingsModal location={location}>
      <WorkshopSettingsModalContent canManagePlatform={false} />
    </WorkshopSettingsModal>
  );
}

async function WorkshopSettingsEntry({ location }: { location: ReactNode }) {
  const currentUser = await getCurrentUserContext();
  const canManagePlatformSettings = isPlatformAdminRole(currentUser?.role);

  return (
    <WorkshopSettingsModal location={location}>
      <WorkshopSettingsModalContent canManagePlatform={canManagePlatformSettings} />
    </WorkshopSettingsModal>
  );
}

/**
 * Page-owned workshop header + optional content wrapper.
 * Persistent chrome (sidebar/footer) lives in layout-owned WorkshopShell.
 */
export async function WorkshopRouteHeader({
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
  children,
}: WorkshopRouteHeaderProps) {
  const resolvedBreadcrumbs = breadcrumbs ?? [eyebrow, title];
  const settingsModalLocationParts = resolvedBreadcrumbs.map((breadcrumb) =>
    typeof breadcrumb === "string" ? breadcrumb : breadcrumb.label,
  );
  if (settingsModalLocationParts.at(-1) !== "Settings") settingsModalLocationParts.push("Settings");
  const settingsModalLocation = settingsModalLocationParts.join(" / ");
  const chromePaddingClass = alignChromeToProjectSidebar ? "p-2 lg:py-2 lg:px-2" : "p-2";
  const headerActions = (
    <div className="flex h-10 min-w-0 items-center justify-end gap-1">
      {actions}
      <WorkshopNotificationEntry />
      <Suspense fallback={<WorkshopSettingsEntryFallback location={settingsModalLocation} />}>
        <WorkshopSettingsEntry location={settingsModalLocation} />
      </Suspense>
    </div>
  );

  return (
    <>
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

      {children !== undefined ? (
        <div className={cn("min-h-0 flex-1 overflow-hidden", contentClassName ?? "p-2")}>
          {description ? <p className="mb-2 max-w-2xl text-[10px] leading-4 text-tertiary">{description}</p> : null}
          {children}
        </div>
      ) : description ? (
        <p className="mb-2 max-w-2xl px-2 text-[10px] leading-4 text-tertiary">{description}</p>
      ) : null}
    </>
  );
}
