import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

function readMigration(suffix: string) {
  const migrationFile = readdirSync("supabase/migrations").find((file) => file.endsWith(suffix));
  if (!migrationFile) throw new Error(`Migration ending in ${suffix} was not found.`);
  return readFileSync(join("supabase/migrations", migrationFile), "utf8");
}

describe("estimate tabs schema foundation", () => {
  const migration = readMigration("_estimate_tabs_foundation.sql");

  it("creates first-class estimate tabs with default-tab and sort invariants", () => {
    expect(migration).toContain("create table public.estimate_tabs");
    expect(migration).toContain("estimate_id uuid not null references public.estimates(id) on delete cascade");
    expect(migration).toContain("constraint estimate_tabs_estimate_id_id_key unique (estimate_id, id)");
    expect(migration).toContain("estimate_tabs_one_default_per_estimate");
    expect(migration).toContain("constraint estimate_tabs_estimate_sort_unique unique (estimate_id, sort_order) deferrable initially deferred");
    expect(migration).toContain("create trigger estimate_tabs_set_updated_at");
  });

  it("exposes estimate tabs through explicit grants and RLS policies", () => {
    [
      "alter table public.estimate_tabs enable row level security",
      "public.can_access_estimate(estimate_id)",
      "public.can_edit_estimate(estimate_id)",
      "platform admins can manage all estimate tabs",
      "revoke all on public.estimate_tabs from public, anon, authenticated",
      "grant select, insert, update, delete on public.estimate_tabs to authenticated",
    ].forEach((fragment) => expect(migration).toContain(fragment));
  });

  it("attaches existing nodes to default tabs before hardening node constraints", () => {
    const backfillIndex = migration.indexOf("update public.estimate_nodes node");
    const proofIndex = migration.indexOf("P1 failed: every estimate must have exactly one default tab.");
    const notNullIndex = migration.indexOf("alter column estimate_tab_id set not null");
    const constraintSwapIndex = migration.indexOf("estimate_nodes_tab_unique_sort_with_root");

    expect(migration).toContain("add column estimate_tab_id uuid");
    expect(migration).toContain("foreign key (estimate_id, estimate_tab_id)");
    expect(migration).toContain("references public.estimate_tabs (estimate_id, id)");
    expect(migration).toContain("estimate_nodes_tab_parent_sort_idx");
    expect(backfillIndex).toBeGreaterThan(0);
    expect(proofIndex).toBeGreaterThan(backfillIndex);
    expect(notNullIndex).toBeGreaterThan(proofIndex);
    expect(constraintSwapIndex).toBeGreaterThan(notNullIndex);
  });

  it("records P1-P5 proof checks directly in the migration", () => {
    [
      "P1 failed: every estimate must have exactly one default tab.",
      "P2 failed: every estimate node must be attached to a tab.",
      "P3 failed: estimate node crosses estimate/tab boundaries.",
      "P4 failed: parent/child estimate nodes must stay in the same tab.",
      "P5 failed: estimate row item points at a node outside its estimate.",
    ].forEach((fragment) => expect(migration).toContain(fragment));
  });

  it("updates tree validation and reorder/template RPCs for same-tab safety", () => {
    [
      "Estimate node tree contains a parent from another tab.",
      "Estimate node reorder cannot move nodes across tabs.",
      "set constraints estimate_nodes_tab_unique_sort, estimate_nodes_tab_unique_sort_with_root deferred",
      "target_parent_tab_id",
      "insert into public.estimate_nodes (id, estimate_id, estimate_tab_id, parent_id, kind, name, sort_order, metadata)",
      "estimate_tab_id,",
    ].forEach((fragment) => expect(migration).toContain(fragment));
  });

  it("adds tab-scoped event attribution and tab lifecycle RPCs", () => {
    [
      "alter table public.estimate_sheet_events",
      "add column estimate_tab_id uuid references public.estimate_tabs(id) on delete set null",
      "estimate_sheet_events_tab_created_idx",
      "create_estimate_tab_with_history",
      "rename_estimate_tab_with_history",
      "reorder_estimate_tabs_with_history",
      "duplicate_estimate_tab_with_history",
      "archive_estimate_tab_with_history",
      "delete_estimate_tab_with_history",
      "Cannot delete the last estimate tab.",
      "Cannot archive the last estimate tab.",
      "grant execute on function public.create_estimate_tab_with_history(uuid, uuid, text, uuid, uuid) to authenticated",
    ].forEach((fragment) => expect(migration).toContain(fragment));
  });

  it("guards dormant estimate-sheet version RPCs instead of awakening them", () => {
    expect(migration).toContain("estimate_sheet_snapshot/create_estimate_sheet_version");
    expect(migration).toContain("restore_estimate_sheet_version_as_copy v2 stack must not be awakened");
    expect(migration).not.toContain("create or replace function public.estimate_sheet_snapshot");
    expect(migration).not.toContain("create or replace function public.create_estimate_sheet_version");
    expect(migration).not.toContain("create or replace function public.restore_estimate_sheet_version_as_copy");
  });
});
