"use client";

import Link from "next/link";
import { ArrowsOutSimple, Star } from "@phosphor-icons/react/dist/ssr";

import { cn } from "@/lib/ui/cn";
import type { ProjectFavoriteEstimateSheetSummary } from "@/lib/repositories/workspace-repository";

type ProjectCardThumbnailRevealProps = {
  getSheetHref: (sheet: ProjectFavoriteEstimateSheetSummary) => string;
  projectName: string;
  viewMode: "list" | "small" | "medium" | "large";
  visibleFavoriteEstimateSheets: ProjectFavoriteEstimateSheetSummary[];
};

// Hover overlay for the thumbnail, now trimmed to the favorite-estimate-sheet
// tray only. The select / favorite / kebab controls moved up to the card's
// translucent top strip (see LiveProjectCard). The overlay keeps the same
// reveal gating (hidden by default, shown on hover/focus / touch).
export function ProjectCardThumbnailReveal({
  getSheetHref,
  projectName,
  viewMode,
  visibleFavoriteEstimateSheets,
}: ProjectCardThumbnailRevealProps) {
  const maxVisible = viewMode === "small" ? 2 : viewMode === "medium" ? 3 : 5;
  const sheets = visibleFavoriteEstimateSheets.slice(0, maxVisible);
  const hiddenCount = visibleFavoriteEstimateSheets.length - sheets.length;
  const hasSheets = sheets.length > 0;

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
        data-project-card-favorite-sheets=""
        aria-label={
          hasSheets
            ? `Favorite estimate sheets for ${projectName}`
            : `No favorite estimate sheets for ${projectName}`
        }
        className={cn("min-h-0 min-w-0", hasSheets ? "block" : "hidden")}
      >
        {hasSheets ? (
          <>
            <div className="flex min-w-0 items-center gap-1 text-[8px] font-medium uppercase leading-[10px] text-secondary">
              <Star size={10} weight="fill" aria-hidden="true" className="shrink-0 text-warning" />
            </div>
            <div
              className={cn(
                "mt-1.5 min-w-0 text-[9px] font-medium leading-3 text-ink",
                viewMode === "large" ? "grid grid-cols-1 gap-1" : "space-y-1",
              )}
            >
              {sheets.map((sheet) => (
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
              {hiddenCount > 0 ? (
                <span className="block truncate px-1 text-tertiary">+{hiddenCount} more</span>
              ) : null}
            </div>
          </>
        ) : null}
      </div>
    </div>
  );
}
