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

function readMigrationBySuffix(suffix: string) {
  const migrationFile = readdirSync(join(process.cwd(), "supabase/migrations"))
    .filter((file) => file.endsWith(suffix))
    .sort()
    .at(-1);
  if (!migrationFile) throw new Error(`Missing migration ending in ${suffix}.`);
  return readFileSync(join(process.cwd(), "supabase/migrations", migrationFile), "utf8");
}

const nodeDeleteUndoMigration = readMigrationBySuffix("_estimate_node_delete_undo_rpc.sql");
const rowItemMoveMigration = readMigrationBySuffix("_estimate_row_item_move_rpc.sql");
const quantityContingencyMigration = readMigrationBySuffix("_quantity_contingency_and_sheet_adjustments.sql");
const signedQuantityAdjustmentMigration = readMigrationBySuffix("_signed_quantity_and_row_adjustments.sql");

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

  it("defines atomic center row move and bulk row delete RPCs", () => {
    const centerMutationMigration = readMigrationBySuffix("_estimate_center_atomic_row_mutations.sql");

    expect(centerMutationMigration).toContain("create or replace function public.move_estimate_row_component_with_history");
    expect(centerMutationMigration).toContain("expected_source_row_revision integer");
    expect(centerMutationMigration).toContain("expected_target_row_revision integer");
    expect(centerMutationMigration).toContain("source_replacement_payload jsonb");
    expect(centerMutationMigration).toContain("target_replacement_payload jsonb");
    expect(centerMutationMigration).toContain("order by row_item.id");
    expect(centerMutationMigration).toContain("for update");
    expect(centerMutationMigration).toContain("'row_moved'");
    expect(centerMutationMigration).toContain("'sourceRow'");
    expect(centerMutationMigration).toContain("'targetRow'");
    expect(centerMutationMigration).toContain("public.estimate_sheet_event_result(target_estimate_id, correlation_id)");
    expect(centerMutationMigration).toContain("create or replace function public.delete_estimate_row_items_bulk_with_history");
    expect(centerMutationMigration).toContain("expected_row_revisions jsonb");
    expect(centerMutationMigration).toContain("requested_count > 100");
    expect(centerMutationMigration).toContain("'rows_bulk_deleted'");
    expect(centerMutationMigration).toContain("delete from public.estimate_row_items row_item");
    expect(centerMutationMigration).toContain("grant execute on function public.move_estimate_row_component_with_history");
    expect(centerMutationMigration).toContain("grant execute on function public.delete_estimate_row_items_bulk_with_history");
    expect(centerMutationMigration).not.toMatch(/\bsavepoint\b/i);
  });

  it("defines a dedicated row-item reorganization RPC with server-derived auth and order validation", () => {
    expect(rowItemMoveMigration).toContain("create or replace function public.move_estimate_row_item_with_history");
    expect(rowItemMoveMigration).toContain("actor_user_id uuid := auth.uid()");
    expect(rowItemMoveMigration).toContain("if actor_user_id is null then");
    expect(rowItemMoveMigration).toContain("public.assert_can_edit_estimate_for_history(target_project_id, target_estimate_id, actor_user_id)");
    expect(rowItemMoveMigration).not.toContain("acting_user_id");
    expect(rowItemMoveMigration).toContain("public.estimate_sheet_event_result(target_estimate_id, correlation_id)");
    expect(rowItemMoveMigration).toContain("set constraints estimate_row_items_unique_sort deferred");
    expect(rowItemMoveMigration).toContain("jsonb_to_recordset(move_updates)");
    expect(rowItemMoveMigration).toContain("order by row_item.id");
    expect(rowItemMoveMigration).toContain("for update");
    expect(rowItemMoveMigration).toContain("estimate_sheet_row_revision_conflict");
    expect(rowItemMoveMigration).toContain("row_revision = row_item.row_revision + 1");
    expect(rowItemMoveMigration).toContain("Return the full source/target sibling rows");
    expect(rowItemMoveMigration).toContain("and row_item.node_id in (source_node_id, target_node_id)");
    expect(rowItemMoveMigration).toContain("'row_reorganized'");
    expect(rowItemMoveMigration).toContain("'movedRowId'");
    expect(rowItemMoveMigration).toContain("grant execute on function public.move_estimate_row_item_with_history(uuid, uuid, uuid, jsonb, uuid, uuid, uuid, uuid) to authenticated");
    expect(rowItemMoveMigration).toContain("revoke all on function public.move_estimate_row_item_with_history(uuid, uuid, uuid, jsonb, uuid, uuid, uuid, uuid) from public, anon");
  });

  it("defines center row delete undo from persisted row delete history", () => {
    const undoMigration = readMigrationBySuffix("_estimate_row_delete_undo_rpc.sql");

    expect(undoMigration).toContain("create or replace function public.restore_deleted_estimate_rows_with_history");
    expect(undoMigration).toContain("public.assert_can_edit_estimate_for_history(target_project_id, target_estimate_id, acting_user_id)");
    expect(undoMigration).toContain("event.event_type in ('row_deleted', 'rows_bulk_deleted')");
    expect(undoMigration).toContain("delete_event.payload->'deletedSnapshot'");
    expect(undoMigration).toContain("delete_event.payload->'deletedRows'");
    expect(undoMigration).toContain("'row_restored'");
    expect(undoMigration).toContain("'sourceEventId'");
    expect(undoMigration).toContain("grant execute on function public.restore_deleted_estimate_rows_with_history");
  });

  it("hardens tree mutation RPCs and returns authoritative delete metadata", () => {
    const treeAuthorityMigration = readMigrationBySuffix("_estimate_tree_delete_authority_and_authz.sql");

    expect(treeAuthorityMigration).toContain("public.assert_can_edit_estimate_for_history(target_project_id, target_estimate_id, acting_user_id)");
    expect(treeAuthorityMigration).toContain("rename_estimate_node_with_history");
    expect(treeAuthorityMigration).toContain("create or replace function public.delete_estimate_node_with_history");
    expect(treeAuthorityMigration).toContain("create or replace function public.delete_estimate_nodes_bulk_with_history");
    expect(treeAuthorityMigration).toContain("'deletedNodeIds'");
    expect(treeAuthorityMigration).toContain("'fallbackNodeId'");
    expect(treeAuthorityMigration).toContain("estimate_sheet_deleted_node_ids");
    expect(treeAuthorityMigration).toContain("estimate_sheet_bulk_deleted_node_ids");
    expect(treeAuthorityMigration).toContain("grant execute on function public.rename_estimate_node_with_history");
    expect(treeAuthorityMigration).toContain("grant execute on function public.delete_estimate_node_with_history");
    expect(treeAuthorityMigration).toContain("grant execute on function public.delete_estimate_nodes_bulk_with_history");
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

  it("migrates row discounts into signed adjustments and makes contingency quantity-side only", () => {
    expect(signedQuantityAdjustmentMigration).toContain("add column if not exists adjustment_percentage");
    expect(signedQuantityAdjustmentMigration).toContain("set adjustment_percentage = contingency_percentage");
    expect(signedQuantityAdjustmentMigration).toContain("where quantity_base is null");
    expect(signedQuantityAdjustmentMigration).toContain("alter table public.estimate_template_row_items");
    expect(signedQuantityAdjustmentMigration).toContain("update public.estimate_template_row_items");
    expect(signedQuantityAdjustmentMigration).toContain("add constraint estimate_template_row_items_adjustment_percentage_range");
    expect(signedQuantityAdjustmentMigration).toContain("drop constraint estimate_row_items_quantity_contingency_nonnegative");
    expect(signedQuantityAdjustmentMigration).toContain("add constraint estimate_row_items_signed_quantity_contingency");
    expect(signedQuantityAdjustmentMigration).toContain("quantity_base + coalesce(quantity_contingency_amount, 0) >= 0");
    expect(signedQuantityAdjustmentMigration).toContain("add constraint estimate_row_items_adjustment_percentage_range");
    expect(signedQuantityAdjustmentMigration).toContain("check (adjustment_percentage >= -100 and adjustment_percentage <= 100)");
    expect(signedQuantityAdjustmentMigration).toContain("create or replace function public.estimate_row_adjustment_value");
    expect(signedQuantityAdjustmentMigration).toContain("create or replace function public.estimate_row_payload_adjustment_percentage");
    expect(signedQuantityAdjustmentMigration).toContain("create or replace function public.estimate_row_contingency_value");
    expect(signedQuantityAdjustmentMigration).toContain("select 0;");
    expect(signedQuantityAdjustmentMigration).toContain("create or replace function public.insert_estimate_row_item_with_history");
    expect(signedQuantityAdjustmentMigration).toContain("create or replace function public.replace_estimate_row_item_with_history");
    expect(signedQuantityAdjustmentMigration).toContain("adjustment_percentage");
    expect(signedQuantityAdjustmentMigration).toContain("public.estimate_row_payload_adjustment_percentage(row_payload, 0)");
    expect(signedQuantityAdjustmentMigration).toContain("public.estimate_row_payload_adjustment_percentage(replacement_payload, row_item.adjustment_percentage)");
    expect(signedQuantityAdjustmentMigration).toContain("'adjustmentPercentage', row_item.adjustment_percentage");
    expect(signedQuantityAdjustmentMigration).toContain("'adjustmentValue', public.estimate_row_adjustment_value(row_item)");
    expect(signedQuantityAdjustmentMigration).toContain("adjustment_percentage = case when row_patch ? 'adjustmentPercentage'");
    expect(signedQuantityAdjustmentMigration).toContain("'adjustmentPercentage'");
    expect(signedQuantityAdjustmentMigration).toContain("create or replace function public.project_estimate_list_summaries(target_project_id uuid)");
    expect(signedQuantityAdjustmentMigration).toContain("create or replace function public.project_estimate_list_summaries_for_estimates");
    expect(signedQuantityAdjustmentMigration).toContain("r.quantity * r.unit_cost * coalesce(r.adjustment_percentage, 0) / 100");
    expect(signedQuantityAdjustmentMigration).toContain("row_item.adjustment_percentage");
    expect(signedQuantityAdjustmentMigration).toContain("create or replace function public.insert_estimate_template_into_estimate(");
    expect(signedQuantityAdjustmentMigration).toContain("adjustment_percentage,\n    misc_cost");
    expect(signedQuantityAdjustmentMigration).toContain("restore_deleted_estimate_rows_with_history_quantity_legacy");
    expect(signedQuantityAdjustmentMigration).toContain("restore_deleted_estimate_nodes_with_history_quantity_legacy");
    expect(signedQuantityAdjustmentMigration).toContain("create or replace function public.apply_restored_estimate_row_adjustments");
    expect(signedQuantityAdjustmentMigration).toContain("public.estimate_restore_snapshot_adjustment_percentage(row_snapshot)");
    expect(signedQuantityAdjustmentMigration).toContain("insert_estimate_subtree_into_estimate_quantity_legacy");
    expect(signedQuantityAdjustmentMigration).toContain("source_row.adjustment_percentage");
    expect(signedQuantityAdjustmentMigration).toContain("revoke all on function public.estimate_node_route_context");
    expect(signedQuantityAdjustmentMigration).toContain("grant execute on function public.estimate_node_route_context");
    expect(signedQuantityAdjustmentMigration).toContain("revoke execute on function public.estimate_row_adjustment_value(public.estimate_row_items) from public, anon");
    expect(signedQuantityAdjustmentMigration).toContain("revoke execute on function public.estimate_row_payload_adjustment_percentage(jsonb, numeric) from public, anon");
    expect(signedQuantityAdjustmentMigration).toContain("grant execute on function public.project_estimate_list_summaries(uuid) to authenticated");
  });

  it("persists quantity add-ons and sheet-level adjustments through row RPCs, snapshots, and route context", () => {
    expect(quantityContingencyMigration).toContain("add column if not exists quantity_base numeric(14, 4)");
    expect(quantityContingencyMigration).toContain("add column if not exists quantity_contingency_amount numeric(14, 4)");
    expect(quantityContingencyMigration).toContain("estimate_row_items_quantity_contingency_total");
    expect(quantityContingencyMigration).toContain("create table if not exists public.estimate_sheet_adjustments");
    expect(quantityContingencyMigration).toContain("alter table public.estimate_sheet_adjustments enable row level security");
    expect(quantityContingencyMigration).toContain("create policy estimate_sheet_adjustments_select_authenticated");
    expect(quantityContingencyMigration).toContain("create policy estimate_sheet_adjustments_insert_authenticated");
    expect(quantityContingencyMigration).toContain("create policy estimate_sheet_adjustments_update_authenticated");
    expect(quantityContingencyMigration).toContain("create policy estimate_sheet_adjustments_delete_authenticated");
    expect(quantityContingencyMigration).toContain("public.estimate_row_payload_quantity_base");
    expect(quantityContingencyMigration).toContain("public.estimate_row_payload_quantity_contingency_amount");
    expect(quantityContingencyMigration).toContain("public.estimate_row_payload_quantity");
    expect(quantityContingencyMigration).toContain("'quantityBase', row_item.quantity_base");
    expect(quantityContingencyMigration).toContain("'quantityContingencyAmount', row_item.quantity_contingency_amount");
    expect(quantityContingencyMigration).toContain("quantity_base = next_quantity_base");
    expect(quantityContingencyMigration).toContain("quantity_contingency_amount = next_quantity_contingency_amount");
    expect(quantityContingencyMigration).toContain("public.estimate_sheet_adjustment_snapshot");
    expect(quantityContingencyMigration).toContain("public.estimate_sheet_adjustment_value");
    expect(quantityContingencyMigration).toContain("'sheetAdjustment', public.estimate_sheet_adjustment_snapshot(resolved.estimate_id)");
    expect(quantityContingencyMigration).toContain("'adjustmentValue', public.estimate_sheet_adjustment_value(estimate.id)");
    expect(quantityContingencyMigration).toContain("create or replace function public.move_estimate_row_component_with_history");
    expect(quantityContingencyMigration).toContain("source_quantity_base := public.estimate_row_payload_quantity_base");
    expect(quantityContingencyMigration).toContain("target_quantity_base := public.estimate_row_payload_quantity_base");
    expect(quantityContingencyMigration).toContain("grant execute on function public.move_estimate_row_component_with_history");
    expect(quantityContingencyMigration).toContain("create or replace function public.restore_deleted_estimate_rows_with_history");
    expect(quantityContingencyMigration).toContain("restored_quantity_base := public.estimate_row_payload_quantity_base");
    expect(quantityContingencyMigration).toContain("create or replace function public.restore_deleted_estimate_nodes_with_history");
    expect(quantityContingencyMigration).toContain("public.estimate_row_payload_quantity(to_jsonb(row_snapshot), row_snapshot.\"quantityBase\"");
    expect(quantityContingencyMigration).toContain("create or replace function public.restore_estimate_sheet_version_as_copy");
    expect(quantityContingencyMigration).toContain("insert into public.estimate_sheet_adjustments");
    expect(quantityContingencyMigration).toContain("public.estimate_row_payload_quantity(to_jsonb(row_row), row_row.\"quantityBase\"");
    expect(quantityContingencyMigration).toContain("grant execute on function public.restore_deleted_estimate_rows_with_history");
    expect(quantityContingencyMigration).toContain("grant execute on function public.restore_deleted_estimate_nodes_with_history");
    expect(quantityContingencyMigration).toContain("grant execute on function public.restore_estimate_sheet_version_as_copy");
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

  it("defines tree/subtree post-success Undo history contracts", () => {
    expect(nodeDeleteUndoMigration).toContain("create or replace function public.estimate_node_snapshot");
    expect(nodeDeleteUndoMigration).toContain("'deletedNodes', deleted_node_snapshots");
    expect(nodeDeleteUndoMigration).toContain("'deletedRows', deleted_row_snapshots");
    expect(nodeDeleteUndoMigration).toContain("create or replace function public.restore_deleted_estimate_nodes_with_history");
    expect(nodeDeleteUndoMigration).toContain("event.event_type in ('node_deleted_with_children', 'nodes_bulk_deleted_with_children')");
    expect(nodeDeleteUndoMigration).toContain("'nodes_restored_with_children'");
    expect(nodeDeleteUndoMigration).toContain("target_node_ids uuid[] default null");
    expect(nodeDeleteUndoMigration).toContain("<= 5242880");
    expect(nodeDeleteUndoMigration).toContain("revoke all on function public.restore_deleted_estimate_nodes_with_history(uuid, uuid, uuid, uuid[], uuid, uuid) from public, anon");
    expect(nodeDeleteUndoMigration).toContain("grant execute on function public.restore_deleted_estimate_nodes_with_history(uuid, uuid, uuid, uuid[], uuid, uuid) to authenticated");
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

  it("keeps the idempotency helper off the anonymous execute surface", () => {
    const helperGrantMigration = readMigrationBySuffix("_estimate_sheet_event_result_execute_hardening.sql");

    expect(helperGrantMigration).toContain(
      "revoke execute on function public.estimate_sheet_event_result(uuid, uuid) from public, anon",
    );
    expect(helperGrantMigration).toContain(
      "grant execute on function public.estimate_sheet_event_result(uuid, uuid) to authenticated, service_role",
    );
    expect(helperGrantMigration).not.toContain("to anon");
  });

  it("defines project-specific row detach RPC with revision, provenance, and history contracts", () => {
    const unlinkMigration = readMigrationBySuffix("_unlink_estimate_row_items.sql");

    expect(unlinkMigration).toContain("create or replace function public.unlink_estimate_row_item_from_library_with_history");
    expect(unlinkMigration).toContain("security definer");
    expect(unlinkMigration).toContain("set search_path = ''");
    expect(unlinkMigration).toContain("public.resolve_estimate_workspace");
    expect(unlinkMigration).toContain("for update");
    expect(unlinkMigration).toContain("estimate_sheet_row_revision_conflict");
    expect(unlinkMigration).toContain("source_library_item_id = null");
    expect(unlinkMigration).toContain("link_state = 'detached'");
    expect(unlinkMigration).toContain("source_snapshot = row_item.source_snapshot");
    expect(unlinkMigration).toContain("row_revision = row_item.row_revision + 1");
    expect(unlinkMigration).toContain("'row_unlinked'");
    expect(unlinkMigration).toContain("'detachedFromSourceLibraryItemId'");
    expect(unlinkMigration).toContain("grant execute on function public.unlink_estimate_row_item_from_library_with_history");
    expect(unlinkMigration).not.toContain("area_node_id");
    expect(unlinkMigration).not.toContain("cost_library_items");
  });
});
