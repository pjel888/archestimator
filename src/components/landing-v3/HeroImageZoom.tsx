"use client";

import { useRef, type ReactNode } from "react";
import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger, useGSAP);

type HeroImageZoomProps = {
  className: string;
  children: ReactNode;
  dataMotion?: string;
};

const MAX_SCROLL_ZOOM = 1.085;

export function HeroImageZoom({ className, children, dataMotion }: HeroImageZoomProps) {
  const ref = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      const element = ref.current;
      if (!element) return;

      const media = gsap.matchMedia();

      media.add("(prefers-reduced-motion: reduce)", () => {
        gsap.set(element, { "--hero-image-scroll-scale": 1 });
      });

      media.add("(prefers-reduced-motion: no-preference)", () => {
        gsap.set(element, { "--hero-image-scroll-scale": 1 });

        gsap.to(element, {
          "--hero-image-scroll-scale": MAX_SCROLL_ZOOM,
          ease: "none",
          scrollTrigger: {
            trigger: document.documentElement,
            start: "top top",
            end: () => `+=${Math.max(window.innerHeight * 0.75, element.offsetHeight * 0.5)}`,
            scrub: 0.6,
            invalidateOnRefresh: true,
          },
        });
      });

      return () => media.revert();
    },
    { scope: ref },
  );

  return (
    <div ref={ref} className={className} data-hero-motion={dataMotion}>
      {children}
    </div>
  );
}
