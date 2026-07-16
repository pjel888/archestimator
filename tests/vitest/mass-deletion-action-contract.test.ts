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
    expect(actions).toContain("removal_claim_id");
    expect(actions).toContain("purge_state = 'pending'");
    expect(actions).not.toContain("cleanupStorageTargets");
    expect(actions).not.toContain("createRuntimeUploadStorageProvider");
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

  it("leaves project object cleanup to the D1-backed delayed cleanup queue", () => {
    const actions = readFileSync("src/lib/projects/actions.ts", "utf8");

    expect(actions).toContain("cleanup_not_before");
    expect(actions).toContain("storage_cleanup_pending");
    expect(actions).not.toContain("recordMassDeletionStorageCleanupResultInCloudflareD1");
    expect(actions).not.toMatch(
      /cleanupStorageTargets|createSupabaseServiceRoleClient|record_mass_deletion_storage_cleanup_result|SUPABASE_SERVICE_ROLE_KEY/,
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
    expect(repository).toContain("AND lifecycle_state <> 'archived'");
  });
});
