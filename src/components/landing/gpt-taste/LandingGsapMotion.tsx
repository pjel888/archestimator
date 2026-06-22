"use client";

import gsap from "gsap";
import { useGSAP } from "@gsap/react";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(useGSAP, ScrollTrigger);

export function LandingGsapMotion() {
  useGSAP(() => {
    if (typeof window === "undefined") return;
    const root = document.querySelector<HTMLElement>("[data-landing-page-root='true']");
    if (!root) return;

    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const hero = root.querySelector<HTMLElement>(".gsap-hero-copy");
    const heroVisual = root.querySelector<HTMLElement>(".gsap-hero-visual");
    const mechanicCards = gsap.utils.toArray<HTMLElement>(".gsap-mechanic-card", root);
    const stackCards = gsap.utils.toArray<HTMLElement>(".gsap-stack-card", root);
    const accordionCards = gsap.utils.toArray<HTMLElement>(".gsap-role-card", root);
    const scaleImages = gsap.utils.toArray<HTMLElement>(".gsap-image-scale", root);
    const proofSection = root.querySelector<HTMLElement>(".gsap-pin-proof");
    const pinTitle = root.querySelector<HTMLElement>(".gsap-pin-title");

    const allTargets = [
      hero,
      heroVisual,
      ...mechanicCards,
      ...stackCards,
      ...accordionCards,
      ...scaleImages,
    ].filter(Boolean) as HTMLElement[];

    if (reduceMotion) {
      gsap.set(allTargets, { opacity: 1, clearProps: "transform" });
      return;
    }

    const heroTimeline = gsap.timeline({ defaults: { ease: "power3.out", duration: 0.9 } });
    if (hero) heroTimeline.from(hero, { y: 26, opacity: 0 });
    if (heroVisual) heroTimeline.from(heroVisual, { x: 42, y: 18, opacity: 0, scale: 0.96 }, "-=0.68");

    mechanicCards.forEach((card, index) => {
      gsap.fromTo(
        card,
        { opacity: 0.68, y: 34 + index * 5, scale: 0.94 },
        {
          opacity: 1,
          y: 0,
          scale: 1,
          ease: "none",
          scrollTrigger: {
            trigger: card,
            start: "top 88%",
            end: "top 58%",
            scrub: true,
          },
        },
      );
    });

    scaleImages.forEach((image) => {
      gsap.fromTo(
        image,
        { scale: 0.86, opacity: 0.58 },
        {
          scale: 1,
          opacity: 1,
          ease: "none",
          scrollTrigger: {
            trigger: image,
            start: "top 92%",
            end: "bottom 38%",
            scrub: true,
          },
        },
      );
    });

    accordionCards.forEach((card, index) => {
      gsap.fromTo(
        card,
        { opacity: 0.68, y: 18 },
        {
          opacity: 1,
          y: 0,
          duration: 0.7,
          delay: index * 0.035,
          ease: "power2.out",
          scrollTrigger: {
            trigger: card,
            start: "top 86%",
            toggleActions: "play none none reverse",
          },
        },
      );
    });

    if (proofSection && pinTitle && window.matchMedia("(min-width: 1024px)").matches) {
      ScrollTrigger.create({
        trigger: proofSection,
        start: "top 96px",
        end: "bottom bottom",
        pin: pinTitle,
        pinSpacing: false,
      });
    }

    stackCards.forEach((card, index) => {
      gsap.fromTo(
        card,
        { y: 72, scale: 0.92 },
        {
          y: 0,
          scale: 1,
          ease: "none",
          scrollTrigger: {
            trigger: card,
            start: "top 92%",
            end: "top 42%",
            scrub: true,
          },
        },
      );
      if (window.matchMedia("(min-width: 1024px)").matches) {
        gsap.to(card, {
          y: -index * 16,
          ease: "none",
          scrollTrigger: {
            trigger: card,
            start: "top 42%",
            end: "bottom top",
            scrub: true,
          },
        });
      }
    });

  }, { dependencies: [] });

  return null;
}
