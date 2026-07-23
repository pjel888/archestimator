"use client";

import { useRef } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";

import { storyProgress } from "./story-progress";

gsap.registerPlugin(ScrollTrigger, useGSAP);

/**
 * GSAP owns the workflow progress timeline without pinning or intercepting
 * scroll. The full runway moves through normal document flow. The timeline
 * draws the orange route, emphasizes the current handoff, and publishes
 * normalized progress to the decorative Three.js field. Mobile and
 * reduced-motion branches keep the complete static state.
 */
export function WorkflowMotion({ children }: { children: React.ReactNode }) {
  const rootRef = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      const mm = gsap.matchMedia();

      mm.add(
        "(min-width: 901px) and (prefers-reduced-motion: no-preference)",
        () => {
          const root = rootRef.current;
          if (!root) return;

          const track = root.querySelector<HTMLElement>("[data-story-track]");
          const items = gsap.utils.toArray<HTMLElement>(
            "[data-stage-item]",
            root,
          );
          const progressPath = root.querySelector<SVGPathElement>(
            "[data-story-progress]",
          );
          if (!track || items.length === 0 || !progressPath) return;

          track.setAttribute("data-motion", "");
          gsap.set(progressPath, { strokeDashoffset: 1 });

          const setActive = (index: number) => {
            items.forEach((item, itemIndex) => {
              if (itemIndex === index) item.setAttribute("data-active", "");
              else item.removeAttribute("data-active");
            });
          };
          setActive(0);

          const timeline = gsap.timeline({
            defaults: { ease: "none" },
            scrollTrigger: {
              trigger: track,
              start: "top 82%",
              end: "bottom 24%",
              scrub: 0.35,
              onUpdate(self) {
                const stageProgress = self.progress * (items.length - 1);
                setActive(Math.round(stageProgress));
                storyProgress.publish(
                  self.progress,
                  self.progress * (items.length - 1),
                );
              },
            },
          });

          timeline
            .addLabel("build", 0)
            .addLabel("publish", 1)
            .addLabel("review", 2)
            .addLabel("revise", 3)
            .to(
              progressPath,
              { strokeDashoffset: 0, duration: items.length - 1 },
              0,
            );

          // Fonts and the hero proof can shift the trigger geometry after first paint.
          let cancelled = false;
          const refresh = () => {
            if (!cancelled) ScrollTrigger.refresh();
          };
          if (document.fonts) {
            document.fonts.ready.then(refresh).catch(() => {});
          }

          return () => {
            cancelled = true;
            track.removeAttribute("data-motion");
            items.forEach((item) => item.removeAttribute("data-active"));
            storyProgress.publish(0, 0);
          };
        },
      );

      return () => mm.revert();
    },
    { scope: rootRef },
  );

  return <div ref={rootRef}>{children}</div>;
}
