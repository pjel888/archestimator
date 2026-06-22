"use client";

/**
 * Sheets — tall, dense white-paper ledger for the bento working desk.
 * Legibility first: plain white surface, hairline dividers, no frost/blur.
 * Rows deep-link straight into the sheet editor.
 */
import { useMemo, useState } from "react";
import Link from "next/link";
import { FileText, Star } from "@phosphor-icons/react/dist/ssr";

import { useToggleEstimateFavorite } from "@/hooks/use-toggle-estimate-favorite";
import { cn } from "@/lib/ui/cn";

import {
  estimateHref,
  formatShortDate,
  projectHref,
  type MainSidebarFavoriteProject,
  type WorkshopEstimateSummary,
} from "./lib";

type RecentSheetsListProps = {
  estimates: WorkshopEstimateSummary[];
  favoriteProjects: MainSidebarFavoriteProject[];
  favoritesScope: { workspaceId: string; userId: string };
  embedded?: boolean;
};

const ROW_FOCUS =
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus focus-visible:ring-offset-0";

function favoriteErrorMessage(error: unknown) {
  return error instanceof Error
    ? error.message
    : "Could not update estimate favorite.";
}

export function RecentSheetsList({
  estimates,
  favoriteProjects,
  favoritesScope,
  embedded = false,
}: RecentSheetsListProps) {
  const rows = estimates.slice(0, 6);
  const favoriteProjectIds = useMemo(
    () => new Set(favoriteProjects.map((project) => project.id)),
    [favoriteProjects],
  );

  return (
    <section
      className={cn(
        "flex h-full min-h-0 flex-col",
        embedded ? "bg-transparent" : "bg-white",
        embedded ? "" : "rounded-xs border border-hairline",
      )}
    >
      <div className="flex h-12 shrink-0 items-center gap-2 border-b border-hairline px-2">
        <FileText size={14} weight="fill" className="shrink-0 text-tertiary" />
        <h2 className="text-[12px] font-medium text-ink">Sheets</h2>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto">
        <ul aria-label="Recent estimate sheets">
          {rows.map((estimate) => (
            <li
              key={estimate.id}
              className="flex items-stretch gap-2 px-2 py-2 hover:bg-surface-muted"
            >
              <span className="grid w-4 shrink-0 grid-rows-[12px_14px] items-center justify-items-center">
                <FileText
                  size={12}
                  weight="regular"
                  className="text-secondary"
                  aria-hidden="true"
                />
                <FavoriteSheetButton
                  estimate={estimate}
                  favoritesScope={favoritesScope}
                  isProjectSidebarFavorite={favoriteProjectIds.has(
                    estimate.project_id,
                  )}
                />
              </span>
              <Link
                href={estimateHref(estimate)}
                className={cn(
                  "grid min-w-0 flex-1 grid-rows-[12px_14px]",
                  ROW_FOCUS,
                )}
              >
                <span className="flex min-w-0 items-start gap-1.5">
                  <span
                    className="truncate text-[11px] leading-3 text-ink"
                    title={estimate.name}
                  >
                    {estimate.name}
                  </span>
                </span>
                <span className="flex min-w-0 items-center gap-1.5">
                  <span className="truncate text-[10px] leading-[14px] text-secondary">
                    {estimate.projectName}
                  </span>
                </span>
              </Link>
              <time className="self-center shrink-0 font-numeric text-[9px] text-secondary">
                {formatShortDate(estimate.updated_at)}
              </time>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

function FavoriteSheetButton({
  estimate,
  favoritesScope,
  isProjectSidebarFavorite,
}: {
  estimate: WorkshopEstimateSummary;
  favoritesScope: { workspaceId: string; userId: string };
  isProjectSidebarFavorite: boolean;
}) {
  const { toggle, isPending } = useToggleEstimateFavorite(favoritesScope);
  const [favoriteOverride, setFavoriteOverride] = useState<boolean | null>(
    null,
  );
  const [errorMessage, setErrorMessage] = useState<string | undefined>();
  const isFavorite = favoriteOverride ?? estimate.isFavorite;

  function toggleFavorite() {
    const previousFavorite = isFavorite;
    const nextFavorite = !previousFavorite;
    setFavoriteOverride(nextFavorite);
    setErrorMessage(undefined);

    toggle(
      {
        estimate: {
          id: estimate.id,
          projectId: estimate.project_id,
          name: estimate.name,
          sheetCode: estimate.sheet_code,
          href: estimateHref(estimate),
          favoriteCreatedAt: estimate.favoriteCreatedAt,
        },
        project: {
          id: estimate.project_id,
          name: estimate.projectName,
          projectCode: estimate.projectCode,
          href: projectHref(estimate.project_id),
          isSidebarFavorite: isProjectSidebarFavorite,
        },
        favorite: nextFavorite,
      },
      {
        onError: (error) => {
          setFavoriteOverride(previousFavorite);
          setErrorMessage(favoriteErrorMessage(error));
        },
      },
    );
  }

  return (
    <>
      <button
        type="button"
        className={cn(
          "grid size-4 cursor-pointer place-items-center rounded-xs text-tertiary transition hover:bg-surface-muted hover:text-ink focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-focus disabled:cursor-wait disabled:opacity-60",
          isFavorite ? "text-secondary" : null,
        )}
        aria-label={
          isFavorite
            ? `Remove ${estimate.name} from favorite estimate sheets`
            : `Add ${estimate.name} to favorite estimate sheets`
        }
        aria-pressed={isFavorite}
        aria-busy={isPending}
        disabled={isPending}
        title={
          errorMessage ??
          (isFavorite
            ? "Remove from favorite estimate sheets"
            : "Add to favorite estimate sheets")
        }
        onClick={toggleFavorite}
      >
        <Star
          size={10}
          weight={isFavorite ? "fill" : "regular"}
          aria-hidden="true"
        />
      </button>
      {errorMessage ? <span className="sr-only">{errorMessage}</span> : null}
    </>
  );
}
