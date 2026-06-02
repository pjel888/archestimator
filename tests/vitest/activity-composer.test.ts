import { describe, expect, it } from "vitest";
import { composeEstimateActivity, composeSharedLinkActivity } from "@/lib/activity";
import { estimateEventTypes, makeEstimateEvent, sharedLinkFixtures } from "./fixtures/activity-events";

describe("activity composer", () => {
  it.each(estimateEventTypes)("composes estimate event %s without throwing", (eventType) => {
    const activity = composeEstimateActivity(makeEstimateEvent(eventType));
    expect(activity.id).toBe(`evt-${eventType}`);
    expect(activity.source).toBe("estimate");
    expect(activity.title).toEqual(expect.any(String));
    expect(activity.title.length).toBeGreaterThan(8);
    expect(activity.actor.displayName).toBe("Philip Lewis");
    expect(activity.raw?.eventType).toBe(eventType);
  });

  it.each(sharedLinkFixtures)("composes shared-link item $id", (item) => {
    const activity = composeSharedLinkActivity(item);
    expect(activity.id).toBe(item.id);
    expect(["comment", "decision", "share"]).toContain(activity.source);
    expect(activity.title).toEqual(expect.any(String));
    expect(activity.title).not.toMatch(/_/);
  });

  it("never throws for unknown estimate events", () => {
    expect(() => composeEstimateActivity(makeEstimateEvent("future_event"))).not.toThrow();
    expect(composeEstimateActivity(makeEstimateEvent("future_event")).title).toBe("Activity recorded.");
  });
});
