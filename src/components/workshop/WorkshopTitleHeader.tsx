import type { ReactNode } from "react";

import { cn } from "@/lib/ui/cn";
import { EstimateCenterColumnBoundary } from "./EstimateCenterColumnBoundary";
import { WorkshopBreadcrumbs, type WorkshopBreadcrumb } from "./WorkshopBreadcrumbs";

type WorkshopTitleHeaderProps = {
  title: string;
  eyebrow?: string;
  showEyebrow?: boolean;
  hideTitle?: boolean;
  actions?: ReactNode;
  centerHeader?: ReactNode;
  /** Replaces the default title/breadcrumb block (e.g. route-aware swaps). */
  titleSlot?: ReactNode;
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
  breadcrumbs,
  projectId,
  className,
}: WorkshopTitleHeaderProps) {
  const hasBreadcrumbs = Boolean(breadcrumbs?.length);
  const showBreadcrumbs = (breadcrumbs?.length ?? 0) > 1;

  return (
    <header className={cn("workshop-shell-glass-chrome workshop-shell-glass-chrome--top relative flex h-14 shrink-0 items-center justify-between border", className)}>
      {titleSlot ?? (hideTitle ? <div className="min-w-0 flex-1" aria-hidden="true" /> : (
        <div
          className={cn("flex min-w-0 shrink-0 flex-col gap-0.5", hasBreadcrumbs && "h-[30px] justify-start")}
          data-workshop-title-region
        >
          <div className="min-w-0" data-workshop-title-block>
            <h1 className="truncate text-[12px] font-medium leading-4 tracking-normal text-ink">{title}</h1>
            {showEyebrow && !hasBreadcrumbs ? <p className="mt-0.5 truncate text-[8px] font-medium uppercase leading-3 tracking-normal text-tertiary">{eyebrow}</p> : null}
          </div>
          {showBreadcrumbs ? (
            <WorkshopBreadcrumbs breadcrumbs={breadcrumbs ?? []} projectId={projectId} />
          ) : hasBreadcrumbs ? (
            <div className="h-3 shrink-0" aria-hidden="true" data-workshop-layout="workshop-breadcrumbs-spacer" />
          ) : null}
        </div>
      ))}
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
