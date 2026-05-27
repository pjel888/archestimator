"use server";

import { createClient } from "@supabase/supabase-js";
import { revalidatePath } from "next/cache";
import { headers } from "next/headers";

import { resolveAuthOrigin as resolveAllowedAuthOrigin } from "@/lib/auth/redirects";
import { requireCurrentUserContext } from "@/lib/auth/session";
import {
  buildInviteEntryUrl,
  createInviteToken,
  isProjectInviteEntryEnabled,
} from "@/lib/collaboration/invite-entry";
import { isUuid } from "@/lib/ids";
import type { CollaborationRole } from "@/lib/collaboration/types";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { Database, Tables } from "@/lib/supabase/types";

type CollaborationActionResult = {
  ok: boolean;
  message: string;
  invitePath?: string;
};

type ProjectAccessContext = {
  actorRank: number;
  admin: ReturnType<typeof createCollaborationAdminClient>;
  currentUserId: string;
  project: Pick<Tables<"projects">, "id" | "workspace_id">;
};

type EstimateAccessContext = ProjectAccessContext & {
  estimate: Pick<Tables<"estimates">, "id" | "project_id">;
  estimateActorRank: number;
};

const roleRank: Record<CollaborationRole, number> = {
  owner: 40,
  admin: 30,
  editor: 20,
  viewer: 10,
};

const managerRank = roleRank.admin;
const INVITE_EXPIRATION_DAYS = 14;

function normalizeEmail(email: string) {
  const normalized = email.trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized)) {
    throw new Error("Enter a valid email address.");
  }
  return normalized;
}

function assertUuid(value: string, label: string) {
  if (!isUuid(value)) throw new Error(`${label} is invalid.`);
}

function assertAssignableRole(actorRank: number, role: CollaborationRole) {
  if (actorRank < managerRank) throw new Error("Only owners and admins can manage access.");
  if (roleRank[role] > actorRank) throw new Error("Cannot assign a role above your own access level.");
}

function createCollaborationAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (!url || !serviceRoleKey) {
    throw new Error("Email invitations require NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY on the server.");
  }

  return createClient<Database>(url, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
    global: {
      headers: {
        "X-Client-Info": "archestimator-collaboration-invites",
      },
    },
  });
}

function workspaceRoleRank(role: Tables<"workspace_members">["role"] | null | undefined) {
  if (role === "owner") return 40;
  if (role === "admin") return 30;
  if (role === "member") return 20;
  if (role === "viewer") return 10;
  return 0;
}

async function readProjectActorRank({
  admin,
  project,
  currentUserId,
  platformRole,
}: {
  admin: ReturnType<typeof createCollaborationAdminClient>;
  project: Pick<Tables<"projects">, "id" | "workspace_id">;
  currentUserId: string;
  platformRole: Tables<"profiles">["role"];
}) {
  if (platformRole === "ceo" || platformRole === "admin") return 100;

  const [workspaceMembership, projectMembership] = await Promise.all([
    admin
      .from("workspace_members")
      .select("role")
      .eq("workspace_id", project.workspace_id)
      .eq("user_id", currentUserId)
      .maybeSingle(),
    admin
      .from("project_members")
      .select("role")
      .eq("project_id", project.id)
      .eq("user_id", currentUserId)
      .maybeSingle(),
  ]);

  if (workspaceMembership.error) throw workspaceMembership.error;
  if (projectMembership.error) throw projectMembership.error;

  return Math.max(workspaceRoleRank(workspaceMembership.data?.role), roleRank[projectMembership.data?.role ?? "viewer"]);
}

async function assertProjectAccessManager(projectId: string): Promise<ProjectAccessContext> {
  assertUuid(projectId, "Project");

  const currentUser = await requireCurrentUserContext();
  const admin = createCollaborationAdminClient();
  const { data: project, error: projectError } = await admin
    .from("projects")
    .select("id, workspace_id")
    .eq("id", projectId)
    .maybeSingle();

  if (projectError) throw projectError;
  if (!project) throw new Error("Project was not found.");

  const actorRank = await readProjectActorRank({
    admin,
    project,
    currentUserId: currentUser.userId,
    platformRole: currentUser.role,
  });

  if (actorRank < managerRank) throw new Error("Only project owners and admins can manage access.");

  return {
    actorRank,
    admin,
    currentUserId: currentUser.userId,
    project,
  };
}

async function readEstimateActorRank(context: ProjectAccessContext, estimateId: string) {
  const [settingsResult, sheetMembershipResult] = await Promise.all([
    context.admin
      .from("estimate_sheet_access_settings")
      .select("inherit_project_access")
      .eq("estimate_id", estimateId)
      .maybeSingle(),
    context.admin
      .from("estimate_sheet_members")
      .select("role")
      .eq("estimate_id", estimateId)
      .eq("user_id", context.currentUserId)
      .maybeSingle(),
  ]);

  if (settingsResult.error) throw settingsResult.error;
  if (sheetMembershipResult.error) throw sheetMembershipResult.error;

  const inheritsProjectAccess = settingsResult.data?.inherit_project_access ?? true;
  return Math.max(inheritsProjectAccess ? context.actorRank : 0, roleRank[sheetMembershipResult.data?.role ?? "viewer"]);
}

async function assertEstimateAccessManager(projectId: string, estimateId: string): Promise<EstimateAccessContext> {
  assertUuid(estimateId, "Estimate sheet");
  const projectContext = await assertProjectAccessManager(projectId);
  const { data: estimate, error: estimateError } = await projectContext.admin
    .from("estimates")
    .select("id, project_id")
    .eq("id", estimateId)
    .eq("project_id", projectContext.project.id)
    .maybeSingle();

  if (estimateError) throw estimateError;
  if (!estimate) throw new Error("Estimate sheet was not found.");

  const estimateActorRank = await readEstimateActorRank(projectContext, estimate.id);
  if (estimateActorRank < managerRank) throw new Error("Only sheet owners and admins can manage this sheet.");

  return {
    ...projectContext,
    estimate,
    estimateActorRank,
  };
}

async function hasOtherProjectManager(context: ProjectAccessContext, targetUserId: string) {
  const [workspaceManagers, projectManagers] = await Promise.all([
    context.admin
      .from("workspace_members")
      .select("user_id")
      .eq("workspace_id", context.project.workspace_id)
      .in("role", ["owner", "admin"])
      .neq("user_id", targetUserId)
      .limit(1),
    context.admin
      .from("project_members")
      .select("user_id")
      .eq("project_id", context.project.id)
      .in("role", ["owner", "admin"])
      .neq("user_id", targetUserId)
      .limit(1),
  ]);

  if (workspaceManagers.error) throw workspaceManagers.error;
  if (projectManagers.error) throw projectManagers.error;
  return Boolean(workspaceManagers.data?.length || projectManagers.data?.length);
}

async function upsertInvitation({
  context,
  email,
  estimateId,
  role,
  scope,
}: {
  context: ProjectAccessContext;
  email: string;
  estimateId: string | null;
  role: CollaborationRole;
  scope: "project" | "estimate";
}) {
  const expiresAt = new Date(Date.now() + INVITE_EXPIRATION_DAYS * 24 * 60 * 60 * 1000).toISOString();
  const { data: insertedInvitation, error } = await context.admin
    .from("collaboration_invitations")
    .insert({
      workspace_id: context.project.workspace_id,
      project_id: context.project.id,
      estimate_id: estimateId,
      scope,
      email,
      role,
      invited_by: context.currentUserId,
      expires_at: expiresAt,
      lifecycle_state: "pending",
    })
    .select("id, expires_at")
    .single();

  if (!error) return { id: insertedInvitation.id, expiresAt: insertedInvitation.expires_at };
  if (error.code !== "23505") throw error;

  let update = context.admin
    .from("collaboration_invitations")
    .update({
      role,
      invited_by: context.currentUserId,
      expires_at: expiresAt,
      lifecycle_state: "pending",
      accepted_at: null,
      accepted_via: null,
      invited_user_id: null,
    })
    .eq("project_id", context.project.id)
    .eq("email", email)
    .eq("scope", scope)
    .eq("lifecycle_state", "pending")
    .is("revoked_at", null);

  update = estimateId ? update.eq("estimate_id", estimateId) : update.is("estimate_id", null);
  const { data: updatedInvitation, error: updateError } = await update.select("id, expires_at").single();
  if (updateError) throw updateError;
  return { id: updatedInvitation.id, expiresAt: updatedInvitation.expires_at };
}

async function resolveInviteOrigin() {
  const headerList = await headers();
  const requestHost = headerList.get("host");
  const forwardedProto = headerList.get("x-forwarded-proto");
  const requestUrl = requestHost
    ? `${forwardedProto ?? (requestHost.startsWith("localhost") ? "http" : "https")}://${requestHost}`
    : null;

  return resolveAllowedAuthOrigin({
    requestOrigin: headerList.get("origin"),
    requestUrl,
  });
}

async function buildProjectRedirectUrl(projectId: string) {
  const origin = await resolveInviteOrigin();
  if (!origin) return undefined;
  return new URL(`/workshop/projects/${projectId}`, origin).toString();
}

async function issueInviteEntryLink({
  invitationId,
  expiresAt,
  deliveryMethod,
  revokeExisting = true,
}: {
  invitationId: string;
  expiresAt: string;
  deliveryMethod: "email" | "copy_url";
  revokeExisting?: boolean;
}) {
  const inviteToken = createInviteToken();
  const supabase = await createSupabaseServerClient();
  const { data: tokenId, error } = await supabase.rpc("issue_collaboration_invitation_token", {
    invitation_id: invitationId,
    invitation_token_hash: inviteToken.tokenHash,
    token_hint: inviteToken.tokenHint,
    delivery_method: deliveryMethod,
    token_expires_at: expiresAt,
    revoke_existing: revokeExisting,
  });
  if (error) throw error;

  const invitePath = `/invite/${encodeURIComponent(inviteToken.rawToken)}`;
  const origin = await resolveInviteOrigin();
  const inviteEntryUrl = origin ? buildInviteEntryUrl(origin, inviteToken.rawToken) : invitePath;
  return {
    inviteEntryUrl,
    invitePath,
    tokenId,
  };
}

async function sendSupabaseInviteEmail({
  admin,
  email,
  inviteEntryUrl,
  projectId,
  role,
  scope,
}: {
  admin: ReturnType<typeof createCollaborationAdminClient>;
  email: string;
  inviteEntryUrl?: string;
  projectId: string;
  role: CollaborationRole;
  scope: "project" | "estimate";
}) {
  const redirectTo = inviteEntryUrl ?? (await buildProjectRedirectUrl(projectId));
  const { error } = await admin.auth.admin.inviteUserByEmail(email, {
    redirectTo,
    data: {
      project_id: projectId,
      collaboration_role: role,
      collaboration_scope: scope,
      invite_url: inviteEntryUrl,
    },
  });

  if (error) throw new Error(error.message);
}

function revalidateCollaborationRoutes(projectId: string) {
  revalidatePath("/workshop/projects");
  revalidatePath(`/workshop/projects/${projectId}`);
  revalidatePath(`/workshop/projects/${projectId}/estimates`);
}

export async function inviteProjectCollaborator({
  projectId,
  email,
  role,
}: {
  projectId: string;
  email: string;
  role: CollaborationRole;
}): Promise<CollaborationActionResult> {
  const context = await assertProjectAccessManager(projectId);
  assertAssignableRole(context.actorRank, role);

  const normalizedEmail = normalizeEmail(email);
  const invitation = await upsertInvitation({ context, email: normalizedEmail, estimateId: null, role, scope: "project" });
  const inviteLink = isProjectInviteEntryEnabled()
    ? await issueInviteEntryLink({
        invitationId: invitation.id,
        expiresAt: invitation.expiresAt,
        deliveryMethod: "email",
      })
    : null;

  const { data: profile, error: profileError } = await context.admin
    .from("profiles")
    .select("id")
    .eq("email", normalizedEmail)
    .maybeSingle();
  if (profileError) throw profileError;

  if (profile) {
    const directGrantedAt = new Date().toISOString();
    const { error } = await context.admin.from("project_members").upsert(
      {
        project_id: context.project.id,
        workspace_id: context.project.workspace_id,
        user_id: profile.id,
        role,
        added_by: context.currentUserId,
      },
      { onConflict: "project_id,user_id" },
    );
    if (error) throw error;

    await context.admin
      .from("collaboration_invitations")
      .update({
        accepted_at: directGrantedAt,
        direct_granted_at: directGrantedAt,
        direct_granted_user_id: profile.id,
        invited_user_id: profile.id,
        accepted_via: "manager_direct_grant",
        lifecycle_state: "direct_granted_existing_user",
      })
      .eq("project_id", context.project.id)
      .eq("email", normalizedEmail)
      .eq("scope", "project")
      .eq("lifecycle_state", "pending");

    revalidateCollaborationRoutes(context.project.id);
    return {
      ok: true,
      message: "Existing user added. Copy invite link to let them confirm access.",
      invitePath: inviteLink?.invitePath,
    };
  }

  await sendSupabaseInviteEmail({
    admin: context.admin,
    email: normalizedEmail,
    inviteEntryUrl: inviteLink?.inviteEntryUrl,
    projectId: context.project.id,
    role,
    scope: "project",
  });

  revalidateCollaborationRoutes(context.project.id);
  return { ok: true, message: "Invite email sent.", invitePath: inviteLink?.invitePath };
}

export async function inviteEstimateSheetCollaborator({
  projectId,
  estimateId,
  email,
  role,
}: {
  projectId: string;
  estimateId: string;
  email: string;
  role: CollaborationRole;
}): Promise<CollaborationActionResult> {
  const context = await assertEstimateAccessManager(projectId, estimateId);
  assertAssignableRole(context.estimateActorRank, role);

  const normalizedEmail = normalizeEmail(email);
  const invitation = await upsertInvitation({ context, email: normalizedEmail, estimateId: context.estimate.id, role, scope: "estimate" });
  const inviteLink = isProjectInviteEntryEnabled()
    ? await issueInviteEntryLink({
        invitationId: invitation.id,
        expiresAt: invitation.expiresAt,
        deliveryMethod: "email",
      })
    : null;

  const { data: profile, error: profileError } = await context.admin
    .from("profiles")
    .select("id")
    .eq("email", normalizedEmail)
    .maybeSingle();
  if (profileError) throw profileError;

  if (profile) {
    const directGrantedAt = new Date().toISOString();
    const { error } = await context.admin.from("estimate_sheet_members").upsert(
      {
        estimate_id: context.estimate.id,
        project_id: context.project.id,
        user_id: profile.id,
        role,
        added_by: context.currentUserId,
      },
      { onConflict: "estimate_id,user_id" },
    );
    if (error) throw error;

    await context.admin
      .from("collaboration_invitations")
      .update({
        accepted_at: directGrantedAt,
        direct_granted_at: directGrantedAt,
        direct_granted_user_id: profile.id,
        invited_user_id: profile.id,
        accepted_via: "manager_direct_grant",
        lifecycle_state: "direct_granted_existing_user",
      })
      .eq("estimate_id", context.estimate.id)
      .eq("email", normalizedEmail)
      .eq("scope", "estimate")
      .eq("lifecycle_state", "pending");

    revalidateCollaborationRoutes(context.project.id);
    return {
      ok: true,
      message: "Existing user added to this sheet. Copy invite link to let them confirm access.",
      invitePath: inviteLink?.invitePath,
    };
  }

  await sendSupabaseInviteEmail({
    admin: context.admin,
    email: normalizedEmail,
    inviteEntryUrl: inviteLink?.inviteEntryUrl,
    projectId: context.project.id,
    role,
    scope: "estimate",
  });

  revalidateCollaborationRoutes(context.project.id);
  return { ok: true, message: "Sheet invite email sent.", invitePath: inviteLink?.invitePath };
}

export async function copyProjectInviteLink({
  invitationId,
}: {
  invitationId: string;
}): Promise<CollaborationActionResult> {
  assertUuid(invitationId, "Invitation");
  const admin = createCollaborationAdminClient();
  const { data: invitation, error: invitationError } = await admin
    .from("collaboration_invitations")
    .select("project_id, expires_at")
    .eq("id", invitationId)
    .maybeSingle();
  if (invitationError) throw invitationError;
  if (!invitation) throw new Error("Invitation was not found.");

  const context = await assertProjectAccessManager(invitation.project_id);
  if (!isProjectInviteEntryEnabled()) {
    return { ok: false, message: "Invite links are disabled." };
  }

  const inviteLink = await issueInviteEntryLink({
    invitationId,
    expiresAt: invitation.expires_at,
    deliveryMethod: "copy_url",
  });
  const supabase = await createSupabaseServerClient();
  await supabase.rpc("record_collaboration_invitation_delivery", {
    invitation_id: invitationId,
    token_id: inviteLink.tokenId,
    delivery_method: "copy_url",
  });
  revalidateCollaborationRoutes(context.project.id);
  return { ok: true, message: "Copy invite link", invitePath: inviteLink.invitePath };
}

export async function updateProjectCollaboratorRole({
  projectId,
  userId,
  role,
}: {
  projectId: string;
  userId: string;
  role: CollaborationRole;
}): Promise<CollaborationActionResult> {
  assertUuid(userId, "User");
  const context = await assertProjectAccessManager(projectId);
  assertAssignableRole(context.actorRank, role);

  const { data: existingMember, error: existingError } = await context.admin
    .from("project_members")
    .select("role")
    .eq("project_id", context.project.id)
    .eq("user_id", userId)
    .maybeSingle();
  if (existingError) throw existingError;

  if (existingMember && roleRank[existingMember.role] >= managerRank && roleRank[role] < managerRank) {
    const hasOtherManager = await hasOtherProjectManager(context, userId);
    if (!hasOtherManager) throw new Error("Every project needs at least one owner or admin.");
  }

  const { error } = await context.admin.from("project_members").upsert(
    {
      project_id: context.project.id,
      workspace_id: context.project.workspace_id,
      user_id: userId,
      role,
      added_by: context.currentUserId,
    },
    { onConflict: "project_id,user_id" },
  );
  if (error) throw error;

  revalidateCollaborationRoutes(context.project.id);
  return { ok: true, message: "Role updated." };
}

export async function removeProjectCollaborator({
  projectId,
  userId,
}: {
  projectId: string;
  userId: string;
}): Promise<CollaborationActionResult> {
  assertUuid(userId, "User");
  const context = await assertProjectAccessManager(projectId);

  const { data: existingMember, error: existingError } = await context.admin
    .from("project_members")
    .select("role")
    .eq("project_id", context.project.id)
    .eq("user_id", userId)
    .maybeSingle();
  if (existingError) throw existingError;
  if (!existingMember) return { ok: true, message: "Project-specific access already removed." };

  if (roleRank[existingMember.role] >= managerRank) {
    const hasOtherManager = await hasOtherProjectManager(context, userId);
    if (!hasOtherManager) throw new Error("Every project needs at least one owner or admin.");
  }

  const { error } = await context.admin
    .from("project_members")
    .delete()
    .eq("project_id", context.project.id)
    .eq("user_id", userId);
  if (error) throw error;

  revalidateCollaborationRoutes(context.project.id);
  return { ok: true, message: "Project-specific access removed." };
}

async function upsertSheetOwnerBeforeRestricting(context: EstimateAccessContext) {
  const { error } = await context.admin.from("estimate_sheet_members").upsert(
    {
      estimate_id: context.estimate.id,
      project_id: context.project.id,
      user_id: context.currentUserId,
      role: "owner",
      added_by: context.currentUserId,
    },
    { onConflict: "estimate_id,user_id" },
  );
  if (error) throw error;
}

export async function setEstimateSheetAccessMode({
  projectId,
  estimateId,
  inheritProjectAccess,
}: {
  projectId: string;
  estimateId: string;
  inheritProjectAccess: boolean;
}): Promise<CollaborationActionResult> {
  const context = await assertEstimateAccessManager(projectId, estimateId);
  if (!inheritProjectAccess) await upsertSheetOwnerBeforeRestricting(context);

  const { error } = await context.admin.from("estimate_sheet_access_settings").upsert(
    {
      estimate_id: context.estimate.id,
      project_id: context.project.id,
      inherit_project_access: inheritProjectAccess,
      updated_by: context.currentUserId,
    },
    { onConflict: "estimate_id" },
  );
  if (error) throw error;

  revalidateCollaborationRoutes(context.project.id);
  return { ok: true, message: inheritProjectAccess ? "Sheet now inherits project access." : "Sheet access is now restricted." };
}
