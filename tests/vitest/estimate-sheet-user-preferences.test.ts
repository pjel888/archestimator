import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

function source(path: string) {
  return readFileSync(path, "utf8");
}

describe("estimate sheet user preferences", () => {
  it("defines a locked-down estimate sheet preference table", () => {
    const migration = source("supabase/migrations/20260625214500_estimate_sheet_user_preferences.sql");

    expect(migration).toContain("create table if not exists public.estimate_sheet_user_preferences");
    expect(migration).toContain("primary key (user_id, workspace_id, estimate_id)");
    expect(migration).toContain("column_widths jsonb not null default '{}'::jsonb");
    expect(migration).toContain("alter table public.estimate_sheet_user_preferences enable row level security");
    expect(migration).toContain("revoke all on table public.estimate_sheet_user_preferences from public, anon, authenticated");
    expect(migration).toContain("create policy \"deny direct api access\"");
  });

  it("uses user-scoped D1 estimate access checks before preference persistence", () => {
    const actions = source("src/lib/estimate-sheet/user-preferences-actions.ts");
    const store = source("src/lib/estimate-sheet/user-preferences-d1-store.ts");
    const migration = source("migrations/0008_estimate_sheet_user_preferences.sql");

    expect(actions).toContain("export async function loadEstimateSheetUserPreferences");
    expect(actions).toContain("export async function saveEstimateSheetUserPreferences");
    expect(actions).toContain("requireCurrentUserContext");
    expect(actions).toContain("getEstimatePreferenceContextFromCloudflareD1");
    expect(actions).toContain("loadEstimateSheetUserPreferencesFromCloudflareD1");
    expect(actions).toContain("saveEstimateSheetUserPreferencesInCloudflareD1");
    expect(store).toContain("getCloudflareD1Database");
    expect(store).toContain("FROM estimate_sheet_members");
    expect(store).toContain("FROM project_members");
    expect(store).toContain("FROM estimate_sheet_access_settings");
    expect(migration).toContain("CREATE TABLE IF NOT EXISTS estimate_sheet_user_preferences");
    expect(migration).toContain("PRIMARY KEY (user_id, workspace_id, estimate_id)");
    expect(migration).toContain("column_widths_json TEXT NOT NULL DEFAULT '{}'");
    expect(actions).toContain("normalizeEstimateColumnWidths");
    expect(`${actions}\n${store}`).not.toMatch(/@supabase\/supabase-js|@\/lib\/supabase|createSupabase|SUPABASE_SERVICE_ROLE_KEY|can_access_estimate/);
  });

  it("syncs center column widths outside tests without replacing local first paint", () => {
    const sheet = source("src/components/workshop/EstimateSheetContent.tsx");

    expect(sheet).toContain("hydrateEstimateColumnWidths(estimateId)");
    expect(sheet).toContain("loadEstimateSheetUserPreferences(estimateId)");
    expect(sheet).toContain("saveEstimateSheetUserPreferences({");
    expect(sheet).toContain("accountColumnWidthsSnapshotRef.current");
    expect(sheet).toContain("process.env.NODE_ENV === \"test\"");
  });
});
