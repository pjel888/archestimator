import "server-only";

import type {
  ProfileSettingsPayload,
  WorkspaceSettingsPayload,
} from "@/lib/auth/account-data";
import { getCloudflareD1Database, type D1DatabaseLike } from "@/lib/cloudflare/d1";

type UserOnboardingProfileD1Row = {
  country_region: string;
  display_name: string;
  marketing_consent_at: string | null;
  onboarding_completed_at: string | null;
  primary_use: ProfileSettingsPayload["primary_use"];
  student_educator_detail: string | null;
  user_category: ProfileSettingsPayload["user_category"];
};

type WorkspaceAccountSettingsD1Row = {
  company_size: WorkspaceSettingsPayload["company_size"];
  country_region: string;
  default_currency: string;
  organization_name: string;
  organization_type: WorkspaceSettingsPayload["organization_type"];
  primary_use: WorkspaceSettingsPayload["primary_use"];
};

export type UpsertUserOnboardingProfileD1Input = {
  completed: boolean;
  profile: ProfileSettingsPayload;
  userId: string;
};

export type UpsertWorkspaceAccountSettingsD1Input = {
  workspace: WorkspaceSettingsPayload;
  workspaceId: string;
};

function nowIso() {
  return new Date().toISOString();
}

function toProfileSettings(row: UserOnboardingProfileD1Row | null): ProfileSettingsPayload | null {
  if (!row) return null;
  return {
    country_region: row.country_region,
    display_name: row.display_name,
    marketing_consent_at: row.marketing_consent_at,
    primary_use: row.primary_use,
    student_educator_detail: row.student_educator_detail,
    user_category: row.user_category,
  };
}

function toWorkspaceSettings(row: WorkspaceAccountSettingsD1Row | null): WorkspaceSettingsPayload | null {
  if (!row) return null;
  return {
    company_size: row.company_size,
    country_region: row.country_region,
    default_currency: row.default_currency,
    organization_name: row.organization_name,
    organization_type: row.organization_type,
    primary_use: row.primary_use,
  };
}

export async function getUserOnboardingProfileFromD1(db: D1DatabaseLike, userId: string) {
  const row = await db
    .prepare<UserOnboardingProfileD1Row>(
      `
        SELECT
          display_name,
          user_category,
          country_region,
          primary_use,
          student_educator_detail,
          marketing_consent_at,
          onboarding_completed_at
        FROM user_onboarding_profiles
        WHERE user_id = ?
        LIMIT 1
      `,
    )
    .bind(userId)
    .first<UserOnboardingProfileD1Row>();

  return toProfileSettings(row);
}

export async function getUserOnboardingProfileFromCloudflareD1(userId: string) {
  const db = await getCloudflareD1Database();
  return db ? getUserOnboardingProfileFromD1(db, userId) : null;
}

export async function upsertUserOnboardingProfileInD1(
  db: D1DatabaseLike,
  input: UpsertUserOnboardingProfileD1Input,
) {
  const timestamp = nowIso();
  const completedAt = input.completed ? timestamp : null;
  const profile = input.profile;

  return db
    .prepare(
      `
        INSERT INTO user_onboarding_profiles (
          user_id,
          display_name,
          user_category,
          country_region,
          primary_use,
          student_educator_detail,
          marketing_consent_at,
          onboarding_completed_at,
          created_at,
          updated_at
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(user_id) DO UPDATE SET
          display_name = excluded.display_name,
          user_category = excluded.user_category,
          country_region = excluded.country_region,
          primary_use = excluded.primary_use,
          student_educator_detail = excluded.student_educator_detail,
          marketing_consent_at = excluded.marketing_consent_at,
          onboarding_completed_at = COALESCE(
            excluded.onboarding_completed_at,
            user_onboarding_profiles.onboarding_completed_at
          ),
          updated_at = excluded.updated_at
      `,
    )
    .bind(
      input.userId,
      profile.display_name,
      profile.user_category,
      profile.country_region,
      profile.primary_use,
      profile.student_educator_detail,
      profile.marketing_consent_at,
      completedAt,
      timestamp,
      timestamp,
    )
    .run();
}

export async function upsertUserOnboardingProfileInCloudflareD1(
  input: UpsertUserOnboardingProfileD1Input,
) {
  const db = await getCloudflareD1Database();
  if (!db) throw new Error("Account profile settings persistence is unavailable.");
  return upsertUserOnboardingProfileInD1(db, input);
}

export async function getWorkspaceAccountSettingsFromD1(
  db: D1DatabaseLike,
  workspaceId: string,
) {
  const row = await db
    .prepare<WorkspaceAccountSettingsD1Row>(
      `
        SELECT
          organization_name,
          organization_type,
          country_region,
          company_size,
          default_currency,
          primary_use
        FROM workspace_account_settings
        WHERE workspace_id = ?
        LIMIT 1
      `,
    )
    .bind(workspaceId)
    .first<WorkspaceAccountSettingsD1Row>();

  return toWorkspaceSettings(row);
}

export async function getWorkspaceAccountSettingsFromCloudflareD1(workspaceId: string) {
  const db = await getCloudflareD1Database();
  return db ? getWorkspaceAccountSettingsFromD1(db, workspaceId) : null;
}

export async function upsertWorkspaceAccountSettingsInD1(
  db: D1DatabaseLike,
  input: UpsertWorkspaceAccountSettingsD1Input,
) {
  const timestamp = nowIso();
  const workspace = input.workspace;

  return db
    .prepare(
      `
        INSERT INTO workspace_account_settings (
          workspace_id,
          organization_name,
          organization_type,
          country_region,
          company_size,
          default_currency,
          primary_use,
          created_at,
          updated_at
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(workspace_id) DO UPDATE SET
          organization_name = excluded.organization_name,
          organization_type = excluded.organization_type,
          country_region = excluded.country_region,
          company_size = excluded.company_size,
          default_currency = excluded.default_currency,
          primary_use = excluded.primary_use,
          updated_at = excluded.updated_at
      `,
    )
    .bind(
      input.workspaceId,
      workspace.organization_name,
      workspace.organization_type,
      workspace.country_region,
      workspace.company_size,
      workspace.default_currency,
      workspace.primary_use,
      timestamp,
      timestamp,
    )
    .run();
}

export async function upsertWorkspaceAccountSettingsInCloudflareD1(
  input: UpsertWorkspaceAccountSettingsD1Input,
) {
  const db = await getCloudflareD1Database();
  if (!db) throw new Error("Workspace account settings persistence is unavailable.");
  return upsertWorkspaceAccountSettingsInD1(db, input);
}
