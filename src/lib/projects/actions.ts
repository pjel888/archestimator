"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { ensureDefaultWorkspace } from "@/lib/repositories/workspace-repository";
import type { Json } from "@/lib/supabase/types";

function readRequiredText(formData: FormData, key: string) {
  const value = String(formData.get(key) ?? "").trim();
  if (!value) throw new Error(`${key} is required.`);
  return value;
}

function readOptionalText(formData: FormData, key: string) {
  const value = String(formData.get(key) ?? "").trim();
  return value || null;
}

function readOptionalNumber(formData: FormData, key: string) {
  const raw = String(formData.get(key) ?? "").replace(/,/g, "").trim();
  if (!raw) return null;
  const value = Number(raw);
  if (!Number.isFinite(value) || value < 0) throw new Error(`${key} must be a valid positive number.`);
  return value;
}

function asProjectMetadata(value: Json): Record<string, Json> {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  return Object.fromEntries(Object.entries(value).filter((entry): entry is [string, Json] => entry[1] !== undefined));
}

export async function createProject(formData: FormData) {
  const { workspace, profile } = await ensureDefaultWorkspace();
  const supabase = await createSupabaseServerClient();

  const name = readRequiredText(formData, "name");
  const clientName = readOptionalText(formData, "clientName");
  const location = readOptionalText(formData, "location");
  const projectCode = readOptionalText(formData, "projectCode");

  const { data: project, error } = await supabase
    .from("projects")
    .insert({
      workspace_id: workspace.id,
      created_by: profile.id,
      name,
      client_name: clientName,
      location,
      project_code: projectCode,
      currency_code: "PHP",
      metadata: {},
    })
    .select("*")
    .single();

  if (error) throw error;

  revalidatePath("/workshop/projects");
  redirect(`/workshop/projects/${project.id}`);
}

export async function deleteProject(formData: FormData) {
  const supabase = await createSupabaseServerClient();
  const projectId = readRequiredText(formData, "projectId");

  const { error } = await supabase.from("projects").delete().eq("id", projectId);
  if (error) throw error;

  revalidatePath("/workshop/projects");
  redirect("/workshop/projects");
}

export async function updateProjectDetails(formData: FormData) {
  const supabase = await createSupabaseServerClient();

  const projectId = readRequiredText(formData, "projectId");
  const name = readRequiredText(formData, "name");
  const clientName = readOptionalText(formData, "clientName");
  const location = readOptionalText(formData, "location");
  const projectCode = readOptionalText(formData, "projectCode");
  const currencyCode = readOptionalText(formData, "currencyCode") ?? "PHP";
  const projectBudget = readOptionalNumber(formData, "projectBudget");
  const projectImageUrl = readOptionalText(formData, "projectImageUrl");

  const { data: existing, error: loadError } = await supabase
    .from("projects")
    .select("metadata")
    .eq("id", projectId)
    .single();

  if (loadError) throw loadError;

  const metadata = asProjectMetadata(existing.metadata);
  if (projectBudget === null) {
    delete metadata.projectBudget;
  } else {
    metadata.projectBudget = projectBudget;
  }
  if (projectImageUrl === null) {
    delete metadata.projectImageUrl;
  } else {
    metadata.projectImageUrl = projectImageUrl;
  }

  const { error } = await supabase
    .from("projects")
    .update({
      name,
      client_name: clientName,
      location,
      project_code: projectCode,
      currency_code: currencyCode,
      metadata,
      updated_at: new Date().toISOString(),
    })
    .eq("id", projectId);

  if (error) throw error;

  revalidatePath("/workshop/projects");
  revalidatePath(`/workshop/projects/${projectId}`);
}
