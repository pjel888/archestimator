import { readFileSync } from "node:fs";

import { describe, expect, it, vi } from "vitest";

import type { EstimateRowItem, EstimateTreeNode } from "@/components/workshop/estimate-tree-data";
import { getInitialEditableRow } from "@/components/workshop/estimate-sheet/rows/editable-row-model";
import {
  createEditableRowStore,
  type EditableRowCommitLifecycle,
} from "@/components/workshop/estimate-sheet/rows/editable-row-store";
import {
  ROW_COMMIT_INTENT_KINDS,
  SHARED_COMPONENT_DEFINITION_TARGETS,
} from "@/components/workshop/estimate-sheet/rows/row-commit-intent";

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

  it("freezes exactly four row commit intents and three shared-definition targets", () => {
    expect(ROW_COMMIT_INTENT_KINDS).toEqual([
      "row-field-update",
      "selected-variant-update",
      "shared-component-definition-update",
      "make-project-specific",
    ]);
    expect(SHARED_COMPONENT_DEFINITION_TARGETS).toEqual([
      "linked-library-component",
      "project-component",
      "project-variant",
    ]);

    const intentSource = read("src/components/workshop/estimate-sheet/rows/row-commit-intent.ts");
    expect(intentSource).not.toContain("duplicate-row");
    expect(intentSource).not.toContain("duplicateSourceRowId");
  });

  it("keeps optimistic and authoritative rows in one fail-closed token-guarded store", () => {
    const row: EstimateRowItem = {
      id: "row-commit-contract",
      material: "Cabinet",
      description: "Base cabinet",
      supplier: "Local supplier",
      source: "project",
      unit: "lm",
      itemCost: 100,
      quantity: 1,
      subTotal: 100,
      miscCost: 0,
      totalItemCosts: 100,
      category: "Cabinetry",
      pricingSource: "Contract fixture",
      pricingDate: "2026-07-17",
    };
    const tree: EstimateTreeNode[] = [{
      id: "node-commit-contract",
      name: "Kitchen",
      kind: "area",
      total: "PHP 100.00",
      estimateRowItems: [row],
      children: [],
    }];
    const initialRow = getInitialEditableRow(row);
    const failClosedStore = createEditableRowStore({ [row.id]: initialRow }, tree);

    failClosedStore.getState().commitRowFields(row, { quantity: "2" });
    expect(failClosedStore.getState().rows[row.id]).toBe(initialRow);
    expect(failClosedStore.getState().authoritativeRows[row.id]).toBe(initialRow);
    expect(failClosedStore.getState().rowCommitStates[row.id]).toMatchObject({
      phase: "failed",
      error: "Row commit adapters are unavailable.",
      activeCommitToken: null,
      retainDraft: false,
    });

    const lifecycles: EditableRowCommitLifecycle[] = [];
    const markDirty = vi.fn();
    const markClean = vi.fn();
    const store = createEditableRowStore({ [row.id]: initialRow }, tree);
    store.getState().setCommitAdapters({
      commit: (_intent, lifecycle) => lifecycles.push(lifecycle),
      requestMakeProjectSpecific: (_intent, lifecycle) => lifecycles.push(lifecycle),
      markDirty,
      markClean,
    });

    store.getState().commitRowFields(row, { quantity: "2" });
    const firstToken = store.getState().rowCommitStates[row.id]?.activeCommitToken;
    store.getState().commitRowFields(row, { quantity: "3" });
    const secondToken = store.getState().rowCommitStates[row.id]?.activeCommitToken;
    expect(firstToken).toBeTruthy();
    expect(secondToken).toBeTruthy();
    expect(secondToken).not.toBe(firstToken);
    expect(store.getState().rows[row.id]?.quantity).toBe("3");

    lifecycles[0]?.pending([row.id]);
    lifecycles[0]?.awaitingConfirmation([row.id]);
    lifecycles[0]?.committed({ [row.id]: { ...initialRow, quantity: "2" } });
    expect(store.getState().rows[row.id]?.quantity).toBe("3");
    expect(store.getState().authoritativeRows[row.id]).toBe(initialRow);
    expect(store.getState().rowCommitStates[row.id]?.activeCommitToken).toBe(secondToken);

    lifecycles[0]?.rejected(new Error("late failure"), "rollback");
    expect(store.getState().rows[row.id]?.quantity).toBe("3");
    expect(store.getState().rowCommitStates[row.id]?.activeCommitToken).toBe(secondToken);

    store.getState().commitRowFields(row, {});
    expect(store.getState().rows[row.id]?.quantity).toBe("3");
    expect(store.getState().rowCommitStates[row.id]?.activeCommitToken).toBe(secondToken);

    store.getState().syncAuthoritativeRows({ [row.id]: { ...initialRow, quantity: "3" } });
    expect(store.getState().rows[row.id]?.quantity).toBe("3");
    expect(store.getState().authoritativeRows[row.id]).toBe(initialRow);
    expect(store.getState().rowCommitStates[row.id]?.activeCommitToken).toBe(secondToken);

    const committedRow = { ...initialRow, quantity: "3" };
    lifecycles[1]?.committed({ [row.id]: committedRow });
    expect(store.getState().rows[row.id]).toEqual(committedRow);
    expect(store.getState().authoritativeRows[row.id]).toEqual(committedRow);
    expect(store.getState().rowCommitStates[row.id]).toBeUndefined();
    expect(markDirty).toHaveBeenCalled();
    expect(markClean).toHaveBeenCalled();
  });

  it("installs real adapters in layout order and replaces drilled row commit props with selectors", () => {
    const contentSource = read("src/components/workshop/EstimateSheetContent.tsx");
    const storeSource = read("src/components/workshop/estimate-sheet/rows/editable-row-store.ts");
    const branchSource = read("src/components/workshop/estimate-sheet/rows/branch.tsx");
    const tableSource = read("src/components/workshop/estimate-sheet/rows/row-table.tsx");
    const branchProps = branchSource.slice(
      branchSource.indexOf("export type EstimateSheetBranchProps"),
      branchSource.indexOf("export type SheetMutationHandlers"),
    );
    const tableProps = tableSource.slice(
      tableSource.indexOf("export type EstimateRowItemsTableProps"),
      tableSource.indexOf("export type EstimateTableColumnResizeConfig"),
    );
    const removedProps = [
      "onUpdateRowItem",
      "onUpdateLinkedLibraryComponent",
      "onMarkRowDirty",
      "onReconcileRowDirty",
      "onRequestProjectSpecific",
      "rowMutationStatuses",
      "componentSyncPendingRowIds",
    ];

    expect(storeSource).toContain("const failClosedCommitAdapters");
    expect(storeSource).toContain("setCommitAdapters: (adapters)");
    expect(contentSource).toContain("useLayoutEffect(() => {");
    expect(contentSource).toContain("editableRowStore.getState().setCommitAdapters({");
    for (const prop of removedProps) {
      expect(branchProps).not.toContain(prop);
      expect(tableProps).not.toContain(prop);
    }
    expect(tableSource).toContain("selectEditableRowCommitState(state, item.id)");
    expect(tableSource).toContain("selectExternalRowMutationStatus(state, item.id)");
    expect(tableSource).toContain("state.rows[item.id]");
    expect(branchSource).not.toContain("rowMutationStatuses");
    expect(contentSource).toContain("syncExternalMutationStatuses(rowMutationStatuses, componentEditorPendingRowIds)");
  });

  it("keeps client row commit modules free of server-only boundaries and duplicate identity in structural handlers", () => {
    const intentSource = read("src/components/workshop/estimate-sheet/rows/row-commit-intent.ts");
    const storeSource = read("src/components/workshop/estimate-sheet/rows/editable-row-store.ts");
    const tableSource = read("src/components/workshop/estimate-sheet/rows/row-table.tsx");
    const branchSource = read("src/components/workshop/estimate-sheet/rows/branch.tsx");
    const handlerSource = read("src/components/workshop/estimate-sheet/use-estimate-row-handlers.ts");
    const mutationSource = read("src/hooks/use-estimate-row-mutations.ts");
    const clientCommitSources = [intentSource, storeSource, tableSource, branchSource];

    for (const source of clientCommitSources) {
      expect(source).not.toMatch(/from ["'][^"']*(?:d1-intents|d1-action-client|component-mutation-d1|actor-context|authz\/d1-access|repositories\/)/u);
      expect(source).not.toContain('import "server-only"');
    }
    expect(handlerSource).toContain("duplicateRowIntentRef");
    expect(handlerSource).toContain("retainedDuplicateIntent");
    expect(handlerSource).toContain("duplicateSourceRowRevision");
    expect(handlerSource).not.toContain("bufferedCommitOptions?.onPersistenceError");
    expect(mutationSource).toContain("duplicateInsertRevisionByMutationIdRef");
    expect(mutationSource).toContain("isAmbiguousDuplicateRowFailure");
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
