import { describe, expect, it } from "vitest";
import { composeEstimateActivity, composeSharedLinkActivity, filterActivityForVisibility, formatActivityActor, formatActivityFieldLabel, formatActivityValue } from "@/lib/activity";
import { estimateEventTypes, makeEstimateEvent, sharedLinkFixtures } from "./fixtures/activity-events";

describe("activity view model", () => {
  it.each(estimateEventTypes)("returns required view-model fields for %s", (eventType) => {
    const activity = composeEstimateActivity(makeEstimateEvent(eventType));
    expect(activity).toMatchObject({ id: expect.any(String), source: "estimate", action: expect.any(String), visibility: "owner", occurredAt: expect.any(String), title: expect.any(String) });
    expect(activity.actor.displayName).toEqual(expect.any(String));
    expect(activity.target.label).toEqual(expect.any(String));
  });

  it.each(sharedLinkFixtures)("returns required shared-link fields for $id", (item) => {
    const activity = composeSharedLinkActivity(item);
    expect(activity.id).toBe(item.id);
    expect(activity.occurredAt).toBe(item.created_at);
    expect(activity.title).toEqual(expect.any(String));
  });

  it("formats fields, values, and actors", () => {
    expect(formatActivityFieldLabel("unit_cost")).toBe("Unit cost");
    expect(formatActivityValue("unitCost", 1200)).toMatch(/₱/);
    expect(formatActivityValue("contingencyPercentage", 10)).toBe("10%");
    expect(formatActivityActor("u1", "Maria Santos").displayName).toBe("Maria Santos");
  });


  it("composes client estimate activity with public-safe audience", () => {
    const activity = composeEstimateActivity(makeEstimateEvent("row_updated"), { audience: "client", visibility: "public" });
    expect(activity.audience).toBe("client");
    expect(activity.visibility).toBe("public");
    expect(activity.raw).toBeUndefined();
  });

  it("keeps internal notes available to owner filtering", () => {
    const internal = composeSharedLinkActivity(sharedLinkFixtures.find((item) => item.is_internal) ?? sharedLinkFixtures[0]);
    expect(filterActivityForVisibility([internal], "owner")).toHaveLength(1);
  });

  it("removes internal notes from client filtering", () => {
    const internal = composeSharedLinkActivity(sharedLinkFixtures.find((item) => item.is_internal) ?? sharedLinkFixtures[0]);
    expect(filterActivityForVisibility([internal], "client")).toHaveLength(0);
  });

  it("maps shared-link sources by item family", () => {
    expect(composeSharedLinkActivity(sharedLinkFixtures.find((item) => item.type === "comment") ?? sharedLinkFixtures[0]).source).toBe("comment");
    expect(composeSharedLinkActivity(sharedLinkFixtures.find((item) => item.type === "decision") ?? sharedLinkFixtures[0]).source).toBe("decision");
    expect(composeSharedLinkActivity(sharedLinkFixtures.find((item) => item.type === "event") ?? sharedLinkFixtures[0]).source).toBe("share");
  });

  it("formats linked library states into human copy", () => {
    expect(formatActivityValue("linkState", "linked-clean")).toBe("Using library values");
    expect(formatActivityValue("linkState", "linked-overridden")).toBe("Customized from library");
  });

  it("client visibility strips raw and target ids", () => {
    const owner = composeEstimateActivity(makeEstimateEvent("row_added"));
    const [client] = filterActivityForVisibility([owner], "client");
    expect(client.raw).toBeUndefined();
    expect(client.target.id).toBeUndefined();
  });
});
