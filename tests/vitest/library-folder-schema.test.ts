import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const migrationPath = readdirSync(join(process.cwd(), "supabase/migrations"))
  .filter((file) => file.endsWith("_library_folder_organization.sql"))
  .sort()
  .at(-1);

if (!migrationPath) throw new Error("Missing library folder organization migration.");

const migration = readFileSync(join(process.cwd(), "supabase/migrations", migrationPath), "utf8");
const repository = readFileSync(join(process.cwd(), "src/lib/repositories/component-library-repository.ts"), "utf8");
const supabaseTypes = readFileSync(join(process.cwd(), "src/lib/supabase/types.ts"), "utf8");

describe("library folder schema", () => {
  it("adds workspace-scoped folders with RLS and cost-library assignment", () => {
    expect(migration).toContain("create table if not exists public.library_folders");
    expect(migration).toContain("workspace_id uuid not null references public.workspaces(id) on delete cascade");
    expect(migration).toContain("source_category_node_id text references public.component_category_nodes(id) on delete set null");
    expect(migration).toContain("folder_kind text not null check (folder_kind in ('taxonomy', 'custom'))");
    expect(migration).toContain("library_folder_id uuid references public.library_folders(id) on delete set null");
    expect(migration).toContain("alter table public.library_folders enable row level security");
    expect(migration).toContain("grant select, insert, update, delete on public.library_folders to authenticated");
    expect(migration).toContain("members can manage library folders");
  });

  it("adds server-side reorder safety for library folders", () => {
    expect(migration).toContain("create or replace function public.reorder_library_folders");
    expect(migration).toContain("duplicate library folder reorder slots");
    expect(migration).toContain("Library folder reorder creates a cycle");
    expect(migration).toContain("grant execute on function public.reorder_library_folders(uuid, jsonb) to authenticated");
  });

  it("updates repository and generated type contracts", () => {
    expect(repository).toContain("libraryFolders");
    expect(repository).toContain("ensureWorkspaceLibraryFolders");
    expect(repository).toContain("library_folder_id");
    expect(supabaseTypes).toContain("library_folders");
    expect(supabaseTypes).toContain("library_folder_id: string | null");
  });
});
