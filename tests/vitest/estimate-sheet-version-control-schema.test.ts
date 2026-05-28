import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const migrationPath = readdirSync(join(process.cwd(), "supabase/migrations"))
  .filter((file) => file.endsWith("_estimate_sheet_version_control.sql"))
  .sort()
  .at(-1);

if (!migrationPath) throw new Error("Missing estimate sheet version control migration.");

const migration = readFileSync(join(process.cwd(), "supabase/migrations", migrationPath), "utf8");

const contingencyMigrationPath = readdirSync(join(process.cwd(), "supabase/migrations"))
  .filter((file) => file.endsWith("_add_estimate_row_contingency_percentage.sql"))
  .sort()
  .at(-1);

if (!contingencyMigrationPath) throw new Error("Missing estimate row contingency migration.");

const contingencyMigration = readFileSync(join(process.cwd(), "supabase/migrations", contingencyMigrationPath), "utf8");

const discountMigrationPath = readdirSync(join(process.cwd(), "supabase/migrations"))
  .filter((file) => file.endsWith("_allow_estimate_row_discounts.sql"))
  .sort()
  .at(-1);

if (!discountMigrationPath) throw new Error("Missing estimate row discount migration.");

const discountMigration = readFileSync(join(process.cwd(), "supabase/migrations", discountMigrationPath), "utf8");

describe("estimate sheet version control schema", () => {
  it("adds append-only events, named versions, row revisions, and safety indexes", () => {
    expect(migration).toContain("add column if not exists row_revision integer not null default 1");
    expect(migration).toContain("create table if not exists public.estimate_sheet_events");
    expect(migration).toContain("create table if not exists public.estimate_sheet_versions");
    expect(migration).toContain("estimate_sheet_events_estimate_created_idx");
    expect(migration).toContain("estimate_sheet_events_row_created_idx");
    expect(migration).toContain("estimate_sheet_events_correlation_idx");
    expect(migration).toContain("estimate_sheet_versions_estimate_version_key");
    expect(migration).toContain("estimate_sheet_versions_snapshot_size_check");
    expect(migration).toContain("set constraints all immediate");
  });

  it("uses RLS and grants read/execute access without broad history mutation grants", () => {
    expect(migration).toContain("alter table public.estimate_sheet_events enable row level security");
    expect(migration).toContain("alter table public.estimate_sheet_versions enable row level security");
    expect(migration).toContain("create policy estimate_sheet_events_select_authenticated");
    expect(migration).toContain("create policy estimate_sheet_versions_select_authenticated");
    expect(migration).toContain("grant select on public.estimate_sheet_events to authenticated");
    expect(migration).toContain("grant select on public.estimate_sheet_versions to authenticated");
    expect(migration).not.toContain("grant select, insert, update, delete on public.estimate_sheet_events");
    expect(migration).not.toContain("grant select, insert, update, delete on public.estimate_sheet_versions");
  });

  it("defines transaction-owned row mutation RPCs with revision and idempotency contracts", () => {
    expect(migration).toContain("create or replace function public.insert_estimate_row_item_with_history");
    expect(migration).toContain("create or replace function public.update_estimate_row_item_with_history");
    expect(migration).toContain("create or replace function public.replace_estimate_row_item_with_history");
    expect(migration).toContain("create or replace function public.delete_estimate_row_item_with_history");
    expect(migration).toContain("expected_row_revision integer");
    expect(migration).toContain("correlation_id uuid default gen_random_uuid()");
    expect(migration).toContain("estimate_sheet_row_revision_conflict");
    expect(migration).toContain("for update");
    expect(migration).toContain("row_revision = row_revision + 1");
  });

  it("versions row contingency percentage through totals, snapshots, and restore-as-copy", () => {
    expect(contingencyMigration).toContain("add column if not exists contingency_percentage");
    expect(contingencyMigration).toContain("estimate_row_contingency_value");
    expect(contingencyMigration).toContain("estimate_row_line_total");
    expect(contingencyMigration).toContain("'contingencyPercentage', row_item.contingency_percentage");
    expect(contingencyMigration).toContain("'contingencyValue', public.estimate_row_contingency_value(row_item)");
    expect(contingencyMigration).toContain("contingency_percentage = case when row_patch ? 'contingencyPercentage'");
    expect(contingencyMigration).toContain("'contingencyPercentage'");
    expect(contingencyMigration).toContain("coalesce(row_row.\"contingencyPercentage\", 0)");
    expect(contingencyMigration).toContain("'schemaVersion', '2026-05-24.v2'");
    expect(contingencyMigration).toContain("create or replace function public.create_estimate_sheet_version");
    expect(contingencyMigration).toContain("event.event_type = 'sheet_version_created'");
    expect(contingencyMigration).toContain("'versionId', event.payload->>'versionId'");
    expect(contingencyMigration).toContain("event.payload->>'sourceVersionId' = source_version.id::text");
    expect(contingencyMigration).toContain("'firstNodeId', first_node_id");
    expect(contingencyMigration).toContain("revoke execute on function public.update_estimate_row_item_with_history(uuid, uuid, uuid, integer, jsonb, uuid, uuid) from public, anon");
    expect(contingencyMigration).toContain("grant execute on function public.restore_estimate_sheet_version_as_copy(uuid, uuid, text, text, uuid, uuid) to authenticated");
    expect(contingencyMigration).toContain("revoke execute on function public.reorder_estimate_nodes(uuid, jsonb) from public, anon, authenticated");
    expect(contingencyMigration).toContain("revoke execute on function public.insert_estimate_template_into_estimate(uuid, uuid, uuid, uuid) from public, anon, authenticated");
    expect(contingencyMigration).toContain("drop function if exists public.move_estimate_nodes(uuid, jsonb)");
  });

  it("allows row percentage adjustments to be stored as discounts", () => {
    expect(discountMigration).toContain("drop constraint if exists estimate_row_items_contingency_percentage_check");
    expect(discountMigration).toContain("check (contingency_percentage >= -100 and contingency_percentage <= 100)");
    expect(discountMigration).toContain("drop constraint if exists estimate_template_row_items_contingency_percentage_check");
  });

  it("defines named-version, compare foundation, restore-as-copy, and wrapper RPCs", () => {
    expect(migration).toContain("create or replace function public.create_estimate_sheet_version");
    expect(migration).toContain("create or replace function public.restore_estimate_sheet_version_as_copy");
    expect(migration).toContain("create or replace function public.reorder_estimate_nodes_with_history");
    expect(migration).toContain("create or replace function public.insert_estimate_template_into_estimate_with_history");
    expect(migration).toContain("create or replace function public.update_estimate_details_with_history");
    expect(migration).toContain("create or replace function public.delete_estimate_node_with_history");
    expect(migration).toContain("create or replace function public.get_estimate_sheet_version_control_preflight");
    expect(migration).toContain("create or replace function public.backfill_estimate_sheet_baseline_versions");
    expect(migration).toContain("sheet_restored_as_copy");
    expect(migration).toContain("tree_reordered");
    expect(migration).toContain("template_inserted");
    expect(migration).toContain("insert_result || jsonb_build_object('sourceTemplateId', source_template_id, 'targetParentNodeId', target_parent_node_id)");
    expect(migration).toContain("'eventId', inserted_event_id");
    expect(migration).toContain("node_deleted_with_children");
    expect(migration).not.toContain("estimate.status");
    expect(migration).not.toContain("source_estimate.status");
  });

  it("defines node create and rename history RPCs in a forward migration", () => {
    const nodeActivityMigration = readFileSync(
      join(process.cwd(), "supabase/migrations/20260524132800_estimate_node_activity_history.sql"),
      "utf8",
    );

    expect(nodeActivityMigration).toContain("create or replace function public.create_estimate_node_with_history");
    expect(nodeActivityMigration).toContain("create or replace function public.rename_estimate_node_with_history");
    expect(nodeActivityMigration).toContain("'node_created'");
    expect(nodeActivityMigration).toContain("'node_renamed'");
    expect(nodeActivityMigration).toContain("public.estimate_sheet_event_result(target_estimate_id, correlation_id)");
    expect(nodeActivityMigration).toContain("grant execute on function public.create_estimate_node_with_history");
    expect(nodeActivityMigration).toContain("grant execute on function public.rename_estimate_node_with_history");
  });

  it("grants execute on history RPCs to authenticated callers", () => {
    expect(migration).toContain("grant execute on function public.insert_estimate_row_item_with_history");
    expect(migration).toContain("grant execute on function public.update_estimate_row_item_with_history");
    expect(migration).toContain("grant execute on function public.replace_estimate_row_item_with_history");
    expect(migration).toContain("grant execute on function public.delete_estimate_row_item_with_history");
    expect(migration).toContain("grant execute on function public.create_estimate_sheet_version");
    expect(migration).toContain("grant execute on function public.restore_estimate_sheet_version_as_copy");
    expect(migration).toContain("grant execute on function public.reorder_estimate_nodes_with_history");
    expect(migration).toContain("grant execute on function public.insert_estimate_template_into_estimate_with_history");
    expect(migration).toContain("grant execute on function public.update_estimate_details_with_history");
    expect(migration).toContain("grant execute on function public.delete_estimate_node_with_history");
  });
});
