import { MotionReveal } from "./MotionReveal";
import { companyProofCopy } from "./company-proof-data";

const processSteps = [
  {
    number: "01",
    label: "Estimate Faster",
    detail:
      "Work in an intuitive interface that actually understands how you build. By componentizing your pricing, Archestimator ensures you never start from scratch. Build your scopes and assemblies once, then instantly reuse them across future projects.",
  },
  {
    number: "02",
    label: "Centralized Workflow",
    detail:
      "Eliminate the chaos of disconnected tools by keeping your estimates, revisions, and client feedback united in a single workflow.",
  },
  {
    number: "03",
    label: "Accelerate Approvals",
    detail:
      "Move from draft to decision with absolute clarity by tracking every revision and review along the way.",
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

export function ProcessBandSection() {
  return (
    <section
      aria-label="How Archestimator works"
      data-landing-snap-section="true"
      className="landing-sans scroll-mt-[68px] bg-brand-orange px-6 py-20 text-white sm:px-8 sm:py-24 lg:px-12"
    >
      <div className="mx-auto w-full max-w-[1560px]">
        <MotionReveal>
          <p className="font-mono text-[12px] font-medium text-white/85">{companyProofCopy.eyebrow}</p>
          <h2 className="landing-serif mt-6 max-w-[1100px] text-[clamp(28px,3.4vw,48px)] font-light leading-[1.18] text-white">
            {companyProofCopy.headline}
          </h2>
        </MotionReveal>

        <div className="mt-16 grid gap-y-10 border-t border-white/25 pt-10 lg:grid-cols-3 lg:gap-y-0">
          {processSteps.map((step, index) => (
            <MotionReveal key={step.number} staggerIndex={index} className="h-full">
              <article
                className={`flex h-full flex-col gap-4 lg:px-8 ${index === 0 ? "lg:pl-0" : "lg:border-l lg:border-white/25"} ${index === processSteps.length - 1 ? "lg:pr-0" : ""}`}
              >
                <p className="text-[14px] font-medium text-white/85">{step.label}</p>
                <p aria-hidden="true" className="landing-serif text-[clamp(64px,7vw,108px)] font-light leading-none text-white/95">
                  {step.number}
                </p>
                <p className="max-w-[400px] text-[13px] leading-[1.7] text-white/90">{step.detail}</p>
              </article>
            </MotionReveal>
          ))}
        </div>

        <MotionReveal className="mt-16">
          <div
            aria-label="Closed beta testimonial carousel"
            className="relative overflow-hidden rounded-[12px] border border-white/20 bg-[linear-gradient(118deg,rgba(255,255,255,0.16),rgba(255,255,255,0.05)_55%,rgba(64,25,16,0.12))] px-7 py-10 sm:px-12 sm:py-14"
          >
            <div className="landing-testimonial-rotator grid min-h-[150px] sm:min-h-[130px]">
              {testimonialSlides.map((testimonial, index) => (
                <figure key={testimonial.quote} className={`landing-testimonial-slide landing-testimonial-slide-${index + 1}`}>
                  <blockquote className="landing-serif max-w-[880px] text-[clamp(21px,2.4vw,32px)] font-light leading-[1.3] text-white">
                    &ldquo;{testimonial.quote}&rdquo;
                  </blockquote>
                  <figcaption className="mt-6 flex flex-wrap items-center gap-x-3 gap-y-1 font-mono text-[12px] text-white/85">
                    <span>{testimonial.source}</span>
                    <span aria-hidden="true" className="text-white/45">/</span>
                    <span className="text-white/75">{testimonial.context}</span>
                  </figcaption>
                </figure>
              ))}
            </div>
          </div>
        </MotionReveal>
      </div>
    </section>
  );
}
