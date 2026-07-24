"use client";

import { useEffect, useRef } from "react";

import styles from "../kimi-landing.module.css";

const ROTATING_WORDS = [
  "AMBITION",
  "INTELLECT",
  "GRIT",
  "PRECISION",
  "EFFICIENCY",
  "CONFIDENCE",
  "MOMENTUM",
  "EXCELLENCE",
] as const;

const FIRST_WORD = ROTATING_WORDS[0];
const WORD_HOLD_SECONDS = 1.35;
const FINE_POINTER_QUERY = "(hover: hover) and (pointer: fine)";

type HeroAmbitionTextProps = {
  className: string;
};

export function HeroAmbitionText({ className }: HeroAmbitionTextProps) {
  const animatedTextRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    if (
      !window.matchMedia(FINE_POINTER_QUERY).matches ||
      window.matchMedia("(prefers-reduced-motion: reduce)").matches
    ) {
      return;
    }

    let cancelled = false;
    let timeline: { kill: () => void } | undefined;
    const start = () => {
      const animatedText = animatedTextRef.current;
      if (!animatedText) {
        return;
      }

      void Promise.all([import("gsap"), import("gsap/ScrambleTextPlugin")]).then(
        ([{ gsap }, { ScrambleTextPlugin }]) => {
          if (cancelled) {
            return;
          }

          gsap.registerPlugin(ScrambleTextPlugin);
          timeline = gsap.timeline({
            delay: WORD_HOLD_SECONDS,
            repeat: -1,
            repeatDelay: WORD_HOLD_SECONDS,
          });

          [...ROTATING_WORDS.slice(1), FIRST_WORD].forEach((word, index) => {
            timeline?.to(
              animatedText,
              {
                scrambleText: {
                  text: word,
                  chars: "XO!#",
                  revealDelay: 0.08,
                  speed: 0.4,
                },
                duration: 1.05,
                ease: "none",
              },
              index === 0 ? 0 : `+=${WORD_HOLD_SECONDS}`,
            );
          });
        },
      );
    };
    const idleCallbackId = window.requestIdleCallback?.(start, { timeout: 4_000 });
    const timeoutId =
      idleCallbackId === undefined ? window.setTimeout(start, 3_000) : undefined;

    return () => {
      cancelled = true;
      if (idleCallbackId !== undefined) {
        window.cancelIdleCallback?.(idleCallbackId);
      }
      if (timeoutId !== undefined) {
        window.clearTimeout(timeoutId);
      }
      timeline?.kill();
    };
  }, []);

  return (
    <span className={className}>
      <span className={styles.visuallyHidden}>{FIRST_WORD}.</span>
      <span ref={animatedTextRef} aria-hidden="true">
        {FIRST_WORD}
      </span>
      <span className={styles.heroTitlePeriod} aria-hidden="true">
        .
      </span>
    </span>
  );
}
