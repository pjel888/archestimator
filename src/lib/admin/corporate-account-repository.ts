import "server-only";

import {
  getCloudflareD1Database,
  type D1DatabaseLike,
} from "@/lib/cloudflare/d1";
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

export type WorkspaceLinkCandidateRow = WorkspaceSummaryRow & {
  corporate_account_id: string | null;
  corporate_account_name: string | null;
};

export type UserCorporateAccountRow = CorporateAccountRow & {
  role: string;
  job_title: string | null;
};

export type CorporateAccountReadOnlyView = {
  account: CorporateAccountRow;
  memberRole: "owner" | "team_leader";
  members: CorporateAccountMemberRow[];
  workspaces: WorkspaceSummaryRow[];
};

export type CorporateAccountResult<T> = {
  data: T;
  error: string | null;
};

export type CorporateAccountRole =
  "owner" | "team_leader" | "member" | "viewer";

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

export type ListCorporateAccountsWithCountsOptions = {
  status?: "active" | "suspended" | "archived";
};

/**
 * Lists corporate accounts with member and workspace counts in a single
 * query (avoids N+1). Uses LEFT JOIN + GROUP BY for efficiency.
 */
export async function listCorporateAccountsWithCounts(
  options: ListCorporateAccountsWithCountsOptions = {},
): Promise<CorporateAccountResult<CorporateAccountWithCountRow[]>> {
  try {
    const db = await getCloudflareD1Database();
    if (!db) return { data: [], error: "Something went wrong. Try again in a moment." };

    const statusClause =
      options.status === "archived"
        ? "WHERE a.status = 'archived'"
        : "WHERE a.status != 'archived'";
    const result = await db
      .prepare<CorporateAccountWithCountRow>(
        `SELECT a.id, a.name, a.description, a.status, a.created_by,
                a.created_at, a.updated_at,
                COUNT(DISTINCT m.user_id) AS member_count,
                COUNT(DISTINCT w.id) AS workspace_count
         FROM corporate_accounts a
         LEFT JOIN corporate_account_members m ON m.corporate_account_id = a.id
         LEFT JOIN workspaces w ON w.corporate_account_id = a.id
         ${statusClause}
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

export async function listCorporateAccounts(): Promise<
  CorporateAccountResult<CorporateAccountRow[]>
> {
  try {
    const db = await getCloudflareD1Database();
    if (!db) return { data: [], error: "Something went wrong. Try again in a moment." };

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
    if (!db) return { data: null, error: "Something went wrong. Try again in a moment." };

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
    if (!db) return { data: [], error: "Something went wrong. Try again in a moment." };

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
    if (!db) return { data: [], error: "Something went wrong. Try again in a moment." };

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
    if (!db) return { data: [], error: "Something went wrong. Try again in a moment." };

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

type CorporateAccountReadOnlyAccountRow = CorporateAccountRow & {
  member_role: "owner" | "team_leader";
};

type CorporateAccountMemberWithAccountIdRow = CorporateAccountMemberRow & {
  corporate_account_id: string;
};

type WorkspaceWithCorporateAccountIdRow = WorkspaceSummaryRow & {
  corporate_account_id: string;
};

/**
 * Reads organization details only for account owners and team leaders. The
 * eligibility predicate is repeated in each query so returned members and
 * workspaces cannot be widened by a caller-supplied account id.
 */
export async function listCorporateAccountReadOnlyViewsForMember(
  userId: string,
): Promise<CorporateAccountResult<CorporateAccountReadOnlyView[]>> {
  try {
    const db = await getCloudflareD1Database();
    if (!db) return { data: [], error: "Something went wrong. Try again in a moment." };

    return await listCorporateAccountReadOnlyViewsInD1(db, userId);
  } catch (error) {
    logFailure(error, "corporate_account_read_only_views_failed");
    return { data: [], error: "Organization accounts could not be read." };
  }
}

export async function listCorporateAccountReadOnlyViewsInD1(
  db: D1DatabaseLike,
  userId: string,
): Promise<CorporateAccountResult<CorporateAccountReadOnlyView[]>> {
  const accountsResult = await db
    .prepare<CorporateAccountReadOnlyAccountRow>(
      `SELECT a.id, a.name, a.description, a.status, a.created_by,
              a.created_at, a.updated_at, m.role AS member_role
       FROM corporate_account_members m
       JOIN corporate_accounts a ON a.id = m.corporate_account_id
       WHERE m.user_id = ?
         AND m.role IN ('owner', 'team_leader')
         AND a.status != 'archived'
       ORDER BY a.name ASC`,
    )
    .bind(userId)
    .all<CorporateAccountReadOnlyAccountRow>();
  const accounts = accountsResult.results ?? [];
  if (accounts.length === 0) return { data: [], error: null };

  const membersResult = await db
    .prepare<CorporateAccountMemberWithAccountIdRow>(
      `SELECT m.corporate_account_id, m.user_id, p.email, p.display_name,
              p.avatar_url, m.role, m.job_title, m.created_at
       FROM corporate_account_members m
       LEFT JOIN profiles p ON p.id = m.user_id
       WHERE EXISTS (
         SELECT 1
         FROM corporate_account_members eligible
         JOIN corporate_accounts a ON a.id = eligible.corporate_account_id
         WHERE eligible.corporate_account_id = m.corporate_account_id
           AND eligible.user_id = ?
           AND eligible.role IN ('owner', 'team_leader')
           AND a.status != 'archived'
       )
       ORDER BY m.corporate_account_id,
         CASE m.role
           WHEN 'owner' THEN 0
           WHEN 'team_leader' THEN 1
           WHEN 'member' THEN 2
           WHEN 'viewer' THEN 3
           ELSE 4
         END,
         p.email ASC`,
    )
    .bind(userId)
    .all<CorporateAccountMemberWithAccountIdRow>();

  const workspacesResult = await db
    .prepare<WorkspaceWithCorporateAccountIdRow>(
      `SELECT w.corporate_account_id, w.id, w.name, w.slug, w.created_by, w.created_at
       FROM workspaces w
       WHERE w.closed_at IS NULL
         AND EXISTS (
         SELECT 1
         FROM corporate_account_members eligible
         JOIN corporate_accounts a ON a.id = eligible.corporate_account_id
         WHERE eligible.corporate_account_id = w.corporate_account_id
           AND eligible.user_id = ?
           AND eligible.role IN ('owner', 'team_leader')
           AND a.status != 'archived'
       )
       ORDER BY w.corporate_account_id, w.name ASC`,
    )
    .bind(userId)
    .all<WorkspaceWithCorporateAccountIdRow>();

  const membersByAccount = new Map<string, CorporateAccountMemberRow[]>();
  for (const { corporate_account_id, ...member } of membersResult.results ??
    []) {
    const members = membersByAccount.get(corporate_account_id) ?? [];
    members.push(member);
    membersByAccount.set(corporate_account_id, members);
  }

  const workspacesByAccount = new Map<string, WorkspaceSummaryRow[]>();
  for (const {
    corporate_account_id,
    ...workspace
  } of workspacesResult.results ?? []) {
    const workspaces = workspacesByAccount.get(corporate_account_id) ?? [];
    workspaces.push(workspace);
    workspacesByAccount.set(corporate_account_id, workspaces);
  }

  return {
    data: accounts.map(({ member_role, ...account }) => ({
      account,
      memberRole: member_role,
      members: membersByAccount.get(account.id) ?? [],
      workspaces: workspacesByAccount.get(account.id) ?? [],
    })),
    error: null,
  };
}

// --- Mutations ---

export async function createCorporateAccount(input: {
  name: string;
  description?: string;
  createdBy: string;
}): Promise<CorporateAccountResult<CorporateAccountRow>> {
  try {
    const db = await getCloudflareD1Database();
    if (!db)
      return { data: null as never, error: "Something went wrong. Try again in a moment." };

    const id = genId();
    const ts = now();
    const name = input.name.trim();
    const createdBy = input.createdBy.trim();
    const description = input.description?.trim() || null;

    if (!name || name.length > 200) {
      return {
        data: null as never,
        error: "Account name is required (max 200 chars).",
      };
    }
    if (!createdBy) {
      return { data: null as never, error: "Account creator is required." };
    }

    await db
      .prepare(
        `INSERT INTO corporate_accounts (id, name, description, status, created_by, created_at, updated_at)
         VALUES (?, ?, ?, 'active', ?, ?, ?)`,
      )
      .bind(id, name, description, createdBy, ts, ts)
      .run();

    return {
      data: {
        id,
        name,
        description,
        status: "active",
        created_by: createdBy,
        created_at: ts,
        updated_at: ts,
      },
      error: null,
    };
  } catch (error) {
    logFailure(error, "corporate_account_create_failed");
    return {
      data: null as never,
      error: "Corporate account could not be created.",
    };
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
    if (!db)
      return { data: { ok: false }, error: "Something went wrong. Try again in a moment." };

    const ts = now();
    const result = await db
      .prepare(
        `INSERT INTO corporate_account_members (corporate_account_id, user_id, role, job_title, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?)
         ON CONFLICT(corporate_account_id, user_id) DO UPDATE SET
           role = excluded.role,
           job_title = excluded.job_title,
           updated_at = excluded.updated_at
         WHERE corporate_account_members.role != 'owner'
           OR excluded.role = 'owner'
           OR EXISTS (
             SELECT 1
             FROM corporate_account_members AS other_owner
             WHERE other_owner.corporate_account_id = corporate_account_members.corporate_account_id
               AND other_owner.role = 'owner'
               AND other_owner.user_id != corporate_account_members.user_id
           )`,
      )
      .bind(
        input.accountId,
        input.userId,
        input.role,
        input.jobTitle?.trim() || null,
        ts,
        ts,
      )
      .run();

    if (!wasMutationApplied(result)) {
      return {
        data: { ok: false },
        error: "Cannot demote the last owner of the account.",
      };
    }

    return { data: { ok: true }, error: null };
  } catch (error) {
    logFailure(error, "corporate_account_member_add_failed");
    return { data: { ok: false }, error: "Could not add member." };
  }
}

/**
 * Checks if the given user is the last owner of the account.
 * Returns true if removing them would leave the account with zero owners.
 */
async function isLastOwner(
  db: D1DatabaseLike,
  accountId: string,
  userId: string,
): Promise<boolean> {
  const row = await db
    .prepare<{ count: number }>(
      `SELECT COUNT(*) AS count FROM corporate_account_members
       WHERE corporate_account_id = ? AND role = 'owner'`,
    )
    .bind(accountId)
    .first<{ count: number }>();

  const ownerCount = row?.count ?? 0;
  if (ownerCount <= 1) {
    // Check if this user is an owner.
    const member = await db
      .prepare<{ role: string }>(
        `SELECT role FROM corporate_account_members WHERE corporate_account_id = ? AND user_id = ?`,
      )
      .bind(accountId, userId)
      .first<{ role: string }>();
    return member?.role === "owner";
  }
  return false;
}

function wasMutationApplied(result: { meta?: { changes?: number } }) {
  return (result.meta?.changes ?? 0) > 0;
}

export async function removeCorporateAccountMember(
  accountId: string,
  userId: string,
): Promise<CorporateAccountResult<{ ok: boolean }>> {
  try {
    const db = await getCloudflareD1Database();
    if (!db)
      return { data: { ok: false }, error: "Something went wrong. Try again in a moment." };

    // Last-owner guard: cannot remove the last owner.
    if (await isLastOwner(db, accountId, userId)) {
      return {
        data: { ok: false },
        error: "Cannot remove the last owner of the account.",
      };
    }

    const result = await db
      .prepare(
        `DELETE FROM corporate_account_members
         WHERE corporate_account_id = ?
           AND user_id = ?
           AND (
             role != 'owner'
             OR EXISTS (
               SELECT 1
               FROM corporate_account_members AS other_owner
               WHERE other_owner.corporate_account_id = corporate_account_members.corporate_account_id
                 AND other_owner.role = 'owner'
                 AND other_owner.user_id != corporate_account_members.user_id
             )
           )`,
      )
      .bind(accountId, userId)
      .run();

    if (!wasMutationApplied(result)) {
      return {
        data: { ok: false },
        error: "Cannot remove the last owner of the account.",
      };
    }

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
    if (!db)
      return { data: { ok: false }, error: "Something went wrong. Try again in a moment." };

    // Last-owner guard: cannot demote the last owner to a non-owner role.
    if (
      input.role !== "owner" &&
      (await isLastOwner(db, input.accountId, input.userId))
    ) {
      return {
        data: { ok: false },
        error: "Cannot demote the last owner of the account.",
      };
    }

    const result = await db
      .prepare(
        `UPDATE corporate_account_members
         SET role = ?, updated_at = ?
         WHERE corporate_account_id = ?
           AND user_id = ?
           AND (
             role != 'owner'
             OR ? = 'owner'
             OR EXISTS (
               SELECT 1
               FROM corporate_account_members AS other_owner
               WHERE other_owner.corporate_account_id = corporate_account_members.corporate_account_id
                 AND other_owner.role = 'owner'
                 AND other_owner.user_id != corporate_account_members.user_id
             )
           )`,
      )
      .bind(input.role, now(), input.accountId, input.userId, input.role)
      .run();

    if (!wasMutationApplied(result)) {
      return {
        data: { ok: false },
        error: "Cannot demote the last owner of the account.",
      };
    }

    return { data: { ok: true }, error: null };
  } catch (error) {
    logFailure(error, "corporate_account_member_role_failed");
    return { data: { ok: false }, error: "Could not update role." };
  }
}

export type LinkWorkspaceResult = {
  ok: boolean;
  previousAccountId: string | null;
};

export type LinkWorkspaceWithAuditInput = {
  workspaceId: string;
  accountId: string;
  actorUserId: string;
  actorEmail: string;
};

export type UnlinkWorkspaceWithAuditInput = {
  workspaceId: string;
  actorUserId: string;
  actorEmail: string;
};

/**
 * Links a workspace to a corporate account. If the workspace was already linked
 * to a DIFFERENT account, this is treated as a move — the previous account ID
 * is returned so the caller can audit the transition. The previous account
 * loses its claim silently (the workspace is moved, not shared).
 */
export async function linkWorkspaceToCorporateAccount(
  workspaceId: string,
  accountId: string,
): Promise<CorporateAccountResult<LinkWorkspaceResult>> {
  try {
    const db = await getCloudflareD1Database();
    if (!db)
      return {
        data: { ok: false, previousAccountId: null },
        error: "Something went wrong. Try again in a moment.",
      };

    // Check if the workspace is already linked to a different account.
    const existing = await db
      .prepare<{ corporate_account_id: string | null }>(
        `SELECT corporate_account_id FROM workspaces WHERE id = ?`,
      )
      .bind(workspaceId)
      .first<{ corporate_account_id: string | null }>();

    const previousAccountId = existing?.corporate_account_id ?? null;

    const result = await db
      .prepare(
        `UPDATE workspaces SET corporate_account_id = ?, updated_at = ? WHERE id = ?`,
      )
      .bind(accountId, now(), workspaceId)
      .run();

    if (!wasMutationApplied(result)) {
      return {
        data: { ok: false, previousAccountId: null },
        error: "Workspace was not found.",
      };
    }

    return { data: { ok: true, previousAccountId }, error: null };
  } catch (error) {
    logFailure(error, "workspace_link_failed");
    return {
      data: { ok: false, previousAccountId: null },
      error: "Could not link workspace.",
    };
  }
}

/**
 * Moves a workspace and records its account audit trail in one D1 batch.
 * The conditional update detects a competing move before the audit events can
 * become detached from the persisted workspace assignment.
 */
export async function linkWorkspaceToCorporateAccountWithAudit(
  input: LinkWorkspaceWithAuditInput,
): Promise<CorporateAccountResult<LinkWorkspaceResult>> {
  try {
    const db = await getCloudflareD1Database();
    if (!db)
      return {
        data: { ok: false, previousAccountId: null },
        error: "Something went wrong. Try again in a moment.",
      };

    return await linkWorkspaceToCorporateAccountWithAuditInD1(db, input);
  } catch (error) {
    logFailure(error, "workspace_link_with_audit_failed");
    return {
      data: { ok: false, previousAccountId: null },
      error: "Could not link workspace.",
    };
  }
}

export async function linkWorkspaceToCorporateAccountWithAuditInD1(
  db: D1DatabaseLike,
  input: LinkWorkspaceWithAuditInput,
): Promise<CorporateAccountResult<LinkWorkspaceResult>> {
  const existing = await db
    .prepare<{ corporate_account_id: string | null }>(
      "SELECT corporate_account_id FROM workspaces WHERE id = ?",
    )
    .bind(input.workspaceId)
    .first<{ corporate_account_id: string | null }>();

  if (!existing) {
    return {
      data: { ok: false, previousAccountId: null },
      error: "Workspace was not found.",
    };
  }

  const previousAccountId = existing.corporate_account_id;
  if (previousAccountId === input.accountId) {
    return { data: { ok: true, previousAccountId }, error: null };
  }
  if (!db.batch) {
    return {
      data: { ok: false, previousAccountId },
      error: "Something went wrong. Try again in a moment.",
    };
  }

  const updatedAt = now();
  const statements = [
    db
      .prepare(
        `UPDATE workspaces
         SET corporate_account_id = ?, updated_at = ?
         WHERE id = ? AND corporate_account_id IS ?`,
      )
      .bind(input.accountId, updatedAt, input.workspaceId, previousAccountId),
  ];

  if (previousAccountId) {
    statements.push(
      db
        .prepare(
          `INSERT INTO admin_audit_events (
             id, actor_user_id, actor_email, action, target_type, target_id,
             summary_json, request_id, created_at
           )
           SELECT ?, ?, ?, 'corporate_account.workspace_unlinked', 'corporate_account', ?, ?, NULL, ?
           FROM workspaces
           WHERE id = ? AND corporate_account_id = ? AND updated_at = ?`,
        )
        .bind(
          genId(),
          input.actorUserId,
          input.actorEmail,
          previousAccountId,
          JSON.stringify({
            workspaceId: input.workspaceId,
            reason: "moved_to_another_account",
          }),
          updatedAt,
          input.workspaceId,
          input.accountId,
          updatedAt,
        ),
    );
  }

  statements.push(
    db
      .prepare(
        `INSERT INTO admin_audit_events (
           id, actor_user_id, actor_email, action, target_type, target_id,
           summary_json, request_id, created_at
         )
         SELECT ?, ?, ?, 'corporate_account.workspace_linked', 'corporate_account', ?, ?, NULL, ?
         FROM workspaces
         WHERE id = ? AND corporate_account_id = ? AND updated_at = ?`,
      )
      .bind(
        genId(),
        input.actorUserId,
        input.actorEmail,
        input.accountId,
        JSON.stringify({
          workspaceId: input.workspaceId,
          movedFrom: previousAccountId,
        }),
        updatedAt,
        input.workspaceId,
        input.accountId,
        updatedAt,
      ),
  );

  const results = await db.batch(statements);
  if (!wasMutationApplied(results[0] ?? {})) {
    return {
      data: { ok: false, previousAccountId },
      error: "Workspace link changed concurrently. Reload and retry.",
    };
  }

  return { data: { ok: true, previousAccountId }, error: null };
}

/**
 * Updates a corporate account's status (active/suspended/archived).
 */
export async function updateCorporateAccountStatus(
  accountId: string,
  status: string,
): Promise<CorporateAccountResult<{ ok: boolean }>> {
  if (!["active", "suspended", "archived"].includes(status)) {
    return { data: { ok: false }, error: "Invalid status." };
  }
  try {
    const db = await getCloudflareD1Database();
    if (!db)
      return { data: { ok: false }, error: "Something went wrong. Try again in a moment." };

    const result = await db
      .prepare(
        `UPDATE corporate_accounts SET status = ?, updated_at = ? WHERE id = ?`,
      )
      .bind(status, now(), accountId)
      .run();

    if (!wasMutationApplied(result)) {
      return { data: { ok: false }, error: "Corporate account was not found." };
    }

    return { data: { ok: true }, error: null };
  } catch (error) {
    logFailure(error, "corporate_account_status_update_failed");
    return { data: { ok: false }, error: "Could not update account status." };
  }
}

export async function unlinkWorkspaceFromCorporateAccount(
  workspaceId: string,
): Promise<CorporateAccountResult<{ ok: boolean }>> {
  try {
    const db = await getCloudflareD1Database();
    if (!db)
      return { data: { ok: false }, error: "Something went wrong. Try again in a moment." };

    const result = await db
      .prepare(
        `UPDATE workspaces SET corporate_account_id = NULL, updated_at = ? WHERE id = ?`,
      )
      .bind(now(), workspaceId)
      .run();

    if (!wasMutationApplied(result)) {
      return { data: { ok: false }, error: "Workspace was not found." };
    }

    return { data: { ok: true }, error: null };
  } catch (error) {
    logFailure(error, "workspace_unlink_failed");
    return { data: { ok: false }, error: "Could not unlink workspace." };
  }
}

/**
 * Unlinks a workspace and records its account audit trail in one D1 batch.
 * The observed assignment is part of the update predicate so a concurrent
 * move cannot create an audit record for an unlink that did not persist.
 */
export async function unlinkWorkspaceFromCorporateAccountWithAudit(
  input: UnlinkWorkspaceWithAuditInput,
): Promise<CorporateAccountResult<LinkWorkspaceResult>> {
  try {
    const db = await getCloudflareD1Database();
    if (!db)
      return {
        data: { ok: false, previousAccountId: null },
        error: "Something went wrong. Try again in a moment.",
      };

    return await unlinkWorkspaceFromCorporateAccountWithAuditInD1(db, input);
  } catch (error) {
    logFailure(error, "workspace_unlink_with_audit_failed");
    return {
      data: { ok: false, previousAccountId: null },
      error: "Could not unlink workspace.",
    };
  }
}

export async function unlinkWorkspaceFromCorporateAccountWithAuditInD1(
  db: D1DatabaseLike,
  input: UnlinkWorkspaceWithAuditInput,
): Promise<CorporateAccountResult<LinkWorkspaceResult>> {
  const existing = await db
    .prepare<{ corporate_account_id: string | null }>(
      "SELECT corporate_account_id FROM workspaces WHERE id = ?",
    )
    .bind(input.workspaceId)
    .first<{ corporate_account_id: string | null }>();

  if (!existing) {
    return {
      data: { ok: false, previousAccountId: null },
      error: "Workspace was not found.",
    };
  }

  const previousAccountId = existing.corporate_account_id;
  if (!previousAccountId) {
    return { data: { ok: true, previousAccountId: null }, error: null };
  }
  if (!db.batch) {
    return {
      data: { ok: false, previousAccountId },
      error: "Something went wrong. Try again in a moment.",
    };
  }

  const updatedAt = now();
  const results = await db.batch([
    db
      .prepare(
        `UPDATE workspaces
         SET corporate_account_id = NULL, updated_at = ?
         WHERE id = ? AND corporate_account_id IS ?`,
      )
      .bind(updatedAt, input.workspaceId, previousAccountId),
    db
      .prepare(
        `INSERT INTO admin_audit_events (
           id, actor_user_id, actor_email, action, target_type, target_id,
           summary_json, request_id, created_at
         )
         SELECT ?, ?, ?, 'corporate_account.workspace_unlinked', 'corporate_account', ?, ?, NULL, ?
         FROM workspaces
         WHERE id = ? AND corporate_account_id IS NULL AND updated_at = ?`,
      )
      .bind(
        genId(),
        input.actorUserId,
        input.actorEmail,
        previousAccountId,
        JSON.stringify({ workspaceId: input.workspaceId, reason: "unlinked" }),
        updatedAt,
        input.workspaceId,
        updatedAt,
      ),
  ]);

  if (!wasMutationApplied(results[0] ?? {})) {
    return {
      data: { ok: false, previousAccountId },
      error: "Workspace link changed concurrently. Reload and retry.",
    };
  }

  return { data: { ok: true, previousAccountId }, error: null };
}

export async function listUnlinkedWorkspaces(): Promise<
  CorporateAccountResult<WorkspaceSummaryRow[]>
> {
  try {
    const db = await getCloudflareD1Database();
    if (!db) return { data: [], error: "Something went wrong. Try again in a moment." };

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

export async function listAllWorkspacesForLinking(): Promise<
  CorporateAccountResult<WorkspaceLinkCandidateRow[]>
> {
  try {
    const db = await getCloudflareD1Database();
    if (!db) return { data: [], error: "Something went wrong. Try again in a moment." };

    const result = await db
      .prepare<WorkspaceLinkCandidateRow>(
        `SELECT w.id, w.name, w.slug, w.created_by, w.created_at,
                w.corporate_account_id, a.name AS corporate_account_name
         FROM workspaces AS w
         LEFT JOIN corporate_accounts AS a ON a.id = w.corporate_account_id
         ORDER BY w.name ASC
         LIMIT 200`,
      )
      .all<WorkspaceLinkCandidateRow>();

    return { data: result.results ?? [], error: null };
  } catch (error) {
    logFailure(error, "all_workspaces_for_linking_failed");
    return { data: [], error: "Workspaces could not be read." };
  }
}

export async function listAllUsersForAssignment(): Promise<
  CorporateAccountResult<
    {
      id: string;
      email: string;
      display_name: string | null;
      account_status: string;
    }[]
  >
> {
  try {
    const db = await getCloudflareD1Database();
    if (!db) return { data: [], error: "Something went wrong. Try again in a moment." };

    const result = await db
      .prepare<{
        id: string;
        email: string;
        display_name: string | null;
        account_status: string;
      }>(
        `SELECT id, email, display_name, account_status
         FROM profiles
         WHERE account_status = 'active' OR account_status IS NULL
         ORDER BY email ASC
         LIMIT 500`,
      )
      .all<{
        id: string;
        email: string;
        display_name: string | null;
        account_status: string;
      }>();

    return { data: result.results ?? [], error: null };
  } catch (error) {
    logFailure(error, "all_users_for_assignment_failed");
    return { data: [], error: "Users could not be read." };
  }
}

export { isValidRole };
