"use server";

import { randomUUID } from "node:crypto";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { recordAccountSecurityEvent } from "@/lib/auth/account-audit";
import { readFirstAccountWorkspaceMembership } from "@/lib/auth/account-membership";
import {
  getUserOnboardingProfileFromD1,
  getWorkspaceAccountSettingsFromD1,
  upsertUserOnboardingProfileInD1,
  upsertWorkspaceAccountSettingsInD1,
} from "@/lib/auth/account-settings-d1-store";
import {
  canManageWorkspaceAccountSettings,
  parseOnboardingSubmission,
  parseProfileSettingsSubmission,
  parseWorkspaceSettingsSubmission,
  type ProfileSettingsPayload,
  type WorkspaceSettingsPayload,
} from "@/lib/auth/account-data";
import { DEFAULT_AUTH_DESTINATION, sanitizeNextPath } from "@/lib/auth/redirects";
import { requireCurrentUserContext } from "@/lib/auth/session";
import { getCloudflareD1Database, type D1DatabaseLike, type D1Value } from "@/lib/cloudflare/d1";

type WorkspaceRole = "owner" | "admin" | "member" | "viewer";

type WorkspaceMembershipRow = {
  role: string | null;
  workspace_id: string;
};

type WorkspaceNameRow = {
  name: string | null;
};

export type AccountSetupState = {
  profile: ProfileSettingsPayload | null;
  workspace: WorkspaceSettingsPayload | null;
  workspaceId: string | null;
  workspaceRole: WorkspaceRole | null;
  invitedCollaborator: boolean;
  canManageWorkspace: boolean;
};

async function completeOnboarding(formData: FormData) {
  const next = sanitizeNextPath(formData.get("next"));
  const context = await requireCurrentUserContext();
  const database = await requireAccountActionsD1Database();
  const accountMembership = await readFirstAccountWorkspaceMembership(context.userId);
  const invitedCollaborator = !context.profile.default_workspace_id && Boolean(accountMembership);
  const parsed = parseOnboardingSubmission(formData, { invitedCollaborator });

  if (!parsed.ok) {
    redirect(onboardingErrorUrl("missing_fields", next));
  }

  await saveProfileSettings(database, context.userId, parsed.profile, true);

  if (parsed.workspace) {
    const workspaceId = await resolveWritableWorkspaceId(
      database,
      context.userId,
      context.profile.default_workspace_id,
      parsed.workspace.organization_name,
    );

    await saveWorkspaceSettings(database, workspaceId, parsed.workspace);

    await updateDefaultWorkspaceId(database, context.userId, workspaceId);

    await recordAccountSecurityEvent({
      eventType: "onboarding_completed",
      userId: context.userId,
      workspaceId,
      metadata: { path: "self_serve_workspace" },
    });
  } else {
    if (accountMembership?.workspaceId) {
      await updateDefaultWorkspaceId(database, context.userId, accountMembership.workspaceId);
    }

    await recordAccountSecurityEvent({
      eventType: "onboarding_completed",
      userId: context.userId,
      workspaceId: accountMembership?.workspaceId ?? null,
      metadata: { path: "invited_collaborator" },
    });
  }

  revalidatePath("/workshop");
  revalidatePath("/workshop/settings");
  // react-doctor-disable-next-line react-doctor/clickjacking-redirect-risk -- `next` is constrained by sanitizeNextPath to an internal path, with auth callback and unsafe nested next values rejected.
  redirect(next);
}

export async function updateProfileSettings(formData: FormData) {
  const parsed = parseProfileSettingsSubmission(formData);

  if (!parsed.ok) {
    redirect("/workshop/settings/profile?error=missing_fields");
  }

  const context = await requireCurrentUserContext();
  const database = await requireAccountActionsD1Database();

  await saveProfileSettings(database, context.userId, parsed.profile, false);
  await recordAccountSecurityEvent({
    eventType: "profile_settings_updated",
    userId: context.userId,
  });

  revalidatePath("/workshop/settings/profile");
  redirect("/workshop/settings/profile?saved=1");
}

export async function updateWorkspaceSettings(formData: FormData) {
  const parsed = parseWorkspaceSettingsSubmission(formData);

  if (!parsed.ok) {
    redirect("/workshop/settings/workspace?error=missing_fields");
  }

  const context = await requireCurrentUserContext();
  const database = await requireAccountActionsD1Database();
  const workspaceIdValue = formData.get("workspace_id");
  const workspaceId = typeof workspaceIdValue === "string" ? workspaceIdValue.trim() : "";
  const targetWorkspaceId = workspaceId || context.profile.default_workspace_id;

  if (!targetWorkspaceId) {
    redirect("/workshop/settings/workspace?error=no_workspace");
  }

  const role = await getWorkspaceRole(database, targetWorkspaceId, context.userId);
  if (!canManageWorkspaceAccountSettings(role)) {
    redirect("/workshop/settings/workspace?error=forbidden");
  }

  await saveWorkspaceSettings(database, targetWorkspaceId, parsed.workspace);
  await recordAccountSecurityEvent({
    eventType: "workspace_settings_updated",
    userId: context.userId,
    workspaceId: targetWorkspaceId,
  });

  revalidatePath("/workshop/settings/workspace");
  redirect("/workshop/settings/workspace?saved=1");
}

export async function getAccountSetupState(): Promise<AccountSetupState> {
  const context = await requireCurrentUserContext();
  const database = await requireAccountActionsD1Database();
  const [profile, accountMembership] = await Promise.all([
    getUserOnboardingProfileFromD1(database, context.userId),
    readFirstAccountWorkspaceMembership(context.userId),
  ]);

  const workspaceId = context.profile.default_workspace_id ?? accountMembership?.workspaceId ?? null;
  const workspaceRole = workspaceId
    ? await getWorkspaceRole(database, workspaceId, context.userId)
    : null;
  const workspace = workspaceId ? await getWorkspaceSettings(database, workspaceId) : null;

  return {
    profile: profile
      ? profile
      : {
          display_name: context.displayName,
          user_category: "architect",
          country_region: "",
          primary_use: null,
          student_educator_detail: null,
          marketing_consent_at: null,
        },
    workspace,
    workspaceId,
    workspaceRole,
    invitedCollaborator: !context.profile.default_workspace_id && Boolean(accountMembership),
    canManageWorkspace: canManageWorkspaceAccountSettings(workspaceRole),
  };
}

async function saveProfileSettings(
  database: D1DatabaseLike,
  userId: string,
  profile: ProfileSettingsPayload,
  completed: boolean,
) {
  await Promise.all([
    run(
      database,
      `UPDATE profiles
       SET display_name = ?, updated_at = ?
       WHERE id = ?`,
      [profile.display_name, nowIso(), userId],
    ),
    upsertUserOnboardingProfileInD1(database, { completed, profile, userId }),
  ]);
}

async function saveWorkspaceSettings(
  database: D1DatabaseLike,
  workspaceId: string,
  workspace: WorkspaceSettingsPayload,
) {
  await Promise.all([
    run(
      database,
      `UPDATE workspaces
       SET name = ?, updated_at = ?
       WHERE id = ?`,
      [workspace.organization_name, nowIso(), workspaceId],
    ),
    upsertWorkspaceAccountSettingsInD1(database, { workspace, workspaceId }),
  ]);
}

async function resolveWritableWorkspaceId(
  database: D1DatabaseLike,
  userId: string,
  defaultWorkspaceId: string | null,
  organizationName: string,
) {
  if (defaultWorkspaceId) return defaultWorkspaceId;

  const membership = await first<WorkspaceMembershipRow>(
    database,
    `SELECT workspace_id, role
     FROM workspace_members
     WHERE user_id = ?
     ORDER BY created_at ASC
     LIMIT 1`,
    [userId],
  );

  if (membership?.workspace_id && canManageWorkspaceAccountSettings(toWorkspaceRole(membership.role))) {
    return membership.workspace_id;
  }

  const workspaceId = randomUUID();
  const timestamp = nowIso();

  await run(
    database,
    `INSERT INTO workspaces (id, name, slug, created_by, created_at, updated_at)
     VALUES (?, ?, NULL, ?, ?, ?)`,
    [workspaceId, organizationName, userId, timestamp, timestamp],
  );
  await run(
    database,
    `INSERT INTO workspace_members (workspace_id, user_id, role, created_at, updated_at)
     VALUES (?, ?, 'owner', ?, ?)
     ON CONFLICT(workspace_id, user_id) DO UPDATE SET
       role = 'owner',
       updated_at = excluded.updated_at`,
    [workspaceId, userId, timestamp, timestamp],
  );

  return workspaceId;
}

async function getWorkspaceRole(
  database: D1DatabaseLike,
  workspaceId: string,
  userId: string,
) {
  const row = await first<{ role: string | null }>(
    database,
    `SELECT role
     FROM workspace_members
     WHERE workspace_id = ? AND user_id = ?
     LIMIT 1`,
    [workspaceId, userId],
  );

  return toWorkspaceRole(row?.role);
}

async function getWorkspaceSettings(
  database: D1DatabaseLike,
  workspaceId: string,
): Promise<WorkspaceSettingsPayload | null> {
  const [workspace, settings] = await Promise.all([
    first<WorkspaceNameRow>(
      database,
      `SELECT name
       FROM workspaces
       WHERE id = ?
       LIMIT 1`,
      [workspaceId],
    ),
    getWorkspaceAccountSettingsFromD1(database, workspaceId),
  ]);

  return {
    organization_name:
      settings?.organization_name ?? workspace?.name ?? "",
    organization_type:
      settings?.organization_type ?? "architecture_design",
    country_region: settings?.country_region ?? "",
    company_size: settings?.company_size ?? null,
    default_currency: settings?.default_currency ?? "PHP",
    primary_use: settings?.primary_use ?? null,
  };
}

async function updateDefaultWorkspaceId(
  database: D1DatabaseLike,
  userId: string,
  workspaceId: string,
) {
  await run(
    database,
    `UPDATE profiles
     SET default_workspace_id = ?, updated_at = ?
     WHERE id = ?`,
    [workspaceId, nowIso(), userId],
  );
}

async function requireAccountActionsD1Database() {
  const database = await getCloudflareD1Database();
  if (!database) {
    throw new Error("Cloudflare D1 ARCH_DB binding is required for account actions.");
  }
  return database;
}

async function first<T>(database: D1DatabaseLike, sql: string, values: D1Value[] = []) {
  return database.prepare<T>(sql).bind(...values).first<T>();
}

async function run(database: D1DatabaseLike, sql: string, values: D1Value[] = []) {
  const result = await database.prepare(sql).bind(...values).run();
  if (result.success === false) throw new Error("Cloudflare D1 account action write failed.");
  return result;
}

function nowIso() {
  return new Date().toISOString();
}

function toWorkspaceRole(value: string | null | undefined): WorkspaceRole | null {
  if (value === "owner" || value === "admin" || value === "member" || value === "viewer") {
    return value;
  }
  return null;
}

function onboardingErrorUrl(code: string, next: string) {
  const params = new URLSearchParams({
    error: code,
    next: sanitizeNextPath(next, DEFAULT_AUTH_DESTINATION),
  });
  return `/workshop/onboarding?${params.toString()}`;
}
