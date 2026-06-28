import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const estimateSheetContent = readFileSync(join(process.cwd(), "src/components/workshop/EstimateSheetContent.tsx"), "utf8");
const estimateRowHandlers = readFileSync(join(process.cwd(), "src/components/workshop/estimate-sheet/use-estimate-row-handlers.ts"), "utf8");
const estimateRowMutations = readFileSync(join(process.cwd(), "src/hooks/use-estimate-row-mutations.ts"), "utf8");
const proposalPreviewHook = readFileSync(join(process.cwd(), "src/components/workshop/estimate-sheet/use-estimate-proposal-preview.ts"), "utf8");
const rowTable = readFileSync(join(process.cwd(), "src/components/workshop/estimate-sheet/rows/row-table.tsx"), "utf8");
const rowCells = readFileSync(join(process.cwd(), "src/components/workshop/estimate-sheet/rows/cells.tsx"), "utf8");
const rowDropZones = readFileSync(join(process.cwd(), "src/components/workshop/estimate-sheet/rows/drop-zones.tsx"), "utf8");
const rowConstants = readFileSync(join(process.cwd(), "src/components/workshop/estimate-sheet/rows/constants.ts"), "utf8");
const workshopDragStore = readFileSync(join(process.cwd(), "src/components/workshop/estimate-workshop-drag.ts"), "utf8");
const estimateSheetTree = readFileSync(join(process.cwd(), "src/components/workshop/EstimateSheetTree.tsx"), "utf8");
const estimateSheetEvents = readFileSync(join(process.cwd(), "src/components/workshop/estimate-sheet/events.ts"), "utf8");
const uiTree = readFileSync(join(process.cwd(), "src/components/ui/tree.tsx"), "utf8");

function sourceBetween(source: string, start: string, end: string) {
  const startIndex = source.indexOf(start);
  const endIndex = source.indexOf(end, startIndex);
  expect(startIndex).toBeGreaterThanOrEqual(0);
  expect(endIndex).toBeGreaterThan(startIndex);
  return source.slice(startIndex, endIndex);
}

describe("estimate sheet center atomic mutation contracts", () => {
  it("persists component moves through a single atomic mutation path", () => {
    const moveSource = sourceBetween(estimateRowHandlers, "const moveRowComponent = useStableCallback", "const deleteRowItem = useStableCallback");

    expect(moveSource).toContain("moveRows({");
    expect(moveSource).not.toContain("replaceRow({");
    expect(moveSource).not.toContain("restoreSourceRow");
    expect(moveSource).not.toContain("restoreTargetRow");
  });

  it("persists row reorganization through the dedicated row-item move mutation path", () => {
    expect(estimateRowMutations).toContain("moveEstimateRowItemWithHistory");
    expect(estimateRowMutations).toContain("reconcileEstimateRowItemMoveResultToTree");

    const moveRowItemMutationSource = sourceBetween(
      estimateRowMutations,
      "const moveRowItemMutation = useMutation",
      "const deleteRowsMutation = useMutation",
    );

    expect(moveRowItemMutationSource).toContain("moveEstimateRowItemWithHistory(withoutClientCallbacks(input))");
    expect(moveRowItemMutationSource).toContain("reconcileEstimateRowItemMoveResultToTree(currentTree, latestRows)");
    expect(moveRowItemMutationSource).toContain("fetchEstimateTree({ projectId: input.projectId, estimateId: input.estimateId })");
    expect(moveRowItemMutationSource).not.toContain("moveEstimateRowComponentWithHistory");
  });

  it("exposes row reorganization through a dedicated row-item drag surface", () => {
    expect(rowConstants).toContain("ESTIMATE_ROW_ITEM_DRAG_MIME_TYPE");
    expect(rowConstants).toContain("readEstimateRowItemDragPayload");
    expect(workshopDragStore).toContain('kind: "estimate-row-item"');

    expect(rowTable).toContain("beginEstimateWorkshopDrag({");
    expect(rowTable).toContain('kind: "estimate-row-item"');
    expect(rowTable).toContain("event.dataTransfer.dropEffect = \"move\"");
    expect(rowTable).toContain("onMoveRowItem(payload.rowItemId, targetNodeId");
    expect(rowTable).toContain("onOpenMoveRowItemDialog(computedItem.id, event.currentTarget)");
    expect(rowTable).toContain("data-estimate-row-select-cell");
    expect(rowTable).toContain("data-estimate-row-drag-handle");
    expect(rowTable).not.toContain("data-estimate-row-move-action");
    expect(rowTable).not.toContain("onMoveRowComponent(payload.rowItemId");

    expect(rowDropZones).toContain("rowItemDragActive");
    expect(rowDropZones).toContain("onMoveRowItem(rowItemPayload.rowItemId, nodeId, rowDropIndex)");

    expect(estimateSheetEvents).toContain("REQUEST_ESTIMATE_ROW_ITEM_MOVE_EVENT");
    expect(estimateSheetContent).toContain("readRequestEstimateRowItemMoveEventDetail");
    expect(estimateSheetContent).toContain("moveRowItemToNode(detail.rowItemId, detail.targetNodeId, detail.targetIndex, { targetPlacement: detail.targetPlacement })");
    expect(estimateSheetContent).toContain("const [rowMoveDialog, setRowMoveDialog]");
    expect(estimateSheetContent).toContain('title="Move row"');
    expect(estimateSheetContent).toContain("resolveRowMoveDialogTargetIndex");
    expect(estimateSheetTree).toContain("ESTIMATE_ROW_ITEM_DRAG_MIME_TYPE");
    expect(estimateSheetTree).toContain("REQUEST_ESTIMATE_ROW_ITEM_MOVE_EVENT");
    expect(estimateSheetTree).toContain("targetIndex: targetNode.estimateRowItems?.length ?? 0");
    expect(estimateSheetTree).toContain('targetPlacement: "end"');
    expect(uiTree).toContain("dropEffect?:");
    expect(uiTree).toContain('?? "copy"');
  });

  it("persists selected row deletes through a single all-or-nothing mutation path", () => {
    const deleteSelectedRowsSource = sourceBetween(estimateRowHandlers, "const deleteSelectedRows = useStableCallback", "return {");

    expect(deleteSelectedRowsSource).toContain("deleteRows({");
    expect(deleteSelectedRowsSource).not.toContain("bulkSelectedRowIds.forEach");
    expect(deleteSelectedRowsSource).not.toContain("deleteRowItem(rowItemId)");
  });

  it("drops stale project-source full-tree responses", () => {
    const projectSourceInsertSource = sourceBetween(
      estimateSheetContent,
      "const insertProjectSourceIntoParentById = useStableCallback",
      "const insertProjectSourceIntoSelectedGroup = useCallback",
    );

    expect(projectSourceInsertSource).toContain("const projectSourceRequestRevision = getEstimateTreeRevision();");
    expect(projectSourceInsertSource).toContain("if (getEstimateTreeRevision() === projectSourceRequestRevision) setEstimateTree(() => result.tree);");
  });

  it("downloads proposal exports with same-origin credentials", () => {
    const proposalDownloadSource = sourceBetween(
      proposalPreviewHook,
      "const downloadProposalExport = useCallback",
      "const proposalPreviewScopeControls",
    );

    expect(proposalDownloadSource).toContain('fetch(proposalDownloadHref, { credentials: "same-origin" })');
  });

  it("keeps estimate row primary numeric values on one font size and centerline", () => {
    expect(rowTable).toContain('const ESTIMATE_PRIMARY_NUMERIC_CLASS = "!text-[10px] font-medium leading-3 tabular-nums text-ink";');
    expect(rowTable).toContain('const ESTIMATE_SECONDARY_NUMERIC_CLASS = "absolute top-1/2 mt-3');
    expect(rowTable).toContain('const ESTIMATE_CORNER_NUMERIC_CLASS = "absolute top-2');
    expect(rowTable).toContain('className="relative grid h-full w-full min-w-0 place-items-center"');
    expect(rowTable).not.toContain("flex min-w-0 flex-col items-center justify-center gap-0.5");
    expect(rowCells).toContain('className="!text-[10px] font-medium leading-3 tabular-nums text-ink"');
  });

  it("keeps quantity contingency breakdown as corner metadata with a centered total", () => {
    expect(rowTable).toContain("const quantityDisplayValue = quantityCellFocused ? computedItem.editableQuantityInput : formatCompactNumber(computedItem.quantity);");
    expect(rowTable).toContain('value={quantityDisplayValue}');
    expect(rowTable).toContain("<dt>Value</dt>");
    expect(rowTable).toContain("<dt>Contingency</dt>");
    expect(rowTable).toContain('className="min-w-4 text-right tabular-nums text-ink"');
    expect(rowTable).toContain("ESTIMATE_CORNER_NUMERIC_CLASS");
    expect(rowTable).not.toContain('import { Chip } from "@/components/ui/chip";');
    expect(rowTable).not.toContain("<Chip");
  });
});
