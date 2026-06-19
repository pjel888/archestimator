"use server";

import { revalidatePath } from "next/cache";

import { requireCurrentUserContext } from "@/lib/auth/session";
import type { ProjectLocationActionState } from "@/lib/projects/location-action-state";
import { getCurrentWorkspaceProject } from "@/lib/repositories/workspace-repository";
import { createSupabaseServerClient } from "@/lib/supabase/server";

function readRequiredText(formData: FormData, key: string) {
  const value = String(formData.get(key) ?? "").trim();
  if (!value) throw new Error(`${key} is required.`);
  return value;
}

function readOptionalText(formData: FormData, key: string, maxLength = 240) {
  const value = String(formData.get(key) ?? "").trim().replace(/\s+/g, " ");
  if (!value) return null;
  if (value.length > maxLength) throw new Error(`${key} must be ${maxLength} characters or less.`);
  return value;
}

function readCoordinate(formData: FormData, key: "latitude" | "longitude") {
  const raw = String(formData.get(key) ?? "").trim();
  const value = Number(raw);
  if (!raw || !Number.isFinite(value)) throw new Error(`${key} must be a valid coordinate.`);
  const min = key === "latitude" ? -90 : -180;
  const max = key === "latitude" ? 90 : 180;
  if (value < min || value > max) throw new Error(`${key} must be between ${min} and ${max}.`);
  return Number(value.toFixed(6));
}

function readAccuracyMeters(formData: FormData) {
  const raw = String(formData.get("accuracyMeters") ?? "").trim();
  if (!raw) return null;
  const value = Number(raw);
  if (!Number.isFinite(value) || value < 0) throw new Error("accuracyMeters must be a positive number.");
  return Number(value.toFixed(2));
}

function locationFieldError(error: unknown): ProjectLocationActionState["fieldErrors"] {
  if (!(error instanceof Error)) return undefined;
  if (error.message.startsWith("latitude ")) return { latitude: error.message };
  if (error.message.startsWith("longitude ")) return { longitude: error.message };
  if (error.message.startsWith("accuracyMeters ")) return { accuracyMeters: error.message };
  return undefined;
}

async function assertCanEditProjectLocation(projectId: string) {
  await requireCurrentUserContext();
  const { project } = await getCurrentWorkspaceProject(projectId);
  if (!project) throw new Error("Project not found in the current workspace.");

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.rpc("can_edit_project", {
    target_project_id: project.id,
  });

  if (error) throw error;
  if (data !== true) throw new Error("You do not have permission to edit this project location.");

  return { project, supabase };
}

export async function saveProjectLocation(
  _previousState: ProjectLocationActionState,
  formData: FormData,
): Promise<ProjectLocationActionState> {
  let projectId = "";
  try {
    projectId = readRequiredText(formData, "projectId");
    const latitude = readCoordinate(formData, "latitude");
    const longitude = readCoordinate(formData, "longitude");
    const accuracyMeters = readAccuracyMeters(formData);
    const displayLabel = readOptionalText(formData, "displayLabel", 120);
    const addressText = readOptionalText(formData, "addressText", 240);
    const { project, supabase } = await assertCanEditProjectLocation(projectId);

    const { error } = await supabase
      .from("project_locations")
      .upsert(
        {
          project_id: project.id,
          workspace_id: project.workspace_id,
          latitude,
          longitude,
          accuracy_meters: accuracyMeters,
          source: "manual",
          display_label: displayLabel,
          address_text: addressText,
        },
        { onConflict: "project_id" },
      );

    if (error) throw error;

    revalidatePath(`/workshop/projects/${project.id}`);
    return { status: "success", message: "Project pin saved." };
  } catch (error) {
    return {
      status: "error",
      message: error instanceof Error ? error.message : "Project pin could not be saved.",
      fieldErrors: locationFieldError(error),
    };
  }
}

export async function clearProjectLocation(
  _previousState: ProjectLocationActionState,
  formData: FormData,
): Promise<ProjectLocationActionState> {
  let projectId = "";
  try {
    projectId = readRequiredText(formData, "projectId");
    const { project, supabase } = await assertCanEditProjectLocation(projectId);
    const { error } = await supabase
      .from("project_locations")
      .delete()
      .eq("project_id", project.id);

    if (error) throw error;

    revalidatePath(`/workshop/projects/${project.id}`);
    return { status: "success", message: "Project pin cleared." };
  } catch (error) {
    return {
      status: "error",
      message: error instanceof Error ? error.message : "Project pin could not be cleared.",
    };
  }
}
