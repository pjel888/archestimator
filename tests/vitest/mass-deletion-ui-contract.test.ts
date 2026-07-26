import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("mass deletion UI contract", () => {
  it("wires estimates to preview-first row and bulk delete controls", () => {
    const table = readFileSync("src/components/workshop/ProjectEstimatesTable.tsx", "utf8");

    expect(table).toContain("previewBulkDeleteEstimateSheets");
    expect(table).toContain("executeBulkDeleteEstimateSheets");
    expect(table).toContain("BulkDestructivePreviewModal");
    expect(table).toContain("DELETE ESTIMATE");
    expect(table).toContain("DELETE ${deleteEstimateTargetIds.length} ESTIMATES");
    expect(table).toContain("Delete selected estimates");
    expect(table).not.toContain("Delete action is not wired yet");
  });

  it("wires project cards and details delete to the same preview-first modal", () => {
    const page = readFileSync("src/components/workshop/projects-page-client.tsx", "utf8");
    const card = readFileSync("src/components/workshop/LiveProjectCard.tsx", "utf8");
    const modal = readFileSync("src/components/workshop/ProjectDetailsModal.tsx", "utf8");

    expect(page).toContain("previewBulkDeleteProjects");
    expect(page).toContain("executeBulkDeleteProjects");
    expect(page).toContain("BulkDestructivePreviewModal");
    expect(page).toContain("const selectableDisplayProjectIds");
    expect(page).toContain("filterMapBy(");
    expect(page).toContain("canSelectProjectForDeletion");
    expect(page).toContain("setSelectedProjectIds(new Set(selectableDisplayProjectIds))");
    expect(page).toContain("DELETE PROJECT");
    expect(page).toContain("DELETE ${deleteProjectTargetIds.length} PROJECTS");
    const selectControl = readFileSync("src/components/workshop/ProjectCardSelectControl.tsx", "utf8");
    expect(card).toContain("onToggleSelected");
    expect(card).toContain("ProjectCardSelectControl");
    expect(selectControl).toContain("aria-label={`Select ${projectName} for deletion`}");
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
    expect(manager).toContain("Select ${item.name ?? item.material}");
    expect(manager).toContain('actionLabel="Archive selected"');
    expect(manager).not.toContain("executeHardDeleteLibraryComponents");
  });
});
