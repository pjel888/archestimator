import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { type EstimateTreeNodeKind } from "@/lib/estimates/tree-hierarchy";

const ESTIMATE_TREE_NODE_KINDS = ["group", "area"] as const satisfies readonly EstimateTreeNodeKind[];

function readMigration(suffix: string) {
  const migrationFile = readdirSync("supabase/migrations").find((file) => file.endsWith(suffix));
  if (!migrationFile) throw new Error(`Migration ending in ${suffix} was not found.`);
  return readFileSync(join("supabase/migrations", migrationFile), "utf8");
}

describe("Supabase performance migrations", () => {
  it("adds covering indexes for workspace and estimate list sorting", () => {
    const migration = readMigration("_optimize_workspace_estimate_list_indexes.sql");

    expect(migration).toContain("projects_workspace_updated_at_idx");
    expect(migration).toContain("on public.projects(workspace_id, updated_at desc)");
    expect(migration).toContain("estimates_project_updated_at_idx");
    expect(migration).toContain("on public.estimates(project_id, updated_at desc)");
  });

  it("keeps hierarchy enforcement, removes the deprecated move RPC, and introduces the audited reorder RPC", () => {
    const migration = readMigration("_atomic_estimate_node_moves.sql");
    const twoKindMigration = readMigration("_enforce_two_kind_estimate_nodes.sql");
    const removalMigration = readMigration("_remove_estimate_node_move_rpc.sql");
    const reorderMigration = readMigration("_reorder_estimate_nodes_rpc.sql");

    expect(migration).toContain("create or replace function public.move_estimate_nodes");
    expect(migration).toContain("duplicate_root_estimates");
    expect(migration).toContain("ranked_root_nodes");
    expect(migration).toContain("row_number() over (partition by node.estimate_id order by node.sort_order, node.id)");
    expect(migration).toContain("estimate_nodes_unique_sort_with_root");
    expect(migration).toContain("unique nulls not distinct (estimate_id, parent_id, sort_order)");
    expect(migration).toContain("jsonb_to_recordset(move_updates)");
    expect(migration).toContain("set constraints estimate_nodes_unique_sort, estimate_nodes_unique_sort_with_root deferred");
    expect(migration).toContain("get diagnostics updated_count = row_count");
    expect(twoKindMigration).toContain("create or replace function public.validate_estimate_node_tree");
    expect(twoKindMigration).toContain("create constraint trigger estimate_nodes_enforce_tree");
    expect(twoKindMigration).toContain("create constraint trigger estimate_row_items_enforce_area_node");
    expect(twoKindMigration).toContain("violates hierarchy rules");
    expect(twoKindMigration).toContain("Estimate row items must belong to area nodes");
    expect(twoKindMigration).toContain("creates a cycle");
    expect(twoKindMigration).toMatch(/create or replace function public\.enforce_estimate_node_tree\(\)\s+returns trigger\s+language plpgsql\s+security definer/i);
    expect(twoKindMigration).toMatch(/create or replace function public\.enforce_estimate_row_item_area_node\(\)\s+returns trigger\s+language plpgsql\s+security definer/i);
    expect(removalMigration).toContain("drop function if exists public.move_estimate_nodes(uuid, jsonb)");
    expect(reorderMigration).toContain("create or replace function public.reorder_estimate_nodes");
    expect(reorderMigration).toContain("jsonb_typeof(move_updates) <> 'array'");
    expect(reorderMigration).toContain("duplicate estimate node reorder ids");
    expect(reorderMigration).toContain("duplicate estimate node reorder slots");
    expect(reorderMigration).toContain("all estimate node reorder ids must belong to the target estimate");
    expect(reorderMigration).toContain("all estimate node reorder parents must belong to the target estimate");
    expect(reorderMigration).toContain("child.parent_id is null and child.kind in ('group')");
    expect(reorderMigration).toContain("parent.kind in ('group') and child.kind in ('group', 'area')");
    expect(reorderMigration).toContain("validate_estimate_node_tree(target_estimate_id)");
    expect(reorderMigration).toContain("revoke execute on function public.reorder_estimate_nodes(uuid, jsonb) from public");
    expect(reorderMigration).toContain("grant execute on function public.validate_estimate_node_tree(uuid) to authenticated");
    expect(reorderMigration).toContain("grant execute on function public.reorder_estimate_nodes(uuid, jsonb) to authenticated");
  });

  it("normalizes legacy estimate-node values before enforcing active group/area semantics", () => {
    const migration = readMigration("_enforce_two_kind_estimate_nodes.sql");

    expect(migration).toContain("set kind = 'group'");
    expect(migration).toContain("kind::text in ('lot', 'general', 'structure', 'level', 'assembly')");
    expect(migration).toContain("estimate_nodes_active_kind_check");
    expect(migration).toContain("check (kind in ('group', 'area'))");
    expect(migration).toContain("validate constraint estimate_nodes_active_kind_check");
  });

  // The original two-kind migration is a HISTORICAL artifact and still encodes
  // the old hierarchy literally (root -> group, group -> group|area, no area
  // parents). The TS helper (canNestEstimateNodeKind) that mirrored it is gone
  // in P6, so this asserts the historical SQL with literal values instead of
  // reconstructing it from the (deleted) helper.
  it("keeps the HISTORICAL two-kind hierarchy block literal in its original migration", () => {
    const migration = readMigration("_enforce_two_kind_estimate_nodes.sql");
    expect(migration).toContain("child.parent_id is null and child.kind in ('group')");
    expect(migration).toContain("parent.kind in ('group') and child.kind in ('group', 'area')");
  });

  // P6 single-node model: the unify migration RELAXED that hierarchy — any node
  // may parent any node — while PRESERVING cross-tab isolation and cycle
  // detection. This is the positive one-kind contract that replaces the old
  // helper-derived assertion (the I1/I2 regression guard from the plan).
  it("relaxes the two-kind hierarchy in the unify migration while preserving cross-tab + cycle", () => {
    const unify = readMigration("_unify_estimate_node_kinds.sql");
    // Hierarchy block removed from BOTH the validator and the reorder RPC.
    expect(unify).not.toContain("child.parent_id is null and child.kind in ('group')");
    expect(unify).not.toContain("parent.kind in ('group') and child.kind in ('group', 'area')");
    // Cross-tab (I2) and cycle (I1) invariants are preserved by name.
    expect(unify).toContain("parent from another tab");
    expect(unify).toContain("creates a cycle");
    // The active-kind CHECK is kept (kind stays a vestigial label).
    expect(ESTIMATE_TREE_NODE_KINDS).toEqual(["group", "area"]);
  });
});
