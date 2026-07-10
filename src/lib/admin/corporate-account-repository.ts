import "server-only";

import { getCloudflareD1Database } from "@/lib/cloudflare/d1";
import { emitLogRecord } from "@/lib/observability/logger";

export type CorporateAccountRow = {
  id: string;
  name: string;
  description: string | null;
  status: string;
  created_by: string | null;
  created_at: string;
  updated_at: string;
};

export type CorporateAccountMemberRow = {
  user_id: string;
  email: string;
  display_name: string | null;
  avatar_url: string | null;
  role: string;
  job_title: string | null;
  created_at: string;
};

export type WorkspaceSummaryRow = {
  id: string;
  name: string;
  slug: string | null;
  created_by: string | null;
  created_at: string;
};

export type UserCorporateAccountRow = CorporateAccountRow & {
  role: string;
  job_title: string | null;
};

export type CorporateAccountResult<T> = {
  data: T;
  error: string | null;
};

export type CorporateAccountRole = "owner" | "team_leader" | "member" | "viewer";

const VALID_ROLES = new Set(["owner", "team_leader", "member", "viewer"]);

function isValidRole(role: string): role is CorporateAccountRole {
  return VALID_ROLES.has(role);
}

function logFailure(error: unknown, event: string) {
  emitLogRecord({
    level: "error",
    event,
    message: "Corporate account D1 operation failed.",
    context: {
      error_name: error instanceof Error ? error.name : "unknown",
    },
  });
}

function genId(): string {
  return crypto.randomUUID();
}

function now(): string {
  return new Date().toISOString();
}

// --- Queries ---

export type CorporateAccountWithCountRow = CorporateAccountRow & {
  member_count: number;
  workspace_count: number;
};

/**
 * Lists corporate accounts with member and workspace counts in a single
 * query (avoids N+1). Uses LEFT JOIN + GROUP BY for efficiency.
 */
export async function listCorporateAccountsWithCounts(): Promise<
  CorporateAccountResult<CorporateAccountWithCountRow[]>
> {
  try {
    const db = await getCloudflareD1Database();
    if (!db) return { data: [], error: "Cloudflare D1 is not available." };

    const result = await db
      .prepare<CorporateAccountWithCountRow>(
        `SELECT a.id, a.name, a.description, a.status, a.created_by,
                a.created_at, a.updated_at,
                COUNT(DISTINCT m.user_id) AS member_count,
                COUNT(DISTINCT w.id) AS workspace_count
         FROM corporate_accounts a
         LEFT JOIN corporate_account_members m ON m.corporate_account_id = a.id
         LEFT JOIN workspaces w ON w.corporate_account_id = a.id
         WHERE a.status != 'archived'
         GROUP BY a.id
         ORDER BY a.created_at DESC`,
      )
      .all<CorporateAccountWithCountRow>();

    return { data: result.results ?? [], error: null };
  } catch (error) {
    logFailure(error, "corporate_accounts_list_with_counts_failed");
    return { data: [], error: "Corporate accounts could not be read." };
  }
}

export async function listCorporateAccounts(): Promise<CorporateAccountResult<CorporateAccountRow[]>> {
  try {
    const db = await getCloudflareD1Database();
    if (!db) return { data: [], error: "Cloudflare D1 is not available." };

    const result = await db
      .prepare<CorporateAccountRow>(
        `SELECT id, name, description, status, created_by, created_at, updated_at
         FROM corporate_accounts
         WHERE status != 'archived'
         ORDER BY created_at DESC`,
      )
      .all<CorporateAccountRow>();

    return { data: result.results ?? [], error: null };
  } catch (error) {
    logFailure(error, "corporate_accounts_list_failed");
    return { data: [], error: "Corporate accounts could not be read." };
  }
}

export async function getCorporateAccount(
  accountId: string,
): Promise<CorporateAccountResult<CorporateAccountRow | null>> {
  try {
    const db = await getCloudflareD1Database();
    if (!db) return { data: null, error: "Cloudflare D1 is not available." };

    const row = await db
      .prepare<CorporateAccountRow>(
        `SELECT id, name, description, status, created_by, created_at, updated_at
         FROM corporate_accounts
         WHERE id = ?
         LIMIT 1`,
      )
      .bind(accountId)
      .first<CorporateAccountRow>();

    return { data: row ?? null, error: null };
  } catch (error) {
    logFailure(error, "corporate_account_detail_failed");
    return { data: null, error: "Corporate account could not be read." };
  }
}

export async function listCorporateAccountMembers(
  accountId: string,
): Promise<CorporateAccountResult<CorporateAccountMemberRow[]>> {
  try {
    const db = await getCloudflareD1Database();
    if (!db) return { data: [], error: "Cloudflare D1 is not available." };

    const result = await db
      .prepare<CorporateAccountMemberRow>(
        `SELECT m.user_id, p.email, p.display_name, p.avatar_url,
                m.role, m.job_title, m.created_at
         FROM corporate_account_members m
         LEFT JOIN profiles p ON p.id = m.user_id
         WHERE m.corporate_account_id = ?
         ORDER BY
           CASE m.role
             WHEN 'owner' THEN 0
             WHEN 'team_leader' THEN 1
             WHEN 'member' THEN 2
             WHEN 'viewer' THEN 3
             ELSE 4
           END,
           p.email ASC`,
      )
      .bind(accountId)
      .all<CorporateAccountMemberRow>();

    return { data: result.results ?? [], error: null };
  } catch (error) {
    logFailure(error, "corporate_account_members_failed");
    return { data: [], error: "Account members could not be read." };
  }
}

export async function listCorporateAccountWorkspaces(
  accountId: string,
): Promise<CorporateAccountResult<WorkspaceSummaryRow[]>> {
  try {
    const db = await getCloudflareD1Database();
    if (!db) return { data: [], error: "Cloudflare D1 is not available." };

    const result = await db
      .prepare<WorkspaceSummaryRow>(
        `SELECT id, name, slug, created_by, created_at
         FROM workspaces
         WHERE corporate_account_id = ?
         ORDER BY name ASC`,
      )
      .bind(accountId)
      .all<WorkspaceSummaryRow>();

    return { data: result.results ?? [], error: null };
  } catch (error) {
    logFailure(error, "corporate_account_workspaces_failed");
    return { data: [], error: "Account workspaces could not be read." };
  }
}

export async function listUserCorporateAccounts(
  userId: string,
): Promise<CorporateAccountResult<UserCorporateAccountRow[]>> {
  try {
    const db = await getCloudflareD1Database();
    if (!db) return { data: [], error: "Cloudflare D1 is not available." };

    const result = await db
      .prepare<UserCorporateAccountRow>(
        `SELECT a.id, a.name, a.description, a.status, a.created_by,
                a.created_at, a.updated_at,
                m.role, m.job_title
         FROM corporate_account_members m
         JOIN corporate_accounts a ON a.id = m.corporate_account_id
         WHERE m.user_id = ? AND a.status != 'archived'
         ORDER BY a.name ASC`,
      )
      .bind(userId)
      .all<UserCorporateAccountRow>();

    return { data: result.results ?? [], error: null };
  } catch (error) {
    logFailure(error, "user_corporate_accounts_failed");
    return { data: [], error: "User corporate accounts could not be read." };
  }
}

// --- Mutations ---

export async function createCorporateAccount(input: {
  name: string;
  description?: string;
  createdBy: string;
}): Promise<CorporateAccountResult<CorporateAccountRow>> {
  try {
    const db = await getCloudflareD1Database();
    if (!db) return { data: null as never, error: "Cloudflare D1 is not available." };

    const id = genId();
    const ts = now();
    const name = input.name.trim();
    const description = input.description?.trim() || null;

    if (!name || name.length > 200) {
      return { data: null as never, error: "Account name is required (max 200 chars)." };
    }

    await db
      .prepare(
        `INSERT INTO corporate_accounts (id, name, description, status, created_by, created_at, updated_at)
         VALUES (?, ?, ?, 'active', ?, ?, ?)`,
      )
      .bind(id, name, description, input.createdBy, ts, ts)
      .run();

    return {
      data: {
        id,
        name,
        description,
        status: "active",
        created_by: input.createdBy,
        created_at: ts,
        updated_at: ts,
      },
      error: null,
    };
  } catch (error) {
    logFailure(error, "corporate_account_create_failed");
    return { data: null as never, error: "Corporate account could not be created." };
  }
}

export async function addCorporateAccountMember(input: {
  accountId: string;
  userId: string;
  role: string;
  jobTitle?: string;
}): Promise<CorporateAccountResult<{ ok: boolean }>> {
  if (!isValidRole(input.role)) {
    return { data: { ok: false }, error: "Invalid role." };
  }
  try {
    const db = await getCloudflareD1Database();
    if (!db) return { data: { ok: false }, error: "Cloudflare D1 is not available." };

    const ts = now();
    await db
      .prepare(
        `INSERT INTO corporate_account_members (corporate_account_id, user_id, role, job_title, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?)
         ON CONFLICT(corporate_account_id, user_id) DO UPDATE SET role = excluded.role, job_title = excluded.job_title, updated_at = excluded.updated_at`,
      )
      .bind(input.accountId, input.userId, input.role, input.jobTitle?.trim() || null, ts, ts)
      .run();

    return { data: { ok: true }, error: null };
  } catch (error) {
    logFailure(error, "corporate_account_member_add_failed");
    return { data: { ok: false }, error: "Could not add member." };
  }
}

export async function removeCorporateAccountMember(
  accountId: string,
  userId: string,
): Promise<CorporateAccountResult<{ ok: boolean }>> {
  try {
    const db = await getCloudflareD1Database();
    if (!db) return { data: { ok: false }, error: "Cloudflare D1 is not available." };

    await db
      .prepare(
        `DELETE FROM corporate_account_members WHERE corporate_account_id = ? AND user_id = ?`,
      )
      .bind(accountId, userId)
      .run();

    return { data: { ok: true }, error: null };
  } catch (error) {
    logFailure(error, "corporate_account_member_remove_failed");
    return { data: { ok: false }, error: "Could not remove member." };
  }
}

export async function updateCorporateAccountMemberRole(input: {
  accountId: string;
  userId: string;
  role: string;
}): Promise<CorporateAccountResult<{ ok: boolean }>> {
  if (!isValidRole(input.role)) {
    return { data: { ok: false }, error: "Invalid role." };
  }
  try {
    const db = await getCloudflareD1Database();
    if (!db) return { data: { ok: false }, error: "Cloudflare D1 is not available." };

    await db
      .prepare(
        `UPDATE corporate_account_members SET role = ?, updated_at = ? WHERE corporate_account_id = ? AND user_id = ?`,
      )
      .bind(input.role, now(), input.accountId, input.userId)
      .run();

    return { data: { ok: true }, error: null };
  } catch (error) {
    logFailure(error, "corporate_account_member_role_failed");
    return { data: { ok: false }, error: "Could not update role." };
  }
}

export async function linkWorkspaceToCorporateAccount(
  workspaceId: string,
  accountId: string,
): Promise<CorporateAccountResult<{ ok: boolean }>> {
  try {
    const db = await getCloudflareD1Database();
    if (!db) return { data: { ok: false }, error: "Cloudflare D1 is not available." };

    await db
      .prepare(
        `UPDATE workspaces SET corporate_account_id = ?, updated_at = ? WHERE id = ?`,
      )
      .bind(accountId, now(), workspaceId)
      .run();

    return { data: { ok: true }, error: null };
  } catch (error) {
    logFailure(error, "workspace_link_failed");
    return { data: { ok: false }, error: "Could not link workspace." };
  }
}

export async function unlinkWorkspaceFromCorporateAccount(
  workspaceId: string,
): Promise<CorporateAccountResult<{ ok: boolean }>> {
  try {
    const db = await getCloudflareD1Database();
    if (!db) return { data: { ok: false }, error: "Cloudflare D1 is not available." };

    await db
      .prepare(
        `UPDATE workspaces SET corporate_account_id = NULL, updated_at = ? WHERE id = ?`,
      )
      .bind(now(), workspaceId)
      .run();

    return { data: { ok: true }, error: null };
  } catch (error) {
    logFailure(error, "workspace_unlink_failed");
    return { data: { ok: false }, error: "Could not unlink workspace." };
  }
}

export async function listUnlinkedWorkspaces(): Promise<CorporateAccountResult<WorkspaceSummaryRow[]>> {
  try {
    const db = await getCloudflareD1Database();
    if (!db) return { data: [], error: "Cloudflare D1 is not available." };

    const result = await db
      .prepare<WorkspaceSummaryRow>(
        `SELECT id, name, slug, created_by, created_at
         FROM workspaces
         WHERE corporate_account_id IS NULL
         ORDER BY name ASC
         LIMIT 200`,
      )
      .all<WorkspaceSummaryRow>();

    return { data: result.results ?? [], error: null };
  } catch (error) {
    logFailure(error, "unlinked_workspaces_failed");
    return { data: [], error: "Unlinked workspaces could not be read." };
  }
}

export async function listAllWorkspacesForLinking(): Promise<CorporateAccountResult<WorkspaceSummaryRow[]>> {
  try {
    const db = await getCloudflareD1Database();
    if (!db) return { data: [], error: "Cloudflare D1 is not available." };

    const result = await db
      .prepare<WorkspaceSummaryRow>(
        `SELECT w.id, w.name, w.slug, w.created_by, w.created_at
         FROM workspaces w
         ORDER BY w.name ASC
         LIMIT 200`,
      )
      .all<WorkspaceSummaryRow>();

    return { data: result.results ?? [], error: null };
  } catch (error) {
    logFailure(error, "all_workspaces_for_linking_failed");
    return { data: [], error: "Workspaces could not be read." };
  }
}

export async function listAllUsersForAssignment(): Promise<
  CorporateAccountResult<{ id: string; email: string; display_name: string | null; account_status: string }[]>
> {
  try {
    const db = await getCloudflareD1Database();
    if (!db) return { data: [], error: "Cloudflare D1 is not available." };

    const result = await db
      .prepare<{ id: string; email: string; display_name: string | null; account_status: string }>(
        `SELECT id, email, display_name, account_status
         FROM profiles
         WHERE account_status = 'active' OR account_status IS NULL
         ORDER BY email ASC
         LIMIT 500`,
      )
      .all<{ id: string; email: string; display_name: string | null; account_status: string }>();

    return { data: result.results ?? [], error: null };
  } catch (error) {
    logFailure(error, "all_users_for_assignment_failed");
    return { data: [], error: "Users could not be read." };
  }
}

export { isValidRole };
