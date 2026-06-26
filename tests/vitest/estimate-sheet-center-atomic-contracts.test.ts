import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const estimateSheetContent = readFileSync(join(process.cwd(), "src/components/workshop/EstimateSheetContent.tsx"), "utf8");

function sourceBetween(start: string, end: string) {
  const startIndex = estimateSheetContent.indexOf(start);
  const endIndex = estimateSheetContent.indexOf(end, startIndex);
  expect(startIndex).toBeGreaterThanOrEqual(0);
  expect(endIndex).toBeGreaterThan(startIndex);
  return estimateSheetContent.slice(startIndex, endIndex);
}

describe("estimate sheet center atomic mutation contracts", () => {
  it("persists component moves through a single atomic mutation path", () => {
    const moveSource = sourceBetween("const moveRowComponent = useStableCallback", "const deleteRowItem = useStableCallback");

    expect(moveSource).toContain("moveRows({");
    expect(moveSource).not.toContain("replaceRow({");
    expect(moveSource).not.toContain("restoreSourceRow");
    expect(moveSource).not.toContain("restoreTargetRow");
  });

  it("persists selected row deletes through a single all-or-nothing mutation path", () => {
    const deleteSelectedRowsSource = sourceBetween("function deleteSelectedRows()", "const isActiveTabTreeLoading");

    expect(deleteSelectedRowsSource).toContain("deleteRows({");
    expect(deleteSelectedRowsSource).not.toContain("bulkSelectedRowIds.forEach");
    expect(deleteSelectedRowsSource).not.toContain("deleteRowItem(rowItemId)");
  });

  it("drops stale project-source full-tree responses", () => {
    const projectSourceInsertSource = sourceBetween(
      "const insertProjectSourceIntoParentById = useStableCallback",
      "const insertProjectSourceIntoSelectedGroup = useCallback",
    );

    expect(projectSourceInsertSource).toContain("const projectSourceRequestRevision = getEstimateTreeRevision();");
    expect(projectSourceInsertSource).toContain("if (getEstimateTreeRevision() === projectSourceRequestRevision) setEstimateTree(() => result.tree);");
  });

  it("downloads proposal exports with same-origin credentials", () => {
    const proposalDownloadSource = sourceBetween(
      "const downloadProposalExport = useCallback",
      "const proposalPreviewScopeControls",
    );

    expect(proposalDownloadSource).toContain('fetch(proposalDownloadHref, { credentials: "same-origin" })');
  });
});
