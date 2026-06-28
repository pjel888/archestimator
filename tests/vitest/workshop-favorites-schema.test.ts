import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, test } from "vitest";

const migrationPath = readdirSync(join(process.cwd(), "supabase/migrations")).find((file) =>
  file.endsWith("_workshop_favorites.sql"),
);

if (!migrationPath) {
  throw new Error("Workshop favorites migration is missing.");
}

const migration = readFileSync(join(process.cwd(), "supabase/migrations", migrationPath), "utf8");
const mainSidebarMigration = readFileSync(
  join(process.cwd(), "supabase/migrations/20260628153000_main_sidebar_favorite_projects.sql"),
  "utf8",
);
const repository = readFileSync(join(process.cwd(), "src/lib/repositories/workspace-repository.ts"), "utf8");
const actions = readFileSync(join(process.cwd(), "src/lib/workshop/actions.ts"), "utf8");
const supabaseTypes = readFileSync(join(process.cwd(), "src/lib/supabase/types.ts"), "utf8");
const sidebarFavoritesRepository = repository.slice(
  repository.indexOf("export const listMainSidebarFavoriteProjects"),
  repository.indexOf("export const getCurrentWorkspaceProject"),
);

describe("workshop favorites schema", () => {
  test("stores project and estimate favorites as user-scoped RLS tables", () => {
    expect(migration).toContain("create table if not exists public.project_favorites");
    expect(migration).toContain("create table if not exists public.estimate_favorites");
    expect(migration).toContain("constraint project_favorites_unique_user_project unique (user_id, project_id)");
    expect(migration).toContain("constraint estimate_favorites_unique_user_estimate unique (user_id, estimate_id)");
    expect(migration).toContain("references public.projects(id, workspace_id)");
    expect(migration).toContain("references public.estimates(id, project_id)");
    expect(migration).toContain("alter table public.project_favorites enable row level security");
    expect(migration).toContain("alter table public.estimate_favorites enable row level security");
    expect(migration).toContain("user_id = (select auth.uid())");
    expect(migration).toContain("public.is_workspace_member(workspace_id)");
    expect(migration).toContain("revoke all on public.project_favorites from anon");
    expect(migration).toContain("revoke all on public.estimate_favorites from anon");
    expect(migration).toContain("revoke all on public.project_favorites from authenticated");
    expect(migration).toContain("revoke all on public.estimate_favorites from authenticated");
    expect(migration).toContain("grant select, insert, delete on public.project_favorites to authenticated");
    expect(migration).toContain("grant select, insert, delete on public.estimate_favorites to authenticated");
  });

  test("keeps generated types and server data access in sync with the favorite tables", () => {
    expect(supabaseTypes).toContain("project_favorites: {");
    expect(supabaseTypes).toContain("estimate_favorites: {");
    expect(repository).toContain("export async function getWorkshopHomebaseData");
    expect(repository).toContain("export const listCurrentWorkspaceProjects = cache(");
    expect(repository).toContain(".from(\"project_favorites\")");
    expect(repository).toContain(".from(\"estimate_favorites\")");
    expect(repository).toContain("favoriteProjectIds:");
    expect(repository).toContain("mergeHomebaseRecords");
    expect(actions).toContain("export async function setProjectFavorite");
    expect(actions).toContain("export async function setEstimateFavorite");
    expect(actions).toContain("revalidatePath(\"/workshop\")");
    expect(actions).toContain("revalidatePath(\"/workshop/projects\")");
  });

  test("loads sidebar estimate favorites even when the parent project is not favorited", () => {
    expect(mainSidebarMigration).toContain("create or replace function public.main_sidebar_favorite_projects");
    expect(mainSidebarMigration).toContain("estimate_favorites_workspace_user_project_created_idx");
    expect(mainSidebarMigration).toContain("latest_sheet_favorite_refs");
    expect(mainSidebarMigration).toContain("selected_containers");
    expect(mainSidebarMigration).toContain("limit (select safe_project_limit from input)");
    expect(mainSidebarMigration).toContain("limit (select safe_sheet_limit from input)");
    expect(mainSidebarMigration).toContain("grant execute on function public.main_sidebar_favorite_projects(uuid, int, int) to authenticated");
    expect(supabaseTypes).toContain("main_sidebar_favorite_projects: {");
    expect(sidebarFavoritesRepository).toContain('rpc("main_sidebar_favorite_projects"');
    expect(sidebarFavoritesRepository).toContain("parseMainSidebarFavoriteProjectsPayload");
    expect(sidebarFavoritesRepository).toContain(".from(\"project_favorites\")");
    expect(sidebarFavoritesRepository).toContain(".from(\"estimate_favorites\")");
    expect(sidebarFavoritesRepository).toContain("favoriteEstimateProjectIds");
    expect(sidebarFavoritesRepository).toContain("sidebarProjectIds");
    expect(sidebarFavoritesRepository).toContain("projectFavoriteCreatedAt");
    expect(sidebarFavoritesRepository).not.toContain("if (favoriteProjectIds.length === 0) return []");
    expect(sidebarFavoritesRepository).not.toContain(".in(\"project_id\", favoriteProjectIds)");
  });
});
