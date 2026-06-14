import { describe, expect, it } from "vitest";

import { composeCollaborationActivity } from "@/lib/activity/activity-composer";
import { buildProjectActivityFeed, PROJECT_ACTIVITY_LIMIT } from "@/lib/repositories/project-activity-repository";
import type { Tables } from "@/lib/supabase/types";

function estimateEvent(overrides: Partial<Tables<"estimate_sheet_events">> & { id: string; created_at: string }) {
  return {
    estimate_id: "est-1",
    event_type: "row_added",
    event_source: "user",
    actor_user_id: "user-1",
    estimate_tab_id: null,
    target_row_id: "row-1",
    estimate_node_id: null,
    row_context: { material: "Concrete" },
    old_snapshot: null,
    new_snapshot: { material: "Concrete" },
    changed_fields: [],
    total_delta: null,
    payload: {},
    correlation_id: "c1",
    ...overrides,
  } as Tables<"estimate_sheet_events">;
}

function collabEvent(overrides: Partial<Tables<"collaboration_audit_events">> & { id: string; created_at: string }) {
  return {
    event_type: "role_changed",
    actor_user_id: "user-2",
    metadata: {},
    project_id: "proj-1",
    estimate_id: null,
    invitation_id: null,
    ...overrides,
  } as Tables<"collaboration_audit_events">;
}

const LABELS = new Map([
  ["user-1", "Alice"],
  ["user-2", "Bob"],
]);

describe("composeCollaborationActivity (R11)", () => {
  it("renders invite, role-change, and removal as actor · verb · object", () => {
    const invite = composeCollaborationActivity({ id: "1", eventType: "invite_email_attempted", createdAt: "2026-06-01T00:00:00Z", actorLabel: "Alice" });
    const role = composeCollaborationActivity({ id: "2", eventType: "role_changed", createdAt: "2026-06-01T00:00:00Z", actorLabel: "Alice" });
    const removed = composeCollaborationActivity({ id: "3", eventType: "member_removed", createdAt: "2026-06-01T00:00:00Z", actorLabel: "Alice" });

    expect(invite.title).toBe("Alice invited a collaborator.");
    expect(role.title).toBe("Alice changed a collaborator's role.");
    expect(removed.title).toBe("Alice removed a collaborator.");
  });

  it("renders a project rename distinctly from a generic metadata edit", () => {
    const renamed = composeCollaborationActivity({
      id: "4",
      eventType: "project_metadata_updated",
      createdAt: "2026-06-01T00:00:00Z",
      actorLabel: "Alice",
      metadata: { changed_fields: ["name"] },
    });
    const edited = composeCollaborationActivity({
      id: "5",
      eventType: "project_metadata_updated",
      createdAt: "2026-06-01T00:00:00Z",
      actorLabel: "Alice",
      metadata: { changed_fields: ["client_name", "location"] },
    });

    expect(renamed.title).toBe("Alice renamed the project.");
    expect(renamed.action).toBe("renamed");
    expect(edited.title).toContain("updated project");
  });

  it("falls back to 'Unknown user' for an unidentified actor without throwing", () => {
    const vm = composeCollaborationActivity({ id: "6", eventType: "role_changed", createdAt: "2026-06-01T00:00:00Z", actorUserId: null, actorLabel: null });
    expect(vm.actor.displayName).toBe("System");
    expect(vm.title).toContain("changed a collaborator's role");
  });
});

describe("buildProjectActivityFeed (R10)", () => {
  it("merges both sources newest-first", () => {
    const feed = buildProjectActivityFeed({
      estimateEvents: [estimateEvent({ id: "e1", created_at: "2026-06-01T10:00:00Z" })],
      collaborationEvents: [collabEvent({ id: "c1", created_at: "2026-06-01T12:00:00Z" })],
      actorLabels: LABELS,
    });

    expect(feed).toHaveLength(2);
    expect(feed[0].id).toBe("c1"); // newer first
    expect(feed[1].id).toBe("e1");
  });

  it("caps the feed at 8 rows", () => {
    const many = Array.from({ length: 20 }, (_unused, index) =>
      estimateEvent({
        id: `e${index}`,
        created_at: `2026-06-${String(index + 1).padStart(2, "0")}T10:00:00Z`,
        event_type: index % 2 === 0 ? "row_added" : "row_deleted",
      }),
    );
    const feed = buildProjectActivityFeed({ estimateEvents: many, collaborationEvents: [], actorLabels: LABELS });
    expect(feed).toHaveLength(PROJECT_ACTIVITY_LIMIT);
  });

  it("excludes auto-save events from the curated feed", () => {
    const feed = buildProjectActivityFeed({
      estimateEvents: [
        estimateEvent({ id: "auto", created_at: "2026-06-01T10:00:00Z", event_source: "autosave" }),
        estimateEvent({ id: "real", created_at: "2026-06-01T09:00:00Z", event_source: "user" }),
      ],
      collaborationEvents: [],
      actorLabels: LABELS,
    });
    expect(feed.map((row) => row.id)).toEqual(["real"]);
  });

  it("aggregates a burst of identical edits into one row", () => {
    const feed = buildProjectActivityFeed({
      estimateEvents: [
        estimateEvent({ id: "b1", created_at: "2026-06-01T10:00:30Z", event_type: "row_updated" }),
        estimateEvent({ id: "b2", created_at: "2026-06-01T10:00:20Z", event_type: "row_updated" }),
        estimateEvent({ id: "b3", created_at: "2026-06-01T10:00:10Z", event_type: "row_updated" }),
      ],
      collaborationEvents: [],
      actorLabels: LABELS,
    });
    expect(feed).toHaveLength(1);
    expect(feed[0].id).toBe("b1"); // newest of the burst kept
  });

  it("returns an empty array when there is no activity", () => {
    expect(buildProjectActivityFeed({ estimateEvents: [], collaborationEvents: [], actorLabels: new Map() })).toEqual([]);
  });

  it("resolves actor labels, falling back to 'Unknown user' when missing", () => {
    const feed = buildProjectActivityFeed({
      estimateEvents: [],
      collaborationEvents: [collabEvent({ id: "c1", created_at: "2026-06-01T12:00:00Z", actor_user_id: "ghost" })],
      actorLabels: new Map(),
    });
    expect(feed[0].actor.displayName).toBe("Unknown user");
  });
});
