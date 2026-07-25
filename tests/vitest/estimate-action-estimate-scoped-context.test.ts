import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

const estimateActions = readFileSync("src/lib/estimates/actions.ts", "utf8");
const workspaceRepository = readFileSync("src/lib/repositories/workspace-repository.ts", "utf8");
const estimateIntentContext = readFileSync("src/lib/estimates/d1-intents/intent-context.ts", "utf8");
const estimateNodeIntents = readFileSync("src/lib/estimates/d1-intents/nodes.ts", "utf8");
const estimateRowIntents = readFileSync("src/lib/estimates/d1-intents/rows.ts", "utf8");
const estimateTemplateIntents = readFileSync("src/lib/estimates/d1-intents/templates.ts", "utf8");

function sourceBlock(source: string, startMarker: string, endMarker: string) {
  const start = source.indexOf(startMarker);
  expect(start, `${startMarker} should exist`).toBeGreaterThanOrEqual(0);
  const end = source.indexOf(endMarker, start + startMarker.length);
  expect(end, `${endMarker} should exist after ${startMarker}`).toBeGreaterThan(start);
  return source.slice(start, end);
}

function expectOrderedMarkers(block: string, markers: string[]) {
  let previousIndex = -1;
  for (const marker of markers) {
    const markerIndex = block.indexOf(marker);
    expect(markerIndex, `${marker} should exist`).toBeGreaterThan(previousIndex);
    previousIndex = markerIndex;
  }
}

function expectEstimateScopedProjectContext(
  block: string,
  markersAfterScope: string[],
  call = "getCurrentWorkspaceProjectForEstimate(projectId, estimateId)",
) {
  expectOrderedMarkers(block, [call, ...markersAfterScope]);
  expect(block).not.toMatch(/getCurrentWorkspaceProject\((?:input\.)?projectId\)/);
}

describe("estimate actions use estimate-scoped project context", () => {
  it("exports the shared estimate-scoped project context helper", () => {
    expect(workspaceRepository).toContain("export const getCurrentWorkspaceProjectForEstimate = cache(");
  });

  it("keeps row validation and node mutations estimate-scoped before authorization-bearing writes", () => {
    expectEstimateScopedProjectContext(sourceBlock(
      estimateActions,
      "async function getValidatedEstimateRow",
      "function readEstimateNodeName",
    ), [
      "if (options?.requireEdit) await assertCanEditEstimate(database, estimateId);",
      "getEstimateRowForProject(database, { projectId: project.id, estimateId, rowId })",
    ]);
    expectEstimateScopedProjectContext(sourceBlock(
      estimateActions,
      "export async function renameEstimateNode",
      "export async function deleteEstimateNode",
    ), [
      "requireCurrentUserContext()",
      "renameEstimateNodeWithHistory(database, currentUser, {",
    ]);
  });

  it("keeps reviewed template and bulk row mutations estimate-scoped before authenticated writes", () => {
    expectEstimateScopedProjectContext(sourceBlock(
      estimateActions,
      "export async function insertEstimateTemplateIntoEstimate",
      "/**\n * INS-1",
    ), [
      "requireCurrentUserContext()",
      "insertEstimateTemplateIntoEstimateWithHistory(database, currentUser, {",
    ]);
    expectEstimateScopedProjectContext(sourceBlock(
      estimateActions,
      "export async function deleteEstimateRowItemsBulk",
      "export async function restoreDeletedEstimateRows",
    ), [
      "await assertCanEditEstimate(database, estimateId);",
      "requireCurrentUserContext()",
      "deleteEstimateRowItemsBulkWithHistory(database, currentUser, {",
    ]);
  });

  it("keeps detail, tab, tree, and row mutation contexts estimate-scoped before authenticated writes", () => {
    expectEstimateScopedProjectContext(sourceBlock(
      estimateActions,
      "export async function updateEstimateDetails",
      "export async function regenerateEstimateSheetCode",
    ), [
      "requireCurrentUserContext()",
      "await assertCanEditEstimate(database, input.estimateId);",
      "updateEstimateDetailsWithHistory(database, currentUser, {",
    ], "getCurrentWorkspaceProjectForEstimate(input.projectId, input.estimateId)");
    expectEstimateScopedProjectContext(sourceBlock(
      estimateActions,
      "async function getProjectScopedEstimateActionContext",
      "export async function createEstimateTab",
    ), [
      "requireCurrentUserContext()",
      "getEstimateRecordForProject(database, { projectId: project.id, estimateId })",
    ]);
    expectEstimateScopedProjectContext(sourceBlock(
      estimateActions,
      "export async function reorderEstimateTreeNodes",
      "export async function createEstimate",
    ), [
      "requireCurrentUserContext()",
      "reorderEstimateNodesWithHistory(database, currentUser, {",
    ]);
    expectEstimateScopedProjectContext(sourceBlock(
      estimateActions,
      "export async function insertEstimateRowItemFromLibrary",
      "export async function updateEstimateSheetAdjustment",
    ), [
      "requireCurrentUserContext()",
      "await assertCanEditEstimate(database, estimateId);",
      "insertEstimateRowItemWithHistory(database, currentUser, {",
    ]);
  });

  it("keeps typed D1 mutation owners edit-authorized and project-estimate bound", () => {
    const prepareIntent = sourceBlock(
      estimateIntentContext,
      "export async function prepareEstimateMutationIntent",
      "export async function readConcurrentEstimateMutationReceipt",
    );
    expectOrderedMarkers(prepareIntent, [
      "requireActor(actor, \"Estimate edit access denied.\")",
      "await assertEstimateEditIntent(database, trustedActor, input.estimateId);",
      "readEstimateIntentContext(database, input)",
    ]);

    const readIntentContext = sourceBlock(
      estimateIntentContext,
      "export async function readEstimateIntentContext",
      "export async function assertProjectEditIntent",
    );
    expect(readIntentContext).toContain("WHERE estimate.id = ?");
    expect(readIntentContext).toContain("AND estimate.project_id = ?");
    expect(readIntentContext).toContain("[input.estimateId, input.projectId]");

    const nodeScope = sourceBlock(
      estimateNodeIntents,
      "async function requireScopedEstimate",
      "export async function getEstimateNodeForProject",
    );
    expectOrderedMarkers(nodeScope, [
      "assertEstimateEditIntent(database, actor, input.estimateId)",
      "context.projectId !== input.projectId",
    ]);

    const templateCopy = sourceBlock(
      estimateTemplateIntents,
      "async function copyTemplateNodes",
      "async function linkTemplateNodes",
    );
    expectOrderedMarkers(templateCopy, [
      "prepareEstimateMutationIntent<TemplateInsertedResult>(",
      "await runD1Batch(database, statements);",
    ]);
    const templateLink = sourceBlock(
      estimateTemplateIntents,
      "async function linkTemplateNodes",
      "export async function insertEstimateTemplateIntoEstimateWithHistory",
    );
    expectOrderedMarkers(templateLink, [
      "prepareEstimateMutationIntent<TemplateLinkedResult>(",
      "await runD1Batch(database, statements);",
    ]);

    const bulkRowDelete = sourceBlock(
      estimateRowIntents,
      "export async function deleteEstimateRowItemsBulkWithHistory",
      "export async function moveEstimateRowItemWithHistory",
    );
    expectOrderedMarkers(bulkRowDelete, [
      "prepareEstimateMutationIntent<Record<string, unknown>>(",
      "await runD1Batch(database, statements);",
    ]);
  });
});
