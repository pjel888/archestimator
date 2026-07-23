import { useState, useTransition } from "react";
import { MagicWand } from "@phosphor-icons/react/dist/ssr";

import { useNavigationRouter } from "@/hooks/use-navigation-router";
import { regenerateEstimateSheetCode } from "@/lib/estimates/actions";
import type { ProjectEstimatesStore } from "@/stores/project-estimates-store";

import { ProjectEstimateEditableTextCell } from "./ProjectEstimateEditableTextCell";
import type { ProjectEstimateTableRow } from "./types";
import { getErrorMessage } from "./utils";

export function ProjectEstimateSheetCodeCell({
  canEditEstimate,
  estimate,
  projectId,
  store,
  optimistic,
  isEstimateSettling,
  onEstimateEditSettlingChange,
}: {
  canEditEstimate: boolean;
  estimate: ProjectEstimateTableRow;
  projectId: string;
  store?: ProjectEstimatesStore;
  optimistic: boolean;
  isEstimateSettling: boolean;
  onEstimateEditSettlingChange: (estimateId: string, settling: boolean) => void;
}) {
  const router = useNavigationRouter();
  const [isPending, startTransition] = useTransition();
  const [isGenerating, setIsGenerating] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const isPendingRow = Boolean(estimate.pendingStatus);
  const canEditSheetCode = canEditEstimate && !isEstimateSettling && !isGenerating;

  function handleAutoGenerate() {
    if (!canEditEstimate || isEstimateSettling || isGenerating) return;
    setErrorMessage(null);
    setIsGenerating(true);
    onEstimateEditSettlingChange(estimate.id, true);
    startTransition(() => {
      void regenerateEstimateSheetCode({ projectId, estimateId: estimate.id })
        .then(({ estimate: updatedEstimate }) => {
          if (optimistic) {
            store?.getState().patch(estimate.id, { sheet_code: updatedEstimate.sheet_code });
          } else {
            router.refresh();
          }
        })
        .catch((error: unknown) => setErrorMessage(getErrorMessage(error)))
        .finally(() => {
          setIsGenerating(false);
          onEstimateEditSettlingChange(estimate.id, false);
        });
    });
  }

  return (
    <div className="group/sheet-code relative flex min-w-0 items-center">
      <ProjectEstimateEditableTextCell
        key={`estimate-sheet-code-${estimate.id}`}
        className="w-full pr-7"
        estimate={estimate}
        field="sheetCode"
        inputClassName="font-medium text-tertiary tabular-nums"
        label="Estimate code"
        placeholder="Auto Code"
        projectId={projectId}
        store={store}
        optimistic={optimistic}
        canEditEstimate={canEditSheetCode}
        onEstimateEditSettlingChange={onEstimateEditSettlingChange}
      />
      {isPendingRow ? null : (
        <button
          type="button"
          aria-label={`Auto-generate estimate code for ${estimate.name}`}
          className="absolute right-0 top-1/2 grid size-6 -translate-y-1/2 cursor-pointer place-items-center rounded-xs border border-hairline bg-white/90 text-tertiary opacity-0 shadow-[inset_0_1px_0_rgba(255,255,255,0.64)] transition hover:border-accent hover:text-accent focus-visible:opacity-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus disabled:cursor-not-allowed group-hover/sheet-code:opacity-100 group-focus-within/sheet-code:opacity-100"
          disabled={!canEditEstimate || isPending || isEstimateSettling || isGenerating}
          onClick={handleAutoGenerate}
          title={errorMessage ?? (canEditEstimate ? "Auto-generate the next estimate code" : "View-only estimate.")}
        >
          <MagicWand size={16} weight="regular" aria-hidden="true" />
        </button>
      )}
      {errorMessage ? <span className="sr-only">{errorMessage}</span> : null}
    </div>
  );
}

ProjectEstimateSheetCodeCell.displayName = "ProjectEstimateSheetCodeCell";
