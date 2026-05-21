"use client";

import { useCallback, useRef, useState, type KeyboardEvent, type ReactNode } from "react";
import {
  ComponentLibraryPreview,
  EstimateWorkspacePreview,
  ProposalComparisonsPreview,
  RevisionIntelligencePreview,
} from "./ProductPreviewVariants";

const productTabs = [
  { id: "estimate-workspace", label: "Estimate Workspace", status: "MVP preview" },
  { id: "component-library", label: "Component Library", status: "MVP preview" },
  { id: "revision-intelligence", label: "Revision Intelligence", status: "Planned preview" },
  { id: "proposal-comparisons", label: "Proposal Comparisons", status: "Planned preview" },
] as const;

type ProductTabId = (typeof productTabs)[number]["id"];

const tabPanels: Record<ProductTabId, ReactNode> = {
  "estimate-workspace": <EstimateWorkspacePreview />,
  "component-library": <ComponentLibraryPreview />,
  "revision-intelligence": <RevisionIntelligencePreview />,
  "proposal-comparisons": <ProposalComparisonsPreview />,
};

export function ProductShowcaseSection() {
  const [activeTab, setActiveTab] = useState<ProductTabId>(productTabs[0].id);
  const tabRefs = useRef<(HTMLButtonElement | null)[]>([]);

  const selectTabAtIndex = useCallback((index: number) => {
    const nextTab = productTabs[index];

    if (!nextTab) return;

    setActiveTab(nextTab.id);
    tabRefs.current[index]?.focus();
  }, []);

  const handleKeyDown = useCallback(
    (event: KeyboardEvent<HTMLButtonElement>) => {
      const activeIndex = productTabs.findIndex((tab) => tab.id === activeTab);

      if (event.key === "ArrowRight") {
        event.preventDefault();
        selectTabAtIndex((activeIndex + 1) % productTabs.length);
        return;
      }

      if (event.key === "ArrowLeft") {
        event.preventDefault();
        selectTabAtIndex((activeIndex - 1 + productTabs.length) % productTabs.length);
        return;
      }

      if (event.key === "Home") {
        event.preventDefault();
        selectTabAtIndex(0);
        return;
      }

      if (event.key === "End") {
        event.preventDefault();
        selectTabAtIndex(productTabs.length - 1);
      }
    },
    [activeTab, selectTabAtIndex]
  );

  return (
    <section
      id="product"
      data-landing-snap-section="true"
      className="scroll-mt-[68px] bg-[#eeeeec] px-4 py-16 sm:px-6 sm:py-24 lg:px-8"
    >
      <div className="mx-auto w-full max-w-[1120px] border-t border-[#dedbd6] pt-7">
        <div
          role="tablist"
          aria-label="Product features"
          className="grid gap-3 text-[12px] font-semibold text-[#8c8a86] md:grid-cols-4"
        >
          {productTabs.map((tab, index) => {
            const isSelected = activeTab === tab.id;

            return (
              <button
                key={tab.id}
                ref={(element) => {
                  tabRefs.current[index] = element;
                }}
                type="button"
                role="tab"
                aria-label={tab.label}
                aria-selected={isSelected}
                aria-controls={`panel-${tab.id}`}
                id={`tab-${tab.id}`}
                tabIndex={isSelected ? 0 : -1}
                onClick={() => setActiveTab(tab.id)}
                onKeyDown={handleKeyDown}
                className={`flex min-h-14 flex-col gap-1 border-b pb-3 text-left transition outline-none focus-visible:ring-2 focus-visible:ring-[#ff7a1a] focus-visible:ring-offset-2 motion-reduce:transition-none ${
                  isSelected
                    ? "border-[#111111] text-[#111111]"
                    : "border-[#dedbd6] hover:text-[#111111]"
                }`}
              >
                <span>{tab.label}</span>
                <span
                  aria-hidden="true"
                  className={`w-fit rounded-full px-2 py-0.5 font-mono text-[9px] font-semibold uppercase tracking-[0.08em] ${
                    tab.status === "Planned preview"
                      ? "bg-[#ff5600]/10 text-[#9d3900]"
                      : "bg-[#111111]/5 text-[#626260]"
                  }`}
                >
                  {tab.status}
                </span>
              </button>
            );
          })}
        </div>

        <div className="mt-8">
          {productTabs.map((tab) => {
            const isSelected = activeTab === tab.id;

            return (
              <div
                key={tab.id}
                id={`panel-${tab.id}`}
                role="tabpanel"
                aria-labelledby={`tab-${tab.id}`}
                hidden={!isSelected}
                className="rounded-[14px] bg-white p-2 shadow-[0_18px_46px_rgba(17,17,17,0.055)] transition-opacity duration-300 motion-reduce:transition-none"
              >
                {tabPanels[tab.id]}
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
