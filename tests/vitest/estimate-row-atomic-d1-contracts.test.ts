import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const d1ActionClient = readFileSync(join(process.cwd(), "src/lib/estimates/d1-action-client.ts"), "utf8");
const estimateActions = readFileSync(join(process.cwd(), "src/lib/estimates/actions.ts"), "utf8");
const rowMutationHook = readFileSync(join(process.cwd(), "src/hooks/use-estimate-row-mutations.ts"), "utf8");

function sourceBetween(source: string, start: string, end: string) {
  const startIndex = source.indexOf(start);
  const endIndex = source.indexOf(end, startIndex);
  expect(startIndex).toBeGreaterThanOrEqual(0);
  expect(endIndex).toBeGreaterThan(startIndex);
  return source.slice(startIndex, endIndex);
}

describe("estimate row atomic D1 contracts", () => {
  it("uses the stable conflict code for every D1 revision mismatch", () => {
    expect(d1ActionClient).not.toContain('throw new Error("Estimate row revision conflict.")');
  });

  it("guards ordinary row patch and replace mutations inside their history batch", () => {
    const patchSource = sourceBetween(d1ActionClient, "async function patchRowItem", "type ExpectedRowRevision");

    expect(patchSource).toContain('if (!database.batch) throw new Error("Atomic estimate row mutation is unavailable.")');
    expect(patchSource).toContain("buildRowRevisionGuardStatement(estimateId, [{ rowId, rowRevision: expected }])");
    expect(patchSource).toContain("expectedImpactFingerprint ?? propagation.impactFingerprint");
    expect(patchSource).toContain("buildProjectComponentImpactGuardStatement");
    expect(patchSource).toContain("throw new Error(ESTIMATE_ROW_REVISION_CONFLICT_CODE)");
  });

  it("moves both component rows through one guarded history batch", () => {
    const moveSource = sourceBetween(d1ActionClient, "async function moveRowComponent", "async function deleteRowItem");
    const dispatchSource = d1ActionClient.slice(d1ActionClient.indexOf("async function callEstimateAction"));

    expect(moveSource).toContain("if (!database.batch)");
    expect(moveSource).toContain("buildRowRevisionGuardStatement(estimateId, expectedRows)");
    expect(moveSource).toContain("sourcePlan.statement");
    expect(moveSource).toContain("targetPlan.statement");
    expect(moveSource).toContain('"estimate.row.component-move"');
    expect(moveSource).toContain("buildProjectPublicationRevisionStatement(intent)");
    expect(moveSource).toContain("buildEstimateMutationReceiptStatement(intent");
    expect(moveSource).toContain("await runBatch(database, statements)");
    expect(moveSource).not.toContain("runMutationWithHistory(");
    expect(dispatchSource).toContain('return await moveRowComponent(database, args, currentUser!) as T');
    expect(dispatchSource).not.toContain('"row_component_moved", readJsonRecord');
  });

  it("requires every client bulk-delete revision before the D1 call", () => {
    const actionSource = sourceBetween(estimateActions, "export async function deleteEstimateRowItemsBulk", "export async function restoreDeletedEstimateRows");
    const d1Source = sourceBetween(d1ActionClient, "async function deleteRowsBulk", "async function restoreDeletedEstimateRows");

    expect(actionSource).toContain("Bulk row delete requires the current revision for every selected row.");
    expect(actionSource).not.toContain('.from("estimate_row_items")');
    expect(d1Source).toContain("readJsonRecord(args.expected_row_revisions)");
    expect(d1Source).toContain("buildRowRevisionGuardStatement(estimateId, expectedRows)");
    expect(d1Source).toContain("return rowRevisionConflictResult(rows, expectedRows)");
  });

  it("keeps single-row delete revision checks inside the atomic D1 batch", () => {
    const deleteSource = sourceBetween(d1ActionClient, "async function deleteRowItem", "async function moveRowItem");

    expect(deleteSource).toContain('if (!database.batch) throw new Error("Atomic estimate row deletion is unavailable.")');
    expect(deleteSource).toContain("buildRowRevisionGuardStatement(estimateId, [{ rowId, rowRevision: expected }])");
    expect(deleteSource).toContain("DELETE FROM estimate_row_items WHERE id = ? AND estimate_id = ? AND row_revision = ?");
    expect(deleteSource).toContain("throw new Error(ESTIMATE_ROW_REVISION_CONFLICT_CODE)");
  });

  it("keeps every row move revision check inside one atomic D1 history batch", () => {
    const moveSource = sourceBetween(d1ActionClient, "async function moveRowItem", "async function updateSheetAdjustment");

    expect(moveSource).toContain('if (!database.batch) throw new Error("Atomic estimate row reorganization is unavailable.")');
    expect(moveSource).toContain("Row reorganization requires the current revision for every affected row.");
    expect(moveSource).toContain("WHERE id = ? AND estimate_id = ? AND row_revision = ?");
    expect(moveSource).toContain("buildRowRevisionGuardStatement(estimateId, expectedRows)");
    expect(moveSource).toContain("...mutationStatements");
    expect(moveSource).toContain("buildEstimateMutationReceiptStatement(intent");
    expect(moveSource).toContain("buildProjectPublicationRevisionStatement(intent)");
    expect(moveSource).toContain("hasRowRevisionConflict(authoritativeRows, expectedRows)");
  });

  it("derives history deltas from canonical minor-unit totals", () => {
    expect(d1ActionClient).toContain("computeEstimateRowCostParts(row)");
    expect(d1ActionClient).toContain("minorUnitsToAmount(estimateRowTotalMinorUnits(updated) - estimateRowTotalMinorUnits(row) + propagation.totalDeltaMinorUnits)");
    expect(d1ActionClient).toContain("minorUnitsToAmount(-sumEstimateRowTotalMinorUnits(rows))");
    expect(d1ActionClient).not.toContain("computeEstimateRowLineTotal");
    expect(d1ActionClient).not.toContain("sumEstimateRowLineTotals");
  });

  it("serializes overlapping row mutations without blocking disjoint rows", () => {
    const coordinatorSource = sourceBetween(rowMutationHook, "function enqueueEstimateMutation", "function enqueueRowUpdate");
    const returnSource = sourceBetween(rowMutationHook, "  return {\n    saveState", "\n  };\n}");

    expect(coordinatorSource).toContain("estimateMutationBarrierRef.current");
    expect(coordinatorSource).toContain("rowMutationQueueTailsRef.current");
    expect(coordinatorSource).toContain("Promise.all(queueDependencies");
    expect(returnSource).toContain("insertMutation.mutateAsync");
    expect(returnSource).toContain("moveMutation.mutateAsync");
    expect(returnSource).toContain("deleteRowsMutation.mutateAsync");
    expect(returnSource).not.toContain(".mutate(");
  });
});
