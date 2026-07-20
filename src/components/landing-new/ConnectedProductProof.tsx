"use client";

import { useEffect, useRef, type ReactNode } from "react";
import styles from "./new-landing.module.css";

/**
 * Connected product proof — scroll choreography for the four proof chapters.
 *
 * The section is server-rendered complete: chapter copy and inline chapter
 * visuals carry the full meaning without JavaScript, and the sticky frame
 * (passed as `frame`) degrades to its first slot.
 *
 * Enhancement (desktop width + no-preference motion only): an
 * IntersectionObserver watches the chapter copy blocks and marks the active
 * chapter imperatively via data attributes:
 *
 * - `data-proof-active` on the grid root enables copy dimming + thread-node
 *   positioning in CSS;
 * - `data-active` on the active chapter article restores its full emphasis;
 * - `data-active` on the matching sticky-frame slot crossfades its visual.
 *
 * No scroll hijacking and no GSAP here — the sticky column is plain
 * `position: sticky` and all motion is CSS transitions, so this never
 * competes with the page's GSAP orchestration or the hero's Three.js loop.
 */
export function ConnectedProductProof({
  children,
  frame,
}: {
  children: ReactNode;
  frame: ReactNode;
}) {
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    if (!window.matchMedia("(min-width: 1024px)").matches) return;
    if (!window.matchMedia("(prefers-reduced-motion: no-preference)").matches) return;

    const chapters = Array.from(root.querySelectorAll<HTMLElement>("[data-proof-chapter]"));
    const slots = Array.from(root.querySelectorAll<HTMLElement>("[data-proof-slot]"));
    if (chapters.length === 0 || slots.length === 0) return;

    const activate = (key: string | null) => {
      if (key === null) return;
      root.dataset.proofActive = key;
      for (const chapter of chapters) {
        if (chapter.dataset.chapter === key) chapter.setAttribute("data-active", "");
        else chapter.removeAttribute("data-active");
      }
      for (const slot of slots) {
        if (slot.dataset.chapter === key) slot.setAttribute("data-active", "");
        else slot.removeAttribute("data-active");
      }
    };

    // Center band of the viewport drives activation; the last chapter keeps
    // the frame alive until the section leaves the viewport.
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            activate((entry.target as HTMLElement).dataset.chapter ?? null);
          }
        }
      },
      { rootMargin: "-42% 0px -42% 0px", threshold: 0 },
    );
    for (const chapter of chapters) observer.observe(chapter);

    return () => {
      observer.disconnect();
      delete root.dataset.proofActive;
      for (const chapter of chapters) chapter.removeAttribute("data-active");
      slots.forEach((slot, index) => {
        if (index === 0) slot.setAttribute("data-active", "");
        else slot.removeAttribute("data-active");
      });
    };
  }, []);

  return (
    <div ref={rootRef} className={styles.proofGrid}>
      <div className={styles.proofCopyCol}>{children}</div>
      <div className={styles.proofStickyCol} aria-hidden="true">
        {frame}
      </div>
    </div>
  );
}
