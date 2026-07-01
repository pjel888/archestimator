import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

const migrationPath = join(process.cwd(), "supabase/migrations/20260524053500_component_brand_library.sql");
const supabaseTypesPath = join(process.cwd(), "src/lib/supabase/types.ts");
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

  it("exposes brand records through generated types and the component library repository", () => {
    const supabaseTypes = readFileSync(supabaseTypesPath, "utf8");
    const repository = readFileSync(repositoryPath, "utf8");

    expect(supabaseTypes).toContain("component_brands");
    expect(supabaseTypes).toContain("brand_id: string | null");
    expect(supabaseTypes).toContain('referencedRelation: "component_brands"');
    expect(repository).toContain("export type ComponentLibraryBrand");
    expect(repository).toContain("FROM component_brands");
    expect(repository).toContain("WHERE workspace_id = ?");
    expect(repository).toContain("brands,");
  });
});
