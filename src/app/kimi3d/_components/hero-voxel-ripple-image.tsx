"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";

import LandingPageHeroMobileAvif from "../../../../public/landing-hero-day-1280.avif";
import LandingPageHeroMobile from "../../../../public/landing-hero-day-1280.webp";
import LandingPageHeroAvif from "../../../../public/landing-hero-day-2400.avif";
import LandingPageHero from "../../../../public/landing-hero-day-2400.webp";

const FINE_POINTER_QUERY = "(hover: hover) and (pointer: fine)";
const REDUCED_MOTION_QUERY = "(prefers-reduced-motion: reduce)";

const HeroVoxelRippleEnhancement = dynamic(
  () =>
    import("./hero-voxel-ripple-enhancement").then(
      (module) => module.HeroVoxelRippleEnhancement,
    ),
  { ssr: false },
);

export function HeroVoxelRippleImage() {
  const [enhancementEnabled, setEnhancementEnabled] = useState(false);
  const [enhancementRequested, setEnhancementRequested] = useState(false);

  useEffect(() => {
    const finePointerQuery = window.matchMedia(FINE_POINTER_QUERY);
    const reducedMotionQuery = window.matchMedia(REDUCED_MOTION_QUERY);

    const syncEligibility = () => {
      const eligible =
        finePointerQuery.matches && !reducedMotionQuery.matches;
      setEnhancementEnabled(eligible);
      if (!eligible) {
        setEnhancementRequested(false);
      }
    };

    syncEligibility();
    finePointerQuery.addEventListener("change", syncEligibility);
    reducedMotionQuery.addEventListener("change", syncEligibility);

    return () => {
      finePointerQuery.removeEventListener("change", syncEligibility);
      reducedMotionQuery.removeEventListener("change", syncEligibility);
    };
  }, []);

  useEffect(() => {
    if (!enhancementEnabled) {
      return;
    }

    const requestEnhancement = () => setEnhancementRequested(true);
    const idleCallbackId = window.requestIdleCallback?.(requestEnhancement, {
      timeout: 4_000,
    });
    const timeoutId =
      idleCallbackId === undefined
        ? window.setTimeout(requestEnhancement, 3_000)
        : undefined;

    return () => {
      if (idleCallbackId !== undefined) {
        window.cancelIdleCallback?.(idleCallbackId);
      }
      if (timeoutId !== undefined) {
        window.clearTimeout(timeoutId);
      }
    };
  }, [enhancementEnabled]);

  return (
    <>
      <picture>
        <source
          type="image/avif"
          media="(max-width: 640px)"
          srcSet={LandingPageHeroMobileAvif.src}
        />
        <source
          media="(max-width: 640px)"
          srcSet={LandingPageHeroMobile.src}
        />
        <source
          type="image/avif"
          media="(min-width: 641px)"
          srcSet={LandingPageHeroAvif.src}
        />
        <img
          src={LandingPageHero.src}
          alt="The ancient Parthenon seen from across the Acropolis at an orange sunset"
          width={LandingPageHero.width}
          height={LandingPageHero.height}
          fetchPriority="high"
          decoding="async"
        />
      </picture>
      {enhancementRequested ? <HeroVoxelRippleEnhancement /> : null}
    </>
  );
}
