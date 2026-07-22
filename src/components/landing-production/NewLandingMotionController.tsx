"use client";

import { useRef } from "react";
import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

import styles from "./new-landing.module.css";

gsap.registerPlugin(ScrollTrigger, useGSAP);

const REDUCED_MOTION_QUERY = "(prefers-reduced-motion: reduce)";
const FINE_POINTER_QUERY = "(hover: hover) and (pointer: fine)";

/**
 * Single route-owned motion island for `/new`. Renders only the scroll
 * progress indicator; every effect attaches to `data-*` targets and cleans up
 * through the GSAP context, observer disconnects, and listener removal.
 *
 * Content is never hidden by default CSS: targets are only given a hidden
 * "from" state here at mount when reduced motion is off, so a no-JS or
 * failed-motion page renders fully visible.
 */
export function NewLandingMotionController() {
  const progressBarRef = useRef<HTMLSpanElement>(null);

  useGSAP(
    () => {
      const root = document.querySelector<HTMLElement>("[data-new-landing-root]");
      const progressBar = progressBarRef.current;
      if (!root || !progressBar) return;

      const cleanups: Array<() => void> = [];
      const prefersReducedMotion = window.matchMedia(REDUCED_MOTION_QUERY).matches;

      // Scroll progress communicates position, so it stays enabled under
      // reduced motion; only the motion flourishes are gated below.
      gsap.fromTo(
        progressBar,
        { scaleX: 0 },
        {
          scaleX: 1,
          ease: "none",
          scrollTrigger: {
            trigger: document.documentElement,
            start: "top top",
            end: "bottom bottom",
            scrub: true,
          },
        },
      );

      const dismissMenu = setupMenuDismiss(root);
      if (dismissMenu) cleanups.push(dismissMenu);

      if (prefersReducedMotion) {
        root.setAttribute("data-new-landing-motion", "reduced");
        // Static equivalents: flow nodes and links rest in their final state,
        // no reveal transforms, no spotlight tracking.
        return () => {
          for (const cleanup of cleanups) cleanup();
        };
      }
      root.setAttribute("data-new-landing-motion", "ready");

      setupHeroEntrance(root);
      setupReveals(root);
      setupFlowActivation(root);
      const releaseSpotlight = setupSpotlight(root);
      if (releaseSpotlight) cleanups.push(releaseSpotlight);

      return () => {
        for (const cleanup of cleanups) cleanup();
      };
    },
    { scope: progressBarRef },
  );

  return (
    <span className={styles.scrollProgressTrack} aria-hidden="true">
      <span ref={progressBarRef} className={styles.scrollProgressBar} />
    </span>
  );
}

/* ---------------------------------- hero entrance ---------------------------------- */

function setupHeroEntrance(root: HTMLElement) {
  const badge = root.querySelector("[data-hero-motion='badge']");
  const title = root.querySelector("[data-hero-motion='title']");
  const lead = root.querySelector("[data-hero-motion='lead']");
  const ctas = gsap.utils.toArray<HTMLElement>("[data-hero-motion='cta']", root);
  const frame = root.querySelector("[data-hero-motion='frame']");

  const timeline = gsap.timeline({
    defaults: { ease: "power3.out" },
  });

  timeline
    .fromTo(badge, { opacity: 0, y: 8 }, { opacity: 1, y: 0, duration: 0.42 })
    .fromTo(
      title,
      { opacity: 0, y: 18, clipPath: "inset(0 0 100% 0)" },
      { opacity: 1, y: 0, clipPath: "inset(-8% 0% -12% 0%)", clearProps: "clipPath", duration: 0.78 },
      "-=0.2",
    )
    .fromTo(lead, { opacity: 0, y: 12 }, { opacity: 1, y: 0, duration: 0.52 }, "-=0.48")
    .fromTo(
      ctas,
      { opacity: 0, y: 10, scale: 0.985 },
      { opacity: 1, y: 0, scale: 1, duration: 0.42, stagger: 0.06 },
      "-=0.34",
    )
    .fromTo(
      frame,
      { opacity: 0, y: 52, filter: "blur(12px)" },
      {
        opacity: 1,
        y: 0,
        filter: "blur(0px)",
        clearProps: "transform,filter",
        duration: 1.04,
        ease: "expo.out",
      },
      "-=0.1",
    );
}

/* ---------------------------------- one-shot reveals ---------------------------------- */

function setupReveals(root: HTMLElement) {
  const targets = gsap.utils.toArray<HTMLElement>("[data-new-landing-reveal]", root);

  for (const target of targets) {
    const delay = Number.parseFloat(target.dataset.revealDelay ?? "0") || 0;
    gsap.fromTo(
      target,
      { opacity: 0, y: 20 },
      {
        opacity: 1,
        y: 0,
        duration: 0.55,
        delay,
        ease: "power3.out",
        clearProps: "transform",
        scrollTrigger: {
          trigger: target,
          start: "top 90%",
          once: true,
        },
      },
    );
  }
}

/* ---------------------------------- connected-flow activation ---------------------------------- */

function setupFlowActivation(root: HTMLElement) {
  const flow = root.querySelector<HTMLElement>("[data-new-landing-flow]");
  if (!flow) return;

  const nodes = gsap.utils.toArray<HTMLElement>("[data-flow-node]", flow);

  ScrollTrigger.create({
    trigger: flow,
    start: "top 78%",
    once: true,
    onEnter: () => {
      flow.setAttribute("data-flow-active", "true");
      nodes.forEach((node, index) => {
        gsap.delayedCall(0.35 + index * 0.22, () => {
          node.setAttribute("data-flow-emphasis", "true");
        });
      });
    },
  });
}

/* ---------------------------------- fine-pointer spotlight ---------------------------------- */

function setupSpotlight(root: HTMLElement) {
  if (!window.matchMedia(FINE_POINTER_QUERY).matches) return;

  const surfaces = gsap.utils.toArray<HTMLElement>("[data-new-landing-spotlight]", root);
  const cleanups: Array<() => void> = [];

  for (const surface of surfaces) {
    const onPointerMove = (event: PointerEvent) => {
      const rect = surface.getBoundingClientRect();
      surface.style.setProperty("--spotlight-x", `${event.clientX - rect.left}px`);
      surface.style.setProperty("--spotlight-y", `${event.clientY - rect.top}px`);
    };
    surface.addEventListener("pointermove", onPointerMove, { passive: true });
    cleanups.push(() => surface.removeEventListener("pointermove", onPointerMove));
  }

  // Register cleanup with the active GSAP context so route navigation and
  // strict-mode re-entry cannot leak listeners.
  return () => {
    for (const cleanup of cleanups) cleanup();
  };
}

/* ---------------------------------- mobile menu dismiss ---------------------------------- */

/**
 * Native <details> menu: close after a link is activated. Delegated listener,
 * no component state; the menu stays fully functional without this.
 */
function setupMenuDismiss(root: HTMLElement) {
  const menu = root.querySelector<HTMLDetailsElement>("[data-new-landing-menu]");
  if (!menu) return;

  const onClick = (event: MouseEvent) => {
    const target = event.target;
    if (!(target instanceof Element)) return;
    if (target.closest("a") && menu.hasAttribute("open")) {
      menu.removeAttribute("open");
    }
  };

  menu.addEventListener("click", onClick);
  return () => menu.removeEventListener("click", onClick);
}
