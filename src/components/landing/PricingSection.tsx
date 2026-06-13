"use client";

import { CtaLink } from "./CtaLink";
import { MotionReveal } from "./MotionReveal";
import { trackConversion } from "@/lib/ab-testing/experiment-tracker";

export function PricingSection() {
  return (
    <section
      id="pricing"
      data-landing-snap-section="true"
      className="scroll-mt-[68px] border-b border-[#ebe4dc] bg-white px-6 py-20 sm:px-8 sm:py-28 lg:px-12"
    >
      <div className="mx-auto w-full max-w-[1952px]">
        <MotionReveal>
          <div className="grid gap-10 rounded-[8px] border border-[#ded2c7] bg-white p-6 shadow-[0_18px_46px_rgba(71,49,31,0.07)] sm:p-10 lg:grid-cols-[minmax(0,0.88fr)_minmax(320px,0.42fr)] lg:items-end">
            <div>
              <p className="text-[12px] font-semibold text-brand-orange">
                Closed beta partnership
              </p>
              <h2 className="mt-4 max-w-[720px] text-[42px] font-normal leading-[1.06] tracking-normal text-[#171514] sm:text-[56px]">
                A partnership focused on quote-to-proposal value.
              </h2>
              <p className="mt-6 max-w-[760px] text-[15px] leading-7 text-[#5f554d]">
                Request access to the closed beta for structured estimate tabs, reusable catalog logic, and connected estimate organization. Payment, checkout, and public plans are deferred until after beta.
              </p>
              <div className="mt-8">
                <CtaLink
                  href="/contact"
                  onClick={() => trackConversion("hero-cta-copy", "cta_click", { location: "pricing", target: "request_access" })}
                >
                  Request access
                </CtaLink>
              </div>
            </div>

            <div className="rounded-[8px] border border-[#e4d9ce] bg-white p-5">
              <span className="block text-[40px] font-normal leading-none text-[#171514]">0</span>
              <span className="mt-3 block text-[18px] font-medium text-[#171514]">
                No payment during beta
              </span>
              <span className="mt-3 block text-[13px] leading-6 text-[#6a5f56]">
                Pricing decisions come after beta learning, workflow fit, and owner review.
              </span>
            </div>
          </div>
        </MotionReveal>
      </div>
    </section>
  );
}
