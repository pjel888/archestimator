"use client";

import { useNavigationRouter } from "@/hooks/use-navigation-router";
import { usePrefetchOnHover } from "@/hooks/use-prefetch-on-hover";
import { useCallback, useEffect, useMemo, useReducer, useRef, useState, useTransition, type CSSProperties, type KeyboardEvent } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useVirtualizer } from "@tanstack/react-virtual";
import {
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  useReactTable,
  type ColumnDef,
  type ColumnSizingState,
  type SortingState,
  type Updater,
} from "@tanstack/react-table";

import { Button } from "@/components/ui/button";
import { BulkActionToolbar } from "@/components/workshop/BulkActionToolbar";
import { BulkDestructivePreviewModal } from "@/components/workshop/BulkDestructivePreviewModal";
import type { EstimateFavoriteParentProject, EstimateFavoriteScope } from "@/components/workshop/ProjectEstimateFavoriteButton";
import { ProjectEstimateBudgetCell } from "@/components/workshop/project-estimates-table/ProjectEstimateBudgetCell";
import { ProjectEstimateDeleteActionCell } from "@/components/workshop/project-estimates-table/ProjectEstimateDeleteActionCell";
import { ProjectEstimateDuplicateActionCell } from "@/components/workshop/project-estimates-table/ProjectEstimateDuplicateActionCell";
import { ProjectEstimateEditableTextCell } from "@/components/workshop/project-estimates-table/ProjectEstimateEditableTextCell";
import { ProjectEstimateFavoriteActionCell } from "@/components/workshop/project-estimates-table/ProjectEstimateFavoriteActionCell";
import { ProjectEstimateOpenActionCell } from "@/components/workshop/project-estimates-table/ProjectEstimateOpenActionCell";
import { ProjectEstimateSelectActionCell } from "@/components/workshop/project-estimates-table/ProjectEstimateSelectActionCell";
import { ProjectEstimateSheetCodeCell } from "@/components/workshop/project-estimates-table/ProjectEstimateSheetCodeCell";
import { ProjectEstimatesColGroup } from "@/components/workshop/project-estimates-table/ProjectEstimatesColGroup";
import { ProjectEstimatesColumnResizeHandle } from "@/components/workshop/project-estimates-table/ProjectEstimatesColumnResizeHandle";
import { SortIcon } from "@/components/workshop/project-estimates-table/SortIcon";
import type { ProjectEstimateTableRow } from "@/components/workshop/project-estimates-table/types";
import { getEstimateHref } from "@/components/workshop/project-estimates-table/utils";
import { executeBulkDeleteEstimateSheets, previewBulkDeleteEstimateSheets } from "@/lib/estimates/actions";
import { estimateQueryKeys } from "@/hooks/use-estimate-query";
import { createBulkActionCorrelationId, type BulkActionPreviewResult } from "@/lib/mass-deletion/bulk-action";
import type { ProjectEstimatesStore } from "@/stores/project-estimates-store";
import { cn } from "@/lib/ui/cn";
import { filterMapBy } from "@/lib/util/array";

export type { ProjectEstimateTableRow } from "@/components/workshop/project-estimates-table/types";

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

const pesoFormatter = new Intl.NumberFormat("en-PH", {
  style: "currency",
  currency: "PHP",
  minimumFractionDigits: 2,
});
const estimateDateTimeFormatter = new Intl.DateTimeFormat("en", {
  month: "numeric",
  day: "numeric",
  year: "2-digit",
  hour: "numeric",
  minute: "2-digit",
});

const EMPTY_TABLE_ROW_COUNT = 60;
// Row-windowing activation matches the estimate-sheet row table's contract
// (WORKSHOP_ESTIMATE_ROW_VIRTUALIZATION): off below the threshold so small/empty
// tables render every row (and keep the filler + blank-name-create rows, which
// only exist while visibleRows.length < EMPTY_TABLE_ROW_COUNT = 60), on above it
// so large lists only mount the visible window. The threshold sits above 60, so
// virtualization and filler rows are mutually exclusive by construction.
const LIST_ROW_VIRTUALIZATION_MIN_ROWS = 75;
const LIST_ROW_VIRTUALIZATION_ESTIMATED_HEIGHT = 32;
const LIST_ROW_VIRTUALIZATION_OVERSCAN = 12;
const LIST_ROW_VIRTUALIZATION_INITIAL_VIEWPORT_HEIGHT = 720;
const COLUMN_WIDTH_STORAGE_KEY_PREFIX = "archestimator:project-estimates-column-widths";
const READ_ONLY_HOVER_COLUMN_IDS = new Set(["totalProjectCost", "overbudget", "updated_at", "created_at"]);
const TIGHT_ICON_COLUMN_IDS = new Set(["favorite_action", "duplicate_action"]);
const ESTIMATE_NAME_COLUMN_INDEX = 5;

type ScopedColumnSizingState = {
  storageKey: string;
  value: ColumnSizingState;
};

type ProjectEstimatesTableState = {
  sorting: SortingState;
  columnSizingState: ScopedColumnSizingState;
  selectedEstimateIds: Set<string>;
  duplicateError: string | null;
  deleteEstimateTargetIds: string[];
  deleteEstimatePreview: BulkActionPreviewResult | null;
  deleteEstimateError: string | null;
  deleteEstimateState: "idle" | "loading" | "ready" | "executing";
  settlingVersion: number;
};

type ProjectEstimatesTableAction =
  | { type: "sortingChanged"; updater: Updater<SortingState> }
  | { type: "columnSizingChanged"; storageKey: string; updater: Updater<ColumnSizingState> }
  | { type: "selectedEstimateToggled"; estimateId: string }
  | { type: "selectedEstimatesChanged"; estimateIds: Set<string> }
  | { type: "selectedEstimatesRemoved"; estimateIds: string[] }
  | { type: "duplicateErrorChanged"; error: string | null }
  | { type: "deletePreviewOpened"; estimateIds: string[] }
  | { type: "deletePreviewLoaded"; preview: BulkActionPreviewResult }
  | { type: "deletePreviewLoadFailed"; error: string }
  | { type: "deletePreviewClosed" }
  | { type: "deleteExecutionStarted" }
  | { type: "deleteExecutionBlocked"; issues: BulkActionPreviewResult["issues"]; blocked?: BulkActionPreviewResult["blocked"]; error: string }
  | { type: "deleteExecutionFailed"; error: string }
  | { type: "settlingVersionBumped" };

function createInitialProjectEstimatesTableState(columnWidthStorageKey: string): ProjectEstimatesTableState {
  return {
    sorting: [{ id: "updated_at", desc: true }],
    columnSizingState: {
      storageKey: columnWidthStorageKey,
      value: readColumnSizingFromStorage(columnWidthStorageKey),
    },
    selectedEstimateIds: new Set(),
    duplicateError: null,
    deleteEstimateTargetIds: [],
    deleteEstimatePreview: null,
    deleteEstimateError: null,
    deleteEstimateState: "idle",
    settlingVersion: 0,
  };
}

function projectEstimatesTableReducer(
  state: ProjectEstimatesTableState,
  action: ProjectEstimatesTableAction,
): ProjectEstimatesTableState {
  switch (action.type) {
    case "sortingChanged":
      return {
        ...state,
        sorting: resolveStateUpdater(action.updater, state.sorting),
      };
    case "columnSizingChanged": {
      const currentValue = state.columnSizingState.storageKey === action.storageKey
        ? state.columnSizingState.value
        : readColumnSizingFromStorage(action.storageKey);
      return {
        ...state,
        columnSizingState: {
          storageKey: action.storageKey,
          value: resolveColumnSizingUpdate(action.updater, currentValue),
        },
      };
    }
    case "selectedEstimateToggled": {
      const selectedEstimateIds = new Set(state.selectedEstimateIds);
      if (selectedEstimateIds.has(action.estimateId)) selectedEstimateIds.delete(action.estimateId);
      else selectedEstimateIds.add(action.estimateId);
      return {
        ...state,
        selectedEstimateIds,
      };
    }
    case "selectedEstimatesChanged":
      return {
        ...state,
        selectedEstimateIds: action.estimateIds,
      };
    case "selectedEstimatesRemoved": {
      const selectedEstimateIds = new Set(state.selectedEstimateIds);
      for (const id of action.estimateIds) selectedEstimateIds.delete(id);
      return {
        ...state,
        selectedEstimateIds,
      };
    }
    case "duplicateErrorChanged":
      return {
        ...state,
        duplicateError: action.error,
      };
    case "deletePreviewOpened":
      return {
        ...state,
        deleteEstimateTargetIds: action.estimateIds,
        deleteEstimatePreview: null,
        deleteEstimateError: null,
        deleteEstimateState: "loading",
      };
    case "deletePreviewLoaded":
      return {
        ...state,
        deleteEstimatePreview: action.preview,
        deleteEstimateState: "ready",
      };
    case "deletePreviewLoadFailed":
      return {
        ...state,
        deleteEstimateError: action.error,
        deleteEstimateState: "ready",
      };
    case "deletePreviewClosed":
      return {
        ...state,
        deleteEstimateTargetIds: [],
        deleteEstimatePreview: null,
        deleteEstimateError: null,
        deleteEstimateState: "idle",
      };
    case "deleteExecutionStarted":
      return {
        ...state,
        deleteEstimateState: "executing",
      };
    case "deleteExecutionBlocked":
      return {
        ...state,
        deleteEstimatePreview: state.deleteEstimatePreview
          ? {
              ...state.deleteEstimatePreview,
              issues: action.issues,
              blocked: action.blocked ?? state.deleteEstimatePreview.blocked,
              ok: false,
            }
          : state.deleteEstimatePreview,
        deleteEstimateError: action.error,
        deleteEstimateState: "ready",
      };
    case "deleteExecutionFailed":
      return {
        ...state,
        deleteEstimateError: action.error,
        deleteEstimateState: "ready",
      };
    case "settlingVersionBumped":
      return {
        ...state,
        settlingVersion: state.settlingVersion + 1,
      };
    default:
      return state;
  }
}

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

function resolveStateUpdater<T>(updater: Updater<T>, current: T): T {
  return typeof updater === "function" ? (updater as (old: T) => T)(current) : updater;
}

function resolveColumnSizingUpdate(updater: Updater<ColumnSizingState>, current: ColumnSizingState): ColumnSizingState {
  return typeof updater === "function" ? updater(current) : updater;
}

function formatPeso(value: number) {
  return pesoFormatter.format(value).replace("₱", "₱ ");
}

function formatSignedPeso(value: number) {
  const sign = value >= 0 ? "+" : "-";
  return `${sign}${formatPeso(Math.abs(value))}`;
}

function getVarianceColorClass(value: number) {
  return value >= 0 ? "text-success" : "text-danger";
}

function formatDateTime(value: string) {
  return estimateDateTimeFormatter.format(new Date(value));
}

function formatCount(value: number, singular: string, plural: string) {
  return `${value} ${value === 1 ? singular : plural}`;
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
      className="h-6 min-w-0 w-full rounded-xs border border-transparent bg-transparent px-1 !text-[10px] font-medium leading-none text-ink outline-none transition placeholder:text-tertiary focus:bg-accentSoft disabled:opacity-60"
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

// react-doctor-disable-next-line react-doctor/no-giant-component -- Structural split tracked in .ai/03_plans/2026-06-23-react-doctor-warning-cleanup.md; broad refactor needs behavior tests.
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
  const [tableState, dispatchTable] = useReducer(
    projectEstimatesTableReducer,
    columnWidthStorageKey,
    createInitialProjectEstimatesTableState,
  );
  const {
    sorting,
    columnSizingState,
    selectedEstimateIds,
    duplicateError,
    deleteEstimateTargetIds,
    deleteEstimatePreview,
    deleteEstimateError,
    deleteEstimateState,
  } = tableState;
  const columnSizing = useMemo(
    () => columnSizingState.storageKey === columnWidthStorageKey ? columnSizingState.value : readColumnSizingFromStorage(columnWidthStorageKey),
    [columnSizingState, columnWidthStorageKey],
  );
  const setColumnSizing = useCallback((updater: Updater<ColumnSizingState>) => {
    dispatchTable({ type: "columnSizingChanged", storageKey: columnWidthStorageKey, updater });
  }, [columnWidthStorageKey]);
  const columnSizingRef = useRef(columnSizing);
  const deleteExecutionInFlightRef = useRef(false);
  const estimatesRef = useRef(estimates);
  const settlingEstimateCountsRef = useRef<Map<string, number>>(null!);
  if (settlingEstimateCountsRef.current === null) settlingEstimateCountsRef.current = new Map();
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
    () =>
      new Set(
        filterMapBy(
          estimates,
          (estimate) => (canEditEstimateById ? canEditEstimateById[estimate.id] === true : true),
          (estimate) => estimate.id,
        ),
      ),
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
    dispatchTable({ type: "settlingVersionBumped" });
  }, []);

  useEffect(() => {
    columnSizingRef.current = columnSizing;
  }, [columnSizing]);
  const flushColumnSizingToStorage = useCallback(() => {
    writeColumnSizingToStorage(columnWidthStorageKey, columnSizingRef.current);
  }, [columnWidthStorageKey]);

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      writeColumnSizingToStorage(columnWidthStorageKey, columnSizing);
    }, 120);

    return () => window.clearTimeout(timeout);
  }, [columnSizing, columnWidthStorageKey]);

  useEffect(() => {
    return flushColumnSizingToStorage;
  }, [flushColumnSizingToStorage]);

  const toggleEstimateSelection = useCallback((estimateId: string) => {
    dispatchTable({ type: "selectedEstimateToggled", estimateId });
  }, []);

  const selectedVisibleEstimateIds = useMemo(
    () =>
      filterMapBy(
        estimates,
        (estimate) => editableEstimateIds.has(estimate.id) && selectedEstimateIds.has(estimate.id),
        (estimate) => estimate.id,
      ),
    [editableEstimateIds, estimates, selectedEstimateIds],
  );
  const selectedVisibleEstimateIdSet = useMemo(() => new Set(selectedVisibleEstimateIds), [selectedVisibleEstimateIds]);
  const deleteEstimatePhrase = deleteEstimateTargetIds.length === 1 ? "DELETE ESTIMATE" : `DELETE ${deleteEstimateTargetIds.length} ESTIMATES`;
  const deleteEstimateModalTitle = deleteEstimateTargetIds.length === 1 ? "Delete estimate" : `Delete ${deleteEstimateTargetIds.length} estimates`;

  const openDeleteEstimatePreview = useCallback((estimateIds: string[]) => {
    const uniqueEstimateIds = Array.from(new Set(estimateIds)).filter((id) => estimatesRef.current.some((estimate) => estimate.id === id));
    if (uniqueEstimateIds.length === 0) return;
    dispatchTable({ type: "deletePreviewOpened", estimateIds: uniqueEstimateIds });
    startDeleteEstimateTransition(() => {
      void previewBulkDeleteEstimateSheets({ projectId, estimateIds: uniqueEstimateIds })
        .then((preview) => {
          dispatchTable({ type: "deletePreviewLoaded", preview });
        })
        .catch((error: unknown) => {
          dispatchTable({
            type: "deletePreviewLoadFailed",
            error: error instanceof Error ? error.message : "Could not load delete preview.",
          });
        });
    });
  }, [projectId, startDeleteEstimateTransition]);

  const closeDeleteEstimatePreview = useCallback(() => {
    dispatchTable({ type: "deletePreviewClosed" });
  }, []);

  const executeDeleteEstimatePreview = useCallback(() => {
    if (!deleteEstimatePreview?.previewHash || deleteExecutionInFlightRef.current) return;
    const previewHash = deleteEstimatePreview.previewHash;
    const targetIds = deleteEstimateTargetIds;
    deleteExecutionInFlightRef.current = true;
    dispatchTable({ type: "deleteExecutionStarted" });
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
            dispatchTable({
              type: "deleteExecutionBlocked",
              issues: result.issues,
              blocked: result.blocked,
              error: result.issues[0]?.message ?? "Could not delete estimates.",
            });
            return;
          }
          const removedIds = result.deletedIds?.length ? result.deletedIds : targetIds;
          dispatchTable({ type: "selectedEstimatesRemoved", estimateIds: removedIds });
          for (const id of removedIds) {
            queryClient.removeQueries({ queryKey: estimateQueryKeys.detail(id) });
            queryClient.removeQueries({ queryKey: estimateQueryKeys.areaTree(id) });
          }
          closeDeleteEstimatePreview();
          if (!optimistic) router.refresh();
        })
        .catch((error: unknown) => {
          rollback?.();
          dispatchTable({
            type: "deleteExecutionFailed",
            error: error instanceof Error ? error.message : "Could not delete estimates.",
          });
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
            isSelected={selectedVisibleEstimateIdSet.has(row.original.id)}
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
              onDuplicateError={(error) => dispatchTable({ type: "duplicateErrorChanged", error })}
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
    [announceCue, canEditEstimate, handlePrefetchCancel, handlePrefetchStart, isEstimateSettling, openDeleteEstimatePreview, optimistic, parentProject, projectId, scope, selectedVisibleEstimateIdSet, setEstimateSettling, store, toggleEstimateSelection],
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
    onSortingChange: (updater) => dispatchTable({ type: "sortingChanged", updater }),
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
  });
  const visibleRows = table.getRowModel().rows;
  const fillerRowCount = Math.max(EMPTY_TABLE_ROW_COUNT - visibleRows.length, 0);
  const tableTotalSize = table.getTotalSize();
  const tableStyle = useMemo<CSSProperties>(() => ({ width: `${tableTotalSize}px`, minWidth: "100%" }), [tableTotalSize]);
  const leafColumnCount = table.getAllLeafColumns().length;

  // Row windowing. The scroll viewport is the existing overflow-auto wrapper
  // below, so the virtualizer uses it directly (no scroll-parent walk). Above
  // the threshold only the in-view window of `<tr>`s mounts, bracketed by two
  // spacer rows that reserve the off-screen height. Spacer rows keep every
  // mounted row a normal table-fixed row that still obeys the <colgroup>, so
  // column alignment, the sticky header, and column resizing are unchanged.
  const scrollContainerRef = useRef<HTMLDivElement | null>(null);
  const virtualEnabled = visibleRows.length >= LIST_ROW_VIRTUALIZATION_MIN_ROWS;
  const rowVirtualizer = useVirtualizer({
    count: visibleRows.length,
    getScrollElement: () => scrollContainerRef.current,
    estimateSize: () => LIST_ROW_VIRTUALIZATION_ESTIMATED_HEIGHT,
    overscan: LIST_ROW_VIRTUALIZATION_OVERSCAN,
    getItemKey: (index) => visibleRows[index]?.id ?? index,
    enabled: virtualEnabled,
    initialRect: { height: LIST_ROW_VIRTUALIZATION_INITIAL_VIEWPORT_HEIGHT, width: 0 },
  });

  const measuredVirtualRows = rowVirtualizer.getVirtualItems();
  // Before the virtualizer has measured the viewport (first paint / non-DOM
  // render), fall back to a deterministic initial window so the table is never
  // blank and SSR/test renders still mount real rows.
  const virtualRows = virtualEnabled && measuredVirtualRows.length === 0
    ? Array.from(
        {
          length: Math.min(
            visibleRows.length,
            Math.ceil(LIST_ROW_VIRTUALIZATION_INITIAL_VIEWPORT_HEIGHT / LIST_ROW_VIRTUALIZATION_ESTIMATED_HEIGHT) +
              LIST_ROW_VIRTUALIZATION_OVERSCAN * 2,
          ),
        },
        (_, index) => ({ index, key: visibleRows[index]?.id ?? index, start: index * LIST_ROW_VIRTUALIZATION_ESTIMATED_HEIGHT, size: LIST_ROW_VIRTUALIZATION_ESTIMATED_HEIGHT }),
      )
    : measuredVirtualRows;
  const virtualTotalSize = rowVirtualizer.getTotalSize();
  const firstVirtualRow = virtualRows[0];
  const lastVirtualRow = virtualRows[virtualRows.length - 1];
  const topSpacerHeight = firstVirtualRow ? firstVirtualRow.start : 0;
  const bottomSpacerHeight = lastVirtualRow ? Math.max(virtualTotalSize - (lastVirtualRow.start + lastVirtualRow.size), 0) : 0;

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
        onClear={() => dispatchTable({ type: "selectedEstimatesChanged", estimateIds: new Set() })}
        onSelectVisible={() =>
          dispatchTable({
            type: "selectedEstimatesChanged",
            estimateIds: new Set(
              filterMapBy(
                estimates,
                (estimate) => editableEstimateIds.has(estimate.id),
                (estimate) => estimate.id,
              ),
            ),
          })
        }
      />
      <div ref={scrollContainerRef} className="min-h-0 flex-1 overflow-auto [scrollbar-gutter:stable]">
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
          <tbody data-virtualized={virtualEnabled ? "true" : undefined} className="bg-white text-ink">
            {virtualEnabled ? (
              <>
                {topSpacerHeight > 0 ? (
                  <>
                    {/* react-doctor-disable-next-line react-doctor/no-aria-hidden-on-focusable -- Virtualization spacer row is not user-operable content. */}
                    <tr aria-hidden="true" className="border-0">
                      {/* react-doctor-disable-next-line react-doctor/control-has-associated-label -- Virtualization spacer cell is hidden from assistive tech. */}
                      <td colSpan={leafColumnCount} className="p-0" style={{ height: `${topSpacerHeight}px` }} />
                    </tr>
                  </>
                ) : null}
                {virtualRows.map((virtualRow) => {
                  const row = visibleRows[virtualRow.index];
                  if (!row) return null;
                  return (
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
                  );
                })}
                {bottomSpacerHeight > 0 ? (
                  <>
                    {/* react-doctor-disable-next-line react-doctor/no-aria-hidden-on-focusable -- Virtualization spacer row is not user-operable content. */}
                    <tr aria-hidden="true" className="border-0">
                      {/* react-doctor-disable-next-line react-doctor/control-has-associated-label -- Virtualization spacer cell is hidden from assistive tech. */}
                      <td colSpan={leafColumnCount} className="p-0" style={{ height: `${bottomSpacerHeight}px` }} />
                    </tr>
                  </>
                ) : null}
              </>
            ) : (
              visibleRows.map((row) => (
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
              ))
            )}
            {fillerRowCount > 0 ? (
              <ProjectEstimateFillerRows
                columnCount={table.getAllLeafColumns().length}
                rowCount={fillerRowCount}
                emptyMessage={emptyMessage}
                showEmptyMessage={false}
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
