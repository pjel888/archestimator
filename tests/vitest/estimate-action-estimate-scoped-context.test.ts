import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

const estimateActions = readFileSync("src/lib/estimates/actions.ts", "utf8");
const workspaceRepository = readFileSync("src/lib/repositories/workspace-repository.ts", "utf8");

function sourceBlock(startMarker: string, endMarker: string) {
  const start = estimateActions.indexOf(startMarker);
  expect(start, `${startMarker} should exist`).toBeGreaterThanOrEqual(0);
  const end = estimateActions.indexOf(endMarker, start + startMarker.length);
  expect(end, `${endMarker} should exist after ${startMarker}`).toBeGreaterThan(start);
  return estimateActions.slice(start, end);
}

function expectEstimateScopedProjectContext(block: string, call = "getCurrentWorkspaceProjectForEstimate(projectId, estimateId)") {
  const scopedProjectIndex = block.indexOf(call);
  const editCheckIndex = block.indexOf("await assertCanEditEstimate");

  expect(scopedProjectIndex).toBeGreaterThanOrEqual(0);
  expect(editCheckIndex).toBeGreaterThan(scopedProjectIndex);
  expect(block).not.toContain("getCurrentWorkspaceProject(projectId)");
}

describe("estimate actions use estimate-scoped project context", () => {
  it("exports the shared estimate-scoped project context helper", () => {
    expect(workspaceRepository).toContain("export const getCurrentWorkspaceProjectForEstimate = cache(");
  });

  it("keeps row and node validators estimate-scoped before edit checks", () => {
    expectEstimateScopedProjectContext(sourceBlock(
      "async function getValidatedEstimateRow",
      "async function getValidatedEstimateNode",
    ));
    expectEstimateScopedProjectContext(sourceBlock(
      "async function getValidatedEstimateNode",
      "function readEstimateNodeName",
    ));
  });

  it("keeps reviewed template and bulk row mutations estimate-scoped before edit checks", () => {
    expectEstimateScopedProjectContext(sourceBlock(
      "export async function insertEstimateTemplateIntoEstimate",
      "/**\n * INS-1",
    ));
    expectEstimateScopedProjectContext(sourceBlock(
      "export async function deleteEstimateRowItemsBulk",
      "export async function restoreDeletedEstimateRows",
    ));
  });

  it("keeps detail, tab, tree, and row mutation contexts estimate-scoped", () => {
    expectEstimateScopedProjectContext(sourceBlock(
      "export async function updateEstimateDetails",
      "export async function regenerateEstimateSheetCode",
    ), "getCurrentWorkspaceProjectForEstimate(input.projectId, input.estimateId)");
    expectEstimateScopedProjectContext(sourceBlock(
      "async function getProjectScopedEstimateActionContext",
      "export async function createEstimateTab",
    ));
    expectEstimateScopedProjectContext(sourceBlock(
      "export async function reorderEstimateTreeNodes",
      "export async function createEstimate",
    ));
    expectEstimateScopedProjectContext(sourceBlock(
      "export async function insertEstimateRowItemFromLibrary",
      "export async function updateEstimateSheetAdjustment",
    ));
  });
});
