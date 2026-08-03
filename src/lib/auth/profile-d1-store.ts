import "server-only";

import { normalizeClosedBetaEmail } from "@/lib/auth/closed-beta-access";
import {
  isAppPlatformRole,
  normalizeAppPlatformRole,
  type AppPlatformRole,
} from "@/lib/auth/roles";
import { getCloudflareD1Database, type D1DatabaseLike } from "@/lib/cloudflare/d1";

export type AppRole = AppPlatformRole;

export type CurrentUserProfile = {
  account_status: string;
  avatar_url: string | null;
  created_at: string;
  default_workspace_id: string | null;
  deleted_at: string | null;
  deletion_id: string | null;
  display_name: string | null;
  email: string;
  id: string;
  role: AppRole;
  updated_at: string;
};

type ProfileD1Row = {
  account_status: string | null;
  avatar_url: string | null;
  created_at: string;
  default_workspace_id: string | null;
  deleted_at: string | null;
  deletion_id: string | null;
  display_name: string | null;
  email: string;
  id: string;
  role: string;
  updated_at: string;
};

export { isAppPlatformRole as isAppRole };

function toCurrentUserProfile(row: ProfileD1Row | null): CurrentUserProfile | null {
  if (!row) return null;
  return {
    account_status: row.account_status ?? "active",
    avatar_url: row.avatar_url,
    created_at: row.created_at,
    default_workspace_id: row.default_workspace_id,
    deleted_at: row.deleted_at ?? null,
    deletion_id: row.deletion_id ?? null,
    display_name: row.display_name,
    email: row.email,
    id: row.id,
    role: normalizeAppPlatformRole(row.role),
    updated_at: row.updated_at,
  };
}

export async function getProfileByEmailFromD1(
  db: D1DatabaseLike,
  email: string | null | undefined,
): Promise<CurrentUserProfile | null> {
  const normalizedEmail = normalizeClosedBetaEmail(email);
  if (!normalizedEmail) return null;

  const row = await db
    .prepare<ProfileD1Row>(
      `
        SELECT id, email, display_name, role, account_status, default_workspace_id, avatar_url,
               deleted_at, deletion_id, created_at, updated_at
        FROM profiles
        WHERE email = ?
        LIMIT 1
      `,
    )
    .bind(normalizedEmail)
    .first<ProfileD1Row>();

  return toCurrentUserProfile(row);
}

export async function getProfileByEmailFromCloudflareD1(email: string | null | undefined): Promise<CurrentUserProfile | null> {
  const db = await getCloudflareD1Database();
  return db ? getProfileByEmailFromD1(db, email) : null;
}
