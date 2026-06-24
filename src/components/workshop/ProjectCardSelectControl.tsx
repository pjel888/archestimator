"use client";

import { cn } from "@/lib/ui/cn";

type ProjectCardSelectControlProps = {
  canSelect: boolean;
  canShowSelect: boolean;
  projectName: string;
  revealOnIntentClassName: string;
  selectedForDeletion: boolean;
  selectionActive: boolean;
  onToggleSelected: () => void;
};

export function ProjectCardSelectControl({
  canSelect,
  canShowSelect,
  projectName,
  revealOnIntentClassName,
  selectedForDeletion,
  selectionActive,
  onToggleSelected,
}: ProjectCardSelectControlProps) {
  function handleChange() {
    onToggleSelected();
  }

  if (!canShowSelect) return null;

  return (
    <label
      className={cn(
        "workshop-project-card-control grid size-6 shrink-0 cursor-pointer place-items-center rounded-xs border border-hairline text-ink",
        // When a selection is active the checkbox must stay clickable, so it drops
        // the reveal gate and re-asserts pointer-events over the wrapper's none.
        selectedForDeletion || selectionActive ? "opacity-100 pointer-events-auto" : revealOnIntentClassName,
        !canSelect ? "cursor-not-allowed text-tertiary" : null,
      )}
      title="Select project for deletion"
    >
      <span className="sr-only">{`Select ${projectName} for deletion`}</span>
      <input
        type="checkbox"
        className="size-3 rounded-xs border-hairline accent-danger"
        aria-label={`Select ${projectName} for deletion`}
        checked={selectedForDeletion}
        disabled={!canSelect}
        onChange={handleChange}
      />
    </label>
  );
}
