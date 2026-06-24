import { useCallback, useEffect, useId, useRef, useState, useTransition, type KeyboardEvent } from "react";

import { useNavigationRouter } from "@/hooks/use-navigation-router";
import { updateEstimateDetails } from "@/lib/estimates/actions";
import { cn } from "@/lib/ui/cn";
import type { ProjectEstimatesStore } from "@/stores/project-estimates-store";

import type { ProjectEstimateTableRow } from "./types";
import { formatBudgetInput, getErrorMessage, parseBudgetInput, patchEstimateIfCurrent } from "./utils";

export function ProjectEstimateBudgetCell({
  canEditEstimate,
  estimate,
  projectId,
  store,
  optimistic,
  onEstimateEditSettlingChange,
}: {
  canEditEstimate: boolean;
  estimate: ProjectEstimateTableRow;
  projectId: string;
  store?: ProjectEstimatesStore;
  optimistic: boolean;
  onEstimateEditSettlingChange: (estimateId: string, settling: boolean) => void;
}) {
  const router = useNavigationRouter();
  const errorId = useId();
  const savedBudget = estimate.project_budget;
  const savedValue = formatBudgetInput(savedBudget);
  const [draft, setDraft] = useState(savedValue);
  const [status, setStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const savedValueRef = useRef(savedValue);
  const skipNextBlurCommitRef = useRef(false);

  useEffect(() => {
    if (savedValueRef.current === savedValue) return;
    savedValueRef.current = savedValue;
    // react-doctor-disable-next-line react-doctor/no-derived-state -- This is an editable input buffer; external row reconciliation must reset the draft without clearing save/error status.
    setDraft(savedValue);
  }, [savedValue]);

  const commitDraft = useCallback(() => {
    if (!canEditEstimate || status === "saving") return;
    let nextBudget: number | null;
    try {
      nextBudget = parseBudgetInput(draft);
    } catch (error) {
      setStatus("error");
      setErrorMessage(getErrorMessage(error));
      return;
    }

    if (nextBudget === savedBudget || (nextBudget === null && savedBudget === null)) {
      setDraft(savedValue);
      setStatus("idle");
      setErrorMessage(null);
      return;
    }

    setStatus("saving");
    setErrorMessage(null);
    onEstimateEditSettlingChange(estimate.id, true);
    if (optimistic && store) store.getState().patch(estimate.id, { project_budget: nextBudget });

    startTransition(() => {
      void updateEstimateDetails({
        projectId,
        estimateId: estimate.id,
        projectBudget: nextBudget,
      })
        .then(({ estimate: updatedEstimate }) => {
          setDraft(formatBudgetInput(updatedEstimate.project_budget));
          setStatus("saved");
          if (optimistic) {
            store?.getState().patch(estimate.id, { project_budget: updatedEstimate.project_budget });
          } else {
            router.refresh();
          }
        })
        .catch((error: unknown) => {
          let rollbackDraft = savedValue;
          if (optimistic && store) {
            const rolledBack = patchEstimateIfCurrent(store, estimate.id, { project_budget: nextBudget }, { project_budget: savedBudget });
            if (!rolledBack) {
              const currentEstimate = store.getState().estimates.find((current) => current.id === estimate.id);
              rollbackDraft = formatBudgetInput(currentEstimate?.project_budget ?? savedBudget);
            }
          }
          setDraft(rollbackDraft);
          setStatus("error");
          setErrorMessage(getErrorMessage(error));
        })
        .finally(() => {
          onEstimateEditSettlingChange(estimate.id, false);
        });
    });
  }, [canEditEstimate, draft, estimate.id, onEstimateEditSettlingChange, optimistic, projectId, router, savedBudget, savedValue, status, store]);

  if (estimate.pendingStatus) {
    return (
      <div className="min-w-0">
        <span className="block truncate px-1 text-left font-sans !text-[10px] leading-none tabular-nums text-tertiary">
          {savedValue ? `₱ ${savedValue}` : "—"}
        </span>
      </div>
    );
  }

  function handleBlur() {
    if (skipNextBlurCommitRef.current) {
      skipNextBlurCommitRef.current = false;
      return;
    }
    commitDraft();
  }

  function handleKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === "Enter") {
      event.preventDefault();
      event.currentTarget.blur();
      return;
    }

    if (event.key === "Escape") {
      event.preventDefault();
      skipNextBlurCommitRef.current = true;
      setDraft(savedValue);
      setStatus("idle");
      setErrorMessage(null);
      event.currentTarget.blur();
    }
  }

  return (
    <div className="min-w-0">
      <div className="flex min-w-0 items-center gap-1">
        <div className="relative min-w-0 flex-1">
          <span className="pointer-events-none absolute left-1 top-1/2 -translate-y-1/2 text-[9px] font-medium text-tertiary">₱</span>
          <input
            aria-describedby={errorMessage ? errorId : undefined}
            aria-invalid={status === "error" ? "true" : undefined}
            aria-label={`Project budget for ${estimate.name}`}
            className={cn(
              "h-6 min-w-0 w-full rounded-xs border border-transparent bg-transparent px-1 pl-4 text-left font-sans !text-[10px] leading-none tabular-nums text-ink outline-none transition placeholder:text-tertiary focus:border-accent focus:bg-accentSoft disabled:opacity-60",
              status === "error" && "border-danger bg-dangerSoft/40",
            )}
            disabled={!canEditEstimate || isPending || status === "saving"}
            inputMode="decimal"
            onBlur={handleBlur}
            onChange={(event) => {
              setDraft(event.currentTarget.value);
              if (status !== "idle") setStatus("idle");
              if (errorMessage) setErrorMessage(null);
            }}
            onFocus={(event) => event.currentTarget.select()}
            onKeyDown={handleKeyDown}
            placeholder="0.00"
            title={canEditEstimate ? "Edit the project budget for this estimate. Press Enter or leave the cell to save. Press Esc to cancel." : "View-only estimate."}
            value={draft}
          />
        </div>
        {status === "saving" ? <span className="shrink-0 text-[8px] font-medium uppercase tracking-normal text-tertiary">Saving</span> : null}
        {status === "saved" ? <span className="shrink-0 text-[8px] font-medium uppercase tracking-normal text-success">Saved</span> : null}
        {status === "error" ? (
          <span className="grid size-4 shrink-0 place-items-center rounded-xs bg-dangerSoft text-[9px] font-medium text-danger" title={errorMessage ?? "Update failed"}>
            !
          </span>
        ) : null}
      </div>
      {errorMessage ? (
        <p id={errorId} className="sr-only">
          {errorMessage}
        </p>
      ) : null}
    </div>
  );
}

ProjectEstimateBudgetCell.displayName = "ProjectEstimateBudgetCell";
