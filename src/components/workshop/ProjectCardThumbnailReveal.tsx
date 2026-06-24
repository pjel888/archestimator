"use client";

import Link from "next/link";
import { ArrowsOutSimple, Star } from "@phosphor-icons/react/dist/ssr";

import { cn } from "@/lib/ui/cn";
import type { ProjectFavoriteEstimateSheetSummary } from "@/lib/repositories/workspace-repository";
import { ProjectCardFavoriteControl } from "./ProjectCardFavoriteControl";
import { ProjectCardSelectControl } from "./ProjectCardSelectControl";

type ProjectCardThumbnailRevealProps = {
  controlButtonClassName: string;
  favoriteControl: {
    canToggle: boolean;
    favoriteBusy: boolean;
    isFavorite: boolean;
    onToggle: () => void;
  };
  getSheetHref: (sheet: ProjectFavoriteEstimateSheetSummary) => string;
  projectName: string;
  revealOnIntentClassName: string;
  selectControl: {
    canSelect: boolean;
    canShow: boolean;
    selectedForDeletion: boolean;
    selectionActive: boolean;
    onToggle: () => void;
  };
  viewMode: "list" | "small" | "medium" | "large";
  visibleFavoriteEstimateSheets: ProjectFavoriteEstimateSheetSummary[];
};

export function ProjectCardThumbnailReveal({
  controlButtonClassName,
  favoriteControl,
  getSheetHref,
  projectName,
  revealOnIntentClassName,
  selectControl,
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
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="pointer-events-auto">
          <ProjectCardSelectControl
            canSelect={selectControl.canSelect}
            canShowSelect={selectControl.canShow}
            projectName={projectName}
            revealOnIntentClassName={revealOnIntentClassName}
            selectedForDeletion={selectControl.selectedForDeletion}
            selectionActive={selectControl.selectionActive}
            onToggleSelected={selectControl.onToggle}
          />
        </div>
        <div className="flex items-center gap-1">
          <div className="pointer-events-auto">
            <ProjectCardFavoriteControl
              canToggleFavorite={favoriteControl.canToggle}
              controlButtonClassName={controlButtonClassName}
              favoriteBusy={favoriteControl.favoriteBusy}
              isFavorite={favoriteControl.isFavorite}
              projectName={projectName}
              revealOnIntentClassName={revealOnIntentClassName}
              onToggleFavorite={favoriteControl.onToggle}
            />
          </div>
        </div>
      </div>
      <div
        data-project-card-favorite-sheets=""
        aria-label={
          hasSheets
            ? `Favorite estimate sheets for ${projectName}`
            : `No favorite estimate sheets for ${projectName}`
        }
        className={cn("mt-2 min-h-0 min-w-0", hasSheets ? "block" : "hidden")}
      >
        {hasSheets ? (
          <>
            <div className="flex min-w-0 items-center gap-1 text-[8px] font-medium uppercase leading-[10px] text-secondary">
              <Star size={10} weight="regular" aria-hidden="true" className="shrink-0 text-warning" />
            </div>
            <div
              className={cn(
                "mt-2 min-w-0 text-[9px] font-medium leading-3 text-ink",
                viewMode === "large" ? "grid grid-cols-1 gap-1.5" : "space-y-1",
              )}
            >
              {sheets.map((sheet) => (
                <Link
                  key={sheet.id}
                  href={getSheetHref(sheet)}
                  prefetch={false}
                  className="flex min-w-0 items-center gap-1.5 rounded-xs text-ink hover:text-secondary focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
                  title={sheet.sheet_code ? `${sheet.name} (${sheet.sheet_code})` : sheet.name}
                >
                  <span className="block min-w-0 flex-1 truncate">{sheet.name}</span>
                  <ArrowsOutSimple size={10} weight="regular" aria-hidden="true" className="shrink-0 text-white" />
                </Link>
              ))}
              {hiddenCount > 0 ? (
                <span className="block truncate text-tertiary">+{hiddenCount} more</span>
              ) : null}
            </div>
          </>
        ) : null}
      </div>
    </div>
  );
}
