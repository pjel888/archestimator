import {
  ClockCounterClockwise,
  Package,
  PaperPlaneTilt,
  TreeStructure,
} from "@phosphor-icons/react/dist/ssr";
import {
  companyProofCopy,
  getRenderableCompanyProofItems,
  placeholderCompanyProof,
  type CompanyProofLogo,
} from "./company-proof-data";

const iconMap = {
  TreeStructure,
  Package,
  PaperPlaneTilt,
  ClockCounterClockwise,
} as const;

const betaStats = [
  {
    icon: "TreeStructure" as const,
    label: "Project-Shaped Workflow",
    detail: "Structure your proposal the way you think about the work",
    body: "Organize costs around the real shape of the engagement, by phase, location, scope, or package, however your team naturally thinks. Archestimator handles the format, so your clients always receive a clean, professional proposal.",
  },
  {
    icon: "Package" as const,
    label: "Reusable Component Library",
    detail: "Build it once. Use it everywhere.",
    body: "Save any component, materials, services, labor, packages, and reuse it across future proposals. Variants included, so every size, spec, and configuration is ready when you need it.",
  },
  {
    icon: "PaperPlaneTilt" as const,
    label: "Proposal Handoff",
    detail: "From costing to client-ready in one flow",
    body: "Carry your line items, totals, exclusions, and assumptions straight into a polished proposal output, no reformatting, no copy-pasting, no last-minute scrambling.",
  },
  {
    icon: "ClockCounterClockwise" as const,
    label: "Activity History & Version Tracking",
    detail: "Every revision. Every decision. Always on record.",
    body: "Track every change across your entire proposal, who updated what, and when. Revisit any version, recover anything, and walk into every client meeting with the full story behind your numbers.",
  },
] as const;

function CompanyProofLogoIcon({ name }: { name: string }) {
  if (name.includes("Northline")) {
    return (
      <svg className="size-5 text-white/50 group-hover:text-white transition-colors duration-300" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
        <path d="M12 2L4.5 20.29l.71.71L12 18l6.79 3 .71-.71z" />
      </svg>
    );
  }
  if (name.includes("Formworks")) {
    return (
      <svg className="size-5 text-white/50 group-hover:text-white transition-colors duration-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5} aria-hidden="true">
        <path strokeLinecap="round" strokeLinejoin="round" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
      </svg>
    );
  }
  if (name.includes("Civic")) {
    return (
      <svg className="size-5 text-white/50 group-hover:text-white transition-colors duration-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5} aria-hidden="true">
        <path strokeLinecap="round" strokeLinejoin="round" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
      </svg>
    );
  }
  if (name.includes("Atlas")) {
    return (
      <svg className="size-5 text-white/50 group-hover:text-white transition-colors duration-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5} aria-hidden="true">
        <path strokeLinecap="round" strokeLinejoin="round" d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
      </svg>
    );
  }
  if (name.includes("Draftline")) {
    return (
      <svg className="size-5 text-white/50 group-hover:text-white transition-colors duration-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5} aria-hidden="true">
        <path strokeLinecap="round" strokeLinejoin="round" d="M4 20h16M4 20V4l16 16" />
      </svg>
    );
  }
  return (
    <svg className="size-5 text-white/50 group-hover:text-white transition-colors duration-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5} aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 18h16M12 6v12" />
    </svg>
  );
}

function CompanyProofLogoItem({ item }: { item: CompanyProofLogo }) {
  return (
    <div
      role="listitem"
      data-placeholder={item.isPlaceholder ? "true" : undefined}
      className="group flex items-center gap-2.5 transition duration-300"
    >
      <CompanyProofLogoIcon name={item.name} />
      <span className="font-mono text-[12px] font-bold uppercase tracking-[0.2em] text-white/50 group-hover:text-white transition-colors duration-300">
        {item.name}
      </span>
    </div>
  );
}

function CompanyProofTrack({ items, duplicate = false }: { items: CompanyProofLogo[]; duplicate?: boolean }) {
  return (
    <div
      role={duplicate ? undefined : "list"}
      aria-hidden={duplicate ? "true" : undefined}
      className="flex shrink-0 gap-12 items-center lg:gap-16"
    >
      {items.map((item) => (
        <CompanyProofLogoItem key={`${duplicate ? "duplicate" : "primary"}-${item.name}`} item={item} />
      ))}
    </div>
  );
}

export function CompanyProofCarouselSection() {
  const { items: proofItems, state: proofState } = getRenderableCompanyProofItems(placeholderCompanyProof);

  if (proofItems.length === 0) {
    return null;
  }

  return (
    <section
      aria-labelledby="company-proof-heading"
      data-company-proof-section="true"
      data-company-proof-state={proofState}
      data-landing-snap-section="true"
      className="relative scroll-mt-[68px] overflow-hidden border-b border-white/10 bg-brand-orange py-20 text-white sm:py-24"
    >
      <div className="w-full px-6 sm:px-8 lg:px-12">
        <div className="grid gap-6 border-y border-white/18 py-8 lg:grid-cols-4">
          {betaStats.map((stat) => {
              const IconComponent = iconMap[stat.icon];
              return (
            <article key={stat.label} className="min-h-[132px] border-white/18 py-2 lg:border-r lg:pr-8 last:lg:border-r-0">
              <IconComponent size={32} weight="thin" className="text-white" />
              <h2 className="mt-4 text-[26px] font-normal tracking-normal text-white">
                {stat.label}
              </h2>
              <p className="mt-2 pb-4 border-b border-white/18 text-[13px] leading-6 text-white/62">{stat.detail}</p>
              <p className="mt-3 text-[13px] leading-6 text-white/50">{stat.body}</p>
            </article>
              );
            })}
        </div>

        <div className="grid justify-items-center gap-24 py-48 text-center">
          <blockquote className="max-w-[820px] text-[30px] font-normal italic leading-[1.14] tracking-normal text-white sm:text-[42px]">
            “The estimate should explain itself before it becomes a proposal.”
          </blockquote>
          <div className="max-w-[760px] rounded-[3px] border border-white/18 bg-[linear-gradient(180deg,rgba(255,255,255,0.20),rgba(255,255,255,0.08))] p-4 shadow-[0_18px_46px_rgba(64,25,16,0.12)] backdrop-blur-md">
            <p className="text-[12px] font-semibold text-white/68">
              {companyProofCopy.eyebrow}
            </p>
            <h2
              id="company-proof-heading"
              className="mt-3 text-[28px] font-normal leading-[1.12] tracking-normal text-white sm:text-[36px]"
            >
              {companyProofCopy.headline}
            </h2>
            <p className="mx-auto mt-4 max-w-[620px] text-[13px] font-medium leading-6 text-white/64">
              {companyProofCopy.description}
            </p>
          </div>
        </div>
      </div>

      <div className="landing-company-carousel-viewport relative w-full overflow-hidden border-y border-white/10 bg-[rgb(112,43,28)] py-5 shadow-[0_18px_46px_rgba(0,0,0,0.16)]">
        <div className="pointer-events-none absolute inset-y-0 left-0 z-20 w-10 bg-gradient-to-r from-[rgb(112,43,28)] to-transparent sm:w-20" />
        <div className="pointer-events-none absolute inset-y-0 right-0 z-20 w-10 bg-gradient-to-l from-[rgb(112,43,28)] to-transparent sm:w-20" />
        <div
          id="company-proof-rail"
          className="landing-company-marquee flex w-max gap-12 lg:gap-16"
          aria-label={proofState === "placeholder" ? "Placeholder company proof rail" : "Company proof rail"}
        >
          <CompanyProofTrack items={proofItems} />
          <CompanyProofTrack items={proofItems} duplicate />
        </div>
      </div>
    </section>
  );
}
