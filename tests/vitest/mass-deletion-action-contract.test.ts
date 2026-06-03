import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("mass deletion server action contract", () => {
  it("routes project single and bulk delete through preview/execute actions instead of raw form deletes", () => {
    const actions = readFileSync("src/lib/projects/actions.ts", "utf8");

    expect(actions).toContain("previewBulkDeleteProjects");
    expect(actions).toContain("executeBulkDeleteProjects");
    expect(actions).toContain("preview_bulk_delete_projects");
    expect(actions).toContain("execute_bulk_delete_projects");
    expect(actions).toContain("expectedPreviewHash");
    expect(actions).toContain("cleanupStorageTargets");
    expect(actions).toContain("record_mass_deletion_storage_cleanup_result");
    expect(actions).not.toMatch(/from\\(\"projects\"\\)\\.delete\\(\\)\\.eq\\(\"id\", projectId\\)/);
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
    const actions = readFileSync("src/lib/component-library/actions.ts", "utf8");
    const repository = readFileSync("src/lib/repositories/component-library-repository.ts", "utf8");

    expect(actions).toContain("previewBulkArchiveLibraryComponents");
    expect(actions).toContain("executeBulkArchiveLibraryComponents");
    expect(actions).toContain("preview_bulk_archive_library_components");
    expect(actions).toContain("execute_bulk_archive_library_components");
    expect(actions).toContain("expectedPreviewHash");
    expect(actions).toContain("revalidateLibraryRoutes()");
    expect(repository).toContain('.neq("lifecycle_state", "archived")');
  });
});
