"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";

import { requireAuth, requireCurrentUserContext } from "@/lib/auth/session";
import { canEditProjectInD1 } from "@/lib/authz/d1-access";
import { getCloudflareD1Database, type D1DatabaseLike } from "@/lib/cloudflare/d1";
import type { ProjectLocationActionState } from "@/lib/projects/location-action-state";
import { getCurrentWorkspaceProject } from "@/lib/repositories/workspace-repository";

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

function readLocationSource(formData: FormData) {
  const source = String(formData.get("source") ?? "manual").trim();
  if (source === "geocoded" || source === "imported") return source;
  return "manual";
}

function readBooleanFlag(formData: FormData, key: string) {
  const value = String(formData.get(key) ?? "").trim().toLowerCase();
  return value === "1" || value === "true";
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
  const currentUser = await requireCurrentUserContext();
  const { project } = await getCurrentWorkspaceProject(projectId);
  if (!project) throw new Error("Project not found in the current workspace.");

  const db = await getCloudflareD1Database();
  if (!db) throw new Error("Project location persistence is unavailable.");

  const canEdit = await canEditProjectInD1(db, project.id, currentUser);
  if (!canEdit) throw new Error("You do not have permission to edit this project location.");

  return { db, project, userId: currentUser.userId };
}

async function upsertProjectLocationInD1(
  db: D1DatabaseLike,
  input: {
    accuracyMeters: number | null;
    addressText: string | null;
    displayLabel: string | null;
    geocoderName: string | null;
    latitude: number;
    longitude: number;
    projectId: string;
    providerPlaceId: string | null;
    source: "manual" | "geocoded" | "imported";
    userId: string;
    workspaceId: string;
  },
) {
  const timestamp = new Date().toISOString();
  return db
    .prepare(
      `
        INSERT INTO project_locations (
          id,
          project_id,
          workspace_id,
          latitude,
          longitude,
          accuracy_meters,
          source,
          display_label,
          address_text,
          geocoder_name,
          provider_place_id,
          metadata_json,
          created_by,
          updated_by,
          created_at,
          updated_at
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, '{}', ?, ?, ?, ?)
        ON CONFLICT(project_id) DO UPDATE SET
          workspace_id = excluded.workspace_id,
          latitude = excluded.latitude,
          longitude = excluded.longitude,
          accuracy_meters = excluded.accuracy_meters,
          source = excluded.source,
          display_label = excluded.display_label,
          address_text = excluded.address_text,
          geocoder_name = excluded.geocoder_name,
          provider_place_id = excluded.provider_place_id,
          updated_by = excluded.updated_by,
          updated_at = excluded.updated_at
      `,
    )
    .bind(
      randomUUID(),
      input.projectId,
      input.workspaceId,
      input.latitude,
      input.longitude,
      input.accuracyMeters,
      input.source,
      input.displayLabel,
      input.addressText,
      input.geocoderName,
      input.providerPlaceId,
      input.userId,
      input.userId,
      timestamp,
      timestamp,
    )
    .run();
}

async function syncProjectAddressInD1(db: D1DatabaseLike, projectId: string, addressText: string) {
  return db
    .prepare(
      `
        UPDATE projects
        SET location = ?,
            updated_at = ?
        WHERE id = ?
      `,
    )
    .bind(addressText, new Date().toISOString(), projectId)
    .run();
}

async function deleteProjectLocationFromD1(db: D1DatabaseLike, projectId: string) {
  return db
    .prepare(
      `
        DELETE FROM project_locations
        WHERE project_id = ?
      `,
    )
    .bind(projectId)
    .run();
}

export async function saveProjectLocation(
  _previousState: ProjectLocationActionState,
  formData: FormData,
): Promise<ProjectLocationActionState> {
  await requireAuth();
  let projectId = "";
  try {
    projectId = readRequiredText(formData, "projectId");
    const latitude = readCoordinate(formData, "latitude");
    const longitude = readCoordinate(formData, "longitude");
    const accuracyMeters = readAccuracyMeters(formData);
    const displayLabel = readOptionalText(formData, "displayLabel", 120);
    const addressText = readOptionalText(formData, "addressText", 240);
    const source = readLocationSource(formData);
    const geocoderName = readOptionalText(formData, "geocoderName", 80);
    const providerPlaceId = readOptionalText(formData, "providerPlaceId", 160);
    const syncProjectAddress = readBooleanFlag(formData, "syncProjectAddress");
    const { db, project, userId } = await assertCanEditProjectLocation(projectId);
    await upsertProjectLocationInD1(db, {
      accuracyMeters,
      addressText,
      displayLabel,
      geocoderName,
      latitude,
      longitude,
      projectId: project.id,
      providerPlaceId,
      source,
      userId,
      workspaceId: project.workspace_id,
    });

    if (syncProjectAddress && addressText) {
      await syncProjectAddressInD1(db, project.id, addressText);
    }

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
  await requireAuth();
  let projectId = "";
  try {
    projectId = readRequiredText(formData, "projectId");
    const { db, project } = await assertCanEditProjectLocation(projectId);
    await deleteProjectLocationFromD1(db, project.id);

    revalidatePath(`/workshop/projects/${project.id}`);
    return { status: "success", message: "Project pin cleared." };
  } catch (error) {
    return {
      status: "error",
      message: error instanceof Error ? error.message : "Project pin could not be cleared.",
    };
  }
}
