import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

const massDeletionMigrationPaths = readdirSync(join(process.cwd(), "supabase/migrations"))
  .filter((name) => name.includes("mass_deletion"))
  .sort();
const migration = massDeletionMigrationPaths
  .map((migrationPath) => readFileSync(join(process.cwd(), "supabase/migrations", migrationPath), "utf8"))
  .join("\n");
const actorDerivationMigrationPath = massDeletionMigrationPaths.find((name) => name.includes("harden_mass_deletion_actor_derivation"));
const actorDerivationMigration = actorDerivationMigrationPath
  ? readFileSync(join(process.cwd(), "supabase/migrations", actorDerivationMigrationPath), "utf8")
  : "";
const cleanupResultMigrationPath = massDeletionMigrationPaths.find((name) => name.includes("lock_mass_deletion_cleanup_result_rpc"));
const cleanupResultMigration = cleanupResultMigrationPath
  ? readFileSync(join(process.cwd(), "supabase/migrations", cleanupResultMigrationPath), "utf8")
  : "";

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

  it("derives mass deletion audit actors from auth.uid instead of caller input", () => {
    expect(actorDerivationMigration).toContain("actor_id uuid := auth.uid()");
    expect(actorDerivationMigration).toContain("actor_id is null");
    expect(actorDerivationMigration).toContain("actor_user_id, target_type");
    expect(actorDerivationMigration).toContain("values (workspace_id, actor_id, 'project'");
    expect(actorDerivationMigration).toContain("values (workspace_id, actor_id, 'estimate_sheet'");
    expect(actorDerivationMigration).toContain("values (target_workspace_id, actor_id, 'library_component'");
    expect(actorDerivationMigration).not.toContain("acting_user_id uuid default auth.uid()");
    expect(actorDerivationMigration).not.toContain("values (workspace_id, acting_user_id");
    expect(actorDerivationMigration).not.toContain("values (target_workspace_id, acting_user_id");
  });

  it("restricts mass deletion storage cleanup audit writes to the service role", () => {
    expect(cleanupResultMigration).toContain("record_mass_deletion_storage_cleanup_result");
    expect(cleanupResultMigration).toContain("auth.role() <> 'service_role'");
    expect(cleanupResultMigration).toContain("status = 'storage_cleanup_pending'");
    expect(cleanupResultMigration).toContain("target_type = 'project'");
    expect(cleanupResultMigration).toContain("revoke execute on function public.record_mass_deletion_storage_cleanup_result(uuid, jsonb) from public, anon, authenticated");
    expect(cleanupResultMigration).toContain("grant execute on function public.record_mass_deletion_storage_cleanup_result(uuid, jsonb) to service_role");
  });

  it("keeps record_mass_deletion_storage_cleanup_result atomic and duplicate retry safe", () => {
    expect(cleanupResultMigration).toContain("set storage_cleanup_result = normalized_result");
    expect(cleanupResultMigration).toContain("status = updated_status");
    expect(cleanupResultMigration).toContain("returning * into updated_row");
    expect(cleanupResultMigration).toContain("status = 'storage_cleanup_pending'");
    expect(cleanupResultMigration).toContain("Mass deletion cleanup event not found or already finalized.");
  });

  it("keeps active D1 mass deletion actions aligned with the historical provider contract", () => {
    const d1Migration = readFileSync("migrations/0023_mass_deletion_events.sql", "utf8");
    const projectActions = readFileSync("src/lib/projects/actions.ts", "utf8");
    const estimateD1Client = readFileSync("src/lib/estimates/d1-action-client.ts", "utf8");
    const componentActions = readFileSync("src/lib/component-library/actions.ts", "utf8");

    expect(d1Migration).toContain("CREATE TABLE IF NOT EXISTS mass_deletion_events");
    expect(d1Migration).toContain("target_type TEXT NOT NULL CHECK");
    expect(d1Migration).toContain("'project', 'estimate_sheet', 'library_component'");
    expect(d1Migration).toContain("preview_hash TEXT NOT NULL");
    expect(d1Migration).toContain("correlation_id TEXT NOT NULL");
    expect(projectActions).toContain("function canManageProjectRow");
    expect(projectActions).toContain("previewBulkDeleteProjectsInD1");
    expect(projectActions).toContain("executeBulkDeleteProjectsInD1");
    expect(projectActions).toContain("INSERT INTO mass_deletion_events");
    expect(estimateD1Client).toContain('if (name === "preview_bulk_delete_estimate_sheets")');
    expect(estimateD1Client).toContain('if (name === "execute_bulk_delete_estimate_sheets")');
    expect(componentActions).toContain("previewBulkArchiveLibraryComponents");
    expect(componentActions).toContain("executeBulkArchiveLibraryComponents");
    expect(componentActions).not.toMatch(/preview_bulk_archive_library_components|execute_bulk_archive_library_components|supabase\.rpc/);
  });
});
