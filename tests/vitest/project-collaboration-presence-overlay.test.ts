import { describe, expect, it } from "vitest";

import { withProjectCollaborationPresence } from "@/hooks/use-project-collaboration-query";
import type { ProjectCollaborationSummary } from "@/lib/collaboration/types";

const summary: ProjectCollaborationSummary = {
  projectId: "11111111-1111-1111-1111-111111111111",
  workspaceId: "22222222-2222-2222-2222-222222222222",
  currentUserId: "user-a",
  currentUserRole: "admin",
  canManageAccess: true,
  collaborators: [
    {
      id: "user-a",
      displayName: "A",
      email: null,
      avatarUrl: null,
      role: "admin",
      source: "project",
      online: false,
    },
    {
      id: "user-b",
      displayName: "B",
      email: null,
      avatarUrl: null,
      role: "viewer",
      source: "project",
      online: true,
    },
  ],
  eligibleProjectMemberCandidates: [],
  pendingInvitations: [],
  estimateSheets: [
    {
      estimateId: "33333333-3333-3333-3333-333333333333",
      sheetCode: "S-1",
      name: "Estimate",
      accessMode: "restricted",
      overrideCount: 1,
      canManageAccess: true,
      currentUserRole: "admin",
      members: [
        {
          id: "user-b",
          displayName: "B",
          email: null,
          avatarUrl: null,
          role: "viewer",
          source: "sheet",
          online: true,
          estimateId: "33333333-3333-3333-3333-333333333333",
        },
      ],
    },
  ],
  realtime: {
    privateChannels: true,
    projectChannel: "project:11111111-1111-1111-1111-111111111111",
    estimateChannelPrefix: "estimate:",
    presenceTransport: "presence",
    cursorTransport: "broadcast",
  },
};

describe("project collaboration presence overlay", () => {
  it("overlays only transient online state on already-authorized roster rows", () => {
    const result = withProjectCollaborationPresence(
      summary,
      new Set(["user-a"]),
    );

    expect(
      result.collaborators.map((member) => [member.id, member.online]),
    ).toEqual([
      ["user-a", true],
      ["user-b", false],
    ]);
    expect(result.estimateSheets[0]?.members[0]?.online).toBe(false);
    expect(result.collaborators[0]).toMatchObject({
      id: "user-a",
      email: null,
      role: "admin",
      source: "project",
    });
  });

  it("preserves the current query value when the overlay has no changes", () => {
    expect(withProjectCollaborationPresence(summary, new Set(["user-b"]))).toBe(
      summary,
    );
  });
});
