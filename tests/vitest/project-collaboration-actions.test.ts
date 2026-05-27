import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const actions = readFileSync("src/lib/collaboration/actions.ts", "utf8");
const header = readFileSync("src/components/workshop/ProjectTeamspaceHeader.tsx", "utf8");

describe("project collaboration management actions", () => {
  it("sends real Supabase Auth invitations and persists pending collaboration invites", () => {
    expect(actions).toContain('"use server"');
    expect(actions).toContain("inviteProjectCollaborator");
    expect(actions).toContain("inviteEstimateSheetCollaborator");
    expect(actions).toContain("createCollaborationAdminClient");
    expect(actions).toContain("auth.admin.inviteUserByEmail");
    expect(actions).toContain("createInviteToken");
    expect(actions).toContain("issue_collaboration_invitation_token");
    expect(actions).toContain("collaboration_invitations");
    expect(actions).toContain("SUPABASE_SERVICE_ROLE_KEY");
    expect(actions).toContain("revalidateCollaborationRoutes");
  });

  it("invite email redirect uses the app-owned /invite token route", () => {
    expect(actions).toContain("resolveAuthOrigin");
    expect(actions).toContain("buildInviteEntryUrl");
    expect(actions).toContain("/invite/");
    expect(actions).toContain("redirectTo");
    expect(actions).not.toContain('headerList.get("origin") ?? process.env.NEXT_PUBLIC_SITE_URL');
    expect(actions).not.toContain("return `${origin}/workshop/projects/${projectId}`");
  });

  it("copy invite link returns email-bound invite URL while project links stay direct", () => {
    expect(actions).toContain("copyProjectInviteLink");
    expect(actions).toContain("record_collaboration_invitation_delivery");
    expect(actions).toContain("Invite links are disabled.");
    expect(header).toContain("if (!result.ok) throw new Error(result.message)");
    expect(actions).toContain("Copy invite link");
    expect(header).toContain("Copy private link");
    expect(header).toContain("Copy invite link");
  });

  it("existing user direct grant is resolved without looking like invite-route acceptance", () => {
    expect(actions).toContain("direct_granted_existing_user");
    expect(actions).toContain("const directGrantedAt = new Date().toISOString()");
    expect(actions).toContain("accepted_at: directGrantedAt");
    expect(actions).toContain("direct_granted_at: directGrantedAt");
    expect(actions).toContain("accepted_via");
    expect(actions).toContain("manager_direct_grant");
    expect(actions).not.toContain('accepted_via: "invite_route"');
  });

  it("keeps role and sheet access mutations behind server-side manager checks", () => {
    expect(actions).toContain("assertProjectAccessManager");
    expect(actions).toContain("updateProjectCollaboratorRole");
    expect(actions).toContain("removeProjectCollaborator");
    expect(actions).toContain("setEstimateSheetAccessMode");
    expect(actions).toContain("upsertSheetOwnerBeforeRestricting");
    expect(actions).toContain("roleRank");
    expect(actions).toContain("Cannot assign a role above your own access level.");
  });

  it("wires the modal to invite, role, share-link, and per-sheet access controls", () => {
    expect(header).toContain("inviteProjectCollaborator");
    expect(header).toContain("updateProjectCollaboratorRole");
    expect(header).toContain("setEstimateSheetAccessMode");
    expect(header).toContain("Invite by email");
    expect(header).toContain("Copy private link");
    expect(header).toContain("Access mode for");
  });
});
