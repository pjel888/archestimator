"use client";

import dynamic from "next/dynamic";
import { useEffect, useRef, useState } from "react";
import styles from "../sections/ProductStage.module.css";

const ActualWorkspace = dynamic(
  () => import("./ExactEstimateWorkspace.client").then((module) => module.ExactEstimateWorkspace),
  { ssr: false, loading: () => null },
);

export function ActualWorkspaceStage() {
  const rootRef = useRef<HTMLDivElement>(null);
  const [shouldMount, setShouldMount] = useState(false);

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    const width = window.matchMedia("(min-width: 1024px)");
    const update = () => {
      if (!width.matches) setShouldMount(false);
    };
    const observer = new IntersectionObserver(([entry]) => {
      if (entry?.isIntersecting && width.matches) setShouldMount(true);
    }, { rootMargin: "35% 0px" });
    observer.observe(root);
    width.addEventListener("change", update);
    return () => {
      observer.disconnect();
      width.removeEventListener("change", update);
    };
  }, []);

  return (
    <div ref={rootRef} className={styles.actualWorkspaceLayer} aria-hidden="true" inert>
      {shouldMount ? <div className={styles.workspaceScale}><ActualWorkspace /></div> : <p className={styles.workspaceLoading}>Loading the actual estimate workspace…</p>}
    </div>
  );
}
