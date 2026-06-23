"use server";

import { revalidatePath } from "next/cache";

import { requireAuth, requireCurrentUserContext } from "@/lib/auth/session";
import { recordExpressComponentEvent } from "@/lib/estimates/express-components-telemetry";
import { isExpressComponentPromotionEnabled } from "@/lib/estimates/express-components";
import { getCurrentWorkspaceProject } from "@/lib/repositories/workspace-repository";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { Database, Json } from "@/lib/supabase/types";

export type PromoteEstimateRowToLibraryComponentInput = {
  projectId: string;
  estimateId: string;
  rowId: string;
  libraryFolderId?: string | null;
  mutationId?: string;
};

export type PromoteEstimateRowToLibraryComponentResult = {
  rowId: string;
  itemId: string;
  activePriceOptionId?: string | null;
  idempotent?: boolean;
  [key: string]: Json | undefined;
};

export type PromoteExpressRowToLibraryComponentInput = PromoteEstimateRowToLibraryComponentInput;
export type PromoteExpressRowToLibraryComponentResult = PromoteEstimateRowToLibraryComponentResult;

function readPromotionResult(value: unknown): PromoteEstimateRowToLibraryComponentResult {
  const record = value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, Json | undefined> : {};
  const rowId = typeof record.rowId === "string" ? record.rowId : "";
  const itemId = typeof record.itemId === "string" ? record.itemId : "";
  if (!rowId || !itemId) throw new Error("Component promotion did not return a promoted row and library item.");
  return {
    ...record,
    rowId,
    itemId,
    activePriceOptionId: typeof record.activePriceOptionId === "string" ? record.activePriceOptionId : null,
    idempotent: record.idempotent === true,
  };
}

export async function promoteEstimateRowToLibraryComponent({
  projectId,
  estimateId,
  rowId,
  libraryFolderId = null,
  mutationId,
}: PromoteEstimateRowToLibraryComponentInput): Promise<PromoteEstimateRowToLibraryComponentResult> {
  if (!isExpressComponentPromotionEnabled()) throw new Error("Component promotion is disabled.");

  const [{ project }, currentUser] = await Promise.all([
    getCurrentWorkspaceProject(projectId),
    requireCurrentUserContext(),
  ]);
  if (!project) throw new Error("Project not found in the current workspace.");

  const supabase = await createSupabaseServerClient();
  recordExpressComponentEvent("promotion_requested", { projectId: project.id, estimateId, rowId });
  const rpcArgs: Database["public"]["Functions"]["promote_estimate_row_to_library_component"]["Args"] = {
    target_project_id: project.id,
    target_estimate_id: estimateId,
    target_row_id: rowId,
    acting_user_id: currentUser.userId,
    ...(libraryFolderId ? { target_library_folder_id: libraryFolderId } : {}),
    ...(mutationId ? { correlation_id: mutationId } : {}),
  };
  const { data, error } = await supabase.rpc("promote_estimate_row_to_library_component", rpcArgs);

  if (error) {
    recordExpressComponentEvent("promotion_failed", { projectId: project.id, estimateId, rowId, reason: error.message });
    throw new Error(`Could not promote component: ${error.message}`);
  }
  const result = readPromotionResult(data);
  recordExpressComponentEvent("promotion_succeeded", { projectId: project.id, estimateId, rowId, itemId: result.itemId });

  revalidatePath("/workshop/library");
  revalidatePath("/workshop/library/components");
  revalidatePath(`/workshop/projects/${project.id}/estimates`);
  revalidatePath(`/workshop/projects/${project.id}/estimates/${estimateId}`);

  return result;
}

export async function promoteExpressRowToLibraryComponent(input: PromoteExpressRowToLibraryComponentInput) {
  await requireAuth();
  return promoteEstimateRowToLibraryComponent(input);
}
