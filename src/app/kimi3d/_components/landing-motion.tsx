"use client";

import { gsap } from "gsap";
import { useGSAP } from "@gsap/react";

gsap.registerPlugin(useGSAP);

const MOTION_QUERY = "(prefers-reduced-motion: no-preference)";

export function LandingMotion() {
  useGSAP(() => {
    const root = document.querySelector<HTMLElement>("[data-kimi-landing]");
    if (!root) return;

    const media = gsap.matchMedia();

    media.add(MOTION_QUERY, () => {
      const heroElements = gsap.utils.toArray<HTMLElement>(
        "[data-hero-reveal]",
        root,
      );

      gsap.timeline({ defaults: { ease: "power3.out" } }).fromTo(
        heroElements,
        { y: 12 },
        {
          y: 0,
          duration: 0.5,
          stagger: 0.05,
          clearProps: "transform",
        },
      );
    });

    return () => media.revert();
  });

  return null;
}
