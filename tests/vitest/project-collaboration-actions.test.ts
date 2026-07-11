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
    expect(actions).toContain("assertInvitationAccessManager");
    expect(actions).toContain("Only pending invitations can be copied.");
    expect(actions).toContain("recordCollaborationInvitationDelivery");
    expect(actions).toContain("Invite links are disabled.");
    expect(actions).toContain("Copy invite link");
  });

  it("resends pending invite emails through the app-owned invite token route with rate limiting", () => {
    expect(actions).toContain("resendProjectInviteEmail");
    expect(actions).toContain("sendCloudflareInviteEmail");
    expect(actions).toContain("checkInviteResendRateLimit");
    expect(actions).toContain('deliveryMethod: "email"');
    expect(actions).toContain("assertInvitationAccessManager(invitation, db)");
  });

  it("cancels pending invitations with an exact-scope transactional D1 operation", () => {
    const revoke = actions.match(/export async function revokeCollaborationInvitation[\s\S]*?\n}\n\nexport async function addProjectCollaborator/)?.[0];
    expect(revoke).toContain("assertInvitationAccessManager(invitation, db)");
    expect(revoke).toContain("Only pending invitations can be cancelled.");
    expect(revoke).toContain("if (!db.batch)");
    expect(revoke).toContain("await db.batch([");
    expect(revoke).toContain("collaboration_invite_revoked");
    expect(revoke).toContain("lifecycle_state = 'revoked' AND revoked_at = ?");
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

  it("keeps an existing-profile email invite pending until the acceptance flow completes", () => {
    expect(actions).toContain("upsertInvitation");
    const upsert = actions.match(/async function upsertInvitation[\s\S]*?\n}\n\nasync function resolveInviteOrigin/)?.[0];
    expect(upsert).toContain("ON CONFLICT(project_id, email, scope, IFNULL(estimate_id, ''))");
    expect(upsert).toContain("WHERE lifecycle_state = 'pending' AND revoked_at IS NULL");
    expect(upsert).toContain("RETURNING id, expires_at");
    expect(upsert).not.toContain("SELECT id");
    expect(actions).not.toContain("readProfileIdByEmail");
    expect(actions).not.toContain("markDirectGrantedInvitationInD1");
    expect(actions).not.toContain("direct_granted_existing_user");
    expect(actions).not.toContain("manager_direct_grant");
  });

  it("keeps role and estimate access mutations behind server-side manager checks", () => {
    expect(actions).toContain("assertProjectAccessManager");
    expect(actions).toContain("updateProjectCollaboratorRole");
    expect(actions).toContain("updateEstimateSheetCollaboratorRole");
    expect(actions).toContain("removeProjectCollaborator");
    expect(actions).toContain("previewEstimateSheetCollaboratorRemoval");
    expect(actions).toContain("project_favorites");
    expect(actions).toContain("sendCollaboratorRemovalNotification");
    expect(actions).toContain("setEstimateSheetAccessMode");
    expect(actions).toContain("addProjectCollaborator");
    expect(actions).toContain("addEstimateSheetCollaborator");
    expect(actions).toContain("upsertSheetOwnerBeforeRestricting");
    expect(actions).toContain("collaborationRoleRank");
    expect(actions).toContain("Cannot assign a role at or above your own access level.");
    expect(actions).toContain("Ownership transfer requires a dedicated flow.");
    expect(actions).toContain("Cannot modify a collaborator with equal or higher access.");
    expect(actions).toContain("describeRemainingInheritedEstimateAccess");
    expect(actions).toContain("No inherited project access remains.");
  });

  it("enforces target dominance on project and direct-sheet mutations", () => {
    const projectRoleChange = actions.match(/export async function updateProjectCollaboratorRole[\s\S]*?\n}\n\nasync function sendCollaboratorRemovalNotification/)?.[0];
    const projectRemoval = actions.match(/export async function removeProjectCollaborator[\s\S]*?\n}\n\nexport async function previewProjectCollaboratorRemoval/)?.[0];
    const estimateRemoval = actions.match(/export async function removeEstimateSheetCollaborator[\s\S]*?\n}\n\nexport async function previewEstimateSheetCollaboratorRemoval/)?.[0];
    const estimateRemovalGuard = actions.match(/async function assertEstimateSheetRemovalAllowed[\s\S]*?\n}\n\nasync function upsertInvitation/)?.[0];

    expect(projectRoleChange).toContain("assertTargetRoleCanBeMutated(context.actorRank");
    expect(projectRemoval).toContain("assertTargetRoleCanBeMutated(context.actorRank");
    expect(projectRemoval).toContain("removalMode: ProjectCollaboratorRemovalMode");
    expect(projectRemoval).toContain("Project removal requires transactional D1 support.");
    expect(projectRemoval).toContain("remove_all_direct_grants");
    expect(actions).toContain("retain_sheet_grants");
    expect(estimateRemoval).toContain("assertEstimateSheetRemovalAllowed(context, userId)");
    expect(estimateRemovalGuard).toContain("assertTargetRoleCanBeMutated(context.estimateActorRank");
    expect(actions).toContain("canAssignCollaborationRole");
    expect(actions).toContain("canMutateCollaborationTarget");
  });

  it("keeps add, invite, and role-change commands distinct", () => {
    const addProject = actions.match(/export async function addProjectCollaborator[\s\S]*?\n}\n\nexport async function addEstimateSheetCollaborator/)?.[0];
    const addEstimate = actions.match(/export async function addEstimateSheetCollaborator[\s\S]*?\n}\n\nexport async function updateProjectCollaboratorRole/)?.[0];
    const changeProject = actions.match(/export async function updateProjectCollaboratorRole[\s\S]*?\n}\n\nasync function sendCollaboratorRemovalNotification/)?.[0];

    expect(addProject).toContain("already a project member. Use the role-change command.");
    expect(addProject).toContain("You cannot grant yourself direct project access.");
    expect(addProject).toContain("The selected user is no longer available.");
    expect(addEstimate).toContain("already has direct estimate access. Use the role-change command.");
    expect(addEstimate).toContain("You cannot grant yourself direct estimate access.");
    expect(addEstimate).toContain("The selected user is no longer available.");
    expect(changeProject).toContain("not a project member. Use the add-member command.");
    expect(changeProject).toContain('eventType: "role_changed"');
    const changeEstimate = actions.match(/export async function updateEstimateSheetCollaboratorRole[\s\S]*?\n}\n\nasync function sendCollaboratorRemovalNotification/)?.[0];
    expect(changeEstimate).toContain("no direct estimate access. Use the add-member command.");
    expect(changeEstimate).toContain("Every restricted estimate needs at least one owner or admin.");
    expect(changeEstimate).toContain('scope: "estimate"');
  });

  it("evaluates direct estimate managers without requiring project-manager authority", () => {
    const estimateManager = actions.match(/async function assertEstimateAccessManager[\s\S]*?\n}\n\nasync function hasOtherProjectManager/)?.[0];
    expect(estimateManager).toContain("readProjectAccessContext(projectId, existingDb)");
    expect(estimateManager).not.toContain("assertProjectAccessManager(projectId, existingDb)");
    expect(estimateManager).toContain("Only estimate owners and admins can manage this estimate.");
  });

  it("wires Publisher access panel to sheet invite and per-estimate access controls", () => {
    expect(publisherMembersPanel).toContain("inviteEstimateSheetCollaborator");
    expect(publisherMembersPanel).toContain("setEstimateSheetAccessMode");
    expect(publisherMembersPanel).toContain("removeEstimateSheetCollaborator");
    expect(publisherMembersPanel).toContain("previewEstimateSheetCollaboratorRemoval");
    expect(publisherMembersPanel).toContain("Project members");
    expect(publisherMembersPanel).toContain("Estimate access");
    expect(publisherMembersPanel).toContain("Access mode for");
    expect(publisherMembersPanel).toContain("Invite to");
  });
});
