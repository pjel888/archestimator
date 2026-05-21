"use client";

import type { LenisOptions } from "lenis";
import { ReactLenis } from "lenis/react";
import { useEffect, useState, type ReactNode } from "react";

import { LandingSnapController } from "./LandingSnapController";

const REDUCED_MOTION_QUERY = "(prefers-reduced-motion: reduce)";

const landingLenisOptions = {
  anchors: {
    offset: -80,
  },
  lerp: 0.105,
  smoothWheel: true,
  wheelMultiplier: 0.86,
  touchMultiplier: 1,
  prevent: (node: HTMLElement) => Boolean(node.closest("[data-lenis-prevent]")),
} satisfies LenisOptions;

export function LandingSmoothScrollProvider({ children }: { children: ReactNode }) {
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(true);

  useEffect(() => {
    const mediaQuery = window.matchMedia(REDUCED_MOTION_QUERY);
    const syncPreference = () => setPrefersReducedMotion(mediaQuery.matches);

    syncPreference();
    mediaQuery.addEventListener("change", syncPreference);

    return () => mediaQuery.removeEventListener("change", syncPreference);
  }, []);

  if (prefersReducedMotion) {
    return <>{children}</>;
  }

  return (
    <ReactLenis root options={landingLenisOptions}>
      <LandingSnapController />
      {children}
    </ReactLenis>
  );
}
