"use client";

/**
 * Projects — tall, dense white-paper list for the Workshop dashboard.
 * Legibility first: plain white surface, hairline dividers, no frost/blur.
 * The card fills its bento cell and scrolls internally when rows overflow.
 */
import { useState } from "react";
import Link from "next/link";
import { Folder, Star } from "@phosphor-icons/react/dist/ssr";

import { useToggleProjectFavorite } from "@/hooks/use-toggle-project-favorite";
import { cn } from "@/lib/ui/cn";

import {
  projectHref,
  type WorkshopProjectSummary,
} from "./lib";

type RecentProjectsListProps = {
  projects: WorkshopProjectSummary[];
  favoritesScope: { workspaceId: string; userId: string };
  embedded?: boolean;
};

const ROW_FOCUS =
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus focus-visible:ring-offset-0";

function favoriteErrorMessage(error: unknown) {
  return error instanceof Error
    ? error.message
    : "Could not update project favorite.";
}

export function RecentProjectsList({
  projects,
  favoritesScope,
  embedded = false,
}: RecentProjectsListProps) {
  return (
    <section
      className={cn(
        "flex h-full min-h-0 flex-col",
        embedded ? "bg-transparent" : "bg-white",
        embedded ? "" : "rounded-xs border border-hairline",
      )}
    >
      <div className="flex h-12 shrink-0 items-center gap-2 border-b border-hairline px-2">
        <Folder size={14} weight="fill" className="shrink-0 text-tertiary" />
        <h2 className="text-[12px] font-medium text-ink">Projects</h2>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto">
        <ul aria-label="Projects">
          {projects.map((project) => (
            <li
              key={project.id}
              className="flex min-h-8 items-center gap-1.5 px-2 hover:bg-surface-muted"
            >
              <Folder
                size={16}
                weight="regular"
                className="shrink-0 text-secondary"
                aria-hidden="true"
              />
              <FavoriteProjectButton
                project={project}
                favoritesScope={favoritesScope}
              />
              <Link
                href={projectHref(project.id)}
                className={cn(
                  "flex min-w-0 flex-1 items-center self-stretch",
                  ROW_FOCUS,
                )}
              >
                <span
                  className="truncate text-[11px] leading-4 text-ink"
                  title={project.name}
                >
                  {project.name}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

function FavoriteProjectButton({
  project,
  favoritesScope,
}: {
  project: WorkshopProjectSummary;
  favoritesScope: { workspaceId: string; userId: string };
}) {
  const { toggle, isPending } = useToggleProjectFavorite(favoritesScope);
  const [favoriteOverride, setFavoriteOverride] = useState<boolean | null>(
    null,
  );
  const [errorMessage, setErrorMessage] = useState<string | undefined>();
  const isFavorite = favoriteOverride ?? project.isFavorite;

  function toggleFavorite() {
    const previousFavorite = isFavorite;
    const nextFavorite = !previousFavorite;
    setFavoriteOverride(nextFavorite);
    setErrorMessage(undefined);

    toggle(
      {
        project: {
          id: project.id,
          name: project.name,
          projectCode: project.project_code,
          href: projectHref(project.id),
          favoriteCreatedAt: project.favoriteCreatedAt,
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
            ? `Remove ${project.name} from favorites`
            : `Add ${project.name} to favorites`
        }
        aria-pressed={isFavorite}
        aria-busy={isPending}
        disabled={isPending}
        title={
          errorMessage ??
          (isFavorite ? "Remove from favorites" : "Add to favorites")
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
