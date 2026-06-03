import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("mass deletion UI contract", () => {
  it("wires estimate sheets to preview-first row and bulk delete controls", () => {
    const table = readFileSync("src/components/workshop/ProjectEstimatesTable.tsx", "utf8");

    expect(table).toContain("previewBulkDeleteEstimateSheets");
    expect(table).toContain("executeBulkDeleteEstimateSheets");
    expect(table).toContain("BulkDestructivePreviewModal");
    expect(table).toContain("DELETE SHEET");
    expect(table).toContain("DELETE ${deleteEstimateTargetIds.length} SHEETS");
    expect(table).toContain("Delete selected sheets");
    expect(table).not.toContain("Delete action is not wired yet");
  });

  it("wires project cards and details delete to the same preview-first modal", () => {
    const page = readFileSync("src/components/workshop/projects-page-client.tsx", "utf8");
    const card = readFileSync("src/components/workshop/LiveProjectCard.tsx", "utf8");
    const modal = readFileSync("src/components/workshop/ProjectDetailsModal.tsx", "utf8");

    expect(page).toContain("previewBulkDeleteProjects");
    expect(page).toContain("executeBulkDeleteProjects");
    expect(page).toContain("BulkDestructivePreviewModal");
    expect(page).toContain("DELETE PROJECT");
    expect(page).toContain("DELETE ${deleteProjectTargetIds.length} PROJECTS");
    expect(card).toContain("onToggleSelected");
    expect(card).toContain("aria-label={`Select ${project.name} for deletion`}");
    expect(modal).toContain("onDeleteProject");
    expect(modal).not.toContain("window.confirm");
    expect(modal).not.toContain("formAction={deleteProject}");
  });

  it("wires component cards to reversible archive preview and keeps hard delete out of the first-release UI", () => {
    const manager = readFileSync("src/components/workshop/component-library-manager/ComponentLibraryManager.tsx", "utf8");

    expect(manager).toContain("previewBulkArchiveLibraryComponents");
    expect(manager).toContain("executeBulkArchiveLibraryComponents");
    expect(manager).toContain("BulkDestructivePreviewModal");
    expect(manager).toContain("ARCHIVE ${archiveComponentTargetIds.length} COMPONENTS");
    expect(manager).toContain("Select ${item.name ?? item.material} for archive");
    expect(manager).not.toContain("executeHardDeleteLibraryComponents");
  });
});
