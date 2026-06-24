import type { ProjectEstimateTableRow } from "./types";

export function ProjectEstimateSelectActionCell({
  canEditEstimate,
  estimate,
  isSelected,
  isSettling,
  onToggleSelected,
}: {
  canEditEstimate: boolean;
  estimate: ProjectEstimateTableRow;
  isSelected: boolean;
  isSettling: boolean;
  onToggleSelected: (estimateId: string) => void;
}) {
  const rowActionsDisabled = Boolean(estimate.pendingStatus) || isSettling;

  return (
    <div className="flex items-center justify-center">
      <input
        type="checkbox"
        className="size-3 cursor-pointer rounded-xs border-hairline accent-ink disabled:cursor-not-allowed disabled:opacity-40"
        aria-label={`Select ${estimate.name}`}
        checked={isSelected}
        disabled={!canEditEstimate || rowActionsDisabled}
        onChange={() => onToggleSelected(estimate.id)}
      />
    </div>
  );
}

ProjectEstimateSelectActionCell.displayName = "ProjectEstimateSelectActionCell";
