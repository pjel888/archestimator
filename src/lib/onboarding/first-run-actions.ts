"use server";

import { revalidatePath } from "next/cache";

import { getCloudflareD1Database } from "@/lib/cloudflare/d1";

import { setActivationSelectedPath } from "./activation-repository";
import { resolveCurrentOnboardingActor } from "./flow-actions";
import {
  ACTIVATION_PATHS,
  isClosedValue,
  type ActivationPath,
} from "./flow-types";

export async function selectCurrentOnboardingPath(
  selectedPath: ActivationPath,
) {
  if (!isClosedValue(ACTIVATION_PATHS, selectedPath)) {
    throw new Error("This onboarding path is not supported.");
  }
  const database = await getCloudflareD1Database();
  if (!database) throw new Error("Onboarding path selection is unavailable.");
  const actor = await resolveCurrentOnboardingActor(database);
  const canCreateProjects = actor.accessSource === "workspace"
    && actor.workspaceRole !== "viewer";
  if (!canCreateProjects) {
    throw new Error("This workspace role cannot select a creator onboarding path.");
  }
  await setActivationSelectedPath(database, {
    userId: actor.userId,
    workspaceId: actor.workspaceId,
    selectedPath,
  });
  revalidatePath("/workshop/getting-started");
  return { selectedPath };
}
