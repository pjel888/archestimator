"use server";

import { revalidatePath } from "next/cache";

import { requireCurrentUserContext } from "@/lib/auth/session";
import { recordExpressComponentEvent } from "@/lib/estimates/express-components-telemetry";
import { isExpressComponentPromotionEnabled } from "@/lib/estimates/express-components";
import { getCurrentWorkspaceProject } from "@/lib/repositories/workspace-repository";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { Database, Json } from "@/lib/supabase/types";

export type PromoteExpressRowToLibraryComponentInput = {
  projectId: string;
  estimateId: string;
  rowId: string;
  libraryFolderId?: string | null;
  mutationId?: string;
};

export type PromoteExpressRowToLibraryComponentResult = {
  rowId: string;
  itemId: string;
  activePriceOptionId?: string | null;
  idempotent?: boolean;
  [key: string]: Json | undefined;
};

function readPromotionResult(value: unknown): PromoteExpressRowToLibraryComponentResult {
  const record = value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, Json | undefined> : {};
  const rowId = typeof record.rowId === "string" ? record.rowId : "";
  const itemId = typeof record.itemId === "string" ? record.itemId : "";
  if (!rowId || !itemId) throw new Error("Express promotion did not return a promoted row and library item.");
  return {
    ...record,
    rowId,
    itemId,
    activePriceOptionId: typeof record.activePriceOptionId === "string" ? record.activePriceOptionId : null,
    idempotent: record.idempotent === true,
  };
}

export async function promoteExpressRowToLibraryComponent({
  projectId,
  estimateId,
  rowId,
  libraryFolderId = null,
  mutationId,
}: PromoteExpressRowToLibraryComponentInput): Promise<PromoteExpressRowToLibraryComponentResult> {
  if (!isExpressComponentPromotionEnabled()) throw new Error("Express component promotion is disabled.");

  const [{ project }, currentUser] = await Promise.all([
    getCurrentWorkspaceProject(projectId),
    requireCurrentUserContext(),
  ]);
  if (!project) throw new Error("Project not found in the current workspace.");

  const supabase = await createSupabaseServerClient();
  recordExpressComponentEvent("promotion_requested", { projectId: project.id, estimateId, rowId });
  const rpcArgs: Database["public"]["Functions"]["promote_express_row_to_library_component"]["Args"] = {
    target_project_id: project.id,
    target_estimate_id: estimateId,
    target_row_id: rowId,
    acting_user_id: currentUser.userId,
    ...(libraryFolderId ? { target_library_folder_id: libraryFolderId } : {}),
    ...(mutationId ? { correlation_id: mutationId } : {}),
  };
  const { data, error } = await supabase.rpc("promote_express_row_to_library_component", rpcArgs);

  if (error) {
    recordExpressComponentEvent("promotion_failed", { projectId: project.id, estimateId, rowId, reason: error.message });
    throw new Error(`Could not promote express component: ${error.message}`);
  }
  const result = readPromotionResult(data);
  recordExpressComponentEvent("promotion_succeeded", { projectId: project.id, estimateId, rowId, itemId: result.itemId });

  revalidatePath("/workshop/library");
  revalidatePath("/workshop/library/components");
  revalidatePath(`/workshop/projects/${project.id}/components`);
  revalidatePath(`/workshop/projects/${project.id}/estimates`);
  revalidatePath(`/workshop/projects/${project.id}/estimates/${estimateId}`);

  return result;
}
