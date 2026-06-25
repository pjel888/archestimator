"use client";

import { useRef, type ReactNode } from "react";
import { useGSAP } from "@gsap/react";
import gsap from "gsap";

gsap.registerPlugin(useGSAP);

type HeroMountMotionProps = {
  children: ReactNode;
  className: string;
};

export function HeroMountMotion({ children, className }: HeroMountMotionProps) {
  const ref = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      const root = ref.current;
      if (!root) return;

      const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      const eyebrow = root.querySelector("[data-hero-motion='eyebrow']");
      const title = root.querySelector("[data-hero-motion='title']");
      const intro = root.querySelector("[data-hero-motion='intro']");
      const ctas = gsap.utils.toArray<HTMLElement>("[data-hero-motion='cta']", root);
      const illustration = root.querySelector("[data-hero-motion='illustration']");
      const cards = gsap.utils.toArray<HTMLElement>("[data-hero-motion='metric-card']", root);
      const mockup = root.querySelector("[data-hero-motion='mockup']");
      const motionTargets = [eyebrow, title, intro, illustration, mockup, ...ctas, ...cards].filter(Boolean);

      if (prefersReducedMotion) {
        gsap.set(motionTargets, {
          opacity: 1,
          visibility: "visible",
          clearProps: "transform,filter,clipPath",
        });
        gsap.set(illustration, { "--hero-image-mount-scale": 1 });
        return;
      }

      const timeline = gsap.timeline({
        defaults: {
          ease: "power3.out",
        },
      });

      timeline
        .fromTo(
          eyebrow,
          { opacity: 0, y: 8 },
          { opacity: 1, y: 0, duration: 0.42 },
        )
        .fromTo(
          title,
          { opacity: 0, y: 18, clipPath: "inset(0 0 100% 0)" },
          { opacity: 1, y: 0, clipPath: "inset(-8% 0% -12% 0%)", clearProps: "clipPath", duration: 0.78 },
          "-=0.2",
        )
        .fromTo(
          intro,
          { opacity: 0, y: 12 },
          { opacity: 1, y: 0, duration: 0.52 },
          "-=0.48",
        )
        .fromTo(
          ctas,
          { opacity: 0, y: 10, scale: 0.985 },
          { opacity: 1, y: 0, scale: 1, duration: 0.42, stagger: 0.06 },
          "-=0.34",
        )
        .fromTo(
          illustration,
          { opacity: 0, y: 28, "--hero-image-mount-scale": 1.035 },
          { opacity: 1, y: 0, "--hero-image-mount-scale": 1, duration: 0.86 },
          "-=0.52",
        )
        .fromTo(
          cards,
          { opacity: 0, y: 22, scale: 0.985 },
          { opacity: 1, y: 0, scale: 1, duration: 0.58, stagger: 0.075 },
          "-=0.42",
        );

      if (mockup) {
        timeline.fromTo(
          mockup,
          {
            opacity: 0,
            y: 56,
            scale: 0.985,
            clipPath: "inset(12% 0% 0% 0%)",
            filter: "blur(14px) saturate(0.92)",
            transformOrigin: "50% 82%",
          },
          {
            opacity: 1,
            y: 0,
            scale: 1,
            clipPath: "inset(0% 0% 0% 0%)",
            filter: "blur(0px) saturate(1)",
            clearProps: "transform,filter,clipPath,transformOrigin",
            duration: 1.04,
            ease: "expo.out",
          },
          "+=0.1",
        );
      }
    },
    { scope: ref },
  );

  return (
    <div ref={ref} className={className}>
      {children}
    </div>
  );
}
