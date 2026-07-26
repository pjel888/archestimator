import { Trash } from "@phosphor-icons/react/dist/ssr";

import { IconButton } from "@/components/ui/icon-button";
import type { ProjectEstimateTableRow } from "./types";

export function ProjectEstimateDeleteActionCell({
  canEditEstimate,
  estimate,
  isSettling,
  onDeleteRequested,
}: {
  canEditEstimate: boolean;
  estimate: ProjectEstimateTableRow;
  isSettling: boolean;
  onDeleteRequested: (estimateId: string) => void;
}) {
  const rowActionsDisabled = Boolean(estimate.pendingStatus) || isSettling;

  return (
    <div className="flex items-center justify-center">
      <IconButton
        type="button"
        variant="plain"
        size="icon-xs"
        className="grid size-6 cursor-pointer place-items-center rounded-xs text-tertiary transition hover:bg-surface-muted hover:text-danger focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus disabled:cursor-not-allowed disabled:opacity-40"
        label={`Delete ${estimate.name}`}
        title={canEditEstimate ? "Delete estimate" : "View-only estimate."}
        disabled={!canEditEstimate || rowActionsDisabled}
        onClick={() => onDeleteRequested(estimate.id)}
        icon={<Trash size={16} weight="regular" aria-hidden="true" />}
      />
    </div>
  );
}

ProjectEstimateDeleteActionCell.displayName = "ProjectEstimateDeleteActionCell";
