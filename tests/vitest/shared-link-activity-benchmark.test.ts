import { describe, expect, it } from "vitest";

import {
  composeOwnerActivityBenchmark,
  composePublicActivityBenchmark,
  getSharedLinkActivityQueryPlans,
  makeSharedLinkActivityFixture,
  parsePositiveIntegerList,
  runSharedLinkActivityBenchmark,
} from "../../scripts/benchmark-shared-link-activity";

describe("shared-link activity benchmark", () => {
  it("locks the current static query fan-out before endpoint optimization", () => {
    expect(getSharedLinkActivityQueryPlans()).toEqual([
      expect.objectContaining({ name: "public-anonymous", queryCount: 3 }),
      expect.objectContaining({ name: "public-recipient-session", queryCount: 5 }),
      expect.objectContaining({ name: "owner-include-access-telemetry", queryCount: 6 }),
    ]);
  });

  it("composes owner and public fixtures without leaking internal comments to public views", () => {
    const fixture = makeSharedLinkActivityFixture(120, 8);
    const owner = composeOwnerActivityBenchmark(fixture, 100);
    const publicAnonymous = composePublicActivityBenchmark(fixture, { limit: 100 });
    const publicRecipient = composePublicActivityBenchmark(fixture, { verifiedRecipientSession: true, limit: 100 });

    expect(owner.activities).toHaveLength(100);
    expect(owner.hasMore).toBe(true);
    expect(publicAnonymous.activities.every((activity) => activity.visibility === "public")).toBe(true);
    expect(publicAnonymous.activities.length).toBeLessThan(publicRecipient.activities.length);
    expect(publicRecipient.activities.every((activity) => activity.visibility === "public")).toBe(true);
  });

  it("runs a bounded benchmark report for evidence capture", () => {
    const run = runSharedLinkActivityBenchmark(120, 100, 8);

    expect(run.activityCount).toBe(120);
    expect(run.ownerActivityCount).toBe(100);
    expect(run.publicAnonymousActivityCount).toBeGreaterThan(0);
    expect(run.publicRecipientSessionActivityCount).toBe(84);
    expect(run.ownerDurationMs).toBeGreaterThanOrEqual(0);
    expect(run.publicRecipientSessionDurationMs).toBeGreaterThanOrEqual(0);
  });

  it("parses benchmark row counts from comma-separated input", () => {
    expect(parsePositiveIntegerList("100, 500, nope, 1000", "TEST_ROWS")).toEqual([100, 500, 1000]);
    expect(() => parsePositiveIntegerList("nope", "TEST_ROWS")).toThrow(/TEST_ROWS/);
  });
});
