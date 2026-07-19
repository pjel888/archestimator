"use client";

import { useRef, type ReactNode } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";

gsap.registerPlugin(ScrollTrigger, useGSAP);

/**
 * Motion orchestration for the /new landing page. Content is fully visible
 * without JavaScript; every animation enhances an already-rendered default.
 * Spatial motion only runs under prefers-reduced-motion: no-preference.
 */
export function NewLandingMotion({ children }: { children: ReactNode }) {
  const scopeRef = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      const scope = scopeRef.current;
      if (!scope) return;

      const mm = gsap.matchMedia();

      mm.add("(prefers-reduced-motion: no-preference)", () => {
        // ---- Hero entrance choreography ----------------------------------
        const heroTimeline = gsap.timeline({ defaults: { ease: "expo.out" } });
        heroTimeline
          .from("[data-hero='kicker']", { autoAlpha: 0, y: 18, duration: 0.9 }, 0.15)
          .from("[data-hero-line]", { yPercent: 112, duration: 1.15, stagger: 0.09 }, 0.25)
          .from("[data-hero='scene']", { autoAlpha: 0, duration: 1.7, ease: "power3.out" }, 0.3)
          .from("[data-hero='intro']", { autoAlpha: 0, y: 22, duration: 1 }, 0.72)
          .from("[data-hero='ctas']", { autoAlpha: 0, y: 20, duration: 1 }, 0.84);

        // ---- The estimate tells its story on scroll: rows, total, pill ---
        const sheet = scope.querySelector<HTMLElement>("[data-hero='sheet']");
        if (sheet) {
          const sheetTimeline = gsap.timeline({
            defaults: { ease: "expo.out" },
            scrollTrigger: { trigger: sheet, start: "top 80%", once: true },
          });
          sheetTimeline.from(sheet, { autoAlpha: 0, y: 56, duration: 1.2 }, 0);

          const sheetRows = gsap.utils.toArray<HTMLElement>("[data-sheet-row]");
          if (sheetRows.length > 0) {
            sheetTimeline.from(
              sheetRows,
              { autoAlpha: 0, y: 12, duration: 0.55, stagger: 0.05, ease: "power3.out" },
              0.35,
            );
          }

          const sheetNote = scope.querySelector<HTMLElement>("[data-sheet='note']");
          if (sheetNote) {
            sheetTimeline.from(sheetNote, { autoAlpha: 0, y: 10, duration: 0.6 }, 1.3);
          }

          const totalElement = scope.querySelector<HTMLElement>("[data-sheet='total']");
          if (totalElement) {
            const target = Number(totalElement.dataset.value ?? "0");
            const counter = { value: 0 };
            const formatter = new Intl.NumberFormat("en-US");
            sheetTimeline.to(
              counter,
              {
                value: target,
                duration: 1.5,
                ease: "power2.out",
                onUpdate: () => {
                  totalElement.textContent = `$${formatter.format(Math.round(counter.value))}`;
                },
              },
              0.6,
            );
          }

          const pill = scope.querySelector<HTMLElement>("[data-sheet='pill']");
          if (pill) {
            const setPill = (state: string, label: string) => {
              pill.dataset.state = state;
              pill.textContent = label;
            };
            sheetTimeline
              .call(() => setPill("draft", "Draft"), [], 0.35)
              .call(() => setPill("sent", "Sent"), [], 1.6)
              .call(() => setPill("approved", "Approved"), [], 2.5);
          }
        }

        const underline = scope.querySelector<SVGPathElement>("[data-hero='underline']");
        if (underline) {
          const length = underline.getTotalLength();
          gsap.fromTo(
            underline,
            { strokeDasharray: length, strokeDashoffset: length },
            { strokeDashoffset: 0, duration: 1.1, ease: "power3.inOut", delay: 1.1 },
          );
        }

        // ---- Section reveals (enhance, never gate) ------------------------
        gsap.utils.toArray<HTMLElement>("[data-reveal]").forEach((element) => {
          gsap.from(element, {
            autoAlpha: 0,
            y: 30,
            duration: 1.1,
            ease: "expo.out",
            scrollTrigger: { trigger: element, start: "top 88%", once: true },
          });
        });

        // ---- Word-by-word scrub statements --------------------------------
        gsap.utils.toArray<HTMLElement>("[data-scrub-words]").forEach((element) => {
          const words = element.textContent?.split(/\s+/).filter(Boolean) ?? [];
          if (words.length === 0) return;
          element.textContent = "";
          const spans = words.map((word) => {
            const span = document.createElement("span");
            span.textContent = word;
            span.style.display = "inline-block";
            span.style.whiteSpace = "pre";
            element.appendChild(span);
            element.appendChild(document.createTextNode(" "));
            return span;
          });
          gsap.fromTo(
            spans,
            { opacity: 0.13 },
            {
              opacity: 1,
              stagger: 0.05,
              ease: "none",
              scrollTrigger: { trigger: element, start: "top 80%", end: "top 28%", scrub: 0.5 },
            },
          );
        });
      });

      // ---- Workflow rail active state (state, not decoration) ------------
      const steps = gsap.utils.toArray<HTMLElement>("[data-step]");
      steps.forEach((step) => {
        const index = step.dataset.step ?? "";
        ScrollTrigger.create({
          trigger: step,
          start: "top 58%",
          end: "bottom 42%",
          onToggle: (self) => {
            if (!self.isActive) return;
            scope.querySelectorAll<HTMLElement>("[data-rail-item]").forEach((item) => {
              item.toggleAttribute("data-active", item.dataset.railItem === index);
            });
            steps.forEach((candidate) => candidate.toggleAttribute("data-active", candidate === step));
          },
        });
      });

      // ---- Nav scroll morph -----------------------------------------------
      const nav = scope.querySelector<HTMLElement>("[data-nav]");
      if (nav) {
        const setNavState = () => nav.toggleAttribute("data-scrolled", window.scrollY > 40);
        setNavState();
        ScrollTrigger.create({ start: 0, end: "max", onUpdate: setNavState });
      }

      // ---- Sticky CTA: after the hero, until the final CTA ----------------
      const stickyCta = scope.querySelector<HTMLElement>("[data-sticky-cta]");
      if (stickyCta) {
        ScrollTrigger.create({
          trigger: "[data-hero-root]",
          start: "bottom 55%",
          endTrigger: "[data-final-cta]",
          end: "top 75%",
          onToggle: (self) => stickyCta.toggleAttribute("data-visible", self.isActive),
        });
      }

      return () => mm.revert();
    },
    { scope: scopeRef },
  );

  return <div ref={scopeRef}>{children}</div>;
}
