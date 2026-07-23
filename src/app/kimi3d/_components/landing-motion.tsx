"use client";

import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";

gsap.registerPlugin(ScrollTrigger, useGSAP);

const DESKTOP_MOTION_QUERY =
  "(min-width: 901px) and (prefers-reduced-motion: no-preference)";
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
      const sectionElements = gsap.utils.toArray<HTMLElement>(
        "[data-section-reveal]",
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

      sectionElements.forEach((section) => {
        gsap.fromTo(
          section,
          { opacity: 0, y: 18 },
          {
            opacity: 1,
            y: 0,
            duration: 0.48,
            ease: "power3.out",
            scrollTrigger: {
              trigger: section,
              start: "top 88%",
              toggleActions: "play none none none",
            },
          },
        );
      });
    });

    media.add(DESKTOP_MOTION_QUERY, () => {
      const stageItems = gsap.utils.toArray<HTMLElement>(
        "[data-stage-item]",
        root,
      );

      if (stageItems.length > 0) {
        gsap.fromTo(
          stageItems,
          { opacity: 0, y: 14 },
          {
            opacity: 1,
            y: 0,
            duration: 0.42,
            stagger: 0.07,
            ease: "power3.out",
            scrollTrigger: {
              trigger: stageItems[0],
              start: "top 86%",
              toggleActions: "play none none none",
            },
          },
        );
      }
    });

    return () => media.revert();
  });

  return null;
}
