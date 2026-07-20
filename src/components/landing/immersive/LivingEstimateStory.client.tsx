"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import {
  EARLY_ACCESS_HREF,
  STATE_LABELS,
  hero,
  storyBeats,
} from "./content";
import {
  LIVING_ESTIMATE_STATES,
  type LivingEstimateState,
} from "./living-estimate-model";
import { LivingEstimatePoster } from "./LivingEstimatePoster";
import styles from "./immersive.module.css";

gsap.registerPlugin(ScrollTrigger, useGSAP);

// WebGL scene: client-only bundle, mounted over the SVG poster and faded
// in only after its first frame. Hero copy and CTA render without it.
const LivingEstimateScene = dynamic(() => import("./LivingEstimateScene.client"), { ssr: false });

/**
 * Progress ranges from the scene direction:
 * 0.00–0.18 estimate settles, 0.18–0.42 proposal, 0.42–0.68 review,
 * 0.68–0.92 revision, 0.92–1.00 final settle.
 */
function beatIndexForProgress(progress: number): number {
  if (progress < 0.18) return 0;
  if (progress < 0.42) return 1;
  if (progress < 0.68) return 2;
  return 3;
}

/**
 * Hero + scroll story: one persistent Living Estimate scene pinned across
 * both sections while the four text beats scroll beside it.
 *
 * Static-first: everything meaningful is server-rendered semantic DOM.
 * The SVG poster is the default visual and the permanent fallback. The
 * WebGL canvas mounts only on desktop (fine pointer, >= 768px), after
 * first paint, and fails silent. Reduced motion skips the entrance and
 * the scrub, renders the final connected state instantly, and leaves all
 * four beats visible as normal stacked text.
 */
export function LivingEstimateStory() {
  const storyRef = useRef<HTMLElement>(null);
  // SSR/hydration defaults are the static experience; enhancement is
  // measured after mount so first paint never depends on the scene.
  const [measured, setMeasured] = useState(false);
  const [isDesktop, setIsDesktop] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(false);
  const [activeBeat, setActiveBeat] = useState(0);
  const [sceneReady, setSceneReady] = useState(false);

  useEffect(() => {
    const desktopQuery = window.matchMedia("(min-width: 768px) and (pointer: fine)");
    const motionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    const measure = () => {
      setIsDesktop(desktopQuery.matches);
      setReducedMotion(motionQuery.matches);
    };
    measure();
    setMeasured(true);
    desktopQuery.addEventListener("change", measure);
    motionQuery.addEventListener("change", measure);
    return () => {
      desktopQuery.removeEventListener("change", measure);
      motionQuery.removeEventListener("change", measure);
    };
  }, []);

  const enhanced = measured && isDesktop && !reducedMotion;
  const activeIndex = measured && reducedMotion ? storyBeats.length - 1 : activeBeat;
  const sceneState: LivingEstimateState =
    measured && reducedMotion ? "revision" : LIVING_ESTIMATE_STATES[activeBeat];

  // One ScrollTrigger progress tracker over the story section. State
  // changes only when the mapped beat index changes; every scene state is
  // absolute, so scrubbing forward and backward stays coherent.
  useGSAP(
    () => {
      const story = storyRef.current;
      if (!enhanced || !story) return;
      const tracker = ScrollTrigger.create({
        trigger: story,
        start: "top bottom",
        end: "bottom bottom",
        onUpdate: (self) => {
          const next = beatIndexForProgress(self.progress);
          setActiveBeat((prev) => (prev === next ? prev : next));
        },
      });
      return () => tracker.kill();
    },
    { dependencies: [enhanced] },
  );

  const handleFirstFrame = useCallback(() => setSceneReady(true), []);

  return (
    <div className={styles.heroStoryTrack} data-enhanced={enhanced || undefined}>
      <div className={styles.sceneSlot}>
        <div className={styles.posterLayer}>
          <LivingEstimatePoster />
        </div>
        {measured && isDesktop ? (
          <div className={styles.sceneLayer} data-ready={sceneReady || undefined}>
            <LivingEstimateScene
              state={sceneState}
              reducedMotion={reducedMotion}
              onFirstFrame={handleFirstFrame}
            />
          </div>
        ) : null}
      </div>

      <section className={styles.hero} aria-labelledby="immersive-hero-title">
        <div className={styles.heroCopy}>
          <p className={styles.eyebrow}>{hero.eyebrow}</p>
          <h1 id="immersive-hero-title" className={styles.heroTitle}>
            {hero.title}
          </h1>
          <p className={styles.heroLead}>{hero.lead}</p>
          <p className={styles.heroCtaRow}>
            <Link href={EARLY_ACCESS_HREF} className={styles.cta}>
              {hero.ctaLabel}
            </Link>
          </p>
          <p className={styles.microLine}>{hero.microLine}</p>
          <p className={styles.stateIndex} aria-label="Workflow states">
            {STATE_LABELS.map((label, index) => (
              <span key={label} className={styles.stateIndexPart}>
                <span
                  className={styles.stateIndexItem}
                  data-active={index === activeIndex || undefined}
                >
                  {label}
                </span>
                {index < STATE_LABELS.length - 1 ? (
                  <span aria-hidden="true" className={styles.stateIndexSeparator}>
                    ·
                  </span>
                ) : null}
              </span>
            ))}
          </p>
        </div>
      </section>

      <section ref={storyRef} className={styles.story} aria-label="The connected estimate workflow">
        {storyBeats.map((beat, index) => (
          <div
            key={beat.heading}
            className={styles.storyBeat}
            data-active={(enhanced && index === activeBeat) || undefined}
            aria-hidden={(enhanced && index !== activeBeat) || undefined}
          >
            <h2 className={styles.storyBeatHeading}>{beat.heading}</h2>
            <p className={styles.storyBeatSentence}>{beat.sentence}</p>
          </div>
        ))}
      </section>
    </div>
  );
}
