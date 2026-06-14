/**
 * Locale-consistent relative-time formatting for compact workshop surfaces
 * (dashboard meta line, activity strip). Returns a short relative phrase within
 * a 7-day window and falls back to an absolute date beyond it, so freshness
 * stays scannable without ever drifting into a stale "47 days ago".
 *
 * Locale is pinned to `en-PH` to match `formatChartMoney`/`formatChartShare`
 * (`src/lib/project-charts/format.ts`); parameterizing locale is deferred.
 */

const PLACEHOLDER = "—";

const SECOND_MS = 1000;
const MINUTE_MS = 60 * SECOND_MS;
const HOUR_MS = 60 * MINUTE_MS;
const DAY_MS = 24 * HOUR_MS;
const ABSOLUTE_CUTOFF_MS = 7 * DAY_MS;

const absoluteDateFormatter = new Intl.DateTimeFormat("en-PH", {
  day: "numeric",
  month: "short",
  year: "numeric",
});

function toDate(value: string | number | Date | null | undefined): Date | null {
  if (value === null || value === undefined) return null;
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

/**
 * Format `value` relative to `now` (injectable for testing).
 *
 * - `< 60s` (and any future timestamp from clock skew) → "just now"
 * - `< 60m` → "N minutes ago"
 * - `< 24h` → "N hours ago"
 * - `1 day` → "Yesterday"
 * - `< 7 days` → "N days ago"
 * - `>= 7 days` → absolute date, e.g. "12 Jun 2026"
 * - invalid / missing → "—"
 */
export function formatRelativeTime(
  value: string | number | Date | null | undefined,
  now: Date = new Date(),
): string {
  const date = toDate(value);
  if (!date) return PLACEHOLDER;

  const deltaMs = now.getTime() - date.getTime();

  // Future timestamps (clock skew) clamp to "just now" rather than "in 3 hours".
  if (deltaMs < MINUTE_MS) return "just now";

  if (deltaMs < HOUR_MS) {
    const minutes = Math.floor(deltaMs / MINUTE_MS);
    return `${minutes} ${minutes === 1 ? "minute" : "minutes"} ago`;
  }

  if (deltaMs < DAY_MS) {
    const hours = Math.floor(deltaMs / HOUR_MS);
    return `${hours} ${hours === 1 ? "hour" : "hours"} ago`;
  }

  if (deltaMs < ABSOLUTE_CUTOFF_MS) {
    const days = Math.floor(deltaMs / DAY_MS);
    return days === 1 ? "Yesterday" : `${days} days ago`;
  }

  return absoluteDateFormatter.format(date);
}
