"use client";

import { useSyncExternalStore } from "react";

const emptySubscribe = () => () => {};

/**
 * Returns `false` during server render AND the first client (hydration) render,
 * then `true` after hydration commits — without ever producing a hydration
 * mismatch.
 *
 * `useSyncExternalStore` uses its server snapshot (`() => false`) for both the
 * SSR pass and the hydration pass, so the first client render is byte-identical
 * to the server. React then re-runs with the client snapshot (`() => true`)
 * after commit. Gate any browser-only or non-deterministic render value behind
 * this flag (render the server-safe value while `false`, the real value once
 * `true`) instead of reading `window`/`Date`/`localStorage` directly in render.
 *
 * This is the same pattern the codebase already uses inline (e.g. the landing
 * consent banner and project view-mode store), extracted so the many
 * hydration-sensitive surfaces share one implementation.
 */
export function useIsHydrated(): boolean {
  return useSyncExternalStore(
    emptySubscribe,
    () => true,
    () => false,
  );
}
