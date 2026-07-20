"use client";

import type { ReactNode } from "react";
import { useEffect, useId, useRef, useState } from "react";
import styles from "./product-playback.module.css";

type PlaybackItem = { readonly id: string; readonly label: string; readonly summary: string; readonly content: ReactNode };

export function ProductPlayback({ items, label, interval = 3600, manualOnly = false }: { items: readonly PlaybackItem[]; label: string; interval?: number; manualOnly?: boolean }) {
  const [activeIndex, setActiveIndex] = useState(0);
  const [manual, setManual] = useState(manualOnly);
  const [paused, setPaused] = useState(false);
  const [nearViewport, setNearViewport] = useState(false);
  const [visible, setVisible] = useState(() => typeof document === "undefined" || document.visibilityState === "visible");
  const completedRef = useRef(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const tabsRef = useRef<HTMLDivElement>(null);
  const idPrefix = useId();

  useEffect(() => {
    const onVisibility = () => setVisible(document.visibilityState === "visible");
    document.addEventListener("visibilitychange", onVisibility);
    return () => document.removeEventListener("visibilitychange", onVisibility);
  }, []);

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    const observer = new IntersectionObserver(([entry]) => setNearViewport(entry.isIntersecting), { rootMargin: "20% 0px 20%" });
    observer.observe(root);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (manual || paused || reduced || !nearViewport || !visible || completedRef.current || items.length < 2) return;
    const timer = window.setTimeout(() => {
      setActiveIndex((current) => {
        const next = current + 1;
        if (next >= items.length) {
          completedRef.current = true;
          return current;
        }
        return next;
      });
    }, interval);
    return () => window.clearTimeout(timer);
  }, [activeIndex, interval, items.length, manual, nearViewport, paused, visible]);

  useEffect(() => {
    const tabs = tabsRef.current;
    const activeTab = tabs?.querySelector<HTMLButtonElement>('[aria-selected="true"]');
    if (!tabs || !activeTab) return;
    tabs.scrollTo({
      left: activeTab.offsetLeft - (tabs.clientWidth - activeTab.clientWidth) / 2,
      behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth",
    });
  }, [activeIndex]);

  const select = (index: number) => {
    completedRef.current = true;
    setManual(true);
    setActiveIndex(index);
  };

  return (
    <div
      ref={rootRef}
      className={styles.playback}
      data-active={items[activeIndex]?.id}
      onPointerEnter={() => setPaused(true)}
      onPointerLeave={() => setPaused(false)}
      onFocus={() => setPaused(true)}
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) setPaused(false);
      }}
    >
      <div ref={tabsRef} className={styles.tabs} role="tablist" aria-label={label}>
        {items.map((item, index) => (
          <button key={item.id} type="button" role="tab" id={`${idPrefix}-${item.id}-tab`} aria-controls={`${idPrefix}-${item.id}-panel`} aria-selected={activeIndex === index} tabIndex={activeIndex === index ? 0 : -1} onClick={() => select(index)} onKeyDown={(event) => {
            if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) return;
            event.preventDefault();
            const next = event.key === "Home"
              ? 0
              : event.key === "End"
                ? items.length - 1
                : (index + (event.key === "ArrowRight" ? 1 : -1) + items.length) % items.length;
            select(next);
            document.getElementById(`${idPrefix}-${items[next].id}-tab`)?.focus();
          }}>
            <span>{item.label}</span><i aria-hidden="true" />
          </button>
        ))}
      </div>
      <div className={styles.panels}>
        {items.map((item, index) => (
          <section key={item.id} role="tabpanel" id={`${idPrefix}-${item.id}-panel`} aria-labelledby={`${idPrefix}-${item.id}-tab`} hidden={activeIndex !== index}>
            {item.content}
            <p className={styles.summary}>{item.summary}</p>
          </section>
        ))}
      </div>
    </div>
  );
}
