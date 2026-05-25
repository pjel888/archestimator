import type { ReactNode } from "react";

import { cn } from "@/lib/ui/cn";
import { EstimateCenterColumnBoundary } from "./EstimateCenterColumnBoundary";

type WorkshopTitleHeaderProps = {
  title: string;
  eyebrow?: string;
  showEyebrow?: boolean;
  actions?: ReactNode;
  centerHeader?: ReactNode;
  className?: string;
};

export function WorkshopTitleHeader({
  title,
  eyebrow = "Workshop",
  showEyebrow = true,
  actions,
  centerHeader,
  className,
}: WorkshopTitleHeaderProps) {
  return (
    <header className={cn("relative flex h-14 shrink-0 items-center justify-between border-b border-hairline bg-white", className)}>
      <div className="min-w-0 shrink-0" data-workshop-title-block>
        <h1 className="truncate text-[12px] font-medium leading-4 tracking-normal text-ink">{title}</h1>
        {showEyebrow ? <p className="mt-0.5 truncate text-[8px] font-medium uppercase leading-3 tracking-normal text-tertiary">{eyebrow}</p> : null}
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
