import type { ReactNode } from "react";

import { cn } from "@/lib/ui/cn";

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
      <div className="min-w-0 shrink-0">
        <h1 className="truncate text-[12px] font-bold leading-4 tracking-[-0.015em] text-ink">{title}</h1>
        {showEyebrow ? <p className="mt-0.5 truncate text-[9px] font-medium leading-3 text-tertiary">{eyebrow}</p> : null}
      </div>
      {centerHeader ? (
        <div
          id="workshop-center-header"
          className="absolute inset-y-2 left-[calc(8px+104px+var(--estimate-tree-panel-width,272px))] right-[calc(8px+var(--estimate-library-panel-width,380px))] flex min-w-0 items-center justify-center"
        >
          {centerHeader}
        </div>
      ) : null}
      {actions ? <div className="ml-2 flex shrink-0 items-center gap-2">{actions}</div> : null}
    </header>
  );
}
