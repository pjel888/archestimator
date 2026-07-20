"use client";

import { useEffect, useState } from "react";
import styles from "./workflow-rail.module.css";

type ChapterLink = { readonly id: string; readonly number: string; readonly label: string };

export function WorkflowRail({ chapters }: { chapters: readonly ChapterLink[] }) {
  const [active, setActive] = useState(chapters[0]?.id ?? "");

  useEffect(() => {
    const elements = chapters.map((chapter) => document.getElementById(chapter.id)).filter((element): element is HTMLElement => Boolean(element));
    const observer = new IntersectionObserver((entries) => {
      const visible = entries.filter((entry) => entry.isIntersecting).sort((a, b) => Math.abs(a.boundingClientRect.top) - Math.abs(b.boundingClientRect.top));
      if (visible[0]?.target.id) setActive(visible[0].target.id);
    }, { rootMargin: "-45% 0px -48% 0px", threshold: 0 });
    elements.forEach((element) => observer.observe(element));
    return () => observer.disconnect();
  }, [chapters]);

  return (
    <nav className={styles.rail} aria-label="Workflow chapters">
      {chapters.map((chapter) => (
        <a key={chapter.id} href={`#${chapter.id}`} aria-current={active === chapter.id ? "step" : undefined} onClick={(event) => {
          if (!window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
            event.preventDefault();
            document.getElementById(chapter.id)?.scrollIntoView({ behavior: "smooth", block: "start" });
            history.replaceState(null, "", `#${chapter.id}`);
          }
        }}>
          <span>{chapter.number}</span><strong>{chapter.label}</strong>
        </a>
      ))}
    </nav>
  );
}
