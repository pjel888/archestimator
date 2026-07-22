"use client";

import { useEffect, useRef, useState } from "react";

import { HeroEstimateWorkspaceMockup } from "@/components/landing-v3/HeroEstimateWorkspaceMockup";
import { cn } from "@/lib/ui/cn";
import styles from "./new-landing.module.css";
import { heroCopy } from "./new-landing-content";

const DESKTOP_LOOP_QUERY = "(min-width: 821px)";
const REDUCED_MOTION_QUERY = "(prefers-reduced-motion: reduce)";

export type NewLandingHeroDemoProps = {
  className?: string;
};

/**
 * Route-owned wrapper around the real sanitized estimate-workspace demo.
 *
 * Owns viewport/media/intersection decisions only; the mockup itself owns its
 * phase timers, drag-state cleanup, and the optional hidden-document pause.
 *
 * SSR and the first client render always use the static final phase, so the
 * product proof is visible before hydration and never depends on media
 * queries being evaluated. The loop starts only after mount when the demo is
 * in view, the viewport is desktop-sized, and reduced motion is off.
 */
export function NewLandingHeroDemo({ className }: NewLandingHeroDemoProps) {
  const shellRef = useRef<HTMLDivElement>(null);
  const [isInView, setIsInView] = useState(false);
  const [desktopMotionAllowed, setDesktopMotionAllowed] = useState(false);

  useEffect(() => {
    const desktopQuery = window.matchMedia(DESKTOP_LOOP_QUERY);
    const reducedMotionQuery = window.matchMedia(REDUCED_MOTION_QUERY);

    const evaluate = () => {
      setDesktopMotionAllowed(desktopQuery.matches && !reducedMotionQuery.matches);
    };
    evaluate();

    desktopQuery.addEventListener("change", evaluate);
    reducedMotionQuery.addEventListener("change", evaluate);
    return () => {
      desktopQuery.removeEventListener("change", evaluate);
      reducedMotionQuery.removeEventListener("change", evaluate);
    };
  }, []);

  useEffect(() => {
    const shell = shellRef.current;
    if (!shell) return;

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          setIsInView(entry.isIntersecting);
        }
      },
      { threshold: 0.25 },
    );
    observer.observe(shell);
    return () => observer.disconnect();
  }, []);

  const shouldLoop = isInView && desktopMotionAllowed;

  return (
    <div ref={shellRef} className={cn(styles.heroDemoShell, className)} data-new-landing-product-frame>
      <div className={styles.heroDemoGlow} aria-hidden="true" />
      <div className={styles.heroDemoFrame}>
        <div className={styles.heroDemoChrome} aria-hidden="true">
          <span className={styles.heroDemoDots}>
            <span />
            <span />
            <span />
          </span>
          <span className={styles.heroDemoUrl}>archestimator.com/workshop</span>
        </div>
        <div className={styles.heroDemoViewport} role="region" aria-label={heroCopy.demoRegionLabel}>
          {/* The demo is a presentation of the real workspace: pointer-inert
              already, and inert here keeps its many controls out of the tab
              order and accessibility tree. The region label plus the visible
              disclosure communicate what it is. */}
          <div inert className={styles.heroDemoViewportInner}>
            <HeroEstimateWorkspaceMockup
              playback={shouldLoop ? "loop" : "static"}
              staticPhase="fauxwood-replaced"
              pauseWhenDocumentHidden
              presentationMode={false}
            />
          </div>
        </div>
      </div>
      <p className={styles.heroDemoDisclosure}>{heroCopy.demoDisclosure}</p>
    </div>
  );
}
