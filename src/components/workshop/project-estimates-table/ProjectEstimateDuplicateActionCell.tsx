import { useRef, useState } from "react";
import { CopySimple } from "@phosphor-icons/react/dist/ssr";

import { useNavigationRouter } from "@/hooks/use-navigation-router";
import { duplicateEstimateSheet } from "@/lib/estimates/actions";
import type { ProjectEstimatesStore } from "@/stores/project-estimates-store";

import type { ProjectEstimateTableRow } from "./types";
import { makeOptimisticEstimateId } from "./utils";

type ProjectEstimateDuplicateActionCellProps = {
  canEditEstimate: boolean;
  estimate: ProjectEstimateTableRow;
  isSettling: boolean;
  onDuplicateError: (message: string | null) => void;
  projectId: string;
  store?: ProjectEstimatesStore;
  optimistic: boolean;
};

export function ProjectEstimateDuplicateActionCell({
  canEditEstimate,
  estimate,
  isSettling,
  onDuplicateError,
  projectId,
  store,
  optimistic,
}: ProjectEstimateDuplicateActionCellProps) {
  const router = useNavigationRouter();
  const [isDuplicating, setIsDuplicating] = useState(false);
  const duplicateInFlightRef = useRef(false);
  const isPendingRow = Boolean(estimate.pendingStatus);
  const rowActionsDisabled = isPendingRow || isSettling;

  function handleDuplicate() {
    if (!canEditEstimate || duplicateInFlightRef.current || rowActionsDisabled) return;

    duplicateInFlightRef.current = true;
    setIsDuplicating(true);
    onDuplicateError(null);

    const tempId = optimistic && store ? makeOptimisticEstimateId() : null;
    if (tempId && store) {
      store.getState().insertOptimistic({
        ...estimate,
        id: tempId,
        name: `${estimate.name} Copy`,
        firstNodeId: null,
        pendingStatus: "duplicating",
        pendingError: null,
      });
    }

    void duplicateEstimateSheet({ projectId, estimateId: estimate.id })
      .then((result) => {
        if (tempId && store) store.getState().reconcileInsert(tempId, result.row);
        else if (!optimistic) router.refresh();
      })
      .catch((error: unknown) => {
        if (tempId && store) store.getState().rollbackInsert(tempId);
        onDuplicateError(error instanceof Error ? error.message : "Could not duplicate estimate.");
      })
      .finally(() => {
        duplicateInFlightRef.current = false;
        setIsDuplicating(false);
      });
  }

  return (
    <div className="flex items-center justify-center">
      <button
        type="button"
        className="grid size-6 cursor-pointer place-items-center rounded-xs text-tertiary transition hover:bg-surface-muted hover:text-ink focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus disabled:cursor-not-allowed disabled:opacity-40"
        aria-label={`Duplicate ${estimate.name}`}
        disabled={!canEditEstimate || isDuplicating || rowActionsDisabled}
        onClick={handleDuplicate}
        title={!canEditEstimate ? "View-only estimate." : isDuplicating ? "Duplicating estimate..." : "Duplicate estimate"}
      >
        <CopySimple size={12} weight="regular" aria-hidden="true" />
      </button>
    </div>
  );
}

ProjectEstimateDuplicateActionCell.displayName = "ProjectEstimateDuplicateActionCell";
