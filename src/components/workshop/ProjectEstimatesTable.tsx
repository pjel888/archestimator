"use client";

import Link from "next/link";
import { useNavigationRouter } from "@/hooks/use-navigation-router";
import { usePrefetchOnHover } from "@/hooks/use-prefetch-on-hover";
import { useCallback, useEffect, useId, useMemo, useRef, useState, useTransition, type KeyboardEvent } from "react";
import { ArrowSquareOut, CaretDown, CaretUp, CaretUpDown, ClockCounterClockwise, CopySimple, Trash } from "@phosphor-icons/react/dist/ssr";
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
import { Modal } from "@/components/ui/modal";
import { TreeBulkActionBar } from "@/components/workshop/tree-row-affordances";
import { deleteEstimateSheet, deleteEstimateSheetsBulk, duplicateEstimateSheet, fetchEstimateTree, regenerateEstimateSheetCode, updateEstimateDetails } from "@/lib/estimates/actions";
import { estimateQueryKeys } from "@/hooks/use-estimate-query";
import { estimateRepository } from "@/lib/repositories/estimate-repository";
import type { Tables } from "@/lib/supabase/types";
import { cn } from "@/lib/ui/cn";

export type ProjectEstimateTableRow = Tables<"estimates"> & {
  firstNodeId?: string | null;
  nodeCount: number;
  rowItemCount: number;
  totalProjectCost: number;
};

type ProjectEstimatesTableProps = {
  estimates: ProjectEstimateTableRow[];
  projectId: string;
  emptyMessage?: string;
};

type EditableEstimateTextField = "name" | "notes" | "sheetCode";

const pesoFormatter = new Intl.NumberFormat("en-PH", {
  style: "currency",
  currency: "PHP",
  minimumFractionDigits: 2,
});

const EMPTY_TABLE_ROW_COUNT = 60;
const COLUMN_WIDTH_STORAGE_KEY_PREFIX = "archestimator:project-estimates-column-widths";

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

function SortIcon({ direction }: { direction: false | "asc" | "desc" }) {
  if (direction === "asc") return <CaretUp size={10} weight="regular" aria-hidden="true" />;
  if (direction === "desc") return <CaretDown size={10} weight="regular" aria-hidden="true" />;
  return <CaretUpDown size={10} weight="regular" aria-hidden="true" />;
}

function ProjectEstimateFillerRows({
  columnCount,
  rowCount,
  emptyMessage,
  showEmptyMessage,
}: {
  columnCount: number;
  rowCount: number;
  emptyMessage: string;
  showEmptyMessage: boolean;
}) {
  return Array.from({ length: rowCount }, (_, rowIndex) => (
    <tr key={`estimate-filler-row-${rowIndex}`} className="h-8 border-b border-hairline last:border-b-0">
      {Array.from({ length: columnCount }, (_, columnIndex) => (
        <td key={`estimate-filler-cell-${rowIndex}-${columnIndex}`} className="border-r border-hairline px-2 py-1 text-left last:border-r-0">
          {showEmptyMessage && rowIndex === 0 && columnIndex === 1 ? (
            <span className="text-[10px] font-medium text-tertiary">{emptyMessage}</span>
          ) : null}
        </td>
      ))}
    </tr>
  ));
}

ProjectEstimateFillerRows.displayName = "ProjectEstimateFillerRows";

type ProjectEstimateRowActionsProps = {
  estimate: ProjectEstimateTableRow;
  isSelected: boolean;
  onDuplicateError: (message: string | null) => void;
  onDelete: (estimate: ProjectEstimateTableRow) => void;
  onPrefetchCancel: (href: string) => void;
  onPrefetchStart: (href: string) => void;
  onToggleSelected: (estimateId: string) => void;
  projectId: string;
};

function HeaderSelectAllCheckbox({
  checked,
  indeterminate,
  disabled,
  onChange,
}: {
  checked: boolean;
  indeterminate: boolean;
  disabled?: boolean;
  onChange: (checked: boolean) => void;
}) {
  const ref = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (ref.current) ref.current.indeterminate = indeterminate;
  }, [indeterminate]);

  return (
    <input
      ref={ref}
      type="checkbox"
      className="size-3 rounded-xs border-hairline accent-ink"
      aria-label="Select visible estimate sheets"
      checked={checked}
      disabled={disabled}
      onChange={(event) => onChange(event.currentTarget.checked)}
      onClick={(event) => event.stopPropagation()}
    />
  );
}

function ProjectEstimateRowActions({
  estimate,
  isSelected,
  onDuplicateError,
  onDelete,
  onPrefetchCancel,
  onPrefetchStart,
  onToggleSelected,
  projectId,
}: ProjectEstimateRowActionsProps) {
  const estimateHref = getEstimateHref(estimate);
  const router = useNavigationRouter();
  const [isDuplicating, setIsDuplicating] = useState(false);
  const duplicateInFlightRef = useRef(false);

  function handleDuplicate() {
    if (duplicateInFlightRef.current) return;

    duplicateInFlightRef.current = true;
    setIsDuplicating(true);
    onDuplicateError(null);

    void duplicateEstimateSheet({ projectId, estimateId: estimate.id })
      .then(() => router.refresh())
      .catch((error: unknown) => onDuplicateError(error instanceof Error ? error.message : "Could not duplicate estimate sheet."))
      .finally(() => {
        duplicateInFlightRef.current = false;
        setIsDuplicating(false);
      });
  }

  return (
    <div className="flex items-center gap-1">
      <input
        type="checkbox"
        className="size-3 rounded-xs border-hairline accent-ink"
        aria-label={`Select ${estimate.name}`}
        checked={isSelected}
        onChange={() => onToggleSelected(estimate.id)}
      />
      <button
        type="button"
        className="grid size-6 place-items-center rounded-xs text-tertiary transition hover:bg-surface-muted hover:text-danger focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus disabled:cursor-not-allowed disabled:opacity-40"
        aria-label={`Delete ${estimate.name}`}
        title="Delete estimate sheet"
        onClick={() => onDelete(estimate)}
      >
        <Trash size={12} weight="regular" aria-hidden="true" />
      </button>
      <button
        type="button"
        className="grid size-6 place-items-center rounded-xs text-tertiary transition hover:bg-surface-muted hover:text-ink focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus disabled:cursor-not-allowed disabled:opacity-40"
        aria-label={`Duplicate ${estimate.name}`}
        disabled={isDuplicating}
        onClick={handleDuplicate}
        title={isDuplicating ? "Duplicating estimate sheet..." : "Duplicate estimate sheet"}
      >
        <CopySimple size={12} weight="regular" aria-hidden="true" />
      </button>
      <Link
        href={estimateHref}
        prefetch={false}
        onBlur={() => onPrefetchCancel(estimateHref)}
        onFocus={() => onPrefetchStart(estimateHref)}
        onMouseEnter={() => onPrefetchStart(estimateHref)}
        onMouseLeave={() => onPrefetchCancel(estimateHref)}
        className="grid size-6 place-items-center rounded-xs text-tertiary transition hover:bg-surface-muted hover:text-ink focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
        aria-label={`Open ${estimate.name}`}
      >
        <ArrowSquareOut size={12} weight="regular" aria-hidden="true" />
      </Link>
      <button
        type="button"
        className="grid size-6 place-items-center rounded-xs text-tertiary transition hover:bg-surface-muted hover:text-ink focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus disabled:cursor-not-allowed disabled:opacity-40"
        aria-label={`View version history for ${estimate.name}`}
        title="Version history is not wired yet"
        disabled
      >
        <ClockCounterClockwise size={12} weight="regular" aria-hidden="true" />
      </button>
    </div>
  );
}

ProjectEstimateRowActions.displayName = "ProjectEstimateRowActions";

function ProjectEstimateEditableTextCell({
  className,
  estimate,
  field,
  inputClassName,
  label,
  placeholder,
  projectId,
}: {
  className?: string;
  estimate: ProjectEstimateTableRow;
  field: EditableEstimateTextField;
  inputClassName?: string;
  label: string;
  placeholder: string;
  projectId: string;
}) {
  const router = useNavigationRouter();
  const errorId = useId();
  const isRequired = field !== "notes";
  const savedValue = field === "sheetCode" ? estimate.sheet_code : field === "notes" ? (estimate.notes ?? "") : estimate.name;
  const [draft, setDraft] = useState(savedValue);
  const [status, setStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const skipNextBlurCommitRef = useRef(false);

  const commitDraft = useCallback(() => {
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
    startTransition(() => {
      void updateEstimateDetails({
        projectId,
        estimateId: estimate.id,
        ...(field === "sheetCode" ? { sheetCode: nextValue } : field === "notes" ? { notes: nextValue || null } : { name: nextValue }),
      })
        .then((updatedEstimate) => {
          setDraft(field === "sheetCode" ? updatedEstimate.sheet_code : field === "notes" ? (updatedEstimate.notes ?? "") : updatedEstimate.name);
          setStatus("saved");
          router.refresh();
        })
        .catch((error: unknown) => {
          setStatus("error");
          setErrorMessage(getErrorMessage(error));
        });
    });
  }, [draft, estimate.id, field, isRequired, label, projectId, router, savedValue]);

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
            "h-6 min-w-0 flex-1 rounded-xs border border-transparent bg-transparent px-1 !text-[10px] leading-none text-ink outline-none transition placeholder:text-tertiary hover:border-hairline focus:border-accent focus:bg-accentSoft disabled:opacity-60",
            status === "error" && "border-danger bg-dangerSoft/40",
            inputClassName,
          )}
          disabled={isPending}
          onBlur={handleBlur}
          onChange={(event) => {
            setDraft(event.currentTarget.value);
            if (status !== "idle") setStatus("idle");
            if (errorMessage) setErrorMessage(null);
          }}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          title="Edit inline. Press Enter or leave the cell to save. Press Esc to cancel."
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

function ProjectEstimateBudgetCell({ estimate, projectId }: { estimate: ProjectEstimateTableRow; projectId: string }) {
  const router = useNavigationRouter();
  const errorId = useId();
  const savedBudget = estimate.project_budget;
  const savedValue = formatBudgetInput(savedBudget);
  const [draft, setDraft] = useState(savedValue);
  const [status, setStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const skipNextBlurCommitRef = useRef(false);

  const commitDraft = useCallback(() => {
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
    startTransition(() => {
      void updateEstimateDetails({
        projectId,
        estimateId: estimate.id,
        projectBudget: nextBudget,
      })
        .then((updatedEstimate) => {
          setDraft(formatBudgetInput(updatedEstimate.project_budget));
          setStatus("saved");
          router.refresh();
        })
        .catch((error: unknown) => {
          setStatus("error");
          setErrorMessage(getErrorMessage(error));
        });
    });
  }, [draft, estimate.id, projectId, router, savedBudget, savedValue]);

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
              "h-6 min-w-0 w-full rounded-xs border border-transparent bg-transparent px-1 pl-4 text-left font-sans !text-[10px] leading-none tabular-nums text-ink outline-none transition placeholder:text-tertiary hover:border-hairline focus:border-accent focus:bg-accentSoft disabled:opacity-60",
              status === "error" && "border-danger bg-dangerSoft/40",
            )}
            disabled={isPending}
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
            title="Edit the project budget for this estimate sheet. Press Enter or leave the cell to save. Press Esc to cancel."
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

function ProjectEstimateSheetCodeCell({ estimate, projectId }: { estimate: ProjectEstimateTableRow; projectId: string }) {
  const router = useNavigationRouter();
  const [isPending, startTransition] = useTransition();
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  function handleAutoGenerate() {
    setErrorMessage(null);
    startTransition(() => {
      void regenerateEstimateSheetCode({ projectId, estimateId: estimate.id })
        .then(() => {
          router.refresh();
        })
        .catch((error: unknown) => setErrorMessage(getErrorMessage(error)));
    });
  }

  return (
    <div className="flex min-w-0 items-center gap-1">
      <ProjectEstimateEditableTextCell
        key={`estimate-sheet-code-${estimate.id}-${estimate.sheet_code}`}
        estimate={estimate}
        field="sheetCode"
        inputClassName="font-medium text-tertiary tabular-nums"
        label="Sheet code"
        placeholder="Auto Code"
        projectId={projectId}
      />
      <button
        type="button"
        aria-label={`Auto-generate sheet code for ${estimate.name}`}
        className="h-5 shrink-0 rounded-xs border border-hairline bg-white px-1.5 text-[8px] font-medium uppercase tracking-normal text-tertiary transition hover:border-accent hover:text-accent disabled:cursor-not-allowed disabled:opacity-50"
        disabled={isPending}
        onClick={handleAutoGenerate}
        title={errorMessage ?? "Auto-generate the next sheet code"}
      >
        Auto
      </button>
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

function ProjectEstimatesTableComponent({ estimates, projectId, emptyMessage = "No estimate sheets yet" }: ProjectEstimatesTableProps) {
  const router = useNavigationRouter();
  const queryClient = useQueryClient();
  const columnWidthStorageKey = `${COLUMN_WIDTH_STORAGE_KEY_PREFIX}:${projectId}`;
  const [sorting, setSorting] = useState<SortingState>([{ id: "updated_at", desc: true }]);
  const [columnSizing, setColumnSizing] = useState<ColumnSizingState>(() => readColumnSizingFromStorage(columnWidthStorageKey));
  const [selectedEstimateIds, setSelectedEstimateIds] = useState<Set<string>>(() => new Set());
  const [deleteTarget, setDeleteTarget] = useState<{ ids: string[]; names: string[]; mode: "single" | "bulk" } | null>(null);
  const [deleteConfirmationText, setDeleteConfirmationText] = useState("");
  const [deletePending, setDeletePending] = useState(false);
  const [duplicateError, setDuplicateError] = useState<string | null>(null);
  const prefetchRoutes = useMemo(
    () =>
      estimates.map((estimate) => ({
        pathname: getEstimateHref(estimate),
        queryClient,
        queries: [
          {
            queryKey: estimateQueryKeys.detail(estimate.id),
            queryFn: () => estimateRepository.getEstimateTree(estimate.id),
            staleTime: 5 * 60_000,
          },
          {
            queryKey: estimateQueryKeys.areaTree(estimate.id),
            queryFn: () => fetchEstimateTree({ projectId, estimateId: estimate.id }),
            staleTime: 5 * 60_000,
          },
        ],
      })),
    [estimates, projectId, queryClient],
  );
  const { prefetch: prefetchEstimateRoute, cancel: cancelEstimateRoute } = usePrefetchOnHover(prefetchRoutes);

  useEffect(() => {
    setColumnSizing(readColumnSizingFromStorage(columnWidthStorageKey));
  }, [columnWidthStorageKey]);

  useEffect(() => {
    writeColumnSizingToStorage(columnWidthStorageKey, columnSizing);
  }, [columnSizing, columnWidthStorageKey]);

  const toggleEstimateSelection = useCallback((estimateId: string) => {
    setSelectedEstimateIds((current) => {
      const next = new Set(current);
      if (next.has(estimateId)) next.delete(estimateId);
      else next.add(estimateId);
      return next;
    });
  }, []);

  useEffect(() => {
    const visibleEstimateIds = new Set(estimates.map((estimate) => estimate.id));
    setSelectedEstimateIds((current) => {
      const next = new Set([...current].filter((estimateId) => visibleEstimateIds.has(estimateId)));
      return next.size === current.size && [...next].every((estimateId) => current.has(estimateId)) ? current : next;
    });
  }, [estimates]);

  const selectedVisibleEstimateCount = estimates.filter((estimate) => selectedEstimateIds.has(estimate.id)).length;
  const allVisibleSelected = estimates.length > 0 && selectedVisibleEstimateCount === estimates.length;
  const someVisibleSelected = selectedVisibleEstimateCount > 0 && selectedVisibleEstimateCount < estimates.length;

  const toggleVisibleEstimateSelection = useCallback((checked: boolean) => {
    setSelectedEstimateIds((current) => {
      const next = new Set(current);
      for (const estimate of estimates) {
        if (checked) next.add(estimate.id);
        else next.delete(estimate.id);
      }
      return next;
    });
  }, [estimates]);

  const clearSelection = useCallback(() => setSelectedEstimateIds(new Set()), []);

  const openDeleteDialog = useCallback((target: ProjectEstimateTableRow | ProjectEstimateTableRow[]) => {
    const rows = Array.isArray(target) ? target : [target];
    if (rows.length === 0) return;
    setDeleteConfirmationText("");
    setDeleteTarget({
      ids: rows.map((row) => row.id),
      names: rows.map((row) => row.name),
      mode: rows.length === 1 ? "single" : "bulk",
    });
  }, []);

  const selectedEstimateRows = useMemo(
    () => estimates.filter((estimate) => selectedEstimateIds.has(estimate.id)),
    [estimates, selectedEstimateIds],
  );

  const handleConfirmDelete = useCallback(() => {
    if (!deleteTarget || deleteConfirmationText !== "DELETE ESTIMATE SHEETS" || deletePending) return;
    setDeletePending(true);
    const action = deleteTarget.mode === "single"
      ? deleteEstimateSheet(projectId, deleteTarget.ids[0]!)
      : deleteEstimateSheetsBulk(projectId, deleteTarget.ids);

    void action
      .then(() => {
        setSelectedEstimateIds((current) => {
          const next = new Set(current);
          for (const estimateId of deleteTarget.ids) next.delete(estimateId);
          return next;
        });
        void queryClient.invalidateQueries({ queryKey: ["estimate"] });
        router.refresh();
        setDeleteTarget(null);
        setDeleteConfirmationText("");
      })
      .catch((error: unknown) => setDuplicateError(error instanceof Error ? error.message : "Could not delete estimate sheets."))
      .finally(() => setDeletePending(false));
  }, [deleteConfirmationText, deletePending, deleteTarget, projectId, queryClient, router]);

  const columns = useMemo<ColumnDef<ProjectEstimateTableRow>[]>(
    () => [
      {
        id: "row_actions",
        header: () => (
          <HeaderSelectAllCheckbox
            checked={allVisibleSelected}
            indeterminate={someVisibleSelected}
            disabled={estimates.length === 0 || deletePending}
            onChange={toggleVisibleEstimateSelection}
          />
        ),
        size: 140,
        minSize: 124,
        maxSize: 160,
        enableSorting: false,
        enableResizing: false,
        cell: ({ row }) => {
          const estimate = row.original;

          return (
            <ProjectEstimateRowActions
              estimate={estimate}
              isSelected={selectedEstimateIds.has(estimate.id)}
              onDelete={openDeleteDialog}
              onDuplicateError={setDuplicateError}
              onPrefetchCancel={cancelEstimateRoute}
              onPrefetchStart={prefetchEstimateRoute}
              onToggleSelected={toggleEstimateSelection}
              projectId={projectId}
            />
          );
        },
      },
      {
        accessorKey: "sheet_code",
        header: "Sheet Code",
        size: 176,
        minSize: 132,
        maxSize: 260,
        cell: ({ row }) => <ProjectEstimateSheetCodeCell estimate={row.original} projectId={projectId} />,
      },
      {
        accessorKey: "name",
        header: "Estimate Sheet Name",
        size: 340,
        minSize: 220,
        maxSize: 520,
        cell: ({ row }) => (
          <ProjectEstimateEditableTextCell
            key={`estimate-name-${row.original.id}-${row.original.name}`}
            estimate={row.original}
            field="name"
            inputClassName="font-medium tracking-normal"
            label="Estimate sheet name"
            placeholder="Estimate Sheet Name"
            projectId={projectId}
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
            key={`estimate-notes-${row.original.id}-${row.original.notes ?? ""}`}
            estimate={row.original}
            field="notes"
            label="Notes"
            placeholder="Add notes"
            projectId={projectId}
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
            key={`estimate-budget-${row.original.id}-${row.original.project_budget ?? "none"}`}
            estimate={row.original}
            projectId={projectId}
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
    ],
    [
      allVisibleSelected,
      cancelEstimateRoute,
      deletePending,
      estimates.length,
      openDeleteDialog,
      prefetchEstimateRoute,
      projectId,
      selectedEstimateIds,
      someVisibleSelected,
      toggleEstimateSelection,
      toggleVisibleEstimateSelection,
    ],
  );

  const table = useReactTable({
    data: estimates,
    columns,
    state: { sorting, columnSizing },
    columnResizeMode: "onChange",
    enableColumnResizing: true,
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
  const tableStyle = { width: `${table.getTotalSize()}px`, minWidth: "100%" };

  return (
    <div className="flex h-full min-h-0 flex-col border-t border-hairline">
      {duplicateError ? (
        <p className="shrink-0 border-b border-dangerSoft bg-dangerSoft/40 px-2 py-1 text-[10px] font-medium text-danger" role="alert">
          {duplicateError}
        </p>
      ) : null}
      <TreeBulkActionBar
        selectedCount={selectedEstimateIds.size}
        entityLabel="estimate sheet"
        onClearSelection={clearSelection}
        onDelete={() => openDeleteDialog(selectedEstimateRows)}
        deleteDisabled={deletePending || selectedEstimateRows.length === 0}
        disabledReason={deletePending ? "Finish the current estimate sheet delete before deleting more sheets." : "Select at least one visible estimate sheet."}
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
                  <td key={cell.id} className="border-r border-hairline px-2 py-1 text-left align-middle last:border-r-0">
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </td>
                ))}
              </tr>
            ))}
            {fillerRowCount > 0 ? (
              <ProjectEstimateFillerRows columnCount={table.getAllLeafColumns().length} rowCount={fillerRowCount} emptyMessage={emptyMessage} showEmptyMessage={visibleRows.length === 0} />
            ) : null}
          </tbody>
        </table>
      </div>
      <div className="flex h-6 shrink-0 items-center justify-between border-t border-hairline bg-white px-2 text-[9px] font-medium text-tertiary">
        <span>{formatCount(estimates.length, "estimate sheet", "estimate sheets")}</span>
        <button
          type="button"
          className="rounded-xs px-1.5 py-0.5 font-medium uppercase tracking-normal text-tertiary transition hover:bg-surface-muted hover:text-ink focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
          onClick={() => {
            table.resetColumnSizing();
            router.refresh();
          }}
        >
          Reset Column Widths
        </button>
      </div>
      <Modal
        open={Boolean(deleteTarget)}
        title={deleteTarget?.mode === "single" ? "Delete estimate sheet" : `Delete ${deleteTarget?.ids.length ?? 0} estimate sheets`}
        description="Type DELETE ESTIMATE SHEETS to confirm this destructive action."
        onOpenChange={(open) => {
          if (!open && !deletePending) {
            setDeleteTarget(null);
            setDeleteConfirmationText("");
          }
        }}
        closeLabel="Cancel estimate sheet delete"
        className="max-w-sm"
      >
        <div className="space-y-3">
          <p className="text-[10px] leading-4 text-tertiary">
            {deleteTarget?.mode === "single"
              ? `This deletes ${deleteTarget.names[0] ?? "the selected estimate sheet"} and its estimate tree rows.`
              : `This deletes ${deleteTarget?.ids.length ?? 0} selected estimate sheets and their estimate tree rows.`}
          </p>
          <label className="block space-y-1 text-[10px] font-medium leading-4 text-ink">
            <span>Confirmation text</span>
            <input
              className="h-8 w-full rounded-xs border border-hairline px-2 text-[10px] font-medium text-ink outline-none focus:border-accent focus:ring-2 focus:ring-focus/25"
              value={deleteConfirmationText}
              onChange={(event) => setDeleteConfirmationText(event.currentTarget.value)}
              placeholder="DELETE ESTIMATE SHEETS"
              aria-label="Estimate sheet delete confirmation"
            />
          </label>
          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="secondary"
              size="sm"
              disabled={deletePending}
              onClick={() => {
                setDeleteTarget(null);
                setDeleteConfirmationText("");
              }}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="danger"
              size="sm"
              disabled={deletePending || deleteConfirmationText !== "DELETE ESTIMATE SHEETS"}
              onClick={handleConfirmDelete}
            >
              Delete
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

ProjectEstimatesTableComponent.displayName = "ProjectEstimatesTable";

export const ProjectEstimatesTable = ProjectEstimatesTableComponent;
