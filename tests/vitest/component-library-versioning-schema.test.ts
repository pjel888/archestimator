import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const migrationPath = readdirSync(join(process.cwd(), "supabase/migrations"))
  .filter((file) => file.endsWith("_component_library_item_versioning.sql"))
  .sort()
  .at(-1);

if (!migrationPath) throw new Error("Missing component library item versioning migration.");

const migration = readFileSync(join(process.cwd(), "supabase/migrations", migrationPath), "utf8");
const variantsMigrationPath = readdirSync(join(process.cwd(), "supabase/migrations"))
  .filter((file) => file.endsWith("_component_library_variants.sql"))
  .sort()
  .at(-1);

if (!variantsMigrationPath) throw new Error("Missing component library variants migration.");

const variantsMigration = readFileSync(join(process.cwd(), "supabase/migrations", variantsMigrationPath), "utf8");
const variantRpcGrantsMigrationPath = readdirSync(join(process.cwd(), "supabase/migrations"))
  .filter((file) => file.endsWith("_component_library_variant_rpc_grants.sql"))
  .sort()
  .at(-1);

if (!variantRpcGrantsMigrationPath) throw new Error("Missing component library variant RPC grants migration.");

const variantRpcGrantsMigration = readFileSync(join(process.cwd(), "supabase/migrations", variantRpcGrantsMigrationPath), "utf8");
const priceAuditGrantMigrationPath = readdirSync(join(process.cwd(), "supabase/migrations"))
  .filter((file) => file.endsWith("_harden_component_price_audit_grants.sql"))
  .sort()
  .at(-1);

if (!priceAuditGrantMigrationPath) throw new Error("Missing component price audit grant hardening migration.");

const priceAuditGrantMigration = readFileSync(join(process.cwd(), "supabase/migrations", priceAuditGrantMigrationPath), "utf8");
const variantAssetsMigrationPath = readdirSync(join(process.cwd(), "supabase/migrations"))
  .filter((file) => file.endsWith("_component_variant_assets_cost_entries.sql"))
  .sort()
  .at(-1);

if (!variantAssetsMigrationPath) throw new Error("Missing component variant assets and cost entries migration.");

const variantAssetsMigration = readFileSync(join(process.cwd(), "supabase/migrations", variantAssetsMigrationPath), "utf8");
const identityMigrationPath = readdirSync(join(process.cwd(), "supabase/migrations"))
  .filter((file) => file.endsWith("_component_library_identity_variant_sku_brand_view.sql"))
  .sort()
  .at(-1);

if (!identityMigrationPath) throw new Error("Missing component library identity and brand view migration.");

const identityMigration = readFileSync(join(process.cwd(), "supabase/migrations", identityMigrationPath), "utf8");
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

  it("wires repository, actions, types, and focused UI surfaces to the versioned contract", () => {
    expect(repository).toContain("cost_library_item_price_options");
    expect(repository).toContain("cost_library_item_versions");
    expect(repository).toContain("cost_library_item_price_history");
    expect(repository).toContain("cost_library_item_state_history");
    expect(actions).toContain("createCostLibraryComponent");
    expect(actions).toContain("upsertCostLibraryComponentPriceOption");
    expect(actions).toContain("changeCostLibraryComponentLifecycleState");
    expect(manager).toContain("data-component-catalogue-card-id");
    expect(manager).toContain("Cost /");
    expect(manager).not.toContain("Pricing option for");
    expect(manager).not.toContain("Lifecycle state for");
    expect(manager).not.toContain("History / v");
    expect(addModal).toContain("Add Component");
    expect(addModal).toContain("ADD_COMPONENT_MODAL_TABS");
    expect(addModal).toContain('role="tablist"');
    expect(addModal).toContain("Add component sections");
    expect(addModal).toContain('aria-label="Activity"');
    expect(addModal).toContain("Component lifecycle");
    expect(addModal).toContain("Manage variants");
    expect(addModal).toContain('const DEFAULT_VARIANT_LABEL = "V1"');
    expect(addModal).toContain("Add variant");
    expect(addModal).toContain("aria-label=\"Unit cost\"");
    expect(supabaseTypes).toContain("cost_library_item_price_options");
    expect(supabaseTypes).toContain("component_lifecycle_state");
  });

  it("extends price options into component variants without replacing component identity", () => {
    expect(variantsMigration).toContain("add column if not exists variant_description");
    expect(variantsMigration).toContain("add column if not exists package_quantity numeric");
    expect(variantsMigration).toContain("add column if not exists dimension_length numeric");
    expect(variantsMigration).toContain("add column if not exists variant_metadata jsonb");
    expect(variantsMigration).toContain("cost_library_item_price_options_variant_sort_idx");
    expect(variantsMigration).toContain("'variantDescription'");
    expect(variantsMigration).toContain("'packageQuantity'");
    expect(variantsMigration).toContain("'dimensionLength'");
    expect(variantsMigration).toContain("'Variant changed'");
    expect(actions).toContain("variantDescription");
    expect(repository).toContain("variantDescription");
    expect(supabaseTypes).toContain("variant_description");
  });

  it("keeps component variant mutation RPCs off the anonymous execute surface", () => {
    expect(variantRpcGrantsMigration).toContain("revoke execute on function public.create_cost_library_component(uuid, jsonb, jsonb) from public");
    expect(variantRpcGrantsMigration).toContain("revoke execute on function public.create_cost_library_component(uuid, jsonb, jsonb) from anon");
    expect(variantRpcGrantsMigration).toContain("revoke execute on function public.update_cost_library_component(uuid, uuid, jsonb) from public");
    expect(variantRpcGrantsMigration).toContain("revoke execute on function public.upsert_cost_library_component_price_option(uuid, uuid, jsonb) from anon");
    expect(variantRpcGrantsMigration).toContain("revoke execute on function public.sync_cost_library_item_brand_ref() from authenticated");
  });

  it("hardens direct price option mutations and records price audit writes through D1 helpers", () => {
    expect(priceAuditGrantMigration).toContain('drop policy if exists "members can manage component price options" on public.cost_library_item_price_options');
    expect(priceAuditGrantMigration).toContain('drop policy if exists "members can insert component price history" on public.cost_library_item_price_history');
    expect(priceAuditGrantMigration).toContain('create policy "members can view component price options" on public.cost_library_item_price_options');
    expect(priceAuditGrantMigration).toContain("for select to authenticated");
    expect(priceAuditGrantMigration).toContain("revoke insert, update, delete on public.cost_library_item_price_options from authenticated");
    expect(priceAuditGrantMigration).toContain("revoke insert, update, delete on public.cost_library_item_price_history from authenticated");
    expect(priceAuditGrantMigration).toContain("grant select on public.cost_library_item_price_options to authenticated");
    expect(priceAuditGrantMigration).toContain("grant select on public.cost_library_item_price_history to authenticated");
    expect(priceAuditGrantMigration).toContain("grant execute on function public.upsert_cost_library_component_price_option(uuid, uuid, jsonb) to authenticated");
    expect(actions).toContain("upsertComponentPriceOptionInD1");
    expect(actions).toContain("INSERT INTO cost_library_item_price_options");
    expect(actions).toContain("INSERT OR IGNORE INTO cost_library_item_price_history");
    expect(actions).not.toContain('supabase.rpc("upsert_cost_library_component_price_option"');
    expect(actions).not.toContain('.from("cost_library_item_price_options")');
  });

  it("adds variant-owned assets, private attachments, and selectable cost entries", () => {
    expect(variantAssetsMigration).toContain("add column if not exists image_bucket");
    expect(variantAssetsMigration).toContain("add column if not exists image_path");
    expect(variantAssetsMigration).toContain("add column if not exists thumbnail_path");
    expect(variantAssetsMigration).toContain("add column if not exists active_cost_entry_id");
    expect(variantAssetsMigration).toContain("create table if not exists public.cost_library_item_variant_cost_entries");
    expect(variantAssetsMigration).toContain("cost_library_variant_cost_entries_current_key");
    expect(variantAssetsMigration).toContain("create table if not exists public.cost_library_item_variant_attachments");
    expect(variantAssetsMigration).toContain("'component-attachments'");
    expect(variantAssetsMigration).toContain("false");
    expect(variantAssetsMigration).toContain("application/pdf");
    expect(variantAssetsMigration).toContain("application/vnd.ms-excel");
    expect(variantAssetsMigration).toContain("application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
    expect(variantAssetsMigration).toContain("alter table public.cost_library_item_variant_cost_entries enable row level security");
    expect(variantAssetsMigration).toContain("alter table public.cost_library_item_variant_attachments enable row level security");
    expect(variantAssetsMigration).toContain("grant select, insert, update on public.cost_library_item_variant_cost_entries to authenticated");
    expect(variantAssetsMigration).toContain("workspace members can upload own component attachments");
    expect(variantAssetsMigration).toContain("'costEntries'");
    expect(variantAssetsMigration).toContain("'attachments'");
    expect(variantAssetsMigration).toContain("revoke execute on function public.create_cost_library_component(uuid, jsonb, jsonb) from anon");
  });

  it("removes component kind and moves SKU/reference to variants", () => {
    expect(identityMigration).toContain("add column if not exists sku text");
    expect(identityMigration).toContain("set sku = nullif(trim(item.sku), '')");
    expect(identityMigration).toContain("drop column if exists kind");
    expect(identityMigration).toContain("drop column if exists sku");
    expect(identityMigration).toContain("'sku', price_option.sku");
    expect(identityMigration).not.toContain("component_kind");
    expect(actions).toContain("sku?: string | null;");
    expect(actions).toContain("sku: input.sku?.trim() || null");
    expect(actions).not.toContain("kind?: Tables<\"cost_library_items\">[\"kind\"]");
    expect(actions).not.toContain("brandId?: string | null;\n  sku?: string | null;\n  unit: string;");
    expect(addModal).not.toContain("label=\"Kind\"");
    expect(addModal).toContain("label=\"SKU / Reference\"");
    expect(addModal).toContain("setActiveVariantAsDefault");
    expect(addModal).toContain("aria-pressed={activeVariant?.isDefault ?? false}");
    expect(supabaseTypes).toContain("sku: string | null");
    expect(supabaseTypes).not.toContain("kind: Database[\"public\"][\"Enums\"][\"cost_library_item_kind\"]");
  });
});
