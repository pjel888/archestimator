export const REALTIME_IDENTITY_REFRESH_LEEWAY_MS = 60_000;
const MINIMUM_REFRESH_DELAY_MS = 5_000;

/** Schedules renewal before a signed identity and its room token expire. */
export function getRealtimeIdentityRefreshDelay(
  expiresAtSeconds: number,
  nowMs = Date.now(),
) {
  if (!Number.isFinite(expiresAtSeconds)) return MINIMUM_REFRESH_DELAY_MS;
  return Math.max(
    MINIMUM_REFRESH_DELAY_MS,
    Math.floor(expiresAtSeconds * 1000 - nowMs - REALTIME_IDENTITY_REFRESH_LEEWAY_MS),
  );
}
