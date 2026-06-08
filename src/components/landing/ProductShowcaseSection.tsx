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
      className="scroll-mt-[68px] border-b border-[#ebe4dc] bg-[#f7f1ea] px-6 py-20 sm:px-8 sm:py-28 lg:px-12"
    >
      <div className="mx-auto w-full max-w-[1952px]">
        <div className="mb-12 grid gap-6 lg:grid-cols-[minmax(0,0.92fr)_minmax(320px,0.58fr)] lg:items-end">
          <div>
            <p className="text-[12px] font-semibold text-brand-orange">
              Platform method
            </p>
            <h2 className="mt-4 max-w-[760px] text-[42px] font-normal leading-[1.06] tracking-normal text-[#171514] sm:text-[58px]">
              The Archestimator estimate residency
            </h2>
          </div>
          <p className="max-w-[500px] text-[15px] leading-7 text-[#5f554d]">
            A structured workspace for training your own estimate logic: the project tree, reusable library, revision memory, and proposal path all stay visible as the quote matures.
          </p>
        </div>

        <div
          role="tablist"
          aria-label="Product features"
          className="grid gap-3 text-[12px] font-semibold text-[#87796f] md:grid-cols-4"
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
                className={`flex min-h-14 flex-col gap-1 border-b pb-3 text-left transition outline-none focus-visible:ring-2 focus-visible:ring-brand-orange focus-visible:ring-offset-2 motion-reduce:transition-none ${
                  isSelected
                    ? "border-[#171514] text-[#171514]"
                    : "border-[#ded2c7] hover:text-[#171514]"
                }`}
              >
                <span>{tab.label}</span>
                <span
                  aria-hidden="true"
                  className={`w-fit rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                    tab.status === "Planned preview"
                      ? "bg-brand-orange/10 text-brand-orange-dark"
                      : "bg-[#171514]/5 text-[#625950]"
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
                className="rounded-[8px] border border-[#ded2c7] bg-white p-2 shadow-[0_18px_46px_rgba(71,49,31,0.07)] transition-opacity duration-300 motion-reduce:transition-none"
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
