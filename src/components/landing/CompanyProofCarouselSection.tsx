"use client";

import { useState } from "react";

import {
  companyProofCopy,
  getRenderableCompanyProofItems,
  placeholderCompanyProof,
  type CompanyProofLogo,
} from "./company-proof-data";

function CompanyProofCard({ item }: { item: CompanyProofLogo }) {
  return (
    <article
      role="listitem"
      data-placeholder={item.isPlaceholder ? "true" : undefined}
      className="group flex h-[82px] min-w-[236px] items-center gap-3 rounded-[10px] border border-[#dedbd6] bg-white px-3.5 text-[#111111] shadow-[0_10px_26px_rgba(17,17,17,0.055)] transition duration-300 hover:-translate-y-0.5 hover:border-[#ff7a1a]/45 hover:shadow-[0_16px_32px_rgba(17,17,17,0.08)] sm:min-w-[264px] sm:px-4"
    >
      <div
        className="flex size-10 shrink-0 items-center justify-center rounded-[7px] border border-[#dedbd6] bg-[#faf9f6] text-[12px] font-black tracking-[-0.04em] text-[#111111] shadow-[inset_0_0_0_1px_rgba(17,17,17,0.03)]"
        aria-hidden="true"
      >
        {item.initials}
      </div>
      <div className="min-w-0">
        <div className="flex items-center gap-2">
          <h3 className="truncate text-[12px] font-semibold tracking-[-0.018em] text-[#17181c] sm:text-[13px]">
            {item.name}
          </h3>
          {item.isPlaceholder ? (
            <span className="shrink-0 rounded-full border border-[#ff7a1a]/20 bg-[#fff3ea] px-2 py-0.5 text-[8px] font-bold uppercase tracking-[0.08em] text-[#a74b10]">
              Sample
            </span>
          ) : null}
        </div>
        <p className="mt-1 text-[10px] font-medium leading-tight text-[#626260] sm:text-[11px]">
          {item.workflowFit}
        </p>
        <p className="mt-2 text-[8px] font-bold uppercase tracking-[0.09em] text-[#8c8a86]">
          {item.publicLabel}
        </p>
      </div>
    </article>
  );
}

function CompanyProofTrack({ items, duplicate = false }: { items: CompanyProofLogo[]; duplicate?: boolean }) {
  return (
    <div
      role={duplicate ? undefined : "list"}
      aria-hidden={duplicate ? "true" : undefined}
      className="flex shrink-0 gap-3 px-4 sm:gap-4 sm:px-6 lg:px-8"
    >
      {items.map((item) => (
        <CompanyProofCard key={`${duplicate ? "duplicate" : "primary"}-${item.name}`} item={item} />
      ))}
    </div>
  );
}

export function CompanyProofCarouselSection() {
  const { items: proofItems, state: proofState } = getRenderableCompanyProofItems(placeholderCompanyProof);
  const [isRailPaused, setIsRailPaused] = useState(false);

  if (proofItems.length === 0) {
    return null;
  }

  return (
    <section
      aria-labelledby="company-proof-heading"
      data-company-proof-section="true"
      data-company-proof-state={proofState}
      data-landing-snap-section="true"
      className="relative scroll-mt-[68px] overflow-hidden bg-[#eeeeec] py-16 text-[#111111] lg:flex lg:min-h-[calc(100svh-68px)] lg:flex-col lg:justify-center"
    >
      <div className="mx-auto w-full max-w-[1120px] px-4 sm:px-6 lg:px-8">
        <p className="font-mono text-[9px] font-bold uppercase tracking-[0.14em] text-[#8c8a86]">
          {companyProofCopy.eyebrow}
        </p>
        <h2
          id="company-proof-heading"
          className="mt-2 max-w-[620px] text-[24px] font-normal leading-[1.05] tracking-[-0.045em] text-[#111111] sm:text-[34px]"
        >
          {companyProofCopy.headline}
        </h2>
        <p className="mt-3 max-w-[560px] text-[11px] font-medium leading-[1.5] text-[#626260] sm:text-[12px]">
          {companyProofCopy.description}
        </p>
        <button
          type="button"
          aria-controls="company-proof-rail"
          aria-pressed={isRailPaused}
          className="mt-5 inline-flex h-8 items-center rounded-full border border-[#dedbd6] bg-white px-3 text-[9px] font-bold uppercase tracking-[0.12em] text-[#626260] transition hover:border-[#ff7a1a]/45 hover:text-[#111111] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#ff7a1a]/45"
          onClick={() => setIsRailPaused((current) => !current)}
        >
          {isRailPaused ? "Resume rail" : "Pause rail"}
        </button>
      </div>

      <div
        className="landing-company-carousel-viewport relative mt-7 w-full overflow-hidden border-y border-[#dedbd6] bg-[#f8f6f1] py-5 shadow-[0_18px_46px_rgba(17,17,17,0.045)]"
        data-company-proof-paused={isRailPaused ? "true" : "false"}
      >
        <div className="pointer-events-none absolute inset-y-0 left-0 z-20 w-10 bg-gradient-to-r from-[#f8f6f1] to-transparent sm:w-20" />
        <div className="pointer-events-none absolute inset-y-0 right-0 z-20 w-10 bg-gradient-to-l from-[#f8f6f1] to-transparent sm:w-20" />
        <div
          id="company-proof-rail"
          className="landing-company-marquee flex w-max gap-3 sm:gap-4"
          aria-label={proofState === "placeholder" ? "Placeholder company proof rail" : "Company proof rail"}
        >
          <CompanyProofTrack items={proofItems} />
          <CompanyProofTrack items={proofItems} duplicate />
        </div>
      </div>
    </section>
  );
}
