import { cache } from "react";

import { getCloudflareD1Database } from "@/lib/cloudflare/d1";
import { getCurrentWorkspaceProject } from "@/lib/repositories/workspace-repository";

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

type ProjectLocationD1Row = {
  id: string;
  project_id: string;
  latitude: number | string | null;
  longitude: number | string | null;
  accuracy_meters: number | string | null;
  source: string;
  display_label: string | null;
  address_text: string | null;
  geocoder_name: string | null;
  provider_place_id: string | null;
  updated_at: string;
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
  return (
    ((code === "42P01" || code === "PGRST205") && message.includes("project_locations"))
    || message.toLowerCase().includes("no such table: project_locations")
  );
}

function warnProjectLocationSchemaUnavailable() {
  console.warn("[project-dashboard] Project location schema is unavailable; apply migration 20260619105250.");
}

function toProjectLocationSummary(row: ProjectLocationD1Row): ProjectLocationSummary | null {
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

  const db = await getCloudflareD1Database();
  if (!db) return null;

  try {
    const row = await db
      .prepare<ProjectLocationD1Row>(
        `
          SELECT
            id,
            project_id,
            latitude,
            longitude,
            accuracy_meters,
            source,
            display_label,
            address_text,
            geocoder_name,
            provider_place_id,
            updated_at
          FROM project_locations
          WHERE project_id = ?
          LIMIT 1
        `,
      )
      .bind(project.id)
      .first<ProjectLocationD1Row>();

    return row ? toProjectLocationSummary(row) : null;
  } catch (error) {
    if (isProjectLocationSchemaUnavailable(error)) {
      warnProjectLocationSchemaUnavailable();
      return null;
    }
    throw error;
  }
});
