"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";

import type { PublicationSnapshotEstimate } from "@/lib/publication/types";

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

  if (estimates.length === 0) return null;

  const activeEstimate = estimates.find((e) => e.id === activeId) ?? estimates[0];

  return (
    <div className="space-y-3">
      {/* Tablist — horizontal scroll + fade masks for mobile, design-system compliant */}
      <div className="relative">
        <div
          ref={scrollRef}
          role="tablist"
          aria-label="Estimate sheets"
          className="flex overflow-x-auto overflow-y-hidden border-b border-hairline bg-proposalPaper px-1 text-[10px] font-medium scrollbar-thin scrollbar-thumb-hairline"
          style={{ scrollbarWidth: "thin" }}
        >
          {estimates.map((estimate, index) => {
            const isActive = estimate.id === activeId;
            return (
              <button
                key={estimate.id}
                ref={(el) => {
                  tabRefs.current[index] = el;
                }}
                type="button"
                role="tab"
                aria-selected={isActive}
                aria-controls={`share-estimate-panel-${estimate.id}`}
                tabIndex={isActive ? 0 : -1}
                className={`min-h-7 flex-shrink-0 rounded-xs px-3 py-1 text-[10px] font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus ${
                  isActive
                    ? "border-b-2 border-ink text-ink"
                    : "text-tertiary hover:text-secondary hover:bg-surfaceMuted/40"
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
          className={`pointer-events-none absolute left-0 top-0 h-full w-6 bg-gradient-to-r from-proposalPaper to-transparent transition-opacity ${canScrollLeft ? "opacity-100" : "opacity-0"}`}
        />
        <div
          aria-hidden
          className={`pointer-events-none absolute right-0 top-0 h-full w-6 bg-gradient-to-l from-proposalPaper to-transparent transition-opacity ${canScrollRight ? "opacity-100" : "opacity-0"}`}
        />
      </div>

      {/* Active tab panel — encapsulates the original estimate card + table exactly */}
      <div
        id={`share-estimate-panel-${activeEstimate.id}`}
        role="tabpanel"
        aria-labelledby={`tab-${activeEstimate.id}`}
        className="border border-hairline bg-white"
      >
        <div className="flex items-center justify-between gap-3 border-b border-hairline px-3 py-2">
          <div>
            <h2 className="text-[12px] font-medium leading-4 text-ink">{activeEstimate.name}</h2>
            <p className="text-[10px] leading-3 text-tertiary">{activeEstimate.sheetCode}</p>
          </div>
          <p className="text-[12px] font-medium leading-4 text-ink">
            {formatMoney(activeEstimate.totalCost, currencyCode)}
          </p>
        </div>

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
                  <td className="px-3 py-2 text-secondary">{row.description}</td>
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
      </div>
    </div>
  );
}
