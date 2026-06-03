"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { ensureDefaultWorkspace } from "@/lib/repositories/workspace-repository";
import type { Json } from "@/lib/supabase/types";

const PROJECT_IMAGE_BUCKET = "component-images";

type ProjectImageMetadataInput = {
  bucket?: string;
  url: string;
  thumbnailUrl?: string;
  path?: string;
  thumbnailPath?: string;
};

function readRequiredText(formData: FormData, key: string) {
  const value = String(formData.get(key) ?? "").trim();
  if (!value) throw new Error(`${key} is required.`);
  return value;
}

function readOptionalText(formData: FormData, key: string) {
  const value = String(formData.get(key) ?? "").trim();
  return value || null;
}

function readCurrencyCode(formData: FormData, key: string) {
  const value = String(formData.get(key) ?? "PHP").trim().toUpperCase();
  if (!/^[A-Z]{3}$/.test(value)) throw new Error(`${key} must be a three-letter currency code.`);
  return value;
}

function readOptionalStoragePath(formData: FormData, key: string) {
  const value = readOptionalText(formData, key);
  if (!value) return null;
  if (!value.endsWith(".webp") || value.includes("..") || value.includes("//")) {
    throw new Error(`${key} must be a valid stored WebP image path.`);
  }
  return value;
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

function readMetadataText(metadata: Record<string, Json>, key: string) {
  const value = metadata[key];
  return typeof value === "string" ? value : null;
}

function getProjectImageStoragePaths(metadata: Record<string, Json>) {
  return [
    readMetadataText(metadata, "projectImagePath"),
    readMetadataText(metadata, "projectImageThumbnailPath"),
  ].filter((path): path is string => Boolean(path));
}

function isProjectImageStoragePath(path: string | null | undefined) {
  return Boolean(path && path.endsWith(".webp") && path.includes("/project-images/") && !path.includes("..") && !path.includes("//"));
}

async function removeStoredProjectImagePaths(supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>, paths: string[]) {
  const safePaths = Array.from(new Set(paths.filter(isProjectImageStoragePath)));
  if (safePaths.length === 0) return;
  await supabase.storage.from(PROJECT_IMAGE_BUCKET).remove(safePaths);
}

function applyProjectImageMetadata(metadata: Record<string, Json>, image: ProjectImageMetadataInput) {
  metadata.projectImageUrl = image.url;
  if (image.thumbnailUrl) metadata.projectImageThumbnailUrl = image.thumbnailUrl;
  if (image.bucket) metadata.projectImageBucket = image.bucket;
  if (image.path) metadata.projectImagePath = image.path;
  if (image.thumbnailPath) metadata.projectImageThumbnailPath = image.thumbnailPath;
  return metadata;
}

export async function createProjectRecord(formData: FormData) {
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
  return { id: project.id };
}

export async function createProject(formData: FormData) {
  const project = await createProjectRecord(formData);
  redirect(`/workshop/projects/${project.id}`);
}

export async function deleteProject(formData: FormData) {
  const supabase = await createSupabaseServerClient();
  const projectId = readRequiredText(formData, "projectId");

  const { data: existing, error: loadError } = await supabase
    .from("projects")
    .select("metadata")
    .eq("id", projectId)
    .single();

  if (loadError) throw loadError;

  const metadata = asProjectMetadata(existing.metadata);
  const { error } = await supabase.from("projects").delete().eq("id", projectId);
  if (error) throw error;

  await removeStoredProjectImagePaths(supabase, getProjectImageStoragePaths(metadata));

  revalidatePath("/workshop/projects");
  redirect("/workshop/projects");
}

export async function deleteProjectsBulk(projectIds: string[]): Promise<{ deletedProjectIds: string[] }> {
  const requestedProjectIds = [...new Set(projectIds.map((projectId) => projectId.trim()).filter(Boolean))];
  if (requestedProjectIds.length === 0) throw new Error("At least one project is required for bulk delete.");

  const { workspace } = await ensureDefaultWorkspace();
  const supabase = await createSupabaseServerClient();
  const { data: scopedProjects, error: loadError } = await supabase
    .from("projects")
    .select("id, metadata")
    .eq("workspace_id", workspace.id)
    .in("id", requestedProjectIds);

  if (loadError) throw loadError;
  const scopedProjectIds = new Set((scopedProjects ?? []).map((project) => project.id));
  const missingProjectId = requestedProjectIds.find((projectId) => !scopedProjectIds.has(projectId));
  if (missingProjectId) throw new Error(`Project not found in the current workspace: ${missingProjectId}.`);

  const { error: deleteError } = await supabase
    .from("projects")
    .delete()
    .eq("workspace_id", workspace.id)
    .in("id", requestedProjectIds);
  if (deleteError) throw deleteError;

  const storagePaths = (scopedProjects ?? []).flatMap((project) => getProjectImageStoragePaths(asProjectMetadata(project.metadata)));
  await removeStoredProjectImagePaths(supabase, storagePaths);

  revalidatePath("/workshop/projects");
  return { deletedProjectIds: requestedProjectIds };
}

export async function updateProjectImageMetadata(projectId: string, image: ProjectImageMetadataInput) {
  const { workspace } = await ensureDefaultWorkspace();
  const supabase = await createSupabaseServerClient();

  const { data: existing, error: loadError } = await supabase
    .from("projects")
    .select("metadata")
    .eq("id", projectId)
    .eq("workspace_id", workspace.id)
    .single();

  if (loadError) throw loadError;

  const metadata = applyProjectImageMetadata(asProjectMetadata(existing.metadata), image);
  const { error } = await supabase
    .from("projects")
    .update({
      metadata,
      updated_at: new Date().toISOString(),
    })
    .eq("id", projectId)
    .eq("workspace_id", workspace.id);

  if (error) throw error;

  revalidatePath("/workshop/projects");
  revalidatePath(`/workshop/projects/${projectId}`);
}

export async function updateProjectDetails(formData: FormData) {
  const supabase = await createSupabaseServerClient();

  const projectId = readRequiredText(formData, "projectId");
  const name = readRequiredText(formData, "name");
  const clientName = readOptionalText(formData, "clientName");
  const location = readOptionalText(formData, "location");
  const projectCode = readOptionalText(formData, "projectCode");
  const currencyCode = readCurrencyCode(formData, "currencyCode");
  const shouldUpdateProjectBudget = formData.has("projectBudget");
  const projectBudget = shouldUpdateProjectBudget ? readOptionalNumber(formData, "projectBudget") : null;
  const shouldRemoveProjectImage = formData.get("projectImageRemove") === "1";
  const projectImageUrl = readOptionalText(formData, "projectImageUrl");
  const projectImageThumbnailUrl = readOptionalText(formData, "projectImageThumbnailUrl");
  const projectImageBucket = readOptionalText(formData, "projectImageBucket");
  const projectImagePath = readOptionalStoragePath(formData, "projectImagePath");
  const projectImageThumbnailPath = readOptionalStoragePath(formData, "projectImageThumbnailPath");

  const { data: existing, error: loadError } = await supabase
    .from("projects")
    .select("metadata")
    .eq("id", projectId)
    .single();

  if (loadError) throw loadError;

  const metadata = asProjectMetadata(existing.metadata);
  const previousProjectImagePaths = getProjectImageStoragePaths(metadata);
  if (shouldUpdateProjectBudget) {
    if (projectBudget === null) {
      delete metadata.projectBudget;
    } else {
      metadata.projectBudget = projectBudget;
    }
  }
  if (shouldRemoveProjectImage || projectImageUrl === null) {
    delete metadata.projectImageUrl;
    delete metadata.projectImageThumbnailUrl;
    delete metadata.projectImageBucket;
    delete metadata.projectImagePath;
    delete metadata.projectImageThumbnailPath;
  } else {
    applyProjectImageMetadata(metadata, {
      url: projectImageUrl,
      thumbnailUrl: projectImageThumbnailUrl ?? undefined,
      bucket: projectImageBucket ?? undefined,
      path: projectImagePath ?? undefined,
      thumbnailPath: projectImageThumbnailPath ?? undefined,
    });
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

  const shouldRemovePreviousImage = shouldRemoveProjectImage || (projectImagePath && previousProjectImagePaths.length > 0 && !previousProjectImagePaths.includes(projectImagePath));
  if (shouldRemovePreviousImage) {
    await removeStoredProjectImagePaths(supabase, previousProjectImagePaths);
  }

  revalidatePath("/workshop/projects");
  revalidatePath(`/workshop/projects/${projectId}`);
}
