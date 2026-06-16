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
// collapse to a bare `.eq("created_by", profile.id)` — that misses both cases.
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

export async function recolorProjectGroup(_input: {
  groupId: string;
  accentId: string | null;
}): Promise<void> {
  throw new Error("not implemented");
}

export async function deleteProjectGroup(_input: { groupId: string }): Promise<void> {
  throw new Error("not implemented");
}

export async function reorderProjectGroups(_input: { orderedGroupIds: string[] }): Promise<void> {
  throw new Error("not implemented");
}

export async function moveProjectToGroup(_input: {
  projectId: string;
  groupId: string | null;
}): Promise<void> {
  throw new Error("not implemented");
}

export async function bulkAssignProjectsToGroup(_input: {
  projectIds: string[];
  groupId: string | null;
}): Promise<BulkAssignProjectsToGroupResult> {
  throw new Error("not implemented");
}
