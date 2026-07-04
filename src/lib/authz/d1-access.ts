import "server-only";

import { isPlatformAdminRole } from "@/lib/auth/roles";
import type { CurrentUserContext } from "@/lib/auth/session";
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

function isPlatformAdmin(user: CurrentUserAccessContext) {
  return isPlatformAdminRole(user.role);
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
          AND (
            project.created_by = ?
            OR
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
      .bind(projectId, user.userId, user.userId, user.userId, user.userId)
      .first<{ allowed: number }>(),
  );
}

export async function canEditProjectInD1(
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
          AND (
            project.created_by = ?
            OR
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
      .bind(projectId, user.userId, user.userId, user.userId)
      .first<{ allowed: number }>(),
  );
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
          AND (
            estimate.created_by = ?
            OR
            EXISTS (
              SELECT 1
              FROM estimate_sheet_members sheet_member
              WHERE sheet_member.estimate_id = estimate.id
                AND sheet_member.user_id = ?
            )
            OR (
              COALESCE(access.inherit_project_access, 1) = 1
              AND (
                project.created_by = ?
                OR
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
      .bind(estimateId, user.userId, user.userId, user.userId, user.userId, user.userId)
      .first<{ allowed: number }>(),
  );
}

export async function canEditEstimateInD1(
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
          AND (
            estimate.created_by = ?
            OR
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
                project.created_by = ?
                OR
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
      .bind(estimateId, user.userId, user.userId, user.userId, user.userId, user.userId)
      .first<{ allowed: number }>(),
  );
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
        WHERE workspace_member.workspace_id = ?
          AND workspace_member.user_id = ?
          AND workspace_member.role IN ('owner', 'admin', 'member')
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
        WHERE workspace_member.workspace_id = ?
          AND workspace_member.user_id = ?
          AND workspace_member.role IN ('owner', 'admin', 'member')
        LIMIT 1
      `,
      )
      .bind(workspaceId, user.userId)
      .first<{ allowed: number }>(),
  );
}
