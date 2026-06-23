import { MotionReveal } from "./MotionReveal";

export function SecondaryClaimSection() {
  return (
    <section
      id="method"
      data-landing-snap-section="true"
      className="relative overflow-hidden scroll-mt-[68px] border-b border-[#ebe4dc] bg-white px-6 py-20 sm:px-8 sm:py-24 lg:px-12"
    >
      <div className="relative z-10 mx-auto w-full max-w-[1952px]">
        <MotionReveal>
          <div className="mx-auto max-w-[740px] text-center">
            <p className="text-[12px] font-semibold text-brand-orange">
              Built around construction estimate patterns
            </p>
            <h2 className="mt-4 text-[38px] font-normal leading-[1.06] tracking-normal text-[#171514] sm:text-[48px]">
              Workflows designed for every estimating specialty.
            </h2>
            <p className="mx-auto mt-5 max-w-[600px] text-[15px] leading-7 text-[#5f554d]">
              Every team names scope differently. Archestimator gives the estimate enough structure to carry rooms, assemblies, supplier context, allowances, and revisions without flattening the work into one brittle spreadsheet.
            </p>
          </div>
        </MotionReveal>
      </div>
    </section>
  );
}
