/**
 * Coarse "active surface" mapper for project-channel presence.
 *
 * Plan: 2026-06-14 Teamspace Improvement Plan — T1.1 / finding F6 + F29 / gap
 * G2 + G14 / decisions R-2, R-14.
 *
 * The `project:{id}` realtime channel is visible to EVERY project member,
 * including viewers who cannot open a restricted estimate sheet. Broadcasting a
 * raw `window.location.pathname` (or `activeEstimateId`/`activeTabId`/`focusedCell`)
 * on that channel leaks restricted-sheet activity and exact app surfaces.
 *
 * This module normalizes a pathname to a small ALLOWLISTED enum. It never echoes
 * the raw path and never returns a project/estimate id. Fine-grained state
 * (focused cell, cursor coords) belongs on the sheet channel, whose RLS already
 * enforces sheet access.
 */

export const ACTIVE_SURFACES = [
  "overview",
  "estimates",
  "charts",
  "library",
  "templates",
  "settings",
  "workshop",
  "other",
] as const;

export type ActiveSurface = (typeof ACTIVE_SURFACES)[number];

export function isActiveSurface(value: unknown): value is ActiveSurface {
  return typeof value === "string" && (ACTIVE_SURFACES as readonly string[]).includes(value);
}

/**
 * Map a pathname to a coarse, allowlisted surface. The mapping is intentionally
 * lossy: it categorizes WHAT KIND of surface someone is on, never which specific
 * project/estimate. Any unrecognized path collapses to "other" — the function
 * cannot return raw path data.
 */
export function routeToActiveSurface(pathname: string | null | undefined): ActiveSurface {
  if (!pathname || typeof pathname !== "string") return "other";

  // Strip query/hash defensively; we only ever read coarse segments.
  const path = pathname.split(/[?#]/)[0] ?? "";

  // Estimate sheet or estimates list within a project → "estimates"
  // (no estimate id leaves the client — only the category).
  if (/\/workshop\/projects\/[^/]+\/estimates(\/|$)/.test(path)) return "estimates";
  // Project-level analytics surface.
  if (/\/workshop\/projects\/[^/]+\/charts(\/|$)/.test(path)) return "charts";
  // A specific project (overview) — still coarse; the project id is already
  // known to every channel subscriber (it IS the channel), so "overview" leaks nothing new.
  if (/\/workshop\/projects\/[^/]+(\/|$)/.test(path)) return "overview";
  // The projects index / workshop home.
  if (/\/workshop\/projects(\/|$)/.test(path)) return "workshop";
  if (/\/workshop\/library(\/|$)/.test(path)) return "library";
  if (/\/workshop\/templates(\/|$)/.test(path)) return "templates";
  if (/\/workshop\/settings(\/|$)/.test(path)) return "settings";
  if (/\/workshop(\/|$)/.test(path)) return "workshop";

  return "other";
}

/**
 * Read the current browser surface. SSR-safe (returns "other" without a window).
 */
export function readCurrentActiveSurface(): ActiveSurface {
  if (typeof window === "undefined") return "other";
  return routeToActiveSurface(window.location.pathname);
}

const SURFACE_LABELS: Record<ActiveSurface, string> = {
  overview: "the project",
  estimates: "an estimate",
  charts: "charts",
  library: "the library",
  templates: "templates",
  settings: "settings",
  workshop: "the workspace",
  other: "elsewhere",
};

/** Human label for a coarse surface, used in popover roster activity text. */
export function describeActiveSurface(surface: ActiveSurface | null | undefined): string {
  if (!surface || !isActiveSurface(surface)) return SURFACE_LABELS.other;
  return SURFACE_LABELS[surface];
}
