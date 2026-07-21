"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";

import { requireAuth } from "@/lib/auth/session";
import { getCloudflareD1Database, type D1DatabaseLike, type D1Value } from "@/lib/cloudflare/d1";
import { isUuid } from "@/lib/ids";
import { normalizeBulkActionIds } from "@/lib/mass-deletion/bulk-action";
import { ensureDefaultWorkspace } from "@/lib/repositories/workspace-repository";
// Caps come from the shared (non-"use server") module so the Phase-4 popover
// imports the SAME values (§2.0) — never re-declare them locally (Task 8 guard).
import {
  MAX_BULK_ASSIGN_PROJECTS,
  MAX_PROJECT_GROUP_NAME_LENGTH,
  MAX_PROJECT_GROUPS,
} from "@/lib/workshop/group-constants";
// Typed errors + result shape live in a plain (non-"use server") module: Next.js only
// allows async-function exports from a "use server" file, so a class/type export here is
// a build error. Imported back here to throw / annotate the bulk return.
import {
  ProjectGroupCapError,
  ProjectGroupNameError,
  type BulkAssignProjectsToGroupResult,
} from "@/lib/workshop/group-action-types";

type ProjectOwnershipRow = {
  id: string;
  workspace_id: string;
  created_by: string | null;
};

const MAX_PROJECTS_PER_GROUP_REORDER = 500;

function assertUuid(value: string, label: string) {
  if (!isUuid(value)) throw new Error(`${label} is invalid.`);
}

// Mirrors group-accent.ts GroupAccentId while keeping this server action
// decoupled from the client/UI palette module.
function isAllowedAccentId(accentId: string) {
  return (
    accentId === "slate" ||
    accentId === "stone" ||
    accentId === "sage" ||
    accentId === "teal" ||
    accentId === "indigo" ||
    accentId === "plum" ||
    accentId === "rose" ||
    accentId === "clay"
  );
}

function isUniqueViolation(error: unknown): boolean {
  return Boolean(error) && typeof error === "object" && (error as { code?: string }).code === "23505";
}

// LD-8: only a name-index 23505 is a duplicate-name error; the membership
// unique(user_id, project_id) constraint also raises 23505 and must not be
// mistranslated into "name already exists". Disambiguate by constraint name.
function isDuplicateNameViolation(error: unknown): boolean {
  const detail = `${(error as { constraint?: string }).constraint ?? ""} ${
    (error as { message?: string }).message ?? ""
  } ${(error as { details?: string }).details ?? ""}`.toLowerCase();
  const isD1UniqueViolation = detail.includes("unique constraint") || detail.includes("constraint failed");
  if (!isUniqueViolation(error) && !isD1UniqueViolation) return false;
  return detail.includes("lower_name")
    || detail.includes("project_groups_user_workspace_lower_name_idx")
    || detail.includes("name");
}

function normalizeGroupName(rawName: string): string {
  const name = rawName.trim();
  if (name.length === 0) throw new ProjectGroupNameError("Group name is required.");
  if (name.length > MAX_PROJECT_GROUP_NAME_LENGTH) {
    throw new ProjectGroupNameError(`Group names are limited to ${MAX_PROJECT_GROUP_NAME_LENGTH} characters.`);
  }
  return name;
}

function normalizeAccentId(accentId: string | null | undefined): string | null {
  if (accentId === null || accentId === undefined) return null;
  if (!isAllowedAccentId(accentId)) {
    throw new Error("Group accent is invalid.");
  }
  return accentId;
}

function revalidateWorkshop() {
  revalidatePath("/workshop");
  revalidatePath("/workshop/projects");
}

async function requireGroupActionsD1Database() {
  const database = await getCloudflareD1Database();
  if (!database) throw new Error("Something went wrong. Try again in a moment.");
  return database;
}

async function first<T>(database: D1DatabaseLike, sql: string, values: D1Value[] = []) {
  return database.prepare<T>(sql).bind(...values).first<T>();
}

async function all<T>(database: D1DatabaseLike, sql: string, values: D1Value[] = []) {
  const result = await database.prepare<T>(sql).bind(...values).all<T>();
  if (result.success === false) throw new Error("Project group read failed.");
  return result.results ?? [];
}

async function run(database: D1DatabaseLike, sql: string, values: D1Value[] = []) {
  const result = await database.prepare(sql).bind(...values).run();
  if (result.success === false) throw new Error("Project group write failed.");
  return result;
}

function placeholders(count: number) {
  return Array.from({ length: count }, () => "?").join(", ");
}

function haveSameStringSet(first: readonly string[], second: readonly string[]) {
  if (first.length !== second.length) return false;
  const values = new Set(first);
  if (values.size !== second.length) return false;
  return second.every((value) => values.has(value));
}

// LD-2 ownership gate — mirrors the repository `owned` derivation
// (workspace-repository.ts createWorkshopProjectAccessResolver): in-workspace AND
// (member of the workspace OR created_by === user). created_by is NULLABLE, so the
// workspace-role path is what keeps a created_by-IS-NULL project assignable. Do NOT
// collapse to a bare created_by SQL equality on profile.id — that misses both cases.
async function resolveWorkspaceRole(
  database: D1DatabaseLike,
  workspaceId: string,
  userId: string,
): Promise<boolean> {
  const row = await first<{ role: string }>(
    database,
    `SELECT role
     FROM workspace_members
     WHERE workspace_id = ?
       AND user_id = ?
     LIMIT 1`,
    [workspaceId, userId],
  );
  return Boolean(row?.role); // membership of the workspace ⇒ owns its projects
}

// Returns the subset of `projectIds` the user OWNS in this workspace, each with its
// verified workspace_id (FK-safe membership stamping). Reads created_by and applies
// the repo predicate in app code so NULL created_by + workspace-role ownership are
// both honored. Reused by move + bulkAssign.
async function verifyOwnedProjectIds(
  database: D1DatabaseLike,
  projectIds: readonly string[],
  workspaceId: string,
  userId: string,
): Promise<Array<{ id: string; workspace_id: string }>> {
  if (projectIds.length === 0) return [];
  const hasWorkspaceRole = await resolveWorkspaceRole(database, workspaceId, userId);

  const rows = await all<ProjectOwnershipRow>(
    database,
    `SELECT id, workspace_id, created_by
     FROM projects
     WHERE workspace_id = ?
       AND id IN (${placeholders(projectIds.length)})`,
    [workspaceId, ...projectIds],
  );

  return rows
    .filter((row) => hasWorkspaceRole || row.created_by === userId)
    .map((row) => ({ id: row.id, workspace_id: row.workspace_id }));
}

// Stub bodies replaced task-by-task below. Each throws until implemented so the
// failing tests are honest (not silent no-ops).
export async function createProjectGroup(input: {
  name: string;
  accentId?: string | null;
}): Promise<{ id: string }> {
  await requireAuth();
  const name = normalizeGroupName(input.name);
  const accentId = normalizeAccentId(input.accentId);

  const { workspace, profile } = await ensureDefaultWorkspace();
  const database = await requireGroupActionsD1Database();

  // Cap: 50 groups per user per workspace (Q2 soft-cap; app-layer only).
  const countRow = await first<{ count: number }>(
    database,
    `SELECT COUNT(*) AS count
     FROM project_groups
     WHERE user_id = ?
       AND workspace_id = ?`,
    [profile.id, workspace.id],
  );
  if ((countRow?.count ?? 0) >= MAX_PROJECT_GROUPS) {
    throw new ProjectGroupCapError(
      `You can have at most ${MAX_PROJECT_GROUPS} groups. Delete one to add another.`,
    );
  }

  // position = max(existing) + 1 (append to end). Highest first, take one row.
  const lastRow = await first<{ position: number | null }>(
    database,
    `SELECT position
     FROM project_groups
     WHERE user_id = ?
       AND workspace_id = ?
     ORDER BY position DESC
     LIMIT 1`,
    [profile.id, workspace.id],
  );
  const nextPosition = lastRow ? (lastRow.position ?? 0) + 1 : 0;
  const id = randomUUID();
  const now = new Date().toISOString();

  try {
    await run(
      database,
      `INSERT INTO project_groups (
         id,
         workspace_id,
         user_id,
         name,
         accent_id,
         position,
         created_at,
         updated_at
       )
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [id, workspace.id, profile.id, name, accentId, nextPosition, now, now],
    );
  } catch (insertError) {
    // A name-index 23505 ⇒ duplicate name; any other 23505 (or error) rethrows raw.
    if (isDuplicateNameViolation(insertError)) {
      throw new ProjectGroupNameError("A group with this name already exists.");
    }
    throw insertError;
  }

  revalidateWorkshop();
  return { id };
}

export async function renameProjectGroup(input: { groupId: string; name: string }): Promise<void> {
  await requireAuth();
  assertUuid(input.groupId, "Group");
  const name = normalizeGroupName(input.name);

  const { workspace, profile } = await ensureDefaultWorkspace();
  const database = await requireGroupActionsD1Database();

  try {
    await run(
      database,
      `UPDATE project_groups
       SET name = ?,
           updated_at = ?
       WHERE id = ?
         AND user_id = ?
         AND workspace_id = ?`,
      [name, new Date().toISOString(), input.groupId, profile.id, workspace.id],
    );
  } catch (error) {
    if (isDuplicateNameViolation(error)) {
      throw new ProjectGroupNameError("A group with this name already exists.");
    }
    throw error;
  }

  revalidateWorkshop();
}

export async function recolorProjectGroup(input: {
  groupId: string;
  accentId: string | null;
}): Promise<void> {
  await requireAuth();
  assertUuid(input.groupId, "Group");
  const accentId = normalizeAccentId(input.accentId);

  const { workspace, profile } = await ensureDefaultWorkspace();
  const database = await requireGroupActionsD1Database();

  await run(
    database,
    `UPDATE project_groups
     SET accent_id = ?,
         updated_at = ?
     WHERE id = ?
       AND user_id = ?
       AND workspace_id = ?`,
    [accentId, new Date().toISOString(), input.groupId, profile.id, workspace.id],
  );
  revalidateWorkshop();
}

export async function deleteProjectGroup(input: { groupId: string }): Promise<void> {
  await requireAuth();
  assertUuid(input.groupId, "Group");

  const { workspace, profile } = await ensureDefaultWorkspace();
  const database = await requireGroupActionsD1Database();

  // Delete only the group definition. Membership rows cascade (ON DELETE CASCADE
  // on project_group_memberships.group_id) -> projects fall to virtual Ungrouped.
  // This NEVER deletes any project (D10).
  await run(
    database,
    `DELETE FROM project_groups
     WHERE id = ?
       AND user_id = ?
       AND workspace_id = ?`,
    [input.groupId, profile.id, workspace.id],
  );
  revalidateWorkshop();
}

export async function reorderProjectGroups(input: { orderedGroupIds: string[] }): Promise<void> {
  await requireAuth();
  // Bound the batch (mirror the bulk-assign cap) so a caller cannot force an
  // unbounded fan-out of UPDATEs. A user can have at most MAX_PROJECT_GROUPS groups.
  if (input.orderedGroupIds.length > MAX_PROJECT_GROUPS) {
    throw new Error(`Cannot reorder more than ${MAX_PROJECT_GROUPS} groups at once.`);
  }
  for (const id of input.orderedGroupIds) {
    assertUuid(id, "Group");
  }
  if (input.orderedGroupIds.length === 0) return;

  const { workspace, profile } = await ensureDefaultWorkspace();
  const database = await requireGroupActionsD1Database();

  const now = new Date().toISOString();
  await Promise.all(
    input.orderedGroupIds.map((groupId, index) =>
      run(
        database,
        `UPDATE project_groups
         SET position = ?,
             updated_at = ?
         WHERE id = ?
           AND user_id = ?
           AND workspace_id = ?`,
        [index, now, groupId, profile.id, workspace.id],
      ),
    ),
  );

  revalidateWorkshop();
}

export async function reorderProjectsInGroup(input: {
  groupId: string;
  orderedProjectIds: string[];
}): Promise<void> {
  await requireAuth();
  assertUuid(input.groupId, "Group");
  if (input.orderedProjectIds.length === 0) return;
  if (input.orderedProjectIds.length > MAX_PROJECTS_PER_GROUP_REORDER) {
    throw new Error(`Cannot reorder more than ${MAX_PROJECTS_PER_GROUP_REORDER} projects at once.`);
  }
  const uniqueProjectIds = new Set(input.orderedProjectIds);
  if (uniqueProjectIds.size !== input.orderedProjectIds.length) {
    throw new Error("Project order cannot contain duplicates.");
  }
  for (const projectId of input.orderedProjectIds) {
    assertUuid(projectId, "Project");
  }

  const { workspace, profile } = await ensureDefaultWorkspace();
  const database = await requireGroupActionsD1Database();

  const group = await first<{ id: string }>(
    database,
    `SELECT id
     FROM project_groups
     WHERE id = ?
       AND user_id = ?
       AND workspace_id = ?
     LIMIT 1`,
    [input.groupId, profile.id, workspace.id],
  );
  if (!group) throw new Error("Group was not found in this workspace.");

  const currentMemberships = await all<{ project_id: string }>(
    database,
    `SELECT project_id
     FROM project_group_memberships
     WHERE group_id = ?
       AND user_id = ?
       AND workspace_id = ?
     ORDER BY position ASC, created_at ASC, project_id ASC`,
    [input.groupId, profile.id, workspace.id],
  );
  const currentProjectIds = currentMemberships.map((membership) => membership.project_id);
  if (!haveSameStringSet(input.orderedProjectIds, currentProjectIds)) {
    throw new Error("Project order is stale. Refresh and try again.");
  }

  const now = new Date().toISOString();
  await Promise.all(
    input.orderedProjectIds.map((projectId, index) =>
      run(
        database,
        `UPDATE project_group_memberships
         SET position = ?,
             updated_at = ?
         WHERE group_id = ?
           AND user_id = ?
           AND workspace_id = ?
           AND project_id = ?`,
        [index, now, input.groupId, profile.id, workspace.id, projectId],
      ),
    ),
  );

  revalidateWorkshop();
}

export async function moveProjectToGroup(input: {
  projectId: string;
  groupId: string | null;
}): Promise<void> {
  await requireAuth();
  assertUuid(input.projectId, "Project");

  const { workspace, profile } = await ensureDefaultWorkspace();
  const database = await requireGroupActionsD1Database();

  // D9 assign gate = the LD-2 ownership gate (§1.5): in-workspace AND (workspace-role
  // member OR created_by === user), with created_by NULLABLE. Independent of delete
  // eligibility, so a project delete-blocked by an active shared link is still
  // groupable. Use the shared helper, NOT a bare created_by SQL equality on profile.id —
  // that would refuse an owned-via-workspace-role project and drop a created_by-IS-NULL
  // one. The membership's workspace_id is stamped from the verified project row so the
  // composite FK (project_id, workspace_id) → projects(id, workspace_id) is satisfiable.
  const [project] = await verifyOwnedProjectIds(database, [input.projectId], workspace.id, profile.id);
  if (!project) throw new Error("Project was not found in this workspace.");

  // Remove == delete the membership row (project falls to virtual Ungrouped).
  if (input.groupId === null) {
    await run(
      database,
      `DELETE FROM project_group_memberships
       WHERE user_id = ?
         AND project_id = ?`,
      [profile.id, project.id],
    );
    revalidateWorkshop();
    return;
  }

  // Move == upsert. Verify the target group is owned + in-workspace first.
  assertUuid(input.groupId, "Group");
  const group = await first<{ id: string }>(
    database,
    `SELECT id
     FROM project_groups
     WHERE id = ?
       AND user_id = ?
       AND workspace_id = ?
     LIMIT 1`,
    [input.groupId, profile.id, workspace.id],
  );
  if (!group) throw new Error("Group was not found in this workspace.");

  await upsertProjectGroupMembership(database, {
    groupId: group.id,
    workspaceId: project.workspace_id,
    userId: profile.id,
    projectId: project.id,
  });
  revalidateWorkshop();
}

export async function bulkAssignProjectsToGroup(input: {
  projectIds: string[];
  groupId: string | null;
}): Promise<BulkAssignProjectsToGroupResult> {
  await requireAuth();
  const { ids, issues } = normalizeBulkActionIds(input.projectIds, {
    label: "projects",
    max: MAX_BULK_ASSIGN_PROJECTS,
  });
  const blocking = issues.find(
    (issue) =>
      issue.code === "empty_selection" ||
      issue.code === "invalid_id" ||
      issue.code === "batch_limit_exceeded",
  );
  if (blocking) throw new Error(blocking.message);

  const { workspace, profile } = await ensureDefaultWorkspace();
  const database = await requireGroupActionsD1Database();

  // Batched LD-2 OWNERSHIP verify (§1.5): only ids the user OWNS — in-workspace AND
  // (workspace-role member OR created_by === user), created_by nullable. NOT a bare
  // created_by SQL equality (would refuse owned-via-role + null-created_by rows). Each
  // verified row carries its workspace_id so membership rows are composite-FK-safe.
  const verified = await verifyOwnedProjectIds(database, ids, workspace.id, profile.id);
  const verifiedIds = verified.map((row) => row.id);
  // LD-11: anything requested-but-not-verified is "skipped" (forged/foreign/non-owned).
  const verifiedSet = new Set(verifiedIds);
  const skippedProjectIds = ids.filter((id) => !verifiedSet.has(id));

  if (input.groupId === null) {
    // LD-8 remove path: zero-verify is a NO-OP (not a throw) — removing membership
    // from no eligible projects is a benign idempotent outcome.
    if (verifiedIds.length === 0) {
      return { movedProjectIds: [], skippedProjectIds };
    }
    await run(
      database,
      `DELETE FROM project_group_memberships
       WHERE user_id = ?
         AND project_id IN (${placeholders(verifiedIds.length)})`,
      [profile.id, ...verifiedIds],
    );
    revalidateWorkshop();
    return { movedProjectIds: verifiedIds, skippedProjectIds };
  }

  // Assign path: zero-verify IS an error (the user asked to group projects and none
  // were eligible) — honest failure to surface.
  if (verifiedIds.length === 0) {
    throw new Error("None of the selected projects were found in this workspace.");
  }

  assertUuid(input.groupId, "Group");
  const group = await first<{ id: string }>(
    database,
    `SELECT id
     FROM project_groups
     WHERE id = ?
       AND user_id = ?
       AND workspace_id = ?
     LIMIT 1`,
    [input.groupId, profile.id, workspace.id],
  );
  if (!group) throw new Error("Group was not found in this workspace.");

  for (const project of verified) {
    await upsertProjectGroupMembership(database, {
      groupId: group.id,
      // workspace_id from the verified project row (composite-FK-safe), not ensureDefaultWorkspace.
      workspaceId: project.workspace_id,
      userId: profile.id,
      projectId: project.id,
    });
  }
  revalidateWorkshop();
  return { movedProjectIds: verifiedIds, skippedProjectIds };
}

async function upsertProjectGroupMembership(
  database: D1DatabaseLike,
  {
    groupId,
    workspaceId,
    userId,
    projectId,
  }: {
    groupId: string;
    workspaceId: string;
    userId: string;
    projectId: string;
  },
) {
  const now = new Date().toISOString();
  const existingMembership = await first<{ group_id: string; position: number | null }>(
    database,
    `SELECT group_id, position
     FROM project_group_memberships
     WHERE user_id = ?
       AND project_id = ?
     LIMIT 1`,
    [userId, projectId],
  );
  const lastPosition = await first<{ position: number | null }>(
    database,
    `SELECT position
     FROM project_group_memberships
     WHERE workspace_id = ?
       AND user_id = ?
       AND group_id = ?
     ORDER BY position DESC
     LIMIT 1`,
    [workspaceId, userId, groupId],
  );
  const nextPosition =
    existingMembership?.group_id === groupId
      ? (existingMembership.position ?? 0)
      : (lastPosition?.position ?? -1) + 1;

  await run(
    database,
    `INSERT INTO project_group_memberships (
       id,
       group_id,
       workspace_id,
       user_id,
       project_id,
       position,
       created_at,
       updated_at
     )
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT(user_id, project_id) DO UPDATE SET
       group_id = excluded.group_id,
       workspace_id = excluded.workspace_id,
       position = excluded.position,
       updated_at = excluded.updated_at`,
    [randomUUID(), groupId, workspaceId, userId, projectId, nextPosition, now, now],
  );
}
