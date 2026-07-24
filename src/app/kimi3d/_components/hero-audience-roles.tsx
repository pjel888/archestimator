"use client";

import { useEffect, useRef } from "react";

import styles from "../kimi-landing.module.css";

const ROLE_HOLD_SECONDS = 1.35;
const FINE_POINTER_QUERY = "(hover: hover) and (pointer: fine)";

type HeroAudienceRolesProps = {
  roles: readonly string[];
};

export function HeroAudienceRoles({ roles }: HeroAudienceRolesProps) {
  const listRef = useRef<HTMLUListElement>(null);

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
      const list = listRef.current;
      if (!list || roles.length < 2) {
        return;
      }

      void Promise.all([import("gsap"), import("gsap/ScrambleTextPlugin")]).then(
        ([{ gsap }, { ScrambleTextPlugin }]) => {
          if (cancelled) {
            return;
          }

          gsap.registerPlugin(ScrambleTextPlugin);
          const labels = Array.from(
            list.querySelectorAll<HTMLElement>("[data-hero-audience-role]"),
          );
          timeline = gsap.timeline({
            delay: ROLE_HOLD_SECONDS,
            repeat: -1,
            repeatDelay: ROLE_HOLD_SECONDS,
          });

          for (let step = 1; step <= roles.length; step += 1) {
            labels.forEach((label, index) => {
              const nextRole = roles[(index + step) % roles.length] ?? "";

              timeline?.to(
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
                index === 0
                  ? step === 1
                    ? 0
                    : `+=${ROLE_HOLD_SECONDS}`
                  : "<",
              );
            });
          }
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
  }, [roles]);

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
