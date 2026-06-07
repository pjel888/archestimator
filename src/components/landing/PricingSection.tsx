"use client";

import { ArrowRight } from "@phosphor-icons/react/dist/ssr";
import Link from "next/link";

import { MotionReveal } from "./MotionReveal";
import { featuresHref, requestAccessHref, workshopHref } from "./constants";
import { trackConversion } from "@/lib/ab-testing/experiment-tracker";

const accessPrinciples = [
  "Fit first",
  "No payment",
  "Hands-on setup",
] as const;

export function PricingSection({ isLoggedIn = false }: { isLoggedIn?: boolean }) {
  const primaryHref = isLoggedIn ? workshopHref : requestAccessHref;
  const primaryLabel = isLoggedIn ? "Open workspace" : "Request access";
  const target = isLoggedIn ? "open_workspace" : "request_access";

  return (
    <section
      id="access"
      data-access-section="true"
      data-landing-snap-section="true"
      className="scroll-mt-[68px] bg-[#eeeeec] px-4 py-20 text-[#111111] sm:px-6 sm:py-28 lg:px-8"
    >
      <div className="mx-auto w-full max-w-[1120px]">
        <MotionReveal>
          <div className="grid gap-8 rounded-[8px] border border-[#d8d4cd] bg-white p-6 sm:p-8 lg:grid-cols-[minmax(0,0.82fr)_minmax(280px,0.42fr)] lg:items-end">
            <div>
              <p className="font-mono text-[10px] font-semibold uppercase tracking-normal text-[#7b7b78]">
                Access
              </p>
              <h2 className="mt-4 max-w-[780px] text-[36px] font-normal leading-[1.02] tracking-normal text-[#111111] sm:text-[54px]">
                Private access. Real quote work.
              </h2>
              <p className="mt-5 max-w-[720px] text-[15px] leading-[1.55] tracking-normal text-[#4f4f4d] sm:text-[16px]">
                No checkout. We review fit, then open the workspace.
              </p>
              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <Link
                  href={primaryHref}
                  onClick={() => trackConversion("hero-cta-copy", "cta_click", { location: "access", target })}
                  className="inline-flex min-h-10 items-center justify-center gap-2 rounded-[5px] bg-[#17181c] px-4 text-[12px] font-semibold leading-none text-white transition hover:translate-y-[-1px] hover:bg-[#2a2b30] active:scale-95 focus-visible:ring-2 focus-visible:ring-[#ff7a1a] focus-visible:ring-offset-2 focus-visible:ring-offset-white motion-reduce:transition-none motion-reduce:hover:translate-y-0"
                >
                  {primaryLabel} <ArrowRight className="size-4" weight="bold" />
                </Link>
                <Link
                  href={featuresHref}
                  onClick={() => trackConversion("hero-cta-copy", "cta_click", { location: "access", target: "view_features" })}
                  className="inline-flex min-h-10 items-center justify-center rounded-[5px] border border-[#d8d4cd] px-4 text-[12px] font-semibold leading-none text-[#111111] transition hover:border-[#ff7a1a]/45 hover:bg-[#fff7ef] active:scale-95 focus-visible:ring-2 focus-visible:ring-[#ff7a1a] focus-visible:ring-offset-2 focus-visible:ring-offset-white motion-reduce:transition-none"
                >
                  View feature status
                </Link>
              </div>
            </div>

            <div className="rounded-[8px] border border-[#dedbd6] bg-[#faf9f6] p-5">
              <span className="block text-[20px] font-semibold leading-tight tracking-normal text-[#111111]">How it starts</span>
              <ul className="mt-5 flex flex-wrap gap-2 border-t border-[#dedbd6] pt-5 text-[12px] font-medium text-[#4f4f4d]">
                {accessPrinciples.map((principle) => (
                  <li key={principle}>
                    <span className="inline-flex min-h-8 items-center rounded-[5px] border border-[#dedbd6] bg-white px-3">
                      {principle}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </MotionReveal>
      </div>
    </section>
  );
}
