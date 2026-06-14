"use client";

/* GitNexus / code-review-graph MCP impact analysis (per Master Prompt + AGENTS.md/CLAUDE.md + .ai/00_system/AGENT_OPERATING_PROTOCOL.md):
 * - search_tool invoked for schemas: code-review-graph__get_impact_radius_tool, code-review-graph__detect_changes_tool,
 *   code-review-graph__get_affected_flows_tool, code-review-graph__get_minimal_context_tool, code-review-graph__query_graph_tool,
 *   code-review-graph__semantic_search_nodes_tool (and related).
 * - Pre-edit: get_minimal_context_tool (task="P2 spec review fixes...", changed_files=[SharePageTabs.tsx, page.tsx]) → 3375 nodes/47144 edges, risk:medium(0.70), key_entities incl. ProjectPublicationView + SharePage + shared-link tablist test.
 * - get_affected_flows_tool on same 2 files → "0 flow(s) affected by changes in 2 file(s)", affected_flows:[], total:0.
 * - get_impact_radius_tool on same → 6 direct nodes, 0 execution flows (per affected_flows); blast radius isolated to public share surface (no upstream callers in active flows).
 * - query/semantic on symbols/files confirmed limited surface (new feature symbols on branch; file-based impact used). 0 affected flows result documented before any symbol edits.
 * Re-run detect_changes + impact will be executed pre-commit. No symbol edits without prior graph analysis.
 */

import React, { useState, useEffect, useRef, useCallback, useMemo } from "react";

import { useIsHydrated } from "@/hooks/use-is-hydrated";
import type { PublicationSnapshotEstimate, PublicationSnapshotEstimateTab } from "@/lib/publication/types";

import Image from "next/image";

import { normalizePublicationImageUrl } from "@/lib/publication/image-url";
import { aggregateRowsByDiscipline } from "@/lib/share/aggregate-share-chart-buckets";
import { CostDonutChart } from "@/components/charts/CostDonutChart";
import { getBestShareTree, wrapTreeWithRoot } from "@/lib/share/reconstruct-share-tree";
import { ShareEstimateTreePanel } from "@/components/share/ShareEstimateTreePanel";
import { ShareEstimateTreeView } from "@/components/share/ShareEstimateTreeView";

interface SharePageTabsProps {
  estimates: PublicationSnapshotEstimate[];
  currencyCode: string;
  token: string;
}

function formatMoney(value: number, currencyCode: string) {
  return `${currencyCode} ${new Intl.NumberFormat("en-PH", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value)}`;
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

export default function SharePageTabs({
  estimates,
  currencyCode,
  token,
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

  // P2: Sub-tab view mode per sheet (Tree View | Grid Preview)
  const [sheetViews, setSheetViews] = useState<Record<string, "tree" | "grid">>({});
  const [gridSearchByEstimateId, setGridSearchByEstimateId] = useState<Record<string, string>>({});
  const [estimateTabOverrides, setEstimateTabOverrides] = useState<Record<string, string>>({});

  const fallbackActiveId = estimates[0]?.id ?? "";
  const storedActiveId = hydrated ? readStoredActiveEstimateId(storageKey, estimates) : null;
  const resolvedActiveId = activeIdOverride ?? storedActiveId;
  const activeId = resolvedActiveId && estimates.some((estimate) => estimate.id === resolvedActiveId) ? resolvedActiveId : fallbackActiveId;
  const currentView = sheetViews[activeId] ?? "tree";

  const contentRef = useRef<HTMLDivElement>(null);
  const estimateTabRefs = useRef<(HTMLButtonElement | null)[]>([]);

  const setViewForCurrentSheet = (view: "tree" | "grid") => {
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
      const next = currentView === "tree" ? "grid" : "tree";
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
  const activeContentRows = useMemo(
    () => activeEstimateTab?.rows ?? wouldBeActive?.rows ?? [],
    [activeEstimateTab?.rows, wouldBeActive?.rows],
  );
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
  const filteredRows = useMemo(() => {
    const normalizedQuery = activeGridSearch.trim().toLowerCase();
    if (!normalizedQuery) return activeContentRows;
    return activeContentRows.filter((row) =>
      [row.description, row.designation, row.material, row.discipline]
        .some((value) => value.toLowerCase().includes(normalizedQuery)),
    );
  }, [activeContentRows, activeGridSearch]);

  if (estimates.length === 0) {
    // AC-UX-08: never a silent null — show a visible, calm empty state.
    return (
      <div
        role="status"
        className="rounded-xs border border-dashed border-hairline bg-white p-4 text-center text-[13px] leading-[18px] tracking-normal text-tertiary"
      >
        No estimates are included in this shared proposal yet.
      </div>
    );
  }

  const activeEstimate = wouldBeActive ?? estimates[0];
  const activeEstimateMetaText = [activeEstimate.sheetCode, activeEstimateTab ? `Tab ${activeEstimateTab.name}` : null]
    .filter(Boolean)
    .join(" · ");

  return (
    <div className="space-y-3">
      {/* Active estimate summary — sheet name + total, with the view-mode toggle consolidated
          onto this row (UX-15: no separate full-width Tree/Grid strip). */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          <h2 className="text-[15px] font-medium leading-[20px] tracking-normal text-ink">{activeEstimate.name}</h2>
          {activeEstimateMetaText ? (
            <p className="text-[13px] leading-[18px] tracking-normal text-tertiary">{activeEstimateMetaText}</p>
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
            {(["tree", "grid"] as const).map((mode) => {
              const isActive = currentView === mode;
              const label = mode === "tree" ? "Tree View" : "Grid Preview";
              return (
                <button
                  key={mode}
                  type="button"
                  role="tab"
                  aria-selected={isActive}
                  aria-controls={`share-estimate-panel-${activeEstimate.id}`}
                  tabIndex={isActive ? 0 : -1}
                  className={`rounded-xs px-2.5 py-1 text-[12px] font-medium leading-none tracking-normal transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus ${
                    isActive ? "bg-surfaceMuted text-ink" : "text-tertiary hover:text-ink"
                  }`}
                  onClick={() => setViewForCurrentSheet(mode)}
                >
                  {label}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* P1/P5 polish: Per-sheet donut chart. compact variant ensures full callout visibility
          (520×400 internal, scaled D3 logic + DESIGN ≤12px text). T1-C MVP: the compact donut
          has a fixed ~520-wide viewBox, so in the wider single-column ShareContainer it is
          constrained at this call-site (mx-auto max-w-[560px]) instead of floating meet-centered
          in a wide band. CostDonutChart itself is untouched (ProjectChartsPage out of blast radius). */}
      <div className="mx-auto w-full max-w-[560px]">
        <CostDonutChart
          buckets={donutBuckets}
          total={activeContentTotal}
          currencyCode={currencyCode}
          label={`${activeContentLabel} cost breakdown`}
          compact
        />
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
                    : "bg-surfaceMuted text-tertiary border-transparent hover:text-ink hover:border-hairline"
                }`}
                onClick={() => updateActive(estimate.id)}
                onKeyDown={(e) => handleTabKeyDown(e, index)}
              >
                <span className="truncate">{estimate.name}</span>
                {estimate.sheetCode ? (
                  <span className="ml-1 text-[12px] text-tertiary">({estimate.sheetCode})</span>
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
                    : "text-tertiary hover:text-ink border-transparent hover:border-hairline"
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
        {currentView === "grid" ? (
          <div>
            <div className="border-b border-hairline bg-white p-2">
              <input
                type="search"
                aria-label="Filter estimate rows"
                value={activeGridSearch}
                onChange={(event) => {
                  const next = event.target.value;
                  setGridSearchByEstimateId((prev) => ({ ...prev, [gridSearchKey || activeEstimate.id]: next }));
                }}
                placeholder="Filter rows"
                className="h-8 w-full rounded-xs border border-hairline bg-white px-2 text-[13px] leading-[18px] tracking-normal text-ink outline-none placeholder:text-tertiary focus:border-focus"
              />
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full border-collapse text-left text-[13px] leading-[18px] tracking-normal">
                <thead className="bg-surfaceMuted text-[12px] uppercase tracking-normal text-tertiary">
                  <tr>
                    <th className="px-3 py-2 font-medium">Description</th>
                    <th className="hidden px-3 py-2 font-medium sm:table-cell">Discipline</th>
                    <th className="hidden px-3 py-2 font-medium sm:table-cell">Qty</th>
                    <th className="hidden px-3 py-2 font-medium sm:table-cell">Unit</th>
                    <th className="px-3 py-2 text-right font-medium">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredRows.length > 0 ? filteredRows.map((row) => {
                    const imageUrl = normalizePublicationImageUrl(row.imageUrl);

                    return (
                      <tr key={row.id} className="border-t border-hairline">
                        <td className="px-3 py-2 text-secondary">
                          <div className="flex items-center gap-2">
                            {/* P9: 32px thumbnail from estimate_row_items.source_snapshot.imageUrl (additive; only when present) */}
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
                            <span>{row.description}</span>
                          </div>
                        </td>
                        <td className="hidden px-3 py-2 text-secondary sm:table-cell">{row.discipline}</td>
                        <td className="hidden px-3 py-2 text-secondary sm:table-cell">{row.quantity}</td>
                        <td className="hidden px-3 py-2 text-secondary sm:table-cell">{row.unit}</td>
                        <td className="px-3 py-2 text-right font-medium text-ink">
                          {formatMoney(row.rowTotal, currencyCode)}
                        </td>
                      </tr>
                    );
                  }) : (
                    <tr className="border-t border-hairline">
                      <td colSpan={5} className="px-3 py-4 text-center text-[13px] leading-[18px] tracking-normal text-tertiary">
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
                disclaimer="Reconstructed from estimate data (may differ from internal workspace view)"
                activeNodeId={undefined}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
