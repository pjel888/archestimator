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

import type { PublicationSnapshotEstimate } from "@/lib/publication/types";

import Image from "next/image";

import { aggregateRowsByDiscipline } from "@/lib/share/aggregate-share-chart-buckets";
import { CostDonutChart } from "@/components/charts/CostDonutChart";
import { reconstructTreeFromRows } from "@/lib/share/reconstruct-share-tree";
import { ShareEstimateTreeView } from "@/components/share/ShareEstimateTreeView";
import { ShareFloatingTreeNav } from "@/components/share/ShareFloatingTreeNav";

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

export default function SharePageTabs({
  estimates,
  currencyCode,
  token,
}: SharePageTabsProps) {
  const [activeId, setActiveId] = useState<string>(() => estimates[0]?.id ?? "");
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  // P2: Sub-tab view mode per sheet (Tree View | Grid Preview)
  const [sheetViews, setSheetViews] = useState<Record<string, "tree" | "grid">>({});

  const currentView = sheetViews[activeId] ?? "tree";

  const setViewForCurrentSheet = (view: "tree" | "grid") => {
    if (activeId) {
      setSheetViews(prev => ({ ...prev, [activeId]: view }));
    }
  };

  const handleSubTabKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowLeft" || e.key === "ArrowRight") {
      e.stopPropagation(); // CRITICAL: isolate from main tab bar roving
      const next = currentView === "tree" ? "grid" : "tree";
      setViewForCurrentSheet(next);
    }
  };

  const tabRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const scrollRef = useRef<HTMLDivElement>(null);

  const storageKey = `share-tab:${token}`;

  // Restore from sessionStorage (or default first)
  useEffect(() => {
    if (typeof window === "undefined" || estimates.length === 0) return;
    try {
      const saved = window.sessionStorage.getItem(storageKey);
      if (saved && estimates.some((e) => e.id === saved)) {
        setActiveId(saved);
      } else {
        setActiveId(estimates[0].id);
      }
    } catch {
      setActiveId(estimates[0].id);
    }
  }, [storageKey, estimates]);

  // Persist on change
  const updateActive = useCallback(
    (id: string) => {
      if (!id || id === activeId) return;
      setActiveId(id);
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

  const donutBuckets = useMemo(
    () => (wouldBeActive ? aggregateRowsByDiscipline(wouldBeActive.rows) : []),
    [wouldBeActive]
  );

  const treeNodes = useMemo(
    () => (wouldBeActive ? reconstructTreeFromRows(wouldBeActive.rows) : []),
    [wouldBeActive]
  );

  if (estimates.length === 0) return null;

  const activeEstimate = wouldBeActive ?? estimates[0];

  return (
    <div className="space-y-3">
      {/* Active estimate summary — shows current sheet name + total above tabs */}
      <div className="flex items-end justify-between gap-3">
        <div>
          <h2 className="text-[12px] font-medium leading-4 text-ink">{activeEstimate.name}</h2>
          {activeEstimate.sheetCode ? (
            <p className="text-[10px] leading-3 text-tertiary">{activeEstimate.sheetCode}</p>
          ) : null}
        </div>
        <p className="text-[12px] font-medium leading-4 text-ink">
          {formatMoney(activeEstimate.totalCost, currencyCode)}
        </p>
      </div>

      {/* P1/P5 polish: Per-sheet donut chart. compact variant ensures full callout visibility
          (520×400 internal, scaled D3 logic + DESIGN ≤12px text) in the flex-1 + lg sidebar
          layout without clipping or excessive page scroll. Workshop charts unchanged. */}
      <CostDonutChart
        buckets={donutBuckets}
        total={activeEstimate.totalCost}
        currencyCode={currencyCode}
        label={`${activeEstimate.name} cost breakdown`}
        compact
      />

      {/* Tablist — horizontal scroll + fade masks for mobile, design-system compliant */}
      <div className="relative">
        <div
          ref={scrollRef}
          role="tablist"
          aria-label="Estimate sheets"
          className="flex h-[32px] items-end gap-0 overflow-x-auto overflow-y-hidden border-b border-hairline bg-surfaceMuted text-[10px] font-medium scrollbar-thin scrollbar-thumb-hairline"
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
                className={`relative h-full flex-shrink-0 min-w-0 truncate rounded-xs border border-b-0 px-3 text-[10px] font-medium leading-none transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus ${
                  isActive
                    ? "z-10 bg-white text-ink border-hairline -mb-px"
                    : "bg-surfaceMuted text-tertiary border-transparent hover:text-ink hover:border-hairline"
                }`}
                onClick={() => updateActive(estimate.id)}
                onKeyDown={(e) => handleTabKeyDown(e, index)}
              >
                <span className="truncate">{estimate.name}</span>
                {estimate.sheetCode ? (
                  <span className="ml-1 text-[9px] text-tertiary">({estimate.sheetCode})</span>
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

      {/* P2: Sub-tab bar (Tree View | Grid Preview) — below main tabs, above content */}
      <div
        role="tablist"
        aria-label="Estimate view mode"
        className="flex h-7 items-center gap-0 border-b border-hairline bg-white text-[10px] font-medium"
        onKeyDown={handleSubTabKeyDown}
      >
        {(["tree", "grid"] as const).map((mode) => {
          const isActive = currentView === mode;
          const label = mode === "tree" ? "Tree View" : "Grid Preview";
          return (
            <button
              key={mode}
              role="tab"
              aria-selected={isActive}
              aria-controls={`view-${mode}-${activeEstimate.id}`}
              tabIndex={isActive ? 0 : -1}
              className={`px-3 py-0.5 rounded-xs border transition-colors ${
                isActive
                  ? "bg-surfaceMuted text-ink border-hairline"
                  : "text-tertiary hover:text-ink border-transparent hover:border-hairline"
              }`}
              onClick={() => setViewForCurrentSheet(mode)}
            >
              {label}
            </button>
          );
        })}
      </div>

      {/* Active tab panel — encapsulates the original estimate card + table exactly */}
      <div
        id={`share-estimate-panel-${activeEstimate.id}`}
        role="tabpanel"
        aria-labelledby={`tab-${activeEstimate.id}`}
        className="border border-hairline bg-white"
      >
        {currentView === "grid" ? (
          <div className="overflow-x-auto">
            <table className="min-w-full border-collapse text-left text-[10px] leading-4">
            <thead className="bg-surfaceMuted text-[9px] uppercase text-tertiary">
              <tr>
                <th className="px-3 py-2 font-medium">Description</th>
                <th className="px-3 py-2 font-medium">Discipline</th>
                <th className="px-3 py-2 font-medium">Qty</th>
                <th className="px-3 py-2 font-medium">Unit</th>
                <th className="px-3 py-2 text-right font-medium">Total</th>
              </tr>
            </thead>
            <tbody>
              {activeEstimate.rows.map((row) => (
                <tr key={row.id} className="border-t border-hairline">
                  <td className="px-3 py-2 text-secondary">
                    <div className="flex items-center gap-2">
                      {/* P9: 32px thumbnail from estimate_row_items.source_snapshot.imageUrl (additive; only when present) */}
                      {row.imageUrl ? (
                        <div className="h-8 w-8 flex-shrink-0 overflow-hidden rounded-xs border border-hairline bg-surfaceMuted">
                          <Image
                            src={row.imageUrl}
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
                  <td className="px-3 py-2 text-secondary">{row.discipline}</td>
                  <td className="px-3 py-2 text-secondary">{row.quantity}</td>
                  <td className="px-3 py-2 text-secondary">{row.unit}</td>
                  <td className="px-3 py-2 text-right font-medium text-ink">
                    {formatMoney(row.rowTotal, currencyCode)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        ) : (
          <div className="flex gap-2 lg:gap-3">
            {/* P4: Floating navigation tree (desktop only, hidden in Grid mode via parent conditional) */}
            <ShareFloatingTreeNav nodes={treeNodes} />

            <div className="flex-1 min-w-0">
              <ShareEstimateTreeView
                nodes={treeNodes}
                currencyCode={currencyCode}
                disclaimer="Reconstructed from estimate data (may differ from internal workspace view)"
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
