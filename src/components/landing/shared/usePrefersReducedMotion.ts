"use client";

import { useSyncExternalStore } from "react";

/**
 * usePrefersReducedMotion — shared, SSR-safe hook for `prefers-reduced-motion`.
 *
 * Extracted verbatim from the prior local definition in
 * `AnimatedProposalRecordSection.tsx` so the commercial-graph plate, the
 * claims-ledger filter, and any other landing leaf can reuse it without
 * reinventing the media-query subscription. Server snapshot returns `false`
 * (motion allowed) so SSR + first paint matches the no-JS path; the live
 * value updates on hydration.
 *
 * Per doc 03 §8 / doc 07: reduced-motion snaps rather than animates —
 * consumers gate their motion on this hook's return value.
 */
const REDUCED_MOTION_QUERY = "(prefers-reduced-motion: reduce)";

function subscribeToReducedMotion(callback: () => void) {
  if (typeof window === "undefined") {
    return () => {};
  }
  const query = window.matchMedia(REDUCED_MOTION_QUERY);
  query.addEventListener("change", callback);
  return () => query.removeEventListener("change", callback);
}

function getReducedMotionSnapshot() {
  return typeof window !== "undefined" && window.matchMedia(REDUCED_MOTION_QUERY).matches;
}

function getReducedMotionServerSnapshot() {
  return false;
}

export function usePrefersReducedMotion() {
  return useSyncExternalStore(
    subscribeToReducedMotion,
    getReducedMotionSnapshot,
    getReducedMotionServerSnapshot,
  );
}
