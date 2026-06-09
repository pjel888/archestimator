import {
  ClockCounterClockwise,
  Package,
  PaperPlaneTilt,
  PlayCircle,
  TreeStructure,
} from "@phosphor-icons/react/dist/ssr";
import { MotionReveal } from "./MotionReveal";
import {
  getRenderableCompanyProofItems,
  placeholderCompanyProof,
  type CompanyProofLogo,
} from "./company-proof-data";
import { ArchestimatorLogo } from "@/components/brand/ArchestimatorLogo";

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
    label: "Activity History",
    detail: "Every revision. Every decision. Always on record.",
    body: "Track every change across your entire proposal, who updated what, and when. Revisit any version, recover anything, and walk into every client meeting with the full story behind your numbers.",
  },
] as const;

const testimonialSlides = [
  {
    quote: "The estimate finally reads like the work, not a spreadsheet we have to explain after the fact.",
    source: "Estimating lead",
    context: "Commercial interiors beta workflow",
  },
  {
    quote: "Reusable assemblies make review calmer because the team can see what changed, where it changed, and why.",
    source: "Preconstruction manager",
    context: "General contractor beta workflow",
  },
  {
    quote: "The handoff feels cleaner when the client-ready proposal is still tied to the original numbers.",
    source: "Proposal owner",
    context: "Specialty trade beta workflow",
  },
] as const;

function FeatureVideoPlaceholder({ label }: { label: string }) {
  return (
    <div
      role="img"
      aria-label={`${label} product video placeholder`}
      data-youtube-video-placeholder="true"
      className="group/video relative min-h-[112px] overflow-hidden rounded-[3px] border border-white/18 bg-[linear-gradient(145deg,rgba(255,255,255,0.20),rgba(255,255,255,0.07)_52%,rgba(64,25,16,0.18))]"
    >
      <div className="absolute inset-0 opacity-45 mix-blend-screen [background-image:linear-gradient(rgba(255,255,255,0.18)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.14)_1px,transparent_1px)] [background-size:18px_18px]" aria-hidden="true" />
      <div className="absolute inset-x-0 top-0 h-px bg-white/40" aria-hidden="true" />
      <div className="relative flex h-full min-h-[112px] items-center justify-center p-3">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(255,255,255,0.16),transparent_48%)] opacity-80 transition duration-300 group-hover/video:opacity-100" aria-hidden="true" />
        <span className="relative inline-flex size-10 items-center justify-center rounded-[3px] border border-white/34 bg-white/18 text-white shadow-[0_10px_26px_rgba(64,25,16,0.14)] transition duration-300 group-hover/video:scale-105 group-hover/video:bg-white/26">
          <PlayCircle size={22} weight="fill" aria-hidden="true" />
        </span>
      </div>
    </div>
  );
}

function CompanyProofLogoIcon({ name }: { name: string }) {
  if (name.includes("Northline")) {
    return (
      <svg className="size-5 text-current transition-colors duration-300" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
        <path d="M12 2L4.5 20.29l.71.71L12 18l6.79 3 .71-.71z" />
      </svg>
    );
  }
  if (name.includes("Formworks")) {
    return (
      <svg className="size-5 text-current transition-colors duration-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5} aria-hidden="true">
        <path strokeLinecap="round" strokeLinejoin="round" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
      </svg>
    );
  }
  if (name.includes("Civic")) {
    return (
      <svg className="size-5 text-current transition-colors duration-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5} aria-hidden="true">
        <path strokeLinecap="round" strokeLinejoin="round" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
      </svg>
    );
  }
  if (name.includes("Atlas")) {
    return (
      <svg className="size-5 text-current transition-colors duration-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5} aria-hidden="true">
        <path strokeLinecap="round" strokeLinejoin="round" d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
      </svg>
    );
  }
  if (name.includes("Draftline")) {
    return (
      <svg className="size-5 text-current transition-colors duration-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5} aria-hidden="true">
        <path strokeLinecap="round" strokeLinejoin="round" d="M4 20h16M4 20V4l16 16" />
      </svg>
    );
  }
  return (
    <svg className="size-5 text-current transition-colors duration-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5} aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 18h16M12 6v12" />
    </svg>
  );
}

function CompanyProofLogoItem({ item }: { item: CompanyProofLogo }) {
  return (
    <div
      role="listitem"
      data-placeholder={item.isPlaceholder ? "true" : undefined}
      className="group flex items-center gap-2.5 text-[#8b8179] transition duration-300 hover:text-[#4a443f]"
    >
      <CompanyProofLogoIcon name={item.name} />
      <span className="font-mono text-[12px] font-bold uppercase tracking-[0.2em] text-current transition-colors duration-300">
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
    <>
      <section
        aria-labelledby="company-proof-heading"
        data-company-proof-quote="true"
        className="landing-quote-grid-paper border-y border-[#e5e0d8] px-6 py-12 text-center before:![background-size:16px_16px] sm:px-8 sm:py-14 lg:px-12"
      >
        <div className="relative z-10 mx-auto w-full max-w-[1220px]">
          <p id="company-proof-heading" className="text-[13px] font-medium leading-6 text-brand-orange">
            One workflow for cost proposals, with every decision documented.
          </p>
          <blockquote className="mx-auto mt-4 max-w-[1120px] text-[30px] font-light leading-[1.14] tracking-normal text-[#171514] text-balance sm:text-[36px]">
            Create structured estimates, turn them into client-ready proposals, gather feedback and revisions, and track every comment, change, and decision in one connected workflow.
          </blockquote>
          <div className="mt-8 flex justify-center">
            <ArchestimatorLogo
              tone="dark"
              markSize={40}
              showWordmark={false}
              markClassName="size-10"
            />
          </div>
        </div>
      </section>

      <section
        aria-label="Company proof and workflow highlights"
        data-company-proof-section="true"
        data-company-proof-state={proofState}
        data-landing-snap-section="true"
        className="relative scroll-mt-[68px] overflow-hidden border-b border-white/10 bg-brand-orange py-12 text-white sm:py-14 lg:py-16"
      >
        <div className="grid w-full gap-10 px-6 sm:gap-12 sm:px-8 lg:gap-14 lg:px-12">
          <div className="grid border-y border-white/18 py-2 sm:py-3 lg:grid-cols-4 lg:py-0">
            {betaStats.map((stat, index) => {
              const IconComponent = iconMap[stat.icon];

              return (
                <MotionReveal key={stat.label} staggerIndex={index} replayOnExit className="h-full">
                  <article className={`grid min-h-[252px] grid-rows-[28px_48px_44px_1fr] border-white/18 py-6 sm:min-h-[264px] lg:h-full lg:px-6 ${index === 0 ? "lg:pl-0" : ""} ${index < betaStats.length - 1 ? "border-b lg:border-b-0 lg:border-r" : "lg:pr-0"}`}>
                    <IconComponent size={28} weight="thin" className="text-white" />
                    <h2 className="pt-2 text-[21px] font-normal leading-[1.08] tracking-normal text-white text-balance xl:text-[22px] 2xl:text-[24px]">
                      {stat.label}
                    </h2>
                    <p className="border-b border-white/18 text-[12px] leading-5 text-white/68 2xl:text-[13px] 2xl:leading-6">{stat.detail}</p>
                    <div className="mt-4 grid gap-4 sm:grid-cols-[minmax(120px,0.88fr)_minmax(0,1.12fr)] lg:grid-cols-1 xl:grid-cols-[minmax(120px,0.88fr)_minmax(0,1.12fr)]">
                      <FeatureVideoPlaceholder label={stat.label} />
                      <p className="text-[12px] leading-5 text-white/56 2xl:text-[13px] 2xl:leading-6">{stat.body}</p>
                    </div>
                  </article>
                </MotionReveal>
              );
            })}
          </div>

          <MotionReveal replayOnExit>
            <div
              aria-label="Closed beta testimonial carousel"
              className="landing-testimonial-rotator relative mx-auto grid min-h-[90px] w-full max-w-[960px] place-items-center text-center sm:min-h-[100px]"
            >
              {testimonialSlides.map((testimonial, index) => (
                <figure
                  key={testimonial.quote}
                  className={`landing-testimonial-slide landing-testimonial-slide-${index + 1}`}
                >
                  <blockquote className="mx-auto max-w-[780px] text-[22px] font-normal italic leading-[1.18] tracking-normal text-white text-balance sm:text-[30px]">
                    &ldquo;{testimonial.quote}&rdquo;
                  </blockquote>
                  <figcaption className="mt-5 flex flex-wrap items-center justify-center gap-x-3 gap-y-1 text-[12px] font-medium leading-5 text-white/62">
                    <span className="text-white/78">{testimonial.source}</span>
                    <span aria-hidden="true" className="text-white/34">/</span>
                    <span>{testimonial.context}</span>
                  </figcaption>
                </figure>
              ))}
            </div>
          </MotionReveal>
        </div>
      </section>

      <div className="landing-company-carousel-viewport relative w-full overflow-hidden border-y border-[#e7ded6] bg-[#f6f2ec] py-10 sm:py-11">
        <div className="pointer-events-none absolute inset-y-0 left-0 z-20 w-10 bg-gradient-to-r from-[#f6f2ec] to-transparent sm:w-20" />
        <div className="pointer-events-none absolute inset-y-0 right-0 z-20 w-10 bg-gradient-to-l from-[#f6f2ec] to-transparent sm:w-20" />
        <div
          id="company-proof-rail"
          className="landing-company-marquee flex w-max gap-12 lg:gap-16"
          aria-label={proofState === "placeholder" ? "Placeholder company proof rail" : "Company proof rail"}
        >
          <CompanyProofTrack items={proofItems} />
          <CompanyProofTrack items={proofItems} duplicate />
        </div>
      </div>
    </>
  );
}
