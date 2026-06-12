"use client";

import Link from "next/link";
import { ArrowRight } from "@phosphor-icons/react/dist/ssr";
import { MotionReveal } from "./MotionReveal";
import { workshopHref } from "./constants";
import { trackConversion } from "@/lib/ab-testing/experiment-tracker";

export function FinalCTASection() {
  return (
    <section
      id="contact"
      data-landing-snap-section="true"
      className="scroll-mt-[68px] bg-white px-6 py-20 text-[#171514] sm:px-8 sm:py-28 lg:px-12"
    >
      <div className="mx-auto w-full max-w-[1952px]">
        <MotionReveal>
          <div className="flex flex-col items-start justify-between gap-8 border-y border-[#e5ded5] py-12 lg:flex-row lg:items-end">
            <div>
              <p className="text-[12px] font-semibold text-brand-orange">
                Start quoting
              </p>
              <h2 className="mt-4 max-w-[880px] text-[42px] font-normal leading-[1.06] tracking-normal text-[#171514] sm:text-[58px]">
                Reliable estimating infrastructure for construction proposals.
              </h2>
            </div>
            <Link
              href={workshopHref}
              onClick={() => trackConversion("hero-cta-copy", "cta_click", { location: "final_cta", target: "open_workspace" })}
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-[6px] bg-brand-orange px-5 text-[13px] font-semibold leading-none text-white transition hover:bg-brand-orange-dark active:scale-95 focus-visible:ring-2 focus-visible:ring-brand-orange focus-visible:ring-offset-2"
            >
              Open workspace <ArrowRight className="size-4" weight="bold" />
            </Link>
          </div>
        </MotionReveal>
      </div>
    </section>
  );
}
