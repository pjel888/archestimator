"use client";

import { useCallback, useSyncExternalStore } from "react";

export function useMediaQuery(query: string, serverSnapshot = false) {
  const subscribe = useCallback(
    (callback: () => void) => {
      if (typeof window === "undefined" || typeof window.matchMedia !== "function") return () => {};
      const mediaQuery = window.matchMedia(query);
      mediaQuery.addEventListener("change", callback);
      return () => mediaQuery.removeEventListener("change", callback);
    },
    [query],
  );

  const getSnapshot = useCallback(
    () => typeof window !== "undefined" && typeof window.matchMedia === "function" && window.matchMedia(query).matches,
    [query],
  );

  const getServerSnapshot = useCallback(() => serverSnapshot, [serverSnapshot]);

  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
