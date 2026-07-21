import "server-only";

import { getCloudflareD1Database, type D1DatabaseLike } from "@/lib/cloudflare/d1";

export type AccountWorkspaceMembershipSource = "workspace" | "project" | "estimate";

export type AccountWorkspaceMembership = {
  source: AccountWorkspaceMembershipSource;
  workspaceId: string;
  role: string | null;
};

function isMissingOptionalCollaborationTable(error: unknown) {
  if (!error || typeof error !== "object") return false;
  const code = "code" in error && typeof error.code === "string" ? error.code : "";
  const message = "message" in error && typeof error.message === "string" ? error.message.toLowerCase() : "";
  return code === "42P01" || message.includes("does not exist") || message.includes("no such table") || message.includes("schema cache");
}

type WorkspaceMembershipD1Row = {
  workspace_id: string;
  role: string | null;
};

type ProjectMembershipD1Row = {
  workspace_id: string;
  role: string | null;
};

type EstimateMembershipD1Row = {
  project_id: string;
  role: string | null;
};

async function firstOptional<T>(db: D1DatabaseLike, sql: string, userId: string): Promise<T | null> {
  try {
    return await db.prepare<T>(sql).bind(userId).first<T>();
  } catch (error) {
    if (isMissingOptionalCollaborationTable(error)) return null;
    throw error;
  }
}

export async function readFirstAccountWorkspaceMembership(userId: string): Promise<AccountWorkspaceMembership | null> {
  const db = await getCloudflareD1Database();
  if (!db) throw new Error("Something went wrong. Try again in a moment.");

  const workspaceMembership = await db
    .prepare<WorkspaceMembershipD1Row>(`
      SELECT membership.workspace_id AS workspace_id, membership.role AS role
      FROM workspace_members AS membership
      INNER JOIN workspaces AS workspace
        ON workspace.id = membership.workspace_id
      WHERE membership.user_id = ?
        AND workspace.closed_at IS NULL
      ORDER BY membership.created_at ASC
      LIMIT 1
    `)
    .bind(userId)
    .first<WorkspaceMembershipD1Row>();

  if (workspaceMembership?.workspace_id) {
    return {
      source: "workspace",
      workspaceId: workspaceMembership.workspace_id,
      role: workspaceMembership.role ?? null,
    };
  }

  const projectMembership = await firstOptional<ProjectMembershipD1Row>(
    db,
    `
      SELECT project_member.workspace_id AS workspace_id, project_member.role AS role
      FROM project_members AS project_member
      INNER JOIN workspaces AS workspace
        ON workspace.id = project_member.workspace_id
      WHERE project_member.user_id = ?
        AND workspace.closed_at IS NULL
      ORDER BY project_member.created_at ASC
      LIMIT 1
    `,
    userId,
  );
  if (projectMembership?.workspace_id) {
    return {
      source: "project",
      workspaceId: projectMembership.workspace_id,
      role: projectMembership.role ?? null,
    };
  }

  const estimateMembership = await firstOptional<EstimateMembershipD1Row>(
    db,
    `
      SELECT project_id, role
      FROM estimate_sheet_members
      WHERE user_id = ?
      ORDER BY created_at ASC
      LIMIT 1
    `,
    userId,
  );

  if (!estimateMembership?.project_id) return null;

  const project = await db
    .prepare<{ workspace_id: string | null }>(
      `
        SELECT project.workspace_id AS workspace_id
        FROM projects AS project
        INNER JOIN workspaces AS workspace
          ON workspace.id = project.workspace_id
        WHERE project.id = ?
          AND workspace.closed_at IS NULL
        LIMIT 1
      `,
    )
    .bind(estimateMembership.project_id)
    .first<{ workspace_id: string | null }>();
  if (!project?.workspace_id) {
    throw new Error("Estimate membership workspace is unavailable. Contact support.");
  }

  return {
    source: "estimate",
    workspaceId: project.workspace_id,
    role: estimateMembership.role ?? null,
  };
}
