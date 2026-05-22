import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

function readMigration(suffix: string) {
  const migrationFile = readdirSync("supabase/migrations").find((file) => file.endsWith(suffix));
  if (!migrationFile) throw new Error(`Migration ending in ${suffix} was not found.`);
  return readFileSync(join("supabase/migrations", migrationFile), "utf8");
}

describe("component-library estimate-template schema", () => {
  const migration = readMigration("_component_library_templates.sql");

  it("persists workspace-scoped estimate templates with nodes and rows", () => {
    expect(migration).toContain("create table if not exists public.estimate_templates");
    expect(migration).toContain("workspace_id uuid not null references public.workspaces(id) on delete cascade");
    expect(migration).toContain("create table if not exists public.estimate_template_nodes");
    expect(migration).toContain("template_id uuid not null references public.estimate_templates(id) on delete cascade");
    expect(migration).toContain("parent_id uuid references public.estimate_template_nodes(id) on delete cascade");
    expect(migration).toContain("kind public.estimate_node_kind not null");
    expect(migration).toContain("check (kind in ('group', 'area'))");
    expect(migration).toContain("create table if not exists public.estimate_template_row_items");
    expect(migration).toContain("template_node_id uuid not null references public.estimate_template_nodes(id) on delete cascade");
    expect(migration).toContain("source_library_item_id uuid references public.cost_library_items(id) on delete set null");
    expect(migration).toContain("source_snapshot jsonb");
    expect(migration).toContain("link_state public.estimate_row_link_state not null default 'unlinked'");
  });

  it("adds indexes, updated-at triggers, RLS policies, and authenticated grants", () => {
    [
      "estimate_templates_workspace_sort_idx",
      "estimate_template_nodes_template_parent_sort_idx",
      "estimate_template_row_items_template_node_sort_idx",
    ].forEach((indexName) => expect(migration).toContain(indexName));

    [
      "estimate_templates_set_updated_at",
      "estimate_template_nodes_set_updated_at",
      "estimate_template_row_items_set_updated_at",
    ].forEach((triggerName) => expect(migration).toContain(triggerName));

    [
      "alter table public.estimate_templates enable row level security",
      "alter table public.estimate_template_nodes enable row level security",
      "alter table public.estimate_template_row_items enable row level security",
      "public.is_workspace_member(workspace_id)",
      "public.is_workspace_member(template.workspace_id)",
    ].forEach((rlsFragment) => expect(migration).toContain(rlsFragment));

    [
      "grant select, insert, update, delete on public.estimate_templates to authenticated",
      "grant select, insert, update, delete on public.estimate_template_nodes to authenticated",
      "grant select, insert, update, delete on public.estimate_template_row_items to authenticated",
    ].forEach((grantStatement) => expect(migration).toContain(grantStatement));
  });

  it("enforces the same active group and area hierarchy as estimate sheets", () => {
    [
      "create or replace function public.validate_estimate_template_tree(target_template_id uuid)",
      "create constraint trigger estimate_template_nodes_enforce_tree",
      "create constraint trigger estimate_template_row_items_enforce_area_node",
      "Template node tree violates hierarchy rules.",
      "Template row items must belong to area nodes.",
      "Template node tree creates a cycle.",
    ].forEach((fragment) => expect(migration).toContain(fragment));
    expect(migration).toMatch(/create or replace function public\.enforce_estimate_template_node_tree\(\)\s+returns trigger\s+language plpgsql\s+security definer/i);
    expect(migration).toMatch(/create or replace function public\.enforce_estimate_template_row_item_area_node\(\)\s+returns trigger\s+language plpgsql\s+security definer/i);
  });

  it("treats root template sibling sort slots as unique and copies templates through one RPC", () => {
    expect(migration).toContain("unique nulls not distinct (template_id, parent_id, sort_order)");
    expect(migration).toContain("create or replace function public.insert_estimate_template_into_estimate(");
    expect(migration).toContain("target_project_id uuid");
    expect(migration).toContain("source_template_id uuid");
    expect(migration).toContain("target_parent_node_id uuid");
    expect(migration).toContain("perform public.validate_estimate_template_tree(source_template_id)");
    expect(migration).toContain("perform public.validate_estimate_node_tree(target_estimate_id)");
    expect(migration).toContain("revoke execute on function public.validate_estimate_template_tree(uuid) from public");
    expect(migration).toContain("revoke execute on function public.enforce_estimate_template_node_tree() from anon, authenticated");
    expect(migration).toContain("revoke execute on function public.enforce_estimate_template_row_item_area_node() from anon, authenticated");
    expect(migration).toContain("grant execute on function public.validate_estimate_template_tree(uuid) to authenticated");
    expect(migration).toContain("grant execute on function public.insert_estimate_template_into_estimate(uuid, uuid, uuid, uuid) to authenticated");
  });

  it("seeds canonical shipped templates so id-only insertion can copy them after migration", () => {
    expect(migration).toContain("insert into public.estimate_templates (");
    expect(migration).toContain("condo-fit-out-starter");
    expect(migration).toContain("Condo Fit-Out Starter");
    expect(migration).toContain("insert into public.estimate_template_nodes (");
    expect(migration).toContain("condo-interior-fit-out");
    expect(migration).toContain("insert into public.estimate_template_row_items (");
    expect(migration).toContain("condo-living-sofa");
    expect(migration).toContain("on conflict (id) do update");
  });

  it("drains deferred seed trigger events before enabling RLS", () => {
    const drainIndex = migration.indexOf("set constraints all immediate");
    const rlsIndex = migration.indexOf("alter table public.estimate_template_nodes enable row level security");

    expect(drainIndex).toBeGreaterThan(0);
    expect(rlsIndex).toBeGreaterThan(drainIndex);
  });
});
