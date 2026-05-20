import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { canNestEstimateNodeKind, type EstimateTreeNodeKind } from "@/lib/estimates/tree-hierarchy";

const ESTIMATE_TREE_NODE_KINDS = ["group", "lot", "general", "structure", "level", "area"] as const satisfies readonly EstimateTreeNodeKind[];

function toSqlList(values: readonly string[]) {
  return values.map((value) => `'${value}'`).join(", ");
}

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

  it("keeps hierarchy enforcement and removes the deprecated estimate node move RPC", () => {
    const migration = readMigration("_atomic_estimate_node_moves.sql");
    const removalMigration = readMigration("_remove_estimate_node_move_rpc.sql");

    expect(migration).toContain("create or replace function public.move_estimate_nodes");
    expect(migration).toContain("duplicate_root_estimates");
    expect(migration).toContain("ranked_root_nodes");
    expect(migration).toContain("row_number() over (partition by node.estimate_id order by node.sort_order, node.id)");
    expect(migration).toContain("estimate_nodes_unique_sort_with_root");
    expect(migration).toContain("unique nulls not distinct (estimate_id, parent_id, sort_order)");
    expect(migration).toContain("jsonb_to_recordset(move_updates)");
    expect(migration).toContain("set constraints estimate_nodes_unique_sort, estimate_nodes_unique_sort_with_root deferred");
    expect(migration).toContain("get diagnostics updated_count = row_count");
    expect(migration).toContain("create or replace function public.validate_estimate_node_tree");
    expect(migration).toContain("create constraint trigger estimate_nodes_enforce_tree");
    expect(migration).toContain("create constraint trigger estimate_row_items_enforce_area_node");
    expect(migration).toContain("violates hierarchy rules");
    expect(migration).toContain("parent.kind in ('group', 'lot', 'general', 'structure', 'level') and child.kind in ('group', 'lot', 'general', 'structure', 'level', 'area')");
    expect(migration).toContain("Estimate row items must belong to area nodes");
    expect(migration).toContain("creates a cycle");
    expect(migration).toContain("creates duplicate sibling sort orders");
    expect(migration).toMatch(/create or replace function public\.enforce_estimate_node_tree\(\)\s+returns trigger\s+language plpgsql\s+security definer/i);
    expect(migration).toMatch(/create or replace function public\.enforce_estimate_row_item_area_node\(\)\s+returns trigger\s+language plpgsql\s+security definer/i);
    expect(removalMigration).toContain("drop function if exists public.move_estimate_nodes(uuid, jsonb)");
  });

  it("keeps database hierarchy enforcement aligned with the TypeScript tree matrix", () => {
    const migration = readMigration("_atomic_estimate_node_moves.sql");
    const rootChildKinds = ESTIMATE_TREE_NODE_KINDS.filter((kind) => canNestEstimateNodeKind(kind, null));
    const folderParentKinds = ESTIMATE_TREE_NODE_KINDS.filter((parentKind) =>
      ESTIMATE_TREE_NODE_KINDS.some((childKind) => canNestEstimateNodeKind(childKind, parentKind)),
    );
    const folderChildKinds = ESTIMATE_TREE_NODE_KINDS.filter((childKind) =>
      folderParentKinds.every((parentKind) => canNestEstimateNodeKind(childKind, parentKind)),
    );

    expect(rootChildKinds).toEqual(["group", "lot", "general", "structure", "level"]);
    expect(folderParentKinds).toEqual(["group", "lot", "general", "structure", "level"]);
    expect(folderChildKinds).toEqual(["group", "lot", "general", "structure", "level", "area"]);
    expect(ESTIMATE_TREE_NODE_KINDS.filter((childKind) => canNestEstimateNodeKind(childKind, "area"))).toEqual([]);
    expect(migration).toContain(`child.parent_id is null and child.kind in (${toSqlList(rootChildKinds)})`);
    expect(migration).toContain(`parent.kind in (${toSqlList(folderParentKinds)}) and child.kind in (${toSqlList(folderChildKinds)})`);
  });
});
