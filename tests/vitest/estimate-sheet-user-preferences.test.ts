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

  it("uses user-scoped estimate access checks before service-role persistence", () => {
    const actions = source("src/lib/estimate-sheet/user-preferences-actions.ts");

    expect(actions).toContain("export async function loadEstimateSheetUserPreferences");
    expect(actions).toContain("export async function saveEstimateSheetUserPreferences");
    expect(actions).toContain("await Promise.all([ensureDefaultWorkspace(), requireCurrentUserContext()])");
    expect(actions).toContain("supabase.rpc(\"can_access_estimate\", { target_estimate_id: estimateId })");
    expect(actions).toContain("createSupabaseServiceRoleClient(\"archestimator-estimate-sheet-preferences-read\")");
    expect(actions).toContain("createSupabaseServiceRoleClient(\"archestimator-estimate-sheet-preferences-write\")");
    expect(actions).toContain("normalizeEstimateColumnWidths");
    expect(actions).toContain("onConflict: \"user_id,workspace_id,estimate_id\"");
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
