"use client";

import { useCallback, useRef, useState, type KeyboardEvent, type ReactNode } from "react";
import { Check, Clock } from "@phosphor-icons/react/dist/ssr";
import { MotionReveal } from "./MotionReveal";
import {
  ComponentLibraryPreview,
  EstimateWorkspacePreview,
  ProposalComparisonsPreview,
  RevisionIntelligencePreview,
} from "./ProductPreviewVariants";

const productTabs = [
  { id: "estimate-workspace", label: "Estimate workspace", status: "live" },
  { id: "component-library", label: "Component library", status: "live" },
  { id: "revision-intelligence", label: "Revision history", status: "planned" },
  { id: "proposal-comparisons", label: "Proposal comparison", status: "planned" },
] as const;

type ProductTabId = (typeof productTabs)[number]["id"];

const tabPanels: Record<ProductTabId, ReactNode> = {
  "estimate-workspace": <EstimateWorkspacePreview />,
  "component-library": <ComponentLibraryPreview />,
  "revision-intelligence": <RevisionIntelligencePreview />,
  "proposal-comparisons": <ProposalComparisonsPreview />,
};

/* Status chips pair a glyph with text — never color-only. Both read as
   light hairline chips on the petrol surface. */
function TabStatusChip({ status }: { status: "live" | "planned" }) {
  return (
    <span
      aria-hidden="true"
      className="inline-flex w-fit items-center gap-1.5 rounded-[3px] border border-[#f4efe9]/25 px-2 py-0.5 text-[10px] font-semibold text-[#d9d2c7]"
    >
      {status === "live" ? (
        <Check size={11} aria-hidden="true" />
      ) : (
        <Clock size={11} aria-hidden="true" />
      )}
      {status === "live" ? "Live in beta" : "Planned"}
    </span>
  );
}

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
      className="scroll-mt-[68px] bg-brand-petrol px-6 py-24 sm:px-8 sm:py-32 lg:px-12"
    >
      <div className="mx-auto w-full max-w-[1952px]">
        <MotionReveal>
          <div className="mb-12 grid gap-6 lg:grid-cols-[minmax(0,0.92fr)_minmax(320px,0.58fr)] lg:items-end">
            <div>
              <p className="text-[12px] font-semibold text-[#b9c6c9]">
                Inside the workspace
              </p>
              {/* Light text on petrol: +0.05 line-height over the utility default
                  (1.08 -> 1.13). Inline style because the landing typography
                  utilities are unlayered and outrank layered Tailwind classes. */}
              <h2
                className="landing-headline-lg mt-4 max-w-[760px] text-[#f4efe9]"
                style={{ lineHeight: 1.13 }}
              >
                A structured workspace for the whole quote.
              </h2>
            </div>
            {/* +0.05 line-height over .landing-body-lg (1.45 -> 1.5). */}
            <p
              className="landing-body-lg max-w-[500px] text-[#d9d2c7]"
              style={{ lineHeight: 1.5 }}
            >
              A structured workspace for your estimate logic: the project tree, reusable library, revision memory, and proposal path all stay visible as the quote matures.
            </p>
          </div>

          <div
            role="tablist"
            aria-label="Product features"
            className="grid gap-3 text-[12px] font-semibold md:grid-cols-4"
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
                  className={`flex min-h-14 flex-col gap-1.5 border-b-2 pb-3 text-left transition outline-none focus-visible:ring-2 focus-visible:ring-[#f4efe9] focus-visible:ring-offset-2 focus-visible:ring-offset-brand-petrol motion-reduce:transition-none ${
                    isSelected
                      ? "border-brand-clay text-[#f4efe9]"
                      : "border-transparent text-[#b9c6c9] hover:text-[#f4efe9]"
                  }`}
                >
                  <span>{tab.label}</span>
                  <TabStatusChip status={tab.status} />
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
                  className="min-h-[480px] rounded-[3px] border border-line-1 bg-paper-0 p-2 transition-opacity duration-300 motion-reduce:transition-none sm:min-h-[560px] lg:min-h-[620px]"
                >
                  {tabPanels[tab.id]}
                </div>
              );
            })}
          </div>
        </MotionReveal>
      </div>
    </section>
  );
}
