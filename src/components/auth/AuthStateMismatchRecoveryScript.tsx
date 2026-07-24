"use client";

import { useEffect, useRef } from "react";

import { sanitizeProtectedReturnPath } from "@/lib/auth/redirects";

export function AuthStateMismatchRecoveryScript() {
  const hasRun = useRef(false);

  useEffect(() => {
    if (hasRun.current) return;
    hasRun.current = true;

    try {
      const params = new URLSearchParams(window.location.search);
      const hasStateMismatch = params.get("error") === "state_mismatch";
      const isResetHop =
        window.location.pathname === "/login" &&
        params.get("oauth_state_reset") === "1" &&
        params.get("oauth_state_reset_done") !== "1";

      if (!hasStateMismatch && !isResetHop) return;

      const next = sanitizeProtectedReturnPath(params.get("next"));

      if ("caches" in window) {
        void window.caches
          .keys()
          .then((keys) => Promise.all(keys.map((key) => window.caches.delete(key))))
          .catch(() => undefined);
      }

      const target = new URL("/login", window.location.origin);
      target.searchParams.set("next", next);
      target.searchParams.set("oauth_state_reset", "1");
      if (isResetHop) target.searchParams.set("oauth_state_reset_done", "1");
      window.location.replace(target.toString());
    } catch {}
  }, []);

  return null;
}
