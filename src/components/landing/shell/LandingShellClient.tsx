"use client";

import { useEffect, type ReactNode } from "react";

/**
 * LandingShellClient — the single client boundary for each marketing route
 * (MASTER-IMPLEMENTATION-PLAN §C-10; mirrors src/components/workshop/dashboard's
 * WorkshopHomebaseClient pattern). It takes the server-rendered marketing tree as
 * `children` and owns the ONE IntersectionObserver scroll-reveal driver (sections
 * opt in via `data-reveal`). This keeps the page RSC-first: only this leaf + the
 * enumerated interactive leaves (plate caption, claims filter, forms) hydrate.
 *
 * Phase 5 seam: analytics boot + A/B assignment forward through props here once
 * LandingAnalyticsBoot lands; the RSC page computes the assignment, this shell forwards it.
 */
interface LandingShellClientProps {
  children: ReactNode;
}

export function LandingShellClient({ children }: LandingShellClientProps) {
  useEffect(() => {
    if (typeof window === "undefined") return;
    const revealEls = Array.from(document.querySelectorAll<HTMLElement>("[data-reveal]"));
    const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    // Reduced-motion (or nothing to reveal): show everything immediately, no observer.
    if (prefersReducedMotion || revealEls.length === 0) {
      revealEls.forEach((el) => el.setAttribute("data-reveal-visible", "true"));
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            entry.target.setAttribute("data-reveal-visible", "true");
            observer.unobserve(entry.target);
          }
        }
      },
      { rootMargin: "0px 0px -10% 0px", threshold: 0.05 },
    );
    revealEls.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, []);

  return <>{children}</>;
}
