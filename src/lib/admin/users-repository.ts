import "server-only";

import { getCloudflareD1Database } from "@/lib/cloudflare/d1";
import { emitLogRecord } from "@/lib/observability/logger";

export type AdminUserRow = {
  id: string;
  email: string;
  display_name: string | null;
  role: string;
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
    const usersStatement = db.prepare<AdminUserRow>(
      `
        SELECT
          p.id,
          p.email,
          p.display_name,
          p.role,
          p.default_workspace_id,
          p.avatar_url,
          p.created_at,
          p.updated_at,
          coalesce(s.active_session_count, 0) AS active_session_count,
          s.last_session_at
        FROM profiles p
        LEFT JOIN (
          SELECT
            "userId" AS user_id,
            COUNT(*) AS active_session_count,
            MAX("updatedAt") AS last_session_at
          FROM "session"
          WHERE "expiresAt" > ?
          GROUP BY "userId"
        ) s ON s.user_id = p.id
        ${whereClause}
        ORDER BY p.created_at DESC, p.id DESC
        LIMIT ? OFFSET ?
      `,
    );

    const countRow = search
      ? await countStatement.bind(search, search).first<CountRow>()
      : await countStatement.first<CountRow>();
    const users = search
      ? await usersStatement.bind(now, search, search, limit, offset).all<AdminUserRow>()
      : await usersStatement.bind(now, limit, offset).all<AdminUserRow>();

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
