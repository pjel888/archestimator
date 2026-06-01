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

  it("durably rate limits invite creation and link reissue actions", () => {
    expect(actions).toContain("checkInviteCreateRateLimit");
    expect(actions).toContain("checkInviteResendRateLimit");
    expect(actions).toContain("Too many attempts. Please wait");
    expect(actions).toContain("rateLimitActionResult(rateLimit)");
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

  it("resends pending invite emails through the app-owned invite token route with rate limiting", () => {
    expect(actions).toContain("resendProjectInviteEmail");
    expect(actions).toContain("sendSupabaseInviteEmail");
    expect(actions).toContain("checkInviteResendRateLimit");
    expect(actions).toContain('deliveryMethod: "email"');
    expect(header).toContain("resendProjectInviteEmail");
    expect(header).toContain("Resend invite");
  });

  it("records invite email delivery only after Supabase Auth accepts the send", () => {
    expect(actions).toContain("recordCollaborationInvitationDelivery");
    expect(actions).toContain('deliveryMethod: "email"');
    expect(actions).toMatch(/try \{[\s\S]*?await sendSupabaseInviteEmail\(\{[\s\S]*?\}\);\n  \} catch \(error\) \{[\s\S]*?return \{[\s\S]*?Invitation created\. Share the invite link manually\.[\s\S]*?\};\n  \}\n\n  await recordCollaborationInvitationDelivery\(\{/);
  });

  it("returns honest invite messages when app-owned invite links are disabled", () => {
    expect(actions).toContain("Invitation created. Share the invite link manually.");
    expect(actions).toContain("[collaboration] invite email delivery failed");
    expect(actions).toContain("User added directly. They can access the project now.");
    expect(actions).toContain("User added directly. They can access this estimate sheet now.");
    expect(actions).toContain("Link-based invites are unavailable. Enable project invite entry before inviting new users.");
    expect(actions).toContain("Link-based sheet invites are unavailable. Enable project invite entry before inviting new users.");
    expect(actions).toContain("const inviteEntryEnabled = isProjectInviteEntryEnabled()");
    expect(actions).toContain("if (!inviteEntryEnabled || !invitation || !inviteLink)");
  });

  it("writes best-effort collaboration audit events without raw token metadata", () => {
    expect(actions).toContain("recordCollaborationAuditEvent");
    expect(actions).toContain("collaboration_audit_events");
    expect(actions).toContain("invite_email_attempted");
    expect(actions).toContain("role_changed");
    expect(actions).toContain("member_removed");
    expect(actions).toContain("metadata");
    expect(actions).not.toContain("metadata: { rawToken");
    expect(actions).not.toContain("metadata: { token_hash");
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
    expect(actions).toContain("project_favorites");
    expect(actions).toContain("sendCollaboratorRemovalNotification");
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
