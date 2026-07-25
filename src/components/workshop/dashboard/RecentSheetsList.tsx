"use client";

/**
 * Estimate sheets — tall, dense white-paper list for the Workshop dashboard.
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
  const projectFavoriteCreatedAtById = useMemo(
    () =>
      new Map(
        favoriteProjects.flatMap((project) => {
          const projectFavoriteCreatedAt =
            project.projectFavoriteCreatedAt === undefined
              ? project.favoriteCreatedAt
              : project.projectFavoriteCreatedAt;
          return projectFavoriteCreatedAt === null ? [] : [[project.id, projectFavoriteCreatedAt] as const];
        }),
      ),
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
        <h2 className="text-[12px] font-medium text-ink">Estimate Sheets</h2>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto">
        <ul aria-label="Estimate sheets">
          {estimates.map((estimate) => (
            <li
              key={estimate.id}
              className="flex min-h-8 items-center gap-1.5 px-2 hover:bg-surface-muted"
            >
              <FileText
                size={16}
                weight="regular"
                className="shrink-0 text-secondary"
                aria-hidden="true"
              />
              <FavoriteSheetButton
                estimate={estimate}
                favoritesScope={favoritesScope}
                projectFavoriteCreatedAt={projectFavoriteCreatedAtById.get(estimate.project_id) ?? null}
              />
              <Link
                href={estimateHref(estimate)}
                className={cn(
                  "flex min-w-0 flex-1 items-center gap-2 self-stretch",
                  ROW_FOCUS,
                )}
                title={`${estimate.name} · ${estimate.projectName}`}
              >
                <span className="min-w-0 flex-1 truncate text-[11px] leading-4 text-ink">
                  {estimate.name}
                </span>
                <span className="max-w-[42%] shrink truncate text-[10px] leading-4 text-secondary">
                  {estimate.projectName}
                </span>
              </Link>
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
  projectFavoriteCreatedAt,
}: {
  estimate: WorkshopEstimateSummary;
  favoritesScope: { workspaceId: string; userId: string };
  projectFavoriteCreatedAt: string | null;
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
          isSidebarFavorite: projectFavoriteCreatedAt !== null,
          projectFavoriteCreatedAt,
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
          "grid size-6 cursor-pointer place-items-center rounded-xs transition hover:bg-surface-muted focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-focus disabled:cursor-wait disabled:opacity-60",
          isFavorite
            ? "text-brand-orange hover:text-brand-orange-dark"
            : "text-tertiary hover:text-ink",
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
          size={16}
          weight={isFavorite ? "fill" : "regular"}
          aria-hidden="true"
        />
      </button>
      {errorMessage ? <span className="sr-only">{errorMessage}</span> : null}
    </>
  );
}
