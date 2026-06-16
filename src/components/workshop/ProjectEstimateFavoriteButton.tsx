"use client";

import { useState, useTransition } from "react";
import { Star } from "@phosphor-icons/react/dist/ssr";

import { setEstimateFavorite } from "@/lib/workshop/actions";
import type { ProjectEstimateListRow } from "@/lib/estimates/project-estimate-list-row";
import type { ProjectEstimatesStore } from "@/stores/project-estimates-store";
import { cn } from "@/lib/ui/cn";

type ProjectEstimateFavoriteButtonProps = {
  readonly estimate: ProjectEstimateListRow;
  readonly disabled: boolean;
  readonly optimistic: boolean;
  readonly store?: ProjectEstimatesStore;
};

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : "Could not update favorite estimate.";
}

export function ProjectEstimateFavoriteButton({
  estimate,
  disabled,
  optimistic,
  store,
}: ProjectEstimateFavoriteButtonProps) {
  const [favoriteOverride, setFavoriteOverride] = useState<{ readonly estimateId: string; readonly value: boolean } | null>(null);
  const [errorMessage, setErrorMessage] = useState<{ readonly estimateId: string; readonly message: string } | null>(null);
  const [isPending, startTransition] = useTransition();
  const isFavorite = favoriteOverride?.estimateId === estimate.id ? favoriteOverride.value : estimate.isFavorite;
  const currentErrorMessage = errorMessage?.estimateId === estimate.id ? errorMessage.message : null;

  function patchFavorite(nextFavorite: boolean, favoriteCreatedAt: string | null) {
    if (!optimistic) return;
    store?.getState().patch(estimate.id, {
      isFavorite: nextFavorite,
      favoriteCreatedAt,
    });
  }

  function toggleFavorite() {
    if (disabled || isPending) return;

    const previousFavorite = isFavorite;
    const previousFavoriteCreatedAt = estimate.favoriteCreatedAt;
    const nextFavorite = !previousFavorite;
    setFavoriteOverride({ estimateId: estimate.id, value: nextFavorite });
    setErrorMessage(null);
    patchFavorite(nextFavorite, nextFavorite ? new Date().toISOString() : null);

    startTransition(() => {
      void setEstimateFavorite({ estimateId: estimate.id, favorite: nextFavorite })
        .catch((error: unknown) => {
          setFavoriteOverride({ estimateId: estimate.id, value: previousFavorite });
          patchFavorite(previousFavorite, previousFavoriteCreatedAt);
          setErrorMessage({ estimateId: estimate.id, message: getErrorMessage(error) });
        });
    });
  }

  return (
    <>
      <button
        type="button"
        className={cn(
          "grid size-6 cursor-pointer place-items-center rounded-xs text-tertiary transition hover:bg-surface-muted hover:text-ink focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus disabled:cursor-not-allowed disabled:opacity-40",
          isFavorite ? "bg-surface-muted text-ink" : null,
          isPending ? "cursor-wait opacity-70" : null,
        )}
        aria-label={
          isFavorite
            ? `Remove ${estimate.name} from favorite estimate sheets`
            : `Add ${estimate.name} to favorite estimate sheets`
        }
        aria-pressed={isFavorite}
        aria-busy={isPending}
        aria-disabled={disabled || isPending}
        disabled={disabled}
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
