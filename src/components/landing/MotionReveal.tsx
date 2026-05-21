"use client";

import { useEffect, useRef, type ReactNode } from "react";

export function MotionReveal({
  children,
  className = "",
  staggerIndex = 0,
}: {
  children: ReactNode;
  className?: string;
  staggerIndex?: number;
}) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const element = ref.current;

    if (!element) return;

    const reveal = () => {
      element.dataset.motionReveal = "revealed";
    };

    const prefersReducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches;

    if (prefersReducedMotion || typeof IntersectionObserver === "undefined") {
      reveal();
      return;
    }

    element.dataset.motionReveal = "active";

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) {
          reveal();
          observer.disconnect();
        }
      },
      { threshold: 0.1, rootMargin: "0px 0px -40px 0px" }
    );

    observer.observe(element);

    return () => observer.disconnect();
  }, []);

  const delayStyle =
    staggerIndex > 0 ? { transitionDelay: `${staggerIndex * 90}ms` } : undefined;

  return (
    <div
      ref={ref}
      data-motion-reveal="idle"
      className={className}
      style={delayStyle}
    >
      {children}
    </div>
  );
}
