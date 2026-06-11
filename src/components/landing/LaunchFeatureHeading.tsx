"use client";

import { useEffect, useRef } from "react";
import { annotate } from "rough-notation";

const WHITE_ANNOTATION_COLOR = "rgba(255, 253, 249, 0.94)";

export function LaunchFeatureHeading() {
  const brandRef = useRef<HTMLSpanElement | null>(null);

  useEffect(() => {
    const target = brandRef.current;

    if (!target) {
      return;
    }

    const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const annotation = annotate(target, {
      type: "underline",
      color: WHITE_ANNOTATION_COLOR,
      strokeWidth: 2,
      padding: 2,
      iterations: 2,
      animationDuration: prefersReducedMotion ? 0 : 680,
      animate: !prefersReducedMotion,
    });
    const timer = window.setTimeout(() => annotation.show(), prefersReducedMotion ? 0 : 360);

    return () => {
      window.clearTimeout(timer);
      annotation.remove();
    };
  }, []);

  return (
    <h2 className="landing-headline-lg mt-3 text-white">
      See the complete <span ref={brandRef} className="relative inline-block">archestimator</span> workflow
    </h2>
  );
}
