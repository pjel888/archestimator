"use client";

import { useEffect, useState, type ReactNode } from "react";
import styles from "./new-landing.module.css";

type HeroEstimateMockupComponent = () => ReactNode;

function MockupFallback() {
  return (
    <div className={styles.mockupFallback} aria-label="Estimate workspace loading">
      <div className={styles.mockupFallbackRail}>
        <span />
        <span />
        <span />
      </div>
      <div className={styles.mockupFallbackSheet}>
        <span />
        <span />
        <span />
        <span />
      </div>
      <div className={styles.mockupFallbackDock}>
        <span />
        <span />
        <span />
      </div>
    </div>
  );
}

export function NewHeroWorkbench() {
  const [Mockup, setMockup] = useState<HeroEstimateMockupComponent | null>(null);

  useEffect(() => {
    let mounted = true;

    void import("@/components/landing-v3/HeroEstimateWorkspaceMockup").then((module) => {
      if (mounted) setMockup(() => module.HeroEstimateWorkspaceMockup);
    });

    return () => {
      mounted = false;
    };
  }, []);

  if (!Mockup) return <MockupFallback />;

  return <Mockup />;
}
