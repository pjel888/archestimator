"use client";

import { useEffect, useState } from "react";

import { LANDING_AUTH_HINT_PATH } from "@/lib/landing/landing-auth-session-cookie";

interface LandingAuthHintState {
  isLoggedIn: boolean;
  isLoading: boolean;
}

/**
 * Client-side display hint for CDN-cached marketing pages.
 * Defaults to logged-out (fail closed). Upgrades CTA copy only when the
 * private auth-hint endpoint reports a Better Auth session cookie.
 * Never grants workshop access — protected routes stay fail-closed.
 */
export function useLandingAuthHint(override?: boolean): boolean {
  const { isLoggedIn } = useLandingAuthHintState(override);
  return isLoggedIn;
}

/**
 * Stateful variant that exposes the loading phase. Use this when the UI should
 * stay blank until the auth hint resolves instead of flipping from the default
 * signed-out state to the signed-in state.
 */
export function useLandingAuthHintState(override?: boolean): LandingAuthHintState {
  const [fetchedState, setFetchedState] = useState<LandingAuthHintState>({
    isLoggedIn: false,
    isLoading: true,
  });

  const shouldFetch = typeof override !== "boolean";

  useEffect(() => {
    if (!shouldFetch) {
      return;
    }

    let cancelled = false;
    const controller = new AbortController();

    async function loadHint() {
      try {
        const response = await fetch(LANDING_AUTH_HINT_PATH, {
          method: "GET",
          credentials: "same-origin",
          cache: "no-store",
          headers: { Accept: "application/json" },
          signal: controller.signal,
        });
        if (!response.ok) {
          if (!cancelled) setFetchedState({ isLoggedIn: false, isLoading: false });
          return;
        }
        const body: unknown = await response.json();
        const hinted =
          typeof body === "object" &&
          body !== null &&
          "isLoggedIn" in body &&
          (body as { isLoggedIn: unknown }).isLoggedIn === true;
        if (!cancelled) setFetchedState({ isLoggedIn: hinted, isLoading: false });
      } catch {
        if (!cancelled) setFetchedState({ isLoggedIn: false, isLoading: false });
      }
    }

    void loadHint();

    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [shouldFetch]);

  // When the caller supplies an explicit override, return it directly. The
  // effect above is skipped, so this path avoids any setState-in-effect lint
  // issues and keeps the hook SSR-safe.
  if (typeof override === "boolean") {
    return { isLoggedIn: override, isLoading: false };
  }

  return fetchedState;
}
