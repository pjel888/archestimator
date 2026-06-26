"use client";

import {
  useCallback,
  useEffect,
  useEffectEvent,
  useMemo,
  useReducer,
  useRef,
  type Dispatch,
  type SetStateAction,
} from "react";

import { useEstimateUiStore } from "@/stores/estimate-ui-store";
import { fetchEstimateSheetVersionControl, type EstimateSheetVersionControlData } from "@/lib/estimates/actions";
import type { ProposalExportMetadata } from "@/lib/proposal-export/types";

import type { EstimateTreeNode } from "../estimate-tree-data";
import { buildActivityScopeTreeItems } from "./activity-scope-tree";
import {
  DEFAULT_ACTIVITY_FILTERS,
  createActivityFilterKey,
  getActivityFilterInput,
  getActivityScopeKey,
  type ActivityFilterState,
  type ActivityScopeTreeItem,
  type EstimateActivityScope,
  type FlattenedEstimateRow,
  type RowDetailTab,
  type RowDetailsState,
} from "./activity-history-model";
import type { EditableRowValue } from "./rows/editable-row-model";

const ACTIVITY_HISTORY_RELOAD_DEBOUNCE_MS = 200;
const EMPTY_ACTIVITY_SCOPE_ITEMS: ActivityScopeTreeItem[] = [];

type UseEstimateHistoryPanelInput = {
  projectId?: string;
  estimateId?: string;
  estimateTree: EstimateTreeNode[];
  currentRows: FlattenedEstimateRow[];
  editableRows: Record<string, EditableRowValue>;
  resolvedProposalExportMetadata: ProposalExportMetadata | null;
  projectTotal: number;
  estimateNodeTotals: ReadonlyMap<string, number>;
  inspector: EstimateActivityScope | null;
  rowDetails: RowDetailsState | null;
  activityFilters: ActivityFilterState;
  historyData: EstimateSheetVersionControlData | null;
  isHistoryLoadingMore: boolean;
  setInspector: Dispatch<SetStateAction<EstimateActivityScope | null>>;
  setRowDetails: Dispatch<SetStateAction<RowDetailsState | null>>;
  setActivityFilters: Dispatch<SetStateAction<ActivityFilterState>>;
  setHistoryData: Dispatch<SetStateAction<EstimateSheetVersionControlData | null>>;
  setIsHistoryLoading: Dispatch<SetStateAction<boolean>>;
  setIsHistoryLoadingMore: Dispatch<SetStateAction<boolean>>;
  setHistoryError: Dispatch<SetStateAction<string>>;
};

function readHistoryScope(scopeKey: string) {
  const isRowHistory = scopeKey.startsWith("row:");
  const isNodeHistory = scopeKey.startsWith("node:");
  const rowId = isRowHistory ? scopeKey.slice("row:".length) : undefined;
  const [nodeId, nodeDescendantMode] = isNodeHistory ? scopeKey.slice("node:".length).split(":") : [];

  return {
    isRowHistory,
    isNodeHistory,
    rowId,
    nodeId,
    includeDescendants: isNodeHistory ? nodeDescendantMode === "desc" : undefined,
    scope: isRowHistory ? ("row" as const) : isNodeHistory ? ("node" as const) : ("sheet" as const),
  };
}

export function useEstimateHistoryPanel({
  projectId,
  estimateId,
  estimateTree,
  currentRows,
  editableRows,
  resolvedProposalExportMetadata,
  projectTotal,
  estimateNodeTotals,
  inspector,
  rowDetails,
  activityFilters,
  historyData,
  isHistoryLoadingMore,
  setInspector,
  setRowDetails,
  setActivityFilters,
  setHistoryData,
  setIsHistoryLoading,
  setIsHistoryLoadingMore,
  setHistoryError,
}: UseEstimateHistoryPanelInput) {
  const activityScopeDirectOnly = useEstimateUiStore((s) => s.activityScopeDirectOnly);
  const [historyReloadToken, bumpHistoryReloadToken] = useReducer((current: number) => current + 1, 0);
  const inspectorOpenerRef = useRef<HTMLElement | null>(null);
  const rowDetailsOpenerRef = useRef<HTMLElement | null>(null);
  const inspectorScopeRef = useRef("");
  const hasLoadedActivityHistoryRef = useRef(false);
  const lastActivityLoadScopeRef = useRef("");
  const historyRequestGenerationRef = useRef(0);

  const activateHistoryScope = useCallback((scopeKey: string) => {
    inspectorScopeRef.current = scopeKey;
    historyRequestGenerationRef.current += 1;
  }, []);

  const inspectorScopeKey = getActivityScopeKey(inspector);
  const activityFilterKey = useMemo(() => createActivityFilterKey(activityFilters), [activityFilters]);
  const activityScopeItems = useMemo(() => {
    if (!inspector) return EMPTY_ACTIVITY_SCOPE_ITEMS;
    return buildActivityScopeTreeItems({
      nodes: estimateTree,
      rows: currentRows,
      editableRows,
      metadata: resolvedProposalExportMetadata,
      projectTotal,
      nodeTotals: estimateNodeTotals,
      activityScopeDirectOnly,
    });
  }, [
    activityScopeDirectOnly,
    currentRows,
    editableRows,
    estimateNodeTotals,
    estimateTree,
    inspector,
    projectTotal,
    resolvedProposalExportMetadata,
  ]);
  const selectedActivityScopeItem = useMemo(
    () => activityScopeItems.find((item) => getActivityScopeKey(item.scope) === inspectorScopeKey) ?? activityScopeItems[0] ?? null,
    [activityScopeItems, inspectorScopeKey],
  );
  const selectedRowDetailsItem = useMemo(
    () => (rowDetails ? currentRows.find((row) => row.item.id === rowDetails.rowId) ?? null : null),
    [currentRows, rowDetails],
  );

  const setActiveInspector = useCallback((nextInspector: EstimateActivityScope | null) => {
    const nextScopeKey = getActivityScopeKey(nextInspector);
    activateHistoryScope(nextScopeKey);
    setInspector(nextInspector);
  }, [activateHistoryScope, setInspector]);

  const replaceActivityFilters = useCallback((nextFilters: ActivityFilterState) => {
    setActivityFilters(nextFilters);
    if (projectId && estimateId && inspector) {
      historyRequestGenerationRef.current += 1;
      setIsHistoryLoading(true);
      setIsHistoryLoadingMore(false);
      setHistoryData(null);
      setHistoryError("");
    }
  }, [
    estimateId,
    inspector,
    projectId,
    setActivityFilters,
    setHistoryData,
    setHistoryError,
    setIsHistoryLoading,
    setIsHistoryLoadingMore,
  ]);

  const resetActivityFilters = useCallback(() => {
    replaceActivityFilters(DEFAULT_ACTIVITY_FILTERS);
  }, [replaceActivityFilters]);

  const reloadVersionControl = useCallback(() => {
    if (projectId && estimateId) {
      hasLoadedActivityHistoryRef.current = false;
      lastActivityLoadScopeRef.current = "";
      historyRequestGenerationRef.current += 1;
      setIsHistoryLoading(true);
      setIsHistoryLoadingMore(false);
      setHistoryData(null);
      setHistoryError("");
    }
    bumpHistoryReloadToken();
  }, [estimateId, projectId, setHistoryData, setHistoryError, setIsHistoryLoading, setIsHistoryLoadingMore]);

  const closeInspector = useCallback(() => {
    hasLoadedActivityHistoryRef.current = false;
    lastActivityLoadScopeRef.current = "";
    setActiveInspector(null);
    window.requestAnimationFrame(() => inspectorOpenerRef.current?.focus());
  }, [setActiveInspector]);

  const closeInspectorFromKeyDown = useEffectEvent(() => closeInspector());

  const prepareHistoryLoad = useCallback(() => {
    if (projectId && estimateId) {
      setIsHistoryLoading(true);
      setIsHistoryLoadingMore(false);
      setHistoryData(null);
      setHistoryError("");
    }
  }, [estimateId, projectId, setHistoryData, setHistoryError, setIsHistoryLoading, setIsHistoryLoadingMore]);

  const openActivityHistory = useCallback((opener: HTMLElement, initialScope: EstimateActivityScope = { mode: "sheet" }) => {
    inspectorOpenerRef.current = opener;
    prepareHistoryLoad();
    setActiveInspector(initialScope);
  }, [prepareHistoryLoad, setActiveInspector]);

  const openRowDetails = useCallback((rowItemId: string, opener: HTMLElement, tab: RowDetailTab = "details") => {
    rowDetailsOpenerRef.current = opener;
    setRowDetails({ rowId: rowItemId, tab });
  }, [setRowDetails]);

  const closeRowDetails = useCallback(() => {
    setRowDetails(null);
    window.requestAnimationFrame(() => rowDetailsOpenerRef.current?.focus());
  }, [setRowDetails]);

  const closeRowDetailsFromKeyDown = useEffectEvent(() => closeRowDetails());

  const setRowDetailsTab = useCallback((tab: RowDetailTab) => {
    setRowDetails((current) => (current ? { ...current, tab } : current));
  }, [setRowDetails]);

  const selectActivityScope = useCallback((nextScope: EstimateActivityScope) => {
    if (getActivityScopeKey(nextScope) === inspectorScopeKey) return;
    prepareHistoryLoad();
    setActiveInspector(nextScope);
  }, [inspectorScopeKey, prepareHistoryLoad, setActiveInspector]);

  const loadMoreVersionControl = useCallback(() => {
    if (!inspector || !historyData || !projectId || !estimateId || isHistoryLoadingMore) return;

    const requestScopeKey = getActivityScopeKey(inspector);
    const { isRowHistory, isNodeHistory, rowId, nodeId, includeDescendants, scope } = readHistoryScope(requestScopeKey);
    const cursor = isRowHistory ? historyData.rowNextCursor : isNodeHistory ? historyData.nodeNextCursor : historyData.nextCursor;
    if (!cursor) return;

    setIsHistoryLoadingMore(true);
    setHistoryError("");
    const requestGeneration = historyRequestGenerationRef.current;
    const isCurrentHistoryRequest = () => inspectorScopeRef.current === requestScopeKey && historyRequestGenerationRef.current === requestGeneration;

    fetchEstimateSheetVersionControl({
      projectId,
      estimateId,
      rowId,
      nodeId,
      includeDescendants,
      eventLimit: 50,
      ...getActivityFilterInput(activityFilters),
      sheetCursor: !isRowHistory && !isNodeHistory ? cursor : undefined,
      rowCursor: isRowHistory ? cursor : undefined,
      nodeCursor: isNodeHistory ? cursor : undefined,
      scope,
    })
      .then((data) => {
        if (!isCurrentHistoryRequest()) return;
        setHistoryData((current) => {
          if (!current) return data;
          if (isRowHistory) {
            return {
              ...current,
              rowEvents: [...current.rowEvents, ...data.rowEvents],
              rowNextCursor: data.rowNextCursor,
            };
          }

          if (isNodeHistory) {
            return {
              ...current,
              nodeEvents: [...(current.nodeEvents ?? []), ...data.nodeEvents],
              nodeNextCursor: data.nodeNextCursor,
            };
          }

          return {
            ...current,
            events: [...current.events, ...data.events],
            nextCursor: data.nextCursor,
          };
        });
      })
      .catch((error: unknown) => {
        if (!isCurrentHistoryRequest()) return;
        setHistoryError(error instanceof Error ? error.message : "Activity history could not load.");
      })
      .finally(() => {
        if (!isCurrentHistoryRequest()) return;
        setIsHistoryLoadingMore(false);
      });
  }, [
    activityFilters,
    estimateId,
    historyData,
    inspector,
    isHistoryLoadingMore,
    projectId,
    setHistoryData,
    setHistoryError,
    setIsHistoryLoadingMore,
  ]);

  useEffect(() => {
    if (!inspectorScopeKey) return;
    if (!projectId || !estimateId) return;

    let isActive = true;
    const requestScopeKey = inspectorScopeKey;
    const { isRowHistory, isNodeHistory, rowId, nodeId, includeDescendants, scope } = readHistoryScope(requestScopeKey);
    const requestGeneration = historyRequestGenerationRef.current;
    const isCurrentHistoryRequest = () =>
      isActive && inspectorScopeRef.current === requestScopeKey && historyRequestGenerationRef.current === requestGeneration;
    const loadHistory = () => {
      fetchEstimateSheetVersionControl({
        projectId,
        estimateId,
        rowId,
        nodeId,
        includeDescendants,
        eventLimit: 50,
        ...getActivityFilterInput(activityFilters),
        scope,
      })
        .then((data) => {
          if (!isCurrentHistoryRequest()) return;
          setHistoryData(data);
        })
        .catch((error: unknown) => {
          if (!isCurrentHistoryRequest()) return;
          setHistoryError(error instanceof Error ? error.message : "Activity history could not load.");
        })
        .finally(() => {
          if (!isCurrentHistoryRequest()) return;
          hasLoadedActivityHistoryRef.current = true;
          lastActivityLoadScopeRef.current = requestScopeKey;
          setIsHistoryLoading(false);
        });
    };
    const shouldDebounceReload =
      hasLoadedActivityHistoryRef.current && lastActivityLoadScopeRef.current === requestScopeKey;
    const loadTimer = shouldDebounceReload
      ? window.setTimeout(loadHistory, ACTIVITY_HISTORY_RELOAD_DEBOUNCE_MS)
      : null;
    if (loadTimer === null) loadHistory();

    return () => {
      isActive = false;
      if (loadTimer) window.clearTimeout(loadTimer);
    };
  }, [
    activityFilterKey,
    activityFilters,
    estimateId,
    historyReloadToken,
    inspectorScopeKey,
    projectId,
    setHistoryData,
    setHistoryError,
    setIsHistoryLoading,
  ]);

  useEffect(() => {
    inspectorScopeRef.current = inspectorScopeKey;
  }, [inspectorScopeKey]);

  useEffect(() => {
    if (!inspector) return;

    function handleEscape(event: globalThis.KeyboardEvent) {
      if (event.key !== "Escape") return;
      event.preventDefault();
      closeInspectorFromKeyDown();
    }

    window.addEventListener("keydown", handleEscape);
    return () => window.removeEventListener("keydown", handleEscape);
  }, [closeInspectorFromKeyDown, inspector]);

  useEffect(() => {
    if (!rowDetails) return;

    function handleEscape(event: globalThis.KeyboardEvent) {
      if (event.key !== "Escape") return;
      event.preventDefault();
      closeRowDetailsFromKeyDown();
    }

    window.addEventListener("keydown", handleEscape);
    return () => window.removeEventListener("keydown", handleEscape);
  }, [closeRowDetailsFromKeyDown, rowDetails]);

  return {
    activityScopeItems,
    closeInspector,
    closeRowDetails,
    loadMoreVersionControl,
    openActivityHistory,
    openRowDetails,
    reloadVersionControl,
    replaceActivityFilters,
    resetActivityFilters,
    selectActivityScope,
    selectedActivityScopeItem,
    selectedRowDetailsItem,
    setRowDetailsTab,
  };
}
