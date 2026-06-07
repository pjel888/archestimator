"use client";

import Link from "next/link";
import { ArrowRight } from "@phosphor-icons/react/dist/ssr";
import { MotionReveal } from "./MotionReveal";
import { requestAccessHref, workshopHref } from "./constants";
import { trackConversion } from "@/lib/ab-testing/experiment-tracker";

export function FinalCTASection({ isLoggedIn = false }: { isLoggedIn?: boolean }) {
  const href = isLoggedIn ? workshopHref : requestAccessHref;
  const label = isLoggedIn ? "Open workspace" : "Request access";
  const target = isLoggedIn ? "open_workspace" : "request_access";

  return (
    <section
      id="contact"
      data-landing-snap-section="true"
      className="scroll-mt-[68px] bg-[#eeeeec] px-4 py-20 text-[#111111] sm:px-6 sm:py-28 lg:px-8"
    >
      <div className="mx-auto w-full max-w-[1120px]">
        <MotionReveal>
          <div className="flex flex-col items-start justify-between gap-8 rounded-[8px] border border-[#dedbd6] bg-[#ff7a1a] p-8 text-white sm:p-10 lg:flex-row lg:items-end">
            <div>
              <p className="font-mono text-[10px] font-semibold uppercase tracking-normal text-white/70">
                Access
              </p>
              <h2 className="mt-4 max-w-[760px] text-[40px] font-normal leading-[1.02] tracking-normal sm:text-[62px]">
                Turn the estimate into the offer.
              </h2>
            </div>
            <Link
              href={href}
              onClick={() => trackConversion("hero-cta-copy", "cta_click", { location: "final_cta", target })}
              className="inline-flex min-h-10 items-center justify-center gap-2 rounded-[5px] bg-white px-4 text-[12px] font-semibold leading-none text-[#111111] transition hover:translate-y-[-1px] hover:bg-[#fff7ef] active:scale-95 focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-[#ff7a1a]"
            >
              {label} <ArrowRight className="size-4" weight="bold" />
            </Link>
          </div>
        </MotionReveal>
      </div>
    </section>
  );
}
