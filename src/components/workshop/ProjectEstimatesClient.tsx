"use client";

import { useEffect, useMemo, useReducer, useRef, useState } from "react";
import { useStore } from "zustand";
import { useNavigationRouter } from "@/hooks/use-navigation-router";
import {
  CalendarBlank,
  ClockCounterClockwise,
  FunnelSimple,
  NewspaperClipping,
  SortAscending,
  SortDescending,
  Star,
  TextAa,
} from "@phosphor-icons/react/dist/ssr";

import { Button } from "@/components/ui/button";
import { DropdownSelect, type DropdownSelectOption } from "@/components/ui/dropdown-select";
import { ADD_BUTTON_CLASSNAME } from "@/components/ui/toolbar-icon-button";
import { TreePanelHeader } from "@/components/ui/tree-panel-header";
import { ProjectEstimatesTable, type ProjectEstimateTableRow } from "@/components/workshop/ProjectEstimatesTable";
import type { EstimateFavoriteParentProject, EstimateFavoriteScope } from "@/components/workshop/ProjectEstimateFavoriteButton";
import { createEstimateSheetDraft } from "@/lib/estimates/actions";
import type { ProjectEstimateListRow } from "@/lib/estimates/project-estimate-list-row";
import { createProjectEstimatesStore } from "@/stores/project-estimates-store";

// P0 cutover gate (D10). true = optimistic store path (no overlay, instant CRUD).
// Flip to false — or revert the P0 commits — to restore the legacy server-prop +
// router.refresh path without touching the P1/P2 database work. Temporary backout
// aid, removed after P0 browser QA; not a permanent product feature flag.
const OPTIMISTIC_ESTIMATE_LIST_ENABLED = true;

const ESTIMATE_TOOLBAR_SELECT_TRIGGER_CLASS =
  "h-7 w-auto gap-1.5 border-0 border-transparent bg-transparent px-1.5 text-[10px] hover:border-transparent hover:bg-surfaceMuted focus-visible:border-transparent focus-visible:ring-2 focus-visible:ring-focus";

const GENERATED_ESTIMATE_CODE_PREFIX = "ES";

const ESTIMATE_FILTER_OPTIONS = [
  { value: "all", label: "All estimates", icon: <FunnelSimple size={12} weight="regular" aria-hidden="true" /> },
  { value: "favorites", label: "Favorites", icon: <Star size={12} weight="regular" aria-hidden="true" /> },
  { value: "recent", label: "Recent", icon: <ClockCounterClockwise size={12} weight="regular" aria-hidden="true" /> },
] as const satisfies readonly DropdownSelectOption[];

type EstimateFilter = (typeof ESTIMATE_FILTER_OPTIONS)[number]["value"];

const ESTIMATE_SORT_FIELD_OPTIONS = [
  { value: "updated_at", label: "Last updated", icon: <ClockCounterClockwise size={12} weight="regular" aria-hidden="true" /> },
  { value: "created_at", label: "Date created", icon: <CalendarBlank size={12} weight="regular" aria-hidden="true" /> },
  { value: "name", label: "Estimate name", icon: <TextAa size={12} weight="regular" aria-hidden="true" /> },
] as const satisfies readonly DropdownSelectOption[];

type EstimateSortField = (typeof ESTIMATE_SORT_FIELD_OPTIONS)[number]["value"];

type EstimateSortDirection = "asc" | "desc";

const ESTIMATE_RECENT_WINDOW_MS = 30 * 24 * 60 * 60 * 1000;

const estimateNameCollator = new Intl.Collator("en", { numeric: true, sensitivity: "base" });

function isEstimateFilter(value: string): value is EstimateFilter {
  return ESTIMATE_FILTER_OPTIONS.some((option) => option.value === value);
}

function isEstimateSortField(value: string): value is EstimateSortField {
  return ESTIMATE_SORT_FIELD_OPTIONS.some((option) => option.value === value);
}

function isEstimateSortDirection(value: string): value is EstimateSortDirection {
  return value === "asc" || value === "desc";
}

type ProjectEstimatesClientProps = {
  canCreateEstimates: boolean;
  canEditEstimateById: Record<string, boolean>;
  estimates: ProjectEstimateTableRow[];
  projectId: string;
  projectName: string;
  parentProject?: EstimateFavoriteParentProject;
  scope?: EstimateFavoriteScope;
};

type ProjectEstimatesUiState = {
  searchQuery: string;
  isCreating: boolean;
  createError: string | null;
  filter: EstimateFilter;
  sortField: EstimateSortField;
  sortDirection: EstimateSortDirection;
};

type ProjectEstimatesUiAction =
  | { type: "search"; value: string }
  | { type: "create:start" }
  | { type: "create:error"; message: string }
  | { type: "create:finish" }
  | { type: "filter"; filter: EstimateFilter }
  | { type: "sortField"; sortField: EstimateSortField }
  | { type: "sortDirection"; sortDirection: EstimateSortDirection };

const INITIAL_PROJECT_ESTIMATES_UI_STATE: ProjectEstimatesUiState = {
  searchQuery: "",
  isCreating: false,
  createError: null,
  filter: "all",
  sortField: "updated_at",
  sortDirection: "desc",
};

function projectEstimatesUiReducer(
  state: ProjectEstimatesUiState,
  action: ProjectEstimatesUiAction,
): ProjectEstimatesUiState {
  switch (action.type) {
    case "search":
      return { ...state, searchQuery: action.value };
    case "create:start":
      return { ...state, isCreating: true, createError: null };
    case "create:error":
      return { ...state, createError: action.message };
    case "create:finish":
      return { ...state, isCreating: false };
    case "filter":
      return { ...state, filter: action.filter };
    case "sortField":
      return {
        ...state,
        sortField: action.sortField,
        sortDirection: defaultSortDirectionForEstimateField(action.sortField),
      };
    case "sortDirection":
      return { ...state, sortDirection: action.sortDirection };
    default:
      return state;
  }
}

function getEstimateSortDirectionLabel(field: EstimateSortField, direction: EstimateSortDirection) {
  if (field === "name") return direction === "asc" ? "A to Z" : "Z to A";
  return direction === "asc" ? "Oldest first" : "Newest first";
}

function getEstimateSortDirectionOptions(field: EstimateSortField): DropdownSelectOption[] {
  return [
    {
      value: "desc",
      label: getEstimateSortDirectionLabel(field, "desc"),
      icon: <SortDescending size={12} weight="regular" aria-hidden="true" />,
    },
    {
      value: "asc",
      label: getEstimateSortDirectionLabel(field, "asc"),
      icon: <SortAscending size={12} weight="regular" aria-hidden="true" />,
    },
  ];
}

function defaultSortDirectionForEstimateField(field: EstimateSortField): EstimateSortDirection {
  return field === "name" ? "asc" : "desc";
}

function getEstimateTimestamp(value: string) {
  const timestamp = Date.parse(value);
  return Number.isFinite(timestamp) ? timestamp : null;
}

function matchesEstimateFilter(estimate: ProjectEstimateTableRow, filter: EstimateFilter, now: number) {
  if (filter === "all") return true;
  if (filter === "favorites") return estimate.isFavorite;

  const updatedAt = getEstimateTimestamp(estimate.updated_at);
  return updatedAt !== null && updatedAt >= now - ESTIMATE_RECENT_WINDOW_MS;
}

function matchesEstimateSearch(estimate: ProjectEstimateTableRow, query: string) {
  const normalizedQuery = query.trim().toLocaleLowerCase();
  if (!normalizedQuery) return true;

  const searchable = [estimate.sheet_code, estimate.name].join(" ").toLocaleLowerCase();
  return searchable.includes(normalizedQuery);
}

function getEstimateSortValue(estimate: ProjectEstimateTableRow, field: EstimateSortField) {
  if (field === "name") return estimate.name.trim() || estimate.sheet_code;
  return getEstimateTimestamp(estimate[field]);
}

function compareEstimatesByName(a: ProjectEstimateTableRow, b: ProjectEstimateTableRow) {
  return estimateNameCollator.compare(a.name, b.name)
    || estimateNameCollator.compare(a.sheet_code, b.sheet_code)
    || estimateNameCollator.compare(a.id, b.id);
}

function compareEstimateSheets(
  a: ProjectEstimateTableRow,
  b: ProjectEstimateTableRow,
  field: EstimateSortField,
  direction: EstimateSortDirection,
) {
  const aValue = getEstimateSortValue(a, field);
  const bValue = getEstimateSortValue(b, field);
  if (aValue === null && bValue === null) return compareEstimatesByName(a, b);
  if (aValue === null) return 1;
  if (bValue === null) return -1;

  const order = direction === "asc" ? 1 : -1;
  const primary = typeof aValue === "number" && typeof bValue === "number"
    ? aValue - bValue
    : estimateNameCollator.compare(String(aValue), String(bValue));
  if (primary !== 0) return primary * order;
  return compareEstimatesByName(a, b);
}

function projectEstimateToolbarRows(
  estimates: ProjectEstimateTableRow[],
  query: string,
  filter: EstimateFilter,
  sortField: EstimateSortField,
  sortDirection: EstimateSortDirection,
) {
  const now = Date.now();
  return estimates
    .filter((estimate) => matchesEstimateFilter(estimate, filter, now) && matchesEstimateSearch(estimate, query))
    .toSorted((a, b) => compareEstimateSheets(a, b, sortField, sortDirection));
}

function getNextOptimisticEstimateSheetCode(estimates: ProjectEstimateTableRow[]) {
  const generatedCodePattern = new RegExp(`^${GENERATED_ESTIMATE_CODE_PREFIX}-(\\d+)$`, "i");
  const nextNumber = estimates.reduce((highest, estimate) => {
    const match = estimate.sheet_code.trim().match(generatedCodePattern);
    if (!match) return highest;
    const parsed = Number(match[1]);
    return Number.isFinite(parsed) ? Math.max(highest, parsed) : highest;
  }, 0) + 1;

  return `${GENERATED_ESTIMATE_CODE_PREFIX}-${String(nextNumber).padStart(3, "0")}`;
}

export function ProjectEstimatesClient({ canCreateEstimates, canEditEstimateById, estimates, projectId, projectName, parentProject, scope }: ProjectEstimatesClientProps) {
  const router = useNavigationRouter();
  const [uiState, dispatchUi] = useReducer(projectEstimatesUiReducer, INITIAL_PROJECT_ESTIMATES_UI_STATE);
  const { searchQuery, isCreating, createError, filter, sortField, sortDirection } = uiState;
  const createInFlightRef = useRef(false);

  // Per-mount client store seeded from the server prop. Created once via the
  // lazy initializer so it resets on project change but survives re-renders.
  const [store] = useState(() => createProjectEstimatesStore(estimates));

  // Reseed settled rows when the server prop changes (external refresh, cross-tab
  // update, navigation). Pending optimistic rows are preserved by the store.
  useEffect(() => {
    if (!OPTIMISTIC_ESTIMATE_LIST_ENABLED) return;
    store.getState().reseed(estimates);
  }, [estimates, store]);

  const liveEstimates = useStore(store, (state) => state.estimates);
  const sourceEstimates = OPTIMISTIC_ESTIMATE_LIST_ENABLED ? liveEstimates : estimates;
  const filteredEstimates = useMemo(
    () => projectEstimateToolbarRows(sourceEstimates, searchQuery, filter, sortField, sortDirection),
    [filter, searchQuery, sortDirection, sortField, sourceEstimates],
  );
  const sortDirectionOptions = useMemo(() => getEstimateSortDirectionOptions(sortField), [sortField]);
  const hasActiveListFilter = filter !== "all" || searchQuery.trim().length > 0;
  const emptyMessage = hasActiveListFilter ? "No matching estimates" : "No estimates yet";

  function createDraftEstimate(requestedName: string) {
    return requestedName
      ? createEstimateSheetDraft(projectId, { name: requestedName })
      : createEstimateSheetDraft(projectId);
  }

  function handleCreateEstimateSheet(name?: string) {
    const requestedName = typeof name === "string" ? name.trim() : "";
    if (!canCreateEstimates || createInFlightRef.current) return false;

    createInFlightRef.current = true;
    dispatchUi({ type: "create:start" });

    if (!OPTIMISTIC_ESTIMATE_LIST_ENABLED) {
      void createDraftEstimate(requestedName)
        .then(() => router.refresh())
        .catch((error: unknown) => dispatchUi({ type: "create:error", message: error instanceof Error ? error.message : "Could not create estimate." }))
        .finally(() => {
          createInFlightRef.current = false;
          dispatchUi({ type: "create:finish" });
        });
      return true;
    }

    // Optimistic create: a "Creating…" placeholder appears synchronously, then
    // reconciles to the server-canonical row. No overlay, no full re-render (P0-3).
    const now = new Date().toISOString();
    const tempId = `temp-${crypto.randomUUID()}`;
    const optimisticSheetCode = getNextOptimisticEstimateSheetCode(sourceEstimates);
    const placeholder: ProjectEstimateListRow = {
      id: tempId,
      project_id: projectId,
      name: requestedName || "Creating…",
      sheet_code: optimisticSheetCode,
      currency_code: "PHP",
      notes: null,
      project_budget: null,
      created_at: now,
      updated_at: now,
      firstNodeId: null,
      nodeCount: 0,
      rowItemCount: 0,
      totalProjectCost: 0,
      isFavorite: false,
      favoriteCreatedAt: null,
      pendingStatus: "creating",
      pendingError: null,
    };
    store.getState().insertOptimistic(placeholder);

    void createDraftEstimate(requestedName)
      .then((result) => store.getState().reconcileInsert(tempId, result.row))
      .catch((error: unknown) => {
        store.getState().rollbackInsert(tempId);
        dispatchUi({ type: "create:error", message: error instanceof Error ? error.message : "Could not create estimate." });
      })
      .finally(() => {
        createInFlightRef.current = false;
        dispatchUi({ type: "create:finish" });
      });
    return true;
  }

  return (
    <section className="workshop-estimates-list-glass flex h-full min-h-0 flex-col overflow-hidden p-1" aria-label={`${projectName} estimates`}>
      <TreePanelHeader
        className="bg-transparent"
        toolbarClassName="bg-transparent"
        ariaLabel="Project estimate tools"
        labelPrefix="estimates"
        searchValue={searchQuery}
        onSearchValueChange={(value) => dispatchUi({ type: "search", value })}
        searchPlaceholder="Search Estimates"
        searchLabel="Search Estimates"
        showBottomBorder={false}
        showToolbarBottomBorder={false}
        addActions={[
          {
            label: isCreating ? "Creating estimate" : "Create Estimate",
            icon: <NewspaperClipping size={12} weight="regular" aria-hidden="true" />,
            disabled: !canCreateEstimates || isCreating,
            onClick: () => { handleCreateEstimateSheet(); },
            className: ADD_BUTTON_CLASSNAME,
          },
        ]}
        filterSlot={
          <div className="flex min-w-0 flex-nowrap items-center gap-1.5">
            <DropdownSelect
              aria-label="Filter estimates"
              options={ESTIMATE_FILTER_OPTIONS}
              value={filter}
              onValueChange={(next) => {
                if (isEstimateFilter(next)) dispatchUi({ type: "filter", filter: next });
              }}
              variant="boxed"
              triggerDisplay="icon"
              className={ESTIMATE_TOOLBAR_SELECT_TRIGGER_CLASS}
            />
            <span aria-hidden="true" className="h-4 w-px shrink-0 bg-hairline" />
            <DropdownSelect
              aria-label="Sort field"
              options={ESTIMATE_SORT_FIELD_OPTIONS}
              value={sortField}
              onValueChange={(next) => {
                if (isEstimateSortField(next)) {
                  dispatchUi({ type: "sortField", sortField: next });
                }
              }}
              variant="boxed"
              triggerDisplay="icon"
              className={ESTIMATE_TOOLBAR_SELECT_TRIGGER_CLASS}
            />
            <DropdownSelect
              aria-label="Sort direction"
              options={sortDirectionOptions}
              value={sortDirection}
              onValueChange={(next) => {
                if (isEstimateSortDirection(next)) dispatchUi({ type: "sortDirection", sortDirection: next });
              }}
              variant="boxed"
              triggerDisplay="icon"
              className={ESTIMATE_TOOLBAR_SELECT_TRIGGER_CLASS}
            />
          </div>
        }
      />
      {createError ? (
        <p className="border-y border-dangerSoft bg-dangerSoft/40 px-2 py-1 text-[10px] font-medium text-danger" role="alert">
          {createError}
        </p>
      ) : null}

      <div className="min-h-0 flex-1 overflow-hidden rounded-xs border border-white/45 bg-white/55 shadow-[inset_0_1px_0_rgba(255,255,255,0.58)]">
        <ProjectEstimatesTable
          projectId={projectId}
          estimates={filteredEstimates}
          canEditEstimateById={canEditEstimateById}
          emptyMessage={emptyMessage}
          store={OPTIMISTIC_ESTIMATE_LIST_ENABLED ? store : undefined}
          optimistic={OPTIMISTIC_ESTIMATE_LIST_ENABLED}
          parentProject={parentProject}
          scope={scope}
          canCreateEstimates={canCreateEstimates}
          isCreatingEstimate={isCreating}
          onCreateEstimateFromName={handleCreateEstimateSheet}
        />
      </div>
    </section>
  );
}
