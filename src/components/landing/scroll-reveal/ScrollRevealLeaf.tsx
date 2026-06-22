"use client";

import { type ElementType, type ReactNode } from "react";
import { cn } from "@/lib/ui/cn";

/**
 * ScrollRevealLeaf — the tiny per-section client leaf that drives the
 * LandingShellClient IntersectionObserver reveal (doc 07 §1.2). Each
 * section opts into the reveal by wrapping its inner content in this leaf;
 * the shell toggles `data-reveal-visible` on scroll-in.
 *
 * The reveal itself is CSS-driven (opacity + 8px translateY, 200–300ms),
 * not JS-animated, so reduced-motion snaps rather than animates (doc 03 §8).
 * This leaf only carries the `data-reveal` marker and a stable className.
 *
 * RSC-first invariant (doc 07): this is the smallest possible hydration
 * surface — it renders `children` unchanged and adds no behavior beyond
 * the data attribute the shell reads.
 */
export interface ScrollRevealLeafProps {
  children: ReactNode;
  as?: ElementType;
  className?: string;
  /** Delay band (ms) encoded as a data attr for the CSS transition. */
  delay?: "0" | "80" | "160" | "240";
}

export function ScrollRevealLeaf({
  children,
  as,
  className,
  delay = "0",
}: ScrollRevealLeafProps) {
  const Tag = (as ?? "div") as ElementType;
  return (
    <Tag
      data-reveal="true"
      data-reveal-delay={delay}
      className={cn(
        "transition-[opacity,transform] duration-300 ease-out will-change-[opacity,transform]",
        "data-[reveal-visible=true]:opacity-100 data-[reveal-visible=true]:translate-y-0",
        "opacity-0 translate-y-2 motion-reduce:transition-none motion-reduce:opacity-100 motion-reduce:translate-y-0",
        className,
      )}
    >
      {children}
    </Tag>
  );
}
