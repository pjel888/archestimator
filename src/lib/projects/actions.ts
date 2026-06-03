"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireCurrentUserContext } from "@/lib/auth/session";
import {
  buildRejectedPreviewResult,
  coerceBulkExecutionResult,
  coerceBulkPreviewResult,
  normalizeBulkActionIds,
  type BulkActionExecutionResult,
  type BulkActionPreviewResult,
} from "@/lib/mass-deletion/bulk-action";
import { cleanupStorageTargets, storageCleanupReportToJson } from "@/lib/mass-deletion/storage-cleanup";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { ensureDefaultWorkspace } from "@/lib/repositories/workspace-repository";
import type { Json } from "@/lib/supabase/types";
import { isUuid } from "@/lib/ids";

const PROJECT_IMAGE_BUCKET = "component-images";

type ProjectImageMetadataInput = {
  bucket?: string;
  url: string;
  thumbnailUrl?: string;
  path?: string;
  thumbnailPath?: string;
};

export type BulkDeleteProjectsInput = {
  projectIds: string[];
};

export type ExecuteBulkDeleteProjectsInput = BulkDeleteProjectsInput & {
  expectedPreviewHash: string;
  correlationId?: string;
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
  const projectId = readRequiredText(formData, "projectId");
  const expectedPreviewHash = readRequiredText(formData, "expectedPreviewHash");
  const correlationId = readOptionalText(formData, "correlationId") ?? undefined;

  const result = await executeBulkDeleteProjects({
    projectIds: [projectId],
    expectedPreviewHash,
    correlationId,
  });
  if (!result.ok) throw new Error(result.issues[0]?.message ?? "Could not delete project.");
  redirect("/workshop/projects");
}

function getMassDeletionCorrelationId(correlationId: string | undefined) {
  return correlationId && isUuid(correlationId) ? correlationId : randomUUID();
}

function revalidateProjectDeletionPaths(projectIds: string[]) {
  revalidatePath("/workshop");
  revalidatePath("/workshop/projects");
  for (const projectId of projectIds) {
    revalidatePath(`/workshop/projects/${projectId}`);
    revalidatePath(`/workshop/projects/${projectId}/estimates`);
    revalidatePath(`/workshop/projects/${projectId}/charts`);
  }
}

export async function previewBulkDeleteProjects(input: BulkDeleteProjectsInput): Promise<BulkActionPreviewResult> {
  const { ids, issues } = normalizeBulkActionIds(input.projectIds, { label: "projects", max: 50 });
  if (issues.length > 0) return buildRejectedPreviewResult("project", ids, issues);

  const [supabase] = await Promise.all([
    createSupabaseServerClient(),
    requireCurrentUserContext(),
  ]);
  const { data, error } = await supabase.rpc("preview_bulk_delete_projects", {
    target_project_ids: ids,
  });

  if (error) {
    return buildRejectedPreviewResult("project", ids, [{
      code: "rpc_error",
      message: `Could not preview project deletion: ${error.message}`,
    }]);
  }

  return coerceBulkPreviewResult(data, { targetType: "project", ids });
}

export async function executeBulkDeleteProjects(input: ExecuteBulkDeleteProjectsInput): Promise<BulkActionExecutionResult> {
  const { ids, issues } = normalizeBulkActionIds(input.projectIds, { label: "projects", max: 50 });
  if (issues.length > 0) {
    return {
      ...buildRejectedPreviewResult("project", ids, issues),
      deletedIds: [],
    };
  }

  const [supabase] = await Promise.all([
    createSupabaseServerClient(),
    requireCurrentUserContext(),
  ]);
  const { data, error } = await supabase.rpc("execute_bulk_delete_projects", {
    target_project_ids: ids,
    expected_preview_hash: input.expectedPreviewHash,
    correlation_id: getMassDeletionCorrelationId(input.correlationId),
  });

  if (error) {
    return {
      ok: false,
      targetType: "project",
      ids,
      deletedIds: [],
      summary: {
        requestedCount: ids.length,
        eligibleCount: 0,
        blockedCount: 1,
      },
      issues: [{
        code: "rpc_error",
        message: `Could not delete projects: ${error.message}`,
      }],
    };
  }

  const result = coerceBulkExecutionResult(data, { targetType: "project", ids });
  if (result.ok) {
    const storageCleanup = await cleanupStorageTargets(supabase, result.storageTargets, { kind: "project" });
    result.storageCleanup = storageCleanup;
    if (result.auditEventId) {
      await supabase.rpc("record_mass_deletion_storage_cleanup_result", {
        target_event_id: result.auditEventId,
        cleanup_result: storageCleanupReportToJson(storageCleanup),
      });
    }
    revalidateProjectDeletionPaths(result.deletedIds?.length ? result.deletedIds : ids);
  }

  return result;
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
  const nextMetadata = { ...metadata };
  const previousProjectImagePaths = getProjectImageStoragePaths(metadata);
  if (shouldUpdateProjectBudget) {
    if (projectBudget === null) {
      delete nextMetadata.projectBudget;
    } else {
      nextMetadata.projectBudget = projectBudget;
    }
  }
  if (shouldRemoveProjectImage || projectImageUrl === null) {
    delete nextMetadata.projectImageUrl;
    delete nextMetadata.projectImageThumbnailUrl;
    delete nextMetadata.projectImageBucket;
    delete nextMetadata.projectImagePath;
    delete nextMetadata.projectImageThumbnailPath;
  } else {
    applyProjectImageMetadata(nextMetadata, {
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
      metadata: nextMetadata,
      updated_at: new Date().toISOString(),
    })
    .eq("id", projectId);

  if (error) throw error;

  const shouldRemovePreviousImage = shouldRemoveProjectImage || (projectImagePath && previousProjectImagePaths.length > 0 && !previousProjectImagePaths.includes(projectImagePath));
  if (shouldRemovePreviousImage) {
    await removeStoredProjectImagePaths(supabase, getProjectImageStoragePaths(metadata));
  }

  revalidatePath("/workshop/projects");
  revalidatePath(`/workshop/projects/${projectId}`);
}
