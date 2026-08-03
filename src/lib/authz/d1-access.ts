import "server-only";

import {
  isPlatformAdminRole,
  isProjectEstimateCollaborationRole,
  type ProjectEstimateCollaborationRole,
} from "@/lib/auth/roles";
import type { CurrentUserContext } from "@/lib/auth/session";
import {
  canPerformCollaborationAction,
  resolveEffectiveCollaborationAccess,
  type EffectiveCollaborationAccess,
} from "@/lib/authz/collaboration-policy";
import { type D1DatabaseLike } from "@/lib/cloudflare/d1";

type CurrentUserAccessContext = Pick<CurrentUserContext, "userId"> & Partial<Pick<CurrentUserContext, "role">>;

export type D1ProjectAccessRow = {
  id: string;
  workspace_id: string;
};

export type D1EstimateAccessRow = {
  id: string;
  project_id: string;
};

export type D1EstimateRowItemAccessRow = {
  id: string;
  estimate_id: string;
};

type CollaborationTopicAccessRow = {
  workspace_role: string | null;
  project_role: string | null;
  estimate_role?: string | null;
  inherit_project_access?: number | boolean | null;
};

export type CollaborationTopic = {
  kind: "project" | "estimate";
  resourceId: string;
};

function isPlatformAdmin(user: CurrentUserAccessContext) {
  return isPlatformAdminRole(user.role);
}

const ACTIVE_WORKSPACE_CORPORATE_ACCOUNT_PREDICATE = `
          AND (
            NOT EXISTS (
              SELECT 1
              FROM workspaces AS workspace
              WHERE workspace.id = project.workspace_id
                AND workspace.corporate_account_id IS NOT NULL
            )
            OR EXISTS (
              SELECT 1
              FROM workspaces AS workspace
              INNER JOIN corporate_accounts AS corporate_account
                ON corporate_account.id = workspace.corporate_account_id
              WHERE workspace.id = project.workspace_id
                AND corporate_account.status = 'active'
            )
          )`;

function toCollaborationRole(value: string | null | undefined): ProjectEstimateCollaborationRole | null {
  return isProjectEstimateCollaborationRole(value) ? value : null;
}

function workspaceRoleToCollaborationRole(value: string | null | undefined): ProjectEstimateCollaborationRole | null {
  if (value === "owner" || value === "admin" || value === "viewer") return value;
  if (value === "member") return "editor";
  return null;
}

function toD1Boolean(value: number | boolean | null | undefined, fallback: boolean) {
  if (value === true || value === 1) return true;
  if (value === false || value === 0) return false;
  return fallback;
}

/**
 * Resolves a collaboration-room topic through the canonical policy rather
 * than treating any sheet grant as whole-project admission. This keeps a
 * signed realtime identity scoped to exactly the resource it can access.
 */
export async function readCollaborationTopicAccessInD1(
  db: D1DatabaseLike,
  topic: CollaborationTopic,
  user: CurrentUserAccessContext,
): Promise<EffectiveCollaborationAccess | null> {
  if (isPlatformAdmin(user)) {
    return resolveEffectiveCollaborationAccess({
      grants: [{ source: "platform", role: "owner" }],
      ...(topic.kind === "estimate" ? { estimateId: topic.resourceId } : {}),
    });
  }

  try {
    const row = topic.kind === "project"
      ? await db
        .prepare<CollaborationTopicAccessRow>(
          `SELECT workspace_member.role AS workspace_role, project_member.role AS project_role
           FROM projects AS project
           LEFT JOIN workspace_members AS workspace_member
             ON workspace_member.workspace_id = project.workspace_id
             AND workspace_member.user_id = ?
           LEFT JOIN project_members AS project_member
             ON project_member.project_id = project.id
             AND project_member.user_id = ?
           WHERE project.id = ?
             ${ACTIVE_WORKSPACE_CORPORATE_ACCOUNT_PREDICATE}
           LIMIT 1`,
        )
        .bind(user.userId, user.userId, topic.resourceId)
        .first<CollaborationTopicAccessRow>()
      : await db
        .prepare<CollaborationTopicAccessRow>(
          `SELECT
             workspace_member.role AS workspace_role,
             project_member.role AS project_role,
             sheet_member.role AS estimate_role,
             COALESCE(access.inherit_project_access, 1) AS inherit_project_access
           FROM estimates AS estimate
           JOIN projects AS project ON project.id = estimate.project_id
           LEFT JOIN estimate_sheet_access_settings AS access ON access.estimate_id = estimate.id
           LEFT JOIN workspace_members AS workspace_member
             ON workspace_member.workspace_id = project.workspace_id
             AND workspace_member.user_id = ?
           LEFT JOIN project_members AS project_member
             ON project_member.project_id = project.id
             AND project_member.user_id = ?
           LEFT JOIN estimate_sheet_members AS sheet_member
             ON sheet_member.estimate_id = estimate.id
             AND sheet_member.user_id = ?
           WHERE estimate.id = ?
             ${ACTIVE_WORKSPACE_CORPORATE_ACCOUNT_PREDICATE}
           LIMIT 1`,
        )
        .bind(user.userId, user.userId, user.userId, topic.resourceId)
        .first<CollaborationTopicAccessRow>();

    if (!row) return null;

    const grants = [
      ...(workspaceRoleToCollaborationRole(row.workspace_role)
        ? [{ source: "workspace" as const, role: workspaceRoleToCollaborationRole(row.workspace_role)! }]
        : []),
      ...(toCollaborationRole(row.project_role)
        ? [{ source: "project" as const, role: toCollaborationRole(row.project_role)! }]
        : []),
      ...(topic.kind === "estimate" && toCollaborationRole(row.estimate_role)
        ? [{ source: "estimate" as const, estimateId: topic.resourceId, role: toCollaborationRole(row.estimate_role)! }]
        : []),
    ];
    const access = resolveEffectiveCollaborationAccess({
      grants,
      ...(topic.kind === "estimate"
        ? { estimateId: topic.resourceId, inheritProjectAccess: toD1Boolean(row.inherit_project_access, true) }
        : {}),
    });
    const action = topic.kind === "project" ? "subscribe_project_room" : "subscribe_estimate_room";
    return canPerformCollaborationAction(access, action) ? access : null;
  } catch {
    return null;
  }
}

function readAllowed(row: { allowed: number | boolean | null } | null) {
  return row?.allowed === true || row?.allowed === 1;
}

async function runAllowedProbe(operation: () => Promise<{ allowed: number | boolean | null } | null>) {
  try {
    return readAllowed(await operation());
  } catch {
    return false;
  }
}

async function runBooleanProbe(operation: () => Promise<boolean>) {
  try {
    return await operation();
  } catch {
    return false;
  }
}

export async function readProjectFromD1(db: D1DatabaseLike, projectId: string) {
  return db
    .prepare<D1ProjectAccessRow>(
      `
        SELECT id, workspace_id
        FROM projects
        WHERE id = ?
        LIMIT 1
      `,
    )
    .bind(projectId)
    .first<D1ProjectAccessRow>();
}

export async function readProjectInWorkspaceFromD1(db: D1DatabaseLike, projectId: string, workspaceId: string) {
  return db
    .prepare<D1ProjectAccessRow>(
      `
        SELECT id, workspace_id
        FROM projects
        WHERE id = ?
          AND workspace_id = ?
        LIMIT 1
      `,
    )
    .bind(projectId, workspaceId)
    .first<D1ProjectAccessRow>();
}

export async function readEstimateInProjectFromD1(db: D1DatabaseLike, estimateId: string, projectId: string) {
  return db
    .prepare<D1EstimateAccessRow>(
      `
        SELECT id, project_id
        FROM estimates
        WHERE id = ?
          AND project_id = ?
        LIMIT 1
      `,
    )
    .bind(estimateId, projectId)
    .first<D1EstimateAccessRow>();
}

export async function readEstimateRowItemInEstimateFromD1(db: D1DatabaseLike, rowItemId: string, estimateId: string) {
  return db
    .prepare<D1EstimateRowItemAccessRow>(
      `
        SELECT id, estimate_id
        FROM estimate_row_items
        WHERE id = ?
          AND estimate_id = ?
        LIMIT 1
      `,
    )
    .bind(rowItemId, estimateId)
    .first<D1EstimateRowItemAccessRow>();
}

export async function canAccessProjectInD1(
  db: D1DatabaseLike,
  projectId: string,
  user: CurrentUserAccessContext,
) {
  if (isPlatformAdmin(user)) return true;
  return runAllowedProbe(() =>
    db
      .prepare<{ allowed: number }>(
        `
        SELECT 1 AS allowed
        FROM projects project
        WHERE project.id = ?
          ${ACTIVE_WORKSPACE_CORPORATE_ACCOUNT_PREDICATE}
          AND (
            EXISTS (
              SELECT 1
              FROM workspace_members workspace_member
              WHERE workspace_member.workspace_id = project.workspace_id
                AND workspace_member.user_id = ?
            )
            OR EXISTS (
              SELECT 1
              FROM project_members project_member
              WHERE project_member.project_id = project.id
                AND project_member.user_id = ?
            )
            OR EXISTS (
              SELECT 1
              FROM estimate_sheet_members sheet_member
              WHERE sheet_member.project_id = project.id
                AND sheet_member.user_id = ?
            )
          )
        LIMIT 1
      `,
      )
      .bind(projectId, user.userId, user.userId, user.userId)
      .first<{ allowed: number }>(),
  );
}

export async function canAccessWholeProjectInD1(
  db: D1DatabaseLike,
  projectId: string,
  user: CurrentUserAccessContext,
) {
  if (isPlatformAdmin(user)) return true;
  return runAllowedProbe(() =>
    db
      .prepare<{ allowed: number }>(
        `
        SELECT 1 AS allowed
        FROM projects project
        WHERE project.id = ?
          ${ACTIVE_WORKSPACE_CORPORATE_ACCOUNT_PREDICATE}
          AND (
            EXISTS (
              SELECT 1
              FROM workspace_members workspace_member
              WHERE workspace_member.workspace_id = project.workspace_id
                AND workspace_member.user_id = ?
            )
            OR EXISTS (
              SELECT 1
              FROM project_members project_member
              WHERE project_member.project_id = project.id
                AND project_member.user_id = ?
            )
          )
        LIMIT 1
      `,
      )
      .bind(projectId, user.userId, user.userId)
      .first<{ allowed: number }>(),
  );
}

async function readProjectEditAllowedInD1(
  db: D1DatabaseLike,
  projectId: string,
  user: CurrentUserAccessContext,
) {
  if (isPlatformAdmin(user)) return true;
  const row = await db
    .prepare<{ allowed: number }>(
      `
        SELECT 1 AS allowed
        FROM projects project
        WHERE project.id = ?
          ${ACTIVE_WORKSPACE_CORPORATE_ACCOUNT_PREDICATE}
          AND (
            EXISTS (
              SELECT 1
              FROM workspace_members workspace_member
              WHERE workspace_member.workspace_id = project.workspace_id
                AND workspace_member.user_id = ?
                AND workspace_member.role IN ('owner', 'admin', 'member')
            )
            OR EXISTS (
              SELECT 1
              FROM project_members project_member
              WHERE project_member.project_id = project.id
                AND project_member.user_id = ?
                AND project_member.role IN ('owner', 'admin', 'editor')
            )
          )
        LIMIT 1
      `,
    )
    .bind(projectId, user.userId, user.userId)
    .first<{ allowed: number }>();
  return readAllowed(row);
}

export async function canEditProjectStrictInD1(
  db: D1DatabaseLike,
  projectId: string,
  user: CurrentUserAccessContext,
) {
  return readProjectEditAllowedInD1(db, projectId, user);
}

export async function canEditProjectInD1(
  db: D1DatabaseLike,
  projectId: string,
  user: CurrentUserAccessContext,
) {
  return runBooleanProbe(() => readProjectEditAllowedInD1(db, projectId, user));
}

export async function canAccessEstimateInD1(
  db: D1DatabaseLike,
  estimateId: string,
  user: CurrentUserAccessContext,
) {
  if (isPlatformAdmin(user)) return true;
  return runAllowedProbe(() =>
    db
      .prepare<{ allowed: number }>(
        `
        SELECT 1 AS allowed
        FROM estimates estimate
        JOIN projects project ON project.id = estimate.project_id
        LEFT JOIN estimate_sheet_access_settings access
          ON access.estimate_id = estimate.id
        WHERE estimate.id = ?
          ${ACTIVE_WORKSPACE_CORPORATE_ACCOUNT_PREDICATE}
          AND (
            EXISTS (
              SELECT 1
              FROM estimate_sheet_members sheet_member
              WHERE sheet_member.estimate_id = estimate.id
                AND sheet_member.user_id = ?
            )
            OR (
              COALESCE(access.inherit_project_access, 1) = 1
              AND (
                EXISTS (
                  SELECT 1
                  FROM workspace_members workspace_member
                  WHERE workspace_member.workspace_id = project.workspace_id
                    AND workspace_member.user_id = ?
                )
                OR EXISTS (
                  SELECT 1
                  FROM project_members project_member
                  WHERE project_member.project_id = project.id
                    AND project_member.user_id = ?
                )
              )
            )
          )
        LIMIT 1
      `,
      )
      .bind(estimateId, user.userId, user.userId, user.userId)
      .first<{ allowed: number }>(),
  );
}

async function readEstimateEditAllowedInD1(
  db: D1DatabaseLike,
  estimateId: string,
  user: CurrentUserAccessContext,
) {
  if (isPlatformAdmin(user)) return true;
  const row = await db
    .prepare<{ allowed: number }>(
      `
        SELECT 1 AS allowed
        FROM estimates estimate
        JOIN projects project ON project.id = estimate.project_id
        LEFT JOIN estimate_sheet_access_settings access
          ON access.estimate_id = estimate.id
        WHERE estimate.id = ?
          ${ACTIVE_WORKSPACE_CORPORATE_ACCOUNT_PREDICATE}
          AND (
            EXISTS (
              SELECT 1
              FROM estimate_sheet_members sheet_member
              WHERE sheet_member.estimate_id = estimate.id
                AND sheet_member.user_id = ?
                AND sheet_member.role IN ('owner', 'admin', 'editor')
            )
            OR (
              COALESCE(access.inherit_project_access, 1) = 1
              AND (
                EXISTS (
                  SELECT 1
                  FROM workspace_members workspace_member
                  WHERE workspace_member.workspace_id = project.workspace_id
                    AND workspace_member.user_id = ?
                    AND workspace_member.role IN ('owner', 'admin', 'member')
                )
                OR EXISTS (
                  SELECT 1
                  FROM project_members project_member
                  WHERE project_member.project_id = project.id
                    AND project_member.user_id = ?
                    AND project_member.role IN ('owner', 'admin', 'editor')
                )
              )
            )
          )
        LIMIT 1
      `,
    )
    .bind(estimateId, user.userId, user.userId, user.userId)
    .first<{ allowed: number }>();
  return readAllowed(row);
}

export async function canEditEstimateStrictInD1(
  db: D1DatabaseLike,
  estimateId: string,
  user: CurrentUserAccessContext,
) {
  return readEstimateEditAllowedInD1(db, estimateId, user);
}

export async function canEditEstimateInD1(
  db: D1DatabaseLike,
  estimateId: string,
  user: CurrentUserAccessContext,
) {
  return runBooleanProbe(() => readEstimateEditAllowedInD1(db, estimateId, user));
}

export async function isWorkspaceEditorInD1(
  db: D1DatabaseLike,
  workspaceId: string,
  user: CurrentUserAccessContext,
) {
  if (isPlatformAdmin(user)) return true;
  return runAllowedProbe(() =>
    db
      .prepare<{ allowed: number }>(
        `
        SELECT 1 AS allowed
        FROM workspace_members workspace_member
        INNER JOIN workspaces workspace ON workspace.id = workspace_member.workspace_id
        LEFT JOIN corporate_accounts corporate_account ON corporate_account.id = workspace.corporate_account_id
        WHERE workspace_member.workspace_id = ?
          AND workspace_member.user_id = ?
          AND workspace_member.role IN ('owner', 'admin', 'member')
          AND (workspace.corporate_account_id IS NULL OR corporate_account.status = 'active')
        LIMIT 1
      `,
      )
      .bind(workspaceId, user.userId)
      .first<{ allowed: number }>(),
  );
}

export async function isWorkspaceMemberInD1(
  db: D1DatabaseLike,
  workspaceId: string,
  user: CurrentUserAccessContext,
) {
  return runAllowedProbe(() =>
    db
      .prepare<{ allowed: number }>(
        `
        SELECT 1 AS allowed
        FROM workspace_members workspace_member
        INNER JOIN workspaces workspace ON workspace.id = workspace_member.workspace_id
        LEFT JOIN corporate_accounts corporate_account ON corporate_account.id = workspace.corporate_account_id
        WHERE workspace_member.workspace_id = ?
          AND workspace_member.user_id = ?
          AND workspace_member.role IN ('owner', 'admin', 'member')
          AND (workspace.corporate_account_id IS NULL OR corporate_account.status = 'active')
        LIMIT 1
      `,
      )
      .bind(workspaceId, user.userId)
      .first<{ allowed: number }>(),
  );
}
