import { Play } from "@phosphor-icons/react/dist/ssr";

import { MotionReveal } from "./MotionReveal";

const methodSteps = [
  {
    title: "Estimate",
    body: "Quantities, rates, suppliers.",
    status: "Build",
  },
  {
    title: "Revise",
    body: "Changes, assumptions, approvals.",
    status: "Track",
  },
  {
    title: "Propose",
    body: "Inclusions, exclusions, totals.",
    status: "Hand off",
  },
] as const;

const walkthroughs = [
  {
    title: "Quote build",
  },
  {
    title: "Revision review",
  },
  {
    title: "Proposal handoff",
  },
] as const;

export function SecondaryClaimSection() {
  return (
    <section
      id="method"
      data-landing-snap-section="true"
      className="scroll-mt-[68px] bg-white px-4 py-20 text-[#111111] sm:px-6 sm:py-24 lg:px-8"
    >
      <div className="mx-auto w-full max-w-[1120px]">
        <MotionReveal>
          <div className="grid gap-8 border-t border-[#dedbd6] pt-10 lg:grid-cols-[minmax(0,0.86fr)_minmax(260px,0.34fr)] lg:items-end">
            <div>
              <p className="text-[11px] font-medium text-[#7b7b78]">The method</p>
              <h2 className="mt-4 max-w-[720px] text-[34px] font-normal leading-[1.04] tracking-normal text-[#111111] sm:text-[52px]">
                Estimate. Revise. Propose.
              </h2>
            </div>
            <p className="max-w-[360px] text-[15px] leading-[1.55] text-[#4f4f4d] sm:text-[16px]">
              One commercial record from first quantity to final offer.
            </p>
          </div>
        </MotionReveal>

        <MotionReveal staggerIndex={1}>
          <div id="proof" className="mt-12 border-y border-[#dedbd6] py-6">
            <div className="grid gap-6 lg:grid-cols-[180px_1fr]">
              <div>
                <p className="text-[11px] font-medium text-[#7b7b78]">Workflow walkthroughs</p>
              </div>
              <div className="divide-y divide-[#dedbd6] border-t border-[#dedbd6] lg:border-t-0">
                {walkthroughs.map((walkthrough) => (
                  <div key={walkthrough.title} className="grid gap-3 py-4 sm:grid-cols-[1fr_auto] sm:items-center">
                    <p className="text-[16px] font-medium text-[#111111]">{walkthrough.title}</p>
                    <button
                      type="button"
                      aria-label={`${walkthrough.title} video placeholder`}
                      className="group relative aspect-video w-[112px] overflow-hidden rounded-[5px] border border-[#d8d4cd] bg-[#eee9df] text-[#111111] transition hover:border-[#ff7a1a]/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#ff7a1a] focus-visible:ring-offset-2 focus-visible:ring-offset-white"
                    >
                      <span
                        className="absolute inset-0 bg-[linear-gradient(135deg,rgba(255,122,26,0.22),transparent_52%),radial-gradient(circle_at_78%_26%,rgba(17,17,17,0.16),transparent_24%)]"
                        aria-hidden="true"
                      />
                      <span
                        className="absolute inset-x-2 bottom-2 h-px bg-[#111111]/18"
                        aria-hidden="true"
                      />
                      <span
                        className="absolute inset-0 flex items-center justify-center"
                        aria-hidden="true"
                      >
                        <span className="flex size-7 items-center justify-center rounded-[5px] bg-white/88 text-[#111111] transition group-hover:bg-white">
                          <Play className="ml-0.5 size-3.5" weight="fill" />
                        </span>
                      </span>
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </MotionReveal>

        <MotionReveal staggerIndex={2}>
          <ol className="mt-10 grid border-t border-[#dedbd6] lg:grid-cols-3">
            {methodSteps.map((step, index) => (
              <li key={step.title} className="grid gap-5 border-b border-[#dedbd6] py-6 lg:border-r lg:px-6 lg:last:border-r-0">
                <span className="text-[12px] font-medium text-[#7b7b78]">{String(index + 1).padStart(2, "0")}</span>
                <div>
                  <h3 className="text-[30px] font-normal leading-[1.02] tracking-normal text-[#111111]">{step.title}</h3>
                  <p className="mt-3 text-[14px] leading-6 text-[#4f4f4d]">{step.body}</p>
                </div>
                <p className="text-[11px] font-medium text-[#7a5a42]">{step.status}</p>
              </li>
            ))}
          </ol>
        </MotionReveal>
      </div>
    </section>
  );
}
