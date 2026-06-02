import { describe, expect, it } from "vitest";
import { composeEstimateActivity, composeSharedLinkActivity, filterActivityForVisibility, safeCompose } from "@/lib/activity";
import { makeEstimateEvent, sharedLinkFixtures } from "./fixtures/activity-events";

const uuid = "123e4567-e89b-12d3-a456-426614174000";

describe("activity security", () => {
  it("strips raw data and raw UUIDs from client estimate output", () => {
    const activity = composeEstimateActivity(makeEstimateEvent("row_updated", { actorLabel: `User ${uuid}`, rowContext: { material: uuid } }), { audience: "client" });
    expect(activity.raw).toBeUndefined();
    expect(JSON.stringify(activity)).not.toContain(uuid);
    expect(activity.actor.displayName).not.toMatch(/User\s+[0-9a-f-]{8}/i);
  });

  it("removes internal activity from client visibility", () => {
    const activities = sharedLinkFixtures.map((item) => composeSharedLinkActivity(item));
    const client = filterActivityForVisibility(activities, "client");
    expect(client.every((activity) => activity.visibility !== "internal")).toBe(true);
    expect(JSON.stringify(client)).not.toContain("Internal note");
  });


  it("owner visibility preserves internal activity and raw audit payload", () => {
    const activities = sharedLinkFixtures.map((item) => composeSharedLinkActivity(item));
    const owner = filterActivityForVisibility(activities, "owner");
    expect(owner.some((activity) => activity.visibility === "internal" && activity.raw)).toBe(true);
  });

  it("client shared-link output strips raw payload and target identifiers", () => {
    const activity = composeSharedLinkActivity({
      id: "comment-safe-target",
      type: "comment",
      created_at: "2026-06-02T00:00:00.000Z",
      author: "maria@example.com",
      body: "Looks good.",
      metadata: { targetLabel: uuid, target_row_id: uuid },
    }, { audience: "client" });
    expect(activity.raw).toBeUndefined();
    expect(activity.target.id).toBeUndefined();
    expect(JSON.stringify(activity)).not.toContain(uuid);
    expect(JSON.stringify(activity)).not.toContain("maria@example.com");
  });

  it("client shared-link output omits IP and user-agent diagnostic hashes", () => {
    const activity = composeSharedLinkActivity({
      id: "event-diagnostics",
      type: "event",
      created_at: "2026-06-02T00:00:00.000Z",
      metadata: { eventType: "open", ip_hash: "ip-secret", user_agent_hash: "ua-secret" },
    }, { audience: "client" });
    const json = JSON.stringify(activity);
    expect(json).not.toContain("ip-secret");
    expect(json).not.toContain("ua-secret");
  });

  it("safeCompose returns fallback instead of throwing", () => {
    const activity = safeCompose(() => { throw new Error("boom"); });
    expect(activity.title).toBe("Activity recorded.");
  });
});
