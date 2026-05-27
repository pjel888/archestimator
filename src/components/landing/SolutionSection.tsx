import { SectionIntro } from "./SectionIntro";
import { MotionReveal } from "./MotionReveal";

const solutionFeatures = [
  [
    "Structured quote sheets",
    "Organize the quote with flexible groups named for packages, locations, scopes, categories, suppliers, catalog items, and line items.",
  ],
  [
    "Reusable catalog items",
    "Bring repeated products, assemblies, services, labor rates, and scope packages into the next quote without rebuilding them from scratch.",
  ],
  [
    "Revision context",
    "Keep scope, assumption, quantity, and rate changes easier to review before they become client-facing confusion.",
  ],
  [
    "Proposal handoff direction",
    "Carry inclusions, exclusions, assumptions, and totals toward proposal-ready output while document handoff remains a planned workflow.",
  ],
];

function WorkflowVisual() {
  const steps = [
    { label: "Opportunity", sub: "Buyer · Site · Package" },
    { label: "Scope", sub: "Room · Category · Deliverable" },
    { label: "Catalog Item", sub: "Product · Service · Labor" },
    { label: "Quote Logic", sub: "Qty · Rate · Assumption" },
    { label: "Revision", sub: "Delta · Approval" },
    { label: "Proposal Handoff", sub: "Planned document path" },
  ];

  return (
    <div className="relative flex h-full min-h-[420px] flex-col justify-center rounded-[12px] border border-[#dedbd6] bg-[#f4f1ea] p-6 lg:min-h-[520px]">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_22%_18%,rgba(255,255,255,0.98),transparent_24%),linear-gradient(135deg,#f4f1ea,#fbfaf7_48%,#e5ded2)]" />
      <div className="relative">
        <p className="mb-5 font-mono text-[10px] font-semibold uppercase tracking-[0.14em] text-[#7b7b78]">
          Connected quote workflow
        </p>
        <div className="space-y-3">
          {steps.map((step, i) => (
            <div key={step.label} className="flex items-center gap-3">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#111111] text-[10px] font-bold text-white">
                {i + 1}
              </div>
              <div className="flex-1 rounded-[8px] border border-[#dedbd6] bg-white px-3 py-2 shadow-[0_2px_8px_rgba(17,17,17,0.04)]">
                <p className="text-[13px] font-semibold text-[#111111]">{step.label}</p>
                <p className="text-[11px] text-[#7b7b78]">{step.sub}</p>
              </div>
              {i < steps.length - 1 && (
                <div className="hidden h-px w-4 bg-[#dedbd6] lg:block" aria-hidden="true" />
              )}
            </div>
          ))}
        </div>
        <div className="mt-5 rounded-[8px] border border-[#ff7a1a]/20 bg-[#fff7ef] p-3">
          <p className="text-[12px] font-semibold text-[#111111]">
            Line-item structure drives connected quote logic
          </p>
          <p className="mt-1 text-[12px] text-[#626260]">
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
      className="relative overflow-hidden scroll-mt-[68px] bg-white border-b border-[#dedbd6] px-4 py-20 sm:px-6 sm:py-28 lg:px-8"
    >
      <div className="relative z-10 mx-auto w-full max-w-[1120px]">
        <MotionReveal>
          <SectionIntro
            title="Less spreadsheet drift. More quote control."
            body="Archestimator keeps the work around the quote connected: the line-item structure, reusable catalog logic, revision trail, and proposal handoff."
          />
        </MotionReveal>

        <div className="mt-14 grid gap-5 lg:grid-cols-[minmax(0,0.94fr)_minmax(360px,0.62fr)] lg:items-stretch">
          <MotionReveal staggerIndex={1} className="h-full">
            <WorkflowVisual />
          </MotionReveal>

          <div className="grid gap-3 lg:grid-rows-4 lg:h-full">
            {solutionFeatures.map(([title, body], index) => (
              <MotionReveal key={title} staggerIndex={index + 2} className="h-full">
                <article className="h-full rounded-[10px] border border-[#dedbd6] bg-[#faf9f6] p-5 flex flex-col justify-center">
                  <h3 className="text-[24px] font-normal leading-[1.02] tracking-[-0.045em] text-[#111111]">
                    {title}
                  </h3>
                  <p className="mt-3 text-[14px] leading-[1.5] text-[#626260]">{body}</p>
                </article>
              </MotionReveal>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
