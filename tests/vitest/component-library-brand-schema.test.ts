import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

const migrationPath = join(process.cwd(), "supabase/migrations/20260524053500_component_brand_library.sql");
const d1MigrationPath = join(process.cwd(), "migrations/0028_component_library_action_support.sql");
const d1PromotionMigrationPath = join(process.cwd(), "migrations/0026_component_promotion_support.sql");
const repositoryPath = join(process.cwd(), "src/lib/repositories/component-library-repository.ts");

describe("component brand schema", () => {
  it("adds workspace-scoped component brands and links cost library items", () => {
    const migration = readFileSync(migrationPath, "utf8");

    expect(migration).toContain("create table if not exists public.component_brands");
    expect(migration).toContain("constraint component_brands_workspace_normalized_name_key unique (workspace_id, normalized_name)");
    expect(migration).toContain("add column if not exists brand_id uuid references public.component_brands(id) on delete set null");
    expect(migration).toContain("alter table public.component_brands enable row level security");
    expect(migration).toContain('create policy "members can manage component brands"');
    expect(migration).toContain("create trigger cost_library_items_sync_brand_ref");
    expect(migration).toContain("'brandId', item.brand_id");
  });

  it("exposes brand records through the active D1 schema and component library repository", () => {
    const d1Migration = readFileSync(d1MigrationPath, "utf8");
    const d1PromotionMigration = readFileSync(d1PromotionMigrationPath, "utf8");
    const repository = readFileSync(repositoryPath, "utf8");

    expect(d1Migration).toContain("CREATE TABLE IF NOT EXISTS component_brands");
    expect(d1PromotionMigration).toContain("brand_id TEXT");
    expect(repository).toContain("export type ComponentLibraryBrand");
    expect(repository).toContain("FROM component_brands");
    expect(repository).toContain("WHERE workspace_id = ?");
    expect(repository).toContain("brands,");
  });
});
