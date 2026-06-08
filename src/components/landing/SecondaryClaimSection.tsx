import {
  Buildings,
  HardHat,
  HouseLine,
  ListChecks,
  Storefront,
  UsersThree,
} from "@phosphor-icons/react/dist/ssr";

import { MotionReveal } from "./MotionReveal";

const specialtyRows = [
  { label: "General contractors", icon: HardHat },
  { label: "Specialty trades", icon: ListChecks },
  { label: "Architectural millwork", icon: HouseLine },
  { label: "Commercial interiors", icon: Buildings },
  { label: "Design-build teams", icon: UsersThree },
  { label: "Supplier-led quotes", icon: Storefront },
] as const;

export function SecondaryClaimSection() {
  return (
    <section
      id="method"
      data-landing-snap-section="true"
      className="relative overflow-hidden scroll-mt-[68px] border-b border-[#ebe4dc] bg-[#fffdf9] px-6 py-24 sm:px-8 sm:py-28 lg:px-12"
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
              Every team names scope differently. Archestimator gives the quote enough structure to carry rooms, assemblies, supplier context, allowances, and revisions without flattening the work into one brittle spreadsheet.
            </p>
          </div>
        </MotionReveal>

        <div className="mt-12 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {specialtyRows.map((specialty, index) => {
            const IconComponent = specialty.icon;

            return (
              <MotionReveal key={specialty.label} staggerIndex={index + 1}>
                <article className="group flex min-h-[108px] items-center justify-between rounded-[8px] border border-[#e4ddd3] bg-white px-5 py-4 text-[#2c2925] transition duration-300 hover:border-brand-orange hover:bg-[#fff8f1] motion-reduce:transition-none">
                  <span className="flex items-center gap-4">
                    <span className="flex size-10 items-center justify-center rounded-full border border-[#eadfd5] bg-[#f7efe7] text-brand-orange" aria-hidden="true">
                      <IconComponent size={18} weight="bold" />
                    </span>
                    <span className="text-[17px] font-medium leading-6">
                      {specialty.label}
                    </span>
                  </span>
                  <span className="h-px w-10 bg-[#d8cabe] transition group-hover:w-14" aria-hidden="true" />
                </article>
              </MotionReveal>
            );
          })}
        </div>

        <div className="mt-3 hidden gap-3 lg:grid lg:grid-cols-3" aria-hidden="true">
          {specialtyRows.slice(0, 3).map((specialty, index) => {
            const IconComponent = specialty.icon;

            return (
              <MotionReveal key={`echo-${specialty.label}`} staggerIndex={index + 7}>
                <article className="flex min-h-[92px] items-center gap-4 rounded-[8px] border border-[#eee7df] bg-[#fbf7f2] px-5 py-4 text-[#8a7b70]">
                  <span className="flex size-9 items-center justify-center rounded-full bg-white text-brand-orange">
                    <IconComponent size={17} weight="bold" />
                  </span>
                  <span className="text-[15px] font-medium">{specialty.label}</span>
                </article>
              </MotionReveal>
            );
          })}
        </div>
      </div>
    </section>
  );
}
