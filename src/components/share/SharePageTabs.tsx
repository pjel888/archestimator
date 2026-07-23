"use client";

import React, { useEffect, useRef, useCallback, useMemo, useReducer, useSyncExternalStore } from "react";
// react-doctor-disable-next-line react-doctor/no-flush-sync -- beforeprint must synchronously commit the print package before browser snapshot.
import { flushSync } from "react-dom";

import { useIsHydrated } from "@/hooks/use-is-hydrated";
import type { PublicationSnapshotEstimate, PublicationSnapshotEstimateTab, PublicationSnapshotRow } from "@/lib/publication/types";

import Image from "next/image";

import { normalizePublicationImageUrl } from "@/lib/publication/image-url";
import { Button } from "@/components/ui/button";
import { getBestShareTree, wrapTreeWithRoot } from "@/lib/share/reconstruct-share-tree";
import { ShareEstimateTreePanel } from "@/components/share/ShareEstimateTreePanel";
import { ShareEstimateTreeView } from "@/components/share/ShareEstimateTreeView";
import type { ShareReviewTarget } from "@/components/share/share-review-target";

interface SharePageTabsProps {
  estimates: PublicationSnapshotEstimate[];
  currencyCode: string;
  token: string;
  onReviewTargetChange?: (target: ShareReviewTarget) => void;
}

const COLLATED_ROW_LIMIT = 250;
const SCROLL_FADE_LEFT = 1;
const SCROLL_FADE_RIGHT = 2;
const shareTabsMoneyFormatter = new Intl.NumberFormat("en-PH", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

type ShareEstimateViewMode = "tree" | "collated";

type SharePageTabsState = {
  activeIdOverride: string | null;
  collatedRowLimit: number;
  sheetViews: Record<string, ShareEstimateViewMode>;
  gridSearchByEstimateId: Record<string, string>;
  estimateTabOverrides: Record<string, string>;
  renderPrintPackage: boolean;
  selectedReviewTargetKey: string | null;
};

type SharePageTabsAction =
  | { type: "activeEstimateSelected"; estimateId: string }
  | { type: "collatedRowsExpanded"; limit: number }
  | { type: "viewChanged"; estimateId: string; view: ShareEstimateViewMode }
  | { type: "gridSearchChanged"; key: string; value: string }
  | { type: "estimateTabSelected"; estimateId: string; tabId: string }
  | { type: "printPackageVisibilityChanged"; visible: boolean }
  | { type: "reviewTargetSelected"; key: string };

const INITIAL_SHARE_PAGE_TABS_STATE: SharePageTabsState = {
  activeIdOverride: null,
  collatedRowLimit: COLLATED_ROW_LIMIT,
  sheetViews: {},
  gridSearchByEstimateId: {},
  estimateTabOverrides: {},
  renderPrintPackage: false,
  selectedReviewTargetKey: null,
};

function sharePageTabsReducer(state: SharePageTabsState, action: SharePageTabsAction): SharePageTabsState {
  switch (action.type) {
    case "activeEstimateSelected":
      return {
        ...state,
        activeIdOverride: action.estimateId,
      };
    case "collatedRowsExpanded":
      return {
        ...state,
        collatedRowLimit: action.limit,
      };
    case "viewChanged":
      return {
        ...state,
        sheetViews: { ...state.sheetViews, [action.estimateId]: action.view },
      };
    case "gridSearchChanged":
      return {
        ...state,
        collatedRowLimit: COLLATED_ROW_LIMIT,
        gridSearchByEstimateId: { ...state.gridSearchByEstimateId, [action.key]: action.value },
      };
    case "estimateTabSelected":
      return {
        ...state,
        estimateTabOverrides: { ...state.estimateTabOverrides, [action.estimateId]: action.tabId },
      };
    case "printPackageVisibilityChanged":
      return {
        ...state,
        renderPrintPackage: action.visible,
      };
    case "reviewTargetSelected":
      return {
        ...state,
        selectedReviewTargetKey: action.key,
      };
    default:
      return state;
  }
}

function formatMoney(value: number, currencyCode: string) {
  return `${currencyCode} ${shareTabsMoneyFormatter.format(value)}`;
}

function readStoredActiveEstimateId(storageKey: string, estimates: PublicationSnapshotEstimate[]) {
  if (typeof window === "undefined" || estimates.length === 0) return null;
  try {
    const saved = window.sessionStorage.getItem(storageKey);
    return saved && estimates.some((estimate) => estimate.id === saved) ? saved : null;
  } catch {
    return null;
  }
}

function findShareTreeNodeElement(root: HTMLElement | null, nodeId: string) {
  if (!root) return null;
  const nodes = root.querySelectorAll<HTMLElement>("[data-share-tree-node-id]");
  return [...nodes].find((node) => node.getAttribute("data-share-tree-node-id") === nodeId) ?? null;
}

function getOrderedEstimateTabs(estimate: PublicationSnapshotEstimate | undefined): PublicationSnapshotEstimateTab[] {
  return (estimate?.tabs ?? []).toSorted((a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name) || a.id.localeCompare(b.id));
}

function getDefaultEstimateTabId(tabs: PublicationSnapshotEstimateTab[]): string | null {
  return tabs.find((tab) => tab.isDefault)?.id ?? tabs[0]?.id ?? null;
}

function getEstimateTabRows(estimate: PublicationSnapshotEstimate, tab: PublicationSnapshotEstimateTab): PublicationSnapshotRow[] {
  if (tab.rows?.length || !tab.rowIds) return tab.rows ?? [];

  if (tab.rowIds) {
    const rowsById = new Map(estimate.rows.map((row) => [row.id, row]));
    return tab.rowIds.flatMap((rowId) => {
      const row = rowsById.get(rowId);
      return row ? [row] : [];
    });
  }

  return estimate.rows.filter((row) => row.tabId === tab.id);
}

function getPrintableEstimateSections(estimate: PublicationSnapshotEstimate) {
  const tabs = getOrderedEstimateTabs(estimate);

  if (tabs.length === 0) {
    return [
      {
        id: estimate.id,
        name: estimate.name,
        meta: [estimate.sheetCode].filter(Boolean).join(" · "),
        rows: estimate.rows,
        totalCost: estimate.totalCost,
      },
    ];
  }

  return tabs.map((tab) => ({
    id: `${estimate.id}:${tab.id}`,
    name: tabs.length === 1 ? estimate.name : `${estimate.name} - ${tab.name}`,
    meta: [estimate.sheetCode, `Tab ${tab.name}`].filter(Boolean).join(" · "),
    rows: getEstimateTabRows(estimate, tab),
    totalCost: tab.totalCost,
  }));
}

function SharePrintEstimatePackage({
  currencyCode,
  estimates,
}: {
  currencyCode: string;
  estimates: PublicationSnapshotEstimate[];
}) {
  return (
    <div className="share-print-only space-y-4" data-share-print-package aria-hidden="true">
      {estimates.flatMap((estimate) =>
        getPrintableEstimateSections(estimate).map((section) => (
          <section key={section.id} className="share-print-estimate border border-hairline bg-white p-3">
            <div className="mb-3 flex items-start justify-between gap-4">
              <div>
                <h2 className="text-[15px] font-medium leading-[20px] tracking-normal text-ink">{section.name}</h2>
                {section.meta ? (
                  <p className="text-[12px] leading-[16px] tracking-normal text-secondary">{section.meta}</p>
                ) : null}
              </div>
              <p className="text-right text-[14px] font-medium leading-[18px] tracking-normal text-ink">
                {formatMoney(section.totalCost, currencyCode)}
              </p>
            </div>
            <table className="min-w-full border-collapse text-left text-[12px] leading-[16px] tracking-normal">
              <thead className="bg-surfaceMuted text-[11px] uppercase tracking-normal text-secondary">
                <tr>
                  <th className="border border-hairline px-2 py-1 font-medium">Description</th>
                  <th className="border border-hairline px-2 py-1 font-medium">Discipline</th>
                  <th className="border border-hairline px-2 py-1 text-right font-medium">Qty</th>
                  <th className="border border-hairline px-2 py-1 font-medium">Unit</th>
                  <th className="border border-hairline px-2 py-1 text-right font-medium">Total</th>
                </tr>
              </thead>
              <tbody>
                {section.rows.length > 0 ? (
                  section.rows.map((row) => (
                    <tr key={row.id}>
                      <td className="border border-hairline px-2 py-1 text-secondary">{row.description}</td>
                      <td className="border border-hairline px-2 py-1 text-secondary">{row.discipline}</td>
                      <td className="border border-hairline px-2 py-1 text-right text-secondary">{row.quantity}</td>
                      <td className="border border-hairline px-2 py-1 text-secondary">{row.unit}</td>
                      <td className="border border-hairline px-2 py-1 text-right font-medium text-ink">
                        {formatMoney(row.rowTotal, currencyCode)}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={5} className="border border-hairline px-2 py-2 text-center text-secondary">
                      No rows included.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </section>
        )),
      )}
    </div>
  );
}

// react-doctor-disable-next-line react-doctor/no-giant-component -- Structural split tracked in .ai/03_plans/2026-06-23-react-doctor-warning-cleanup.md; broad refactor needs behavior tests.
export default function SharePageTabs({
  estimates,
  currencyCode,
  token,
  onReviewTargetChange,
}: SharePageTabsProps) {
  const storageKey = `share-tab:${token}`;
  const hydrated = useIsHydrated();
  // The persisted active tab lives in sessionStorage, which only exists in the
  // browser. Reading it during the lazy state initializer made the first
  // client render (the stored tab) diverge from the server render (which always
  // falls back to estimates[0]) → hydration mismatch on the tablist + panel.
  // Start from `null` (server-identical) and fold the stored value in only after
  // hydration, while still letting an explicit user selection take precedence.
  const [tabsState, dispatchTabsState] = useReducer(sharePageTabsReducer, INITIAL_SHARE_PAGE_TABS_STATE);
  const {
    activeIdOverride,
    collatedRowLimit,
    sheetViews,
    gridSearchByEstimateId,
    estimateTabOverrides,
    renderPrintPackage,
    selectedReviewTargetKey,
  } = tabsState;

  const fallbackActiveId = estimates[0]?.id ?? "";
  const storedActiveId = hydrated ? readStoredActiveEstimateId(storageKey, estimates) : null;
  const resolvedActiveId = activeIdOverride ?? storedActiveId;
  const activeId = resolvedActiveId && estimates.some((estimate) => estimate.id === resolvedActiveId) ? resolvedActiveId : fallbackActiveId;
  const currentView = sheetViews[activeId] ?? "tree";

  const contentRef = useRef<HTMLDivElement>(null);
  const collatedRowRefs = useRef<(HTMLTableRowElement | null)[]>([]);
  const estimateTabRefs = useRef<(HTMLButtonElement | null)[]>([]);

  const setViewForCurrentSheet = (view: ShareEstimateViewMode) => {
    if (activeId) {
      dispatchTabsState({ type: "viewChanged", estimateId: activeId, view });
    }
  };

  const handleTreeNavigate = useCallback((nodeId: string) => {
    const el = findShareTreeNodeElement(contentRef.current, nodeId);
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, []);

  const handleSubTabKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowLeft" || e.key === "ArrowRight") {
      e.stopPropagation(); // CRITICAL: isolate from main tab bar roving
      const next = currentView === "tree" ? "collated" : "tree";
      setViewForCurrentSheet(next);
    }
  };

  const tabRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const scrollRef = useRef<HTMLDivElement>(null);

  const getScrollFadeSnapshot = useCallback(() => {
    const scrollElement = scrollRef.current;
    if (!scrollElement) return 0;
    const { scrollLeft, scrollWidth, clientWidth } = scrollElement;
    let mask = 0;
    if (scrollLeft > 2) mask |= SCROLL_FADE_LEFT;
    if (scrollLeft + clientWidth < scrollWidth - 2) mask |= SCROLL_FADE_RIGHT;
    return mask;
  }, []);

  const subscribeToScrollFades = useCallback((onStoreChange: () => void) => {
    const scrollElement = scrollRef.current;
    if (!scrollElement) return () => {};

    const resizeObserver = typeof ResizeObserver !== "undefined"
      ? new ResizeObserver(onStoreChange)
      : null;
    resizeObserver?.observe(scrollElement);
    scrollElement.addEventListener("scroll", onStoreChange, { passive: true });
    window.addEventListener("resize", onStoreChange);
    queueMicrotask(onStoreChange);

    return () => {
      resizeObserver?.disconnect();
      scrollElement.removeEventListener("scroll", onStoreChange);
      window.removeEventListener("resize", onStoreChange);
    };
  }, []);

  const scrollFadeMask = useSyncExternalStore(subscribeToScrollFades, getScrollFadeSnapshot, () => 0);
  const canScrollLeft = Boolean(scrollFadeMask & SCROLL_FADE_LEFT);
  const canScrollRight = Boolean(scrollFadeMask & SCROLL_FADE_RIGHT);

  // Persist on change
  const updateActive = useCallback(
    (id: string) => {
      if (!id || id === activeId) return;
      dispatchTabsState({ type: "activeEstimateSelected", estimateId: id });
      try {
        window.sessionStorage.setItem(storageKey, id);
      } catch {
        // sessionStorage may be unavailable (private mode etc) — graceful
      }
    },
    [activeId, storageKey]
  );

  // Keyboard navigation (roving tabindex + arrows + Home/End + activation)
  const handleTabKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLButtonElement>, index: number) => {
      const len = estimates.length;
      if (len <= 1) return;

      let nextIndex = index;

      switch (e.key) {
        case "ArrowRight":
          e.preventDefault();
          nextIndex = (index + 1) % len;
          break;
        case "ArrowLeft":
          e.preventDefault();
          nextIndex = (index - 1 + len) % len;
          break;
        case "Home":
          e.preventDefault();
          nextIndex = 0;
          break;
        case "End":
          e.preventDefault();
          nextIndex = len - 1;
          break;
        case "Enter":
        case " ":
          e.preventDefault();
          updateActive(estimates[index].id);
          return;
        default:
          return;
      }

      const nextId = estimates[nextIndex].id;
      updateActive(nextId);

      // Move focus to the newly active tab button (roving)
      const nextBtn = tabRefs.current[nextIndex];
      nextBtn?.focus();
    },
    [estimates, updateActive]
  );

  // All hooks must be called unconditionally at the top (rules of hooks).
  const wouldBeActiveId = activeId || (estimates[0]?.id ?? "");
  const wouldBeActive = estimates.find((e) => e.id === wouldBeActiveId) ?? estimates[0];
  const activeEstimateTabs = useMemo(() => getOrderedEstimateTabs(wouldBeActive), [wouldBeActive]);
  const activeEstimateTabId =
    wouldBeActive && activeEstimateTabs.some((tab) => tab.id === estimateTabOverrides[wouldBeActive.id])
      ? estimateTabOverrides[wouldBeActive.id]
      : getDefaultEstimateTabId(activeEstimateTabs);
  const activeEstimateTab = activeEstimateTabs.find((tab) => tab.id === activeEstimateTabId) ?? null;
  const activeContentRows = useMemo(() => {
    if (!wouldBeActive) return [];
    return activeEstimateTab ? getEstimateTabRows(wouldBeActive, activeEstimateTab) : wouldBeActive.rows;
  }, [activeEstimateTab, wouldBeActive]);
  const activeContentTreeNodes = activeEstimateTab?.treeNodes ?? wouldBeActive?.treeNodes;
  const activeContentTotal = activeEstimateTab?.totalCost ?? wouldBeActive?.totalCost ?? 0;
  const activeContentLabel = activeEstimateTab ? `${wouldBeActive?.name ?? "Estimate"} · ${activeEstimateTab.name}` : wouldBeActive?.name ?? "Estimate";
  const gridSearchKey = wouldBeActive ? (activeEstimateTab ? `${wouldBeActive.id}:${activeEstimateTab.id}` : wouldBeActive.id) : "";

  const updateActiveEstimateTab = useCallback(
    (id: string) => {
      if (!wouldBeActive || !id || id === activeEstimateTabId) return;
      dispatchTabsState({ type: "estimateTabSelected", estimateId: wouldBeActive.id, tabId: id });
    },
    [activeEstimateTabId, wouldBeActive],
  );

  const handleEstimateTabKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLButtonElement>, index: number) => {
      const len = activeEstimateTabs.length;
      if (len <= 1) return;

      let nextIndex = index;

      switch (e.key) {
        case "ArrowRight":
          e.preventDefault();
          nextIndex = (index + 1) % len;
          break;
        case "ArrowLeft":
          e.preventDefault();
          nextIndex = (index - 1 + len) % len;
          break;
        case "Home":
          e.preventDefault();
          nextIndex = 0;
          break;
        case "End":
          e.preventDefault();
          nextIndex = len - 1;
          break;
        case "Enter":
        case " ":
          e.preventDefault();
          {
            const selectedTab = activeEstimateTabs[index];
            if (selectedTab) updateActiveEstimateTab(selectedTab.id);
          }
          return;
        default:
          return;
      }

      const nextTab = activeEstimateTabs[nextIndex];
      if (!nextTab) return;
      updateActiveEstimateTab(nextTab.id);
      estimateTabRefs.current[nextIndex]?.focus();
    },
    [activeEstimateTabs, updateActiveEstimateTab],
  );

  const treeNodes = useMemo(() => {
    if (!wouldBeActive) return [];
    const raw = getBestShareTree(activeContentRows, activeContentTreeNodes);
    if (raw.length === 0) return raw;
    // Virtual root (per clarified target A): provides "complete hierarchy" context in Tree View + floating nav
    // even when designation data in snapshot is relative/shallow (e.g. starts at "Balcony" for some Lewis publishes).
    // Reconstruction itself remains pure (fidelity tests + other snapshots unaffected).
    return wrapTreeWithRoot(raw, activeContentLabel, activeContentTotal);
  }, [activeContentLabel, activeContentRows, activeContentTotal, activeContentTreeNodes, wouldBeActive]);
  const activeGridSearch = gridSearchKey ? gridSearchByEstimateId[gridSearchKey] ?? "" : "";
  const activeEstimate = wouldBeActive ?? estimates[0] ?? {
    id: "",
    name: "Estimate",
    sheetCode: "",
    updatedAt: null,
    rowCount: 0,
    totalCost: 0,
    rows: [],
  };
  const filteredRows = useMemo(() => {
    const normalizedQuery = activeGridSearch.trim().toLowerCase();
    if (!normalizedQuery) return activeContentRows;
    return activeContentRows.filter((row) =>
      [row.description, row.designation, row.material, row.discipline]
        .some((value) => value.toLowerCase().includes(normalizedQuery)),
    );
  }, [activeContentRows, activeGridSearch]);
  const visibleCollatedRows = filteredRows.slice(0, collatedRowLimit);
  const hiddenCollatedRowCount = Math.max(filteredRows.length - visibleCollatedRows.length, 0);
  const createRowReviewTarget = useCallback((row: (typeof activeContentRows)[number]): ShareReviewTarget => ({
    kind: "row",
    label: row.description || row.material || "Selected line item",
    secondaryLabel: activeContentLabel,
    estimateId: activeEstimate.id,
    rowId: row.id,
  }), [activeContentLabel, activeEstimate.id]);

  const createEstimateReviewTarget = useCallback((): ShareReviewTarget => ({
    kind: "estimate",
    label: activeEstimate.name,
    secondaryLabel: activeEstimate.sheetCode || null,
    estimateId: activeEstimate.id,
    rowId: null,
  }), [activeEstimate.id, activeEstimate.name, activeEstimate.sheetCode]);

  const handleEstimateReview = useCallback(() => {
    const target = createEstimateReviewTarget();
    dispatchTabsState({ type: "reviewTargetSelected", key: `estimate:${target.estimateId ?? activeEstimate.id}` });
    onReviewTargetChange?.(target);
  }, [activeEstimate.id, createEstimateReviewTarget, onReviewTargetChange]);

  const handleRowReview = useCallback(
    (row: (typeof activeContentRows)[number]) => {
      const target = createRowReviewTarget(row);
      dispatchTabsState({ type: "reviewTargetSelected", key: `row:${row.id}` });
      onReviewTargetChange?.(target);
    },
    [createRowReviewTarget, onReviewTargetChange],
  );

  const handleCollatedRowKeyDown = useCallback(
    (event: React.KeyboardEvent<HTMLTableRowElement>, index: number) => {
      const rowCount = visibleCollatedRows.length;
      if (rowCount === 0) return;

      let nextIndex = index;
      switch (event.key) {
        case "ArrowDown":
          nextIndex = (index + 1) % rowCount;
          break;
        case "ArrowUp":
          nextIndex = (index - 1 + rowCount) % rowCount;
          break;
        case "Home":
          nextIndex = 0;
          break;
        case "End":
          nextIndex = rowCount - 1;
          break;
        case "Enter":
        case " ":
          event.preventDefault();
          handleRowReview(visibleCollatedRows[index]);
          return;
        default:
          return;
      }

      event.preventDefault();
      const currentRow = event.currentTarget;
      const nextRow = collatedRowRefs.current[nextIndex];
      if (!nextRow) return;
      currentRow.tabIndex = -1;
      nextRow.tabIndex = 0;
      nextRow.focus();
    },
    [handleRowReview, visibleCollatedRows],
  );

  useEffect(() => {
    const showPrintPackage = () => {
      // react-doctor-disable-next-line react-doctor/no-flush-sync -- beforeprint must commit the print package before the browser snapshots the document.
      flushSync(() => dispatchTabsState({ type: "printPackageVisibilityChanged", visible: true }));
    };
    const hidePrintPackage = () => {
      dispatchTabsState({ type: "printPackageVisibilityChanged", visible: false });
    };

    window.addEventListener("beforeprint", showPrintPackage);
    window.addEventListener("afterprint", hidePrintPackage);
    return () => {
      window.removeEventListener("beforeprint", showPrintPackage);
      window.removeEventListener("afterprint", hidePrintPackage);
    };
  }, []);

  if (estimates.length === 0) {
    // AC-UX-08: never a silent null — show a visible, calm empty state.
    return (
      <output
        className="border border-dashed border-hairline bg-white p-3 text-center text-[11px] leading-[16px] text-secondary"
      >
        No estimates are included in this shared proposal yet.
      </output>
    );
  }

  const activeEstimateMetaText = [activeEstimate?.sheetCode, activeEstimateTab ? `Tab ${activeEstimateTab.name}` : null]
    .filter(Boolean)
    .join(" · ");
  return (
    <div className="space-y-2">
      <div className="share-print-screen-only space-y-2">
      {/* Active estimate summary — sheet name + total, with the view-mode toggle consolidated
          onto this row (UX-15: no separate full-width Tree/Grid strip). */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          <h2 className="text-[12px] font-medium leading-[16px] text-ink">{activeEstimate?.name}</h2>
          {activeEstimateMetaText ? (
            <p className="text-[10px] leading-[14px] text-secondary">{activeEstimateMetaText}</p>
          ) : null}
        </div>
        <div className="flex items-center justify-between gap-3 sm:justify-end">
          <div className="text-right">
            <p className="text-[9px] font-medium leading-[12px] text-tertiary">Sheet total</p>
            <p className="text-[12px] font-medium leading-[16px] tabular-nums text-ink">
              {formatMoney(activeContentTotal, currencyCode)}
            </p>
          </div>
          <div
            role="tablist"
            aria-label="Estimate view mode"
            tabIndex={-1}
            className="flex items-center gap-0 rounded-xs border border-hairline bg-white"
            onKeyDown={handleSubTabKeyDown}
          >
            {(["tree", "collated"] as const).map((mode) => {
              const isActive = currentView === mode;
              const label = mode === "tree" ? "Summary" : "Details";
              return (
                <button
                  key={mode}
                  type="button"
                  role="tab"
                  aria-selected={isActive}
                  aria-controls={`share-estimate-panel-${activeEstimate.id}`}
                  tabIndex={isActive ? 0 : -1}
                  className={`cursor-pointer rounded-xs px-2.5 py-1 text-[10px] font-medium leading-none transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus ${
                    isActive ? "bg-surfaceMuted text-ink" : "text-secondary hover:text-ink"
                  }`}
                  onClick={() => setViewForCurrentSheet(mode)}
                >
                  <span>{label}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Tablist — horizontal scroll + fade masks for mobile, design-system compliant */}
      <div className="relative">
        <div
          ref={scrollRef}
          role="tablist"
          aria-label="Estimates"
          className="flex h-8 items-end gap-0 overflow-x-auto overflow-y-hidden border-b border-hairline bg-surfaceMuted text-[10px] font-medium scrollbar-thin scrollbar-thumb-hairline"
          style={{ scrollbarWidth: "thin" }}
        >
          {estimates.map((estimate, index) => {
            const isActive = estimate.id === activeId;
            return (
              <button
                key={estimate.id}
                id={`tab-${estimate.id}`}
                ref={(el) => {
                  tabRefs.current[index] = el;
                }}
                type="button"
                role="tab"
                aria-selected={isActive}
                aria-controls={`share-estimate-panel-${estimate.id}`}
                tabIndex={isActive ? 0 : -1}
                className={`relative cursor-pointer h-full flex-shrink-0 min-w-0 truncate rounded-xs border border-b-0 px-3 text-[10px] font-medium leading-none transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus ${
                  isActive
                    ? "z-10 bg-white text-ink border-hairline -mb-px"
                    : "bg-surfaceMuted text-secondary border-transparent hover:text-ink hover:border-hairline"
                }`}
                onClick={() => updateActive(estimate.id)}
                onKeyDown={(e) => handleTabKeyDown(e, index)}
              >
                <span className="truncate">{estimate.name}</span>
                {estimate.sheetCode ? (
                  <span className="ml-1 text-[9px] text-secondary">({estimate.sheetCode})</span>
                ) : null}
              </button>
            );
          })}
        </div>

        {/* Lightweight left/right fade masks for mobile horizontal scroll (pure + state driven; always in DOM for test + a11y) */}
        <div
          aria-hidden
          className={`pointer-events-none absolute left-0 top-0 h-full w-6 bg-gradient-to-r from-surfaceMuted to-transparent transition-opacity ${canScrollLeft ? "opacity-100" : "opacity-0"}`}
        />
        <div
          aria-hidden
          className={`pointer-events-none absolute right-0 top-0 h-full w-6 bg-gradient-to-l from-surfaceMuted to-transparent transition-opacity ${canScrollRight ? "opacity-100" : "opacity-0"}`}
        />
      </div>

      {activeEstimateTabs.length > 1 ? (
        <div
          role="tablist"
          aria-label={`${activeEstimate.name} tabs`}
          className="flex h-8 items-center gap-0 overflow-x-auto border-b border-hairline bg-white text-[10px] font-medium"
        >
          {activeEstimateTabs.map((tab, index) => {
            const isActive = tab.id === activeEstimateTabId;
            return (
              <button
                key={tab.id}
                id={`share-estimate-tab-${activeEstimate.id}-${tab.id}`}
                ref={(el) => {
                  estimateTabRefs.current[index] = el;
                }}
                type="button"
                role="tab"
                aria-selected={isActive}
                aria-controls={`share-estimate-panel-${activeEstimate.id}`}
                tabIndex={isActive ? 0 : -1}
                className={`cursor-pointer h-full flex-shrink-0 rounded-xs border px-3 text-[10px] font-medium leading-none transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus ${
                  isActive
                    ? "bg-surfaceMuted text-ink border-hairline"
                    : "text-secondary hover:text-ink border-transparent hover:border-hairline"
                }`}
                onClick={() => updateActiveEstimateTab(tab.id)}
                onKeyDown={(event) => handleEstimateTabKeyDown(event, index)}
              >
                {tab.name}
              </button>
            );
          })}
        </div>
      ) : null}

      {/* Active tab panel — encapsulates the original estimate card + table exactly */}
      <div
        id={`share-estimate-panel-${activeEstimate.id}`}
        role="tabpanel"
        aria-labelledby={`tab-${activeEstimate.id}`}
        className="share-print-estimate border border-hairline bg-white"
      >
        {currentView === "collated" ? (
          <div>
            <div className="flex flex-col gap-2 border-b border-hairline bg-white p-2 sm:flex-row sm:items-center sm:justify-between">
              <div className="min-w-0">
                <h3 className="text-[11px] font-medium leading-[16px] text-ink">Details</h3>
                <p className="text-[10px] leading-[14px] text-secondary">
                  {filteredRows.length} line item{filteredRows.length === 1 ? "" : "s"} shown for client review
                </p>
                {hiddenCollatedRowCount > 0 ? (
                  <div className="mt-1 flex flex-wrap items-center gap-2 text-[10px] leading-[14px] text-secondary">
                    <span>Showing {visibleCollatedRows.length} of {filteredRows.length} line items.</span>
                    <Button type="button" variant="ghost" size="sm" onClick={() => dispatchTabsState({ type: "collatedRowsExpanded", limit: collatedRowLimit + COLLATED_ROW_LIMIT })}>
                      Show more
                    </Button>
                    <Button type="button" variant="ghost" size="sm" onClick={() => dispatchTabsState({ type: "collatedRowsExpanded", limit: filteredRows.length })}>
                      Load all
                    </Button>
                  </div>
                ) : null}
              </div>
              <div className="flex min-w-0 flex-1 items-center gap-2 sm:max-w-[360px]">
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  className="shrink-0"
                  onClick={handleEstimateReview}
                >
                  Ask about estimate
                </Button>
                <input
                  type="search"
                  aria-label="Filter estimate rows"
                  value={activeGridSearch}
                  onChange={(event) => {
                    const next = event.target.value;
                    dispatchTabsState({ type: "gridSearchChanged", key: gridSearchKey || activeEstimate.id, value: next });
                  }}
                  placeholder="Filter rows"
                  className="h-8 min-w-0 flex-1 rounded-xs border border-hairline bg-white px-2 text-[10px] leading-[14px] text-ink outline-none placeholder:text-tertiary focus:bg-accentSoft"
                />
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-[760px] border-collapse text-left text-[10px] leading-[14px]">
                <thead className="bg-surfaceMuted text-[9px] text-secondary">
                  <tr>
                    <th className="w-[52px] border-r border-hairline px-2 py-2 font-medium">ITEM</th>
                    <th className="min-w-[240px] border-r border-hairline px-2 py-2 font-medium">PARTICULARS</th>
                    <th className="w-[72px] border-r border-hairline px-2 py-2 font-medium">UNIT</th>
                    <th className="w-[72px] border-r border-hairline px-2 py-2 text-right font-medium">QTY</th>
                    <th className="w-[126px] border-r border-hairline px-2 py-2 text-right font-medium">LINE TOTAL</th>
                    <th className="min-w-[120px] border-r border-hairline px-2 py-2 font-medium">CATEGORY</th>
                    <th className="min-w-[140px] px-2 py-2 font-medium">NOTES</th>
                  </tr>
                </thead>
                <tbody>
                  {visibleCollatedRows.length > 0 ? visibleCollatedRows.map((row, index) => {
                    const imageUrl = normalizePublicationImageUrl(row.imageUrl);
                    const isSelectedReviewTarget = selectedReviewTargetKey === `row:${row.id}`;

                    return (
                      <tr
                        key={row.id}
                        ref={(element) => {
                          collatedRowRefs.current[index] = element;
                        }}
                        tabIndex={index === 0 ? 0 : -1}
                        onClick={() => handleRowReview(row)}
                        onKeyDown={(event) => handleCollatedRowKeyDown(event, index)}
                        className={`group cursor-pointer border-t border-hairline outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-focus ${isSelectedReviewTarget ? "bg-surfaceMuted" : "hover:bg-surfaceMuted/60"}`}
                        data-review-target-selected={isSelectedReviewTarget ? "true" : undefined}
                      >
                        <td className="border-r border-hairline px-2 py-2 text-secondary">{index + 1}</td>
                        <td className="border-r border-hairline px-2 py-2 text-secondary">
                          <div className="flex items-start gap-2">
                            {imageUrl ? (
                              <div className="h-8 w-8 flex-shrink-0 overflow-hidden rounded-xs border border-hairline bg-surfaceMuted">
                                <Image
                                  src={imageUrl}
                                  alt=""
                                  width={32}
                                  height={32}
                                  className="h-full w-full object-cover"
                                  loading="lazy"
                                />
                              </div>
                            ) : null}
                            <div className="min-w-0">
                              <span className="block text-ink">{row.description}</span>
                              <span className="mt-0.5 block text-[10px] leading-[14px] text-secondary">
                                Qty {row.quantity} · {row.unit}
                              </span>
                              <span className="mt-1 block text-[9px] leading-[12px] text-tertiary opacity-0 transition-opacity group-hover:opacity-100 group-focus-within:opacity-100">
                                Select to ask a question
                              </span>
                            </div>
                          </div>
                        </td>
                        <td className="border-r border-hairline px-2 py-2 text-secondary">{row.unit}</td>
                        <td className="border-r border-hairline px-2 py-2 text-right tabular-nums text-secondary">{row.quantity}</td>
                        <td className="border-r border-hairline px-2 py-2 text-right tabular-nums font-medium text-ink">{formatMoney(row.rowTotal, currencyCode)}</td>
                        <td className="border-r border-hairline px-2 py-2 text-secondary">{row.discipline}</td>
                        <td className="px-2 py-2 text-secondary">{row.designation || row.material || "—"}</td>
                      </tr>
                    );
                  }) : (
                    <tr className="border-t border-hairline">
                      <td colSpan={7} className="px-3 py-4 text-center text-[10px] leading-[14px] text-secondary">
                        {`No rows match "${activeGridSearch.trim()}"`}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-0 lg:flex-row" ref={contentRef}>
            <details className="w-full border-b border-hairline bg-white lg:hidden">
              <summary className="cursor-pointer px-3 py-2 text-[11px] font-medium leading-[16px] text-ink">
                Browse estimate sections
              </summary>
              <div className="h-[360px] border-t border-hairline">
                <ShareEstimateTreePanel
                  nodes={treeNodes}
                  currencyCode={currencyCode}
                  showInlineRows={false}
                  onNavigate={handleTreeNavigate}
                />
              </div>
            </details>
            <ShareEstimateTreePanel
              nodes={treeNodes}
              currencyCode={currencyCode}
              showInlineRows={false}
              onNavigate={handleTreeNavigate}
              className="hidden lg:flex lg:w-[260px] lg:flex-shrink-0 border-r border-hairline"
            />
            <div className="min-w-0 flex-1">
              <ShareEstimateTreeView
                nodes={treeNodes}
                currencyCode={currencyCode}
                activeNodeId={undefined}
              />
            </div>
          </div>
        )}
      </div>
      </div>
      {renderPrintPackage ? <SharePrintEstimatePackage estimates={estimates} currencyCode={currencyCode} /> : null}
    </div>
  );
}
