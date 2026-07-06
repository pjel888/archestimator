/**
 * Teamspace realtime feature flags / kill-switches.
 *
 * Plan: 2026-06-14 Teamspace Improvement Plan — T0.6 (rollout/observability),
 * T5.3 (project-wide page cursors, capacity-gated by D-1), T5.4 (follow mode,
 * deferred by D-6). These flags let risky realtime surfaces be disabled without
 * a deploy if realtime capacity is exceeded or a regression appears.
 *
 * Flags are read from `NEXT_PUBLIC_*` env so client hooks can branch on them.
 * Values are inlined at build time by Next.js; treat them as build-time config,
 * not per-request toggles. The defaults below are the SAFE production posture:
 *   - cursor broadcast (the already-shipped sheet cursors): ON
 *   - realtime transport in plain next dev: OFF unless explicitly enabled
 *   - project-wide page cursors (new, fan-out heavy): OFF until D-1 tier confirmed
 *   - follow mode (deferred, D-6): OFF
 */

function readFlag(value: string | undefined): boolean | null {
  if (value === undefined) return null;
  const normalized = value.trim().toLowerCase();
  if (["1", "on", "true", "yes", "enabled"].includes(normalized)) return true;
  if (["0", "off", "false", "no", "disabled"].includes(normalized)) return false;
  return null;
}

/**
 * Kill-switch for ALL cursor broadcasting (sheet + project). Default ON because
 * sheet cursors already ship today; set `NEXT_PUBLIC_TEAMSPACE_CURSOR_BROADCAST=off`
 * to silence cursor sends globally if a channel is overwhelmed.
 */
export function isCursorBroadcastEnabled(): boolean {
  return readFlag(process.env.NEXT_PUBLIC_TEAMSPACE_CURSOR_BROADCAST) ?? true;
}

/**
 * Cloudflare Durable Object WebSockets are mounted by the Worker wrapper, not
 * by plain `next dev`. Keep the default transport off in local Next dev; use
 * `bun run cf:preview` for Worker-parity realtime, or explicitly enable this
 * flag when running a local WebSocket-compatible proxy.
 */
export function isRealtimeTransportEnabled(): boolean {
  return readFlag(process.env.NEXT_PUBLIC_TEAMSPACE_REALTIME_TRANSPORT)
    ?? process.env.NODE_ENV !== "development";
}

/**
 * Project-wide page cursors (T5.3). Capacity-gated by decision D-1 (needs
 * Cloudflare realtime headroom). Default OFF; enable per-environment with
 * `NEXT_PUBLIC_TEAMSPACE_PROJECT_CURSORS=on` once the tier is confirmed.
 */
export function isProjectPageCursorsEnabled(): boolean {
  return readFlag(process.env.NEXT_PUBLIC_TEAMSPACE_PROJECT_CURSORS) ?? false;
}

/**
 * Follow mode (T5.4). Deferred by decision D-6. Default OFF; enable with
 * `NEXT_PUBLIC_TEAMSPACE_FOLLOW_MODE=on` once the §4.5 edge contract is accepted.
 */
function isFollowModeEnabled(): boolean {
  return readFlag(process.env.NEXT_PUBLIC_TEAMSPACE_FOLLOW_MODE) ?? false;
}

export type TeamspaceFeatureFlags = {
  cursorBroadcast: boolean;
  realtimeTransport: boolean;
  projectPageCursors: boolean;
  followMode: boolean;
};

function readTeamspaceFeatureFlags(): TeamspaceFeatureFlags {
  return {
    cursorBroadcast: isCursorBroadcastEnabled(),
    realtimeTransport: isRealtimeTransportEnabled(),
    projectPageCursors: isProjectPageCursorsEnabled(),
    followMode: isFollowModeEnabled(),
  };
}
