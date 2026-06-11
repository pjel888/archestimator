"use client";

import { useEffect, useRef } from "react";
import Link from "next/link";
import { annotate } from "rough-notation";
import { workshopHref } from "./constants";
import { trackConversion } from "@/lib/ab-testing/experiment-tracker";
import { HeroEstimateArtifact } from "./HeroEstimateArtifact";

/* Mirrors --brand-clay in globals.css (rough-notation needs a literal string) */
const HERO_BRAND_ANNOTATION_COLOR = "#b2492c";

/* Category line shared by both variants — the A/B difference lives in the
   headline and support copy only. */
const HERO_EYEBROW = "Estimating & proposal workspace for construction teams";

export const heroCopyVariants = [
  {
    id: "connected-workflow",
    eyebrow: HERO_EYEBROW,
    headline: "The fastest path from proposal to approval.",
    support:
      "Stop wasting time on messy spreadsheets and scattered feedback. archestimator gives you one connected workspace to build pricing, manage revisions, and get faster approvals.",
    evidenceGate: "Closed beta preview",
  },
  {
    id: "review-ready-quotes",
    eyebrow: HERO_EYEBROW,
    headline: "Estimate with Precision. Win with Clarity.",
    support:
      "Replace the chaos of manual data entry with a system that scales. archestimator connects your proven pricing data directly to your client proposals, keeping every revision organized until the contract is signed.",
    evidenceGate: "Closed beta preview",
  },
] as const;

export function HeroSection({ variant = "A", isLoggedIn = false }: { variant?: "A" | "B"; isLoggedIn?: boolean }) {
  const activeHeroCopy = variant === "B" ? heroCopyVariants[1] : heroCopyVariants[0];
  const heroBrandRef = useRef<HTMLSpanElement | null>(null);
  const supportBrandRef = useRef<HTMLSpanElement | null>(null);
  const primaryCtaHref = isLoggedIn ? workshopHref : "/contact";
  const primaryCtaTarget = isLoggedIn ? "workspace" : "book_walkthrough";
  const primaryCtaLabel = isLoggedIn ? "Open the workspace" : "Request beta access";

  useEffect(() => {
    const headlineTarget = heroBrandRef.current;
    const supportTarget = supportBrandRef.current;

    if (!headlineTarget && !supportTarget) {
      return;
    }

    const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const timers: number[] = [];
    const annotations: Array<ReturnType<typeof annotate>> = [];

    if (headlineTarget) {
      const annotation = annotate(headlineTarget, {
        type: "underline",
        color: HERO_BRAND_ANNOTATION_COLOR,
        strokeWidth: 2.2,
        padding: 3,
        iterations: 2,
        animationDuration: prefersReducedMotion ? 0 : 720,
        animate: !prefersReducedMotion,
      });
      annotations.push(annotation);
      timers.push(window.setTimeout(
        () => annotation.show(),
        prefersReducedMotion ? 0 : 520,
      ));
    }

    if (supportTarget) {
      const annotation = annotate(supportTarget, {
        type: "underline",
        color: HERO_BRAND_ANNOTATION_COLOR,
        strokeWidth: 1.7,
        padding: 2,
        iterations: 2,
        animationDuration: prefersReducedMotion ? 0 : 620,
        animate: !prefersReducedMotion,
      });
      annotations.push(annotation);
      timers.push(window.setTimeout(
        () => annotation.show(),
        prefersReducedMotion ? 0 : 980,
      ));
    }

    return () => {
      timers.forEach((timer) => window.clearTimeout(timer));
      annotations.forEach((annotation) => annotation.remove());
    };
  }, [activeHeroCopy.headline, activeHeroCopy.support]);

  return (
    <section className='relative isolate z-10 w-full bg-paper-0 px-6 pb-20 pt-14 text-ink-1 sm:px-8 lg:px-12'>
      <div className='grid w-full gap-y-10 lg:grid-cols-[minmax(0,560px)_minmax(0,1fr)] lg:items-center lg:gap-x-14'>
        <div
          data-testid='landing-hero-copy-block'
          className='relative max-w-[635px] lg:border-l lg:border-line-2 lg:pl-7'
        >
          <p className='text-[12px] font-semibold leading-5 text-ink-3'>
            {activeHeroCopy.eyebrow}
          </p>

          <h1 className='landing-display mt-3 text-ink-1'>
            {activeHeroCopy.headline.replace(/(archestimator)/gi, "\u200B$1\u200B").split("\u200B").map((seg, i) =>
              seg.toLowerCase() === "archestimator" ? (
                <span key={i} ref={heroBrandRef} className="relative inline-block text-brand-clay">{seg}</span>
              ) : (
                <span key={i}>{seg}</span>
              )
            )}
          </h1>

          <p className='landing-body-lg mt-5 max-w-[440px] text-ink-2 text-pretty'>
            {activeHeroCopy.support.split("\n").map((part, i) => (
              <span key={i}>
                {i > 0 && <br aria-hidden="true" />}
                {part.replace(/(archestimator)/gi, "\u200B$1\u200B").split("\u200B").map((seg, j) =>
                  seg.toLowerCase() === "archestimator" ? (
                    <span key={j} ref={supportBrandRef} className="relative inline-block text-brand-clay">{seg}</span>
                  ) : (
                    <span key={j}>{seg}</span>
                  )
                )}
              </span>
            ))}
          </p>

          <div className='mt-7 flex flex-row flex-wrap items-center gap-x-6 gap-y-3'>
            <Link
              href={primaryCtaHref}
              onClick={() => trackConversion("hero-cta-copy", "cta_click", { location: "hero", target: primaryCtaTarget, variant, cta_label: primaryCtaLabel })}
              className='inline-flex min-h-10 items-center justify-center rounded-[3px] bg-brand-clay px-4 text-[12px] font-semibold text-white transition hover:bg-brand-clay-deep focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-clay focus-visible:ring-offset-2 sm:min-h-11 sm:px-5 sm:text-[13px]'
            >
              {primaryCtaLabel}
            </Link>
            <Link
              href='#method'
              onClick={() => trackConversion("hero-cta-copy", "cta_click", { location: "hero", target: "how_it_works", variant, cta_label: "See how it works" })}
              className='inline-flex min-h-10 items-center gap-1 text-[13px] font-medium text-ink-2 underline-offset-4 transition-colors hover:text-ink-1 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-clay focus-visible:ring-offset-2'
            >
              See how it works <span aria-hidden='true'>↓</span>
            </Link>
          </div>
        </div>

        <div className='lg:hidden'>
          <HeroEstimateArtifact compact />
        </div>
        <div className='hidden w-full max-w-[860px] lg:block lg:justify-self-end'>
          <HeroEstimateArtifact />
        </div>
      </div>
    </section>
  )
}
