"use client";

import { useEffect, useState } from "react";

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
    if (typeof window.matchMedia !== "function") {
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
