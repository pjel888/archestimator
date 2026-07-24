"use client";

import { useRef } from "react";
import { useGSAP } from "@gsap/react";
import { gsap } from "gsap";
import { ScrambleTextPlugin } from "gsap/ScrambleTextPlugin";

import styles from "../kimi-landing.module.css";

gsap.registerPlugin(ScrambleTextPlugin, useGSAP);

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

type HeroAmbitionTextProps = {
  className: string;
};

export function HeroAmbitionText({ className }: HeroAmbitionTextProps) {
  const animatedTextRef = useRef<HTMLSpanElement>(null);

  useGSAP(
    () => {
      const animatedText = animatedTextRef.current;
      if (
        !animatedText ||
        window.matchMedia("(prefers-reduced-motion: reduce)").matches
      ) {
        return;
      }

      const timeline = gsap.timeline({
        delay: WORD_HOLD_SECONDS,
        repeat: -1,
        repeatDelay: WORD_HOLD_SECONDS,
      });

      [...ROTATING_WORDS.slice(1), FIRST_WORD].forEach((word, index) => {
        timeline.to(
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
    { scope: animatedTextRef },
  );

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
