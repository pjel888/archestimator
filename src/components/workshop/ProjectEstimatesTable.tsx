"use client";

import Link from "next/link";
import { useNavigationRouter } from "@/hooks/use-navigation-router";
import { usePrefetchOnHover } from "@/hooks/use-prefetch-on-hover";
import { useCallback, useEffect, useId, useMemo, useRef, useState, useTransition, type CSSProperties, type KeyboardEvent } from "react";
import { ArrowSquareOut, CaretDown, CaretUp, CaretUpDown, CopySimple, MagicWand, Trash } from "@phosphor-icons/react/dist/ssr";
import { useQueryClient } from "@tanstack/react-query";
import {
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  useReactTable,
  type ColumnDef,
  type ColumnSizingState,
  type Header,
  type SortingState,
  type Table,
} from "@tanstack/react-table";

import { Button } from "@/components/ui/button";
import { BulkActionToolbar } from "@/components/workshop/BulkActionToolbar";
import { BulkDestructivePreviewModal } from "@/components/workshop/BulkDestructivePreviewModal";
import { ProjectEstimateFavoriteButton, type EstimateFavoriteParentProject, type EstimateFavoriteScope } from "@/components/workshop/ProjectEstimateFavoriteButton";
import { duplicateEstimateSheet, executeBulkDeleteEstimateSheets, previewBulkDeleteEstimateSheets, regenerateEstimateSheetCode, updateEstimateDetails } from "@/lib/estimates/actions";
import { estimateQueryKeys } from "@/hooks/use-estimate-query";
import { createBulkActionCorrelationId, type BulkActionPreviewResult } from "@/lib/mass-deletion/bulk-action";
import type { ProjectEstimateListRow } from "@/lib/estimates/project-estimate-list-row";
import type { ProjectEstimatesStore } from "@/stores/project-estimates-store";
import { cn } from "@/lib/ui/cn";

/**
 * Backwards-compatible alias. The canonical, sensitive-column-free list-row
 * contract lives in `@/lib/estimates/project-estimate-list-row`; the table no
 * longer extends the full Supabase estimates row (finding F9 / P-1.1).
 */
export type ProjectEstimateTableRow = ProjectEstimateListRow;

type ProjectEstimatesTableProps = {
  canEditEstimateById?: Record<string, boolean>;
  estimates: ProjectEstimateTableRow[];
  projectId: string;
  emptyMessage?: string;
  /**
   * Parent-project sidebar metadata, threaded to the favorite button so the
   * optimistic sidebar insert + legibility cue can fire. Optional: standalone
   * renders fall back to a synthesized parent inside the button.
   */
  parentProject?: EstimateFavoriteParentProject;
  /** Scope for the sidebar favorites cache key. */
  scope?: EstimateFavoriteScope;
  /** Fires the polite legibility cue when toggling under a non-sidebar-favorite parent. */
  announceCue?: () => void;
  /**
   * Optimistic store owned by ProjectEstimatesClient. When present (P0 default),
   * mutations reconcile through it instead of `router.refresh()`. Absent in
   * standalone renders, which fall back to local-state-only updates.
   */
  store?: ProjectEstimatesStore;
  /**
   * P0 cutover gate. true (default) = optimistic store path, no overlay refresh.
   * false = legacy server-prop + router.refresh path (backout aid, see D10).
   */
  optimistic?: boolean;
  canCreateEstimates?: boolean;
  isCreatingEstimate?: boolean;
  onCreateEstimateFromName?: (name: string) => boolean | void;
};

function makeOptimisticEstimateId() {
  return `temp-${crypto.randomUUID()}`;
}

type EditableEstimateTextField = "name" | "notes" | "sheetCode";

const pesoFormatter = new Intl.NumberFormat("en-PH", {
  style: "currency",
  currency: "PHP",
  minimumFractionDigits: 2,
});

const EMPTY_TABLE_ROW_COUNT = 60;
const COLUMN_WIDTH_STORAGE_KEY_PREFIX = "archestimator:project-estimates-column-widths";
const READ_ONLY_HOVER_COLUMN_IDS = new Set(["totalProjectCost", "overbudget", "updated_at", "created_at"]);
const TIGHT_ICON_COLUMN_IDS = new Set(["favorite_action", "duplicate_action"]);
const ESTIMATE_NAME_COLUMN_INDEX = 5;

function readColumnSizingFromStorage(storageKey: string): ColumnSizingState {
  if (typeof window === "undefined") return {};

  try {
    const saved = window.localStorage.getItem(storageKey);
    return saved ? (JSON.parse(saved) as ColumnSizingState) : {};
  } catch {
    return {};
  }
}

function writeColumnSizingToStorage(storageKey: string, columnSizing: ColumnSizingState) {
  if (typeof window === "undefined") return;

  try {
    if (Object.keys(columnSizing).length === 0) {
      window.localStorage.removeItem(storageKey);
      return;
    }
    window.localStorage.setItem(storageKey, JSON.stringify(columnSizing));
  } catch {
    // Column sizing is a convenience preference; blocked storage should not break the table.
  }
}

function ProjectEstimatesColGroup({ table }: { table: Table<ProjectEstimateTableRow> }) {
  return (
    <colgroup>
      {table.getVisibleLeafColumns().map((column) => (
        <col key={column.id} style={{ width: `${column.getSize()}px` }} />
      ))}
    </colgroup>
  );
}

ProjectEstimatesColGroup.displayName = "ProjectEstimatesColGroup";

function formatPeso(value: number) {
  return pesoFormatter.format(value).replace("₱", "₱ ");
}

function formatSignedPeso(value: number) {
  const sign = value >= 0 ? "+" : "-";
  return `${sign}${formatPeso(Math.abs(value))}`;
}

function formatBudgetInput(value: number | null) {
  if (typeof value !== "number") return "";
  return new Intl.NumberFormat("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(value);
}

function parseBudgetInput(value: string) {
  const text = value.replace(/,/g, "").trim();
  if (!text) return null;

  const budget = Number(text);
  if (!Number.isFinite(budget) || budget < 0) throw new Error("Project budget must be a valid positive number.");
  return budget;
}

function getVarianceColorClass(value: number) {
  return value >= 0 ? "text-success" : "text-danger";
}

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat("en", {
    month: "numeric",
    day: "numeric",
    year: "2-digit",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(value));
}

function formatCount(value: number, singular: string, plural: string) {
  return `${value} ${value === 1 ? singular : plural}`;
}

function getEstimateHref(estimate: ProjectEstimateTableRow) {
  return estimate.firstNodeId
    ? `/workshop/projects/${estimate.project_id}/estimates/${estimate.firstNodeId}`
    : `/workshop/projects/${estimate.project_id}/estimates/${estimate.id}`;
}

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : "Update failed. Please try again.";
}

function patchEstimateIfCurrent(
  store: ProjectEstimatesStore,
  estimateId: string,
  expected: Partial<ProjectEstimateTableRow>,
  patch: Partial<ProjectEstimateTableRow>,
) {
  const current = store.getState().estimates.find((estimate) => estimate.id === estimateId);
  if (!current) return false;

  const stillOwnsOptimisticValue = (Object.entries(expected) as [keyof ProjectEstimateTableRow, ProjectEstimateTableRow[keyof ProjectEstimateTableRow]][])
    .every(([key, value]) => current[key] === value);
  if (!stillOwnsOptimisticValue) return false;

  store.getState().patch(estimateId, patch);
  return true;
}

function SortIcon({ direction }: { direction: false | "asc" | "desc" }) {
  if (direction === "asc") return <CaretUp size={10} weight="regular" aria-hidden="true" />;
  if (direction === "desc") return <CaretDown size={10} weight="regular" aria-hidden="true" />;
  return <CaretUpDown size={10} weight="regular" aria-hidden="true" />;
}

function ProjectEstimateBlankNameCreateCell({
  disabled,
  onCreateEstimateFromName,
}: {
  disabled: boolean;
  onCreateEstimateFromName?: (name: string) => boolean | void;
}) {
  const [draft, setDraft] = useState("");
  const skipNextBlurCommitRef = useRef(false);
  const isDisabled = disabled || !onCreateEstimateFromName;

  const commitDraft = useCallback(() => {
    if (isDisabled) return;

    const nextName = draft.trim();
    if (!nextName) {
      setDraft("");
      return;
    }

    const accepted = onCreateEstimateFromName?.(nextName);
    if (accepted === false) return;
    setDraft("");
  }, [draft, isDisabled, onCreateEstimateFromName]);

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
      skipNextBlurCommitRef.current = true;
      commitDraft();
      event.currentTarget.blur();
      return;
    }

    if (event.key === "Escape") {
      event.preventDefault();
      skipNextBlurCommitRef.current = true;
      setDraft("");
      event.currentTarget.blur();
    }
  }

  return (
    <input
      aria-label="Create estimate from blank name cell"
      className="h-6 min-w-0 w-full rounded-xs border border-transparent bg-transparent px-1 !text-[10px] font-medium leading-none text-ink outline-none transition placeholder:text-tertiary focus:border-accent focus:bg-accentSoft disabled:opacity-60"
      disabled={isDisabled}
      onBlur={handleBlur}
      onChange={(event) => setDraft(event.currentTarget.value)}
      onKeyDown={handleKeyDown}
      title={isDisabled ? "Create estimate unavailable." : "Enter an estimate name."}
      value={draft}
    />
  );
}

ProjectEstimateBlankNameCreateCell.displayName = "ProjectEstimateBlankNameCreateCell";

function ProjectEstimateFillerRows({
  columnCount,
  rowCount,
  emptyMessage,
  showEmptyMessage,
  canCreateEstimates,
  isCreatingEstimate,
  onCreateEstimateFromName,
}: {
  columnCount: number;
  rowCount: number;
  emptyMessage: string;
  showEmptyMessage: boolean;
  canCreateEstimates: boolean;
  isCreatingEstimate: boolean;
  onCreateEstimateFromName?: (name: string) => boolean | void;
}) {
  return Array.from({ length: rowCount }, (_, rowIndex) => (
    <tr key={`estimate-filler-row-${rowIndex}`} className="h-8 border-b border-hairline last:border-b-0">
      {Array.from({ length: columnCount }, (_, columnIndex) => (
        <td key={`estimate-filler-cell-${rowIndex}-${columnIndex}`} className="border-r border-hairline px-2 py-1 text-left last:border-r-0">
          {!showEmptyMessage && rowIndex === 0 && columnIndex === ESTIMATE_NAME_COLUMN_INDEX ? (
            <ProjectEstimateBlankNameCreateCell
              disabled={!canCreateEstimates || isCreatingEstimate}
              onCreateEstimateFromName={onCreateEstimateFromName}
            />
          ) : null}
          {showEmptyMessage && rowIndex === 0 && columnIndex === ESTIMATE_NAME_COLUMN_INDEX ? (
            <span className="text-[10px] font-medium text-tertiary">{emptyMessage}</span>
          ) : null}
        </td>
      ))}
    </tr>
  ));
}

ProjectEstimateFillerRows.displayName = "ProjectEstimateFillerRows";

type ProjectEstimateFavoriteActionCellProps = {
  estimate: ProjectEstimateTableRow;
  isSettling: boolean;
  store?: ProjectEstimatesStore;
  optimistic: boolean;
  parentProject?: EstimateFavoriteParentProject;
  scope?: EstimateFavoriteScope;
  announceCue?: () => void;
};

function ProjectEstimateFavoriteActionCell({
  estimate,
  isSettling,
  store,
  optimistic,
  parentProject,
  scope,
  announceCue,
}: ProjectEstimateFavoriteActionCellProps) {
  const rowActionsDisabled = Boolean(estimate.pendingStatus) || isSettling;

  return (
    <div className="flex items-center justify-center">
      <ProjectEstimateFavoriteButton
        estimate={estimate}
        disabled={rowActionsDisabled}
        optimistic={optimistic}
        store={store}
        parentProject={parentProject}
        scope={scope}
        announceCue={announceCue}
      />
    </div>
  );
}

ProjectEstimateFavoriteActionCell.displayName = "ProjectEstimateFavoriteActionCell";

type ProjectEstimateDuplicateActionCellProps = {
  canEditEstimate: boolean;
  estimate: ProjectEstimateTableRow;
  isSettling: boolean;
  onDuplicateError: (message: string | null) => void;
  projectId: string;
  store?: ProjectEstimatesStore;
  optimistic: boolean;
};

function ProjectEstimateDuplicateActionCell({
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

    // Optimistic duplicate: drop a "<name> Copy" placeholder in immediately,
    // reconcile to the server-canonical row, roll back on failure (P0-5). Only
    // the legacy (!optimistic) path falls back to the overlay refresh.
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

function ProjectEstimateSelectActionCell({
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

function ProjectEstimateOpenActionCell({
  estimate,
  isSettling,
  onPrefetchCancel,
  onPrefetchStart,
}: {
  estimate: ProjectEstimateTableRow;
  isSettling: boolean;
  onPrefetchCancel: (href: string) => void;
  onPrefetchStart: (href: string) => void;
}) {
  const estimateHref = getEstimateHref(estimate);
  const rowActionsDisabled = Boolean(estimate.pendingStatus) || isSettling;

  return (
    <div className="flex items-center justify-center">
      {rowActionsDisabled ? (
        <span
          className="grid size-6 place-items-center rounded-xs text-tertiary opacity-40"
          aria-label={`Open ${estimate.name}`}
          aria-disabled="true"
        >
          <ArrowSquareOut size={12} weight="regular" aria-hidden="true" />
        </span>
      ) : (
        <Link
          href={estimateHref}
          prefetch={false}
          onBlur={() => onPrefetchCancel(estimateHref)}
          onFocus={() => onPrefetchStart(estimateHref)}
          onMouseEnter={() => onPrefetchStart(estimateHref)}
          onMouseLeave={() => onPrefetchCancel(estimateHref)}
          className="grid size-6 cursor-pointer place-items-center rounded-xs text-tertiary transition hover:bg-surface-muted hover:text-ink focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
          aria-label={`Open ${estimate.name}`}
        >
          <ArrowSquareOut size={12} weight="regular" aria-hidden="true" />
        </Link>
      )}
    </div>
  );
}

ProjectEstimateOpenActionCell.displayName = "ProjectEstimateOpenActionCell";

function ProjectEstimateDeleteActionCell({
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
      <button
        type="button"
        className="grid size-6 cursor-pointer place-items-center rounded-xs text-tertiary transition hover:bg-surface-muted hover:text-danger focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus disabled:cursor-not-allowed disabled:opacity-40"
        aria-label={`Delete ${estimate.name}`}
        title={canEditEstimate ? "Delete estimate" : "View-only estimate."}
        disabled={!canEditEstimate || rowActionsDisabled}
        onClick={() => onDeleteRequested(estimate.id)}
      >
        <Trash size={12} weight="regular" aria-hidden="true" />
      </button>
    </div>
  );
}

ProjectEstimateDeleteActionCell.displayName = "ProjectEstimateDeleteActionCell";

function ProjectEstimateEditableTextCell({
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
          // Reconcile the server-canonical scalar field into the store; no
          // overlay refresh (P0-4). Local `draft` already shows the new value.
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

function ProjectEstimateBudgetCell({
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

function ProjectEstimateSheetCodeCell({
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
          className="absolute right-0 top-1/2 grid size-5 -translate-y-1/2 cursor-pointer place-items-center rounded-xs border border-hairline bg-white/90 text-tertiary opacity-0 shadow-[inset_0_1px_0_rgba(255,255,255,0.64)] transition hover:border-accent hover:text-accent focus-visible:opacity-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus disabled:cursor-not-allowed group-hover/sheet-code:opacity-100 group-focus-within/sheet-code:opacity-100"
          disabled={!canEditEstimate || isPending || isEstimateSettling || isGenerating}
          onClick={handleAutoGenerate}
          title={errorMessage ?? (canEditEstimate ? "Auto-generate the next estimate code" : "View-only estimate.")}
        >
          <MagicWand size={12} weight="regular" aria-hidden="true" />
        </button>
      )}
      {errorMessage ? <span className="sr-only">{errorMessage}</span> : null}
    </div>
  );
}

ProjectEstimateSheetCodeCell.displayName = "ProjectEstimateSheetCodeCell";

function ProjectEstimatesColumnResizeHandle({
  header,
  table,
}: {
  header: Header<ProjectEstimateTableRow, unknown>;
  table: Table<ProjectEstimateTableRow>;
}) {
  if (!header.column.getCanResize()) return null;

  function resizeBy(delta: number) {
    const minSize = header.column.columnDef.minSize ?? 48;
    const maxSize = header.column.columnDef.maxSize ?? 640;
    const nextSize = Math.min(Math.max(header.column.getSize() + delta, minSize), maxSize);
    table.setColumnSizing((current) => ({ ...current, [header.column.id]: nextSize }));
  }

  function handleKeyDown(event: KeyboardEvent<HTMLSpanElement>) {
    if (event.key === "ArrowLeft") {
      event.preventDefault();
      resizeBy(-16);
    }
    if (event.key === "ArrowRight") {
      event.preventDefault();
      resizeBy(16);
    }
    if (event.key === "Home") {
      event.preventDefault();
      header.column.resetSize();
    }
  }

  return (
    <span
      role="separator"
      tabIndex={0}
      aria-label={`Resize ${String(header.column.columnDef.header ?? "column")}`}
      aria-orientation="vertical"
      className={cn(
        "absolute right-0 top-0 h-full w-2 translate-x-1/2 cursor-col-resize touch-none select-none",
        "after:absolute after:right-1 after:top-1 after:h-[calc(100%-8px)] after:w-px after:bg-hairline after:content-['']",
        "hover:after:bg-accent focus:outline-none focus:after:w-0.5 focus:after:bg-accent",
        header.column.getIsResizing() && "after:w-0.5 after:bg-accent",
      )}
      onDoubleClick={() => header.column.resetSize()}
      onKeyDown={handleKeyDown}
      onMouseDown={header.getResizeHandler()}
      onTouchStart={header.getResizeHandler()}
      title="Drag to resize. Double-click or press Home to reset. Use Left/Right arrow keys for keyboard resizing."
    />
  );
}

ProjectEstimatesColumnResizeHandle.displayName = "ProjectEstimatesColumnResizeHandle";

function ProjectEstimatesTableComponent({
  canEditEstimateById,
  estimates,
  projectId,
  emptyMessage = "No estimates yet",
  store,
  optimistic = true,
  parentProject,
  scope,
  announceCue,
  canCreateEstimates = false,
  isCreatingEstimate = false,
  onCreateEstimateFromName,
}: ProjectEstimatesTableProps) {
  const router = useNavigationRouter();
  const queryClient = useQueryClient();
  const columnWidthStorageKey = `${COLUMN_WIDTH_STORAGE_KEY_PREFIX}:${projectId}`;
  const [sorting, setSorting] = useState<SortingState>([{ id: "updated_at", desc: true }]);
  const [columnSizing, setColumnSizing] = useState<ColumnSizingState>(() => readColumnSizingFromStorage(columnWidthStorageKey));
  const columnSizingRef = useRef(columnSizing);
  const [selectedEstimateIds, setSelectedEstimateIds] = useState<Set<string>>(() => new Set());
  const [duplicateError, setDuplicateError] = useState<string | null>(null);
  const [deleteEstimateTargetIds, setDeleteEstimateTargetIds] = useState<string[]>([]);
  const [deleteEstimatePreview, setDeleteEstimatePreview] = useState<BulkActionPreviewResult | null>(null);
  const [deleteEstimateError, setDeleteEstimateError] = useState<string | null>(null);
  const [deleteEstimateState, setDeleteEstimateState] = useState<"idle" | "loading" | "ready" | "executing">("idle");
  const deleteExecutionInFlightRef = useRef(false);
  const estimatesRef = useRef(estimates);
  const settlingEstimateCountsRef = useRef(new Map<string, number>());
  const [, setSettlingEstimateVersion] = useState(0);
  const [, startDeleteEstimateTransition] = useTransition();

  useEffect(() => {
    estimatesRef.current = estimates;
  }, [estimates]);

  const prefetchRoutes = useMemo(
    () =>
      estimates.map((estimate) => ({
        pathname: getEstimateHref(estimate),
      })),
    [estimates],
  );
  const { prefetch: prefetchEstimateRoute, cancel: cancelEstimateRoute } = usePrefetchOnHover(prefetchRoutes);
  const prefetchEstimateRouteRef = useRef(prefetchEstimateRoute);
  const cancelEstimateRouteRef = useRef(cancelEstimateRoute);

  useEffect(() => {
    prefetchEstimateRouteRef.current = prefetchEstimateRoute;
  }, [prefetchEstimateRoute]);

  useEffect(() => {
    cancelEstimateRouteRef.current = cancelEstimateRoute;
  }, [cancelEstimateRoute]);

  const handlePrefetchStart = useCallback((href: string) => {
    prefetchEstimateRouteRef.current(href);
  }, []);

  const handlePrefetchCancel = useCallback((href: string) => {
    cancelEstimateRouteRef.current(href);
  }, []);

  const editableEstimateIds = useMemo(
    () => new Set(estimates.filter((estimate) => (canEditEstimateById ? canEditEstimateById[estimate.id] === true : true)).map((estimate) => estimate.id)),
    [canEditEstimateById, estimates],
  );
  const canEditEstimate = useCallback(
    (estimateId: string) => (canEditEstimateById ? canEditEstimateById[estimateId] === true : true),
    [canEditEstimateById],
  );
  const isEstimateSettling = useCallback((estimateId: string) => {
    return (settlingEstimateCountsRef.current.get(estimateId) ?? 0) > 0;
  }, []);
  const setEstimateSettling = useCallback((estimateId: string, settling: boolean) => {
    const counts = settlingEstimateCountsRef.current;
    const current = counts.get(estimateId) ?? 0;
    const next = settling ? current + 1 : Math.max(current - 1, 0);
    if (next === current) return;

    if (next === 0) counts.delete(estimateId);
    else counts.set(estimateId, next);
    setSettlingEstimateVersion((version) => version + 1);
  }, []);

  useEffect(() => {
    setColumnSizing(readColumnSizingFromStorage(columnWidthStorageKey));
  }, [columnWidthStorageKey]);

  useEffect(() => {
    columnSizingRef.current = columnSizing;
  }, [columnSizing]);

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      writeColumnSizingToStorage(columnWidthStorageKey, columnSizing);
    }, 120);

    return () => window.clearTimeout(timeout);
  }, [columnSizing, columnWidthStorageKey]);

  useEffect(() => {
    return () => {
      writeColumnSizingToStorage(columnWidthStorageKey, columnSizingRef.current);
    };
  }, [columnWidthStorageKey]);

  useEffect(() => {
    const availableIds = editableEstimateIds;
    setSelectedEstimateIds((current) => {
      const next = new Set([...current].filter((id) => availableIds.has(id)));
      return next.size === current.size ? current : next;
    });
  }, [editableEstimateIds]);

  const toggleEstimateSelection = useCallback((estimateId: string) => {
    setSelectedEstimateIds((current) => {
      const next = new Set(current);
      if (next.has(estimateId)) next.delete(estimateId);
      else next.add(estimateId);
      return next;
    });
  }, []);

  const selectedVisibleEstimateIds = useMemo(
    () => estimates.filter((estimate) => editableEstimateIds.has(estimate.id) && selectedEstimateIds.has(estimate.id)).map((estimate) => estimate.id),
    [editableEstimateIds, estimates, selectedEstimateIds],
  );
  const deleteEstimatePhrase = deleteEstimateTargetIds.length === 1 ? "DELETE ESTIMATE" : `DELETE ${deleteEstimateTargetIds.length} ESTIMATES`;
  const deleteEstimateModalTitle = deleteEstimateTargetIds.length === 1 ? "Delete estimate" : `Delete ${deleteEstimateTargetIds.length} estimates`;

  const openDeleteEstimatePreview = useCallback((estimateIds: string[]) => {
    const uniqueEstimateIds = Array.from(new Set(estimateIds)).filter((id) => estimatesRef.current.some((estimate) => estimate.id === id));
    if (uniqueEstimateIds.length === 0) return;
    setDeleteEstimateTargetIds(uniqueEstimateIds);
    setDeleteEstimatePreview(null);
    setDeleteEstimateError(null);
    setDeleteEstimateState("loading");
    startDeleteEstimateTransition(() => {
      void previewBulkDeleteEstimateSheets({ projectId, estimateIds: uniqueEstimateIds })
        .then((preview) => {
          setDeleteEstimatePreview(preview);
          setDeleteEstimateState("ready");
        })
        .catch((error: unknown) => {
          setDeleteEstimateError(error instanceof Error ? error.message : "Could not load delete preview.");
          setDeleteEstimateState("ready");
        });
    });
  }, [projectId, startDeleteEstimateTransition]);

  const closeDeleteEstimatePreview = useCallback(() => {
    setDeleteEstimateTargetIds([]);
    setDeleteEstimatePreview(null);
    setDeleteEstimateError(null);
    setDeleteEstimateState("idle");
  }, []);

  const executeDeleteEstimatePreview = useCallback(() => {
    if (!deleteEstimatePreview?.previewHash || deleteExecutionInFlightRef.current) return;
    const previewHash = deleteEstimatePreview.previewHash;
    const targetIds = deleteEstimateTargetIds;
    deleteExecutionInFlightRef.current = true;
    setDeleteEstimateState("executing");
    // Optimistic delete: pull the rows out of the store immediately (they vanish
    // behind the still-open modal). On success the modal closes to reveal the
    // already-updated table with no overlay refresh; on failure the rows are
    // restored to their original positions and the modal shows the error (P0-5).
    const rollback = optimistic && store ? store.getState().removeOptimistic(targetIds) : null;
    startDeleteEstimateTransition(() => {
      void executeBulkDeleteEstimateSheets({
        projectId,
        estimateIds: targetIds,
        expectedPreviewHash: previewHash,
        correlationId: createBulkActionCorrelationId(),
      })
        .then((result) => {
          if (!result.ok) {
            rollback?.();
            setDeleteEstimatePreview((current) => current ? { ...current, issues: result.issues, blocked: result.blocked ?? current.blocked, ok: false } : current);
            setDeleteEstimateError(result.issues[0]?.message ?? "Could not delete estimates.");
            setDeleteEstimateState("ready");
            return;
          }
          const removedIds = result.deletedIds?.length ? result.deletedIds : targetIds;
          setSelectedEstimateIds((current) => {
            const next = new Set(current);
            for (const id of removedIds) next.delete(id);
            return next;
          });
          for (const id of removedIds) {
            queryClient.removeQueries({ queryKey: estimateQueryKeys.detail(id) });
            queryClient.removeQueries({ queryKey: estimateQueryKeys.areaTree(id) });
          }
          closeDeleteEstimatePreview();
          if (!optimistic) router.refresh();
        })
        .catch((error: unknown) => {
          rollback?.();
          setDeleteEstimateError(error instanceof Error ? error.message : "Could not delete estimates.");
          setDeleteEstimateState("ready");
        })
        .finally(() => {
          deleteExecutionInFlightRef.current = false;
        });
    });
  }, [closeDeleteEstimatePreview, deleteEstimatePreview, deleteEstimateTargetIds, optimistic, projectId, queryClient, router, startDeleteEstimateTransition, store]);

  const columns = useMemo<ColumnDef<ProjectEstimateTableRow>[]>(
    () => [
      {
        id: "select_action",
        header: "",
        size: 40,
        minSize: 36,
        maxSize: 44,
        enableSorting: false,
        enableResizing: false,
        cell: ({ row }) => (
          <ProjectEstimateSelectActionCell
            canEditEstimate={canEditEstimate(row.original.id)}
            estimate={row.original}
            isSelected={selectedEstimateIds.has(row.original.id)}
            isSettling={isEstimateSettling(row.original.id)}
            onToggleSelected={toggleEstimateSelection}
          />
        ),
      },
      {
        id: "open_action",
        header: "",
        size: 48,
        minSize: 44,
        maxSize: 56,
        enableSorting: false,
        enableResizing: false,
        cell: ({ row }) => (
          <ProjectEstimateOpenActionCell
            estimate={row.original}
            isSettling={isEstimateSettling(row.original.id)}
            onPrefetchCancel={handlePrefetchCancel}
            onPrefetchStart={handlePrefetchStart}
          />
        ),
      },
      {
        id: "favorite_action",
        header: "",
        size: 34,
        minSize: 32,
        maxSize: 38,
        enableSorting: false,
        enableResizing: false,
        cell: ({ row }) => {
          const estimate = row.original;

          return (
            <ProjectEstimateFavoriteActionCell
              estimate={estimate}
              isSettling={isEstimateSettling(estimate.id)}
              store={store}
              optimistic={optimistic}
              parentProject={parentProject}
              scope={scope}
              announceCue={announceCue}
            />
          );
        },
      },
      {
        id: "duplicate_action",
        header: "",
        size: 34,
        minSize: 32,
        maxSize: 38,
        enableSorting: false,
        enableResizing: false,
        cell: ({ row }) => {
          const estimate = row.original;

          return (
            <ProjectEstimateDuplicateActionCell
              canEditEstimate={canEditEstimate(estimate.id)}
              estimate={estimate}
              isSettling={isEstimateSettling(estimate.id)}
              onDuplicateError={setDuplicateError}
              projectId={projectId}
              store={store}
              optimistic={optimistic}
            />
          );
        },
      },
      {
        accessorKey: "sheet_code",
        header: "Estimate Code",
        size: 176,
        minSize: 132,
        maxSize: 260,
        cell: ({ row }) => (
          <ProjectEstimateSheetCodeCell
            canEditEstimate={canEditEstimate(row.original.id)}
            estimate={row.original}
            projectId={projectId}
            store={store}
            optimistic={optimistic}
            isEstimateSettling={isEstimateSettling(row.original.id)}
            onEstimateEditSettlingChange={setEstimateSettling}
          />
        ),
      },
      {
        accessorKey: "name",
        header: "Estimate Name",
        size: 340,
        minSize: 220,
        maxSize: 520,
        cell: ({ row }) => (
          <ProjectEstimateEditableTextCell
            estimate={row.original}
            canEditEstimate={canEditEstimate(row.original.id)}
            field="name"
            inputClassName="font-medium tracking-normal"
            label="Estimate name"
            placeholder="Estimate Name"
            projectId={projectId}
            store={store}
            optimistic={optimistic}
            onEstimateEditSettlingChange={setEstimateSettling}
          />
        ),
      },
      {
        accessorKey: "notes",
        header: "Notes",
        size: 240,
        minSize: 172,
        maxSize: 420,
        cell: ({ row }) => (
          <ProjectEstimateEditableTextCell
            estimate={row.original}
            canEditEstimate={canEditEstimate(row.original.id)}
            field="notes"
            label="Notes"
            placeholder="Add notes"
            projectId={projectId}
            store={store}
            optimistic={optimistic}
            onEstimateEditSettlingChange={setEstimateSettling}
          />
        ),
      },
      {
        accessorKey: "project_budget",
        header: "Project Budget",
        size: 172,
        minSize: 144,
        maxSize: 240,
        cell: ({ row }) => (
          <ProjectEstimateBudgetCell
            estimate={row.original}
            canEditEstimate={canEditEstimate(row.original.id)}
            projectId={projectId}
            store={store}
            optimistic={optimistic}
            onEstimateEditSettlingChange={setEstimateSettling}
          />
        ),
      },
      {
        accessorKey: "totalProjectCost",
        header: "Ongoing Project Cost",
        size: 172,
        minSize: 144,
        maxSize: 240,
        cell: ({ row }) => <span className="font-sans font-medium tabular-nums text-ink">{formatPeso(row.original.totalProjectCost)}</span>,
      },
      {
        id: "overbudget",
        header: "Remaining Budget",
        size: 168,
        minSize: 144,
        maxSize: 240,
        accessorFn: (row) => (row.project_budget ?? 0) - row.totalProjectCost,
        cell: ({ row }) => {
          if (row.original.project_budget === null) return <span className="font-medium text-tertiary">No budget set</span>;
          const budgetVariance = row.original.project_budget - row.original.totalProjectCost;
          return (
            <span className={`font-sans font-medium tabular-nums ${getVarianceColorClass(budgetVariance)}`}>
              {formatSignedPeso(budgetVariance)}
            </span>
          );
        },
      },
      {
        accessorKey: "updated_at",
        header: "Updated",
        size: 150,
        minSize: 132,
        maxSize: 220,
        cell: ({ row }) => <span className="whitespace-nowrap font-medium text-tertiary">{formatDateTime(row.original.updated_at)}</span>,
      },
      {
        accessorKey: "created_at",
        header: "Created",
        size: 150,
        minSize: 132,
        maxSize: 220,
        cell: ({ row }) => <span className="whitespace-nowrap font-medium text-tertiary">{formatDateTime(row.original.created_at)}</span>,
      },
      {
        id: "delete_action",
        header: "",
        size: 48,
        minSize: 44,
        maxSize: 56,
        enableSorting: false,
        enableResizing: false,
        cell: ({ row }) => (
          <ProjectEstimateDeleteActionCell
            canEditEstimate={canEditEstimate(row.original.id)}
            estimate={row.original}
            isSettling={isEstimateSettling(row.original.id)}
            onDeleteRequested={(estimateId) => openDeleteEstimatePreview([estimateId])}
          />
        ),
      },
    ],
    [announceCue, canEditEstimate, handlePrefetchCancel, handlePrefetchStart, isEstimateSettling, openDeleteEstimatePreview, optimistic, parentProject, projectId, scope, selectedEstimateIds, setEstimateSettling, store, toggleEstimateSelection],
  );

  const table = useReactTable({
    data: estimates,
    columns,
    state: { sorting, columnSizing },
    columnResizeMode: "onChange",
    enableColumnResizing: true,
    getRowId: (row) => row.id,
    defaultColumn: {
      minSize: 88,
      size: 150,
      maxSize: 520,
    },
    onColumnSizingChange: setColumnSizing,
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
  });
  const visibleRows = table.getRowModel().rows;
  const fillerRowCount = Math.max(EMPTY_TABLE_ROW_COUNT - visibleRows.length, 0);
  const tableTotalSize = table.getTotalSize();
  const tableStyle = useMemo<CSSProperties>(() => ({ width: `${tableTotalSize}px`, minWidth: "100%" }), [tableTotalSize]);

  return (
    <div className="flex h-full min-h-0 flex-col border-t border-hairline">
      {duplicateError ? (
        <p className="shrink-0 border-b border-dangerSoft bg-dangerSoft/40 px-2 py-1 text-[10px] font-medium text-danger" role="alert">
          {duplicateError}
        </p>
      ) : null}
      <BulkActionToolbar
        selectedCount={selectedVisibleEstimateIds.length}
        actionLabel="Delete selected estimates"
        helperText="Preview dependencies before deleting estimates."
        onAction={() => openDeleteEstimatePreview(selectedVisibleEstimateIds)}
        onClear={() => setSelectedEstimateIds(new Set())}
        onSelectVisible={() => setSelectedEstimateIds(new Set(estimates.filter((estimate) => editableEstimateIds.has(estimate.id)).map((estimate) => estimate.id)))}
      />
      <div className="min-h-0 flex-1 overflow-auto [scrollbar-gutter:stable]">
        <table className="table-fixed border-collapse text-left text-[10px]" style={tableStyle}>
          <ProjectEstimatesColGroup table={table} />
          <thead className="sticky top-0 z-10 bg-surface-muted text-[10px] font-medium text-tertiary">
            {table.getHeaderGroups().map((headerGroup) => (
              <tr key={headerGroup.id} className="h-9 border-b border-hairline">
                {headerGroup.headers.map((header) => {
                  const canSort = header.column.getCanSort();
                  const sorted = header.column.getIsSorted();
                  return (
                    <th
                      key={header.id}
                      scope="col"
                      className="relative border-r border-hairline bg-surface-muted px-2 py-2 text-left text-[10px] font-medium last:border-r-0"
                      style={{ width: `${header.getSize()}px` }}
                    >
                      {canSort ? (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="min-h-0 justify-start gap-1 rounded-xs p-0 text-left text-[10px] font-medium text-tertiary hover:bg-transparent"
                          onClick={header.column.getToggleSortingHandler()}
                        >
                          {flexRender(header.column.columnDef.header, header.getContext())}
                          <SortIcon direction={sorted} />
                        </Button>
                      ) : (
                        flexRender(header.column.columnDef.header, header.getContext())
                      )}
                      <ProjectEstimatesColumnResizeHandle header={header} table={table} />
                    </th>
                  );
                })}
              </tr>
            ))}
          </thead>
          <tbody className="bg-white text-ink">
            {visibleRows.map((row) => (
              <tr key={row.id} className="h-8 border-b border-hairline transition hover:bg-surface-muted/60">
                {row.getVisibleCells().map((cell) => (
                  <td
                    key={cell.id}
                    className={cn(
                      "border-r border-hairline py-1 text-left align-middle last:border-r-0",
                      TIGHT_ICON_COLUMN_IDS.has(cell.column.id) ? "px-1" : "px-2",
                      READ_ONLY_HOVER_COLUMN_IDS.has(cell.column.id) && "transition-colors hover:bg-dangerSoft/30",
                    )}
                  >
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </td>
                ))}
              </tr>
            ))}
            {fillerRowCount > 0 ? (
              <ProjectEstimateFillerRows
                columnCount={table.getAllLeafColumns().length}
                rowCount={fillerRowCount}
                emptyMessage={emptyMessage}
                showEmptyMessage={visibleRows.length === 0}
                canCreateEstimates={canCreateEstimates}
                isCreatingEstimate={isCreatingEstimate}
                onCreateEstimateFromName={onCreateEstimateFromName}
              />
            ) : null}
          </tbody>
        </table>
      </div>
      <div className="flex h-6 shrink-0 items-center justify-between border-t border-hairline bg-white px-2 text-[9px] font-medium text-tertiary">
        <span>{formatCount(estimates.length, "estimate", "estimates")}</span>
        <button
          type="button"
          className="rounded-xs px-1.5 py-0.5 font-medium uppercase tracking-normal text-tertiary transition hover:bg-surface-muted hover:text-ink focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
          onClick={() => {
            // Column sizing is purely client/localStorage state — resetting it
            // must not trigger a server round-trip or the overlay (P0-5).
            table.resetColumnSizing();
          }}
        >
          Reset Column Widths
        </button>
      </div>
      <BulkDestructivePreviewModal
        open={deleteEstimateTargetIds.length > 0}
        title={deleteEstimateModalTitle}
        description="Deleting estimates removes their tree nodes, row items, and activity surface after a dependency preview."
        requiredPhrase={deleteEstimatePhrase}
        executeLabel="Delete estimates"
        loading={deleteEstimateState === "loading"}
        executing={deleteEstimateState === "executing"}
        preview={deleteEstimatePreview}
        previewError={deleteEstimateError}
        onExecute={executeDeleteEstimatePreview}
        onOpenChange={(open) => {
          if (!open && deleteEstimateState !== "executing") closeDeleteEstimatePreview();
        }}
      />
    </div>
  );
}

ProjectEstimatesTableComponent.displayName = "ProjectEstimatesTable";

export const ProjectEstimatesTable = ProjectEstimatesTableComponent;
