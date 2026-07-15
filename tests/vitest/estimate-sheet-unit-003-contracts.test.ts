import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

function read(path: string) {
  return readFileSync(path, "utf8");
}

describe("estimate sheet UNIT-003 truth contracts", () => {
  it("propagates tab-scoped partial-load truth and gates structural moves", () => {
    const querySource = read("src/hooks/use-estimate-query.ts");
    const contentSource = read("src/components/workshop/EstimateSheetContent.tsx");
    const treeSource = read("src/components/workshop/EstimateSheetTree.tsx");

    expect(querySource).toContain("tabLoadLimit");
    expect(querySource).toContain("loadLimitState: loadLimitState ?? undefined");
    expect(contentSource).toContain("const canMoveRowItems = !isActiveTreePartial");
    expect(contentSource).toContain("totalsIncomplete={isActiveTreePartial}");
    expect(treeSource).toContain("const canReorderNow = !isTreeMutationSaving && !isActiveTreePartial");
  });

  it("recovers clean save state after invalid or reverted row drafts", () => {
    const mutationSource = read("src/hooks/use-estimate-row-mutations.ts");
    const handlerSource = read("src/components/workshop/estimate-sheet/use-estimate-row-handlers.ts");
    const tableSource = read("src/components/workshop/estimate-sheet/rows/row-table.tsx");

    expect(mutationSource).toContain("const markRowClean = useCallback");
    expect(handlerSource).toContain("const reconcileRowDirty = useStableCallback");
    expect(handlerSource).toContain("editableRowsEqual(currentRows[rowId], baselineRows[rowId])");
    expect(tableSource.match(/onReconcileRowDirty\(computedItem\.id\)/g)?.length).toBeGreaterThanOrEqual(5);
  });

  it("keeps branch and table memo guards scoped to affected rows", () => {
    const branchSource = read("src/components/workshop/estimate-sheet/rows/branch.tsx");
    const tableSource = read("src/components/workshop/estimate-sheet/rows/row-table.tsx");
    const branchGuard = branchSource.slice(
      branchSource.indexOf("function areEstimateSheetBranchPropsEqual"),
      branchSource.indexOf("const prevTotal =", branchSource.indexOf("function areEstimateSheetBranchPropsEqual")),
    );
    const tableGuard = tableSource.slice(
      tableSource.indexOf("function areEstimateRowItemsTablePropsEqual"),
      tableSource.indexOf("for (const item", tableSource.indexOf("function areEstimateRowItemsTablePropsEqual")),
    );

    expect(branchGuard).not.toContain("prev.rowMutationStatuses !== next.rowMutationStatuses");
    expect(branchGuard).not.toContain("prev.expressInsertDraftStates !== next.expressInsertDraftStates");
    expect(tableGuard).not.toContain("prev.rowMutationStatuses !== next.rowMutationStatuses");
    expect(tableGuard).not.toContain("prev.promotingRowId !== next.promotingRowId");
  });

  it("uses one versioned target-scoped acknowledgement envelope for external Estimate Tree drops", () => {
    const eventsSource = read("src/components/workshop/estimate-sheet/events.ts");
    const dropSource = read("src/components/workshop/estimate-tree/use-estimate-tree-external-drops.ts");
    const contentSource = read("src/components/workshop/EstimateSheetContent.tsx");
    const templateSource = read("src/components/workshop/estimate-sheet/use-estimate-template-insertion.ts");

    expect(eventsSource).toContain("ESTIMATE_EXTERNAL_DROP_SCHEMA_VERSION = 1");
    expect(eventsSource).toContain("if (claimed) return null");
    expect(eventsSource).toContain('reason: "unhandled"');
    expect(dropSource.match(/dispatchDrop</g)?.length).toBeGreaterThanOrEqual(4);
    expect(contentSource.match(/readEstimateExternalDropEnvelope/g)?.length).toBeGreaterThanOrEqual(4);
    expect(templateSource).toContain("readEstimateExternalDropEnvelope");
  });

  it("keeps Area rename drafts in the input and reserves a stable transparent action slot", () => {
    const treeSource = read("src/components/workshop/EstimateSheetTree.tsx");
    const editorSource = read("src/components/workshop/estimate-tree/use-estimate-tree-rename-editor.ts");

    expect(treeSource).toContain("defaultValue={editingNodeName}");
    expect(treeSource).toContain("updateRenameDraftName(event.currentTarget.value)");
    expect(treeSource).not.toContain("setEditingNodeName(event.currentTarget.value)");
    expect(treeSource).toContain("data-estimate-tree-rename-controls");
    expect(treeSource).toContain("absolute inset-y-0 right-0 flex w-10");
    expect(treeSource).toContain("bg-transparent");
    expect(editorSource).toContain('const renameDraftValueRef = useRef("")');
    expect(editorSource).toContain("setEditingNodeName(renameDraftValueRef.current)");
  });
});
