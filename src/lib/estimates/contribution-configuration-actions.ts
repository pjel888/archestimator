"use server";

import { requireCurrentUserContext } from "@/lib/auth/session";
import { assertEstimateActionRateLimit } from "@/lib/estimates/action-rate-limit";

import { requireEstimateD1Database } from "./d1-intents/database";
import {
  applyEstimateContributionConfigurationBulk,
  createOrReplaceEstimateAlternativeGroup,
  ensureEstimateContributionScope,
  markEstimateContributionRowOptional,
  removeEstimateAlternativeGroup,
  unmarkEstimateContributionRowOptional,
  type ApplyEstimateContributionConfigurationBulkInput,
  type CreateOrReplaceEstimateAlternativeGroupInput,
  type EnsureEstimateContributionScopeInput,
  type MarkEstimateContributionRowOptionalInput,
  type RemoveEstimateAlternativeGroupInput,
  type UnmarkEstimateContributionRowOptionalInput,
} from "./contribution-configuration-repository";

export type ApplyEstimateContributionConfigurationBulkActionInput = Omit<ApplyEstimateContributionConfigurationBulkInput, "database" | "actor" | "now">;

export type EnsureEstimateContributionScopeActionInput = Omit<EnsureEstimateContributionScopeInput, "database" | "actor" | "now">;
export type CreateOrReplaceEstimateAlternativeGroupActionInput = Omit<CreateOrReplaceEstimateAlternativeGroupInput, "database" | "actor" | "now">;
export type MarkEstimateContributionRowOptionalActionInput = Omit<MarkEstimateContributionRowOptionalInput, "database" | "actor" | "now">;
export type UnmarkEstimateContributionRowOptionalActionInput = Omit<UnmarkEstimateContributionRowOptionalInput, "database" | "actor" | "now">;
export type RemoveEstimateAlternativeGroupActionInput = Omit<RemoveEstimateAlternativeGroupInput, "database" | "actor" | "now">;

async function requireContributionConfigurationActionContext(estimateId: string) {
  const [database, currentUser] = await Promise.all([
    requireEstimateD1Database(),
    requireCurrentUserContext(),
  ]);
  assertEstimateActionRateLimit({
    resourceId: estimateId,
    surface: "estimate-mutation",
    userId: currentUser.userId,
  });
  return { database, actor: { userId: currentUser.userId, role: currentUser.role } };
}

export async function ensureEstimateContributionScopeAction(input: EnsureEstimateContributionScopeActionInput) {
  return ensureEstimateContributionScope({
    ...input,
    ...await requireContributionConfigurationActionContext(input.estimateId),
  });
}

export async function createOrReplaceEstimateAlternativeGroupAction(input: CreateOrReplaceEstimateAlternativeGroupActionInput) {
  return createOrReplaceEstimateAlternativeGroup({
    ...input,
    ...await requireContributionConfigurationActionContext(input.estimateId),
  });
}

export async function markEstimateContributionRowOptionalAction(input: MarkEstimateContributionRowOptionalActionInput) {
  return markEstimateContributionRowOptional({
    ...input,
    ...await requireContributionConfigurationActionContext(input.estimateId),
  });
}

export async function unmarkEstimateContributionRowOptionalAction(input: UnmarkEstimateContributionRowOptionalActionInput) {
  return unmarkEstimateContributionRowOptional({
    ...input,
    ...await requireContributionConfigurationActionContext(input.estimateId),
  });
}

export async function removeEstimateAlternativeGroupAction(input: RemoveEstimateAlternativeGroupActionInput) {
  return removeEstimateAlternativeGroup({
    ...input,
    ...await requireContributionConfigurationActionContext(input.estimateId),
  });
}

export async function applyEstimateContributionConfigurationBulkAction(input: ApplyEstimateContributionConfigurationBulkActionInput) {
  return applyEstimateContributionConfigurationBulk({
    ...input,
    ...await requireContributionConfigurationActionContext(input.estimateId),
  });
}
