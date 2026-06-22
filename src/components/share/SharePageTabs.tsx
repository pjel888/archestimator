"use client";

import React, { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { flushSync } from "react-dom";

import { useIsHydrated } from "@/hooks/use-is-hydrated";
import type { PublicationSnapshotEstimate, PublicationSnapshotEstimateTab, PublicationSnapshotRow } from "@/lib/publication/types";

import Image from "next/image";

import { normalizePublicationImageUrl } from "@/lib/publication/image-url";
import { aggregateRowsByDiscipline } from "@/lib/share/aggregate-share-chart-buckets";
import { CostDonutChart } from "@/components/charts/CostDonutChart";
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

function formatMoney(value: number, currencyCode: string) {
  return `${currencyCode} ${new Intl.NumberFormat("en-PH", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value)}`;
}

function formatSharePercent(share: number) {
  return new Intl.NumberFormat("en-PH", {
    style: "percent",
    maximumFractionDigits: 0,
  }).format(Number.isFinite(share) ? share : 0);
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
  return [...(estimate?.tabs ?? [])].sort((a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name) || a.id.localeCompare(b.id));
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

export default function SharePageTabs({
  estimates,
  currencyCode,
  token,
  onReviewTargetChange,
}: SharePageTabsProps) {
  const storageKey = `share-tab:${token}`;
  const hydrated = useIsHydrated();
  // The persisted active tab lives in sessionStorage, which only exists in the
  // browser. Reading it during the lazy useState initializer made the first
  // client render (the stored tab) diverge from the server render (which always
  // falls back to estimates[0]) → hydration mismatch on the tablist + panel.
  // Start from `null` (server-identical) and fold the stored value in only after
  // hydration, while still letting an explicit user selection take precedence.
  const [activeIdOverride, setActiveIdOverride] = useState<string | null>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  // P2: Sub-tab view mode per sheet (Tree View | Collated View)
  const [sheetViews, setSheetViews] = useState<Record<string, "tree" | "collated">>({});
  const [gridSearchByEstimateId, setGridSearchByEstimateId] = useState<Record<string, string>>({});
  const [estimateTabOverrides, setEstimateTabOverrides] = useState<Record<string, string>>({});
  const [renderPrintPackage, setRenderPrintPackage] = useState(false);
  const [selectedReviewTargetKey, setSelectedReviewTargetKey] = useState<string | null>(null);

  const fallbackActiveId = estimates[0]?.id ?? "";
  const storedActiveId = hydrated ? readStoredActiveEstimateId(storageKey, estimates) : null;
  const resolvedActiveId = activeIdOverride ?? storedActiveId;
  const activeId = resolvedActiveId && estimates.some((estimate) => estimate.id === resolvedActiveId) ? resolvedActiveId : fallbackActiveId;
  const currentView = sheetViews[activeId] ?? "tree";

  const contentRef = useRef<HTMLDivElement>(null);
  const estimateTabRefs = useRef<(HTMLButtonElement | null)[]>([]);

  const setViewForCurrentSheet = (view: "tree" | "collated") => {
    if (activeId) {
      setSheetViews(prev => ({ ...prev, [activeId]: view }));
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

  // Persist on change
  const updateActive = useCallback(
    (id: string) => {
      if (!id || id === activeId) return;
      setActiveIdOverride(id);
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

  // Update scroll fade indicators (lightweight, on mount + scroll)
  const updateScrollFades = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    const { scrollLeft, scrollWidth, clientWidth } = el;
    setCanScrollLeft(scrollLeft > 2);
    setCanScrollRight(scrollLeft + clientWidth < scrollWidth - 2);
  }, []);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    updateScrollFades();
    el.addEventListener("scroll", updateScrollFades, { passive: true });
    window.addEventListener("resize", updateScrollFades);
    return () => {
      el.removeEventListener("scroll", updateScrollFades);
      window.removeEventListener("resize", updateScrollFades);
    };
  }, [updateScrollFades, estimates.length]);

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
      setEstimateTabOverrides((prev) => ({ ...prev, [wouldBeActive.id]: id }));
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

  const donutBuckets = useMemo(
    () => aggregateRowsByDiscipline(activeContentRows),
    [activeContentRows]
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
  const visibleCollatedRows = filteredRows.slice(0, COLLATED_ROW_LIMIT);
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
    setSelectedReviewTargetKey(`estimate:${target.estimateId ?? activeEstimate.id}`);
    onReviewTargetChange?.(target);
  }, [activeEstimate.id, createEstimateReviewTarget, onReviewTargetChange]);

  const handleRowReview = useCallback(
    (row: (typeof activeContentRows)[number]) => {
      const target = createRowReviewTarget(row);
      setSelectedReviewTargetKey(`row:${row.id}`);
      onReviewTargetChange?.(target);
    },
    [createRowReviewTarget, onReviewTargetChange],
  );

  useEffect(() => {
    const showPrintPackage = () => {
      flushSync(() => setRenderPrintPackage(true));
    };
    const hidePrintPackage = () => {
      setRenderPrintPackage(false);
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
      <div
        role="status"
        className="rounded-xs border border-dashed border-hairline bg-white p-4 text-center text-[13px] leading-[18px] tracking-normal text-secondary"
      >
        No estimates are included in this shared proposal yet.
      </div>
    );
  }

  const activeEstimateMetaText = [activeEstimate?.sheetCode, activeEstimateTab ? `Tab ${activeEstimateTab.name}` : null]
    .filter(Boolean)
    .join(" · ");
  const costBreakdownId = `share-cost-breakdown-${activeEstimate.id}`;

  return (
    <div className="space-y-3">
      <div className="share-print-screen-only space-y-3">
      {/* Active estimate summary — sheet name + total, with the view-mode toggle consolidated
          onto this row (UX-15: no separate full-width Tree/Grid strip). */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          <h2 className="text-[15px] font-medium leading-[20px] tracking-normal text-ink">{activeEstimate?.name}</h2>
          {activeEstimateMetaText ? (
            <p className="text-[13px] leading-[18px] tracking-normal text-secondary">{activeEstimateMetaText}</p>
          ) : null}
        </div>
        <div className="flex items-center justify-between gap-3 sm:justify-end">
          <p className="text-[15px] font-medium leading-[20px] tracking-normal text-ink">
            {formatMoney(activeContentTotal, currencyCode)}
          </p>
          <div
            role="tablist"
            aria-label="Estimate view mode"
            className="flex items-center gap-0 rounded-xs border border-hairline bg-white"
            onKeyDown={handleSubTabKeyDown}
          >
            {(["tree", "collated"] as const).map((mode) => {
              const isActive = currentView === mode;
              const label = mode === "tree" ? "Scope outline" : "Line item table";
              return (
                <button
                  key={mode}
                  type="button"
                  role="tab"
                  aria-selected={isActive}
                  aria-controls={`share-estimate-panel-${activeEstimate.id}`}
                  tabIndex={isActive ? 0 : -1}
                  className={`rounded-xs px-2.5 py-1 text-[12px] font-medium leading-none tracking-normal transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus ${
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

      {/* The receiver surface is often 320-390px wide inside email/browser chrome. The full
          callout donut is kept for workshop charts; here the ring stays clean and this adjacent
          list carries the readable client-facing labels. */}
      <div className="mx-auto grid w-full max-w-[560px] gap-3 sm:grid-cols-[190px_minmax(0,1fr)] sm:items-center" data-share-cost-breakdown>
        <CostDonutChart
          buckets={donutBuckets}
          total={activeContentTotal}
          currencyCode={currencyCode}
          label={`${activeContentLabel} cost breakdown`}
          compact
          hideCallouts
          describedById={costBreakdownId}
        />
        <ul
          id={costBreakdownId}
          aria-label={`${activeContentLabel} cost breakdown`}
          className="grid gap-1 rounded-xs border border-hairline bg-white p-2 text-[12px] leading-[16px] tracking-normal"
          data-share-cost-breakdown-list
        >
          {donutBuckets.map((bucket) => (
            <li key={bucket.id} className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-x-2 gap-y-0.5">
              <span className="flex min-w-0 items-center gap-1.5 text-ink">
                <span
                  aria-hidden="true"
                  className="size-2 flex-none rounded-xs"
                  style={{ backgroundColor: bucket.color }}
                />
                <span className="truncate">{bucket.label}</span>
              </span>
              <span className="text-right tabular-nums text-secondary">{formatSharePercent(bucket.share)}</span>
              <span className="col-start-2 text-right tabular-nums text-ink">{formatMoney(bucket.total, currencyCode)}</span>
            </li>
          ))}
        </ul>
      </div>

      {/* Tablist — horizontal scroll + fade masks for mobile, design-system compliant */}
      <div className="relative">
        <div
          ref={scrollRef}
          role="tablist"
          aria-label="Estimates"
          className="flex h-[34px] items-end gap-0 overflow-x-auto overflow-y-hidden border-b border-hairline bg-surfaceMuted text-[11px] font-medium scrollbar-thin scrollbar-thumb-hairline"
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
                className={`relative h-full flex-shrink-0 min-w-0 truncate rounded-xs border border-b-0 px-3 text-[13px] font-medium leading-none tracking-normal transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus ${
                  isActive
                    ? "z-10 bg-white text-ink border-hairline -mb-px"
                    : "bg-surfaceMuted text-secondary border-transparent hover:text-ink hover:border-hairline"
                }`}
                onClick={() => updateActive(estimate.id)}
                onKeyDown={(e) => handleTabKeyDown(e, index)}
              >
                <span className="truncate">{estimate.name}</span>
                {estimate.sheetCode ? (
                  <span className="ml-1 text-[12px] text-secondary">({estimate.sheetCode})</span>
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
          className="flex h-8 items-center gap-0 overflow-x-auto border-b border-hairline bg-white text-[13px] font-medium tracking-normal"
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
                className={`h-full flex-shrink-0 rounded-xs border px-3 text-[13px] font-medium leading-none tracking-normal transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus ${
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
                <h3 className="text-[13px] font-medium leading-[18px] tracking-normal text-ink">Line item table</h3>
                <p className="text-[12px] leading-[16px] tracking-normal text-secondary">
                  {filteredRows.length} line item{filteredRows.length === 1 ? "" : "s"} shown for client review
                </p>
                {hiddenCollatedRowCount > 0 ? (
                  <p role="status" className="mt-1 text-[12px] leading-[16px] tracking-normal text-secondary">
                    Showing first {COLLATED_ROW_LIMIT} of {filteredRows.length} line items. Filter rows to narrow the table.
                  </p>
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
                    setGridSearchByEstimateId((prev) => ({ ...prev, [gridSearchKey || activeEstimate.id]: next }));
                  }}
                  placeholder="Filter rows"
                  className="h-8 min-w-0 flex-1 rounded-xs border border-hairline bg-white px-2 text-[13px] leading-[18px] tracking-normal text-ink outline-none placeholder:text-tertiary focus:border-focus"
                />
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-[760px] border-collapse text-left text-[12px] leading-[16px] tracking-normal">
                <thead className="bg-surfaceMuted text-[11px] uppercase tracking-normal text-secondary">
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
                        className={`border-t border-hairline ${isSelectedReviewTarget ? "bg-surfaceMuted" : ""}`}
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
                              <span className="mt-0.5 block text-[12px] leading-[16px] text-secondary">
                                Qty {row.quantity} · {row.unit}
                              </span>
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                className="mt-1 min-h-8 px-2"
                                aria-pressed={isSelectedReviewTarget}
                                aria-label={`Ask about item: ${row.description || row.material || "line item"}`}
                                onClick={() => handleRowReview(row)}
                              >
                                Ask about item
                              </Button>
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
                      <td colSpan={7} className="px-3 py-4 text-center text-[13px] leading-[18px] tracking-normal text-secondary">
                        {`No rows match "${activeGridSearch.trim()}"`}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          <div className="flex gap-0" ref={contentRef}>
            <ShareEstimateTreePanel
              nodes={treeNodes}
              currencyCode={currencyCode}
              showInlineRows={false}
              onNavigate={handleTreeNavigate}
              className="hidden lg:flex lg:w-[260px] lg:flex-shrink-0 border-r border-hairline"
            />
            <div className="flex-1 min-w-0">
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
