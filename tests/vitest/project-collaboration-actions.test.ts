import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const actions = readFileSync("src/lib/collaboration/actions.ts", "utf8");
const publisherMembersPanel = readFileSync("src/components/workshop/publisher/PublisherProjectMembersPanel.tsx", "utf8");

describe("project collaboration management actions", () => {
  it("sends Cloudflare-owned invite emails and persists pending collaboration invites in D1", () => {
    expect(actions).toContain('"use server"');
    expect(actions).toContain("inviteProjectCollaborator");
    expect(actions).toContain("inviteEstimateSheetCollaborator");
    expect(actions).toContain("getRequiredCollaborationD1Database");
    expect(actions).toContain("sendCloudflareInviteEmail");
    expect(actions).toContain("sendEmail");
    expect(actions).toContain("createInviteToken");
    expect(actions).toContain("collaboration_invitation_tokens");
    expect(actions).toContain("collaboration_invitations");
    expect(actions).toContain("revalidateCollaborationRoutes");
    expect(actions).not.toMatch(/@supabase\/supabase-js|@\/lib\/supabase|createSupabase|SUPABASE_SERVICE_ROLE_KEY|auth\.admin\.inviteUserByEmail|issue_collaboration_invitation_token/);
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
    expect(actions).toContain("Open your invitation");
    expect(actions).not.toContain('headerList.get("origin") ?? process.env.NEXT_PUBLIC_SITE_URL');
    expect(actions).not.toContain("return `${origin}/workshop/projects/${projectId}`");
  });

  it("copy invite link returns email-bound invite URL while project links stay direct", () => {
    expect(actions).toContain("copyProjectInviteLink");
    expect(actions).toContain("recordCollaborationInvitationDelivery");
    expect(actions).toContain("Invite links are disabled.");
    expect(actions).toContain("Copy invite link");
  });

  it("resends pending invite emails through the app-owned invite token route with rate limiting", () => {
    expect(actions).toContain("resendProjectInviteEmail");
    expect(actions).toContain("sendCloudflareInviteEmail");
    expect(actions).toContain("checkInviteResendRateLimit");
    expect(actions).toContain('deliveryMethod: "email"');
  });

  it("records invite email delivery only after Cloudflare Email accepts the send", () => {
    expect(actions).toContain("recordCollaborationInvitationDelivery");
    expect(actions).toContain('deliveryMethod: "email"');
    expect(actions).toMatch(/try \{[\s\S]*?await sendCloudflareInviteEmail\(\{[\s\S]*?\}\);\n  \} catch \(error\) \{[\s\S]*?return \{[\s\S]*?Invitation created\. Share the invite link manually\.[\s\S]*?\};\n  \}\n\n  await recordCollaborationInvitationDelivery\(\{/);
  });

  it("returns honest invite messages when app-owned invite links are disabled", () => {
    expect(actions).toContain("readProjectInviteDeliveryReadiness");
    expect(actions).toContain("Teamspace invite delivery is disabled until project invite entry and token settings are configured.");
    expect(actions).toContain("Teamspace invite delivery is disabled until email delivery is explicitly enabled.");
    expect(actions).toContain("readEmailDeliveryConfig");
    expect(actions).toContain("Invitation created. Share the invite link manually.");
    expect(actions).toContain("[collaboration] invite email delivery failed");
    expect(actions).toContain("User added directly. They can access the project now.");
    expect(actions).toContain("User added directly. They can access this estimate now.");
    expect(actions).toContain("Link-based invites are unavailable. Enable project invite entry before inviting new users.");
    expect(actions).toContain("Link-based estimate invites are unavailable. Enable project invite entry before inviting new users.");
    expect(actions).toContain("const inviteEntryEnabled = isProjectInviteEntryEnabled()");
    expect(actions).toContain("if (!inviteEntryEnabled || !invitation || !inviteLink)");
    expect(actions).toContain("Invite email resend is disabled until email delivery is explicitly enabled.");
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
    expect(actions).toContain("const directGrantedAt = nowIso()");
    expect(actions).toContain("SET accepted_at = ?");
    expect(actions).toContain("direct_granted_at = ?");
    expect(actions).toContain("accepted_via");
    expect(actions).toContain("manager_direct_grant");
    expect(actions).not.toContain('accepted_via: "invite_route"');
  });

  it("keeps role and estimate access mutations behind server-side manager checks", () => {
    expect(actions).toContain("assertProjectAccessManager");
    expect(actions).toContain("updateProjectCollaboratorRole");
    expect(actions).toContain("removeProjectCollaborator");
    expect(actions).toContain("project_favorites");
    expect(actions).toContain("sendCollaboratorRemovalNotification");
    expect(actions).toContain("setEstimateSheetAccessMode");
    expect(actions).toContain("upsertSheetOwnerBeforeRestricting");
    expect(actions).toContain("collaborationRoleRank");
    expect(actions).toContain("Cannot assign a role above your own access level.");
  });

  it("wires Publisher access panel to sheet invite and per-estimate access controls", () => {
    expect(publisherMembersPanel).toContain("inviteEstimateSheetCollaborator");
    expect(publisherMembersPanel).toContain("setEstimateSheetAccessMode");
    expect(publisherMembersPanel).toContain("removeEstimateSheetCollaborator");
    expect(publisherMembersPanel).toContain("Project members");
    expect(publisherMembersPanel).toContain("Estimate access");
    expect(publisherMembersPanel).toContain("Access mode for");
    expect(publisherMembersPanel).toContain("Invite to");
  });
});
