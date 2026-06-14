import { describe, expect, test } from "bun:test";

import { formatRelativeTime } from "../../src/lib/util/relative-time";

const NOW = new Date("2026-06-14T12:00:00.000Z");

function ago(ms: number): string {
  return new Date(NOW.getTime() - ms).toISOString();
}

const SECOND = 1000;
const MINUTE = 60 * SECOND;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

describe("formatRelativeTime", () => {
  test("renders 'just now' for sub-minute deltas", () => {
    expect(formatRelativeTime(ago(5 * SECOND), NOW)).toBe("just now");
    expect(formatRelativeTime(ago(59 * SECOND), NOW)).toBe("just now");
  });

  test("renders minutes with singular/plural", () => {
    expect(formatRelativeTime(ago(MINUTE), NOW)).toBe("1 minute ago");
    expect(formatRelativeTime(ago(23 * MINUTE), NOW)).toBe("23 minutes ago");
  });

  test("renders hours with singular/plural", () => {
    expect(formatRelativeTime(ago(HOUR), NOW)).toBe("1 hour ago");
    expect(formatRelativeTime(ago(3 * HOUR), NOW)).toBe("3 hours ago");
  });

  test("renders 'Yesterday' for the 1-day bucket", () => {
    expect(formatRelativeTime(ago(DAY), NOW)).toBe("Yesterday");
    expect(formatRelativeTime(ago(DAY + 5 * HOUR), NOW)).toBe("Yesterday");
  });

  test("renders day counts up to the 7-day cutoff", () => {
    expect(formatRelativeTime(ago(4 * DAY), NOW)).toBe("4 days ago");
    expect(formatRelativeTime(ago(6 * DAY), NOW)).toBe("6 days ago");
  });

  test("renders an absolute date at or beyond 7 days", () => {
    const absolute = formatRelativeTime(ago(30 * DAY), NOW);
    expect(absolute).toContain("2026");
    expect(absolute).toMatch(/May|Apr/);
    // never a relative phrase past the cutoff
    expect(absolute).not.toContain("ago");
  });

  test("clamps future timestamps (clock skew) to 'just now'", () => {
    expect(formatRelativeTime(new Date(NOW.getTime() + 3 * HOUR).toISOString(), NOW)).toBe("just now");
  });

  test("returns the em-dash placeholder for null/invalid input", () => {
    expect(formatRelativeTime(null, NOW)).toBe("—");
    expect(formatRelativeTime(undefined, NOW)).toBe("—");
    expect(formatRelativeTime("not-a-date", NOW)).toBe("—");
  });
});
