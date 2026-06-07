import type { Icon } from "@phosphor-icons/react";
import { ChartBar, FileXls, GitDiff, Package, TreeStructure } from "@phosphor-icons/react/dist/ssr";

import { MotionReveal } from "./MotionReveal";

const workflowPillars: { label: string; icon: Icon }[] = [
  { label: "Structured quote sheets", icon: TreeStructure },
  { label: "Reusable supplier catalogs", icon: Package },
  { label: "Revision context", icon: GitDiff },
  { label: "Proposal comparison path", icon: ChartBar },
  { label: "Document handoff path", icon: FileXls },
];

export function SecondaryClaimSection() {
  return (
    <section
      id="method"
      data-landing-snap-section="true"
      className="relative overflow-hidden scroll-mt-[68px] bg-[#eeeeec] bg-[radial-gradient(circle_at_50%_-20%,rgba(255,122,26,0.04),transparent_65%)] px-4 pt-24 pb-24 sm:px-6 sm:pt-32 sm:pb-32 lg:px-8"
    >
      <div className="relative z-10 mx-auto w-full max-w-[1120px]">
        <MotionReveal>
          <div className="mx-auto max-w-[820px] text-center">
            <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.14em] text-[#7b7b78]">
              The Archestimator way
            </p>
            <h2 className="mt-4 text-[38px] font-normal leading-[1.02] tracking-[-0.052em] text-[#111111] sm:text-[56px]">
              A clearer way to create quotes, estimates, and proposal-ready documents
            </h2>
            <p className="mx-auto mt-5 max-w-[640px] text-[15px] leading-[1.55] tracking-[-0.015em] text-[#4f4f4d] sm:text-[16px]">
              Keep line-item structure, reusable supplier catalogs, assumptions, revision context, and planned document handoff moving through one quote workspace.
            </p>
          </div>
        </MotionReveal>

        <div className="mt-10 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          {workflowPillars.map((pillar, index) => {
            const IconComponent = pillar.icon;

            return (
              <MotionReveal key={pillar.label} staggerIndex={index + 1}>
                <span className="group flex min-h-[92px] flex-col justify-between rounded-[10px] border border-[#dedbd6] bg-white p-4 text-[#313130] shadow-[0_10px_26px_rgba(17,17,17,0.04)] transition duration-300 hover:-translate-y-px hover:border-[#ff7a1a]/40 hover:shadow-[0_14px_34px_rgba(17,17,17,0.07)] motion-reduce:transition-none motion-reduce:hover:translate-y-0">
                  <span className="flex size-9 items-center justify-center rounded-[8px] border border-[#dedbd6] bg-[#faf9f6] text-[#ff7a1a] transition duration-300 group-hover:border-[#ff7a1a]/35 group-hover:bg-[#fff3ea] motion-reduce:transition-none" aria-hidden="true">
                    <IconComponent size={18} weight="bold" />
                  </span>
                  <span className="mt-4 text-[12px] font-semibold leading-[1.2] tracking-[-0.02em]">
                    {pillar.label}
                  </span>
                </span>
              </MotionReveal>
            );
          })}
        </div>
      </div>
    </section>
  );
}
