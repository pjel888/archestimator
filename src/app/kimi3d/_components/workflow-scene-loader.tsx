"use client";

import { useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";

import styles from "../kimi-landing.module.css";

export type WorkflowSceneProps = {
  onReady?: () => void;
  onError?: () => void;
};

function WorkflowSceneUnavailable({ onError }: WorkflowSceneProps) {
  useEffect(() => {
    onError?.();
  }, [onError]);

  return null;
}

const WorkflowScene = dynamic<WorkflowSceneProps>(
  () =>
    import("./workflow-scene").catch(() => ({
      default: WorkflowSceneUnavailable,
    })),
  { ssr: false },
);

const DESKTOP_QUERY = "(min-width: 901px)";
const REDUCED_MOTION_QUERY = "(prefers-reduced-motion: reduce)";

/**
 * Client-owned dynamic boundary for the Three.js island. `ssr: false` lives
 * inside this Client Component, never in the server composition. The scene
 * loads shortly before the story approaches the viewport, only in a desktop,
 * motion-allowed context. Every other branch (mobile, reduced motion,
 * no-WebGL, load failure) keeps the server-rendered DOM/SVG fallback, and the
 * mount stays transparent until the scene reports its first real frame.
 */
export function WorkflowSceneLoader() {
  const hostRef = useRef<HTMLDivElement>(null);
  const [shouldLoad, setShouldLoad] = useState(false);
  const [ready, setReady] = useState(false);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;

    const desktopQuery = window.matchMedia(DESKTOP_QUERY);
    const reducedMotionQuery = window.matchMedia(REDUCED_MOTION_QUERY);
    let observer: IntersectionObserver | null = null;

    const syncEligibility = () => {
      const eligible = desktopQuery.matches && !reducedMotionQuery.matches;

      observer?.disconnect();
      observer = null;

      if (!eligible) {
        setShouldLoad(false);
        setReady(false);
        return;
      }

      observer = new IntersectionObserver(
        (entries) => {
          for (const entry of entries) {
            if (entry.isIntersecting) {
              setShouldLoad(true);
              observer?.disconnect();
              observer = null;
            }
          }
        },
        { rootMargin: "125% 0px 125% 0px" },
      );
      observer.observe(host);
    };

    syncEligibility();
    desktopQuery.addEventListener("change", syncEligibility);
    reducedMotionQuery.addEventListener("change", syncEligibility);

    return () => {
      observer?.disconnect();
      desktopQuery.removeEventListener("change", syncEligibility);
      reducedMotionQuery.removeEventListener("change", syncEligibility);
    };
  }, []);

  return (
    <div
      ref={hostRef}
      className={styles.sceneMount}
      data-scene-ready={ready && !failed ? "" : undefined}
      aria-hidden="true"
    >
      {shouldLoad && !failed ? (
        <WorkflowScene
          onReady={() => setReady(true)}
          onError={() => setFailed(true)}
        />
      ) : null}
    </div>
  );
}
