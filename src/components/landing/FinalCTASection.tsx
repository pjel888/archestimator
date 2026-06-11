"use client";

import Link from "next/link";
import { ArrowRight } from "@phosphor-icons/react/dist/ssr";
import { MotionReveal } from "./MotionReveal";
import { workshopHref } from "./constants";
import { trackConversion } from "@/lib/ab-testing/experiment-tracker";

/* The page's only clay-drenched surface. Light text tints are checked
   against --brand-clay #b2492c: #fdf6f1 headline 5.06:1, #f9ebe2 body
   4.64:1, paper-0 button with clay text 5.32:1 — all ≥ 4.5:1. */
export function FinalCTASection({ isLoggedIn = false }: { isLoggedIn?: boolean }) {
  const ctaHref = isLoggedIn ? workshopHref : "/contact";
  const ctaTarget = isLoggedIn ? "open_workspace" : "book_walkthrough";
  const ctaLabel = isLoggedIn ? "Open the workspace" : "Request beta access";

  return (
    <section
      id="contact"
      data-landing-snap-section="true"
      data-landing-dark-section="true"
      className="scroll-mt-[68px] bg-brand-clay px-6 py-24 text-[#fdf6f1] sm:px-8 sm:py-28 lg:px-12"
    >
      <div className="mx-auto w-full max-w-[820px] text-center">
        <MotionReveal>
          <h2 className="landing-headline-lg text-[#fdf6f1]">
            The fastest path from proposal to approval.
          </h2>
          <p className="landing-body-lg mx-auto mt-5 max-w-[54ch] text-[#f9ebe2]">
            A clearer way to create quotes, estimates, and proposal-ready documents.
          </p>
          <div className="mt-9 flex justify-center">
            <Link
              href={ctaHref}
              onClick={() => trackConversion("hero-cta-copy", "cta_click", { location: "final_cta", target: ctaTarget, cta_label: ctaLabel })}
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-[3px] bg-paper-0 px-6 text-[14px] font-semibold leading-none text-brand-clay transition hover:bg-paper-1 active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-paper-0 focus-visible:ring-offset-2 focus-visible:ring-offset-brand-clay"
            >
              {ctaLabel} <ArrowRight className="size-4" weight="bold" />
            </Link>
          </div>
        </MotionReveal>
      </div>
    </section>
  );
}
