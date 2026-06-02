import { describe, expect, it } from "vitest";
import { composeEstimateActivity, composeSharedLinkActivity } from "@/lib/activity";
import { bannedPublicTerms, estimateEventTypes, makeEstimateEvent } from "./fixtures/activity-events";

function visibleCopy(activity: { title: string; summary?: string; actor: { displayName: string } }) {
  return [activity.title, activity.summary ?? "", activity.actor.displayName].join(" ");
}

describe("activity copy regression", () => {
  it.each(estimateEventTypes)("keeps raw estimate term %s out of visible copy", (eventType) => {
    const activity = composeEstimateActivity(makeEstimateEvent(eventType));
    expect(visibleCopy(activity)).not.toContain(eventType);
  });

  it.each(bannedPublicTerms)("keeps banned term %s out of client-visible copy", (term) => {
    const estimate = composeEstimateActivity(makeEstimateEvent("row_updated", { actorLabel: `User ${term}` }), { audience: "client" });
    const shared = composeSharedLinkActivity({ id: `shared-${term}`, type: "decision", created_at: "2026-06-02T00:00:00.000Z", decision: term, author: `User ${term}` }, { audience: "client" });
    expect(visibleCopy(estimate)).not.toContain(term);
    expect(visibleCopy(shared)).not.toContain(term);
  });
});
