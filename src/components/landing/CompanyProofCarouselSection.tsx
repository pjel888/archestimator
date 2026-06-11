import {
  ClockCounterClockwise,
  Package,
  PaperPlaneTilt,
  PlayCircle,
  TreeStructure,
} from "@phosphor-icons/react/dist/ssr";
import { MotionReveal } from "./MotionReveal";
import { AnimatedProposalRecordSection } from "./AnimatedProposalRecordSection";
import { LaunchFeatureHeading } from "./LaunchFeatureHeading";

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
    label: "Revision history",
    detail: "In progress: every change traceable as the quote matures.",
    body: "Revision tracking is in active development with beta teams: every change across your proposal, who updated what, and when — so you can walk into client meetings with the story behind your numbers.",
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

function LaunchFeatureVideoPlaceholder() {
  return (
    <div
      role="img"
      aria-label="Full launch feature video placeholder"
      data-launch-feature-video-placeholder="true"
      className="group/video relative aspect-video w-full overflow-hidden rounded-[3px] border border-white/20 bg-[linear-gradient(145deg,rgba(255,255,255,0.22),rgba(255,255,255,0.08)_52%,rgba(64,25,16,0.22))]"
    >
      <div className="absolute inset-0 opacity-45 mix-blend-screen [background-image:linear-gradient(rgba(255,255,255,0.18)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.14)_1px,transparent_1px)] [background-size:22px_22px]" aria-hidden="true" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_42%,rgba(255,255,255,0.2),transparent_45%),linear-gradient(180deg,rgba(255,255,255,0.12),rgba(64,25,16,0.18))]" aria-hidden="true" />
      <div className="absolute inset-x-0 top-0 h-px bg-white/46" aria-hidden="true" />
      <div className="relative flex size-full flex-col items-center justify-center gap-4 p-6 text-center">
        <span className="inline-flex size-14 items-center justify-center rounded-[3px] border border-white/36 bg-white/18 text-white shadow-[0_18px_42px_rgba(64,25,16,0.18)] transition duration-300 group-hover/video:scale-105 group-hover/video:bg-white/26">
          <PlayCircle size={30} weight="fill" aria-hidden="true" />
        </span>
        <div>
          <p className="text-[12px] font-medium leading-5 text-white/66">Full launch feature vid</p>
          <p className="mt-1 text-[16px] font-normal leading-6 text-white sm:text-[18px]">
            Product walkthrough placeholder
          </p>
        </div>
      </div>
    </div>
  );
}

export function CompanyProofCarouselSection() {
  return (
    <>
      <AnimatedProposalRecordSection />

      <section
        aria-label="Company proof and workflow highlights"
        data-company-proof-section="true"
        data-company-proof-state="empty"
        data-landing-snap-section="true"
        className="relative z-20 scroll-mt-[68px] overflow-hidden border-b border-white/10 bg-brand-orange py-12 text-white shadow-[0_-34px_72px_rgba(71,31,20,0.3)] sm:py-14 lg:py-16"
      >
        <div className="grid w-full gap-10 px-6 sm:gap-12 sm:px-8 lg:gap-14 lg:px-12">
          <MotionReveal replayOnExit>
            <article className="mx-auto flex w-full max-w-[1180px] flex-col items-center gap-7 border-y border-white/18 py-7 text-center sm:py-8 lg:gap-9 lg:py-9">
              <div className="mx-auto max-w-[760px]">
                <p className="text-[12px] font-medium leading-5 text-white/62">Launch feature video</p>
                <LaunchFeatureHeading />
                <p className="mx-auto mt-5 max-w-[620px] text-[13px] leading-6 text-white/64 sm:text-[14px] sm:leading-7">
                    A single launch-ready walkthrough for estimating, reusable components, proposal handoff, review, and client decision records.
                </p>
              </div>

              <div className="w-full max-w-[1040px]">
                <LaunchFeatureVideoPlaceholder />
              </div>
            </article>
          </MotionReveal>

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
        </div>
      </section>
    </>
  );
}
