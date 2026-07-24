"use client";

import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";

gsap.registerPlugin(ScrollTrigger, useGSAP);

const DESKTOP_MOTION_QUERY =
  "(min-width: 901px) and (prefers-reduced-motion: no-preference)";
const MOTION_QUERY = "(prefers-reduced-motion: no-preference)";
const REDUCED_MOTION_QUERY = "(prefers-reduced-motion: reduce)";
const ANIMATED_PROPERTIES = "transform,opacity,visibility,willChange";

export function LandingMotion() {
  useGSAP(() => {
    const root = document.querySelector<HTMLElement>("[data-kimi-landing]");
    if (!root) return;

    const media = gsap.matchMedia();

    media.add(MOTION_QUERY, () => {
      const heroEyebrow = root.querySelector<HTMLElement>(
        '[data-hero-reveal="eyebrow"]',
      );
      const heroVisual = root.querySelector<HTMLElement>(
        '[data-hero-reveal="visual"]',
      );
      const heroTitle = root.querySelector<HTMLElement>(
        '[data-hero-reveal="title"]',
      );
      const heroSubtitle = root.querySelector<HTMLElement>(
        '[data-hero-reveal="subtitle"]',
      );
      const heroLeadTitle = root.querySelector<HTMLElement>(
        '[data-hero-reveal="lead-title"]',
      );
      const heroLeadBody = root.querySelector<HTMLElement>(
        '[data-hero-reveal="lead-body"]',
      );
      const heroCta = root.querySelector<HTMLElement>(
        '[data-hero-reveal="cta"]',
      );
      const heroText = [heroTitle, heroSubtitle].filter(
        (element): element is HTMLElement => element !== null,
      );
      const heroDetails = [heroLeadTitle, heroLeadBody].filter(
        (element): element is HTMLElement => element !== null,
      );
      const heroElements = [
        heroEyebrow,
        heroVisual,
        ...heroText,
        ...heroDetails,
        heroCta,
      ].filter((element): element is HTMLElement => element !== null);
      const afterHeroSection = root.querySelector<HTMLElement>(
        'section[aria-label="Architectural detail"]',
      );
      const afterHeroImage =
        afterHeroSection?.querySelector<HTMLElement>(":scope > img");
      const workspaceProof =
        afterHeroSection?.querySelector<HTMLElement>("[data-proof-phase]");
      const sectionElements = gsap.utils.toArray<HTMLElement>(
        "[data-section-reveal]",
        root,
      );
      const cleanupCallbacks: Array<() => void> = [];

      gsap.set(heroElements, { willChange: "transform,opacity" });

      const heroTimeline = gsap.timeline({
        defaults: { ease: "power3.out" },
      });

      if (heroEyebrow) {
        heroTimeline.fromTo(
          heroEyebrow,
          { autoAlpha: 0, y: 8 },
          {
            autoAlpha: 1,
            y: 0,
            duration: 0.34,
            clearProps: ANIMATED_PROPERTIES,
          },
          0,
        );
      }

      if (heroVisual) {
        heroTimeline.fromTo(
          heroVisual,
          { autoAlpha: 0, y: 18, scale: 0.992 },
          {
            autoAlpha: 1,
            y: 0,
            scale: 1,
            duration: 0.78,
            ease: "expo.out",
            force3D: true,
            clearProps: ANIMATED_PROPERTIES,
          },
          0.04,
        );
      }

      if (heroText.length > 0) {
        heroTimeline.fromTo(
          heroText,
          { autoAlpha: 0, y: 16 },
          {
            autoAlpha: 1,
            y: 0,
            duration: 0.58,
            stagger: 0.07,
            force3D: true,
            clearProps: ANIMATED_PROPERTIES,
          },
          0.3,
        );
      }

      if (heroDetails.length > 0) {
        heroTimeline.fromTo(
          heroDetails,
          { autoAlpha: 0, y: 12 },
          {
            autoAlpha: 1,
            y: 0,
            duration: 0.48,
            stagger: 0.06,
            force3D: true,
            clearProps: ANIMATED_PROPERTIES,
          },
          0.4,
        );
      }

      if (heroCta) {
        heroTimeline.fromTo(
          heroCta,
          { autoAlpha: 0, y: 10, scale: 0.985 },
          {
            autoAlpha: 1,
            y: 0,
            scale: 1,
            duration: 0.4,
            force3D: true,
            clearProps: ANIMATED_PROPERTIES,
          },
          0.62,
        );
      }

      if (afterHeroSection && afterHeroImage) {
        gsap.fromTo(
          afterHeroImage,
          { scale: 1 },
          {
            scale: () => (window.innerWidth <= 640 ? 1.06 : 1.1),
            transformOrigin: "50% 50%",
            ease: "none",
            scrollTrigger: {
              trigger: afterHeroSection,
              start: "clamp(top bottom)",
              end: "bottom top",
              scrub: 0.8,
              invalidateOnRefresh: true,
              onToggle: ({ isActive }) => {
                afterHeroImage.style.willChange = isActive
                  ? "transform"
                  : "auto";
              },
            },
          },
        );

        cleanupCallbacks.push(() => {
          afterHeroImage.style.willChange = "";
        });
      }

      if (workspaceProof) {
        let proofIsInView = false;
        let proofIsReady = workspaceProof.hasAttribute(
          "data-workspace-ready",
        );
        let proofRevealStarted = false;
        const workspaceReveal = gsap.fromTo(
          workspaceProof,
          { autoAlpha: 0, y: 32, scale: 0.985 },
          {
            autoAlpha: 1,
            y: 0,
            scale: 1,
            duration: 0.82,
            ease: "expo.out",
            force3D: true,
            clearProps: ANIMATED_PROPERTIES,
            paused: true,
            onStart: () => {
              gsap.set(workspaceProof, {
                willChange: "transform,opacity",
              });
            },
          },
        );

        const revealWorkspaceWhenReady = () => {
          if (proofIsInView && proofIsReady && !proofRevealStarted) {
            proofRevealStarted = true;
            workspaceReveal.play();
          }
        };

        const proofVisibilityObserver = new IntersectionObserver(
          (entries) => {
            if (!entries.some((entry) => entry.isIntersecting)) return;
            proofIsInView = true;
            proofVisibilityObserver.disconnect();
            revealWorkspaceWhenReady();
          },
          {
            threshold: 0.15,
            rootMargin: "0px 0px -8% 0px",
          },
        );

        const proofReadinessObserver = new MutationObserver(() => {
          if (!workspaceProof.hasAttribute("data-workspace-ready")) return;
          proofIsReady = true;
          window.clearTimeout(readinessFallback);
          proofReadinessObserver.disconnect();
          revealWorkspaceWhenReady();
        });
        const readinessFallback = window.setTimeout(() => {
          proofIsReady = true;
          proofReadinessObserver.disconnect();
          revealWorkspaceWhenReady();
        }, 1600);

        proofVisibilityObserver.observe(workspaceProof);
        if (!proofIsReady) {
          proofReadinessObserver.observe(workspaceProof, {
            attributes: true,
            attributeFilter: ["data-workspace-ready"],
          });
        }
        revealWorkspaceWhenReady();

        cleanupCallbacks.push(() => {
          window.clearTimeout(readinessFallback);
          proofVisibilityObserver.disconnect();
          proofReadinessObserver.disconnect();
          workspaceReveal.kill();
        });
      }

      sectionElements.forEach((section) => {
        gsap.fromTo(
          section,
          { opacity: 0, y: 18 },
          {
            opacity: 1,
            y: 0,
            duration: 0.48,
            ease: "power3.out",
            scrollTrigger: {
              trigger: section,
              start: "top 88%",
              toggleActions: "play none none none",
            },
          },
        );
      });

      return () => {
        cleanupCallbacks.forEach((cleanup) => cleanup());
      };
    });

    media.add(DESKTOP_MOTION_QUERY, () => {
      const stageItems = gsap.utils.toArray<HTMLElement>(
        "[data-stage-item]",
        root,
      );

      if (stageItems.length > 0) {
        gsap.fromTo(
          stageItems,
          { opacity: 0, y: 14 },
          {
            opacity: 1,
            y: 0,
            duration: 0.42,
            stagger: 0.07,
            ease: "power3.out",
            scrollTrigger: {
              trigger: stageItems[0],
              start: "top 86%",
              toggleActions: "play none none none",
            },
          },
        );
      }
    });

    media.add(REDUCED_MOTION_QUERY, () => {
      const motionTargets = gsap.utils.toArray<HTMLElement>(
        [
          "[data-hero-reveal]",
          "[data-section-reveal]",
          "[data-stage-item]",
          'section[aria-label="Architectural detail"] [data-proof-phase]',
        ].join(","),
        root,
      );

      gsap.set(motionTargets, {
        clearProps: ANIMATED_PROPERTIES,
      });
    });

    return () => media.revert();
  });

  return null;
}
