"use client";

import { CtaLink } from "./CtaLink";
import { MotionReveal } from "./MotionReveal";
import { trackConversion } from "@/lib/ab-testing/experiment-tracker";

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
              Closed beta
            </p>
            <div className="mt-4 grid gap-6 md:grid-cols-[1fr_auto] md:items-end">
              <div>
                <h2 className="text-[38px] font-normal leading-[1.02] tracking-[-0.052em] text-[#111111] sm:text-[52px]">
                  Invite-only access to the quote workspace
                </h2>
                <p className="mt-5 max-w-[760px] text-[15px] leading-[1.55] tracking-[-0.015em] text-[#4f4f4d] sm:text-[16px]">
                  Request access to the closed beta for structured quote sheets, reusable catalog logic, and connected estimate organization. Payment, checkout, and public plans are deferred until after beta.
                </p>
              </div>
              <div className="rounded-[10px] border border-[#dedbd6] bg-[#faf9f6] p-5 md:min-w-[190px]">
                <span className="block text-[20px] font-semibold leading-tight tracking-[-0.02em] text-[#111111]">No payment</span>
                <span className="mt-2 block font-mono text-[10px] font-semibold uppercase tracking-[0.12em] text-[#7b7b78]">
                  pricing after beta
                </span>
              </div>
            </div>
            <div className="mt-8">
              <CtaLink
                href="/contact"
                onClick={() => trackConversion("hero-cta-copy", "cta_click", { location: "pricing", target: "request_access" })}
              >
                Request access
              </CtaLink>
            </div>
          </div>
        </MotionReveal>
      </div>
    </section>
  );
}
