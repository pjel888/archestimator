"use server";

import { requireCurrentUserContext } from "@/lib/auth/session";
import { assertEstimateActionRateLimit } from "@/lib/estimates/action-rate-limit";

import { requireEstimateD1Database } from "./d1-intents/database";
import {
  applyMaterialAssemblyBulk,
  createMaterialAssemblyEdge,
  deleteMaterialAssemblyEdge,
  updateMaterialAssemblyEdge,
  type ApplyMaterialAssemblyBulkInput,
  type CreateMaterialAssemblyEdgeInput,
  type DeleteMaterialAssemblyEdgeInput,
  type UpdateMaterialAssemblyEdgeInput,
} from "./material-assembly-repository";

export type ApplyMaterialAssemblyBulkActionInput = Omit<ApplyMaterialAssemblyBulkInput, "database" | "actor" | "now">;

export type CreateMaterialAssemblyEdgeActionInput = Omit<CreateMaterialAssemblyEdgeInput, "database" | "actor" | "now">;
export type UpdateMaterialAssemblyEdgeActionInput = Omit<UpdateMaterialAssemblyEdgeInput, "database" | "actor" | "now">;
export type DeleteMaterialAssemblyEdgeActionInput = Omit<DeleteMaterialAssemblyEdgeInput, "database" | "actor" | "now">;

async function requireMaterialAssemblyActionContext(estimateId: string) {
  const [database, currentUser] = await Promise.all([
    requireEstimateD1Database(),
    requireCurrentUserContext(),
  ]);
  assertEstimateActionRateLimit({
    resourceId: estimateId,
    surface: "estimate-mutation",
    userId: currentUser.userId,
  });
  return {
    database,
    actor: { userId: currentUser.userId, role: currentUser.role },
  };
}

export async function createMaterialAssemblyEdgeAction(input: CreateMaterialAssemblyEdgeActionInput) {
  return createMaterialAssemblyEdge({
    ...input,
    ...await requireMaterialAssemblyActionContext(input.estimateId),
  });
}

export async function updateMaterialAssemblyEdgeAction(input: UpdateMaterialAssemblyEdgeActionInput) {
  return updateMaterialAssemblyEdge({
    ...input,
    ...await requireMaterialAssemblyActionContext(input.estimateId),
  });
}

export async function deleteMaterialAssemblyEdgeAction(input: DeleteMaterialAssemblyEdgeActionInput) {
  return deleteMaterialAssemblyEdge({
    ...input,
    ...await requireMaterialAssemblyActionContext(input.estimateId),
  });
}

export async function applyMaterialAssemblyBulkAction(input: ApplyMaterialAssemblyBulkActionInput) {
  return applyMaterialAssemblyBulk({
    ...input,
    ...await requireMaterialAssemblyActionContext(input.estimateId),
  });
}
