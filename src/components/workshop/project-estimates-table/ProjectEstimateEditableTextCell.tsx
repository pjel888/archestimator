import { useCallback, useEffect, useId, useRef, useState, useTransition, type KeyboardEvent } from "react";

import { useNavigationRouter } from "@/hooks/use-navigation-router";
import { updateEstimateDetails } from "@/lib/estimates/actions";
import { cn } from "@/lib/ui/cn";
import type { ProjectEstimatesStore } from "@/stores/project-estimates-store";

import type { EditableEstimateTextField, ProjectEstimateTableRow } from "./types";
import { getErrorMessage, patchEstimateIfCurrent } from "./utils";

export function ProjectEstimateEditableTextCell({
  className,
  canEditEstimate,
  estimate,
  field,
  inputClassName,
  label,
  placeholder,
  projectId,
  store,
  optimistic,
  onEstimateEditSettlingChange,
}: {
  className?: string;
  canEditEstimate: boolean;
  estimate: ProjectEstimateTableRow;
  field: EditableEstimateTextField;
  inputClassName?: string;
  label: string;
  placeholder: string;
  projectId: string;
  store?: ProjectEstimatesStore;
  optimistic: boolean;
  onEstimateEditSettlingChange: (estimateId: string, settling: boolean) => void;
}) {
  const router = useNavigationRouter();
  const errorId = useId();
  const isRequired = field !== "notes";
  const savedValue = field === "sheetCode" ? estimate.sheet_code : field === "notes" ? (estimate.notes ?? "") : estimate.name;
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
    const nextValue = draft.trim();
    if (nextValue === savedValue.trim()) {
      setDraft(savedValue);
      setStatus("idle");
      setErrorMessage(null);
      return;
    }

    if (isRequired && !nextValue) {
      setStatus("error");
      setErrorMessage(`${label} is required.`);
      return;
    }

    setStatus("saving");
    setErrorMessage(null);
    onEstimateEditSettlingChange(estimate.id, true);
    const optimisticPatch =
      field === "sheetCode"
        ? { sheet_code: nextValue }
        : field === "notes"
          ? { notes: nextValue || null }
          : { name: nextValue };
    const rollbackPatch =
      field === "sheetCode"
        ? { sheet_code: estimate.sheet_code }
        : field === "notes"
          ? { notes: estimate.notes }
          : { name: estimate.name };
    if (optimistic && store) store.getState().patch(estimate.id, optimisticPatch);

    startTransition(() => {
      void updateEstimateDetails({
        projectId,
        estimateId: estimate.id,
        ...(field === "sheetCode" ? { sheetCode: nextValue } : field === "notes" ? { notes: nextValue || null } : { name: nextValue }),
      })
        .then(({ estimate: updatedEstimate }) => {
          setDraft(field === "sheetCode" ? updatedEstimate.sheet_code : field === "notes" ? (updatedEstimate.notes ?? "") : updatedEstimate.name);
          setStatus("saved");
          if (optimistic) {
            store?.getState().patch(
              estimate.id,
              field === "sheetCode"
                ? { sheet_code: updatedEstimate.sheet_code }
                : field === "notes"
                  ? { notes: updatedEstimate.notes }
                  : { name: updatedEstimate.name },
            );
          } else {
            router.refresh();
          }
        })
        .catch((error: unknown) => {
          let rollbackDraft = savedValue;
          if (optimistic && store) {
            const rolledBack = patchEstimateIfCurrent(store, estimate.id, optimisticPatch, rollbackPatch);
            if (!rolledBack) {
              const currentEstimate = store.getState().estimates.find((current) => current.id === estimate.id);
              rollbackDraft = field === "sheetCode"
                ? (currentEstimate?.sheet_code ?? savedValue)
                : field === "notes"
                  ? (currentEstimate?.notes ?? "")
                  : (currentEstimate?.name ?? savedValue);
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
  }, [canEditEstimate, draft, estimate.id, estimate.name, estimate.notes, estimate.sheet_code, field, isRequired, label, onEstimateEditSettlingChange, optimistic, projectId, router, savedValue, status, store]);

  if (estimate.pendingStatus) {
    return (
      <div className={cn("min-w-0", className)}>
        <span className={cn("block truncate px-1 !text-[10px] leading-none text-tertiary", inputClassName)}>
          {savedValue || placeholder}
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
    <div className={cn("min-w-0", className)}>
      <div className="flex min-w-0 items-center gap-1">
        <input
          aria-describedby={errorMessage ? errorId : undefined}
          aria-invalid={status === "error" ? "true" : undefined}
          aria-label={`${label} for ${estimate.name}`}
          className={cn(
            "h-6 min-w-0 flex-1 rounded-xs border border-transparent bg-transparent px-1 !text-[10px] leading-none text-ink outline-none transition placeholder:text-tertiary focus:border-accent focus:bg-accentSoft disabled:opacity-60",
            status === "error" && "border-danger bg-dangerSoft/40",
            inputClassName,
          )}
          disabled={!canEditEstimate || isPending || status === "saving"}
          onBlur={handleBlur}
          onChange={(event) => {
            setDraft(event.currentTarget.value);
            if (status !== "idle") setStatus("idle");
            if (errorMessage) setErrorMessage(null);
          }}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          title={canEditEstimate ? "Edit inline. Press Enter or leave the cell to save. Press Esc to cancel." : "View-only estimate."}
          value={draft}
        />
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

ProjectEstimateEditableTextCell.displayName = "ProjectEstimateEditableTextCell";
