"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { ensureDefaultWorkspace } from "@/lib/repositories/workspace-repository";

function readRequiredText(formData: FormData, key: string) {
  const value = String(formData.get(key) ?? "").trim();
  if (!value) throw new Error(`${key} is required.`);
  return value;
}

function readOptionalText(formData: FormData, key: string) {
  const value = String(formData.get(key) ?? "").trim();
  return value || null;
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
      status: "Draft",
      currency_code: "PHP",
      metadata: {},
    })
    .select("*")
    .single();

  if (error) throw error;

  revalidatePath("/workshop/projects");
  redirect(`/workshop/projects/${project.id}`);
}
