"use client";

import { useEffect, useState } from "react";

/**
 * Module-scoped pub-sub bridge between the estimate-favorite button (deep in the
 * estimates page) and the MainSidebar live regions (in the shell). The two do NOT
 * share a React provider/context, so a tiny in-module event bus carries the
 * announcement text across the tree.
 *
 * Two channels, mirroring the sidebar's two ARIA live regions:
 * - "polite"   -> data-sidebar-favorites-status (aria-live=polite)  — the cue
 *                 when a favorited estimate creates a sheet-only project grouping.
 * - "assertive" -> data-sidebar-favorites-alert (aria-live=assertive) — failures.
 *
 * Polite writes clear the prior text first (no stacking on rapid toggles, QA-20)
 * and auto-clear after AUTO_CLEAR_MS so a stale cue can't linger.
 */

type AnnouncerChannel = "polite" | "assertive";

const AUTO_CLEAR_MS = 6000;

type AnnouncerListener = (text: string) => void;

const listeners: Record<AnnouncerChannel, Set<AnnouncerListener>> = {
  polite: new Set(),
  assertive: new Set(),
};

function emit(channel: AnnouncerChannel, text: string) {
  for (const listener of listeners[channel]) listener(text);
}

/** Imperative announce API the button calls (outside React render). */
export function announceSidebarFavoritePolite(text: string) {
  // Clear first so screen readers re-announce identical/rapid messages (QA-20).
  emit("polite", "");
  emit("polite", text);
}

export function announceSidebarFavoriteAssertive(text: string) {
  emit("assertive", "");
  emit("assertive", text);
}

function subscribe(channel: AnnouncerChannel, listener: AnnouncerListener) {
  listeners[channel].add(listener);
  return () => {
    listeners[channel].delete(listener);
  };
}

/**
 * Subscribes the two live regions to the announcer bus. Returns the current text
 * for each channel. Polite text auto-clears after AUTO_CLEAR_MS; assertive text
 * persists until the next write (failures should not vanish mid-read).
 */
export function useSidebarFavoritesAnnouncer() {
  const [politeText, setPoliteText] = useState("");
  const [assertiveText, setAssertiveText] = useState("");

  useEffect(() => {
    const unsubscribe = subscribe("polite", setPoliteText);
    return unsubscribe;
  }, []);

  useEffect(() => {
    const unsubscribe = subscribe("assertive", setAssertiveText);
    return unsubscribe;
  }, []);

  useEffect(() => {
    if (!politeText) return;
    const timer = window.setTimeout(() => setPoliteText(""), AUTO_CLEAR_MS);
    return () => window.clearTimeout(timer);
  }, [politeText]);

  return { politeText, assertiveText };
}
