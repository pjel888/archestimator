import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const migrationPath = readdirSync(join(process.cwd(), "supabase/migrations"))
  .filter((file) => file.endsWith("_component_library_item_versioning.sql"))
  .sort()
  .at(-1);

if (!migrationPath) throw new Error("Missing component library item versioning migration.");

const migration = readFileSync(join(process.cwd(), "supabase/migrations", migrationPath), "utf8");
const repository = readFileSync(join(process.cwd(), "src/lib/repositories/component-library-repository.ts"), "utf8");
const actions = readFileSync(join(process.cwd(), "src/lib/component-library/actions.ts"), "utf8");
const manager = readFileSync(join(process.cwd(), "src/components/workshop/component-library-manager/ComponentLibraryManager.tsx"), "utf8");
const addModal = readFileSync(join(process.cwd(), "src/components/workshop/component-library-manager/AddComponentModal.tsx"), "utf8");
const supabaseTypes = readFileSync(join(process.cwd(), "src/lib/supabase/types.ts"), "utf8");

describe("component library item versioning schema", () => {
  it("adds lifecycle state, price options, and append-only history tables", () => {
    expect(migration).toContain("create type public.component_lifecycle_state as enum");
    expect(migration).toContain("'in_production'");
    expect(migration).toContain("add column if not exists lifecycle_state public.component_lifecycle_state");
    expect(migration).toContain("add column if not exists active_price_option_id uuid");
    expect(migration).toContain("create table if not exists public.cost_library_item_versions");
    expect(migration).toContain("create table if not exists public.cost_library_item_price_options");
    expect(migration).toContain("create table if not exists public.cost_library_item_price_history");
    expect(migration).toContain("create table if not exists public.cost_library_item_state_history");
    expect(migration).toContain("cost_library_item_price_options_default_active_key");
    expect(migration).toContain("set constraints all immediate");
  });

  it("uses RPCs for component creation, price changes, and lifecycle changes", () => {
    expect(migration).toContain("create or replace function public.create_cost_library_component");
    expect(migration).toContain("create or replace function public.update_cost_library_component");
    expect(migration).toContain("create or replace function public.upsert_cost_library_component_price_option");
    expect(migration).toContain("create or replace function public.set_cost_library_component_lifecycle_state");
    expect(migration.match(/security definer/g)?.length).toBeGreaterThanOrEqual(4);
    expect(migration).toContain("'Component created'");
    expect(migration).toContain("'Price option changed'");
    expect(migration).toContain("'Lifecycle state changed'");
    expect(migration).toContain("grant execute on function public.create_cost_library_component(uuid, jsonb, jsonb) to authenticated");
    expect(migration).toContain("grant select, insert, update on public.cost_library_item_price_options to authenticated");
    expect(migration).not.toContain("grant select, insert, update, delete on public.cost_library_item_price_options");
  });

  it("backfills existing components into versioned state", () => {
    expect(migration).toContain("insert into public.cost_library_item_price_options");
    expect(migration).toContain("'Initial backfill'");
    expect(migration).toContain("insert into public.cost_library_item_price_history");
    expect(migration).toContain("insert into public.cost_library_item_state_history");
    expect(migration).toContain("insert into public.cost_library_item_versions");
    expect(migration).toContain("'Initial version backfill'");
  });

  it("wires repository, actions, types, and UI controls to the versioned contract", () => {
    expect(repository).toContain("cost_library_item_price_options");
    expect(repository).toContain("cost_library_item_versions");
    expect(repository).toContain("cost_library_item_price_history");
    expect(repository).toContain("cost_library_item_state_history");
    expect(actions).toContain("createCostLibraryComponent");
    expect(actions).toContain("upsertCostLibraryComponentPriceOption");
    expect(actions).toContain("changeCostLibraryComponentLifecycleState");
    expect(manager).toContain("Pricing option for");
    expect(manager).toContain("Lifecycle state for");
    expect(manager).toContain("History / v");
    expect(addModal).toContain("Add Component");
    expect(addModal).toContain("Add price option");
    expect(supabaseTypes).toContain("cost_library_item_price_options");
    expect(supabaseTypes).toContain("component_lifecycle_state");
  });
});
