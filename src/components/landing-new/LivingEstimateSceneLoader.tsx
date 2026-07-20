"use client";

import { useState, useSyncExternalStore } from "react";
import dynamic from "next/dynamic";
import { LivingEstimateControls } from "./LivingEstimateControls";
import type { LivingEstimateState } from "./living-estimate-model";
import styles from "./living-estimate.module.css";

const LivingEstimateScene = dynamic(() => import("./LivingEstimateScene"), {
  ssr: false,
  loading: () => null,
});

/* ------------------------------------------------------------------ */
/* Capability policy (external stores, hydration-safe)                 */
/* ------------------------------------------------------------------ */

function subscribeWidth(callback: () => void): () => void {
  const query = window.matchMedia("(min-width: 768px)");
  query.addEventListener("change", callback);
  return () => query.removeEventListener("change", callback);
}

function subscribeMotion(callback: () => void): () => void {
  const query = window.matchMedia("(prefers-reduced-motion: reduce)");
  query.addEventListener("change", callback);
  return () => query.removeEventListener("change", callback);
}

/**
 * WebGL capability probe, cached for the session. three@0.185 requires
 * WebGL2, so only a webgl2 context counts — anything weaker fails silently
 * inside the scene anyway. The probe context is explicitly lost afterwards:
 * browsers cap the number of live WebGL contexts per page.
 */
let webGLCapable: boolean | null = null;

function probeWebGL(): boolean {
  if (webGLCapable !== null) return webGLCapable;
  try {
    const canvas = document.createElement("canvas");
    const gl = canvas.getContext("webgl2");
    if (!gl) {
      webGLCapable = false;
    } else {
      gl.getExtension("WEBGL_lose_context")?.loseContext();
      webGLCapable = true;
    }
  } catch {
    webGLCapable = false;
  }
  return webGLCapable;
}

const getClientCapability = () => window.matchMedia("(min-width: 768px)").matches && probeWebGL();
const getClientMotion = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const getServerSnapshot = () => false;

/**
 * Loader for The Living Estimate hero scene. Mounts the WebGL scene only
 * when the environment can carry it:
 *
 * - client-side (the scene is dynamically imported with ssr: false),
 * - WebGL2 context creation succeeds,
 * - viewport width >= 768px (mobile is a poster-only experience).
 *
 * prefers-reduced-motion does NOT block mounting — it is passed through and
 * the scene renders every state instantly without tweens. When the scene
 * never mounts this loader renders nothing: the poster is already in the
 * DOM beneath (rendered by the parent page) and stays as the permanent
 * fallback. The stage container starts at opacity 0 and crossfades in only
 * after the scene reports its first rendered frame; the poster is never
 * unmounted or hidden by this component.
 */
export function LivingEstimateSceneLoader() {
  const capable = useSyncExternalStore(subscribeWidth, getClientCapability, getServerSnapshot);
  const reducedMotion = useSyncExternalStore(subscribeMotion, getClientMotion, getServerSnapshot);

  if (!capable) return null;
  // When capability drops the stage unmounts and its frameReady state is
  // destroyed, so a later remount crossfades again from the poster.
  return <LivingEstimateStage reducedMotion={reducedMotion} />;
}

function LivingEstimateStage({ reducedMotion }: { reducedMotion: boolean }) {
  const [state, setState] = useState<LivingEstimateState>("estimate");
  const [frameReady, setFrameReady] = useState(false);

  return (
    <div className={styles.loaderRoot} data-ready={frameReady || undefined}>
      <div className={styles.sceneFade}>
        {/*
         * key remounts the scene when the motion profile flips at runtime:
         * the rAF loop, pointer listener, and entrance are all decided at
         * construction, and a rebuild is the deterministic way to flip them.
         */}
        <LivingEstimateScene
          key={reducedMotion ? "reduced" : "full"}
          state={state}
          reducedMotion={reducedMotion}
          onFirstFrame={() => setFrameReady(true)}
        />
      </div>
      <div className={styles.controlsBar}>
        <LivingEstimateControls state={state} onChange={setState} />
      </div>
    </div>
  );
}
