"use client";

import { useEffect, useState } from "react";

import { LANDING_AUTH_HINT_PATH } from "@/lib/landing/landing-auth-session-cookie";

/**
 * Client-side display hint for CDN-cached marketing pages.
 * Defaults to logged-out (fail closed). Upgrades CTA copy only when the
 * private auth-hint endpoint reports a Better Auth session cookie.
 * Never grants workshop access — protected routes stay fail-closed.
 */
export function useLandingAuthHint(override?: boolean): boolean {
  const [isLoggedIn, setIsLoggedIn] = useState(override ?? false);

  useEffect(() => {
    if (typeof override === "boolean") {
      setIsLoggedIn(override);
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
          if (!cancelled) setIsLoggedIn(false);
          return;
        }
        const body: unknown = await response.json();
        const hinted =
          typeof body === "object" &&
          body !== null &&
          "isLoggedIn" in body &&
          (body as { isLoggedIn: unknown }).isLoggedIn === true;
        if (!cancelled) setIsLoggedIn(hinted);
      } catch {
        if (!cancelled) setIsLoggedIn(false);
      }
    }

    void loadHint();

    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [override]);

  return isLoggedIn;
}
