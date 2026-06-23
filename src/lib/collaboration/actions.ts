"use server";

import { createClient } from "@supabase/supabase-js";
import { revalidatePath } from "next/cache";
import { headers } from "next/headers";

import { resolveAuthOrigin as resolveAllowedAuthOrigin } from "@/lib/auth/redirects";
import { requireCurrentUserContext } from "@/lib/auth/session";
import {
  buildInviteEntryUrl,
  checkInviteCreateRateLimit,
  checkInviteResendRateLimit,
  createInviteToken,
  isProjectInviteEntryEnabled,
} from "@/lib/collaboration/invite-entry";
import { readEmailDeliveryConfig, sendEmail } from "@/lib/email/resend-client";
import { isUuid } from "@/lib/ids";
import type { CollaborationRole } from "@/lib/collaboration/types";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { Database, Json, Tables } from "@/lib/supabase/types";

type CollaborationActionResult = {
  ok: boolean;
  message: string;
  invitePath?: string;
};

export type ProjectInviteDeliveryReadiness = {
  configured: boolean;
  message: string;
};

type ProjectAccessContext = {
  actorRank: number;
  // react-doctor-disable-next-line react-doctor/supabase-client-owned-authz-field -- Server-only action context field; not a browser Supabase write.
  admin: ReturnType<typeof createCollaborationAdminClient>;
  currentUserId: string;
  project: Pick<Tables<"projects">, "id" | "name" | "workspace_id">;
};

type EstimateAccessContext = ProjectAccessContext & {
  estimate: Pick<Tables<"estimates">, "id" | "project_id">;
  estimateActorRank: number;
};

const managerRank = 30;
const INVITE_EXPIRATION_DAYS = 14;
const RATE_LIMIT_ACTION_MESSAGE_PREFIX = "Too many attempts. Please wait";

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

function collaborationRoleRank(role: CollaborationRole) {
  if (role === "owner") return 40;
  if (role === "admin") return managerRank;
  if (role === "editor") return 20;
  return 10;
}

function assertAssignableRole(actorRank: number, role: CollaborationRole) {
  if (actorRank < managerRank) throw new Error("Only owners and admins can manage access.");
  if (collaborationRoleRank(role) > actorRank) throw new Error("Cannot assign a role above your own access level.");
}

function rateLimitActionResult(result: { message: string }): CollaborationActionResult {
  const message = result.message.includes(RATE_LIMIT_ACTION_MESSAGE_PREFIX)
    ? result.message
    : `${RATE_LIMIT_ACTION_MESSAGE_PREFIX}.`;
  return { ok: false, message };
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

  return Math.max(
    workspaceRoleRank(workspaceMembership.data?.role),
    collaborationRoleRank(projectMembership.data?.role ?? "viewer"),
  );
}

async function assertProjectAccessManager(projectId: string): Promise<ProjectAccessContext> {
  assertUuid(projectId, "Project");

  const currentUser = await requireCurrentUserContext();
  const admin = createCollaborationAdminClient();
  const { data: project, error: projectError } = await admin
    .from("projects")
    .select("id, name, workspace_id")
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
  return Math.max(
    inheritsProjectAccess ? context.actorRank : 0,
    collaborationRoleRank(sheetMembershipResult.data?.role ?? "viewer"),
  );
}

async function assertEstimateAccessManager(projectId: string, estimateId: string): Promise<EstimateAccessContext> {
  assertUuid(estimateId, "Estimate");
  const projectContext = await assertProjectAccessManager(projectId);
  const { data: estimate, error: estimateError } = await projectContext.admin
    .from("estimates")
    .select("id, project_id")
    .eq("id", estimateId)
    .eq("project_id", projectContext.project.id)
    .maybeSingle();

  if (estimateError) throw estimateError;
  if (!estimate) throw new Error("Estimate was not found.");

  const estimateActorRank = await readEstimateActorRank(projectContext, estimate.id);
  if (estimateActorRank < managerRank) throw new Error("Only estimate owners and admins can manage this estimate.");

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

async function recordCollaborationInvitationDelivery({
  deliveryMethod,
  invitationId,
  tokenId,
}: {
  deliveryMethod: "email" | "copy_url";
  invitationId: string;
  tokenId?: string | null;
}) {
  if (!tokenId) return;

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.rpc("record_collaboration_invitation_delivery", {
    invitation_id: invitationId,
    token_id: tokenId,
    delivery_method: deliveryMethod,
  });
  if (error) throw error;
}

async function recordCollaborationAuditEvent({
  context,
  estimateId = null,
  eventType,
  invitationId = null,
  metadata,
}: {
  context: ProjectAccessContext;
  estimateId?: string | null;
  eventType: "invite_email_attempted" | "role_changed" | "member_removed";
  invitationId?: string | null;
  metadata: Record<string, string | number | boolean | null>;
}) {
  try {
    const { error } = await context.admin.from("collaboration_audit_events").insert({
      actor_user_id: context.currentUserId,
      estimate_id: estimateId,
      event_type: eventType,
      invitation_id: invitationId,
      metadata: metadata as Json,
      project_id: context.project.id,
    });
    if (error) {
      console.warn("[collaboration] audit event skipped", {
        eventType,
        projectId: context.project.id,
      });
    }
  } catch {
    console.warn("[collaboration] audit event skipped", {
      eventType,
      projectId: context.project.id,
    });
  }
}

function revalidateCollaborationRoutes(projectId: string) {
  // T2.1 / F-P6: the project-layout collaboration summary is now a client
  // TanStack Query (["project-collaboration", projectId]) that the mutating
  // client invalidates directly, so we no longer revalidate the heavy project
  // layout or the estimates route on every role/invite change (each previously
  // re-ran the collaboration + publication + sheets server fans). Only the
  // lightweight projects list is revalidated so membership reflects there on the
  // next navigation.
  revalidatePath("/workshop/projects");
  void projectId;
}

export async function readProjectInviteDeliveryReadiness(): Promise<ProjectInviteDeliveryReadiness> {
  await requireCurrentUserContext();

  const inviteEntryEnabled = isProjectInviteEntryEnabled();
  const emailDeliveryConfig = readEmailDeliveryConfig();
  const configured = inviteEntryEnabled && emailDeliveryConfig.configured;
  const disabledMessage = !inviteEntryEnabled
    ? "Teamspace invite delivery is disabled until project invite entry and token settings are configured. Send beta invites manually outside the app."
    : !emailDeliveryConfig.enabled
      ? "Teamspace invite delivery is disabled until email delivery is explicitly enabled. Send beta invites manually outside the app."
      : "Teamspace invite delivery is disabled until Resend sender settings are configured. Send beta invites manually outside the app.";
  return {
    configured,
    message: configured
      ? "Teamspace invite delivery is configured."
      : disabledMessage,
  };
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
  const rateLimit = await checkInviteCreateRateLimit({
    headers: await headers(),
    projectId: context.project.id,
    userId: context.currentUserId,
  });
  if (!rateLimit.allowed) return rateLimitActionResult(rateLimit);

  const inviteEntryEnabled = isProjectInviteEntryEnabled();
  const { data: profile, error: profileError } = await context.admin
    .from("profiles")
    .select("id")
    .eq("email", normalizedEmail)
    .maybeSingle();
  if (profileError) throw profileError;

  let invitation: Awaited<ReturnType<typeof upsertInvitation>> | null = null;
  let inviteLink: Awaited<ReturnType<typeof issueInviteEntryLink>> | null = null;
  if (inviteEntryEnabled) {
    invitation = await upsertInvitation({ context, email: normalizedEmail, estimateId: null, role, scope: "project" });
    inviteLink = await issueInviteEntryLink({
      invitationId: invitation.id,
      expiresAt: invitation.expiresAt,
      deliveryMethod: "email",
    });
  }

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
      message: inviteLink
        ? "Existing user added. Copy invite link to let them confirm access."
        : "User added directly. They can access the project now.",
      invitePath: inviteLink?.invitePath,
    };
  }

  if (!inviteEntryEnabled || !invitation || !inviteLink) {
    return {
      ok: false,
      message: "Link-based invites are unavailable. Enable project invite entry before inviting new users.",
    };
  }

  if (!readEmailDeliveryConfig().configured) {
    revalidateCollaborationRoutes(context.project.id);
    return {
      ok: true,
      message: "Invitation created. Share the invite link manually.",
      invitePath: inviteLink.invitePath,
    };
  }

  await recordCollaborationAuditEvent({
    context,
    eventType: "invite_email_attempted",
    invitationId: invitation.id,
    metadata: {
      email: normalizedEmail,
      invite_entry_enabled: Boolean(inviteLink),
      role,
      scope: "project",
    },
  });

  try {
    await sendSupabaseInviteEmail({
      admin: context.admin,
      email: normalizedEmail,
      inviteEntryUrl: inviteLink.inviteEntryUrl,
      projectId: context.project.id,
      role,
      scope: "project",
    });
  } catch (error) {
    console.warn("[collaboration] invite email delivery failed", {
      projectId: context.project.id,
      scope: "project",
      error: error instanceof Error ? error.message : "unknown",
    });
    revalidateCollaborationRoutes(context.project.id);
    return {
      ok: true,
      message: "Invitation created. Share the invite link manually.",
      invitePath: inviteLink.invitePath,
    };
  }

  await recordCollaborationInvitationDelivery({
    deliveryMethod: "email",
    invitationId: invitation.id,
    tokenId: inviteLink.tokenId,
  });

  revalidateCollaborationRoutes(context.project.id);
  return { ok: true, message: "Invite email sent.", invitePath: inviteLink.invitePath };
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
  const rateLimit = await checkInviteCreateRateLimit({
    headers: await headers(),
    projectId: context.project.id,
    userId: context.currentUserId,
  });
  if (!rateLimit.allowed) return rateLimitActionResult(rateLimit);

  const inviteEntryEnabled = isProjectInviteEntryEnabled();
  const { data: profile, error: profileError } = await context.admin
    .from("profiles")
    .select("id")
    .eq("email", normalizedEmail)
    .maybeSingle();
  if (profileError) throw profileError;

  let invitation: Awaited<ReturnType<typeof upsertInvitation>> | null = null;
  let inviteLink: Awaited<ReturnType<typeof issueInviteEntryLink>> | null = null;
  if (inviteEntryEnabled) {
    invitation = await upsertInvitation({ context, email: normalizedEmail, estimateId: context.estimate.id, role, scope: "estimate" });
    inviteLink = await issueInviteEntryLink({
      invitationId: invitation.id,
      expiresAt: invitation.expiresAt,
      deliveryMethod: "email",
    });
  }

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
      message: inviteLink
        ? "Existing user added to this estimate. Copy invite link to let them confirm access."
        : "User added directly. They can access this estimate now.",
      invitePath: inviteLink?.invitePath,
    };
  }

  if (!inviteEntryEnabled || !invitation || !inviteLink) {
    return {
      ok: false,
      message: "Link-based estimate invites are unavailable. Enable project invite entry before inviting new users.",
    };
  }

  if (!readEmailDeliveryConfig().configured) {
    revalidateCollaborationRoutes(context.project.id);
    return {
      ok: true,
      message: "Invitation created. Share the invite link manually.",
      invitePath: inviteLink.invitePath,
    };
  }

  await recordCollaborationAuditEvent({
    context,
    estimateId: context.estimate.id,
    eventType: "invite_email_attempted",
    invitationId: invitation.id,
    metadata: {
      email: normalizedEmail,
      invite_entry_enabled: Boolean(inviteLink),
      role,
      scope: "estimate",
    },
  });

  try {
    await sendSupabaseInviteEmail({
      admin: context.admin,
      email: normalizedEmail,
      inviteEntryUrl: inviteLink.inviteEntryUrl,
      projectId: context.project.id,
      role,
      scope: "estimate",
    });
  } catch (error) {
    console.warn("[collaboration] invite email delivery failed", {
      projectId: context.project.id,
      scope: "estimate",
      error: error instanceof Error ? error.message : "unknown",
    });
    revalidateCollaborationRoutes(context.project.id);
    return {
      ok: true,
      message: "Invitation created. Share the invite link manually.",
      invitePath: inviteLink.invitePath,
    };
  }

  await recordCollaborationInvitationDelivery({
    deliveryMethod: "email",
    invitationId: invitation.id,
    tokenId: inviteLink.tokenId,
  });

  revalidateCollaborationRoutes(context.project.id);
  return { ok: true, message: "Estimate invite email sent.", invitePath: inviteLink.invitePath };
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

  const rateLimit = await checkInviteResendRateLimit({
    headers: await headers(),
    invitationId,
    userId: context.currentUserId,
  });
  if (!rateLimit.allowed) return rateLimitActionResult(rateLimit);

  const inviteLink = await issueInviteEntryLink({
    invitationId,
    expiresAt: invitation.expires_at,
    deliveryMethod: "copy_url",
  });
  await recordCollaborationInvitationDelivery({
    deliveryMethod: "copy_url",
    invitationId,
    tokenId: inviteLink.tokenId,
  });
  revalidateCollaborationRoutes(context.project.id);
  return { ok: true, message: "Copy invite link", invitePath: inviteLink.invitePath };
}

export async function resendProjectInviteEmail({
  invitationId,
}: {
  invitationId: string;
}): Promise<CollaborationActionResult> {
  assertUuid(invitationId, "Invitation");
  const admin = createCollaborationAdminClient();
  const { data: invitation, error: invitationError } = await admin
    .from("collaboration_invitations")
    .select("project_id, email, role, scope, expires_at, lifecycle_state, revoked_at")
    .eq("id", invitationId)
    .maybeSingle();
  if (invitationError) throw invitationError;
  if (!invitation) throw new Error("Invitation was not found.");
  if (invitation.revoked_at || invitation.lifecycle_state !== "pending") {
    return { ok: false, message: "Only pending invitations can be resent." };
  }
  if (new Date(invitation.expires_at).getTime() <= Date.now()) {
    return { ok: false, message: "This invitation has expired. Create a new invite." };
  }

  const context = await assertProjectAccessManager(invitation.project_id);
  if (!isProjectInviteEntryEnabled()) {
    return { ok: false, message: "Invite email resend requires invite links to be enabled." };
  }
  if (!readEmailDeliveryConfig().configured) {
    return { ok: false, message: "Invite email resend is disabled until email delivery is explicitly enabled." };
  }

  const rateLimit = await checkInviteResendRateLimit({
    headers: await headers(),
    invitationId,
    userId: context.currentUserId,
  });
  if (!rateLimit.allowed) return rateLimitActionResult(rateLimit);

  const inviteLink = await issueInviteEntryLink({
    invitationId,
    expiresAt: invitation.expires_at,
    deliveryMethod: "email",
  });
  const scope = invitation.scope === "estimate" ? "estimate" : "project";
  await sendSupabaseInviteEmail({
    admin,
    email: invitation.email,
    inviteEntryUrl: inviteLink.inviteEntryUrl,
    projectId: context.project.id,
    role: invitation.role,
    scope,
  });
  await recordCollaborationInvitationDelivery({
    deliveryMethod: "email",
    invitationId,
    tokenId: inviteLink.tokenId,
  });
  revalidateCollaborationRoutes(context.project.id);
  return { ok: true, message: "Invite email resent.", invitePath: inviteLink.invitePath };
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

  if (
    existingMember &&
    collaborationRoleRank(existingMember.role) >= managerRank &&
    collaborationRoleRank(role) < managerRank
  ) {
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

  await recordCollaborationAuditEvent({
    context,
    eventType: "role_changed",
    metadata: {
      next_role: role,
      previous_role: existingMember?.role ?? null,
      target_user_id: userId,
    },
  });

  revalidateCollaborationRoutes(context.project.id);
  return { ok: true, message: "Role updated." };
}

async function sendCollaboratorRemovalNotification({
  context,
  userId,
}: {
  context: ProjectAccessContext;
  userId: string;
}): Promise<"sent" | "mocked" | "skipped" | "failed"> {
  const { data: profile, error: profileError } = await context.admin
    .from("profiles")
    .select("email, display_name")
    .eq("id", userId)
    .maybeSingle();
  if (profileError) {
    console.warn("[collaboration] removal notification skipped after profile lookup failure", {
      projectId: context.project.id,
      userId,
    });
    return "failed";
  }
  if (!profile?.email) return "skipped";

  const displayName = profile.display_name?.trim() || profile.email;
  const result = await sendEmail({
    to: profile.email,
    subject: `Project access removed: ${context.project.name}`,
    text: `Hello ${displayName},\n\nYour access to "${context.project.name}" in Archestimator has been removed.\n\nIf this looks wrong, contact the project owner.\n\nThe Archestimator Team`,
    tags: [
      { name: "archestimator_surface", value: "project_collaboration" },
      { name: "collaboration_event", value: "member_removed" },
    ],
  });
  if (!result.ok) return "failed";
  return result.mocked ? "mocked" : "sent";
}

export async function removeProjectCollaborator({
  projectId,
  notify = false,
  userId,
}: {
  projectId: string;
  notify?: boolean;
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

  if (collaborationRoleRank(existingMember.role) >= managerRank) {
    const hasOtherManager = await hasOtherProjectManager(context, userId);
    if (!hasOtherManager) throw new Error("Every project needs at least one owner or admin.");
  }

  const { error } = await context.admin
    .from("project_members")
    .delete()
    .eq("project_id", context.project.id)
    .eq("user_id", userId);
  if (error) throw error;

  const { error: favoriteCleanupError } = await context.admin
    .from("project_favorites")
    .delete()
    .eq("project_id", context.project.id)
    .eq("user_id", userId);
  if (favoriteCleanupError) throw favoriteCleanupError;

  await recordCollaborationAuditEvent({
    context,
    eventType: "member_removed",
    metadata: {
      notification_requested: notify,
      previous_role: existingMember.role,
      target_user_id: userId,
    },
  });

  const notificationStatus = notify
    ? await sendCollaboratorRemovalNotification({ context, userId })
    : "skipped";

  revalidateCollaborationRoutes(context.project.id);
  if (notificationStatus === "sent") return { ok: true, message: "Project-specific access removed. Notification sent." };
  if (notificationStatus === "mocked") {
    return { ok: true, message: "Project-specific access removed. Notification not sent because email delivery is not configured." };
  }
  if (notificationStatus === "failed") {
    return { ok: true, message: "Project-specific access removed. Notification could not be sent." };
  }
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
  return { ok: true, message: inheritProjectAccess ? "Estimate now inherits project access." : "Estimate access is now restricted." };
}
