"use client";

import { useEffect, useRef } from "react";
import { annotate } from "rough-notation";
import { MotionReveal } from "./MotionReveal";

/* Mirrors --brand-clay in globals.css (rough-notation needs a literal string) */
const PROBLEM_ANNOTATION_COLOR = "#b2492c";

export function ProblemSection() {
  const feelsNormalRef = useRef<HTMLSpanElement | null>(null);

  useEffect(() => {
    const target = feelsNormalRef.current;

    if (!target) {
      return;
    }

    const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let annotation: ReturnType<typeof annotate> | null = null;
    let timer = 0;

    // Draw the circle when the reader actually reaches the phrase (first
    // intersection, once) instead of on mount, so the pencil moves with them.
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry?.isIntersecting) {
          return;
        }

        observer.disconnect();

        annotation = annotate(target, {
          type: "circle",
          color: PROBLEM_ANNOTATION_COLOR,
          strokeWidth: 2,
          padding: 4,
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
      id="problem"
      aria-labelledby="problem-heading"
      className="bg-paper-1 px-6 py-24 sm:px-8 sm:py-28 lg:px-12"
    >
      <MotionReveal>
        <div className="mx-auto w-full max-w-[820px]">
          <p className="text-[12px] font-semibold leading-5 text-ink-3">The old way</p>

          <h2 id="problem-heading" className="landing-headline-lg mt-3 text-ink-1">
            The hard part is not the total. It is keeping the logic behind the total organized as
            the offer changes.
          </h2>

          <p className="landing-body-lg mt-6 max-w-[68ch] text-ink-2 text-pretty">
            Copied spreadsheets, tabs with unclear scope, assumptions buried outside the sheet,
            proposal documents drifting away from the estimate. Most teams do not realize how much
            time they lose to re-finding, rechecking, rebuilding, and reconnecting quote work,
            because the mess{" "}
            <span ref={feelsNormalRef} className="relative inline-block">
              feels normal
            </span>
            . The problem is not the estimator. The problem is the workflow.
          </p>
        </div>
      </MotionReveal>
    </section>
  );
}
