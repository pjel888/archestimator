import "server-only";

import { getCloudflareD1Database } from "@/lib/cloudflare/d1";
import { emitLogRecord } from "@/lib/observability/logger";

export type AdminUserRow = {
  id: string;
  profile_id: string | null;
  auth_user_id: string | null;
  email: string;
  display_name: string | null;
  role: string;
  account_status: "active" | "suspended" | "banned" | "invited" | "revoked";
  default_workspace_id: string | null;
  avatar_url: string | null;
  created_at: string;
  updated_at: string;
  total_session_count: number;
  active_session_count: number;
  first_session_at: string | null;
  last_session_at: string | null;
  last_session_refreshed_at: string | null;
  beta_status: "invited" | "active" | "revoked" | null;
  is_beta_user: boolean;
  is_registered: boolean;
  is_manageable: boolean;
};

export type ListAdminUsersInput = {
  search?: string | null;
  page: number;
  limit: number;
};

export type AdminRepositoryResult<T> = {
  data: T;
  error: string | null;
  count?: number;
};

type CountRow = {
  count: number;
};

type SignupCountRow = {
  signups: number;
};

type AdminUserQueryRow = Omit<AdminUserRow, "is_beta_user" | "is_registered" | "is_manageable"> & {
  is_beta_user: number;
  is_registered: number;
  is_manageable: number;
};

const ADMIN_DIRECTORY_CTE = `
  WITH directory AS (
    SELECT
      p.id,
      p.id AS profile_id,
      u.id AS auth_user_id,
      p.email,
      p.display_name,
      p.role,
      p.account_status,
      p.default_workspace_id,
      p.avatar_url,
      p.created_at,
      p.updated_at,
      a.status AS beta_status,
      CASE WHEN a.id IS NULL THEN 0 ELSE 1 END AS is_beta_user,
      CASE WHEN u.id IS NULL THEN 0 ELSE 1 END AS is_registered,
      1 AS is_manageable
    FROM profiles p
    LEFT JOIN closed_beta_allowed_emails a
      ON a.normalized_email = lower(trim(p.email))
    LEFT JOIN "user" u
      ON lower(trim(u.email)) = lower(trim(p.email))
    WHERE p.deleted_at IS NULL

    UNION ALL

    SELECT
      'allowlist:' || a.id AS id,
      NULL AS profile_id,
      u.id AS auth_user_id,
      a.normalized_email AS email,
      NULL AS display_name,
      'beta' AS role,
      a.status AS account_status,
      NULL AS default_workspace_id,
      NULL AS avatar_url,
      a.invited_at AS created_at,
      a.updated_at,
      a.status AS beta_status,
      1 AS is_beta_user,
      CASE WHEN u.id IS NULL THEN 0 ELSE 1 END AS is_registered,
      0 AS is_manageable
    FROM closed_beta_allowed_emails a
    LEFT JOIN "user" u
      ON lower(trim(u.email)) = a.normalized_email
    WHERE NOT EXISTS (
      SELECT 1
      FROM profiles p
      WHERE lower(trim(p.email)) = a.normalized_email
        AND p.deleted_at IS NULL
    )
  )
`;

function clampPositiveInteger(value: number, fallback: number, max: number): number {
  if (!Number.isFinite(value)) return fallback;
  return Math.min(Math.max(Math.floor(value), 1), max);
}

function normalizeSearch(search: string | null | undefined): string | null {
  const trimmed = search?.trim().toLowerCase();
  return trimmed ? `%${trimmed}%` : null;
}

function logUsersRepositoryFailure(error: unknown, event: string) {
  emitLogRecord({
    level: "error",
    event,
    message: "Admin users repository D1 operation failed.",
    context: {
      error_name: error instanceof Error ? error.name : "unknown",
    },
  });
}

function toAdminUserRow(row: AdminUserQueryRow): AdminUserRow {
  return {
    ...row,
    is_beta_user: row.is_beta_user === 1,
    is_registered: row.is_registered === 1,
    is_manageable: row.is_manageable === 1,
  };
}

export async function listAdminUsers(
  input: ListAdminUsersInput,
): Promise<AdminRepositoryResult<AdminUserRow[]>> {
  const page = clampPositiveInteger(input.page, 1, 10_000);
  const limit = clampPositiveInteger(input.limit, 25, 100);
  const offset = (page - 1) * limit;
  const search = normalizeSearch(input.search);
  const now = new Date().toISOString();

  try {
    const db = await getCloudflareD1Database();
    if (!db) return { data: [], error: "Something went wrong. Try again in a moment.", count: 0 };

    const whereClause = search
      ? "WHERE lower(d.email) LIKE ? OR lower(coalesce(d.display_name, '')) LIKE ?"
      : "";
    const countStatement = db.prepare<CountRow>(
      `
        ${ADMIN_DIRECTORY_CTE}
        SELECT COUNT(*) AS count
        FROM directory d
        ${whereClause}
      `,
    );
    // The session aggregation is scoped via a correlated subquery to ONLY the
    // users on the current page (INNER LATERAL-style via EXISTS). This avoids
    // scanning+grouping the entire session table on every page load.
    const usersStatement = db.prepare<AdminUserQueryRow>(
      `
        ${ADMIN_DIRECTORY_CTE}, paged_users AS (
          SELECT d.id, d.profile_id, d.auth_user_id, d.email, d.display_name, d.role, d.account_status, d.default_workspace_id,
                 d.avatar_url, d.created_at, d.updated_at, d.beta_status, d.is_beta_user,
                 d.is_registered, d.is_manageable
          FROM directory d
          ${whereClause}
          ORDER BY d.created_at DESC, d.id DESC
          LIMIT ? OFFSET ?
        )
        SELECT
          pu.id,
          pu.profile_id,
          pu.auth_user_id,
          pu.email,
          pu.display_name,
          pu.role,
          pu.account_status,
          pu.default_workspace_id,
          pu.avatar_url,
          pu.created_at,
          pu.updated_at,
          pu.beta_status,
          pu.is_beta_user,
          pu.is_registered,
          pu.is_manageable,
          coalesce(s.total_session_count, 0) AS total_session_count,
          coalesce(s.active_session_count, 0) AS active_session_count,
          s.first_session_at,
          s.last_session_at,
          s.last_session_refreshed_at
        FROM paged_users pu
        LEFT JOIN (
          SELECT
            "userId" AS user_id,
            COUNT(*) AS total_session_count,
            SUM(CASE WHEN "expiresAt" > ? THEN 1 ELSE 0 END) AS active_session_count,
            MIN("createdAt") AS first_session_at,
            MAX("createdAt") AS last_session_at,
            MAX("updatedAt") AS last_session_refreshed_at
          FROM "session"
          WHERE "userId" IN (SELECT auth_user_id FROM paged_users WHERE auth_user_id IS NOT NULL)
          GROUP BY "userId"
        ) s ON s.user_id = pu.auth_user_id
        ORDER BY pu.created_at DESC, pu.id DESC
      `,
    );

    // Run count and page-rows in parallel — they are independent queries.
    // F0-1: the usersStatement placeholder order is determined by SQL text
    // position: the ${whereClause} `?`s sit INSIDE the paged_users CTE (before
    // LIMIT), so the bind order must be [search, search, limit, offset, now] —
    // not the [limit, offset, now, search, search] it previously used, which
    // bound the search terms to LIMIT/OFFSET and produced wrong results.
    const [countRow, users] = await Promise.all([
      search ? countStatement.bind(search, search).first<CountRow>() : countStatement.first<CountRow>(),
      search
        ? usersStatement.bind(search, search, limit, offset, now).all<AdminUserQueryRow>()
        : usersStatement.bind(limit, offset, now).all<AdminUserQueryRow>(),
    ]);

    return {
      data: (users.results ?? []).map(toAdminUserRow),
      error: null,
      count: countRow?.count ?? 0,
    };
  } catch (error) {
    logUsersRepositoryFailure(error, "admin_users_list_failed");
    return { data: [], error: "Admin users could not be read.", count: 0 };
  }
}

// F0-10: this counts `profiles.created_at` (profile-provision rows), NOT
// canonical Better Auth signups — there is no `user` table in the D1 schema to
// count canonical auth signups from. The name reflects what it actually
// measures; canonical signup tracking is an F8 analytics task. Do not relabel
// this output as "signups."
export async function countProfilesCreated(windowDays: number): Promise<AdminRepositoryResult<number>> {
  const safeDays = clampPositiveInteger(windowDays, 30, 3650);
  const cutoff = new Date(Date.now() - safeDays * 24 * 60 * 60 * 1_000).toISOString();

  try {
    const db = await getCloudflareD1Database();
    if (!db) return { data: 0, error: "Something went wrong. Try again in a moment." };

    const row = await db
      .prepare<SignupCountRow>(
        `
          SELECT COUNT(*) AS signups
          FROM profiles
          WHERE created_at >= ?
        `,
      )
      .bind(cutoff)
      .first<SignupCountRow>();

    return { data: row?.signups ?? 0, error: null };
  } catch (error) {
    logUsersRepositoryFailure(error, "admin_users_profile_count_failed");
    return { data: 0, error: "Profile count could not be read." };
  }
}

export async function listRecentSignups(limit: number): Promise<AdminRepositoryResult<AdminUserRow[]>> {
  return listAdminUsers({ page: 1, limit });
}

// F0-5: this reads admin_audit_events (the admin action trail), NOT product
// activity. The name says so explicitly; a real product-activity timeline is F3.
export type AdminUserAuditActivityRow = {
  action: string;
  target_type: string | null;
  target_id: string | null;
  summary_json: string | null;
  created_at: string;
};

export async function listAdminUserAuditActivity(
  userId: string,
  limit = 50,
  alternateUserId: string | null = null,
): Promise<AdminRepositoryResult<AdminUserAuditActivityRow[]>> {
  const safeLimit = clampPositiveInteger(limit, 10, 100);
  try {
    const db = await getCloudflareD1Database();
    if (!db) return { data: [], error: "Something went wrong. Try again in a moment." };

    const result = await db
      .prepare<AdminUserAuditActivityRow>(
        `
          SELECT action, target_type, target_id, summary_json, created_at
          FROM admin_audit_events
          WHERE actor_user_id IN (?, ?)
          ORDER BY created_at DESC
          LIMIT ?
        `,
      )
      .bind(userId, alternateUserId ?? "__missing_alternate_user__", safeLimit)
      .all<AdminUserAuditActivityRow>();

    return { data: result.results ?? [], error: null };
  } catch (error) {
    logUsersRepositoryFailure(error, "admin_user_activity_failed");
    return { data: [], error: "User activity could not be read." };
  }
}

export type AccountStatus = "active" | "suspended" | "banned";

function normalizeAccountStatus(value: string): AccountStatus {
  if (value === "suspended" || value === "banned") return value;
  return "active";
}

export async function setUserAccountStatus(
  userId: string,
  status: AccountStatus,
): Promise<AdminRepositoryResult<{ ok: boolean; changes: number }>> {
  try {
    const db = await getCloudflareD1Database();
    if (!db) return { data: { ok: false, changes: 0 }, error: "Something went wrong. Try again in a moment." };

    // F0-2: capture affected rows. SQLite counts every row matched by WHERE as
    // changed (even for a no-op value update), so changes===0 reliably means
    // the target profile does not exist. ok now means "a row was actually
    // updated," never fake success.
    const result = await db
      .prepare(
        `
          UPDATE profiles
          SET account_status = ?, updated_at = ?
          WHERE id = ?
            AND deleted_at IS NULL
        `,
      )
      .bind(status, new Date().toISOString(), userId)
      .run();

    const changes = result.meta?.changes ?? 0;
    return { data: { ok: changes > 0, changes }, error: null };
  } catch (error) {
    logUsersRepositoryFailure(error, "admin_user_status_update_failed");
    return { data: { ok: false, changes: 0 }, error: "User status could not be updated." };
  }
}

export async function getAdminUser(userId: string): Promise<AdminRepositoryResult<AdminUserRow | null>> {
  try {
    const db = await getCloudflareD1Database();
    if (!db) return { data: null, error: "Something went wrong. Try again in a moment." };

    const row = await db
      .prepare<AdminUserQueryRow>(
        `
          ${ADMIN_DIRECTORY_CTE}
          SELECT
            directory.id,
            directory.profile_id,
            directory.auth_user_id,
            directory.email,
            directory.display_name,
            directory.role,
            directory.account_status,
            directory.default_workspace_id,
            directory.avatar_url,
            directory.created_at,
            directory.updated_at,
            directory.beta_status,
            directory.is_beta_user,
            directory.is_registered,
            directory.is_manageable,
            coalesce(s.total_session_count, 0) AS total_session_count,
            coalesce(s.active_session_count, 0) AS active_session_count,
            s.first_session_at,
            s.last_session_at,
            s.last_session_refreshed_at
          FROM directory
          LEFT JOIN (
            SELECT
              "userId" AS user_id,
              COUNT(*) AS total_session_count,
              SUM(CASE WHEN "expiresAt" > ? THEN 1 ELSE 0 END) AS active_session_count,
              MIN("createdAt") AS first_session_at,
              MAX("createdAt") AS last_session_at,
              MAX("updatedAt") AS last_session_refreshed_at
            FROM "session"
            WHERE "userId" = (SELECT auth_user_id FROM directory WHERE id = ? LIMIT 1)
            GROUP BY "userId"
          ) s ON s.user_id = directory.auth_user_id
          WHERE directory.id = ?
          LIMIT 1
        `,
      )
      .bind(new Date().toISOString(), userId, userId)
      .first<AdminUserQueryRow>();

    return { data: row ? toAdminUserRow(row) : null, error: null };
  } catch (error) {
    logUsersRepositoryFailure(error, "admin_user_detail_failed");
    return { data: null, error: "User could not be read." };
  }
}

export { normalizeAccountStatus };
