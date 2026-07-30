"use server";

import { requireCurrentUserContext } from "@/lib/auth/session";
import { assertEstimateActionRateLimit } from "@/lib/estimates/action-rate-limit";

import { requireEstimateD1Database } from "./d1-intents/database";
import {
  selectValueEngineeringAlternative,
  setValueEngineeringOptionalInclusion,
  type SelectAlternativeInput,
  type SetOptionalInclusionInput,
} from "./value-engineering-repository";

export type SelectEstimateAlternativeActionInput = Omit<SelectAlternativeInput, "database" | "actor" | "now">;
export type SetEstimateOptionalInclusionActionInput = Omit<SetOptionalInclusionInput, "database" | "actor" | "now">;

/** Authorized server boundary for selecting one member of an alternative group. */
export async function selectEstimateAlternativeAction(input: SelectEstimateAlternativeActionInput) {
  const [database, currentUser] = await Promise.all([
    requireEstimateD1Database(),
    requireCurrentUserContext(),
  ]);
  assertEstimateActionRateLimit({
    resourceId: input.estimateId,
    surface: "estimate-mutation",
    userId: currentUser.userId,
  });
  return selectValueEngineeringAlternative({
    ...input,
    database,
    actor: { userId: currentUser.userId, role: currentUser.role },
  });
}

/** Authorized server boundary for including or excluding one optional row. */
export async function setEstimateOptionalInclusionAction(input: SetEstimateOptionalInclusionActionInput) {
  const [database, currentUser] = await Promise.all([
    requireEstimateD1Database(),
    requireCurrentUserContext(),
  ]);
  assertEstimateActionRateLimit({
    resourceId: input.estimateId,
    surface: "estimate-mutation",
    userId: currentUser.userId,
  });
  return setValueEngineeringOptionalInclusion({
    ...input,
    database,
    actor: { userId: currentUser.userId, role: currentUser.role },
  });
}
