import { describe, expect, it } from "vitest";

import type { ActivityViewModel } from "@/lib/activity";
import { deriveActionBucket, matchesActionFilter } from "@/components/workshop/project-activity/action-classes";

function activity(overrides: Partial<ActivityViewModel> = {}): ActivityViewModel {
  return {
    id: "11111111-1111-4111-8111-111111111111",
    source: "estimate",
    audience: "owner",
    visibility: "owner",
    action: "recorded",
    occurredAt: "2026-06-28T01:00:00.000Z",
    actor: { kind: "user", displayName: "Philip Lewis", isSafeForClient: false },
    target: { kind: "estimate", label: "Estimate" },
    title: "Activity recorded.",
    raw: { eventType: "row_updated" },
    ...overrides,
  };
}

describe("project activity action classes", () => {
  it.each([
    ["row_added", "created"],
    ["template_inserted", "created"],
    ["row_updated", "edited"],
    ["node_renamed", "edited"],
    ["row_deleted", "deleted"],
    ["tab_archived", "deleted"],
    ["tree_reordered", "reordered"],
    ["sheet_version_created", "versioned"],
  ] as const)("maps estimate event %s to %s", (eventType, bucket) => {
    expect(deriveActionBucket(activity({ source: "estimate", raw: { eventType } }))).toBe(bucket);
  });

  it.each([
    [activity({ source: "share", action: "sent", raw: { eventType: "published" } }), "shared"],
    [activity({ source: "share", action: "viewed", raw: { eventType: "open" } }), "viewed"],
    [activity({ source: "comment", action: "commented", raw: { eventType: "comment" } }), "commented"],
    [activity({ source: "decision", action: "approved", raw: { eventType: "approved" } }), "decided"],
    [activity({ source: "system", action: "changed", raw: { eventType: "role_changed" } }), "invited"],
    [activity({ source: "system", action: "changed", raw: { eventType: "project_metadata_updated" } }), "edited"],
    [activity({ source: "system", action: "recorded", raw: { eventType: "unknown" } }), "system"],
  ] as const)("maps non-estimate activity to %s", (item, bucket) => {
    expect(deriveActionBucket(item)).toBe(bucket);
  });

  it("ORs selected action buckets and treats empty/all as unfiltered", () => {
    const deleted = activity({ raw: { eventType: "row_deleted" } });

    expect(matchesActionFilter(deleted, [])).toBe(true);
    expect(matchesActionFilter(deleted, ["all"])).toBe(true);
    expect(matchesActionFilter(deleted, ["created", "deleted"])).toBe(true);
    expect(matchesActionFilter(deleted, ["created", "edited"])).toBe(false);
  });
});
