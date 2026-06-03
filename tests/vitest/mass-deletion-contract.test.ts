import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

const migrationPath = readdirSync(join(process.cwd(), "supabase/migrations"))
  .filter((name) => name.includes("mass_deletion"))
  .sort()
  .at(-1);
const migration = migrationPath ? readFileSync(join(process.cwd(), "supabase/migrations", migrationPath), "utf8") : "";

describe("mass deletion backend contract", () => {
  it("adds a durable audit table, preview/execute RPC split, permission checks, and grants", () => {
    expect(migration).toContain("create table if not exists public.mass_deletion_events");
    expect(migration).toContain("preview_bulk_delete_projects");
    expect(migration).toContain("execute_bulk_delete_projects");
    expect(migration).toContain("preview_bulk_delete_estimate_sheets");
    expect(migration).toContain("execute_bulk_delete_estimate_sheets");
    expect(migration).toContain("preview_bulk_archive_library_components");
    expect(migration).toContain("execute_bulk_archive_library_components");
    expect(migration).toContain("SECURITY DEFINER");
    expect(migration).toContain("set search_path = public");
    expect(migration).toContain("public.can_manage_project_access");
    expect(migration).toContain("public.can_edit_estimate");
    expect(migration).toContain("public.is_workspace_editor");
    expect(migration).toContain("status = 'published'");
    expect(migration).toContain("revoked_at is null");
    expect(migration).toContain("preview_hash");
    expect(migration).toContain("correlation_id");
    expect(migration).toContain("pg_advisory_xact_lock");
    expect(migration).toContain("revoke execute on function public.execute_bulk_delete_projects");
    expect(migration).toContain("grant execute on function public.execute_bulk_delete_projects");
  });

  it("keeps generated types aware of mass deletion RPCs and project-access manager checks", () => {
    const types = readFileSync("src/lib/supabase/types.ts", "utf8");

    expect(types).toContain("mass_deletion_events");
    expect(types).toContain("can_manage_project_access");
    expect(types).toContain("preview_bulk_delete_projects");
    expect(types).toContain("execute_bulk_delete_projects");
    expect(types).toContain("preview_bulk_delete_estimate_sheets");
    expect(types).toContain("execute_bulk_delete_estimate_sheets");
    expect(types).toContain("preview_bulk_archive_library_components");
    expect(types).toContain("execute_bulk_archive_library_components");
  });
});
