"use server";

import { revalidatePath } from "next/cache";

import { isUuid } from "@/lib/ids";
import { normalizeBulkActionIds } from "@/lib/mass-deletion/bulk-action";
import { ensureDefaultWorkspace } from "@/lib/repositories/workspace-repository";
import { createSupabaseServerClient } from "@/lib/supabase/server";
// Caps come from the shared (non-"use server") module so the Phase-4 popover
// imports the SAME values (§2.0) — never re-declare them locally (Task 8 guard).
import {
  MAX_BULK_ASSIGN_PROJECTS,
  MAX_PROJECT_GROUP_NAME_LENGTH,
  MAX_PROJECT_GROUPS,
} from "@/lib/workshop/group-constants";

type SupabaseServerClient = Awaited<ReturnType<typeof createSupabaseServerClient>>;

// --- typed errors the client rollback layer (§5.5) distinguishes -------------
export class ProjectGroupCapError extends Error {} // thrown when the 50-group cap is hit
export class ProjectGroupNameError extends Error {} // empty / >40-char / duplicate name

// Result the client (§5.5) branches on to keep optimistic state for moved ids and
// roll back skipped ids (forged/foreign/non-owned ids that failed the LD-2 gate).
export type BulkAssignProjectsToGroupResult = {
  movedProjectIds: string[];
  skippedProjectIds: string[];
};

// --- accent allowlist (mirrors group-accent.ts GroupAccentId; validated here so
//     the action never persists a junk accent_id even though 7d owns the palette
//     file). Duplicated as a literal set on purpose: a "use server" action module
//     must not import a client/UI module, and the 8 tokens are a stable contract.
//     Task 3/8 source guard keeps the two lists in sync.
const ALLOWED_ACCENT_IDS = new Set<string>([
  "slate", "stone", "sage", "teal", "indigo", "plum", "rose", "clay",
]);

function assertUuid(value: string, label: string) {
  if (!isUuid(value)) throw new Error(`${label} is invalid.`);
}

function isUniqueViolation(error: unknown): boolean {
  return Boolean(error) && typeof error === "object" && (error as { code?: string }).code === "23505";
}

// LD-8: only a name-index 23505 is a duplicate-name error; the membership
// unique(user_id, project_id) constraint also raises 23505 and must not be
// mistranslated into "name already exists". Disambiguate by constraint name.
function isDuplicateNameViolation(error: unknown): boolean {
  if (!isUniqueViolation(error)) return false;
  const detail = `${(error as { constraint?: string }).constraint ?? ""} ${
    (error as { message?: string }).message ?? ""
  } ${(error as { details?: string }).details ?? ""}`.toLowerCase();
  return detail.includes("lower_name") || detail.includes("name");
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
  if (!ALLOWED_ACCENT_IDS.has(accentId)) {
    throw new Error("Group accent is invalid.");
  }
  return accentId;
}

function revalidateWorkshop() {
  revalidatePath("/workshop");
  revalidatePath("/workshop/projects");
}

// LD-2 ownership gate — mirrors the repository `owned` derivation
// (workspace-repository.ts createWorkshopProjectAccessResolver): in-workspace AND
// (member of the workspace OR created_by === user). created_by is NULLABLE, so the
// workspace-role path is what keeps a created_by-IS-NULL project assignable. Do NOT
// collapse to a bare created_by SQL equality on profile.id — that misses both cases.
async function resolveWorkspaceRole(
  supabase: SupabaseServerClient,
  workspaceId: string,
  userId: string,
): Promise<boolean> {
  const { data, error } = await supabase
    .from("workspace_members")
    .select("role")
    .eq("workspace_id", workspaceId)
    .eq("user_id", userId)
    .maybeSingle();
  if (error) throw error;
  return Boolean(data?.role); // membership of the workspace ⇒ owns its projects
}

// Returns the subset of `projectIds` the user OWNS in this workspace, each with its
// verified workspace_id (FK-safe membership stamping). Reads created_by and applies
// the repo predicate in app code so NULL created_by + workspace-role ownership are
// both honored. Reused by move + bulkAssign.
async function verifyOwnedProjectIds(
  supabase: SupabaseServerClient,
  projectIds: readonly string[],
  workspaceId: string,
  userId: string,
): Promise<Array<{ id: string; workspace_id: string }>> {
  if (projectIds.length === 0) return [];
  const hasWorkspaceRole = await resolveWorkspaceRole(supabase, workspaceId, userId);

  const { data, error } = await supabase
    .from("projects")
    .select("id, workspace_id, created_by")
    .in("id", projectIds)
    .eq("workspace_id", workspaceId);
  if (error) throw error;

  return (data ?? [])
    .filter((row) => hasWorkspaceRole || row.created_by === userId)
    .map((row) => ({ id: row.id, workspace_id: row.workspace_id }));
}

// Stub bodies replaced task-by-task below. Each throws until implemented so the
// failing tests are honest (not silent no-ops).
export async function createProjectGroup(input: {
  name: string;
  accentId?: string | null;
}): Promise<{ id: string }> {
  const name = normalizeGroupName(input.name);
  const accentId = normalizeAccentId(input.accentId);

  const { workspace, profile } = await ensureDefaultWorkspace();
  const supabase = await createSupabaseServerClient();

  // Cap: 50 groups per user per workspace (Q2 soft-cap; app-layer only).
  const { count, error: countError } = await supabase
    .from("project_groups")
    .select("id", { count: "exact", head: true })
    .eq("user_id", profile.id)
    .eq("workspace_id", workspace.id);

  if (countError) throw countError;
  if ((count ?? 0) >= MAX_PROJECT_GROUPS) {
    throw new ProjectGroupCapError(
      `You can have at most ${MAX_PROJECT_GROUPS} groups. Delete one to add another.`,
    );
  }

  // position = max(existing) + 1 (append to end). Highest first, take one row.
  const { data: lastRow, error: positionError } = await supabase
    .from("project_groups")
    .select("position")
    .eq("user_id", profile.id)
    .eq("workspace_id", workspace.id)
    .order("position", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (positionError) throw positionError;
  const nextPosition = lastRow ? (lastRow.position ?? 0) + 1 : 0;

  const { data: inserted, error: insertError } = await supabase
    .from("project_groups")
    .insert({
      workspace_id: workspace.id,
      user_id: profile.id,
      name,
      accent_id: accentId,
      position: nextPosition,
    })
    .select("id")
    .single();

  if (insertError) {
    // A name-index 23505 ⇒ duplicate name; any other 23505 (or error) rethrows raw.
    if (isDuplicateNameViolation(insertError)) {
      throw new ProjectGroupNameError("A group with this name already exists.");
    }
    throw insertError;
  }
  if (!inserted) throw new Error("Group could not be created.");

  revalidateWorkshop();
  return { id: inserted.id };
}

export async function renameProjectGroup(input: { groupId: string; name: string }): Promise<void> {
  assertUuid(input.groupId, "Group");
  const name = normalizeGroupName(input.name);

  const { workspace, profile } = await ensureDefaultWorkspace();
  const supabase = await createSupabaseServerClient();

  const { error } = await supabase
    .from("project_groups")
    .update({ name, updated_at: new Date().toISOString() })
    .eq("id", input.groupId)
    .eq("user_id", profile.id)
    .eq("workspace_id", workspace.id);

  if (error) {
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
  assertUuid(input.groupId, "Group");
  const accentId = normalizeAccentId(input.accentId);

  const { workspace, profile } = await ensureDefaultWorkspace();
  const supabase = await createSupabaseServerClient();

  const { error } = await supabase
    .from("project_groups")
    .update({ accent_id: accentId, updated_at: new Date().toISOString() })
    .eq("id", input.groupId)
    .eq("user_id", profile.id)
    .eq("workspace_id", workspace.id);

  if (error) throw error;
  revalidateWorkshop();
}

export async function deleteProjectGroup(input: { groupId: string }): Promise<void> {
  assertUuid(input.groupId, "Group");

  const { workspace, profile } = await ensureDefaultWorkspace();
  const supabase = await createSupabaseServerClient();

  // Delete only the group definition. Membership rows cascade (ON DELETE CASCADE
  // on project_group_memberships.group_id) -> projects fall to virtual Ungrouped.
  // This NEVER deletes any project (D10).
  const { error } = await supabase
    .from("project_groups")
    .delete()
    .eq("id", input.groupId)
    .eq("user_id", profile.id)
    .eq("workspace_id", workspace.id);

  if (error) throw error;
  revalidateWorkshop();
}

export async function reorderProjectGroups(input: { orderedGroupIds: string[] }): Promise<void> {
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
  const supabase = await createSupabaseServerClient();

  const now = new Date().toISOString();
  await Promise.all(
    input.orderedGroupIds.map((groupId, index) =>
      supabase
        .from("project_groups")
        .update({ position: index, updated_at: now })
        .eq("id", groupId)
        .eq("user_id", profile.id)
        .eq("workspace_id", workspace.id)
        .then(({ error }) => {
          if (error) throw error;
        }),
    ),
  );

  revalidateWorkshop();
}

export async function moveProjectToGroup(input: {
  projectId: string;
  groupId: string | null;
}): Promise<void> {
  assertUuid(input.projectId, "Project");

  const { workspace, profile } = await ensureDefaultWorkspace();
  const supabase = await createSupabaseServerClient();

  // D9 assign gate = the LD-2 ownership gate (§1.5): in-workspace AND (workspace-role
  // member OR created_by === user), with created_by NULLABLE. Independent of delete
  // eligibility, so a project delete-blocked by an active shared link is still
  // groupable. Use the shared helper, NOT a bare created_by SQL equality on profile.id —
  // that would refuse an owned-via-workspace-role project and drop a created_by-IS-NULL
  // one. The membership's workspace_id is stamped from the verified project row so the
  // composite FK (project_id, workspace_id) → projects(id, workspace_id) is satisfiable.
  const [project] = await verifyOwnedProjectIds(supabase, [input.projectId], workspace.id, profile.id);
  if (!project) throw new Error("Project was not found in this workspace.");

  // Remove == delete the membership row (project falls to virtual Ungrouped).
  if (input.groupId === null) {
    const { error } = await supabase
      .from("project_group_memberships")
      .delete()
      .eq("user_id", profile.id)
      .eq("project_id", project.id);

    if (error) throw error;
    revalidateWorkshop();
    return;
  }

  // Move == upsert. Verify the target group is owned + in-workspace first.
  assertUuid(input.groupId, "Group");
  const { data: group, error: groupError } = await supabase
    .from("project_groups")
    .select("id")
    .eq("id", input.groupId)
    .eq("user_id", profile.id)
    .eq("workspace_id", workspace.id)
    .maybeSingle();

  if (groupError) throw groupError;
  if (!group) throw new Error("Group was not found in this workspace.");

  const { error } = await supabase
    .from("project_group_memberships")
    .upsert(
      {
        group_id: group.id,
        // Stamp workspace_id from the VERIFIED project row, not ensureDefaultWorkspace,
        // so the composite FK (project_id, workspace_id) → projects(id, workspace_id)
        // is always satisfiable even if the project lives in a non-default workspace.
        workspace_id: project.workspace_id,
        user_id: profile.id,
        project_id: project.id,
      },
      { onConflict: "user_id,project_id" },
    );

  if (error) throw error;
  revalidateWorkshop();
}

export async function bulkAssignProjectsToGroup(input: {
  projectIds: string[];
  groupId: string | null;
}): Promise<BulkAssignProjectsToGroupResult> {
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
  const supabase = await createSupabaseServerClient();

  // Batched LD-2 OWNERSHIP verify (§1.5): only ids the user OWNS — in-workspace AND
  // (workspace-role member OR created_by === user), created_by nullable. NOT a bare
  // created_by SQL equality (would refuse owned-via-role + null-created_by rows). Each
  // verified row carries its workspace_id so membership rows are composite-FK-safe.
  const verified = await verifyOwnedProjectIds(supabase, ids, workspace.id, profile.id);
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
    const { error } = await supabase
      .from("project_group_memberships")
      .delete()
      .eq("user_id", profile.id)
      .in("project_id", verifiedIds);

    if (error) throw error;
    revalidateWorkshop();
    return { movedProjectIds: verifiedIds, skippedProjectIds };
  }

  // Assign path: zero-verify IS an error (the user asked to group projects and none
  // were eligible) — honest failure to surface.
  if (verifiedIds.length === 0) {
    throw new Error("None of the selected projects were found in this workspace.");
  }

  assertUuid(input.groupId, "Group");
  const { data: group, error: groupError } = await supabase
    .from("project_groups")
    .select("id")
    .eq("id", input.groupId)
    .eq("user_id", profile.id)
    .eq("workspace_id", workspace.id)
    .maybeSingle();

  if (groupError) throw groupError;
  if (!group) throw new Error("Group was not found in this workspace.");

  const rows = verified.map((project) => ({
    group_id: group.id,
    // workspace_id from the verified project row (composite-FK-safe), not ensureDefaultWorkspace.
    workspace_id: project.workspace_id,
    user_id: profile.id,
    project_id: project.id,
  }));

  const { error } = await supabase
    .from("project_group_memberships")
    .upsert(rows, { onConflict: "user_id,project_id" });

  if (error) throw error;
  revalidateWorkshop();
  return { movedProjectIds: verifiedIds, skippedProjectIds };
}
