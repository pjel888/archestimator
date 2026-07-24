"use server";

import { revalidatePath } from "next/cache";

import { getCloudflareD1Database } from "@/lib/cloudflare/d1";
import {
  getActivationProgress,
  setActivationChecklistControl,
  setAutomaticGuidancePreference,
  type ActivationProgress,
} from "./activation-repository";
import { resolveCurrentOnboardingActor } from "./flow-actions";
import { startGuidedPractice } from "./guided-sample-actions";
import {
  addStarterContent,
  restoreStarterContent,
  resumeStarterContent,
} from "./starter-pack-actions";

export async function startGuidedSample() {
  const result = await startGuidedPractice();
  revalidatePath("/workshop", "layout");
  return result;
}

export async function addCurrentStarterContent() {
  const result = await addStarterContent();
  revalidatePath("/workshop", "layout");
  return result;
}

export async function resumeCurrentStarterContent() {
  const result = await resumeStarterContent();
  revalidatePath("/workshop", "layout");
  return result;
}

export async function restoreCurrentStarterContent(expectedRevision: number) {
  const result = await restoreStarterContent({ expectedRevision });
  revalidatePath("/workshop", "layout");
  return result;
}

export async function getCurrentActivationProgress(): Promise<ActivationProgress | null> {
  const database = await getCloudflareD1Database();
  if (!database) return null;
  const actor = await resolveCurrentOnboardingActor(database);
  try {
    return await getActivationProgress(database, {
      userId: actor.userId,
      workspaceId: actor.workspaceId,
    });
  } catch {
    return null;
  }
}

async function setActivationChecklistVisibility(visibility: "dismiss" | "reopen") {
  const database = await getCloudflareD1Database();
  if (!database) throw new Error("Activation progress is unavailable.");
  const actor = await resolveCurrentOnboardingActor(database);
  await setActivationChecklistControl(database, {
    userId: actor.userId,
    workspaceId: actor.workspaceId,
    visibility,
  });
}

export async function dismissActivationChecklist() {
  return setActivationChecklistVisibility("dismiss");
}

export async function reopenActivationChecklist() {
  return setActivationChecklistVisibility("reopen");
}

export async function setAutomaticGuidanceEnabled(enabled: boolean) {
  if (typeof enabled !== "boolean") {
    throw new Error("Automatic guidance preference is invalid.");
  }
  const database = await getCloudflareD1Database();
  if (!database) throw new Error("Activation progress is unavailable.");
  const actor = await resolveCurrentOnboardingActor(database);
  await setAutomaticGuidancePreference(database, {
    userId: actor.userId,
    workspaceId: actor.workspaceId,
    enabled,
  });
}
