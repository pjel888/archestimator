"use server";

import { revalidatePath } from "next/cache";
import { headers } from "next/headers";

import { resolveAuthOrigin as resolveAllowedAuthOrigin } from "@/lib/auth/redirects";
import { requireCurrentUserContext } from "@/lib/auth/session";
import { getCloudflareD1Database, type D1DatabaseLike } from "@/lib/cloudflare/d1";
import {
  buildInviteEntryUrl,
  checkInviteCreateRateLimit,
  checkInviteResendRateLimit,
  createInviteToken,
  isProjectInviteEntryEnabled,
} from "@/lib/collaboration/invite-entry";
import type { CollaborationRole } from "@/lib/collaboration/types";
import { readEmailDeliveryConfig, sendEmail } from "@/lib/email/transactional-email-client";
import { isUuid } from "@/lib/ids";

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
  currentUserId: string;
  db: D1DatabaseLike;
  project: ProjectRow;
};

type EstimateAccessContext = ProjectAccessContext & {
  estimate: EstimateRow;
  estimateActorRank: number;
};

type ProjectRow = {
  id: string;
  name: string;
  workspace_id: string;
};

type EstimateRow = {
  id: string;
  project_id: string;
};

type WorkspaceRole = "owner" | "admin" | "member" | "viewer";
type ProfileRole = "ceo" | "admin" | "member";

type RoleRow = {
  role: string | null;
};

type ProfileIdRow = {
  id: string;
};

type ProfileContactRow = {
  display_name: string | null;
  email: string | null;
};

type InvitationManagementRow = {
  email: string;
  estimate_id: string | null;
  expires_at: string;
  lifecycle_state: string;
  project_id: string;
  revoked_at: string | null;
  role: string;
  scope: string;
};

type InviteTokenAuditRow = {
  estimate_id: string | null;
  project_id: string;
};

type AccessSettingRow = {
  inherit_project_access: boolean | number | string | null;
};

type MetadataValue = string | number | boolean | null;

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

async function getRequiredCollaborationD1Database() {
  const db = await getCloudflareD1Database();
  if (!db) throw new Error("Collaboration D1 store is unavailable.");
  return db;
}

function createId() {
  return crypto.randomUUID();
}

function nowIso() {
  return new Date().toISOString();
}

function toD1Boolean(value: boolean | number | string | null | undefined, fallback = true) {
  if (value === null || value === undefined) return fallback;
  if (typeof value === "boolean") return value;
  if (typeof value === "number") return value !== 0;
  return value !== "0" && value.toLowerCase() !== "false";
}

function toCollaborationRole(value: string | null | undefined): CollaborationRole {
  if (value === "owner" || value === "admin" || value === "editor" || value === "viewer") return value;
  return "viewer";
}

function toWorkspaceRole(value: string | null | undefined): WorkspaceRole | null {
  if (value === "owner" || value === "admin" || value === "member" || value === "viewer") return value;
  return null;
}

function toProfileRole(value: string | null | undefined): ProfileRole {
  if (value === "ceo" || value === "admin") return value;
  return "member";
}

function workspaceRoleRank(role: string | null | undefined) {
  const normalized = toWorkspaceRole(role);
  if (normalized === "owner") return 40;
  if (normalized === "admin") return 30;
  if (normalized === "member") return 20;
  if (normalized === "viewer") return 10;
  return 0;
}

async function readProjectActorRank({
  db,
  project,
  currentUserId,
  platformRole,
}: {
  db: D1DatabaseLike;
  project: Pick<ProjectRow, "id" | "workspace_id">;
  currentUserId: string;
  platformRole: ProfileRole;
}) {
  if (platformRole === "ceo" || platformRole === "admin") return 100;

  const [workspaceMembership, projectMembership] = await Promise.all([
    db
      .prepare<RoleRow>(
        `
          SELECT role
          FROM workspace_members
          WHERE workspace_id = ?
            AND user_id = ?
          LIMIT 1
        `,
      )
      .bind(project.workspace_id, currentUserId)
      .first<RoleRow>(),
    db
      .prepare<RoleRow>(
        `
          SELECT role
          FROM project_members
          WHERE project_id = ?
            AND user_id = ?
          LIMIT 1
        `,
      )
      .bind(project.id, currentUserId)
      .first<RoleRow>(),
  ]);

  return Math.max(
    workspaceRoleRank(workspaceMembership?.role),
    collaborationRoleRank(toCollaborationRole(projectMembership?.role)),
  );
}

async function assertProjectAccessManager(projectId: string, existingDb?: D1DatabaseLike): Promise<ProjectAccessContext> {
  assertUuid(projectId, "Project");

  const currentUser = await requireCurrentUserContext();
  const db = existingDb ?? await getRequiredCollaborationD1Database();
  const project = await db
    .prepare<ProjectRow>(
      `
        SELECT id, name, workspace_id
        FROM projects
        WHERE id = ?
        LIMIT 1
      `,
    )
    .bind(projectId)
    .first<ProjectRow>();

  if (!project) throw new Error("Project was not found.");

  const actorRank = await readProjectActorRank({
    db,
    project,
    currentUserId: currentUser.userId,
    platformRole: toProfileRole(currentUser.role),
  });

  if (actorRank < managerRank) throw new Error("Only project owners and admins can manage access.");

  return {
    actorRank,
    currentUserId: currentUser.userId,
    db,
    project,
  };
}

async function readEstimateActorRank(context: ProjectAccessContext, estimateId: string) {
  const [settingsResult, sheetMembershipResult] = await Promise.all([
    context.db
      .prepare<AccessSettingRow>(
        `
          SELECT inherit_project_access
          FROM estimate_sheet_access_settings
          WHERE estimate_id = ?
          LIMIT 1
        `,
      )
      .bind(estimateId)
      .first<AccessSettingRow>(),
    context.db
      .prepare<RoleRow>(
        `
          SELECT role
          FROM estimate_sheet_members
          WHERE estimate_id = ?
            AND user_id = ?
          LIMIT 1
        `,
      )
      .bind(estimateId, context.currentUserId)
      .first<RoleRow>(),
  ]);

  const inheritsProjectAccess = toD1Boolean(settingsResult?.inherit_project_access, true);
  return Math.max(
    inheritsProjectAccess ? context.actorRank : 0,
    collaborationRoleRank(toCollaborationRole(sheetMembershipResult?.role)),
  );
}

async function assertEstimateAccessManager(
  projectId: string,
  estimateId: string,
  existingDb?: D1DatabaseLike,
): Promise<EstimateAccessContext> {
  assertUuid(estimateId, "Estimate");
  const projectContext = await assertProjectAccessManager(projectId, existingDb);
  const estimate = await projectContext.db
    .prepare<EstimateRow>(
      `
        SELECT id, project_id
        FROM estimates
        WHERE id = ?
          AND project_id = ?
        LIMIT 1
      `,
    )
    .bind(estimateId, projectContext.project.id)
    .first<EstimateRow>();

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
    context.db
      .prepare<{ user_id: string }>(
        `
          SELECT user_id
          FROM workspace_members
          WHERE workspace_id = ?
            AND user_id <> ?
            AND role IN ('owner', 'admin')
          LIMIT 1
        `,
      )
      .bind(context.project.workspace_id, targetUserId)
      .first<{ user_id: string }>(),
    context.db
      .prepare<{ user_id: string }>(
        `
          SELECT user_id
          FROM project_members
          WHERE project_id = ?
            AND user_id <> ?
            AND role IN ('owner', 'admin')
          LIMIT 1
        `,
      )
      .bind(context.project.id, targetUserId)
      .first<{ user_id: string }>(),
  ]);
  return Boolean(workspaceManagers || projectManagers);
}

async function hasOtherEstimateSheetManager(context: EstimateAccessContext, targetUserId: string) {
  const row = await context.db
    .prepare<{ user_id: string }>(
      `
        SELECT user_id
        FROM estimate_sheet_members
        WHERE estimate_id = ?
          AND user_id <> ?
          AND role IN ('owner', 'admin')
        LIMIT 1
      `,
    )
    .bind(context.estimate.id, targetUserId)
    .first<{ user_id: string }>();

  return Boolean(row);
}

async function estimateInheritsProjectAccess(context: EstimateAccessContext) {
  const row = await context.db
    .prepare<AccessSettingRow>(
      `
        SELECT inherit_project_access
        FROM estimate_sheet_access_settings
        WHERE estimate_id = ?
        LIMIT 1
      `,
    )
    .bind(context.estimate.id)
    .first<AccessSettingRow>();

  return toD1Boolean(row?.inherit_project_access, true);
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
  const timestamp = nowIso();
  const existing = await context.db
    .prepare<{ id: string }>(
      `
        SELECT id
        FROM collaboration_invitations
        WHERE project_id = ?
          AND email = ?
          AND scope = ?
          AND lifecycle_state = 'pending'
          AND revoked_at IS NULL
          AND (
            (? IS NULL AND estimate_id IS NULL)
            OR estimate_id = ?
          )
        LIMIT 1
      `,
    )
    .bind(context.project.id, email, scope, estimateId, estimateId)
    .first<{ id: string }>();

  if (existing) {
    await context.db
      .prepare(
        `
          UPDATE collaboration_invitations
          SET role = ?,
              invited_by = ?,
              expires_at = ?,
              lifecycle_state = 'pending',
              accepted_at = NULL,
              accepted_via = NULL,
              invited_user_id = NULL,
              direct_granted_at = NULL,
              direct_granted_user_id = NULL,
              updated_at = ?
          WHERE id = ?
        `,
      )
      .bind(role, context.currentUserId, expiresAt, timestamp, existing.id)
      .run();
    return { id: existing.id, expiresAt };
  }

  const id = createId();
  await context.db
    .prepare(
      `
        INSERT INTO collaboration_invitations (
          id,
          workspace_id,
          project_id,
          estimate_id,
          scope,
          email,
          role,
          invited_by,
          expires_at,
          lifecycle_state,
          created_at,
          updated_at
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending', ?, ?)
      `,
    )
    .bind(
      id,
      context.project.workspace_id,
      context.project.id,
      estimateId,
      scope,
      email,
      role,
      context.currentUserId,
      expiresAt,
      timestamp,
      timestamp,
    )
    .run();

  return { id, expiresAt };
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
  context,
  invitationId,
  expiresAt,
  deliveryMethod,
  revokeExisting = true,
}: {
  context: ProjectAccessContext;
  invitationId: string;
  expiresAt: string;
  deliveryMethod: "email" | "copy_url";
  revokeExisting?: boolean;
}) {
  const inviteToken = createInviteToken();
  const timestamp = nowIso();
  const invitation = await context.db
    .prepare<InviteTokenAuditRow>(
      `
        SELECT project_id, estimate_id
        FROM collaboration_invitations
        WHERE id = ?
          AND lifecycle_state IN ('pending', 'direct_granted_existing_user')
        LIMIT 1
      `,
    )
    .bind(invitationId)
    .first<InviteTokenAuditRow>();
  if (!invitation) throw new Error("Invitation is unavailable.");

  if (revokeExisting) {
    await context.db
      .prepare(
        `
          UPDATE collaboration_invitation_tokens
          SET revoked_at = ?,
              revoked_by = ?
          WHERE invitation_id = ?
            AND used_at IS NULL
            AND revoked_at IS NULL
        `,
      )
      .bind(timestamp, context.currentUserId, invitationId)
      .run();
  }

  const tokenId = createId();
  await context.db
    .prepare(
      `
        INSERT INTO collaboration_invitation_tokens (
          id,
          invitation_id,
          token_hash,
          token_hint,
          delivery_method,
          created_by,
          created_at,
          expires_at
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `,
    )
    .bind(
      tokenId,
      invitationId,
      inviteToken.tokenHash,
      inviteToken.tokenHint,
      deliveryMethod,
      context.currentUserId,
      timestamp,
      expiresAt,
    )
    .run();

  await context.db
    .prepare(
      `
        INSERT INTO collaboration_audit_events (
          id,
          invitation_id,
          project_id,
          estimate_id,
          actor_user_id,
          event_type,
          metadata_json,
          created_at
        )
        VALUES (?, ?, ?, ?, ?, 'collaboration_invite_token_issued', ?, ?)
      `,
    )
    .bind(
      createId(),
      invitationId,
      invitation.project_id,
      invitation.estimate_id,
      context.currentUserId,
      JSON.stringify({ delivery_method: deliveryMethod, token_hint: inviteToken.tokenHint }),
      timestamp,
    )
    .run();

  const invitePath = `/invite/${encodeURIComponent(inviteToken.rawToken)}`;
  const origin = await resolveInviteOrigin();
  const inviteEntryUrl = origin ? buildInviteEntryUrl(origin, inviteToken.rawToken) : invitePath;
  return {
    inviteEntryUrl,
    invitePath,
    tokenId,
  };
}

async function sendCloudflareInviteEmail({
  email,
  inviteEntryUrl,
  projectName,
  projectId,
  role,
  scope,
}: {
  email: string;
  inviteEntryUrl?: string;
  projectName: string;
  projectId: string;
  role: CollaborationRole;
  scope: "project" | "estimate";
}) {
  const inviteUrl = inviteEntryUrl ?? (await buildProjectRedirectUrl(projectId));
  const scopeLabel = scope === "estimate" ? "estimate sheet" : "project";
  const result = await sendEmail({
    to: email,
    subject: `You're invited to ${projectName} on Archestimator`,
    text: `You've been invited as ${role} on the ${scopeLabel} "${projectName}".\n\nOpen your invitation:\n${inviteUrl ?? "Sign in to Archestimator to view pending invitations."}\n\nThe Archestimator Team`,
    html: inviteUrl
      ? `<p>You've been invited as <strong>${role}</strong> on the ${scopeLabel} <strong>${projectName}</strong>.</p><p><a href="${inviteUrl}">Open your invitation</a></p><p>The Archestimator Team</p>`
      : undefined,
    tags: [
      { name: "archestimator_surface", value: "project_collaboration" },
      { name: "collaboration_event", value: "invite_email" },
    ],
  });
  if (!result.ok) throw new Error(result.error);
}

async function recordCollaborationInvitationDelivery({
  context,
  deliveryMethod,
  invitationId,
  tokenId,
}: {
  context: ProjectAccessContext;
  deliveryMethod: "email" | "copy_url";
  invitationId: string;
  tokenId?: string | null;
}) {
  if (!tokenId) return;

  const timestamp = nowIso();
  const row = await context.db
    .prepare<InviteTokenAuditRow>(
      `
        SELECT i.project_id, i.estimate_id
        FROM collaboration_invitations i
        JOIN collaboration_invitation_tokens t ON t.invitation_id = i.id
        WHERE i.id = ?
          AND t.id = ?
          AND i.lifecycle_state IN ('pending', 'direct_granted_existing_user')
          AND t.used_at IS NULL
          AND t.revoked_at IS NULL
          AND t.expires_at > ?
        LIMIT 1
      `,
    )
    .bind(invitationId, tokenId, timestamp)
    .first<InviteTokenAuditRow>();
  if (!row) throw new Error("Invite token is unavailable.");

  await context.db
    .prepare(
      `
        INSERT INTO collaboration_audit_events (
          id,
          invitation_id,
          project_id,
          estimate_id,
          actor_user_id,
          event_type,
          metadata_json,
          created_at
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `,
    )
    .bind(
      createId(),
      invitationId,
      row.project_id,
      row.estimate_id,
      context.currentUserId,
      deliveryMethod === "copy_url" ? "collaboration_invite_link_copied" : "collaboration_invite_email_sent",
      JSON.stringify({ delivery_method: deliveryMethod, token_id: tokenId }),
      timestamp,
    )
    .run();
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
  metadata: Record<string, MetadataValue>;
}) {
  try {
    await context.db
      .prepare(
        `
          INSERT INTO collaboration_audit_events (
            id,
            invitation_id,
            project_id,
            estimate_id,
            actor_user_id,
            event_type,
            metadata_json,
            created_at
          )
          VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `,
      )
      .bind(
        createId(),
        invitationId,
        context.project.id,
        estimateId,
        context.currentUserId,
        eventType,
        JSON.stringify(metadata),
        nowIso(),
      )
      .run();
  } catch {
    console.warn("[collaboration] audit event skipped", {
      eventType,
      projectId: context.project.id,
    });
  }
}

async function readProfileIdByEmail(db: D1DatabaseLike, email: string) {
  return db
    .prepare<ProfileIdRow>(
      `
        SELECT id
        FROM profiles
        WHERE email = ?
        LIMIT 1
      `,
    )
    .bind(email)
    .first<ProfileIdRow>();
}

async function readProfileContactById(db: D1DatabaseLike, userId: string) {
  return db
    .prepare<ProfileContactRow>(
      `
        SELECT email, display_name
        FROM profiles
        WHERE id = ?
        LIMIT 1
      `,
    )
    .bind(userId)
    .first<ProfileContactRow>();
}

async function upsertProjectMemberInD1(context: ProjectAccessContext, userId: string, role: CollaborationRole, timestamp = nowIso()) {
  await context.db
    .prepare(
      `
        INSERT INTO project_members (
          project_id,
          workspace_id,
          user_id,
          role,
          added_by,
          created_at,
          updated_at
        )
        VALUES (?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(project_id, user_id) DO UPDATE SET
          role = excluded.role,
          added_by = excluded.added_by,
          updated_at = excluded.updated_at
      `,
    )
    .bind(
      context.project.id,
      context.project.workspace_id,
      userId,
      role,
      context.currentUserId,
      timestamp,
      timestamp,
    )
    .run();
}

async function upsertEstimateSheetMemberInD1(
  context: EstimateAccessContext,
  userId: string,
  role: CollaborationRole,
  timestamp = nowIso(),
) {
  await context.db
    .prepare(
      `
        INSERT INTO estimate_sheet_members (
          estimate_id,
          project_id,
          user_id,
          role,
          added_by,
          created_at,
          updated_at
        )
        VALUES (?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(estimate_id, user_id) DO UPDATE SET
          role = excluded.role,
          added_by = excluded.added_by,
          updated_at = excluded.updated_at
      `,
    )
    .bind(
      context.estimate.id,
      context.project.id,
      userId,
      role,
      context.currentUserId,
      timestamp,
      timestamp,
    )
    .run();
}

async function markDirectGrantedInvitationInD1({
  context,
  directGrantedAt,
  email,
  estimateId,
  scope,
  userId,
}: {
  context: ProjectAccessContext;
  directGrantedAt: string;
  email: string;
  estimateId: string | null;
  scope: "project" | "estimate";
  userId: string;
}) {
  await context.db
    .prepare(
      `
        UPDATE collaboration_invitations
        SET accepted_at = ?,
            direct_granted_at = ?,
            direct_granted_user_id = ?,
            invited_user_id = ?,
            accepted_via = 'manager_direct_grant',
            lifecycle_state = 'direct_granted_existing_user',
            updated_at = ?
        WHERE project_id = ?
          AND email = ?
          AND scope = ?
          AND lifecycle_state = 'pending'
          AND (
            (? IS NULL AND estimate_id IS NULL)
            OR estimate_id = ?
          )
      `,
    )
    .bind(
      directGrantedAt,
      directGrantedAt,
      userId,
      userId,
      directGrantedAt,
      context.project.id,
      email,
      scope,
      estimateId,
      estimateId,
    )
    .run();
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
      : "Teamspace invite delivery is disabled until Cloudflare Email sender settings are configured. Send beta invites manually outside the app.";
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
  const profile = await readProfileIdByEmail(context.db, normalizedEmail);

  let invitation: Awaited<ReturnType<typeof upsertInvitation>> | null = null;
  let inviteLink: Awaited<ReturnType<typeof issueInviteEntryLink>> | null = null;
  if (inviteEntryEnabled) {
    invitation = await upsertInvitation({ context, email: normalizedEmail, estimateId: null, role, scope: "project" });
    inviteLink = await issueInviteEntryLink({
      context,
      invitationId: invitation.id,
      expiresAt: invitation.expiresAt,
      deliveryMethod: "email",
    });
  }

  if (profile) {
    const directGrantedAt = nowIso();
    await upsertProjectMemberInD1(context, profile.id, role, directGrantedAt);
    await markDirectGrantedInvitationInD1({
      context,
      directGrantedAt,
      email: normalizedEmail,
      estimateId: null,
      scope: "project",
      userId: profile.id,
    });

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
    await sendCloudflareInviteEmail({
      email: normalizedEmail,
      inviteEntryUrl: inviteLink.inviteEntryUrl,
      projectName: context.project.name,
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
    context,
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
  const profile = await readProfileIdByEmail(context.db, normalizedEmail);

  let invitation: Awaited<ReturnType<typeof upsertInvitation>> | null = null;
  let inviteLink: Awaited<ReturnType<typeof issueInviteEntryLink>> | null = null;
  if (inviteEntryEnabled) {
    invitation = await upsertInvitation({ context, email: normalizedEmail, estimateId: context.estimate.id, role, scope: "estimate" });
    inviteLink = await issueInviteEntryLink({
      context,
      invitationId: invitation.id,
      expiresAt: invitation.expiresAt,
      deliveryMethod: "email",
    });
  }

  if (profile) {
    const directGrantedAt = nowIso();
    await upsertEstimateSheetMemberInD1(context, profile.id, role, directGrantedAt);
    await markDirectGrantedInvitationInD1({
      context,
      directGrantedAt,
      email: normalizedEmail,
      estimateId: context.estimate.id,
      scope: "estimate",
      userId: profile.id,
    });

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
    await sendCloudflareInviteEmail({
      email: normalizedEmail,
      inviteEntryUrl: inviteLink.inviteEntryUrl,
      projectName: context.project.name,
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
    context,
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
  const db = await getRequiredCollaborationD1Database();
  const invitation = await db
    .prepare<Pick<InvitationManagementRow, "project_id" | "expires_at">>(
      `
        SELECT project_id, expires_at
        FROM collaboration_invitations
        WHERE id = ?
        LIMIT 1
      `,
    )
    .bind(invitationId)
    .first<Pick<InvitationManagementRow, "project_id" | "expires_at">>();
  if (!invitation) throw new Error("Invitation was not found.");

  const context = await assertProjectAccessManager(invitation.project_id, db);
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
    context,
    invitationId,
    expiresAt: invitation.expires_at,
    deliveryMethod: "copy_url",
  });
  await recordCollaborationInvitationDelivery({
    context,
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
  const db = await getRequiredCollaborationD1Database();
  const invitation = await db
    .prepare<InvitationManagementRow>(
      `
        SELECT project_id, estimate_id, email, role, scope, expires_at, lifecycle_state, revoked_at
        FROM collaboration_invitations
        WHERE id = ?
        LIMIT 1
      `,
    )
    .bind(invitationId)
    .first<InvitationManagementRow>();
  if (!invitation) throw new Error("Invitation was not found.");
  if (invitation.revoked_at || invitation.lifecycle_state !== "pending") {
    return { ok: false, message: "Only pending invitations can be resent." };
  }
  if (new Date(invitation.expires_at).getTime() <= Date.now()) {
    return { ok: false, message: "This invitation has expired. Create a new invite." };
  }

  const context = await assertProjectAccessManager(invitation.project_id, db);
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
    context,
    invitationId,
    expiresAt: invitation.expires_at,
    deliveryMethod: "email",
  });
  const scope = invitation.scope === "estimate" ? "estimate" : "project";
  await sendCloudflareInviteEmail({
    email: invitation.email,
    inviteEntryUrl: inviteLink.inviteEntryUrl,
    projectName: context.project.name,
    projectId: context.project.id,
    role: toCollaborationRole(invitation.role),
    scope,
  });
  await recordCollaborationInvitationDelivery({
    context,
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

  const existingMember = await context.db
    .prepare<RoleRow>(
      `
        SELECT role
        FROM project_members
        WHERE project_id = ?
          AND user_id = ?
        LIMIT 1
      `,
    )
    .bind(context.project.id, userId)
    .first<RoleRow>();

  if (
    existingMember &&
    collaborationRoleRank(toCollaborationRole(existingMember.role)) >= managerRank &&
    collaborationRoleRank(role) < managerRank
  ) {
    const hasOtherManager = await hasOtherProjectManager(context, userId);
    if (!hasOtherManager) throw new Error("Every project needs at least one owner or admin.");
  }

  await upsertProjectMemberInD1(context, userId, role);

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
  let profile: ProfileContactRow | null = null;
  try {
    profile = await readProfileContactById(context.db, userId);
  } catch {
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

  const existingMember = await context.db
    .prepare<RoleRow>(
      `
        SELECT role
        FROM project_members
        WHERE project_id = ?
          AND user_id = ?
        LIMIT 1
      `,
    )
    .bind(context.project.id, userId)
    .first<RoleRow>();
  if (!existingMember) return { ok: true, message: "Project-specific access already removed." };

  if (collaborationRoleRank(toCollaborationRole(existingMember.role)) >= managerRank) {
    const hasOtherManager = await hasOtherProjectManager(context, userId);
    if (!hasOtherManager) throw new Error("Every project needs at least one owner or admin.");
  }

  await context.db
    .prepare(
      `
        DELETE FROM project_members
        WHERE project_id = ?
          AND user_id = ?
      `,
    )
    .bind(context.project.id, userId)
    .run();

  await context.db
    .prepare(
      `
        DELETE FROM project_favorites
        WHERE project_id = ?
          AND user_id = ?
      `,
    )
    .bind(context.project.id, userId)
    .run();

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

export async function removeEstimateSheetCollaborator({
  projectId,
  estimateId,
  userId,
}: {
  projectId: string;
  estimateId: string;
  userId: string;
}): Promise<CollaborationActionResult> {
  assertUuid(userId, "User");
  const context = await assertEstimateAccessManager(projectId, estimateId);

  const existingMember = await context.db
    .prepare<RoleRow>(
      `
        SELECT role
        FROM estimate_sheet_members
        WHERE estimate_id = ?
          AND user_id = ?
        LIMIT 1
      `,
    )
    .bind(context.estimate.id, userId)
    .first<RoleRow>();
  if (!existingMember) return { ok: true, message: "Estimate-specific access already removed." };

  const isRemovingSheetManager = collaborationRoleRank(toCollaborationRole(existingMember.role)) >= managerRank;
  if (isRemovingSheetManager && !(await estimateInheritsProjectAccess(context))) {
    const hasOtherManager = await hasOtherEstimateSheetManager(context, userId);
    if (!hasOtherManager) throw new Error("Every restricted estimate needs at least one owner or admin.");
  }

  await context.db
    .prepare(
      `
        DELETE FROM estimate_sheet_members
        WHERE estimate_id = ?
          AND user_id = ?
      `,
    )
    .bind(context.estimate.id, userId)
    .run();

  await recordCollaborationAuditEvent({
    context,
    estimateId: context.estimate.id,
    eventType: "member_removed",
    metadata: {
      previous_role: existingMember.role,
      scope: "estimate",
      target_user_id: userId,
    },
  });

  revalidateCollaborationRoutes(context.project.id);
  return { ok: true, message: "Estimate-specific access removed." };
}

async function upsertSheetOwnerBeforeRestricting(context: EstimateAccessContext) {
  await upsertEstimateSheetMemberInD1(context, context.currentUserId, "owner");
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

  const timestamp = nowIso();
  await context.db
    .prepare(
      `
        INSERT INTO estimate_sheet_access_settings (
          estimate_id,
          project_id,
          inherit_project_access,
          updated_by,
          created_at,
          updated_at
        )
        VALUES (?, ?, ?, ?, ?, ?)
        ON CONFLICT(estimate_id) DO UPDATE SET
          inherit_project_access = excluded.inherit_project_access,
          updated_by = excluded.updated_by,
          updated_at = excluded.updated_at
      `,
    )
    .bind(
      context.estimate.id,
      context.project.id,
      inheritProjectAccess ? 1 : 0,
      context.currentUserId,
      timestamp,
      timestamp,
    )
    .run();

  revalidateCollaborationRoutes(context.project.id);
  return { ok: true, message: inheritProjectAccess ? "Estimate now inherits project access." : "Estimate access is now restricted." };
}
