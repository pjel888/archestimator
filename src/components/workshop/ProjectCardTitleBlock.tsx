"use client";

import { MapPin } from "@phosphor-icons/react/dist/ssr";

import { cn } from "@/lib/ui/cn";

type ProjectCardTitleViewMode = "list" | "small" | "medium" | "large";

type ProjectCardTitleBlockProps = {
  clientName: string | null;
  location: string | null;
  projectName: string;
  viewMode: ProjectCardTitleViewMode;
};

// Text-only title block. The kebab details control and group-assignment menu
// previously rendered in this row now live in the card's translucent top strip
// (see LiveProjectCard tile branch), so this block is just client / name /
// location — the bright paper content of the inset white inner card.
export function ProjectCardTitleBlock({
  clientName,
  location,
  projectName,
  viewMode,
}: ProjectCardTitleBlockProps) {
  return (
    <>
      <p className="min-w-0 truncate text-[8px] font-medium uppercase tracking-normal text-secondary">
        {clientName ?? "No client yet"}
      </p>
      <div className="min-w-0">
        <h2
          className={cn(
            "min-w-0 font-medium tracking-normal text-ink [overflow-wrap:anywhere]",
            viewMode === "large" ? "line-clamp-2 min-h-[28px] text-[12px] leading-[1.18]" : null,
            viewMode === "medium" ? "line-clamp-2 min-h-[26px] text-[11px] leading-[1.18]" : null,
            viewMode === "small" ? "line-clamp-2 min-h-6 text-[10px] leading-[1.2]" : null,
          )}
        >
          {projectName}
        </h2>
      </div>
      <p className="flex min-w-0 items-start gap-1.5 text-[9px] leading-3 text-secondary">
        <MapPin size={12} aria-hidden="true" className="shrink-0" />
        <span className="line-clamp-2 min-w-0 [overflow-wrap:anywhere]">
          {location ?? "No location"}
        </span>
      </p>
    </>
  );
}
