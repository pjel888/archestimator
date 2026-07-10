import "server-only";

import { getCloudflareD1Database } from "@/lib/cloudflare/d1";
import { emitLogRecord } from "@/lib/observability/logger";

export type AdminUserRow = {
  id: string;
  email: string;
  display_name: string | null;
  role: string;
  account_status: string;
  default_workspace_id: string | null;
  avatar_url: string | null;
  created_at: string;
  updated_at: string;
  active_session_count: number;
  last_session_at: string | null;
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
    if (!db) return { data: [], error: "Cloudflare D1 is not available.", count: 0 };

    const whereClause = search
      ? "WHERE lower(p.email) LIKE ? OR lower(coalesce(p.display_name, '')) LIKE ?"
      : "";
    const countStatement = db.prepare<CountRow>(
      `
        SELECT COUNT(*) AS count
        FROM profiles p
        ${whereClause}
      `,
    );
    // The session aggregation is scoped via a correlated subquery to ONLY the
    // users on the current page (INNER LATERAL-style via EXISTS). This avoids
    // scanning+grouping the entire session table on every page load.
    const usersStatement = db.prepare<AdminUserRow>(
      `
        WITH paged_users AS (
          SELECT p.id, p.email, p.display_name, p.role, p.account_status, p.default_workspace_id,
                 p.avatar_url, p.created_at, p.updated_at
          FROM profiles p
          ${whereClause}
          ORDER BY p.created_at DESC, p.id DESC
          LIMIT ? OFFSET ?
        )
        SELECT
          pu.id,
          pu.email,
          pu.display_name,
          pu.role,
          pu.account_status,
          pu.default_workspace_id,
          pu.avatar_url,
          pu.created_at,
          pu.updated_at,
          coalesce(s.active_session_count, 0) AS active_session_count,
          s.last_session_at
        FROM paged_users pu
        LEFT JOIN (
          SELECT
            "userId" AS user_id,
            COUNT(*) AS active_session_count,
            MAX("updatedAt") AS last_session_at
          FROM "session"
          WHERE "expiresAt" > ? AND "userId" IN (SELECT id FROM paged_users)
          GROUP BY "userId"
        ) s ON s.user_id = pu.id
        ORDER BY pu.created_at DESC, pu.id DESC
      `,
    );

    // Run count and page-rows in parallel — they are independent queries.
    const [countRow, users] = await Promise.all([
      search ? countStatement.bind(search, search).first<CountRow>() : countStatement.first<CountRow>(),
      search
        ? usersStatement.bind(limit, offset, now, search, search).all<AdminUserRow>()
        : usersStatement.bind(limit, offset, now).all<AdminUserRow>(),
    ]);

    return {
      data: users.results ?? [],
      error: null,
      count: countRow?.count ?? 0,
    };
  } catch (error) {
    logUsersRepositoryFailure(error, "admin_users_list_failed");
    return { data: [], error: "Admin users could not be read.", count: 0 };
  }
}

export async function countSignups(windowDays: number): Promise<AdminRepositoryResult<number>> {
  const safeDays = clampPositiveInteger(windowDays, 30, 3650);
  const cutoff = new Date(Date.now() - safeDays * 24 * 60 * 60 * 1_000).toISOString();

  try {
    const db = await getCloudflareD1Database();
    if (!db) return { data: 0, error: "Cloudflare D1 is not available." };

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
    logUsersRepositoryFailure(error, "admin_users_signup_count_failed");
    return { data: 0, error: "Signup count could not be read." };
  }
}

export async function listRecentSignups(limit: number): Promise<AdminRepositoryResult<AdminUserRow[]>> {
  return listAdminUsers({ page: 1, limit });
}

export type AdminUserActivityRow = {
  action: string;
  target_type: string | null;
  target_id: string | null;
  summary_json: string | null;
  created_at: string;
};

export async function listAdminUserActivity(
  userId: string,
  limit = 50,
): Promise<AdminRepositoryResult<AdminUserActivityRow[]>> {
  const safeLimit = clampPositiveInteger(limit, 10, 100);
  try {
    const db = await getCloudflareD1Database();
    if (!db) return { data: [], error: "Cloudflare D1 is not available." };

    const result = await db
      .prepare<AdminUserActivityRow>(
        `
          SELECT action, target_type, target_id, summary_json, created_at
          FROM admin_audit_events
          WHERE actor_user_id = ?
          ORDER BY created_at DESC
          LIMIT ?
        `,
      )
      .bind(userId, safeLimit)
      .all<AdminUserActivityRow>();

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
): Promise<AdminRepositoryResult<{ ok: boolean }>> {
  try {
    const db = await getCloudflareD1Database();
    if (!db) return { data: { ok: false }, error: "Cloudflare D1 is not available." };

    await db
      .prepare(
        `
          UPDATE profiles
          SET account_status = ?, updated_at = ?
          WHERE id = ?
        `,
      )
      .bind(status, new Date().toISOString(), userId)
      .run();

    return { data: { ok: true }, error: null };
  } catch (error) {
    logUsersRepositoryFailure(error, "admin_user_status_update_failed");
    return { data: { ok: false }, error: "User status could not be updated." };
  }
}

export async function getAdminUser(userId: string): Promise<AdminRepositoryResult<AdminUserRow | null>> {
  try {
    const db = await getCloudflareD1Database();
    if (!db) return { data: null, error: "Cloudflare D1 is not available." };

    const row = await db
      .prepare<AdminUserRow>(
        `
          SELECT
            p.id, p.email, p.display_name, p.role, p.account_status,
            p.default_workspace_id, p.avatar_url, p.created_at, p.updated_at,
            coalesce(s.active_session_count, 0) AS active_session_count,
            s.last_session_at
          FROM profiles p
          LEFT JOIN (
            SELECT
              "userId" AS user_id,
              COUNT(*) AS active_session_count,
              MAX("updatedAt") AS last_session_at
            FROM "session"
            WHERE "expiresAt" > ? AND "userId" = ?
            GROUP BY "userId"
          ) s ON s.user_id = p.id
          WHERE p.id = ?
          LIMIT 1
        `,
      )
      .bind(new Date().toISOString(), userId, userId)
      .first<AdminUserRow>();

    return { data: row ?? null, error: null };
  } catch (error) {
    logUsersRepositoryFailure(error, "admin_user_detail_failed");
    return { data: null, error: "User could not be read." };
  }
}

export { normalizeAccountStatus };
