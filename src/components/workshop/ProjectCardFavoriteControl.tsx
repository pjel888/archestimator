"use client";

import { Star } from "@phosphor-icons/react/dist/ssr";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/ui/cn";

type ProjectCardFavoriteControlProps = {
  canToggleFavorite: boolean;
  controlButtonClassName: string;
  favoriteBusy: boolean;
  isFavorite: boolean;
  projectName: string;
  revealOnIntentClassName: string;
  onToggleFavorite: () => void;
};

export function ProjectCardFavoriteControl({
  canToggleFavorite,
  controlButtonClassName,
  favoriteBusy,
  isFavorite,
  projectName,
  revealOnIntentClassName,
  onToggleFavorite,
}: ProjectCardFavoriteControlProps) {
  function handleClick() {
    if (favoriteBusy) return;
    onToggleFavorite();
  }

  if (!canToggleFavorite) return null;

  return (
    <Button
      type="button"
      variant="secondary"
      size="icon-xs"
      className={cn(
        controlButtonClassName,
        "cursor-pointer aria-busy:cursor-wait aria-disabled:opacity-60",
        // Favorited stays visible with a quiet pressed surface instead of a
        // louder accent color.
        isFavorite
          ? "pointer-events-auto opacity-100 aria-pressed:border-tertiary/40 aria-pressed:bg-surfaceMuted aria-pressed:text-ink"
          : cn("text-secondary hover:text-ink", favoriteBusy ? "opacity-100" : revealOnIntentClassName),
      )}
      aria-label={
        isFavorite
          ? `Remove ${projectName} from favorite projects`
          : `Add ${projectName} to favorite projects`
      }
      aria-pressed={isFavorite}
      // Stay focusable while saving (native `disabled` would drop keyboard focus to
      // <body>); the click is guarded instead, and aria-busy announces the in-flight state.
      aria-busy={favoriteBusy}
      aria-disabled={favoriteBusy}
      onClick={handleClick}
    >
      <Star size={13} weight="regular" aria-hidden="true" />
    </Button>
  );
}
