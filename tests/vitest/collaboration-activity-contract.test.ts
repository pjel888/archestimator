import { describe, expect, it } from "vitest";

import { composeCollaborationActivity } from "@/lib/activity";

describe("collaboration activity contract", () => {
  it.each([
    ["member_added", "added", "added a collaborator"],
    ["estimate_access_inherited", "changed", "restored inherited estimate access"],
    ["estimate_access_restricted", "changed", "restricted estimate access"],
    ["collaboration_invite_email_sent", "invited", "invited a collaborator"],
    ["collaboration_invite_revoked", "removed", "removed a collaborator"],
  ] as const)("maps %s into an actionable owner activity", (eventType, action, title) => {
    const activity = composeCollaborationActivity({
      id: "11111111-1111-4111-8111-111111111111",
      eventType,
      createdAt: "2026-07-11T00:00:00.000Z",
      actorLabel: "Project manager",
    });

    expect(activity.action).toBe(action);
    expect(activity.title).toContain(title);
  });

  it("does not expose historical invite identifiers or recipient contact metadata", () => {
    const activity = composeCollaborationActivity({
      id: "11111111-1111-4111-8111-111111111111",
      eventType: "collaboration_invite_email_sent",
      createdAt: "2026-07-11T00:00:00.000Z",
      metadata: {
        delivery_method: "email",
        recipient_email: "private@example.com",
        token_hint: "abcd",
        token_id: "token-1",
        invite_url: "https://example.test/invite/secret",
      },
    });

    expect(activity.raw?.payload).toEqual({ delivery_method: "email" });
  });
});
