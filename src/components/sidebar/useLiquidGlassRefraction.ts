"use client";

import { useEffect, useRef, useState } from "react";
import type { CSSProperties, RefObject } from "react";

/**
 * Shared id for the inline SVG `<filter>` defined by {@link SidebarGlassFilter}.
 * The sidebar panel swaps its single `backdrop-filter` to `url(#sc-sidebar-glass)`
 * when {@link useLiquidGlassRefraction} reports `refractionEnabled === true`.
 */
export const SC_SIDEBAR_GLASS_FILTER_ID = "sc-sidebar-glass";

const REFRACTION_MEDIA_QUERIES = [
  "(min-width:1024px)",
  "(hover:hover)",
  "(pointer:fine)",
  "(prefers-reduced-motion:no-preference)",
  // Honor the reduced-transparency opt-out: never enable the displacement filter
  // so the solid fallback in globals.css wins cleanly (no GPU glass for opt-outs).
  "(prefers-reduced-transparency:no-preference)",
] as const;

type NavigatorUAData = {
  brands?: ReadonlyArray<{ brand: string; version: string }>;
};

/**
 * Chromium-engine runtime check. The liquid-glass `backdrop-filter: url(#…)`
 * displacement path is only reliable on Blink, so we positively detect Chromium
 * (Chrome, Edge, Brave, Opera, CriOS all report a Chromium brand / UA token) and
 * exclude Safari + Firefox.
 */
function isChromiumEngine(): boolean {
  if (typeof navigator === "undefined") return false;

  const uaData = (navigator as Navigator & { userAgentData?: NavigatorUAData }).userAgentData;
  const brands = uaData?.brands;
  if (brands && brands.length > 0) {
    return brands.some(({ brand }) => brand === "Chromium" || brand === "Google Chrome");
  }

  // UA-string fallback (Safari/Firefox expose no userAgentData).
  // Safari lacks the "Chrome" token entirely; Firefox is excluded explicitly.
  const ua = navigator.userAgent;
  const looksChromium = /\b(Chrome|Chromium|CriOS)\b/.test(ua);
  const looksGecko = /\b(Firefox|FxiOS)\b/.test(ua);
  return looksChromium && !looksGecko;
}

function evaluateRefractionSupport(): boolean {
  if (typeof window === "undefined" || typeof window.matchMedia !== "function") {
    return false;
  }
  const mediaPass = REFRACTION_MEDIA_QUERIES.every((query) => window.matchMedia(query).matches);
  return mediaPass && isChromiumEngine();
}

/**
 * SSR-safe progressive-enhancement gate for the desktop liquid-glass refraction
 * effect. Returns `false` on the server and on the first client paint (to avoid
 * a hydration mismatch), then re-evaluates inside an effect and on any relevant
 * `matchMedia` change.
 */
export function useLiquidGlassRefraction(): { refractionEnabled: boolean } {
  const [refractionEnabled, setRefractionEnabled] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined" || typeof window.matchMedia !== "function") {
      return;
    }

    const mediaQueryLists = REFRACTION_MEDIA_QUERIES.map((query) => window.matchMedia(query));
    const update = () => setRefractionEnabled(evaluateRefractionSupport());

    update();

    for (const mql of mediaQueryLists) {
      mql.addEventListener("change", update);
    }

    return () => {
      for (const mql of mediaQueryLists) {
        mql.removeEventListener("change", update);
      }
    };
  }, []);

  return { refractionEnabled };
}

type GlassElasticityOptions = {
  /** Caller passes the refraction gate result; effect is inert when false. */
  enabled?: boolean;
  /** Max px the surface nudges toward the pointer. Default ~3px. */
  strength?: number;
};

const DEFAULT_ELASTICITY_STRENGTH = 3;
// Spring-ish damping: fraction of the gap closed per rAF tick.
const ELASTICITY_DAMPING = 0.18;
const ELASTICITY_EPSILON = 0.01;

/**
 * Optional / additive. Returns a CSSProperties `transform` that elastically
 * nudges the referenced element a few px toward the pointer with spring-ish
 * damping. Fully disabled (returns `{}`) unless `enabled` is true; it also
 * respects reduced-motion and never runs without a Chromium-gated caller.
 */
export function useGlassElasticity(
  ref: RefObject<HTMLElement | null>,
  opts: GlassElasticityOptions = {},
): CSSProperties {
  const { enabled = false, strength = DEFAULT_ELASTICITY_STRENGTH } = opts;
  const [transform, setTransform] = useState<CSSProperties>({});

  // Keep the latest tunables available to the rAF loop without re-subscribing.
  const strengthRef = useRef(strength);
  strengthRef.current = strength;

  useEffect(() => {
    if (!enabled) {
      setTransform({});
      return;
    }
    if (typeof window === "undefined" || typeof window.matchMedia !== "function") {
      return;
    }
    if (window.matchMedia("(prefers-reduced-motion:reduce)").matches) {
      setTransform({});
      return;
    }

    const element = ref.current;
    if (!element) return;

    const target = { x: 0, y: 0 };
    const current = { x: 0, y: 0 };
    let frame = 0;

    const tick = () => {
      const dx = target.x - current.x;
      const dy = target.y - current.y;
      current.x += dx * ELASTICITY_DAMPING;
      current.y += dy * ELASTICITY_DAMPING;

      setTransform({ transform: `translate3d(${current.x.toFixed(2)}px, ${current.y.toFixed(2)}px, 0)` });

      if (Math.abs(dx) > ELASTICITY_EPSILON || Math.abs(dy) > ELASTICITY_EPSILON) {
        frame = window.requestAnimationFrame(tick);
      } else {
        frame = 0;
      }
    };

    const schedule = () => {
      if (frame === 0) frame = window.requestAnimationFrame(tick);
    };

    const handlePointerMove = (event: PointerEvent) => {
      const rect = element.getBoundingClientRect();
      if (rect.width === 0 || rect.height === 0) return;
      // Normalize pointer offset from element center to [-1, 1], scale by strength.
      const normX = (event.clientX - (rect.left + rect.width / 2)) / (rect.width / 2);
      const normY = (event.clientY - (rect.top + rect.height / 2)) / (rect.height / 2);
      const s = strengthRef.current;
      target.x = Math.max(-1, Math.min(1, normX)) * s;
      target.y = Math.max(-1, Math.min(1, normY)) * s;
      schedule();
    };

    const handlePointerLeave = () => {
      target.x = 0;
      target.y = 0;
      schedule();
    };

    element.addEventListener("pointermove", handlePointerMove);
    element.addEventListener("pointerleave", handlePointerLeave);

    return () => {
      element.removeEventListener("pointermove", handlePointerMove);
      element.removeEventListener("pointerleave", handlePointerLeave);
      if (frame !== 0) window.cancelAnimationFrame(frame);
      setTransform({});
    };
  }, [enabled, ref]);

  return transform;
}
