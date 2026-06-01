"use client";

import { useSyncExternalStore } from "react";

export interface UseSharedLinkSessionResult {
  isValid: boolean;
}

/**
 * P5 — useSharedLinkSession hook (client-side).
 * Reads the non-sensitive companion flag cookie (`..._ok=1`) that is set
 * server-side (additive) whenever the primary HttpOnly `shared_link_session_[token]`
 * cookie is established or validated on /share/[token]?recipient= or subsequent loads.
 *
 * This allows client components to block interactive UI (comments, decisions — P6+)
 * without ever exposing the HttpOnly session material to JS.
 *
 * Backwards compatible: returns { isValid: false } for view-only / password-only flows.
 */
export function useSharedLinkSession(): UseSharedLinkSessionResult {
  const isValid = useSyncExternalStore(
    () => () => undefined,
    () => {
      if (typeof document === "undefined") return false;
      // Flag set by server when the real HttpOnly shared_link_session_* cookie is valid for this publication token.
      return /shared_link_session_[^=;]+_ok=1/.test(document.cookie || "");
    },
    () => false,
  );

  return { isValid };
}
