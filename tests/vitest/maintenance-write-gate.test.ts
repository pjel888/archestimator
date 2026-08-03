import { readFileSync } from "node:fs";
import { beforeEach, describe, expect, it, vi } from "vitest";

const featureFlagMocks = vi.hoisted(() => ({
  isFeatureFlagEnabled: vi.fn(),
}));

vi.mock("server-only", () => ({}));
vi.mock("next/navigation", () => ({ redirect: vi.fn() }));
vi.mock("@/lib/admin/feature-flags", () => ({
  getFeatureFlag: vi.fn(),
  isFeatureFlagEnabled: featureFlagMocks.isFeatureFlagEnabled,
  listFeatureFlags: vi.fn(),
}));

function exportedFunctionBlock(source: string, name: string) {
  const marker = `export async function ${name}`;
  const start = source.indexOf(marker);
  expect(start, `${name} export`).toBeGreaterThanOrEqual(0);
  const next = source.indexOf("\nexport async function ", start + marker.length);
  return source.slice(start, next < 0 ? source.length : next);
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("workshop maintenance write gate", () => {
  it("denies non-admin writes and preserves the platform-admin recovery path", async () => {
    featureFlagMocks.isFeatureFlagEnabled.mockResolvedValue(true);
    const { assertWorkshopWritable } = await import("@/lib/feature-gates/enforce");

    await expect(assertWorkshopWritable({ role: "member" } as never)).rejects.toThrow(
      "Workshop edits are paused while maintenance mode is on.",
    );
    await expect(assertWorkshopWritable({ role: "admin" } as never)).resolves.toBeUndefined();
  });

  it("gates every estimate and project mutation while leaving read and preview actions available", () => {
    const estimateActions = readFileSync("src/lib/estimates/actions.ts", "utf8");
    const projectActions = readFileSync("src/lib/projects/actions.ts", "utf8");
    const estimateMutations = [
      "reorderEstimateTreeNodes",
      "createEstimate",
      "createEstimateSheetDraft",
      "duplicateEstimateSheet",
      "executeBulkDeleteEstimateSheets",
      "deleteEstimateSheet",
      "updateEstimateDetails",
      "regenerateEstimateSheetCode",
      "createEstimateTab",
      "renameEstimateTab",
      "reorderEstimateTabs",
      "duplicateEstimateTab",
      "archiveEstimateTab",
      "deleteEstimateTab",
      "createEstimateNode",
      "renameEstimateNode",
      "deleteEstimateNode",
      "deleteEstimateNodesBulk",
      "insertEstimateTemplateIntoEstimate",
      "insertEstimateTemplatesIntoEstimate",
      "insertEstimateTemplateNodeIntoEstimate",
      "insertEstimateRowItemFromLibrary",
      "updateEstimateSheetAdjustment",
      "updateEstimateRowItem",
      "replaceEstimateRowItemWithLibrary",
      "deleteEstimateRowItem",
      "moveEstimateRowComponentWithHistory",
      "moveEstimateRowItemWithHistory",
      "deleteEstimateRowItemsBulk",
      "restoreDeletedEstimateRows",
      "restoreDeletedEstimateNodes",
    ];
    const projectMutations = [
      "createProjectRecord",
      "createProject",
      "deleteProject",
      "executeBulkDeleteProjects",
      "updateProjectImageMetadata",
      "updateProjectStatus",
      "updateProjectDetails",
    ];

    for (const name of estimateMutations) {
      const block = exportedFunctionBlock(estimateActions, name);
      expect(
        block.includes("requireWorkshopWriteContext")
          || block.includes("getProjectScopedEstimateActionContext")
          || block.includes("executeBulkDeleteEstimateSheets"),
        `${name} maintenance gate`,
      ).toBe(true);
    }
    for (const name of projectMutations) {
      expect(exportedFunctionBlock(projectActions, name), `${name} maintenance gate`).toContain(
        "requireWorkshopWriteContext",
      );
    }

    for (const name of ["fetchEstimateTree", "previewBulkDeleteEstimateSheets"]) {
      expect(exportedFunctionBlock(estimateActions, name)).not.toContain("requireWorkshopWriteContext");
    }
    expect(exportedFunctionBlock(projectActions, "previewBulkDeleteProjects")).not.toContain(
      "requireWorkshopWriteContext",
    );
  });
});
