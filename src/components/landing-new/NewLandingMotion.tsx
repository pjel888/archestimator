"use client";

import { useRef, type ReactNode } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";

gsap.registerPlugin(ScrollTrigger, useGSAP);

/**
 * Motion orchestration for the /new landing page. Content is fully visible
 * without JavaScript; every animation enhances an already-rendered default.
 * Spatial motion only runs under prefers-reduced-motion: no-preference;
 * the nav scroll state is functional and always active.
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
        // ---- Hero entrance: settles in ~1.3s ------------------------------
        const hero = scope.querySelector<HTMLElement>("[data-hero-root]");
        if (hero) {
          const eyebrow = hero.querySelector<HTMLElement>("[data-hero='eyebrow']");
          const lines = hero.querySelectorAll<HTMLElement>("[data-hero-line]");
          const sub = hero.querySelector<HTMLElement>("[data-hero='sub']");
          const ctas = hero.querySelector<HTMLElement>("[data-hero='ctas']");
          const poster = hero.querySelector<HTMLElement>("[data-hero='poster']");

          const heroTimeline = gsap.timeline({ defaults: { ease: "expo.out" } });
          if (eyebrow) heroTimeline.from(eyebrow, { autoAlpha: 0, y: 14, duration: 0.55 }, 0);
          if (lines.length > 0) {
            heroTimeline.from(lines, { yPercent: 112, duration: 0.75, stagger: 0.08 }, 0.12);
          }
          if (sub) heroTimeline.from(sub, { autoAlpha: 0, y: 16, duration: 0.6 }, 0.45);
          if (ctas) heroTimeline.from(ctas, { autoAlpha: 0, y: 16, duration: 0.6 }, 0.58);
          if (poster) heroTimeline.from(poster, { autoAlpha: 0, y: 28, duration: 1.05 }, 0.22);
        }

        // ---- Section reveals (enhance, never gate) ------------------------
        scope.querySelectorAll<HTMLElement>("[data-reveal]").forEach((element) => {
          gsap.from(element, {
            autoAlpha: 0,
            y: 24,
            duration: 0.7,
            ease: "expo.out",
            scrollTrigger: { trigger: element, start: "top 88%", once: true },
          });
        });

        // ---- Problem fragments drift apart once in view -------------------
        const fragments = scope.querySelector<HTMLElement>("[data-fragments]");
        if (fragments) {
          ScrollTrigger.create({
            trigger: fragments,
            start: "top 78%",
            once: true,
            onEnter: () => fragments.classList.add("is-separated"),
          });
        }
      });

      return () => mm.revert();
    },
    { scope: scopeRef },
  );

  return <div ref={scopeRef}>{children}</div>;
}
