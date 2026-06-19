import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const migrationFile = readdirSync(join(process.cwd(), "supabase/migrations"))
  .filter((file) => file.endsWith("_project_dashboard_activity_location.sql"))
  .sort()
  .at(-1);

if (!migrationFile) throw new Error("Missing project dashboard activity/location migration.");

const migration = readFileSync(join(process.cwd(), "supabase/migrations", migrationFile), "utf8");
const projectDashboardClient = readFileSync("src/components/workshop/ProjectDashboardClient.tsx", "utf8");
const projectDashboardPage = readFileSync("src/app/workshop/projects/[projectId]/page.tsx", "utf8");
const projectActivityRepository = readFileSync("src/lib/repositories/project-activity-repository.ts", "utf8");
const projectLocationRepository = readFileSync("src/lib/repositories/project-location-repository.ts", "utf8");
const projectLocationActions = readFileSync("src/lib/projects/location-actions.ts", "utf8");
const migrationRunbook = readFileSync(
  ".ai/03_plans/2026-06-19-Project-Dashboard-Command-Surface/10-MIGRATION-RLS-QA-RUNBOOK.md",
  "utf8",
);

describe("project dashboard activity and location schema", () => {
  it("adds project-scoped estimate activity with backfill, trigger, RLS, and a cursor index", () => {
    expect(migration).toContain("alter table public.estimate_sheet_events");
    expect(migration).toContain("add column if not exists project_id uuid");
    expect(migration).toContain("set project_id = estimate.project_id");
    expect(migration).toContain("alter column project_id set not null");
    expect(migration).toContain("estimate_sheet_events_estimate_project_fkey");
    expect(migration).toContain("estimate_sheet_events_project_workspace_fkey");
    expect(migration).toContain("create or replace function public.prepare_estimate_sheet_event_project_scope()");
    expect(migration).toContain("create trigger estimate_sheet_events_prepare_project_scope");
    expect(migration).toContain("estimate_sheet_events_project_created_idx");
    expect(migration).toContain("on public.estimate_sheet_events(project_id, created_at desc, id desc)");
    expect(migration).toContain("using (public.can_access_estimate(estimate_id))");
    expect(migration).toContain("grant select on public.estimate_sheet_events to authenticated");
    expect(migration).not.toContain("grant insert on public.estimate_sheet_events to authenticated");
  });

  it("defines private project_locations with coordinate checks, lifecycle metadata, RLS, and grants", () => {
    expect(migration).toContain("create table if not exists public.project_locations");
    expect(migration).toContain("project_id uuid not null");
    expect(migration).toContain("workspace_id uuid not null");
    expect(migration).toContain("latitude numeric(9, 6) not null check (latitude >= -90 and latitude <= 90)");
    expect(migration).toContain("longitude numeric(9, 6) not null check (longitude >= -180 and longitude <= 180)");
    expect(migration).toContain("constraint project_locations_project_unique unique (project_id)");
    expect(migration).toContain("on delete cascade");
    expect(migration).toContain("create or replace function public.prepare_project_location_row()");
    expect(migration).toContain("alter table public.project_locations enable row level security");
    expect(migration).toContain("using (public.can_edit_project(project_id))");
    expect(migration).toContain("with check (public.can_edit_project(project_id))");
    expect(migration).toContain("grant select, insert, update, delete on public.project_locations to authenticated");
    expect(migration).toContain("revoke all on public.project_locations from public, anon, authenticated");
    expect(migration).toContain("Do not expose to public share, exports, analytics, or AI context.");
  });

  it("keeps exact coordinates behind dedicated repository and action boundaries", () => {
    expect(projectDashboardPage).toContain("getProjectLocation");
    expect(projectDashboardPage).toContain("listProjectActivityPage");
    expect(projectDashboardPage).toContain('supabase.rpc("can_edit_project"');
    expect(projectDashboardPage).toContain("project && canEdit ? await getProjectLocation(project.id) : null");
    expect(projectActivityRepository).toContain('.from("estimate_sheet_events")');
    expect(projectActivityRepository).toContain('.eq("project_id", project.id)');
    expect(projectActivityRepository).toContain("composeEstimateActivity");
    expect(projectActivityRepository).not.toContain("readonly oldSnapshot");
    expect(projectActivityRepository).not.toContain("readonly payload");
    expect(projectLocationRepository).toContain('.from("project_locations")');
    expect(projectLocationRepository).toContain("latitude, longitude");
    expect(projectLocationActions).toContain("readCoordinate");
    expect(projectLocationActions).toContain('source: "manual"');
    expect(projectDashboardClient).toContain("visibleProjectLocation = canPersist ? projectLocation : null");
    expect(projectDashboardClient).toContain("dynamic(");
    expect(projectDashboardClient).toContain('import("./ProjectLocationMap")');
    expect(projectDashboardClient).toContain("ssr: false");
    expect(projectDashboardClient).toContain("getProjectLocationMapConfig");
    expect(projectDashboardClient).toContain("Map provider disabled");
    expect(projectDashboardClient).not.toContain("maplibre");
    expect(projectDashboardClient).not.toContain("Mapbox");
    expect(projectDashboardClient).not.toContain("Nominatim");
  });

  it("records exact-location DSAR, delete, export, and retention handling", () => {
    const normalizedRunbook = migrationRunbook.replace(/\s+/g, " ");
    expect(migrationRunbook).toContain("Structured Location Lifecycle / DSAR");
    expect(normalizedRunbook).toContain("authenticated owner/editor account or project data exports");
    expect(normalizedRunbook).toContain("Do not include exact coordinates in public share pages");
    expect(normalizedRunbook).toContain("proposal package exports");
    expect(normalizedRunbook).toContain("AI/provider context");
    expect(normalizedRunbook).toContain("analytics payloads");
    expect(normalizedRunbook).toContain("Project deletion cascades the one active location row");
    expect(normalizedRunbook).toContain("User deletion sets `created_by` and `updated_by` to null");
    expect(normalizedRunbook).toContain("provider retention terms before storing");
  });
});
