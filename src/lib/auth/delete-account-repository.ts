import "server-only";

import { randomUUID } from "node:crypto";

import { runRequiredD1Batch } from "@/lib/cloudflare/d1-batch";
import type { D1DatabaseLike, D1PreparedStatementLike, D1Value } from "@/lib/cloudflare/d1";
import type {
  DeleteAccountBlocker,
  DeleteAccountPreview,
} from "@/lib/auth/delete-account-shared";

export type { DeleteAccountBlocker, DeleteAccountPreview } from "@/lib/auth/delete-account-shared";
export {
  DELETE_ACCOUNT_CONFIRMATION_PHRASE,
  validateDeleteAccountConfirmation,
} from "@/lib/auth/delete-account-shared";

export type DeleteAccountResult =
  | { ok: true; deletionId: string }
  | { ok: false; code: "blocked" | "not_found" | "write_failed"; blockers?: DeleteAccountBlocker[]; message: string };

type WorkspaceMembershipRow = {
  workspace_id: string;
  workspace_name: string;
  role: string;
  closed_at: string | null;
  other_member_count: number;
  other_owner_count: number;
  other_collaborator_count: number;
};

type CorporateMembershipRow = {
  corporate_account_id: string;
  corporate_account_name: string;
  role: string;
  other_member_count: number;
  other_owner_count: number;
};

type CountRow = { count: number };

function stmt(database: D1DatabaseLike, sql: string, values: D1Value[]): D1PreparedStatementLike {
  return database.prepare(sql).bind(...values);
}

function tombstoneEmail(userId: string, deletionId: string) {
  return `deleted+${userId}.${deletionId}@tombstone.archestimator.internal`;
}

async function listUserWorkspaceMemberships(
  database: D1DatabaseLike,
  userId: string,
): Promise<WorkspaceMembershipRow[]> {
  const result = await database
    .prepare<WorkspaceMembershipRow>(
      `
        SELECT
          membership.workspace_id AS workspace_id,
          workspace.name AS workspace_name,
          membership.role AS role,
          workspace.closed_at AS closed_at,
          (
            SELECT COUNT(*)
            FROM workspace_members AS other_member
            WHERE other_member.workspace_id = membership.workspace_id
              AND other_member.user_id != membership.user_id
          ) AS other_member_count,
          (
            SELECT COUNT(*)
            FROM workspace_members AS other_owner
            WHERE other_owner.workspace_id = membership.workspace_id
              AND other_owner.user_id != membership.user_id
              AND other_owner.role = 'owner'
          ) AS other_owner_count,
          (
            SELECT COUNT(*)
            FROM (
              SELECT project_member.user_id AS user_id
              FROM project_members AS project_member
              INNER JOIN projects AS project
                ON project.id = project_member.project_id
              WHERE project.workspace_id = membership.workspace_id
                AND project_member.user_id != membership.user_id

              UNION

              SELECT estimate_member.user_id AS user_id
              FROM estimate_sheet_members AS estimate_member
              INNER JOIN estimates AS estimate
                ON estimate.id = estimate_member.estimate_id
              INNER JOIN projects AS project
                ON project.id = estimate.project_id
              WHERE project.workspace_id = membership.workspace_id
                AND estimate_member.user_id != membership.user_id
            ) AS other_collaborators
          ) AS other_collaborator_count
        FROM workspace_members AS membership
        INNER JOIN workspaces AS workspace
          ON workspace.id = membership.workspace_id
        WHERE membership.user_id = ?
        ORDER BY workspace.created_at ASC, workspace.id ASC
      `,
    )
    .bind(userId)
    .all<WorkspaceMembershipRow>();

  return result.results ?? [];
}

async function listUserCorporateMemberships(
  database: D1DatabaseLike,
  userId: string,
): Promise<CorporateMembershipRow[]> {
  try {
    const result = await database
      .prepare<CorporateMembershipRow>(
        `
          SELECT
            membership.corporate_account_id AS corporate_account_id,
            account.name AS corporate_account_name,
            membership.role AS role,
            (
              SELECT COUNT(*)
              FROM corporate_account_members AS other_member
              WHERE other_member.corporate_account_id = membership.corporate_account_id
                AND other_member.user_id != membership.user_id
            ) AS other_member_count,
            (
              SELECT COUNT(*)
              FROM corporate_account_members AS other_owner
              WHERE other_owner.corporate_account_id = membership.corporate_account_id
                AND other_owner.user_id != membership.user_id
                AND other_owner.role = 'owner'
            ) AS other_owner_count
          FROM corporate_account_members AS membership
          INNER JOIN corporate_accounts AS account
            ON account.id = membership.corporate_account_id
          WHERE membership.user_id = ?
          ORDER BY account.created_at ASC, account.id ASC
        `,
      )
      .bind(userId)
      .all<CorporateMembershipRow>();
    return result.results ?? [];
  } catch (error) {
    const message = error instanceof Error ? error.message.toLowerCase() : "";
    if (message.includes("no such table")) return [];
    throw error;
  }
}

function classifyWorkspaceMemberships(rows: WorkspaceMembershipRow[]) {
  const blockers: DeleteAccountBlocker[] = [];
  const closedWorkspaceIds: string[] = [];
  const leftWorkspaceIds: string[] = [];
  const closedWorkspaceNames: string[] = [];
  const leftWorkspaceNames: string[] = [];

  for (const row of rows) {
    // Already-closed workspaces stay membership-bound to the tombstoned user for
    // owner-floor integrity. They are invisible to live product identity.
    if (row.closed_at) continue;

    const isOwner = row.role === "owner";
    const hasOtherMembers = Number(row.other_member_count) > 0;
    const hasOtherOwners = Number(row.other_owner_count) > 0;
    const hasOtherCollaborators = Number(row.other_collaborator_count) > 0;
    const hasOtherPeople = hasOtherMembers || hasOtherCollaborators;

    if (isOwner && hasOtherPeople && !hasOtherOwners) {
      blockers.push({
        code: "sole_owner_with_members",
        message: `Transfer ownership of “${row.workspace_name}” before deleting your account.`,
        workspaceId: row.workspace_id,
        workspaceName: row.workspace_name,
        otherMemberCount: Number(row.other_member_count) + Number(row.other_collaborator_count),
      });
      continue;
    }

    if (isOwner && !hasOtherPeople) {
      closedWorkspaceIds.push(row.workspace_id);
      closedWorkspaceNames.push(row.workspace_name);
      continue;
    }

    leftWorkspaceIds.push(row.workspace_id);
    leftWorkspaceNames.push(row.workspace_name);
  }

  return {
    blockers,
    closedWorkspaceIds,
    leftWorkspaceIds,
    closedWorkspaceNames,
    leftWorkspaceNames,
  };
}

function classifyCorporateMemberships(rows: CorporateMembershipRow[]) {
  const blockers: DeleteAccountBlocker[] = [];
  const leaveCorporateAccountIds: string[] = [];

  for (const row of rows) {
    const isOwner = row.role === "owner";
    const hasOtherMembers = Number(row.other_member_count) > 0;
    const hasOtherOwners = Number(row.other_owner_count) > 0;

    if (isOwner && hasOtherMembers && !hasOtherOwners) {
      blockers.push({
        code: "sole_corporate_owner_with_members",
        message: `Transfer ownership of organization “${row.corporate_account_name}” before deleting your account.`,
        corporateAccountId: row.corporate_account_id,
        corporateAccountName: row.corporate_account_name,
        otherMemberCount: Number(row.other_member_count),
      });
      continue;
    }

    // Sole owner with no other members: keep membership on the retained org for ops.
    // Non-sole-owner / multi-owner: leave.
    if (!(isOwner && !hasOtherMembers)) {
      leaveCorporateAccountIds.push(row.corporate_account_id);
    }
  }

  return { blockers, leaveCorporateAccountIds };
}

async function countForWorkspaces(
  database: D1DatabaseLike,
  sql: string,
  workspaceIds: string[],
): Promise<number> {
  if (workspaceIds.length === 0) return 0;
  const placeholders = workspaceIds.map(() => "?").join(", ");
  const row = await database
    .prepare<CountRow>(sql.replaceAll("__WORKSPACE_IDS__", placeholders))
    .bind(...workspaceIds)
    .first<CountRow>();
  return Number(row?.count ?? 0);
}

export async function previewDeleteAccount(
  database: D1DatabaseLike,
  userId: string,
): Promise<DeleteAccountPreview> {
  const [workspaceRows, corporateRows] = await Promise.all([
    listUserWorkspaceMemberships(database, userId),
    listUserCorporateMemberships(database, userId),
  ]);

  const workspacePlan = classifyWorkspaceMemberships(workspaceRows);
  const corporatePlan = classifyCorporateMemberships(corporateRows);
  const blockers = [...workspacePlan.blockers, ...corporatePlan.blockers];

  const [publicationRevokeCount, portalDisableCount, pendingInviteRevokeCount] = await Promise.all([
    countForWorkspaces(
      database,
      `
        SELECT COUNT(*) AS count
        FROM project_publications
        WHERE workspace_id IN (__WORKSPACE_IDS__)
          AND status = 'published'
      `,
      workspacePlan.closedWorkspaceIds,
    ),
    countForWorkspaces(
      database,
      `
        SELECT COUNT(*) AS count
        FROM client_portals
        WHERE workspace_id IN (__WORKSPACE_IDS__)
          AND status IN ('draft', 'ready', 'live')
      `,
      workspacePlan.closedWorkspaceIds,
    ),
    countForWorkspaces(
      database,
      `
        SELECT COUNT(*) AS count
        FROM collaboration_invitations
        WHERE workspace_id IN (__WORKSPACE_IDS__)
          AND lifecycle_state = 'pending'
          AND revoked_at IS NULL
      `,
      workspacePlan.closedWorkspaceIds,
    ),
  ]);

  return {
    ok: blockers.length === 0,
    blockers,
    closedWorkspaceIds: workspacePlan.closedWorkspaceIds,
    leftWorkspaceIds: workspacePlan.leftWorkspaceIds,
    closedWorkspaceNames: workspacePlan.closedWorkspaceNames,
    leftWorkspaceNames: workspacePlan.leftWorkspaceNames,
    publicationRevokeCount,
    portalDisableCount,
    pendingInviteRevokeCount,
  };
}

export async function executeDeleteAccount(
  database: D1DatabaseLike,
  input: {
    userId: string;
    email: string;
    displayName: string | null;
  },
): Promise<DeleteAccountResult> {
  const preview = await previewDeleteAccount(database, input.userId);
  if (!preview.ok) {
    return {
      ok: false,
      code: "blocked",
      blockers: preview.blockers,
      message: preview.blockers[0]?.message ?? "Resolve ownership before deleting your account.",
    };
  }

  const profile = await database
    .prepare<{ id: string; deleted_at: string | null }>(
      `SELECT id, deleted_at FROM profiles WHERE id = ? LIMIT 1`,
    )
    .bind(input.userId)
    .first<{ id: string; deleted_at: string | null }>();

  // Profile may be synthetic (never persisted). Still proceed with BA teardown and
  // membership isolation; insert a tombstone profile when missing.
  if (profile?.deleted_at) {
    return { ok: true, deletionId: randomUUID() };
  }

  const deletionId = randomUUID();
  const now = new Date().toISOString();
  const normalizedEmail = input.email.trim().toLowerCase();
  const closedIds = preview.closedWorkspaceIds;
  const leftIds = preview.leftWorkspaceIds;
  const statements: D1PreparedStatementLike[] = [];

  const corporateRows = await listUserCorporateMemberships(database, input.userId);
  const corporatePlan = classifyCorporateMemberships(corporateRows);

  statements.push(
    stmt(
      database,
      `
        INSERT INTO deleted_accounts (
          id,
          original_user_id,
          original_email,
          original_display_name,
          closed_workspace_ids_json,
          left_workspace_ids_json,
          membership_snapshot_json,
          status,
          failure_reason,
          deleted_at,
          created_at,
          updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, 'completed', NULL, ?, ?, ?)
      `,
      [
        deletionId,
        input.userId,
        normalizedEmail,
        input.displayName,
        JSON.stringify(closedIds),
        JSON.stringify(leftIds),
        JSON.stringify({
          workspaces: {
            closed: closedIds,
            left: leftIds,
          },
          corporateLeaveIds: corporatePlan.leaveCorporateAccountIds,
          publicationRevokeCount: preview.publicationRevokeCount,
          portalDisableCount: preview.portalDisableCount,
          pendingInviteRevokeCount: preview.pendingInviteRevokeCount,
        }),
        now,
        now,
        now,
      ],
    ),
  );

  for (const workspaceId of closedIds) {
    statements.push(
      stmt(
        database,
        `
          UPDATE workspaces
          SET closed_at = ?, closed_reason = 'account_deleted', closed_by_user_id = ?, deletion_id = ?, updated_at = ?
          WHERE id = ? AND closed_at IS NULL
        `,
        [now, input.userId, deletionId, now, workspaceId],
      ),
    );
  }

  if (closedIds.length > 0) {
    const placeholders = closedIds.map(() => "?").join(", ");
    statements.push(
      stmt(
        database,
        `
          UPDATE project_publications
          SET status = 'revoked', revoked_at = ?, updated_at = ?
          WHERE workspace_id IN (${placeholders})
            AND status = 'published'
        `,
        [now, now, ...closedIds],
      ),
      stmt(
        database,
        `
          UPDATE client_portals
          SET status = 'access_off', updated_at = ?
          WHERE workspace_id IN (${placeholders})
            AND status IN ('draft', 'ready', 'live')
        `,
        [now, ...closedIds],
      ),
      stmt(
        database,
        `
          UPDATE collaboration_invitations
          SET lifecycle_state = 'revoked', revoked_at = ?, updated_at = ?
          WHERE workspace_id IN (${placeholders})
            AND lifecycle_state = 'pending'
            AND revoked_at IS NULL
        `,
        [now, now, ...closedIds],
      ),
    );
  }

  // Leave shared workspaces: remove memberships only (never close teammate data).
  for (const workspaceId of leftIds) {
    statements.push(
      stmt(
        database,
        `DELETE FROM workspace_members WHERE workspace_id = ? AND user_id = ?`,
        [workspaceId, input.userId],
      ),
      stmt(
        database,
        `DELETE FROM project_members WHERE workspace_id = ? AND user_id = ?`,
        [workspaceId, input.userId],
      ),
    );
    try {
      // estimate_sheet_members may be absent in older local DBs; batch will fail closed if missing.
      statements.push(
        stmt(
          database,
          `
            DELETE FROM estimate_sheet_members
            WHERE user_id = ?
              AND project_id IN (
                SELECT id FROM projects WHERE workspace_id = ?
              )
          `,
          [input.userId, workspaceId],
        ),
      );
    } catch {
      // unreachable — stmt construction doesn't throw
    }
  }

  for (const corporateAccountId of corporatePlan.leaveCorporateAccountIds) {
    statements.push(
      stmt(
        database,
        `DELETE FROM corporate_account_members WHERE corporate_account_id = ? AND user_id = ?`,
        [corporateAccountId, input.userId],
      ),
    );
  }

  statements.push(
    stmt(
      database,
      `
        DELETE FROM project_favorites WHERE user_id = ?
      `,
      [input.userId],
    ),
    stmt(
      database,
      `
        DELETE FROM estimate_favorites WHERE user_id = ?
      `,
      [input.userId],
    ),
  );

  const freedEmail = tombstoneEmail(input.userId, deletionId);

  if (profile) {
    statements.push(
      stmt(
        database,
        `
          UPDATE profiles
          SET
            email = ?,
            display_name = COALESCE(display_name, ?),
            default_workspace_id = NULL,
            deleted_at = ?,
            deletion_id = ?,
            updated_at = ?
          WHERE id = ?
            AND deleted_at IS NULL
        `,
        [freedEmail, input.displayName, now, deletionId, now, input.userId],
      ),
    );
  } else {
    statements.push(
      stmt(
        database,
        `
          INSERT INTO profiles (
            id, email, display_name, role, default_workspace_id, avatar_url,
            created_at, updated_at, account_status, deleted_at, deletion_id
          ) VALUES (?, ?, ?, 'member', NULL, NULL, ?, ?, 'active', ?, ?)
        `,
        [input.userId, freedEmail, input.displayName, now, now, now, deletionId],
      ),
    );
  }

  // Better Auth identity teardown so the same email can create a new user.id.
  statements.push(
    stmt(database, `DELETE FROM session WHERE userId = ?`, [input.userId]),
    stmt(database, `DELETE FROM account WHERE userId = ?`, [input.userId]),
    stmt(database, `DELETE FROM "user" WHERE id = ?`, [input.userId]),
  );

  try {
    await runRequiredD1Batch(
      database,
      statements,
      "Account deletion could not be completed. No partial delete was applied.",
    );
  } catch {
    return {
      ok: false,
      code: "write_failed",
      message: "Account deletion could not be completed. Try again in a moment.",
    };
  }

  return { ok: true, deletionId };
}
