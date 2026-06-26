import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

function source(path: string) {
  return readFileSync(path, "utf8");
}

describe("component library user preferences", () => {
  it("defines a locked-down account preference table", () => {
    const migration = source("supabase/migrations/20260625213000_component_library_user_preferences.sql");

    expect(migration).toContain("create table if not exists public.component_library_user_preferences");
    expect(migration).toContain("primary key (user_id, workspace_id)");
    expect(migration).toContain("favorite_item_ids text[] not null default '{}'::text[]");
    expect(migration).toContain("recent_item_ids text[] not null default '{}'::text[]");
    expect(migration).toContain("tree_order jsonb not null default '{}'::jsonb");
    expect(migration).toContain("alter table public.component_library_user_preferences enable row level security");
    expect(migration).toContain("revoke all on table public.component_library_user_preferences from public, anon, authenticated");
    expect(migration).toContain("create policy \"deny direct api access\"");
  });

  it("loads and saves preferences only through authenticated server actions", () => {
    const actions = source("src/lib/component-library/actions.ts");

    expect(actions).toContain("export async function loadComponentLibraryUserPreferences");
    expect(actions).toContain("export async function saveComponentLibraryUserPreferences");
    expect(actions).toContain("await Promise.all([ensureDefaultWorkspace(), requireCurrentUserContext()])");
    expect(actions).toContain("createSupabaseServiceRoleClient(\"archestimator-component-library-preferences-read\")");
    expect(actions).toContain("createSupabaseServiceRoleClient(\"archestimator-component-library-preferences-write\")");
    expect(actions).toContain("normalizeComponentLibraryUserPreferences(input)");
    expect(actions).toContain("readComponentLibraryPreferenceIds(input.favoriteItemIds, 500)");
    expect(actions).toContain("readComponentLibraryTreeOrder(input.treeOrder)");
    expect(actions).toContain(".upsert({");
    expect(actions).toContain("onConflict: \"user_id,workspace_id\"");
  });

  it("hydrates local preferences first and then syncs account preferences outside tests", () => {
    const sidebar = source("src/components/workshop/component-library/index.tsx");

    expect(sidebar).toContain("loadComponentLibraryUserPreferences()");
    expect(sidebar).toContain("saveComponentLibraryUserPreferences(preferences)");
    expect(sidebar).toContain("process.env.NODE_ENV !== \"test\"");
    expect(sidebar).toContain("process.env.NODE_ENV === \"test\"");
    expect(sidebar).toContain("serializeLibraryAccountPrefs(preferences)");
    expect(sidebar).toContain("safeSetJsonStorage(LIBRARY_FAVORITES_KEY, preferences.favoriteItemIds)");
    expect(sidebar).toContain("replaceFavorites: true");
    expect(sidebar).toContain("replaceTreeOrder: true");
  });
});
