"use client";

import { useEffect, useRef, type Dispatch, type MutableRefObject, type SetStateAction } from "react";

import type { useEstimateRowMutations, EstimateSaveState } from "@/hooks/use-estimate-row-mutations";
import { useStableCallback } from "@/hooks/use-stable-callback";
import { recordLibraryEvent } from "@/lib/component-library/library-telemetry";
import { applyEstimateRowItemPatch, estimateRowMutationResultToPatch, patchEstimateRowItemInTree } from "@/lib/estimates/estimate-row-tree-patch";
import { isExpressComponentRow, readEstimateRowMetadata, withExpressComponentMetadata } from "@/lib/estimates/express-components";
import { recordExpressComponentEvent } from "@/lib/estimates/express-components-telemetry";
import { getLibraryCommitTrustGate, type LibraryCommitTrustGateResult } from "@/components/workshop/library/source-trust-model";

import { findEstimateNode, type EstimateRowItem, type EstimateTreeNode } from "../estimate-tree-data";
import {
  BLANK_ESTIMATE_ROW_COMPONENT_LABEL,
  BLANK_ESTIMATE_ROW_TAG,
  isBlankEstimateRowItem,
} from "./activity-history-model";
import {
  canMakeProjectSpecific,
  canPromoteEstimateRowToLibrary,
} from "./rows/cells-model";
import {
  calculateContingencyValue,
  collectEditableRows,
  getInitialEditableRow,
  parseEditableContingencyPercentage,
  parseNonNegativeEditableNumber,
  type EditableRowValue,
} from "./rows/editable-row-model";
import {
  cloneLibraryItemForEstimate,
  createEstimateRowItemId,
} from "./template-insertion-model";

type EstimateRowMutations = ReturnType<typeof useEstimateRowMutations>;
type EstimateTreeUpdater = (updater: (current: EstimateTreeNode[]) => EstimateTreeNode[]) => number;
type RestoreEstimateState = (
  previousTree: EstimateTreeNode[],
  previousRows: Record<string, EditableRowValue>,
  expectedRevision?: number,
) => void;
type Toast = (input: {
  id?: string;
  tone?: "neutral" | "loading" | "success" | "error";
  message: string;
  durationMs?: number | null;
  action?: { label: string; onClick: () => void };
}) => string;

export type PendingLibraryCommitGate = {
  id: string;
  action: "insert" | "replace";
  targetNodeId?: string;
  rowItemId?: string;
  libraryItem: EstimateRowItem;
  existingRow?: EstimateRowItem | null;
  gate: LibraryCommitTrustGateResult;
};

export type ExpressInsertDraft = {
  targetNodeId: string;
  libraryItem: EstimateRowItem;
  mutationId: string;
  status: "creating" | "failed";
  bufferedPatch?: Partial<EditableRowValue>;
  errorMessage?: string;
};

export type RowComponentPickerState = {
  mode: "replace" | "move";
  rowItemId: string;
  opener: HTMLElement | null;
};

type EstimateRowItemLocation = {
  nodeId: string;
  index: number;
  item: EstimateRowItem;
};

type UseEstimateRowHandlersInput = {
  canEditEstimate: boolean;
  projectId?: string;
  workspaceId?: string;
  estimateId?: string;
  estimateTree: EstimateTreeNode[];
  editableRows: Record<string, EditableRowValue>;
  saveState: EstimateSaveState;
  insertTargetNodeId: string;
  pendingLibraryCommitGate: PendingLibraryCommitGate | null;
  expressInsertDrafts: Record<string, ExpressInsertDraft>;
  bulkSelectedRowIds: Set<string>;
  rowComponentPicker: RowComponentPickerState | null;
  projectSpecificRowItem: EstimateRowItem | null;
  markRowDirtyNow: EstimateRowMutations["markRowDirty"];
  insertRow: EstimateRowMutations["insertRow"];
  replaceRow: EstimateRowMutations["replaceRow"];
  moveRows: EstimateRowMutations["moveRows"];
  detachRow: EstimateRowMutations["detachRow"];
  promoteRow: EstimateRowMutations["promoteRow"];
  deleteRow: EstimateRowMutations["deleteRow"];
  deleteRows: EstimateRowMutations["deleteRows"];
  restoreDeletedRows: EstimateRowMutations["restoreDeletedRows"];
  updateRow: EstimateRowMutations["updateRow"];
  setEstimateTree: EstimateTreeUpdater;
  setEditableRows: Dispatch<SetStateAction<Record<string, EditableRowValue>>>;
  setExpressInsertDrafts: Dispatch<SetStateAction<Record<string, ExpressInsertDraft>>>;
  setPendingLibraryCommitGate: Dispatch<SetStateAction<PendingLibraryCommitGate | null>>;
  setBulkSelectedRowIds: Dispatch<SetStateAction<Set<string>>>;
  setProjectSpecificRowId: Dispatch<SetStateAction<string>>;
  setPromotingRowId: Dispatch<SetStateAction<string | null>>;
  skipEditableRowsSyncRef: MutableRefObject<number>;
  getEstimateTreeRevision: () => number;
  restoreEstimateState: RestoreEstimateState;
  closeRowComponentPicker: () => void;
  refetchProjectComponentProjection: () => void;
  handleLibraryDataChanged: () => void;
  recordReadOnlyLibraryMutationAttempt: (action: string) => void;
  toast: Toast;
};

export function findEstimateRowItem(nodes: EstimateTreeNode[], rowItemId: string): EstimateRowItem | null {
  for (const node of nodes) {
    for (const item of node.estimateRowItems ?? []) {
      if (item.id === rowItemId) return item;
    }
    if (node.children) {
      const childRowItem = findEstimateRowItem(node.children, rowItemId);
      if (childRowItem) return childRowItem;
    }
  }
  return null;
}

function shouldGateLibraryCommit(item: EstimateRowItem) {
  return item.source === "library" || item.source === "supplier" || Boolean(item.sourceLibraryItemId);
}

function libraryCommitEventAction(action: PendingLibraryCommitGate["action"]) {
  return action === "replace" ? "replace_row" : "insert_row";
}

function createBlankEstimateRowTemplate(): EstimateRowItem {
  return {
    id: "manual-estimate-row-template",
    material: BLANK_ESTIMATE_ROW_COMPONENT_LABEL,
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
    tags: [BLANK_ESTIMATE_ROW_TAG],
    pricingSource: "Manual estimate row",
    pricingDate: new Date().toISOString().slice(0, 10),
    confidence: "unpriced",
  };
}

function createExpressEstimateRowTemplate(): EstimateRowItem {
  const createdAt = new Date().toISOString();
  return {
    id: "express-estimate-row-template",
    material: "",
    description: "",
    supplier: "",
    source: "project",
    unit: "",
    itemCost: 0,
    quantity: 1,
    subTotal: 0,
    contingencyPercentage: 0,
    contingencyValue: 0,
    miscCost: 0,
    totalItemCosts: 0,
    category: "Unassigned",
    pricingSource: "Express component",
    pricingDate: createdAt.slice(0, 10),
    confidence: "unpriced",
    discipline: "Unspecified",
    designation: "",
    sourceLibraryItemId: null,
    linkState: "unlinked",
    metadata: withExpressComponentMetadata({}, {
      id: createEstimateRowItemId(),
      createdFrom: "estimate-sheet-add-row",
      sourceLabel: "Express component",
      createdAt,
    }),
  };
}

function removeEstimateRowItem(nodes: EstimateTreeNode[], rowItemId: string): EstimateTreeNode[] {
  return nodes.map((node) => ({
    ...node,
    estimateRowItems: node.estimateRowItems?.filter((item) => item.id !== rowItemId),
    children: node.children ? removeEstimateRowItem(node.children, rowItemId) : node.children,
  }));
}

function findEstimateRowItemLocation(nodes: EstimateTreeNode[], rowItemId: string): EstimateRowItemLocation | null {
  for (const node of nodes) {
    const rowItems = node.estimateRowItems ?? [];
    for (let rowIndex = 0; rowIndex < rowItems.length; rowIndex += 1) {
      const item = rowItems[rowIndex];
      if (item.id === rowItemId) return { nodeId: node.id, index: rowIndex, item };
    }
    if (node.children) {
      const childLocation = findEstimateRowItemLocation(node.children, rowItemId);
      if (childLocation) return childLocation;
    }
  }
  return null;
}

function restoreEstimateRowItemAtLocation(nodes: EstimateTreeNode[], location: EstimateRowItemLocation, item = location.item): EstimateTreeNode[] {
  return nodes.map((node) => {
    if (node.id === location.nodeId) {
      const currentItems = node.estimateRowItems ?? [];
      if (currentItems.some((currentItem) => currentItem.id === item.id)) return node;
      const nextItems = [...currentItems];
      nextItems.splice(Math.min(location.index, nextItems.length), 0, item);
      return { ...node, estimateRowItems: nextItems };
    }
    return {
      ...node,
      children: node.children ? restoreEstimateRowItemAtLocation(node.children, location, item) : node.children,
    };
  });
}

function replaceEstimateRowItemsInTree(nodes: EstimateTreeNode[], replacements: Map<string, EstimateRowItem>): EstimateTreeNode[] {
  return nodes.map((node) => ({
    ...node,
    estimateRowItems: node.estimateRowItems?.map((item) => replacements.get(item.id) ?? item),
    children: node.children ? replaceEstimateRowItemsInTree(node.children, replacements) : node.children,
  }));
}

function getActiveExpressEditorRowId() {
  if (typeof document === "undefined") return "";
  const activeElement = document.activeElement;
  if (!(activeElement instanceof HTMLElement)) return "";
  if (!activeElement.dataset.expressField) return "";
  return activeElement.dataset.estimateRowId || activeElement.closest<HTMLElement>("[data-estimate-row-id]")?.dataset.estimateRowId || "";
}

function applyEditableValuesToLibraryItem(libraryItem: EstimateRowItem, editableRow?: EditableRowValue): EstimateRowItem {
  if (!editableRow) return libraryItem;

  const quantity = parseNonNegativeEditableNumber(editableRow.quantity);
  const contingencyPercentage = parseEditableContingencyPercentage(editableRow);
  const miscCost = parseNonNegativeEditableNumber(editableRow.miscCost);
  const subTotal = libraryItem.itemCost * quantity;
  const contingencyValue = calculateContingencyValue(subTotal, contingencyPercentage);

  return {
    ...libraryItem,
    quantity,
    subTotal,
    contingencyPercentage,
    contingencyValue,
    miscCost,
    totalItemCosts: subTotal + miscCost + contingencyValue,
  };
}

function getClearedEstimateRowMetadata(metadata: EstimateRowItem["metadata"]): EstimateRowItem["metadata"] {
  const { expressComponent: _expressComponent, projectComponentProjection: _projectComponentProjection, ...rest } = readEstimateRowMetadata(metadata);
  void _expressComponent;
  void _projectComponentProjection;
  return {
    ...rest,
    sourceComponentId: null,
    tags: [BLANK_ESTIMATE_ROW_TAG],
  };
}

function replaceRowItemWithLibraryItem(rowItemId: string, libraryItem: EstimateRowItem): EstimateRowItem {
  const quantity = libraryItem.quantity || 1;
  const contingencyPercentage = libraryItem.contingencyPercentage ?? 0;
  const miscCost = libraryItem.miscCost ?? 0;
  const subTotal = libraryItem.itemCost * quantity;
  const contingencyValue = calculateContingencyValue(subTotal, contingencyPercentage);
  return {
    ...libraryItem,
    id: rowItemId,
    quantity,
    subTotal,
    contingencyPercentage,
    contingencyValue,
    miscCost,
    totalItemCosts: subTotal + miscCost + contingencyValue,
  };
}

function resolveSetStateAction<T>(current: T, value: SetStateAction<T>): T {
  return typeof value === "function" ? (value as (current: T) => T)(current) : value;
}

export function useEstimateRowHandlers({
  canEditEstimate,
  projectId,
  workspaceId,
  estimateId,
  estimateTree,
  editableRows,
  saveState,
  insertTargetNodeId,
  pendingLibraryCommitGate,
  expressInsertDrafts,
  bulkSelectedRowIds,
  rowComponentPicker,
  projectSpecificRowItem,
  markRowDirtyNow,
  insertRow,
  replaceRow,
  moveRows,
  detachRow,
  promoteRow,
  deleteRow,
  deleteRows,
  restoreDeletedRows,
  updateRow,
  setEstimateTree,
  setEditableRows,
  setExpressInsertDrafts: setExpressInsertDraftsState,
  setPendingLibraryCommitGate,
  setBulkSelectedRowIds,
  setProjectSpecificRowId,
  setPromotingRowId,
  skipEditableRowsSyncRef,
  getEstimateTreeRevision,
  restoreEstimateState,
  closeRowComponentPicker,
  refetchProjectComponentProjection,
  handleLibraryDataChanged,
  recordReadOnlyLibraryMutationAttempt,
  toast,
}: UseEstimateRowHandlersInput) {
  const expressInsertDraftsRef = useRef<Record<string, ExpressInsertDraft>>(expressInsertDrafts);
  const pendingFocusRowIdRef = useRef("");
  const pendingFocusFrameIdRef = useRef(0);

  useEffect(() => {
    expressInsertDraftsRef.current = expressInsertDrafts;
  }, [expressInsertDrafts]);

  const setExpressInsertDrafts = useStableCallback((value: SetStateAction<Record<string, ExpressInsertDraft>>) => {
    const next = resolveSetStateAction(expressInsertDraftsRef.current, value);
    expressInsertDraftsRef.current = next;
    setExpressInsertDraftsState(next);
  });

  const markRowDirty = useStableCallback(markRowDirtyNow);

  useEffect(() => {
    if (saveState === "dirty" || saveState === "saving") return;
    if (skipEditableRowsSyncRef.current > 0) {
      skipEditableRowsSyncRef.current -= 1;
      return;
    }
    queueMicrotask(() => {
      const nextRows = collectEditableRows(estimateTree);
      const activeExpressRowId = getActiveExpressEditorRowId();
      setEditableRows((currentRows) => {
        if (!activeExpressRowId || !currentRows[activeExpressRowId]) return nextRows;
        return {
          ...nextRows,
          [activeExpressRowId]: currentRows[activeExpressRowId],
        };
      });
    });
  }, [estimateTree, saveState, setEditableRows, skipEditableRowsSyncRef]);

  const requestPendingRowFocus = useStableCallback((rowId: string) => {
    pendingFocusRowIdRef.current = rowId;
    if (pendingFocusFrameIdRef.current) window.cancelAnimationFrame(pendingFocusFrameIdRef.current);
    let attempts = 0;

    function tryFocus() {
      const pendingFocusRowId = pendingFocusRowIdRef.current;
      if (!pendingFocusRowId) {
        pendingFocusFrameIdRef.current = 0;
        return;
      }
      const focusTarget =
        document.querySelector<HTMLInputElement>(`[data-estimate-row-id="${pendingFocusRowId}"] [data-express-field="name"]`) ??
        document.querySelector<HTMLInputElement>(`[data-estimate-row-id="${pendingFocusRowId}"][data-estimate-cell-index="0"]`);
      if (focusTarget) {
        focusTarget.scrollIntoView?.({ block: "nearest", behavior: "smooth" });
        focusTarget.focus();
        focusTarget.select();
        pendingFocusRowIdRef.current = "";
        pendingFocusFrameIdRef.current = 0;
        return;
      }

      attempts += 1;
      if (attempts < 5) pendingFocusFrameIdRef.current = window.requestAnimationFrame(tryFocus);
      else {
        pendingFocusRowIdRef.current = "";
        pendingFocusFrameIdRef.current = 0;
      }
    }

    pendingFocusFrameIdRef.current = window.requestAnimationFrame(tryFocus);
  });

  useEffect(() => () => {
    if (pendingFocusFrameIdRef.current) window.cancelAnimationFrame(pendingFocusFrameIdRef.current);
  }, []);

  const commitRowItemUpdate = useStableCallback((rowItemId: string, values: Partial<EditableRowValue>) => {
    if (!projectId || !estimateId) return;
    const previousTree = estimateTree;
    const previousRows = collectEditableRows(estimateTree);
    const rollbackRevision = getEstimateTreeRevision();
    const currentRowItem = findEstimateRowItem(estimateTree, rowItemId);
    const currentEditableRow = editableRows[rowItemId] ?? previousRows[rowItemId];
    const nextEditableRow: EditableRowValue = {
      name: currentEditableRow?.name ?? "",
      description: currentEditableRow?.description ?? "",
      supplier: currentEditableRow?.supplier ?? "",
      unit: currentEditableRow?.unit ?? "unit",
      unitCost: currentEditableRow?.unitCost ?? "0",
      imageUrl: currentEditableRow?.imageUrl ?? "",
      sourceUrl: currentEditableRow?.sourceUrl ?? "",
      quantity: currentEditableRow?.quantity ?? "0",
      contingencyMode: currentEditableRow?.contingencyMode ?? "contingency",
      contingencyPercentage: currentEditableRow?.contingencyPercentage ?? "0",
      miscCost: currentEditableRow?.miscCost ?? "0",
      ...values,
    };
    const expressFieldNames = ["name", "description", "supplier", "unit", "unitCost", "imageUrl", "sourceUrl"].filter((fieldName) => values[fieldName as keyof EditableRowValue] !== undefined);
    if (expressFieldNames.length > 0) {
      recordExpressComponentEvent("save_requested", { projectId, estimateId, rowId: rowItemId, fieldNames: expressFieldNames });
    }
    const sourceSnapshotPatch = values.imageUrl !== undefined || values.sourceUrl !== undefined
      ? {
          ...(values.imageUrl !== undefined ? { imageUrl: values.imageUrl.trim() || null } : {}),
          ...(values.sourceUrl !== undefined ? { sourceUrl: values.sourceUrl.trim() || null } : {}),
        }
      : undefined;
    const shouldPromoteLegacyBlankToExpress = Boolean(currentRowItem && isBlankEstimateRowItem(currentRowItem));

    updateRow({
      projectId,
      estimateId,
      rowId: rowItemId,
      ...(values.name !== undefined ? { material: values.name } : {}),
      ...(values.description !== undefined ? { description: values.description } : {}),
      ...(values.supplier !== undefined ? { supplier: values.supplier } : {}),
      ...(values.unit !== undefined ? { unit: values.unit } : {}),
      ...(values.unitCost !== undefined ? { unitCost: parseNonNegativeEditableNumber(values.unitCost) } : {}),
      ...(sourceSnapshotPatch !== undefined ? { sourceSnapshot: sourceSnapshotPatch } : {}),
      ...(values.quantity !== undefined ? { quantity: parseNonNegativeEditableNumber(values.quantity) } : {}),
      ...(values.contingencyPercentage !== undefined || values.contingencyMode !== undefined ? { contingencyPercentage: parseEditableContingencyPercentage(nextEditableRow) } : {}),
      ...(values.miscCost !== undefined ? { miscCost: parseNonNegativeEditableNumber(values.miscCost) } : {}),
      ...(shouldPromoteLegacyBlankToExpress ? {
        metadata: withExpressComponentMetadata(currentRowItem?.metadata, {
          id: rowItemId,
          createdFrom: "legacy-blank-row-inline-edit",
          sourceLabel: "Express component",
          createdAt: new Date().toISOString(),
        }),
      } : {}),
      rollback: () => restoreEstimateState(previousTree, previousRows, rollbackRevision),
      onSuccess: () => refetchProjectComponentProjection(),
    });
  });

  const updateRowItem = useStableCallback((rowItemId: string, values: Partial<EditableRowValue>) => {
    const pendingExpressDraft = expressInsertDraftsRef.current[rowItemId];
    if (pendingExpressDraft) {
      setExpressInsertDrafts((current) => {
        const draft = current[rowItemId];
        if (!draft) return current;
        return {
          ...current,
          [rowItemId]: {
            ...draft,
            bufferedPatch: {
              ...(draft.bufferedPatch ?? {}),
              ...values,
            },
          },
        };
      });
      return;
    }

    commitRowItemUpdate(rowItemId, values);
  });

  const handleExpressInsertSuccess = useStableCallback((rowItemId: string) => {
    const draft = expressInsertDraftsRef.current[rowItemId];
    const bufferedPatch = draft?.bufferedPatch;
    setExpressInsertDrafts((current) => {
      const next = { ...current };
      delete next[rowItemId];
      return next;
    });
    recordExpressComponentEvent("insert_succeeded", { projectId, estimateId, rowId: rowItemId });
    refetchProjectComponentProjection();
    if (bufferedPatch && Object.keys(bufferedPatch).length > 0) {
      queueMicrotask(() => commitRowItemUpdate(rowItemId, bufferedPatch));
    }
  });

  const handleExpressInsertError = useStableCallback((rowItemId: string, error: Error) => {
    setExpressInsertDrafts((current) => {
      const draft = current[rowItemId];
      if (!draft) return current;
      return {
        ...current,
        [rowItemId]: {
          ...draft,
          status: "failed",
          errorMessage: error.message,
        },
      };
    });
    recordExpressComponentEvent("insert_failed", { projectId, estimateId, rowId: rowItemId, reason: error.message });
  });

  const retryExpressDraft = useStableCallback((rowItemId: string) => {
    if (!projectId || !estimateId) return;
    const draft = expressInsertDraftsRef.current[rowItemId];
    if (!draft) return;
    setExpressInsertDrafts((current) => {
      const currentDraft = current[rowItemId];
      if (!currentDraft) return current;
      return {
        ...current,
        [rowItemId]: {
          ...currentDraft,
          status: "creating",
          errorMessage: undefined,
        },
      };
    });
    recordExpressComponentEvent("insert_requested", { projectId, estimateId, nodeId: draft.targetNodeId, rowId: rowItemId, retry: true });
    insertRow({
      projectId,
      estimateId,
      targetNodeId: draft.targetNodeId,
      rowId: rowItemId,
      libraryItem: draft.libraryItem,
      mutationId: draft.mutationId,
      rollback: () => undefined,
      onSuccess: () => handleExpressInsertSuccess(rowItemId),
      onError: (error) => handleExpressInsertError(rowItemId, error),
    });
  });

  const deleteExpressDraft = useStableCallback((rowItemId: string) => {
    setEstimateTree((current) => removeEstimateRowItem(current, rowItemId));
    setEditableRows((current) => {
      const next = { ...current };
      delete next[rowItemId];
      return next;
    });
    setExpressInsertDrafts((current) => {
      const next = { ...current };
      delete next[rowItemId];
      return next;
    });
    recordExpressComponentEvent("draft_deleted", { projectId, estimateId, rowId: rowItemId });
  });

  const commitLibraryItemInsert = useStableCallback((targetNodeId: string, libraryItem: EstimateRowItem) => {
    const targetNode = findEstimateNode(estimateTree, targetNodeId);
    if (!targetNode) return false;

    const previousTree = estimateTree;
    const previousRows = editableRows;
    const newItem = cloneLibraryItemForEstimate(libraryItem);
    const isExpressInsert = isExpressComponentRow(newItem);
    const mutationId = isExpressInsert ? createEstimateRowItemId() : undefined;
    requestPendingRowFocus(newItem.id);
    if (isExpressInsert && mutationId) {
      setExpressInsertDrafts((current) => ({
        ...current,
        [newItem.id]: {
          targetNodeId,
          libraryItem,
          mutationId,
          status: "creating",
        },
      }));
    }
    const rollbackRevision = setEstimateTree((current) =>
      current.map((node) => {
        function visit(areaNode: EstimateTreeNode): EstimateTreeNode {
          if (areaNode.id === targetNodeId) {
            return { ...areaNode, estimateRowItems: [...(areaNode.estimateRowItems ?? []), newItem] };
          }
          return { ...areaNode, children: areaNode.children?.map(visit) };
        }
        return visit(node);
      }),
    );
    setEditableRows((current) => ({ ...current, [newItem.id]: getInitialEditableRow(newItem) }));

    if (projectId && estimateId) {
      insertRow({
        projectId,
        estimateId,
        targetNodeId,
        rowId: newItem.id,
        libraryItem,
        ...(mutationId ? { mutationId } : {}),
        rollback: isExpressInsert ? () => undefined : () => restoreEstimateState(previousTree, previousRows, rollbackRevision),
        onSuccess: isExpressInsert ? () => handleExpressInsertSuccess(newItem.id) : undefined,
        onError: isExpressInsert ? (error) => handleExpressInsertError(newItem.id, error) : undefined,
      });
    }
    return true;
  });

  const insertLibraryItem = useStableCallback((targetNodeId: string, libraryItem: EstimateRowItem) => {
    if (!canEditEstimate) {
      recordReadOnlyLibraryMutationAttempt("insert_row");
      return false;
    }
    if (!shouldGateLibraryCommit(libraryItem)) return commitLibraryItemInsert(targetNodeId, libraryItem);
    const gate = getLibraryCommitTrustGate(libraryItem, { action: "insert" });
    if (gate.severity === "pass") return commitLibraryItemInsert(targetNodeId, libraryItem);
    recordLibraryEvent(gate.severity === "block" ? "trust_insert_gate_blocked" : "trust_insert_gate_warned", {
      workspaceId,
      projectId,
      estimateId,
      itemId: libraryItem.id,
      action: libraryCommitEventAction("insert"),
      reason: gate.reasons.map((reason) => reason.id).join(","),
    });
    setPendingLibraryCommitGate({
      id: `${libraryItem.id}:insert:${targetNodeId}:${Date.now()}`,
      action: "insert",
      targetNodeId,
      libraryItem,
      gate,
    });
    return true;
  });

  const insertIntoSelectedNode = useStableCallback((libraryItem: EstimateRowItem) => {
    if (!insertTargetNodeId) return false;
    return insertLibraryItem(insertTargetNodeId, libraryItem);
  });

  const insertBlankRow = useStableCallback((targetNodeId: string) => {
    if (!canEditEstimate) {
      recordReadOnlyLibraryMutationAttempt("insert_blank_row");
      return false;
    }
    recordExpressComponentEvent("insert_requested", { projectId, estimateId, nodeId: targetNodeId });
    return insertLibraryItem(targetNodeId, createExpressEstimateRowTemplate());
  });

  const commitReplaceRowItem = useStableCallback((rowItemId: string, libraryItem: EstimateRowItem) => {
    const previousTree = estimateTree;
    const previousRows = editableRows;
    const editableReplacement = previousRows[rowItemId];
    const replacementLibraryItem = applyEditableValuesToLibraryItem(libraryItem, editableReplacement);
    const replacementItem = replaceRowItemWithLibraryItem(rowItemId, replacementLibraryItem);
    const rollbackRevision = setEstimateTree((current) =>
      current.map((node) => {
        function visit(areaNode: EstimateTreeNode): EstimateTreeNode {
          return {
            ...areaNode,
            estimateRowItems: areaNode.estimateRowItems?.map((item) =>
              item.id === rowItemId ? replacementItem : item,
            ),
            children: areaNode.children?.map(visit),
          };
        }
        return visit(node);
      }),
    );
    const shouldResetInlineEditor = isBlankEstimateRowItem(replacementItem) || isExpressComponentRow(replacementItem);
    setEditableRows((current) => ({
      ...current,
      [rowItemId]: shouldResetInlineEditor
        ? getInitialEditableRow(replacementItem)
        : current[rowItemId] ?? previousRows[rowItemId] ?? getInitialEditableRow(replacementItem),
    }));
    if (projectId && estimateId) {
      replaceRow({
        projectId,
        estimateId,
        rowId: rowItemId,
        libraryItem: replacementLibraryItem,
        rollback: () => restoreEstimateState(previousTree, previousRows, rollbackRevision),
        onSuccess: () => refetchProjectComponentProjection(),
        onError: () => toast({ tone: "error", message: "Couldn't replace the component. Try again." }),
      });
    }
    return true;
  });

  const replaceRowItem = useStableCallback((rowItemId: string, libraryItem: EstimateRowItem) => {
    if (!canEditEstimate) {
      recordReadOnlyLibraryMutationAttempt("replace_row");
      return false;
    }
    if (!shouldGateLibraryCommit(libraryItem)) return commitReplaceRowItem(rowItemId, libraryItem);
    const existingRow = findEstimateRowItem(estimateTree, rowItemId);
    const editableReplacement = editableRows[rowItemId];
    const replacementLibraryItem = applyEditableValuesToLibraryItem(libraryItem, editableReplacement);
    const gate = getLibraryCommitTrustGate(replacementLibraryItem, {
      action: "replace",
      existingRow,
    });
    if (gate.severity === "pass") return commitReplaceRowItem(rowItemId, libraryItem);
    recordLibraryEvent(gate.severity === "block" ? "trust_insert_gate_blocked" : "trust_insert_gate_warned", {
      workspaceId,
      projectId,
      estimateId,
      itemId: libraryItem.id,
      rowId: rowItemId,
      action: libraryCommitEventAction("replace"),
      reason: gate.reasons.map((reason) => reason.id).join(","),
    });
    setPendingLibraryCommitGate({
      id: `${libraryItem.id}:replace:${rowItemId}:${Date.now()}`,
      action: "replace",
      rowItemId,
      libraryItem,
      existingRow,
      gate,
    });
    return true;
  });

  const cancelPendingLibraryCommit = useStableCallback(() => {
    if (pendingLibraryCommitGate) {
      recordLibraryEvent("trust_insert_gate_blocked", {
        workspaceId,
        projectId,
        estimateId,
        itemId: pendingLibraryCommitGate.libraryItem.id,
        rowId: pendingLibraryCommitGate.rowItemId,
        action: libraryCommitEventAction(pendingLibraryCommitGate.action),
        reason: "cancelled",
      });
    }
    setPendingLibraryCommitGate(null);
  });

  const confirmPendingLibraryCommit = useStableCallback(() => {
    if (!pendingLibraryCommitGate || pendingLibraryCommitGate.gate.severity === "block") return;
    if (!canEditEstimate) {
      recordReadOnlyLibraryMutationAttempt(libraryCommitEventAction(pendingLibraryCommitGate.action));
      setPendingLibraryCommitGate(null);
      return;
    }
    const { action, targetNodeId, rowItemId, libraryItem } = pendingLibraryCommitGate;
    setPendingLibraryCommitGate(null);
    recordLibraryEvent("trust_insert_gate_confirmed", {
      workspaceId,
      projectId,
      estimateId,
      itemId: libraryItem.id,
      rowId: rowItemId,
      action: libraryCommitEventAction(action),
      reason: pendingLibraryCommitGate.gate.reasons.map((reason) => reason.id).join(","),
    });
    if (action === "insert" && targetNodeId) {
      commitLibraryItemInsert(targetNodeId, libraryItem);
      return;
    }
    if (action === "replace" && rowItemId) {
      commitReplaceRowItem(rowItemId, libraryItem);
    }
  });

  const clearRowComponent = useStableCallback((rowItemId: string) => {
    const currentRowItem = findEstimateRowItem(estimateTree, rowItemId);
    if (!currentRowItem || !isExpressComponentRow(currentRowItem)) {
      replaceRowItem(rowItemId, createBlankEstimateRowTemplate());
      return;
    }

    const previousTree = estimateTree;
    const previousRows = editableRows;
    const editableReplacement = previousRows[rowItemId];
    const blankLibraryItem = applyEditableValuesToLibraryItem(createBlankEstimateRowTemplate(), editableReplacement);
    const replacementItem = replaceRowItemWithLibraryItem(rowItemId, blankLibraryItem);
    const rollbackRevision = setEstimateTree((current) =>
      current.map((node) => {
        function visit(areaNode: EstimateTreeNode): EstimateTreeNode {
          return {
            ...areaNode,
            estimateRowItems: areaNode.estimateRowItems?.map((item) =>
              item.id === rowItemId ? replacementItem : item,
            ),
            children: areaNode.children?.map(visit),
          };
        }
        return visit(node);
      }),
    );
    setEditableRows((current) => ({
      ...current,
      [rowItemId]: getInitialEditableRow(replacementItem),
    }));
    if (projectId && estimateId) {
      updateRow({
        projectId,
        estimateId,
        rowId: rowItemId,
        material: replacementItem.material,
        description: replacementItem.description,
        supplier: replacementItem.supplier,
        unit: replacementItem.unit,
        unitCost: replacementItem.itemCost,
        quantity: replacementItem.quantity,
        contingencyPercentage: replacementItem.contingencyPercentage ?? 0,
        miscCost: replacementItem.miscCost,
        sourceSnapshot: null,
        metadata: getClearedEstimateRowMetadata(currentRowItem.metadata),
        rollback: () => restoreEstimateState(previousTree, previousRows, rollbackRevision),
        onSuccess: () => refetchProjectComponentProjection(),
      });
    }
  });

  const requestProjectSpecific = useStableCallback((rowItemId: string) => {
    const rowItem = findEstimateRowItem(estimateTree, rowItemId);
    if (!rowItem || !canMakeProjectSpecific(rowItem)) return;
    setProjectSpecificRowId(rowItemId);
  });

  const promoteRowToLibrary = useStableCallback((rowItemId: string) => {
    if (!projectId || !estimateId) return;
    const rowItem = findEstimateRowItem(estimateTree, rowItemId);
    if (!rowItem || !canPromoteEstimateRowToLibrary(rowItem)) {
      toast({ tone: "error", message: "This row is not eligible to promote to the library." });
      return;
    }
    if (saveState === "dirty" || saveState === "saving") {
      toast({ tone: "error", message: "Finish saving row edits before promoting this component." });
      return;
    }

    const previousTree = estimateTree;
    const previousRows = editableRows;
    const rollbackRevision = getEstimateTreeRevision();
    setPromotingRowId(rowItemId);
    promoteRow({
      projectId,
      estimateId,
      rowId: rowItemId,
      rollback: () => restoreEstimateState(previousTree, previousRows, rollbackRevision),
      onSuccess: (result) => {
        setEstimateTree((current) =>
          current.map((node) => {
            function visit(areaNode: EstimateTreeNode): EstimateTreeNode {
              return {
                ...areaNode,
                estimateRowItems: areaNode.estimateRowItems?.map((item) => {
                  if (item.id !== rowItemId) return item;
                  const metadata = readEstimateRowMetadata(item.metadata);
                  delete metadata.expressComponent;
                  delete metadata.projectComponentProjection;
                  return {
                    ...item,
                    source: "library",
                    sourceLibraryItemId: result.itemId,
                    metadata,
                    linkState: "linked-clean",
                  };
                }),
                children: areaNode.children?.map(visit),
              };
            }
            return visit(node);
          }),
        );
        setPromotingRowId(null);
        refetchProjectComponentProjection();
        handleLibraryDataChanged();
        toast({ tone: "success", message: `${rowItem.material || "Component"} promoted to the workspace library.` });
      },
      onError: (error) => {
        setPromotingRowId(null);
        toast({ tone: "error", message: error.message || "Could not promote component." });
      },
    });
  });

  const confirmProjectSpecific = useStableCallback(() => {
    if (!projectId || !estimateId || !projectSpecificRowItem) {
      setProjectSpecificRowId("");
      return;
    }

    const rowItemId = projectSpecificRowItem.id;
    const previousTree = estimateTree;
    const previousRows = editableRows;
    const rollbackRevision = getEstimateTreeRevision();
    detachRow({
      projectId,
      estimateId,
      rowId: rowItemId,
      rollback: () => restoreEstimateState(previousTree, previousRows, rollbackRevision),
      onSuccess: () => refetchProjectComponentProjection(),
    });
    setProjectSpecificRowId("");
  });

  const moveRowComponent = useStableCallback((sourceRowItemId: string, targetRowItemId: string, movedItem: EstimateRowItem) => {
    if (sourceRowItemId === targetRowItemId) return;
    if (!canEditEstimate) {
      recordReadOnlyLibraryMutationAttempt("move_row");
      return;
    }
    if (isExpressComponentRow(movedItem)) {
      toast({ tone: "error", message: "Replace express components directly before moving them between rows." });
      return;
    }
    const sourceLocation = findEstimateRowItemLocation(estimateTree, sourceRowItemId);
    const targetLocation = findEstimateRowItemLocation(estimateTree, targetRowItemId);
    if (!sourceLocation || !targetLocation) return;

    const previousTree = estimateTree;
    const previousRows = editableRows;
    const rollbackRevision = getEstimateTreeRevision();
    const previousSourceEditableRow = editableRows[sourceRowItemId] ?? getInitialEditableRow(sourceLocation.item);
    const previousTargetEditableRow = editableRows[targetRowItemId] ?? getInitialEditableRow(targetLocation.item);
    const targetLibraryItem = applyEditableValuesToLibraryItem(movedItem, previousTargetEditableRow);
    const sourceBlankLibraryItem = applyEditableValuesToLibraryItem(createBlankEstimateRowTemplate(), previousSourceEditableRow);
    const targetReplacementItem = replaceRowItemWithLibraryItem(targetRowItemId, targetLibraryItem);
    const sourceReplacementItem = replaceRowItemWithLibraryItem(sourceRowItemId, sourceBlankLibraryItem);
    const replacements = new Map<string, EstimateRowItem>([
      [targetRowItemId, targetReplacementItem],
      [sourceRowItemId, sourceReplacementItem],
    ]);
    const nextRevision = setEstimateTree((current) => replaceEstimateRowItemsInTree(current, replacements));
    setEditableRows((current) => ({
      ...current,
      [targetRowItemId]: current[targetRowItemId] ?? previousTargetEditableRow,
      [sourceRowItemId]: getInitialEditableRow(sourceReplacementItem),
    }));

    if (projectId && estimateId) {
      moveRows({
        projectId,
        estimateId,
        sourceRowId: sourceRowItemId,
        targetRowId: targetRowItemId,
        sourceLibraryItem: sourceBlankLibraryItem,
        targetLibraryItem,
        rollback: () => restoreEstimateState(previousTree, previousRows, nextRevision ?? rollbackRevision),
        onSuccess: (result) => {
          const sourcePatch = estimateRowMutationResultToPatch(result.sourceRow);
          const targetPatch = estimateRowMutationResultToPatch(result.targetRow);
          const nextSourceItem = applyEstimateRowItemPatch(sourceReplacementItem, sourcePatch);
          const nextTargetItem = applyEstimateRowItemPatch(targetReplacementItem, targetPatch);
          setEstimateTree((current) =>
            patchEstimateRowItemInTree(
              patchEstimateRowItemInTree(current, result.sourceRow.rowId, sourcePatch),
              result.targetRow.rowId,
              targetPatch,
            ),
          );
          setEditableRows((current) => ({
            ...current,
            [result.sourceRow.rowId]: getInitialEditableRow(nextSourceItem),
            [result.targetRow.rowId]: getInitialEditableRow(nextTargetItem),
          }));
          refetchProjectComponentProjection();
        },
        onError: () => toast({ tone: "error", message: "Couldn't move the component. Try again." }),
      });
    }
  });

  const replaceFromComponentPicker = useStableCallback((libraryItem: EstimateRowItem) => {
    if (!rowComponentPicker || rowComponentPicker.mode !== "replace") return;
    const accepted = replaceRowItem(rowComponentPicker.rowItemId, libraryItem);
    if (accepted !== false) closeRowComponentPicker();
  });

  const moveFromComponentPicker = useStableCallback((targetRowItemId: string) => {
    if (!rowComponentPicker || rowComponentPicker.mode !== "move") return;
    const sourceItem = findEstimateRowItem(estimateTree, rowComponentPicker.rowItemId);
    if (!sourceItem || isExpressComponentRow(sourceItem)) return;
    moveRowComponent(rowComponentPicker.rowItemId, targetRowItemId, sourceItem);
    closeRowComponentPicker();
  });

  const deleteRowItem = useStableCallback((rowItemId: string) => {
    const previousRowLocation = findEstimateRowItemLocation(estimateTree, rowItemId);
    const previousEditableRow = editableRows[rowItemId];
    setEstimateTree((current) => removeEstimateRowItem(current, rowItemId));
    setEditableRows((current) => {
      const remainingRows = { ...current };
      delete remainingRows[rowItemId];
      return remainingRows;
    });
    if (projectId && estimateId) {
      deleteRow({
        projectId,
        estimateId,
        rowId: rowItemId,
        rollback: () => {
          if (previousRowLocation) {
            setEstimateTree((current) => restoreEstimateRowItemAtLocation(current, previousRowLocation));
            setEditableRows((current) => ({ ...current, [rowItemId]: previousEditableRow ?? getInitialEditableRow(previousRowLocation.item) }));
          }
        },
        onSuccess: (result) => {
          refetchProjectComponentProjection();
          if (!previousRowLocation) return;
          toast({
            id: `estimate-row-delete-${rowItemId}`,
            tone: "neutral",
            message: "Row deleted.",
            durationMs: 8000,
            action: {
              label: "Undo",
              onClick: () => {
                restoreDeletedRows({
                  projectId,
                  estimateId,
                  sourceEventId: result.eventId,
                  rowIds: [rowItemId],
                  onSuccess: (restoreResult) => {
                    const restoredRow = restoreResult.restoredRows.find((row) => row.rowId === rowItemId);
                    const restoredItem = restoredRow
                      ? applyEstimateRowItemPatch(previousRowLocation.item, estimateRowMutationResultToPatch(restoredRow))
                      : previousRowLocation.item;
                    setEstimateTree((current) => restoreEstimateRowItemAtLocation(current, previousRowLocation, restoredItem));
                    setEditableRows((current) => ({
                      ...current,
                      [rowItemId]: previousEditableRow ?? getInitialEditableRow(restoredItem),
                    }));
                    refetchProjectComponentProjection();
                    toast({ tone: "success", message: "Row restored." });
                  },
                  onError: () => toast({ tone: "error", message: "Couldn't restore the row. Try again." }),
                });
              },
            },
          });
        },
        onError: () => toast({ tone: "error", message: "Couldn't delete the row. Try again." }),
      });
    }
  });

  const deleteSelectedRows = useStableCallback(() => {
    const selectedRowIds = Array.from(bulkSelectedRowIds);
    if (selectedRowIds.length === 0) return;

    const previousTree = estimateTree;
    const previousRows = editableRows;
    const previousLocations = selectedRowIds
      .map((rowId) => findEstimateRowItemLocation(estimateTree, rowId))
      .filter((location): location is EstimateRowItemLocation => Boolean(location));
    const expectedRowRevisions = Object.fromEntries(
      previousLocations
        .map((location) => [location.item.id, location.item.rowRevision] as const)
        .filter((entry): entry is readonly [string, number] => typeof entry[1] === "number"),
    );
    const rollbackRevision = setEstimateTree((current) =>
      selectedRowIds.reduce((nextTree, rowId) => removeEstimateRowItem(nextTree, rowId), current),
    );
    setEditableRows((current) => {
      const nextRows = { ...current };
      for (const rowId of selectedRowIds) delete nextRows[rowId];
      return nextRows;
    });

    if (!projectId || !estimateId) {
      setBulkSelectedRowIds(new Set());
      return;
    }

    deleteRows({
      projectId,
      estimateId,
      rowIds: selectedRowIds,
      expectedRowRevisions,
      rollback: () => restoreEstimateState(previousTree, previousRows, rollbackRevision),
      onSuccess: (result) => {
        setBulkSelectedRowIds(new Set());
        refetchProjectComponentProjection();
        if (previousLocations.length === 0) return;
        toast({
          id: "estimate-rows-delete",
          tone: "neutral",
          message: `${result.deletedRowCount} ${result.deletedRowCount === 1 ? "row" : "rows"} deleted.`,
          durationMs: 8000,
          action: {
            label: "Undo",
            onClick: () => {
              restoreDeletedRows({
                projectId,
                estimateId,
                sourceEventId: result.eventId,
                rowIds: result.deletedRowIds,
                onSuccess: (restoreResult) => {
                  const restoredRowsById = new Map(restoreResult.restoredRows.map((row) => [row.rowId, row]));
                  const restoredLocations = previousLocations.map((location) => {
                    const restoredRow = restoredRowsById.get(location.item.id);
                    return {
                      location,
                      item: restoredRow
                        ? applyEstimateRowItemPatch(location.item, estimateRowMutationResultToPatch(restoredRow))
                        : location.item,
                    };
                  });
                  setEstimateTree((current) =>
                    restoredLocations.reduce(
                      (nextTree, { location, item }) => restoreEstimateRowItemAtLocation(nextTree, location, item),
                      current,
                    ),
                  );
                  setEditableRows((current) => {
                    const nextRows = { ...current };
                    for (const { item } of restoredLocations) nextRows[item.id] = previousRows[item.id] ?? getInitialEditableRow(item);
                    return nextRows;
                  });
                  refetchProjectComponentProjection();
                  toast({ tone: "success", message: `${restoreResult.restoredRowCount} ${restoreResult.restoredRowCount === 1 ? "row" : "rows"} restored.` });
                },
                onError: () => toast({ tone: "error", message: "Couldn't restore the selected rows. Try again." }),
              });
            },
          },
        });
      },
      onError: () => toast({ tone: "error", message: "Couldn't delete the selected rows. Try again." }),
    });
  });

  return {
    cancelPendingLibraryCommit,
    clearRowComponent,
    confirmPendingLibraryCommit,
    confirmProjectSpecific,
    deleteExpressDraft,
    deleteRowItem,
    deleteSelectedRows,
    insertBlankRow,
    insertIntoSelectedNode,
    insertLibraryItem,
    markRowDirty,
    moveFromComponentPicker,
    moveRowComponent,
    promoteRowToLibrary,
    replaceFromComponentPicker,
    replaceRowItem,
    requestProjectSpecific,
    retryExpressDraft,
    updateRowItem,
  };
}
