"use client";

import { useEffect, useRef, type ReactNode } from "react";

export function MotionReveal({
  children,
  className = "",
  staggerIndex = 0,
  replayOnExit = false,
}: {
  children: ReactNode;
  className?: string;
  staggerIndex?: number;
  replayOnExit?: boolean;
}) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const element = ref.current;

    if (!element) return;

    const reveal = () => {
      element.dataset.motionReveal = "revealed";
    };

    const conceal = () => {
      element.dataset.motionReveal = "active";
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
          if (!replayOnExit) {
            observer.disconnect();
          }
        } else if (replayOnExit) {
          conceal();
        }
      },
      { threshold: 0.1, rootMargin: "0px 0px -40px 0px" }
    );

    observer.observe(element);

    return () => observer.disconnect();
  }, [replayOnExit]);

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
