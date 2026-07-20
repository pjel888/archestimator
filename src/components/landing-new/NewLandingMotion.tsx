"use client";

import { useRef, type ReactNode } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";

gsap.registerPlugin(ScrollTrigger, useGSAP);

/**
 * Motion orchestration for the /new landing page. Content is fully visible
 * without JavaScript; the only page-level animations are the finite hero
 * entrance and the functional nav scroll state. Scroll-driven storytelling
 * lives exclusively in the connected product proof (IntersectionObserver +
 * CSS transitions) and the hero's Living Estimate scene — no universal
 * reveal system, so motion stays semantic instead of decorative.
 */
export function NewLandingMotion({ children }: { children: ReactNode }) {
  const scopeRef = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      const scope = scopeRef.current;
      if (!scope) return;

      const mm = gsap.matchMedia();

      // ---- Nav scroll state (functional, not decorative) -----------------
      const nav = scope.querySelector<HTMLElement>("[data-nav]");
      if (nav) {
        const setNavState = () => nav.toggleAttribute("data-scrolled", window.scrollY > 40);
        setNavState();
        ScrollTrigger.create({ start: 0, end: "max", onUpdate: setNavState });
      }

      mm.add("(prefers-reduced-motion: no-preference)", () => {
        // ---- Hero entrance: finite, settles in ~1.3s ----------------------
        const hero = scope.querySelector<HTMLElement>("[data-hero-root]");
        if (hero) {
          const eyebrow = hero.querySelector<HTMLElement>("[data-hero='eyebrow']");
          const title = hero.querySelector<HTMLElement>("[data-hero='title']");
          const sub = hero.querySelector<HTMLElement>("[data-hero='sub']");
          const ctas = hero.querySelector<HTMLElement>("[data-hero='ctas']");
          const poster = hero.querySelector<HTMLElement>("[data-hero='poster']");

          const heroTimeline = gsap.timeline({ defaults: { ease: "expo.out" } });
          if (eyebrow) heroTimeline.from(eyebrow, { autoAlpha: 0, y: 14, duration: 0.55 }, 0);
          if (title) heroTimeline.from(title, { autoAlpha: 0, y: 20, duration: 0.8 }, 0.08);
          if (sub) heroTimeline.from(sub, { autoAlpha: 0, y: 16, duration: 0.6 }, 0.45);
          if (ctas) heroTimeline.from(ctas, { autoAlpha: 0, y: 16, duration: 0.6 }, 0.58);
          if (poster) heroTimeline.from(poster, { autoAlpha: 0, y: 28, duration: 1.05 }, 0.22);
        }
      });

      return () => mm.revert();
    },
    { scope: scopeRef },
  );

  return <div ref={scopeRef}>{children}</div>;
}
