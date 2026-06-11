"use client";

import { useEffect, useRef } from "react";
import { annotate } from "rough-notation";
import { BetaFaq } from "./BetaFaq";
import { CtaLink } from "./CtaLink";
import { MotionReveal } from "./MotionReveal";
import { trackConversion } from "@/lib/ab-testing/experiment-tracker";

/* Mirrors --brand-clay in globals.css (rough-notation needs a literal string) */
const PRICING_ANNOTATION_COLOR = "#b2492c";

export function PricingSection() {
  const zeroRef = useRef<HTMLSpanElement | null>(null);

  useEffect(() => {
    const target = zeroRef.current;

    if (!target) {
      return;
    }

    const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let annotation: ReturnType<typeof annotate> | null = null;
    let timer = 0;

    // The page's last hand-drawn mark: circle the ₱0 when the reader actually
    // reaches it (first intersection, once), mirroring the ProblemSection
    // pencil so the mark budget stays at one per viewport.
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry?.isIntersecting) {
          return;
        }

        observer.disconnect();

        annotation = annotate(target, {
          type: "circle",
          color: PRICING_ANNOTATION_COLOR,
          strokeWidth: 2,
          padding: 8,
          iterations: 2,
          animationDuration: prefersReducedMotion ? 0 : 800,
          animate: !prefersReducedMotion,
        });
        timer = window.setTimeout(
          () => annotation?.show(),
          prefersReducedMotion ? 0 : 260,
        );
      },
      { threshold: 1, rootMargin: "0px 0px -10% 0px" },
    );

    observer.observe(target);

    return () => {
      observer.disconnect();
      window.clearTimeout(timer);
      annotation?.remove();
    };
  }, []);

  return (
    <section
      id="pricing"
      data-landing-snap-section="true"
      className="scroll-mt-[68px] border-b border-line-1 bg-paper-1 px-6 py-20 sm:px-8 sm:py-28 lg:px-12"
    >
      <div className="mx-auto w-full max-w-[1952px]">
        <MotionReveal>
          <div className="grid gap-10 rounded-[3px] border border-line-1 bg-paper-0 p-6 sm:p-10 lg:grid-cols-[minmax(0,0.88fr)_minmax(320px,0.42fr)] lg:items-end">
            <div>
              <p className="text-[12px] font-semibold text-brand-clay">
                Closed beta partnership
              </p>
              <h2 className="landing-headline-lg mt-4 max-w-[720px] text-ink-1">
                Free during the closed beta. Honest pricing after.
              </h2>
              <p className="landing-body-lg mt-6 max-w-[760px] text-ink-2">
                Request access to the closed beta for structured quote sheets, reusable catalog logic, and connected estimate organization. Payment, checkout, and public plans are deferred until after beta.
              </p>
              <div className="mt-8">
                <CtaLink
                  href="/contact"
                  onClick={() => trackConversion("hero-cta-copy", "cta_click", { location: "pricing", target: "request_access", cta_label: "Request access" })}
                >
                  Request access
                </CtaLink>
              </div>
            </div>

            <div className="rounded-[3px] border border-line-1 bg-paper-1 p-6">
              <span
                ref={zeroRef}
                className="landing-num inline-block text-[56px] font-semibold leading-none text-ink-1 sm:text-[64px]"
              >
                ₱0
              </span>
              <span className="mt-4 block text-[18px] font-medium text-ink-1">
                No payment during beta
              </span>
              <span className="mt-3 block text-[13px] leading-6 text-ink-3">
                Public pricing follows the beta, shaped with the teams using it.
              </span>
            </div>
          </div>
        </MotionReveal>

        <MotionReveal>
          <BetaFaq />
        </MotionReveal>
      </div>
    </section>
  );
}
