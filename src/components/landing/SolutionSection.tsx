import { MotionReveal } from "./MotionReveal";

const solutionFeatures = [
  [
    "Define",
    "Identify the estimate structure that matters for the job: site, package, location, scope, supplier, and reviewer.",
  ],
  [
    "Structure",
    "Turn repeated products, assemblies, services, labor rates, and allowances into reusable quote logic.",
  ],
  [
    "Review",
    "Keep scope, assumption, quantity, and rate changes easier to understand before they become client-facing confusion.",
  ],
  [
    "Hand off",
    "Carry inclusions, exclusions, assumptions, and totals toward proposal-ready output while document handoff remains a planned workflow.",
  ],
];

const WORKFLOW_VISUAL_STEPS = [
  { label: "Opportunity", sub: "Buyer · Site · Package" },
  { label: "Scope", sub: "Room · Category · Deliverable" },
  { label: "Catalog Item", sub: "Product · Service · Labor" },
  { label: "Quote Logic", sub: "Qty · Rate · Assumption" },
  { label: "Revision", sub: "Delta · Approval" },
  { label: "Proposal Handoff", sub: "Planned document path" },
] as const;

function WorkflowVisual() {
  return (
    <div className="relative flex h-full min-h-[420px] flex-col justify-center overflow-hidden rounded-[8px] border border-[#ded2c7] bg-[#f4eee7] p-6 lg:min-h-[520px]">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_22%_18%,rgba(255,255,255,0.98),transparent_24%),linear-gradient(135deg,#f4f1ea,#fbfaf7_48%,#e5ded2)]" />
      <div className="relative">
        <p className="mb-5 text-[12px] font-semibold text-brand-orange">
          Connected quote workflow
        </p>
        <div className="space-y-3">
          {WORKFLOW_VISUAL_STEPS.map((step, i) => (
            <div key={step.label} className="flex items-center gap-3">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#171514] text-[10px] font-bold text-white">
                {i + 1}
              </div>
              <div className="flex-1 rounded-[8px] border border-[#ded2c7] bg-white px-3 py-2 shadow-[0_2px_8px_rgba(37,29,22,0.04)]">
                <p className="text-[13px] font-semibold text-[#171514]">{step.label}</p>
                <p className="text-[11px] text-[#756a61]">{step.sub}</p>
              </div>
              {i < WORKFLOW_VISUAL_STEPS.length - 1 && (
                <div className="hidden h-px w-4 bg-[#ded2c7] lg:block" aria-hidden="true" />
              )}
            </div>
          ))}
        </div>
        <div className="mt-5 rounded-[8px] border border-brand-orange/20 bg-[#fff7ef] p-3">
          <p className="text-[12px] font-semibold text-[#171514]">
            Line-item structure drives connected quote logic
          </p>
          <p className="mt-1 text-[12px] text-[#5f554d]">
            Every price belongs to a scope, supplier context, and assumption. As the product matures, revision and proposal handoff should stay connected to the same quote logic.
          </p>
        </div>
      </div>
    </div>
  );
}

export function SolutionSection() {
  return (
    <section
      id="solutions"
      data-landing-snap-section="true"
      className="relative overflow-hidden scroll-mt-[68px] border-b border-[#ebe4dc] bg-[#fffdf9] px-6 py-20 sm:px-8 sm:py-28 lg:px-12"
    >
      <div className="relative z-10 mx-auto w-full max-w-[1952px]">
        <MotionReveal>
          <div className="grid gap-6 lg:grid-cols-[minmax(0,0.9fr)_minmax(360px,0.55fr)] lg:items-end">
            <div>
              <p className="text-[12px] font-semibold text-brand-orange">
                Estimate model
              </p>
              <h2 className="mt-4 max-w-[720px] text-[42px] font-normal leading-[1.06] tracking-normal text-[#171514] sm:text-[56px]">
                A platform built for your estimate model
              </h2>
            </div>
            <p className="max-w-[520px] text-[15px] leading-7 text-[#5f554d]">
              Archestimator keeps the work around the quote connected: the line-item structure, reusable catalog logic, revision trail, and proposal handoff.
            </p>
          </div>
        </MotionReveal>

        <div className="mt-14 grid gap-5 lg:grid-cols-[minmax(0,0.94fr)_minmax(360px,0.62fr)] lg:items-stretch">
          <MotionReveal staggerIndex={1} className="h-full">
            <WorkflowVisual />
          </MotionReveal>

          <div className="grid gap-3 lg:grid-rows-4 lg:h-full">
            {solutionFeatures.map(([title, body], index) => (
              <MotionReveal key={title} staggerIndex={index + 2} className="h-full">
                <article className="flex h-full flex-col justify-center rounded-[8px] border border-[#ded2c7] bg-[#faf7f2] p-5">
                  <h3 className="text-[24px] font-normal leading-[1.08] tracking-normal text-[#171514]">
                    {title}
                  </h3>
                  <p className="mt-3 text-[14px] leading-6 text-[#625950]">{body}</p>
                </article>
              </MotionReveal>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
