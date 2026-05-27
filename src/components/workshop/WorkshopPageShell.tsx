import type { ReactNode } from "react";
import Link from "next/link";
import { cookies } from "next/headers";

import { MainSidebar } from "@/components/sidebar/MainSidebar";
import { AskFlipFooterAssistant } from "@/components/workshop/EstimateCopilotFloatingButton";
import { cn } from "@/lib/ui/cn";
import { getCurrentUserContext } from "@/lib/auth/session";
import { ESTIMATE_CENTER_COLUMN_CSS_VARIABLES } from "./EstimateCenterColumnBoundary";
import { WorkshopTitleHeader } from "./WorkshopTitleHeader";
import {
  getSidePanelActualWidth,
  getSidePanelWidthCookieName,
  SIDE_PANEL_WIDTH_CONFIGS,
} from "./side-panel-widths";

type WorkshopBreadcrumb = string | { label: string; href?: string };

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
  children,
}: WorkshopPageShellProps) {
  const currentUser = await getCurrentUserContext();
  const sidePanelWidthCssVariables = await getSidePanelWidthCssVariables();
  const sidebarUser = currentUser
    ? { displayName: currentUser.displayName, email: currentUser.email, avatarUrl: currentUser.avatarUrl }
    : undefined;
  const resolvedBreadcrumbs = breadcrumbs ?? [eyebrow, title];
  const chromePaddingClass = alignChromeToProjectSidebar ? "p-2 lg:py-2 lg:pr-2 lg:pl-[25px]" : "p-2";
  const breadcrumbNav = (
    <nav className="flex min-w-0 items-center gap-1 text-[9px] font-medium leading-3 text-tertiary" aria-label="Project breadcrumbs">
      {resolvedBreadcrumbs.map((crumb, index) => {
        const item = typeof crumb === "string" ? { label: crumb } : crumb;
        return (
          <span key={`${item.label}-${index}`} className="flex min-w-0 items-center gap-1">
            {item.href ? (
              <Link href={item.href} className="truncate hover:text-ink">
                {item.label}
              </Link>
            ) : (
              <span className="truncate">{item.label}</span>
            )}
            {index < resolvedBreadcrumbs.length - 1 ? <span className="text-divider" aria-hidden="true">/</span> : null}
          </span>
        );
      })}
    </nav>
  );

  return (
    <main data-workshop-page-shell-root className="h-[100dvh] overflow-hidden bg-canvas text-ink" aria-label={title}>
      <MainSidebar user={sidebarUser} />
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
          className={chromePaddingClass}
        />

        <div className={cn("min-h-0 flex-1 overflow-hidden", contentClassName ?? "p-2")}>
          {description ? <p className="mb-2 max-w-2xl text-[10px] leading-4 text-tertiary">{description}</p> : null}
          {children}
        </div>

        <footer className={["relative flex min-h-12 shrink-0 items-center justify-between gap-2 overflow-visible border-t border-hairline bg-white text-[10px] text-tertiary", chromePaddingClass].join(" ")}>
          <div className="min-w-0 flex-1">{breadcrumbNav}</div>
          <AskFlipFooterAssistant />
        </footer>
      </section>
    </main>
  );
}
