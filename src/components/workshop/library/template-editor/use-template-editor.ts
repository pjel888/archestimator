"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { useNavigationRouter } from "@/hooks/use-navigation-router";
import {
  addEstimateTemplateRowItems,
  createEstimateTemplateAllowanceRow,
  createEstimateTemplateNode,
  deleteEstimateTemplateNode,
  insertTemplateIntoTemplate,
  moveEstimateTemplateNode,
  removeEstimateTemplateRowItem,
  renameEstimateTemplateNode,
  updateEstimateTemplateRowItem,
  type TemplateEditorRowPatch,
  type TemplateNodeKind,
} from "@/lib/component-library/template-editor-actions";
import type { EstimateRowItem, EstimateTreeNode } from "@/lib/estimates/types";
import type { EstimateTemplate } from "../../component-library/templates";
import {
  appendTemplateChildNode,
  appendTemplateRowToNode,
  recomputeTemplateRow,
  removeTemplateNodeFromNodes,
  removeTemplateRowFromNodes,
  renameTemplateNodeInNodes,
  updateTemplateRowInNodes,
} from "./template-editor-model";

export type TemplateEditorSaveState =
  | { state: "saved" }
  | { state: "saving" }
  | { state: "error"; message: string };

type RefreshMode = "immediate" | "deferred" | "none";

const TEMPLATE_EDITOR_DEFERRED_REFRESH_MS = 450;

function createTemporaryId() {
  return `temp-${globalThis.crypto?.randomUUID?.() ?? Math.random().toString(36).slice(2)}`;
}

/**
 * Optimistic template editing: every mutation patches the local tree first,
 * runs the server action, then router.refresh() pulls the canonical tree
 * (temp ids resolve there). Failures roll the local tree back and surface
 * the error in the save indicator.
 */
export function useTemplateEditor(template: EstimateTemplate) {
  const router = useNavigationRouter();
  const deferredRefreshRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [templateState, setTemplateState] = useState({ source: template, value: template });
  const [saveState, setSaveState] = useState<TemplateEditorSaveState>({ state: "saved" });

  // Server refreshes re-seed the optimistic copy (render-time prop sync).
  if (templateState.source !== template) {
    setTemplateState({ source: template, value: template });
  }
  const value = templateState.source !== template ? template : templateState.value;

  const applyNodes = useCallback((updater: (nodes: EstimateTreeNode[]) => EstimateTreeNode[]) => {
    setTemplateState((current) => ({
      ...current,
      value: { ...current.value, nodes: updater(current.value.nodes) },
    }));
  }, []);

  const clearDeferredRefresh = useCallback(() => {
    if (!deferredRefreshRef.current) return;
    clearTimeout(deferredRefreshRef.current);
    deferredRefreshRef.current = null;
  }, []);

  const refreshNow = useCallback(() => {
    clearDeferredRefresh();
    router.refresh();
  }, [clearDeferredRefresh, router]);

  const scheduleRefresh = useCallback(() => {
    clearDeferredRefresh();
    deferredRefreshRef.current = setTimeout(() => {
      deferredRefreshRef.current = null;
      router.refresh();
    }, TEMPLATE_EDITOR_DEFERRED_REFRESH_MS);
  }, [clearDeferredRefresh, router]);

  useEffect(() => clearDeferredRefresh, [clearDeferredRefresh]);

  const run = useCallback(
    async (
      optimistic: ((nodes: EstimateTreeNode[]) => EstimateTreeNode[]) | null,
      mutation: () => Promise<unknown>,
      refreshMode: RefreshMode = "immediate",
    ) => {
      let previous: EstimateTemplate | null = null;
      setTemplateState((current) => {
        previous = current.value;
        if (!optimistic) return current;
        return { ...current, value: { ...current.value, nodes: optimistic(current.value.nodes) } };
      });
      setSaveState({ state: "saving" });
      try {
        await mutation();
        setSaveState({ state: "saved" });
        if (refreshMode === "immediate") refreshNow();
        if (refreshMode === "deferred") scheduleRefresh();
        return true;
      } catch (error) {
        if (previous) {
          const rollback = previous;
          setTemplateState((current) => ({ ...current, value: rollback }));
        }
        setSaveState({ state: "error", message: error instanceof Error ? error.message : "Could not save the change." });
        return false;
      }
    },
    [refreshNow, scheduleRefresh],
  );

  const addNode = useCallback(
    (parentId: string | null, kind: TemplateNodeKind, name: string) => {
      const trimmed = name.trim();
      if (!trimmed) return Promise.resolve(false);
      const tempNode: EstimateTreeNode = {
        id: createTemporaryId(),
        name: trimmed,
        kind,
        total: "",
        children: [],
        estimateRowItems: [],
      };
      return run(
        (nodes) => appendTemplateChildNode(nodes, parentId, tempNode),
        () => createEstimateTemplateNode({ templateId: template.id, parentId, kind, name: trimmed }),
      );
    },
    [run, template.id],
  );

  const renameNode = useCallback(
    (nodeId: string, name: string) => {
      const trimmed = name.trim();
      if (!trimmed) return Promise.resolve(false);
      return run(
        (nodes) => renameTemplateNodeInNodes(nodes, nodeId, trimmed),
        () => renameEstimateTemplateNode({ templateId: template.id, nodeId, name: trimmed }),
      );
    },
    [run, template.id],
  );

  const deleteNode = useCallback(
    (nodeId: string) =>
      run(
        (nodes) => removeTemplateNodeFromNodes(nodes, nodeId),
        () => deleteEstimateTemplateNode({ templateId: template.id, nodeId }),
      ),
    [run, template.id],
  );

  const moveNode = useCallback(
    (nodeId: string, parentId: string | null, orderedSiblingIds: string[]) =>
      // Tree moves re-shape sibling arrays; the refreshed server tree is the
      // source of truth, so skip the local transform and show saving state.
      run(null, () => moveEstimateTemplateNode({ templateId: template.id, nodeId, parentId, orderedSiblingIds })),
    [run, template.id],
  );

  const updateRow = useCallback(
    (rowId: string, patch: TemplateEditorRowPatch) => {
      const localPatch: Partial<EstimateRowItem> = {};
      if (patch.material !== undefined) localPatch.material = patch.material;
      if (patch.description !== undefined) localPatch.description = patch.description;
      if (patch.unit !== undefined) localPatch.unit = patch.unit;
      if (patch.quantity !== undefined) localPatch.quantity = patch.quantity;
      if (patch.unitCost !== undefined) localPatch.itemCost = patch.unitCost;
      if (patch.miscCost !== undefined) localPatch.miscCost = patch.miscCost;
      if (patch.contingencyPercentage !== undefined) localPatch.adjustmentPercentage = patch.contingencyPercentage;
      if (patch.adjustmentPercentage !== undefined) localPatch.adjustmentPercentage = patch.adjustmentPercentage;
      return run(
        (nodes) => updateTemplateRowInNodes(nodes, rowId, localPatch),
        () => updateEstimateTemplateRowItem({ templateId: template.id, rowId, patch }),
        "deferred",
      );
    },
    [run, template.id],
  );

  const removeRow = useCallback(
    (rowId: string) =>
      run(
        (nodes) => removeTemplateRowFromNodes(nodes, rowId),
        () => removeEstimateTemplateRowItem({ templateId: template.id, rowId }),
      ),
    [run, template.id],
  );

  const addAllowanceRow = useCallback(
    (nodeId: string, material: string) => {
      const trimmed = material.trim();
      if (!trimmed) return Promise.resolve(false);
      const tempRow: EstimateRowItem = recomputeTemplateRow({
        id: createTemporaryId(),
        material: trimmed,
        description: "",
        supplier: "",
        source: "project",
        unit: "unit",
        itemCost: 0,
        quantity: 1,
        subTotal: 0,
        contingencyPercentage: 0,
        contingencyValue: 0,
        miscCost: 0,
        totalItemCosts: 0,
        category: "Unassigned",
        linkState: "unlinked",
        pricingSource: "Template allowance row",
        pricingDate: "",
      });
      return run(
        (nodes) => appendTemplateRowToNode(nodes, nodeId, tempRow),
        () => createEstimateTemplateAllowanceRow({ templateId: template.id, nodeId, material: trimmed }),
      );
    },
    [run, template.id],
  );

  const addLibraryItems = useCallback(
    (nodeId: string, items: EstimateRowItem[]) => {
      if (items.length === 0) return Promise.resolve(false);
      const tempRows = items.map((item) =>
        recomputeTemplateRow({
          ...item,
          id: createTemporaryId(),
          sourceLibraryItemId: item.sourceLibraryItemId ?? (item.source === "library" ? item.id : null),
          quantity: item.quantity > 0 ? item.quantity : 1,
          linkState: "linked-clean",
        }),
      );
      return run(
        (nodes) => tempRows.reduce((acc, row) => appendTemplateRowToNode(acc, nodeId, row), nodes),
        () => addEstimateTemplateRowItems({ templateId: template.id, nodeId, libraryItems: items }),
      );
    },
    [run, template.id],
  );

  const insertTemplate = useCallback(
    (sourceTemplateId: string, targetNodeId: string | null, sourceNodeId?: string | null) =>
      run(null, () =>
        insertTemplateIntoTemplate({ targetTemplateId: template.id, targetNodeId, sourceTemplateId, sourceNodeId }),
      ),
    [run, template.id],
  );

  return {
    template: value,
    saveState,
    applyNodes,
    addNode,
    renameNode,
    deleteNode,
    moveNode,
    updateRow,
    removeRow,
    addAllowanceRow,
    addLibraryItems,
    insertTemplate,
  };
}
