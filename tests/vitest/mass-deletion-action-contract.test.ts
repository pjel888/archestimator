import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("mass deletion server action contract", () => {
  it("routes project single and bulk delete through preview/execute actions instead of raw form deletes", () => {
    const actions = readFileSync("src/lib/projects/actions.ts", "utf8");
    const storageCleanupMigration = readFileSync(
      "migrations/0012_project_audit_sidecars.sql",
      "utf8",
    );
    const d1MassDeletionEventsMigration = readFileSync(
      "migrations/0023_mass_deletion_events.sql",
      "utf8",
    );

    expect(actions).toContain("previewBulkDeleteProjects");
    expect(actions).toContain("executeBulkDeleteProjects");
    expect(actions).toContain("previewBulkDeleteProjectsInD1");
    expect(actions).toContain("executeBulkDeleteProjectsInD1");
    expect(actions).toContain("getCloudflareD1Database");
    expect(actions).toContain("INSERT INTO mass_deletion_events");
    expect(actions).toContain("DELETE FROM project_publications");
    expect(actions).toContain("DELETE FROM shared_link_events");
    expect(actions).toContain(
      "Only project owners/admins can delete projects.",
    );
    expect(actions).toContain("expectedPreviewHash");
    expect(actions).toContain("cleanupStorageTargets");
    expect(actions).toContain(
      "recordMassDeletionStorageCleanupResultInCloudflareD1",
    );
    expect(storageCleanupMigration).toContain(
      "mass_deletion_storage_cleanup_results",
    );
    expect(d1MassDeletionEventsMigration).toContain(
      "CREATE TABLE IF NOT EXISTS mass_deletion_events",
    );
    expect(d1MassDeletionEventsMigration).toContain(
      "UNIQUE (workspace_id, target_type, action, correlation_id)",
    );
    expect(actions).not.toMatch(
      /createSupabaseServerClient|supabase\.rpc|preview_bulk_delete_projects|execute_bulk_delete_projects/,
    );
    expect(actions).not.toMatch(
      /from\\(\"projects\"\\)\\.delete\\(\\)\\.eq\\(\"id\", projectId\\)/,
    );
  });

  it("records project storage cleanup results through a D1 sidecar instead of Supabase service-role", () => {
    const actions = readFileSync("src/lib/projects/actions.ts", "utf8");
    const d1Audit = readFileSync("src/lib/projects/d1-audit.ts", "utf8");

    expect(actions).toContain(
      "recordMassDeletionStorageCleanupResultInCloudflareD1",
    );
    expect(d1Audit).toContain(
      "INSERT INTO mass_deletion_storage_cleanup_results",
    );
    expect(`${actions}\n${d1Audit}`).not.toMatch(
      /createSupabaseServiceRoleClient|record_mass_deletion_storage_cleanup_result|SUPABASE_SERVICE_ROLE_KEY/,
    );
  });

  it("adds estimate-sheet preview, execute, and single delete wrappers with cache revalidation", () => {
    const actions = readFileSync("src/lib/estimates/actions.ts", "utf8");

    expect(actions).toContain("previewBulkDeleteEstimateSheets");
    expect(actions).toContain("executeBulkDeleteEstimateSheets");
    expect(actions).toContain("deleteEstimateSheet");
    expect(actions).toContain("preview_bulk_delete_estimate_sheets");
    expect(actions).toContain("execute_bulk_delete_estimate_sheets");
    expect(actions).toContain("expectedPreviewHash");
    expect(actions).toContain("revalidateProjectEstimatePaths(project.id)");
  });

  it("adds component library archive preview/execute actions and hides archived rows from library reads", () => {
    const actions = readFileSync(
      "src/lib/component-library/actions.ts",
      "utf8",
    );
    const repository = readFileSync(
      "src/lib/repositories/component-library-repository.ts",
      "utf8",
    );

    expect(actions).toContain("previewBulkArchiveLibraryComponents");
    expect(actions).toContain("executeBulkArchiveLibraryComponents");
    expect(actions).toContain("createBulkArchivePreviewHash");
    expect(actions).toContain("UPDATE cost_library_items");
    expect(actions).toContain("lifecycle_state = 'archived'");
    expect(actions).not.toMatch(/preview_bulk_archive_library_components|execute_bulk_archive_library_components|supabase\.rpc/);
    expect(actions).toContain("expectedPreviewHash");
    expect(actions).toContain("revalidateLibraryRoutes()");
    expect(repository).toContain('.neq("lifecycle_state", "archived")');
  });
});
