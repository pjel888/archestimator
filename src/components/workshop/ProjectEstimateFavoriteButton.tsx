"use client";

import { useCallback, useRef, useState } from "react";
import { Star } from "@phosphor-icons/react/dist/ssr";

import { useToggleEstimateFavorite } from "@/hooks/use-toggle-estimate-favorite";
import {
  announceSidebarFavoriteAssertive,
  announceSidebarFavoritePolite,
} from "@/hooks/use-sidebar-favorites-announcer";
import type { ProjectEstimateListRow } from "@/lib/estimates/project-estimate-list-row";
import type { ProjectEstimatesStore } from "@/stores/project-estimates-store";
import { cn } from "@/lib/ui/cn";

const FAVORITE_HIDDEN_PARENT_CUE = "Estimate favorited. Favorite the project to pin it in the sidebar.";
const FAVORITE_FAILURE_ALERT = "Could not update favorite. Try again.";

export type EstimateFavoriteParentProject = {
  readonly id: string;
  readonly name: string;
  readonly projectCode: string | null;
  readonly href: string;
  readonly isSidebarFavorite: boolean;
};

export type EstimateFavoriteScope = {
  readonly workspaceId: string;
  readonly userId: string;
};

type ProjectEstimateFavoriteButtonProps = {
  readonly estimate: ProjectEstimateListRow;
  readonly disabled: boolean;
  readonly optimistic: boolean;
  readonly store?: ProjectEstimatesStore;
  /**
   * Parent project metadata used to decide whether the optimistic sidebar insert
   * happens (visible favorited parent) and to drive the required legibility cue
   * (non-favorited parent). Optional: standalone renders (no sidebar context) fall
   * back to a synthesized parent derived from the estimate's project id.
   */
  readonly parentProject?: EstimateFavoriteParentProject;
  /** Scope for the sidebar favorites cache key. Defaults to an empty scope when absent. */
  readonly scope?: EstimateFavoriteScope;
  /** Fires the polite legibility cue when toggling under a non-sidebar-favorite parent. */
  readonly announceCue?: () => void;
};

const FALLBACK_SCOPE: EstimateFavoriteScope = { workspaceId: "", userId: "" };

function getEstimateHref(estimate: ProjectEstimateListRow) {
  return `/workshop/projects/${estimate.project_id}/estimates/${estimate.id}`;
}

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : "Could not update favorite estimate.";
}

export function ProjectEstimateFavoriteButton({
  estimate,
  disabled,
  optimistic,
  store,
  parentProject,
  scope,
  announceCue,
}: ProjectEstimateFavoriteButtonProps) {
  // Local optimistic override drives aria-pressed/title so the star flips and the
  // failure message surfaces even when no optimistic store is wired (standalone
  // renders). The actual persistence + sidebar-cache patch is owned by the hook.
  const [favoriteOverride, setFavoriteOverride] = useState<{ readonly estimateId: string; readonly value: boolean } | null>(null);
  const [errorMessage, setErrorMessage] = useState<{ readonly estimateId: string; readonly message: string } | null>(null);
  const [isToggling, setIsToggling] = useState(false);
  // The hook calls announceCue inside onMutate (only when the parent is NOT a sidebar
  // favorite). The favorited copy is only correct when ADDING a favorite, so we gate on
  // the latest intent carried here; the prop, if provided, overrides the default bridge.
  const nextFavoriteRef = useRef(false);
  const defaultAnnounceCue = useCallback(() => {
    if (nextFavoriteRef.current) announceSidebarFavoritePolite(FAVORITE_HIDDEN_PARENT_CUE);
  }, []);
  const { toggle, isPending } = useToggleEstimateFavorite(scope ?? FALLBACK_SCOPE, announceCue ?? defaultAnnounceCue);
  const isFavorite = favoriteOverride?.estimateId === estimate.id ? favoriteOverride.value : estimate.isFavorite;
  const currentErrorMessage = errorMessage?.estimateId === estimate.id ? errorMessage.message : null;

  function toggleFavorite() {
    if (disabled || isPending || isToggling) return;

    const previousFavorite = isFavorite;
    const nextFavorite = !previousFavorite;
    nextFavoriteRef.current = nextFavorite;
    setIsToggling(true);
    setFavoriteOverride({ estimateId: estimate.id, value: nextFavorite });
    setErrorMessage(null);

    const project: EstimateFavoriteParentProject = parentProject ?? {
      id: estimate.project_id,
      name: estimate.name,
      projectCode: estimate.sheet_code,
      href: `/workshop/projects/${estimate.project_id}`,
      isSidebarFavorite: false,
    };

    toggle(
      {
        estimate: {
          id: estimate.id,
          projectId: estimate.project_id,
          name: estimate.name,
          sheetCode: estimate.sheet_code,
          href: getEstimateHref(estimate),
          favoriteCreatedAt: estimate.favoriteCreatedAt,
        },
        project,
        favorite: nextFavorite,
        store: optimistic ? store : undefined,
      },
      {
        onError: (error) => {
          setFavoriteOverride({ estimateId: estimate.id, value: previousFavorite });
          setErrorMessage({ estimateId: estimate.id, message: getErrorMessage(error) });
          announceSidebarFavoriteAssertive(FAVORITE_FAILURE_ALERT);
        },
        onSettled: () => setIsToggling(false),
      },
    );
  }

  return (
    <>
      <button
        type="button"
        className={cn(
          "grid size-6 cursor-pointer place-items-center rounded-xs transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus disabled:cursor-not-allowed disabled:opacity-40",
          isFavorite ? "text-brand-orange hover:text-brand-orange" : "text-tertiary hover:bg-surface-muted hover:text-ink",
          isPending || isToggling ? "cursor-wait opacity-70" : null,
        )}
        aria-label={
          isFavorite
            ? `Remove ${estimate.name} from favorite estimate sheets`
            : `Add ${estimate.name} to favorite estimate sheets`
        }
        aria-pressed={isFavorite}
        aria-busy={isPending || isToggling}
        aria-disabled={disabled || isPending || isToggling}
        disabled={disabled || isPending || isToggling}
        onClick={toggleFavorite}
        title={currentErrorMessage ?? (isFavorite ? "Remove from favorite estimate sheets" : "Add to favorite estimate sheets")}
      >
        <Star size={12} weight="regular" aria-hidden="true" />
      </button>
      {currentErrorMessage ? <span className="sr-only">{currentErrorMessage}</span> : null}
    </>
  );
}

ProjectEstimateFavoriteButton.displayName = "ProjectEstimateFavoriteButton";
