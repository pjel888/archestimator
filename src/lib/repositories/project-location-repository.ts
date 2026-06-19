import { cache } from "react";

import { getCurrentWorkspaceProject } from "@/lib/repositories/workspace-repository";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { Tables } from "@/lib/supabase/types";

export type ProjectLocationSummary = {
  readonly id: string;
  readonly projectId: string;
  readonly latitude: number;
  readonly longitude: number;
  readonly accuracyMeters: number | null;
  readonly source: "manual" | "geocoded" | "imported";
  readonly displayLabel: string | null;
  readonly addressText: string | null;
  readonly geocoderName: string | null;
  readonly providerPlaceId: string | null;
  readonly updatedAt: string;
};

function toNumber(value: number | string | null) {
  if (value === null) return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function readLocationSource(value: string): ProjectLocationSummary["source"] {
  if (value === "geocoded" || value === "imported") return value;
  return "manual";
}

function readPostgresErrorCode(error: unknown) {
  if (!error || typeof error !== "object" || !("code" in error)) return null;
  const code = (error as { code?: unknown }).code;
  return typeof code === "string" ? code : null;
}

function readErrorMessage(error: unknown) {
  if (!error || typeof error !== "object" || !("message" in error)) return "";
  const message = (error as { message?: unknown }).message;
  return typeof message === "string" ? message : "";
}

function isProjectLocationSchemaUnavailable(error: unknown) {
  const code = readPostgresErrorCode(error);
  const message = readErrorMessage(error);
  return (code === "42P01" || code === "PGRST205") && message.includes("project_locations");
}

function warnProjectLocationSchemaUnavailable() {
  console.warn("[project-dashboard] Project location schema is unavailable; apply migration 20260619105250.");
}

function toProjectLocationSummary(row: Tables<"project_locations">): ProjectLocationSummary | null {
  const latitude = toNumber(row.latitude);
  const longitude = toNumber(row.longitude);
  if (latitude === null || longitude === null) return null;

  const accuracyMeters = toNumber(row.accuracy_meters);
  return {
    id: row.id,
    projectId: row.project_id,
    latitude,
    longitude,
    accuracyMeters,
    source: readLocationSource(row.source),
    displayLabel: row.display_label ?? null,
    addressText: row.address_text ?? null,
    geocoderName: row.geocoder_name ?? null,
    providerPlaceId: row.provider_place_id ?? null,
    updatedAt: row.updated_at,
  };
}

export const getProjectLocation = cache(async function getProjectLocation(projectId: string): Promise<ProjectLocationSummary | null> {
  const { project } = await getCurrentWorkspaceProject(projectId);
  if (!project) return null;

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("project_locations")
    .select("id, project_id, latitude, longitude, accuracy_meters, source, display_label, address_text, geocoder_name, provider_place_id, updated_at")
    .eq("project_id", project.id)
    .maybeSingle();

  if (error) {
    if (isProjectLocationSchemaUnavailable(error)) {
      warnProjectLocationSchemaUnavailable();
      return null;
    }
    throw error;
  }
  return data ? toProjectLocationSummary(data as Tables<"project_locations">) : null;
});
