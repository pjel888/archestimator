"use client";

import { useRef } from "react";
import { useGSAP } from "@gsap/react";
import { gsap } from "gsap";
import { ScrambleTextPlugin } from "gsap/ScrambleTextPlugin";

import styles from "../kimi-landing.module.css";

gsap.registerPlugin(ScrambleTextPlugin, useGSAP);

const ROLE_HOLD_SECONDS = 1.35;

type HeroAudienceRolesProps = {
  roles: readonly string[];
};

export function HeroAudienceRoles({ roles }: HeroAudienceRolesProps) {
  const listRef = useRef<HTMLUListElement>(null);

  useGSAP(
    () => {
      const list = listRef.current;
      if (
        !list ||
        roles.length < 2 ||
        window.matchMedia("(prefers-reduced-motion: reduce)").matches
      ) {
        return;
      }

      const labels = Array.from(
        list.querySelectorAll<HTMLElement>("[data-hero-audience-role]"),
      );
      const timeline = gsap.timeline({
        delay: ROLE_HOLD_SECONDS,
        repeat: -1,
        repeatDelay: ROLE_HOLD_SECONDS,
      });

      for (let step = 1; step <= roles.length; step += 1) {
        labels.forEach((label, index) => {
          const nextRole = roles[(index + step) % roles.length] ?? "";

          timeline.to(
            label,
            {
              scrambleText: {
                text: nextRole,
                chars: "XO!#",
                revealDelay: 0.08,
                speed: 0.4,
              },
              duration: 1.05,
              ease: "none",
            },
            index === 0 ? (step === 1 ? 0 : `+=${ROLE_HOLD_SECONDS}`) : "<",
          );
        });
      }
    },
    { scope: listRef, dependencies: [roles] },
  );

  return (
    <ul ref={listRef} className={styles.heroAudienceList}>
      {roles.map((role) => (
        <li key={role}>
          <span className={styles.visuallyHidden}>{role}</span>
          <span data-hero-audience-role aria-hidden="true">
            {role}
          </span>
        </li>
      ))}
    </ul>
  );
}
