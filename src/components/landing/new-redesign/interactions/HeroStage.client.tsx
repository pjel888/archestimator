"use client";

import type { ReactNode } from "react";
import { useEffect, useRef } from "react";
import styles from "./hero-stage.module.css";

export function HeroStage({ children }: { children: ReactNode }) {
  const rootRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    const media = window.matchMedia("(min-width: 768px) and (prefers-reduced-motion: no-preference)");
    const onScroll = () => root.toggleAttribute("data-scrolled", media.matches && window.scrollY > 28);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    media.addEventListener("change", onScroll);
    return () => { window.removeEventListener("scroll", onScroll); media.removeEventListener("change", onScroll); };
  }, []);
  return <div ref={rootRef} className={styles.stage}>{children}</div>;
}
