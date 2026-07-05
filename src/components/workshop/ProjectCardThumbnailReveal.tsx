"use client";

import Link from "next/link";
import { ArrowsOutSimple, FileText } from "@phosphor-icons/react/dist/ssr";

import { cn } from "@/lib/ui/cn";
import type { ProjectCardEstimateSheetSummary } from "@/lib/repositories/workspace-repository";

type ProjectCardThumbnailRevealProps = {
  estimateSheets: ProjectCardEstimateSheetSummary[];
  getSheetHref: (sheet: ProjectCardEstimateSheetSummary) => string;
  projectName: string;
  viewMode: "list" | "small" | "medium" | "large";
};

// Hover overlay for the thumbnail, trimmed to the recent estimate-sheet tray
// only. The select / favorite / kebab controls live in the card's translucent
// top strip (see LiveProjectCard). The tray scrolls when a project has many
// sheets so the thumbnail frame remains stable.
export function ProjectCardThumbnailReveal({
  estimateSheets,
  getSheetHref,
  projectName,
  viewMode,
}: ProjectCardThumbnailRevealProps) {
  const hasSheets = estimateSheets.length > 0;

  return (
    <div
      data-project-card-hover-reveal=""
      aria-label={hasSheets ? `Hover details for ${projectName}` : `Hover controls for ${projectName}`}
      className={cn(
        "workshop-project-card-thumbnail-reveal pointer-events-none absolute inset-0 z-10 flex flex-col overflow-hidden opacity-0 transition-opacity duration-150 group-hover/card:pointer-events-auto group-hover/card:opacity-100 group-focus-within/card:pointer-events-auto group-focus-within/card:opacity-100 motion-reduce:transition-none [@media(hover:none)]:pointer-events-auto [@media(hover:none)]:opacity-100",
        "p-2",
        // Pin the tray to the top of the thumbnail so the sheet list starts
        // where the user expects when the image reveal opens.
        "justify-start",
      )}
    >
      <div
        data-project-card-estimate-sheets=""
        aria-label={
          hasSheets
            ? `Estimate sheets for ${projectName}`
            : `No estimate sheets for ${projectName}`
        }
        className={cn(
          "min-h-0 min-w-0",
          hasSheets
            ? "flex w-full flex-1 flex-col items-start justify-start"
            : "hidden",
        )}
      >
        {hasSheets ? (
          <>
            <div className="flex min-w-0 items-center gap-1 text-[8px] font-medium uppercase leading-[10px] text-secondary">
              <FileText size={10} weight="regular" aria-hidden="true" className="shrink-0 text-secondary" />
            </div>
            <div
              data-project-card-estimate-sheet-list=""
              className={cn(
                "mt-1.5 min-h-0 min-w-0 w-full flex-1 overflow-y-auto overscroll-contain pr-1 text-[9px] font-medium leading-3 text-ink [scrollbar-width:thin]",
                viewMode === "large"
                  ? "grid auto-rows-max content-start grid-cols-1 gap-1"
                  : "space-y-1",
              )}
            >
              {estimateSheets.map((sheet) => (
                <Link
                  key={sheet.id}
                  href={getSheetHref(sheet)}
                  prefetch={false}
                  className="group/link flex min-w-0 items-center gap-1.5 rounded-xs bg-white/72 px-1.5 py-1 text-ink opacity-75 shadow-[inset_0_1px_0_rgba(255,255,255,0.8),0_1px_2px_rgba(30,35,50,0.06)] transition-[background-color,color,opacity] hover:bg-white/92 hover:text-secondary hover:opacity-100 focus-visible:bg-white/92 focus-visible:opacity-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
                  title={sheet.sheet_code ? `${sheet.name} (${sheet.sheet_code})` : sheet.name}
                >
                  <span className="block min-w-0 flex-1 truncate">{sheet.name}</span>
                  <ArrowsOutSimple size={10} weight="regular" aria-hidden="true" className="shrink-0 text-secondary transition-colors group-hover/link:text-ink" />
                </Link>
              ))}
            </div>
          </>
        ) : null}
      </div>
    </div>
  );
}
