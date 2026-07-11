"use server";

import { revalidatePath } from "next/cache";
import { headers } from "next/headers";

import { resolveAuthOrigin as resolveAllowedAuthOrigin } from "@/lib/auth/redirects";
import { requireCurrentUserContext } from "@/lib/auth/session";
import {
  canAssignCollaborationRole,
  canMutateCollaborationTarget,
} from "@/lib/authz/collaboration-policy";
import {
  getCloudflareD1Database,
  type D1DatabaseLike,
  type D1PreparedStatementLike,
} from "@/lib/cloudflare/d1";
import { revokeCollaborationRoomSubject } from "@/lib/cloudflare/collaboration-room-revocation";
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
import { emitLogRecord } from "@/lib/observability/logger";

type CollaborationActionResult = {
  ok: boolean;
  message: string;
  affectedEstimateNames?: string[];
  invitePath?: string;
};

export type ProjectCollaboratorRemovalMode = "retain_sheet_grants" | "remove_all_direct_grants";

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

type InvitationCancellationRow = Pick<InvitationManagementRow, "estimate_id" | "lifecycle_state" | "project_id" | "revoked_at" | "scope"> & {
  id: string;
};

type InviteTokenAuditRow = {
  estimate_id: string | null;
  project_id: string;
};

type AccessSettingRow = {
  inherit_project_access: boolean | number | string | null;
};

type DirectEstimateGrantRow = AccessSettingRow & {
  estimate_id: string;
  estimate_name: string;
  role: string | null;
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

function assertProjectCollaboratorRemovalMode(value: string): asserts value is ProjectCollaboratorRemovalMode {
  if (value === "retain_sheet_grants" || value === "remove_all_direct_grants") return;
  throw new Error("Project removal mode is invalid.");
}

function collaborationRoleRank(role: CollaborationRole) {
  if (role === "owner") return 40;
  if (role === "admin") return managerRank;
  if (role === "editor") return 20;
  return 10;
}

function collaborationRoleForRank(rank: number): CollaborationRole | null {
  if (rank >= 40) return "owner";
  if (rank >= managerRank) return "admin";
  if (rank >= 20) return "editor";
  if (rank >= 10) return "viewer";
  return null;
}

function assertAssignableRole(actorRank: number, role: CollaborationRole) {
  const decision = canAssignCollaborationRole(collaborationRoleForRank(actorRank), role);
  if (decision.allowed) return;
  if (decision.reason === "actor_not_manager") throw new Error("Only owners and admins can manage access.");
  if (decision.reason === "owner_requires_transfer") throw new Error("Ownership transfer requires a dedicated flow.");
  throw new Error("Cannot assign a role at or above your own access level.");
}

function assertTargetRoleCanBeMutated(actorRank: number, targetRole: CollaborationRole) {
  const decision = canMutateCollaborationTarget(collaborationRoleForRank(actorRank), targetRole);
  if (decision.allowed) return;
  if (decision.reason === "actor_not_manager") throw new Error("Only owners and admins can manage access.");
  if (decision.reason === "owner_requires_transfer") throw new Error("Ownership changes require a dedicated flow.");
  throw new Error("Cannot modify a collaborator with equal or higher access.");
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

async function readProjectAccessContext(projectId: string, existingDb?: D1DatabaseLike): Promise<ProjectAccessContext> {
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

  return {
    actorRank,
    currentUserId: currentUser.userId,
    db,
    project,
  };
}

async function assertProjectAccessManager(projectId: string, existingDb?: D1DatabaseLike): Promise<ProjectAccessContext> {
  const context = await readProjectAccessContext(projectId, existingDb);
  if (context.actorRank < managerRank) throw new Error("Only project owners and admins can manage access.");
  return context;
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
  const projectContext = await readProjectAccessContext(projectId, existingDb);
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

async function assertInvitationAccessManager(
  invitation: Pick<InvitationManagementRow, "estimate_id" | "project_id" | "scope">,
  database: D1DatabaseLike,
) {
  return invitation.scope === "estimate" && invitation.estimate_id
    ? assertEstimateAccessManager(invitation.project_id, invitation.estimate_id, database)
    : assertProjectAccessManager(invitation.project_id, database);
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

async function readDirectEstimateGrants(context: ProjectAccessContext, userId: string) {
  const result = await context.db
    .prepare<DirectEstimateGrantRow>(
      `
        SELECT
          estimate_member.estimate_id,
          estimate.name AS estimate_name,
          estimate_member.role,
          COALESCE(access.inherit_project_access, 1) AS inherit_project_access
        FROM estimate_sheet_members estimate_member
        JOIN estimates estimate ON estimate.id = estimate_member.estimate_id
        LEFT JOIN estimate_sheet_access_settings access ON access.estimate_id = estimate_member.estimate_id
        WHERE estimate_member.project_id = ?
          AND estimate_member.user_id = ?
        ORDER BY estimate.name COLLATE NOCASE ASC, estimate_member.estimate_id ASC
      `,
    )
    .bind(context.project.id, userId)
    .all<DirectEstimateGrantRow>();
  return result.results ?? [];
}

async function assertProjectCascadeRemovalAllowed(
  context: ProjectAccessContext,
  userId: string,
  directEstimateGrants: DirectEstimateGrantRow[],
) {
  for (const grant of directEstimateGrants) {
    const isRestrictedSheetManager = !toD1Boolean(grant.inherit_project_access, true)
      && collaborationRoleRank(toCollaborationRole(grant.role)) >= managerRank;
    if (!isRestrictedSheetManager) continue;

    const replacement = await context.db
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
      .bind(grant.estimate_id, userId)
      .first<{ user_id: string }>();
    if (!replacement) {
      throw new Error(`Every restricted estimate needs at least one owner or admin. Keep access for ${grant.estimate_name}.`);
    }
  }
}

async function describeRemainingWorkspaceAccess(context: ProjectAccessContext, userId: string) {
  const membership = await context.db
    .prepare<RoleRow>(`SELECT role FROM workspace_members WHERE workspace_id = ? AND user_id = ? LIMIT 1`)
    .bind(context.project.workspace_id, userId)
    .first<RoleRow>();
  const workspaceRole = toCollaborationRole(membership?.role);
  return workspaceRole ? `Workspace ${workspaceRole} access remains.` : null;
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

async function describeRemainingInheritedEstimateAccess(context: EstimateAccessContext, userId: string) {
  if (!(await estimateInheritsProjectAccess(context))) return null;

  const [workspaceMembership, projectMembership] = await Promise.all([
    context.db
      .prepare<RoleRow>(`SELECT role FROM workspace_members WHERE workspace_id = ? AND user_id = ? LIMIT 1`)
      .bind(context.project.workspace_id, userId)
      .first<RoleRow>(),
    context.db
      .prepare<RoleRow>(`SELECT role FROM project_members WHERE project_id = ? AND user_id = ? LIMIT 1`)
      .bind(context.project.id, userId)
      .first<RoleRow>(),
  ]);
  const workspaceRole = toCollaborationRole(workspaceMembership?.role);
  const projectRole = toCollaborationRole(projectMembership?.role);
  if (!workspaceRole && !projectRole) return null;

  if (workspaceRole && (!projectRole || collaborationRoleRank(workspaceRole) >= collaborationRoleRank(projectRole))) {
    return `Workspace ${workspaceRole} access remains.`;
  }
  return `Project ${projectRole} access remains.`;
}

async function assertEstimateSheetRemovalAllowed(context: EstimateAccessContext, userId: string) {
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
  if (!existingMember) return null;

  assertTargetRoleCanBeMutated(context.estimateActorRank, toCollaborationRole(existingMember.role));

  const isRemovingSheetManager = collaborationRoleRank(toCollaborationRole(existingMember.role)) >= managerRank;
  if (isRemovingSheetManager && !(await estimateInheritsProjectAccess(context))) {
    const hasOtherManager = await hasOtherEstimateSheetManager(context, userId);
    if (!hasOtherManager) throw new Error("Every restricted estimate needs at least one owner or admin.");
  }

  return existingMember;
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
  const invitation = await context.db
    .prepare<{ id: string; expires_at: string }>(
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
        ON CONFLICT(project_id, email, scope, IFNULL(estimate_id, ''))
          WHERE lifecycle_state = 'pending' AND revoked_at IS NULL
        DO UPDATE SET
          role = excluded.role,
          invited_by = excluded.invited_by,
          expires_at = excluded.expires_at,
          updated_at = excluded.updated_at
        RETURNING id, expires_at
      `,
    )
    .bind(
      createId(),
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
    .first<{ id: string; expires_at: string }>();

  if (!invitation) throw new Error("Invitation could not be created.");
  return { id: invitation.id, expiresAt: invitation.expires_at };
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
          AND lifecycle_state = 'pending'
        LIMIT 1
      `,
    )
    .bind(invitationId)
    .first<InviteTokenAuditRow>();
  if (!invitation) throw new Error("Invitation is unavailable.");

  const tokenId = createId();
  const statements = [];
  if (revokeExisting) {
    statements.push(
      context.db
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
        .bind(timestamp, context.currentUserId, invitationId),
    );
  }

  statements.push(
    context.db
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
    ),

    context.db
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
      JSON.stringify({ delivery_method: deliveryMethod }),
      timestamp,
    ),
  );

  if (!context.db.batch) throw new Error("Invitation delivery intent requires transactional D1 support.");
  await context.db.batch(statements);

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
          AND i.lifecycle_state = 'pending'
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
      JSON.stringify({ delivery_method: deliveryMethod }),
      timestamp,
    )
    .run();
}

type CollaborationAuditEventType =
  | "collaboration_invite_email_delivery_failed"
  | "invite_email_attempted"
  | "member_added"
  | "role_changed"
  | "member_removed"
  | "estimate_access_inherited"
  | "estimate_access_restricted";

function prepareCollaborationAuditEvent({
  context,
  estimateId = null,
  eventType,
  invitationId = null,
  metadata,
  timestamp = nowIso(),
}: {
  context: ProjectAccessContext;
  estimateId?: string | null;
  eventType: CollaborationAuditEventType;
  invitationId?: string | null;
  metadata: Record<string, MetadataValue>;
  timestamp?: string;
}) {
  return context.db
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
      timestamp,
    );
}

async function recordCollaborationAuditEvent(args: Parameters<typeof prepareCollaborationAuditEvent>[0]) {
  await prepareCollaborationAuditEvent(args).run();
}

async function recordInviteEmailDeliveryFailure({
  context,
  error,
  estimateId = null,
  invitationId,
  scope,
}: {
  context: ProjectAccessContext;
  error: unknown;
  estimateId?: string | null;
  invitationId: string;
  scope: "estimate" | "project";
}) {
  const errorName = error instanceof Error ? error.name : "unknown";

  try {
    await recordCollaborationAuditEvent({
      context,
      estimateId,
      eventType: "collaboration_invite_email_delivery_failed",
      invitationId,
      metadata: {
        delivery_method: "email",
        error_name: errorName,
        scope,
      },
    });
  } catch (activityError) {
    emitLogRecord({
      level: "warn",
      event: "collaboration_invite_email_delivery_failure_activity_write_failed",
      message: "Collaboration invite email failure activity could not be recorded.",
      context: {
        activity_error_name: activityError instanceof Error ? activityError.name : "unknown",
        project_id: context.project.id,
        scope,
      },
    });
  }

  emitLogRecord({
    level: "warn",
    event: "collaboration_invite_email_delivery_failed",
    message: "Collaboration invite email could not be delivered.",
    context: {
      error_name: errorName,
      ...(estimateId ? { estimate_id: estimateId } : {}),
      project_id: context.project.id,
      scope,
    },
  });
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

function prepareProjectMemberUpsert(
  context: ProjectAccessContext,
  userId: string,
  role: CollaborationRole,
  timestamp = nowIso(),
) {
  return context.db
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
}

function prepareEstimateSheetMemberUpsert(
  context: EstimateAccessContext,
  userId: string,
  role: CollaborationRole,
  timestamp = nowIso(),
) {
  return context.db
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
}

async function persistAccessMutationWithAudit({
  audit,
  context,
  mutation,
}: {
  audit: D1PreparedStatementLike;
  context: ProjectAccessContext;
  mutation: D1PreparedStatementLike;
}) {
  if (!context.db.batch) throw new Error("Collaboration access changes require transactional D1 support.");
  await context.db.batch([mutation, audit]);
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
    await recordInviteEmailDeliveryFailure({
      context,
      error,
      invitationId: invitation.id,
      scope: "project",
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
    await recordInviteEmailDeliveryFailure({
      context,
      error,
      estimateId: context.estimate.id,
      invitationId: invitation.id,
      scope: "estimate",
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
    .prepare<Pick<InvitationManagementRow, "project_id" | "estimate_id" | "scope" | "expires_at" | "lifecycle_state" | "revoked_at">>(
      `
        SELECT project_id, estimate_id, scope, expires_at, lifecycle_state, revoked_at
        FROM collaboration_invitations
        WHERE id = ?
        LIMIT 1
      `,
    )
    .bind(invitationId)
    .first<Pick<InvitationManagementRow, "project_id" | "estimate_id" | "scope" | "expires_at" | "lifecycle_state" | "revoked_at">>();
  if (!invitation) throw new Error("Invitation was not found.");
  if (invitation.revoked_at || invitation.lifecycle_state !== "pending") {
    return { ok: false, message: "Only pending invitations can be copied." };
  }
  if (new Date(invitation.expires_at).getTime() <= Date.now()) {
    return { ok: false, message: "This invitation has expired. Create a new invite." };
  }

  const context = await assertInvitationAccessManager(invitation, db);
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

  const context = await assertInvitationAccessManager(invitation, db);
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
  await recordCollaborationAuditEvent({
    context,
    estimateId: invitation.estimate_id,
    eventType: "invite_email_attempted",
    invitationId,
    metadata: { delivery_method: "email", scope },
  });
  try {
    await sendCloudflareInviteEmail({
      email: invitation.email,
      inviteEntryUrl: inviteLink.inviteEntryUrl,
      projectName: context.project.name,
      projectId: context.project.id,
      role: toCollaborationRole(invitation.role),
      scope,
    });
  } catch (error) {
    await recordInviteEmailDeliveryFailure({
      context,
      error,
      estimateId: invitation.estimate_id,
      invitationId,
      scope,
    });
    revalidateCollaborationRoutes(context.project.id);
    return {
      ok: false,
      message: "Invite email could not be resent. Copy the invite link to share it manually.",
      invitePath: inviteLink.invitePath,
    };
  }
  await recordCollaborationInvitationDelivery({
    context,
    deliveryMethod: "email",
    invitationId,
    tokenId: inviteLink.tokenId,
  });
  revalidateCollaborationRoutes(context.project.id);
  return { ok: true, message: "Invite email resent.", invitePath: inviteLink.invitePath };
}

export async function revokeCollaborationInvitation({
  invitationId,
}: {
  invitationId: string;
}): Promise<CollaborationActionResult> {
  assertUuid(invitationId, "Invitation");
  const db = await getRequiredCollaborationD1Database();
  if (!db.batch) return { ok: false, message: "Invitation cancellation requires transactional D1 support." };

  const invitation = await db
    .prepare<InvitationCancellationRow>(
      `SELECT id, project_id, estimate_id, scope, lifecycle_state, revoked_at
       FROM collaboration_invitations
       WHERE id = ?
       LIMIT 1`,
    )
    .bind(invitationId)
    .first<InvitationCancellationRow>();
  if (!invitation) return { ok: false, message: "Invitation was not found." };
  if (invitation.revoked_at || invitation.lifecycle_state !== "pending") {
    return { ok: false, message: "Only pending invitations can be cancelled." };
  }

  const context = await assertInvitationAccessManager(invitation, db);
  const timestamp = nowIso();
  const batchResults = await db.batch([
    db.prepare(
      `UPDATE collaboration_invitations
       SET lifecycle_state = 'revoked', revoked_at = ?, updated_at = ?
       WHERE id = ? AND lifecycle_state = 'pending' AND revoked_at IS NULL`,
    ).bind(timestamp, timestamp, invitation.id),
    db.prepare(
      `UPDATE collaboration_invitation_tokens
       SET revoked_at = ?, revoked_by = ?
       WHERE invitation_id = ?
         AND used_at IS NULL
         AND revoked_at IS NULL
         AND EXISTS (
           SELECT 1 FROM collaboration_invitations
           WHERE id = ? AND lifecycle_state = 'revoked' AND revoked_at = ?
         )`,
    ).bind(timestamp, context.currentUserId, invitation.id, invitation.id, timestamp),
    db.prepare(
      `INSERT INTO collaboration_audit_events (
         id, invitation_id, project_id, estimate_id, actor_user_id, event_type, metadata_json, created_at
       )
       SELECT ?, id, project_id, estimate_id, ?, 'collaboration_invite_revoked', ?, ?
       FROM collaboration_invitations
       WHERE id = ? AND lifecycle_state = 'revoked' AND revoked_at = ?`,
    ).bind(
      createId(),
      context.currentUserId,
      JSON.stringify({ scope: invitation.scope }),
      timestamp,
      invitation.id,
      timestamp,
    ),
  ]);

  if ((batchResults[0]?.meta?.changes ?? 0) !== 1) {
    return { ok: false, message: "Invitation is no longer pending." };
  }
  revalidateCollaborationRoutes(context.project.id);
  return { ok: true, message: "Invitation cancelled." };
}

export async function addProjectCollaborator({
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
  if (userId === context.currentUserId) return { ok: false, message: "You cannot grant yourself direct project access." };
  if (!(await readProfileContactById(context.db, userId))) {
    return { ok: false, message: "The selected user is no longer available." };
  }

  const existingMember = await context.db
    .prepare<RoleRow>(
      `SELECT role FROM project_members WHERE project_id = ? AND user_id = ? LIMIT 1`,
    )
    .bind(context.project.id, userId)
    .first<RoleRow>();
  if (existingMember) return { ok: false, message: "This user is already a project member. Use the role-change command." };

  const timestamp = nowIso();
  await persistAccessMutationWithAudit({
    context,
    mutation: prepareProjectMemberUpsert(context, userId, role, timestamp),
    audit: prepareCollaborationAuditEvent({
      context,
      eventType: "member_added",
      metadata: { role, scope: "project", target_user_id: userId },
      timestamp,
    }),
  });
  revalidateCollaborationRoutes(context.project.id);
  return { ok: true, message: "Project member added." };
}

export async function addEstimateSheetCollaborator({
  projectId,
  estimateId,
  userId,
  role,
}: {
  projectId: string;
  estimateId: string;
  userId: string;
  role: CollaborationRole;
}): Promise<CollaborationActionResult> {
  assertUuid(userId, "User");
  const context = await assertEstimateAccessManager(projectId, estimateId);
  assertAssignableRole(context.estimateActorRank, role);
  if (userId === context.currentUserId) return { ok: false, message: "You cannot grant yourself direct estimate access." };
  if (!(await readProfileContactById(context.db, userId))) {
    return { ok: false, message: "The selected user is no longer available." };
  }

  const existingMember = await context.db
    .prepare<RoleRow>(
      `SELECT role FROM estimate_sheet_members WHERE estimate_id = ? AND user_id = ? LIMIT 1`,
    )
    .bind(context.estimate.id, userId)
    .first<RoleRow>();
  if (existingMember) return { ok: false, message: "This user already has direct estimate access. Use the role-change command." };

  const timestamp = nowIso();
  await persistAccessMutationWithAudit({
    context,
    mutation: prepareEstimateSheetMemberUpsert(context, userId, role, timestamp),
    audit: prepareCollaborationAuditEvent({
      context,
      estimateId: context.estimate.id,
      eventType: "member_added",
      metadata: { role, scope: "estimate", target_user_id: userId },
      timestamp,
    }),
  });
  revalidateCollaborationRoutes(context.project.id);
  return { ok: true, message: "Estimate member added." };
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

  if (!existingMember) return { ok: false, message: "This user is not a project member. Use the add-member command." };
  assertTargetRoleCanBeMutated(context.actorRank, toCollaborationRole(existingMember.role));

  if (
    collaborationRoleRank(toCollaborationRole(existingMember.role)) >= managerRank &&
    collaborationRoleRank(role) < managerRank
  ) {
    const hasOtherManager = await hasOtherProjectManager(context, userId);
    if (!hasOtherManager) throw new Error("Every project needs at least one owner or admin.");
  }

  const timestamp = nowIso();
  await persistAccessMutationWithAudit({
    context,
    mutation: prepareProjectMemberUpsert(context, userId, role, timestamp),
    audit: prepareCollaborationAuditEvent({
      context,
      eventType: "role_changed",
      metadata: {
        next_role: role,
        previous_role: existingMember.role,
        target_user_id: userId,
      },
      timestamp,
    }),
  });
  if (existingMember.role !== role) {
    await revokeCollaborationRoomSubject({ topic: `project:${context.project.id}`, subject: userId });
  }

  revalidateCollaborationRoutes(context.project.id);
  return { ok: true, message: "Role updated." };
}

export async function updateEstimateSheetCollaboratorRole({
  projectId,
  estimateId,
  userId,
  role,
}: {
  projectId: string;
  estimateId: string;
  userId: string;
  role: CollaborationRole;
}): Promise<CollaborationActionResult> {
  assertUuid(userId, "User");
  const context = await assertEstimateAccessManager(projectId, estimateId);
  assertAssignableRole(context.estimateActorRank, role);

  const existingMember = await context.db
    .prepare<RoleRow>(
      `SELECT role FROM estimate_sheet_members WHERE estimate_id = ? AND user_id = ? LIMIT 1`,
    )
    .bind(context.estimate.id, userId)
    .first<RoleRow>();
  if (!existingMember) return { ok: false, message: "This user has no direct estimate access. Use the add-member command." };

  const previousRole = toCollaborationRole(existingMember.role);
  assertTargetRoleCanBeMutated(context.estimateActorRank, previousRole);
  if (
    collaborationRoleRank(previousRole) >= managerRank &&
    collaborationRoleRank(role) < managerRank &&
    !(await estimateInheritsProjectAccess(context)) &&
    !(await hasOtherEstimateSheetManager(context, userId))
  ) {
    return { ok: false, message: "Every restricted estimate needs at least one owner or admin." };
  }

  const timestamp = nowIso();
  await persistAccessMutationWithAudit({
    context,
    mutation: prepareEstimateSheetMemberUpsert(context, userId, role, timestamp),
    audit: prepareCollaborationAuditEvent({
      context,
      estimateId: context.estimate.id,
      eventType: "role_changed",
      metadata: {
        next_role: role,
        previous_role: existingMember.role,
        scope: "estimate",
        target_user_id: userId,
      },
      timestamp,
    }),
  });
  if (existingMember.role !== role) {
    await revokeCollaborationRoomSubject({ topic: `estimate:${context.estimate.id}`, subject: userId });
  }
  revalidateCollaborationRoutes(context.project.id);
  return { ok: true, message: "Estimate access role updated." };
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
  } catch (error) {
    emitLogRecord({
      level: "warn",
      event: "collaboration_removal_notification_profile_lookup_failed",
      message: "Collaboration removal notification profile lookup failed.",
      context: {
        error_name: error instanceof Error ? error.name : "unknown",
        project_id: context.project.id,
      },
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
  removalMode,
  userId,
}: {
  projectId: string;
  notify?: boolean;
  removalMode: ProjectCollaboratorRemovalMode;
  userId: string;
}): Promise<CollaborationActionResult> {
  assertUuid(userId, "User");
  assertProjectCollaboratorRemovalMode(removalMode);
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

  assertTargetRoleCanBeMutated(context.actorRank, toCollaborationRole(existingMember.role));

  if (collaborationRoleRank(toCollaborationRole(existingMember.role)) >= managerRank) {
    const hasOtherManager = await hasOtherProjectManager(context, userId);
    if (!hasOtherManager) throw new Error("Every project needs at least one owner or admin.");
  }

  const directEstimateGrants = await readDirectEstimateGrants(context, userId);
  if (removalMode === "remove_all_direct_grants") {
    await assertProjectCascadeRemovalAllowed(context, userId, directEstimateGrants);
  }

  if (!context.db.batch) throw new Error("Project removal requires transactional D1 support.");

  const timestamp = nowIso();
  const removalStatements = [
    context.db.prepare(
      `
        DELETE FROM project_members
        WHERE project_id = ?
          AND user_id = ?
      `,
    ).bind(context.project.id, userId),
    context.db.prepare(
      `
        DELETE FROM project_favorites
        WHERE project_id = ?
          AND user_id = ?
      `,
    ).bind(context.project.id, userId),
    prepareCollaborationAuditEvent({
      context,
      eventType: "member_removed",
      metadata: {
        notification_requested: notify,
        previous_role: existingMember.role,
        removal_mode: removalMode,
        removed_direct_estimate_grant_count: removalMode === "remove_all_direct_grants" ? directEstimateGrants.length : 0,
        target_user_id: userId,
      },
      timestamp,
    }),
  ];
  if (removalMode === "remove_all_direct_grants") {
    removalStatements.push(
      context.db.prepare(
        `
          DELETE FROM estimate_sheet_members
          WHERE project_id = ?
            AND user_id = ?
        `,
      ).bind(context.project.id, userId),
      ...directEstimateGrants.map((grant) => prepareCollaborationAuditEvent({
        context,
        estimateId: grant.estimate_id,
        eventType: "member_removed",
        metadata: {
          parent_scope: "project",
          previous_role: grant.role,
          scope: "estimate",
          target_user_id: userId,
        },
        timestamp,
      })),
    );
  }
  await context.db.batch(removalStatements);

  await Promise.all([
    revokeCollaborationRoomSubject({ topic: `project:${context.project.id}`, subject: userId }),
    ...(removalMode === "remove_all_direct_grants"
      ? directEstimateGrants.map((grant) => revokeCollaborationRoomSubject({ topic: `estimate:${grant.estimate_id}`, subject: userId }))
      : []),
  ]);

  const notificationStatus = notify
    ? await sendCollaboratorRemovalNotification({ context, userId })
    : "skipped";

  revalidateCollaborationRoutes(context.project.id);
  const retainedWorkspaceAccess = await describeRemainingWorkspaceAccess(context, userId);
  const removalSummary = removalMode === "remove_all_direct_grants"
    ? `Project-specific access and ${directEstimateGrants.length} direct estimate grant${directEstimateGrants.length === 1 ? "" : "s"} removed.`
    : `Project-specific access removed. ${directEstimateGrants.length} direct estimate grant${directEstimateGrants.length === 1 ? "" : "s"} retained.`;
  const messageWithWorkspaceAccess = retainedWorkspaceAccess ? `${removalSummary} ${retainedWorkspaceAccess}` : removalSummary;
  if (notificationStatus === "sent") return { ok: true, message: `${messageWithWorkspaceAccess} Notification sent.` };
  if (notificationStatus === "mocked") {
    return { ok: true, message: `${messageWithWorkspaceAccess} Notification not sent because email delivery is not configured.` };
  }
  if (notificationStatus === "failed") {
    return { ok: true, message: `${messageWithWorkspaceAccess} Notification could not be sent.` };
  }
  return { ok: true, message: messageWithWorkspaceAccess };
}

export async function previewProjectCollaboratorRemoval({
  projectId,
  userId,
}: {
  projectId: string;
  userId: string;
}): Promise<CollaborationActionResult> {
  assertUuid(userId, "User");
  const context = await assertProjectAccessManager(projectId);
  const existingMember = await context.db
    .prepare<RoleRow>(`SELECT role FROM project_members WHERE project_id = ? AND user_id = ? LIMIT 1`)
    .bind(context.project.id, userId)
    .first<RoleRow>();
  if (!existingMember) return { ok: false, message: "Project-specific access is already removed." };

  assertTargetRoleCanBeMutated(context.actorRank, toCollaborationRole(existingMember.role));
  const directEstimateGrants = await readDirectEstimateGrants(context, userId);
  return {
    ok: true,
    message: directEstimateGrants.length
      ? `This member has direct access to ${directEstimateGrants.length} estimate${directEstimateGrants.length === 1 ? "" : "s"}.`
      : "This member has no direct estimate access to retain or remove.",
    affectedEstimateNames: directEstimateGrants.map((grant) => grant.estimate_name),
  };
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
  const existingMember = await assertEstimateSheetRemovalAllowed(context, userId);
  if (!existingMember) return { ok: true, message: "Estimate-specific access already removed." };

  const timestamp = nowIso();
  await persistAccessMutationWithAudit({
    context,
    mutation: context.db.prepare(
      `
        DELETE FROM estimate_sheet_members
        WHERE estimate_id = ?
          AND user_id = ?
      `,
    ).bind(context.estimate.id, userId),
    audit: prepareCollaborationAuditEvent({
      context,
      estimateId: context.estimate.id,
      eventType: "member_removed",
      metadata: {
        previous_role: existingMember.role,
        scope: "estimate",
        target_user_id: userId,
      },
      timestamp,
    }),
  });

  await revokeCollaborationRoomSubject({ topic: `estimate:${context.estimate.id}`, subject: userId });

  revalidateCollaborationRoutes(context.project.id);
  const retainedAccess = await describeRemainingInheritedEstimateAccess(context, userId);
  return {
    ok: true,
    message: retainedAccess
      ? `Estimate-specific access removed. ${retainedAccess}`
      : "Estimate-specific access removed. No inherited project access remains.",
  };
}

export async function previewEstimateSheetCollaboratorRemoval({
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
  const existingMember = await assertEstimateSheetRemovalAllowed(context, userId);
  if (!existingMember) return { ok: false, message: "Estimate-specific access is already removed." };

  const retainedAccess = await describeRemainingInheritedEstimateAccess(context, userId);
  return {
    ok: true,
    message: retainedAccess
      ? `After removal, ${retainedAccess}`
      : "Removing this direct sheet grant will leave no inherited project or workspace access.",
  };
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
  const timestamp = nowIso();
  if (!context.db.batch) throw new Error("Estimate access changes require transactional D1 support.");
  const statements = [
    context.db.prepare(
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
    ).bind(
      context.estimate.id,
      context.project.id,
      inheritProjectAccess ? 1 : 0,
      context.currentUserId,
      timestamp,
      timestamp,
    ),
    prepareCollaborationAuditEvent({
      context,
      estimateId: context.estimate.id,
      eventType: inheritProjectAccess ? "estimate_access_inherited" : "estimate_access_restricted",
      metadata: { scope: "estimate" },
      timestamp,
    }),
  ];
  if (!inheritProjectAccess) {
    const directManagerRole = collaborationRoleForRank(context.estimateActorRank) ?? "admin";
    statements.unshift(prepareEstimateSheetMemberUpsert(context, context.currentUserId, directManagerRole, timestamp));
  }
  await context.db.batch(statements);

  revalidateCollaborationRoutes(context.project.id);
  return { ok: true, message: inheritProjectAccess ? "Estimate now inherits project access." : "Estimate access is now restricted." };
}
