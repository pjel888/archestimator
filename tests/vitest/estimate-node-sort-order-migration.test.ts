import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

function readMigrationBySuffix(suffix: string) {
  const migrationFile = readdirSync(join(process.cwd(), "supabase/migrations"))
    .filter((file) => file.endsWith(suffix))
    .sort()
    .at(-1);
  if (!migrationFile) throw new Error(`Missing migration with suffix ${suffix}.`);
  return readFileSync(join(process.cwd(), "supabase/migrations", migrationFile), "utf8");
}

describe("estimate node numeric sort-order migration", () => {
  const migration = readMigrationBySuffix("_estimate_nodes_numeric_sort_order.sql");

  it("converts estimate node sort_order to numeric while preserving tab-aware ordering guards", () => {
    expect(migration).toContain("alter column sort_order type numeric(20,4)");
    expect(migration).toContain("estimate_nodes_tab_unique_sort");
    expect(migration).toContain("unique (estimate_tab_id, parent_id, sort_order)");
    expect(migration).toContain("estimate_nodes_tab_unique_sort_with_root");
    expect(migration).toContain("unique nulls not distinct (estimate_tab_id, parent_id, sort_order)");
    expect(migration).toContain("estimate_nodes_estimate_parent_sort_idx");
    expect(migration).toContain("estimate_nodes_tab_parent_sort_idx");
  });

  it("rewrites active estimate-node RPC sort-order contracts from integer to numeric", () => {
    expect(migration).toContain("'sort_order integer', 'sort_order numeric'");
    expect(migration).toContain("'initial_sort_order integer', 'initial_sort_order numeric'");
    expect(migration).toContain("drop function if exists public.create_estimate_node_with_history(uuid, uuid, uuid, public.estimate_node_kind, text, integer, uuid, uuid, uuid)");
    expect(migration).toContain("grant execute on function public.create_estimate_node_with_history");
    expect(migration).toContain("text, numeric, uuid, uuid, uuid");
  });

  it("updates secondary estimate-node insert paths that can write sort_order", () => {
    expect(migration).toContain("insert_estimate_template_into_estimate(uuid,uuid,uuid,uuid)");
    expect(migration).toContain("'max_sibling_sort_order integer', 'max_sibling_sort_order numeric'");
    expect(migration).toContain("'source_sort_order integer', 'source_sort_order numeric'");
    expect(migration).toContain("insert_estimate_subtree_into_estimate(uuid,uuid,uuid,uuid,uuid,uuid)");
    expect(migration).toContain("insert_estimate_template_node_into_estimate_with_history(uuid,uuid,uuid,uuid,uuid,uuid,uuid,uuid)");
    expect(migration).toContain("'root_sort_order integer', 'root_sort_order numeric'");
    expect(migration).toContain("'(node_payload->>''sortOrder'')::integer', '(node_payload->>''sortOrder'')::numeric'");
  });
});
