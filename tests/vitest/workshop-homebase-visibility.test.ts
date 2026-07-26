import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const workspaceRepository = readFileSync("src/lib/repositories/workspace-repository.ts", "utf8");
const workshopPage = readFileSync("src/app/workshop/page.tsx", "utf8");

describe("workshop homebase collaboration visibility contract", () => {
  it("hydrates homebase projects with shared access and pending invite visibility", () => {
    expect(workspaceRepository).toContain("readPendingCollaborationVisibilitySummary");
    expect(workspaceRepository).toContain("receivedPendingInviteCount");
    expect(workspaceRepository).toContain("pendingInviteCount");
    expect(workspaceRepository).toContain("sentPendingInviteCountByProjectId");
    expect(workspaceRepository).toContain("createPendingInviteProjectListItem");
    expect(workspaceRepository).toContain('accessKind: "pending-invite"');
    expect(workspaceRepository).toContain("acceptedProjectIds.has(invite.projectId)");
    expect(workspaceRepository).toContain("accessKind");
    expect(workspaceRepository).toContain("currentUserRole");
    expect(workspaceRepository).toContain("ownerWorkspaceName");
    expect(workspaceRepository).toContain("sharedEstimateCount");
  });

  it("feeds received pending invites into the global projects sidebar badge", () => {
    expect(workshopPage).toContain("WorkshopSidebarStatusSync");
    expect(workshopPage).toContain("<WorkshopSidebarStatusSync status={{ projectsBadgeCount: homebase.receivedPendingInviteCount }} />");
  });
});
