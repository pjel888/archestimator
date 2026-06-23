"use client";

import { useEffect, useRef, type CSSProperties, type ElementType, type ReactNode } from "react";

type RevealOnScrollProps = {
  children: ReactNode;
  className?: string;
  as?: ElementType;
  delayMs?: number;
  yOffset?: number;
  id?: string;
  style?: CSSProperties;
};

/**
 * Lightweight IntersectionObserver-based reveal wrapper.
 * Animates opacity + transform + filter only (GPU-safe).
 * Respects prefers-reduced-motion: renders children statically.
 */
export function RevealOnScroll({
  children,
  className,
  as,
  delayMs = 0,
  yOffset = 24,
  id,
  style,
}: RevealOnScrollProps) {
  const Tag = (as ?? "div") as ElementType;
  const ref = useRef<HTMLElement | null>(null);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;

    const prefersReduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (prefersReduced) {
      node.setAttribute("data-revealed", "true");
      return;
    }

    node.style.transitionDelay = `${delayMs}ms`;

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            entry.target.setAttribute("data-revealed", "true");
            observer.unobserve(entry.target);
          }
        }
      },
      { threshold: 0.12, rootMargin: "0px 0px -8% 0px" },
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, [delayMs, yOffset]);

  return (
    <Tag
      ref={ref}
      id={id}
      className={className}
      data-reveal="true"
      style={{ "--reveal-y": `${yOffset}px`, ...style } as CSSProperties}
    >
      {children}
    </Tag>
  );
}
