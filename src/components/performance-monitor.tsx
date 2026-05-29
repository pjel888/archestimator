"use client";

import { useEffect, useRef } from "react";
import { useNavigationUiStore } from "@/stores/navigation-ui-store";

export function PerformanceMonitor() {
  const lastHref = useRef<string | null>(null);

  useEffect(() => {
    const unsub = useNavigationUiStore.subscribe((state, prevState) => {
      if (prevState.isNavigating && !state.isNavigating && lastHref.current) {
        const elapsed = Date.now() - state.startTime;

        if (process.env.NODE_ENV === "development") {
          const route = lastHref.current || "(unknown)";
          const icon = elapsed < 100 ? "⚡" : elapsed < 250 ? "✓" : elapsed < 500 ? "🔶" : "🐌";
          // eslint-disable-next-line no-console
          console.log(`[Performance] ${icon} ${route} → ${elapsed}ms`);
        }

        lastHref.current = null;
      }

      if (!prevState.isNavigating && state.isNavigating) {
        lastHref.current = state.targetHref;
      }
    });

    return unsub;
  }, []);

  return null;
}
