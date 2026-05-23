"use server";

import { revalidatePath } from "next/cache";

import { requireCurrentUserContext } from "@/lib/auth/session";
import { ensureDefaultWorkspace } from "@/lib/repositories/workspace-repository";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { Tables } from "@/lib/supabase/types";

export type LibraryFolderActionResult = {
  folder: Tables<"library_folders">;
};

export type ReorderLibraryFoldersInput = {
  updates: Array<{
    id: string;
    parentId: string | null;
    sortOrder: number;
  }>;
};

function revalidateLibraryRoutes() {
  revalidatePath("/workshop/library");
  revalidatePath("/workshop/components");
}

function readFolderName(name: string) {
  const value = name.trim();
  if (!value) throw new Error("Folder name is required.");
  return value;
}

export async function createLibraryFolder(parentId: string | null, name: string): Promise<LibraryFolderActionResult> {
  const [{ workspace }, currentUser] = await Promise.all([ensureDefaultWorkspace(), requireCurrentUserContext()]);
  const supabase = await createSupabaseServerClient();
  const parentResult = parentId
    ? await supabase
        .from("library_folders")
        .select("id, workspace_id")
        .eq("id", parentId)
        .eq("workspace_id", workspace.id)
        .maybeSingle()
    : null;

  if (parentResult?.error) throw parentResult.error;
  if (parentId && !parentResult?.data) throw new Error("Parent folder not found in the current workspace.");

  let siblingsQuery = supabase
    .from("library_folders")
    .select("sort_order")
    .eq("workspace_id", workspace.id);
  siblingsQuery = parentId ? siblingsQuery.eq("parent_id", parentId) : siblingsQuery.is("parent_id", null);
  const { data: siblings, error: siblingsError } = await siblingsQuery;
  if (siblingsError) throw siblingsError;

  const nextSortOrder = ((siblings ?? []).reduce((max, folder) => Math.max(max, folder.sort_order), 0) || 0) + 10;
  const { data, error } = await supabase
    .from("library_folders")
    .insert({
      workspace_id: workspace.id,
      parent_id: parentId,
      name: readFolderName(name),
      sort_order: nextSortOrder,
      folder_kind: "custom",
      created_by: currentUser.userId,
    })
    .select("*")
    .single();

  if (error) throw error;
  revalidateLibraryRoutes();
  return { folder: data };
}

export async function renameLibraryFolder(folderId: string, name: string): Promise<LibraryFolderActionResult> {
  const { workspace } = await ensureDefaultWorkspace();
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("library_folders")
    .update({ name: readFolderName(name) })
    .eq("id", folderId)
    .eq("workspace_id", workspace.id)
    .select("*")
    .single();

  if (error) throw error;
  revalidateLibraryRoutes();
  return { folder: data };
}

export async function deleteLibraryFolder(folderId: string): Promise<void> {
  const { workspace } = await ensureDefaultWorkspace();
  const supabase = await createSupabaseServerClient();
  const { data: folder, error: folderError } = await supabase
    .from("library_folders")
    .select("id, workspace_id, parent_id")
    .eq("id", folderId)
    .eq("workspace_id", workspace.id)
    .maybeSingle();

  if (folderError) throw folderError;
  if (!folder) throw new Error("Library folder not found in the current workspace.");

  const { error: childError } = await supabase
    .from("library_folders")
    .update({ parent_id: folder.parent_id })
    .eq("workspace_id", workspace.id)
    .eq("parent_id", folder.id);
  if (childError) throw childError;

  const { error: itemError } = await supabase
    .from("cost_library_items")
    .update({ library_folder_id: null })
    .eq("workspace_id", workspace.id)
    .eq("library_folder_id", folder.id);
  if (itemError) throw itemError;

  const { error: deleteError } = await supabase
    .from("library_folders")
    .delete()
    .eq("workspace_id", workspace.id)
    .eq("id", folder.id);
  if (deleteError) throw deleteError;

  revalidateLibraryRoutes();
}

export async function reorderLibraryFolders(input: ReorderLibraryFoldersInput): Promise<void> {
  if (!input.updates.length) throw new Error("At least one library folder update is required.");

  const { workspace } = await ensureDefaultWorkspace();
  const supabase = await createSupabaseServerClient();
  const folderUpdates = input.updates.map((update) => ({
    id: update.id,
    parent_id: update.parentId,
    sort_order: update.sortOrder,
  }));
  const { error } = await supabase.rpc("reorder_library_folders", {
    target_workspace_id: workspace.id,
    folder_updates: folderUpdates,
  });

  if (error) throw new Error(`Could not reorder library folders: ${error.message}`);
  revalidateLibraryRoutes();
}
