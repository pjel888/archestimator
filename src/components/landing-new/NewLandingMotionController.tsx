"use client";

import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger, useGSAP);

const REDUCED_MOTION_QUERY = "(prefers-reduced-motion: reduce)";

/**
 * Route-owned motion island. It adds a single hero entrance and quiet,
 * one-shot section reveals without hiding server-rendered content by default.
 */
export function NewLandingMotionController() {
  useGSAP(() => {
    const root = document.querySelector<HTMLElement>("[data-new-landing-root]");
    if (!root) return;

    const releaseMenu = setupMenuDismiss(root);
    if (window.matchMedia(REDUCED_MOTION_QUERY).matches) {
      root.setAttribute("data-new-landing-motion", "reduced");
      return releaseMenu;
    }

    root.setAttribute("data-new-landing-motion", "ready");
    setupHeroEntrance(root);
    setupReveals(root);

    return releaseMenu;
  });

  return null;
}

function setupHeroEntrance(root: HTMLElement) {
  const title = root.querySelector("[data-hero-motion='title']");
  const copy = root.querySelector("[data-hero-motion='copy']");
  const scene = root.querySelector("[data-hero-motion='scene']");
  const rail = root.querySelector("[data-hero-motion='rail']");
  const steps = root.querySelector("[data-hero-motion='steps']");

  const timeline = gsap.timeline({ defaults: { ease: "power3.out" } });

  if (title) {
    timeline.fromTo(
      title,
      { opacity: 0, y: 22, clipPath: "inset(0 0 100% 0)" },
      {
        opacity: 1,
        y: 0,
        clipPath: "inset(-8% 0 -12% 0)",
        clearProps: "clipPath",
        duration: 0.78,
        ease: "expo.out",
      },
    );
  }

  if (copy) {
    timeline.fromTo(copy, { opacity: 0, y: 14 }, { opacity: 1, y: 0, duration: 0.5 }, "-=0.48");
  }
  if (scene) {
    timeline.fromTo(scene, { opacity: 0 }, { opacity: 1, duration: 0.85 }, "-=0.32");
  }
  if (rail) {
    timeline.fromTo(rail, { opacity: 0, y: 10 }, { opacity: 1, y: 0, duration: 0.46 }, "-=0.58");
  }
  if (steps) {
    timeline.fromTo(steps, { opacity: 0 }, { opacity: 1, duration: 0.45 }, "-=0.26");
  }
}

function setupReveals(root: HTMLElement) {
  for (const target of gsap.utils.toArray<HTMLElement>("[data-new-landing-reveal]", root)) {
    const delay = Number.parseFloat(target.dataset.revealDelay ?? "0") || 0;
    gsap.fromTo(
      target,
      { opacity: 0, y: 22 },
      {
        opacity: 1,
        y: 0,
        duration: 0.62,
        delay,
        ease: "power3.out",
        clearProps: "transform",
        scrollTrigger: {
          trigger: target,
          start: "top 88%",
          once: true,
        },
      },
    );
  }
}

function setupMenuDismiss(root: HTMLElement) {
  const menu = root.querySelector<HTMLDetailsElement>("[data-new-landing-menu]");
  if (!menu) return;

  const onClick = (event: MouseEvent) => {
    const target = event.target;
    if (target instanceof Element && target.closest("a")) menu.removeAttribute("open");
  };

  menu.addEventListener("click", onClick);
  return () => menu.removeEventListener("click", onClick);
}
