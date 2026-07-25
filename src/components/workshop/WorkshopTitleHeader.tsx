import type { ReactNode } from "react";

import { cn } from "@/lib/ui/cn";
import { EstimateCenterColumnBoundary } from "./EstimateCenterColumnBoundary";
import { WorkshopBreadcrumbs, type WorkshopBreadcrumb } from "./WorkshopBreadcrumbs";
import { WorkshopHeaderBackButton } from "./WorkshopHeaderBackButton";

type WorkshopTitleHeaderProps = {
  title: string;
  eyebrow?: string;
  showEyebrow?: boolean;
  hideTitle?: boolean;
  actions?: ReactNode;
  centerHeader?: ReactNode;
  /** Replaces the default title/breadcrumb block (e.g. route-aware swaps). */
  titleSlot?: ReactNode;
  showBackButton?: boolean;
  breadcrumbs?: WorkshopBreadcrumb[];
  projectId?: string;
  className?: string;
};

export function WorkshopTitleHeader({
  title,
  eyebrow = "Workshop",
  showEyebrow = true,
  hideTitle = false,
  actions,
  centerHeader,
  titleSlot,
  showBackButton = true,
  breadcrumbs,
  projectId,
  className,
}: WorkshopTitleHeaderProps) {
  const visibleBreadcrumbs = breadcrumbs?.filter((breadcrumb) =>
    (typeof breadcrumb === "string" ? breadcrumb : breadcrumb.label) !== "Workshop",
  ) ?? [];
  const hasBreadcrumbs = visibleBreadcrumbs.length > 0;
  const showBreadcrumbs = visibleBreadcrumbs.length > 1;
  const titleContent = titleSlot ?? (hideTitle ? <div className="min-w-0 flex-1" aria-hidden="true" /> : (
    <div
      className={cn("flex min-w-0 shrink-0 flex-col gap-0.5", hasBreadcrumbs && "translate-y-1 justify-center gap-0 pt-1")}
      data-workshop-title-region
    >
      <div className="min-w-0" data-workshop-title-block>
        <h1 className="truncate text-[12px] font-medium leading-4 tracking-normal text-ink">{title}</h1>
        {showEyebrow && !hasBreadcrumbs ? <p className="mt-0.5 truncate text-[8px] font-medium uppercase leading-3 tracking-normal text-tertiary">{eyebrow}</p> : null}
      </div>
      {showBreadcrumbs ? (
        <WorkshopBreadcrumbs breadcrumbs={visibleBreadcrumbs} projectId={projectId} />
      ) : hasBreadcrumbs ? (
        <div className="h-3 shrink-0" aria-hidden="true" data-workshop-layout="workshop-breadcrumbs-spacer" />
      ) : null}
    </div>
  ));

  return (
    <header className={cn("workshop-shell-glass-chrome workshop-shell-glass-chrome--top relative flex h-14 shrink-0 items-center justify-between", className)}>
      <div className="flex min-w-0 shrink-0 items-center gap-1">
        {showBackButton ? <WorkshopHeaderBackButton /> : null}
        {titleContent}
      </div>
      {centerHeader ? (
        <EstimateCenterColumnBoundary
          id="workshop-center-header"
          scope="workshop-title"
          className="flex items-center justify-center"
        >
          {centerHeader}
        </EstimateCenterColumnBoundary>
      ) : null}
      {actions ? <div className="ml-2 flex shrink-0 items-center gap-2">{actions}</div> : null}
    </header>
  );
}
