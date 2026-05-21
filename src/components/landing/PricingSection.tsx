import { CtaLink } from "./CtaLink";
import { MotionReveal } from "./MotionReveal";
import { workshopHref } from "./constants";

export function PricingSection() {
  return (
    <section
      id="pricing"
      data-landing-snap-section="true"
      className="scroll-mt-[68px] bg-[#eeeeec] px-4 py-20 sm:px-6 sm:py-28 lg:px-8"
    >
      <div className="mx-auto w-full max-w-[1120px]">
        <MotionReveal>
          <div className="rounded-[14px] border border-[#dedbd6] bg-white p-8 shadow-[0_18px_46px_rgba(17,17,17,0.055)] sm:p-10">
            <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.14em] text-[#7b7b78]">
              MVP preview
            </p>
            <div className="mt-4 grid gap-6 md:grid-cols-[1fr_auto] md:items-end">
              <div>
                <h2 className="text-[38px] font-normal leading-[1.02] tracking-[-0.052em] text-[#111111] sm:text-[52px]">
                  Early access to the estimating workspace
                </h2>
                <p className="mt-5 max-w-[760px] text-[15px] leading-[1.55] tracking-[-0.015em] text-[#4f4f4d] sm:text-[16px]">
                  Explore the early flow for Estimate Workspace, Component Library, and connected estimate organization. Revision history, proposal comparisons, visual cost breakdowns, and Excel/PDF exports remain planned next-step workflows.
                </p>
              </div>
              <div className="rounded-[10px] border border-[#dedbd6] bg-[#faf9f6] p-5 md:min-w-[190px]">
                <span className="block text-[46px] font-normal leading-none tracking-[-0.055em] text-[#111111]">₱0</span>
                <span className="mt-2 block font-mono text-[10px] font-semibold uppercase tracking-[0.12em] text-[#7b7b78]">
                  MVP preview
                </span>
              </div>
            </div>
            <div className="mt-8">
              <CtaLink href={workshopHref}>See the workspace</CtaLink>
            </div>
          </div>
        </MotionReveal>
      </div>
    </section>
  );
}
