"use client";

import { useEffect, useRef, type Dispatch, type MutableRefObject, type SetStateAction } from "react";
import { flushSync } from "react-dom";

import type { useEstimateRowMutations, EstimateRowMutationStatus, EstimateRowMutationStatusMap, EstimateSaveState } from "@/hooks/use-estimate-row-mutations";
import { useStableCallback } from "@/hooks/use-stable-callback";
import { applyEstimateRowItemMoveResultToTree, moveEstimateRowItemInTree } from "@/lib/estimates/estimate-row-tree-move";
import { applyEstimateRowItemPatch, estimateRowMutationResultToPatch, patchComponentInstanceRowsInTree, patchEstimateRowItemInTree } from "@/lib/estimates/estimate-row-tree-patch";
import {
  isExpressComponentRow,
  readEstimateRowMetadata,
  readProjectComponentProjectionMetadata,
  withExpressComponentMetadata,
  withProjectComponentProjectionMetadata,
} from "@/lib/estimates/express-components";
import { recordExpressComponentEvent } from "@/lib/estimates/express-components-telemetry";
import {
  omitEstimateRowPriceOptionAttachments,
  sanitizeEstimateRowPriceOptionsSnapshot,
} from "@/lib/estimates/source-snapshot-price-options";
import type { Json } from "@/lib/types/json";

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
  collectEditableRows,
  getEditableRowAmounts,
  getInitialEditableRow,
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

type CommitRowItemUpdateOptions = {
  componentMutationIntent?: "variant-selection";
  expectedComponentImpactFingerprint?: string;
  removedPriceOptionReplacements?: Record<string, string>;
  makeProjectSpecific?: boolean;
  onPersisted?: () => void;
  onPersistenceError?: (error: Error) => void;
};

function readJsonObject(value: unknown): Record<string, Json | undefined> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? { ...(value as Record<string, Json | undefined>) }
    : {};
}

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
  canMoveRowItems?: boolean;
  projectId?: string;
  estimateId?: string;
  activeTabId?: string | null;
  estimateTree: EstimateTreeNode[];
  editableRows: Record<string, EditableRowValue>;
  getEditableRows?: () => Record<string, EditableRowValue>;
  saveState: EstimateSaveState;
  rowMutationStatuses: EstimateRowMutationStatusMap;
  insertTargetNodeId: string;
  expressInsertDrafts: Record<string, ExpressInsertDraft>;
  bulkSelectedRowIds: Set<string>;
  rowComponentPicker: RowComponentPickerState | null;
  projectSpecificRowItem: EstimateRowItem | null;
  markRowDirtyNow: EstimateRowMutations["markRowDirty"];
  markRowCleanNow: EstimateRowMutations["markRowClean"];
  insertRow: EstimateRowMutations["insertRow"];
  replaceRow: EstimateRowMutations["replaceRow"];
  moveRows: EstimateRowMutations["moveRows"];
  moveRowItem: EstimateRowMutations["moveRowItem"];
  hasPendingRowMutation: EstimateRowMutations["hasPendingRowMutation"];
  promoteRow: EstimateRowMutations["promoteRow"];
  deleteRow: EstimateRowMutations["deleteRow"];
  deleteRows: EstimateRowMutations["deleteRows"];
  restoreDeletedRows: EstimateRowMutations["restoreDeletedRows"];
  updateRow: EstimateRowMutations["updateRow"];
  setEstimateTree: EstimateTreeUpdater;
  setEditableRows: Dispatch<SetStateAction<Record<string, EditableRowValue>>>;
  setExpressInsertDrafts: Dispatch<SetStateAction<Record<string, ExpressInsertDraft>>>;
  setBulkSelectedRowIds: Dispatch<SetStateAction<Set<string>>>;
  setProjectSpecificRowId: Dispatch<SetStateAction<string>>;
  setPromotingRowId: Dispatch<SetStateAction<string | null>>;
  skipEditableRowsSyncRef: MutableRefObject<number>;
  getEstimateTreeRevision: () => number;
  restoreEstimateState: RestoreEstimateState;
  closeRowComponentPicker: () => void;
  handleLibraryDataChanged: () => void;
  recordReadOnlyLibraryMutationAttempt: (action: string) => void;
  toast: Toast;
};

const EDITABLE_ROW_FIELDS: Array<keyof EditableRowValue> = [
  "quantity",
  "quantityExpression",
  "quantityBase",
  "quantityContingencyAmount",
  "contingencyMode",
  "contingencyPercentage",
  "adjustmentPercentage",
  "miscCost",
  "name",
  "description",
  "brand",
  "supplier",
  "unit",
  "unitCost",
  "imageUrl",
  "sourceUrl",
];

function editableRowsEqual(a: EditableRowValue, b: EditableRowValue) {
  return EDITABLE_ROW_FIELDS.every((field) => a[field] === b[field]);
}

function isOfflineRowMutationFailure(status: EstimateRowMutationStatus | undefined) {
  return status?.phase === "failed" && /offline/i.test(status.message ?? status.label);
}

function nullableTrimmedText(value: string | null | undefined) {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed || null;
}

function shouldPreserveLocalEditableRow(input: {
  rowId: string;
  currentRow: EditableRowValue;
  baselineRow?: EditableRowValue;
  syncedRow: EditableRowValue | undefined;
  status: EstimateRowMutationStatus | undefined;
  activeExpressRowId: string;
}) {
  if (!input.syncedRow || editableRowsEqual(input.currentRow, input.syncedRow)) return false;
  if (input.activeExpressRowId === input.rowId) return true;
  if (input.status?.phase === "pending") return true;
  if (isOfflineRowMutationFailure(input.status)) return true;
  return Boolean(input.baselineRow && !editableRowsEqual(input.currentRow, input.baselineRow));
}

function mergeSyncedEditableRows(
  currentRows: Record<string, EditableRowValue>,
  nextRows: Record<string, EditableRowValue>,
  rowMutationStatuses: EstimateRowMutationStatusMap,
  activeExpressRowId: string,
  baselineRows?: Record<string, EditableRowValue>,
) {
  let mergedRows = nextRows;
  for (const [rowId, currentRow] of Object.entries(currentRows)) {
    const syncedRow = nextRows[rowId];
    const status = rowMutationStatuses[rowId];
    if (!shouldPreserveLocalEditableRow({
      rowId,
      currentRow,
      baselineRow: baselineRows?.[rowId],
      syncedRow,
      status,
      activeExpressRowId,
    })) continue;
    if (mergedRows === nextRows) mergedRows = { ...nextRows };
    mergedRows[rowId] = currentRow;
  }
  return mergedRows;
}

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

function createBlankEstimateRowTemplate(): EstimateRowItem {
  return {
    id: "manual-estimate-row-template",
    material: BLANK_ESTIMATE_ROW_COMPONENT_LABEL,
    description: "",
    brand: "",
    supplier: "",
    source: "project",
    unit: "unit",
    itemCost: 0,
    quantity: 1,
    subTotal: 0,
    contingencyPercentage: 0,
    contingencyValue: 0,
    adjustmentPercentage: 0,
    adjustmentValue: 0,
    miscCost: 0,
    totalItemCosts: 0,
    category: "Unassigned",
    tags: [BLANK_ESTIMATE_ROW_TAG],
    pricingSource: "Manual estimate row",
    pricingDate: new Date().toISOString().slice(0, 10),
  };
}

function createExpressEstimateRowTemplate(): EstimateRowItem {
  const createdAt = new Date().toISOString();
  return {
    id: "express-estimate-row-template",
    material: "",
    description: "",
    brand: "",
    supplier: "",
    source: "project",
    unit: "",
    itemCost: 0,
    quantity: 1,
    subTotal: 0,
    contingencyPercentage: 0,
    contingencyValue: 0,
    adjustmentPercentage: 0,
    adjustmentValue: 0,
    miscCost: 0,
    totalItemCosts: 0,
    category: "Unassigned",
    pricingSource: "Express component",
    pricingDate: createdAt.slice(0, 10),
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

  const amounts = getEditableRowAmounts(libraryItem, editableRow);

  return {
    ...libraryItem,
    quantity: amounts.quantity,
    quantityBase: amounts.quantityBase,
    quantityContingencyAmount: amounts.quantityContingencyAmount,
    subTotal: amounts.subTotal,
    contingencyPercentage: amounts.contingencyPercentage,
    contingencyValue: amounts.contingencyValue,
    adjustmentPercentage: amounts.adjustmentPercentage,
    adjustmentValue: amounts.adjustmentValue,
    miscCost: amounts.miscCost,
    totalItemCosts: amounts.totalItemCosts,
  };
}

function readDuplicateEstimateRowSourceId(libraryItem: EstimateRowItem) {
  const sourceRowId = (libraryItem as EstimateRowItem & { duplicateSourceRowId?: unknown }).duplicateSourceRowId;
  return typeof sourceRowId === "string" && sourceRowId.trim() ? sourceRowId.trim() : null;
}

function isAmbiguousDuplicateRowFailure(error: Error) {
  return /offline|network|fetch|timeout|timed out|connection|unknown/i.test(error.message);
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
  const normalizedLibraryItem = { ...libraryItem, quantity: libraryItem.quantity || 1 };
  const amounts = getEditableRowAmounts(normalizedLibraryItem, getInitialEditableRow(normalizedLibraryItem));
  return {
    ...normalizedLibraryItem,
    id: rowItemId,
    quantity: amounts.quantity,
    quantityBase: amounts.quantityBase,
    quantityContingencyAmount: amounts.quantityContingencyAmount,
    subTotal: amounts.subTotal,
    contingencyPercentage: amounts.contingencyPercentage,
    contingencyValue: amounts.contingencyValue,
    adjustmentPercentage: amounts.adjustmentPercentage,
    adjustmentValue: amounts.adjustmentValue,
    miscCost: amounts.miscCost,
    totalItemCosts: amounts.totalItemCosts,
  };
}

function resolveSetStateAction<T>(current: T, value: SetStateAction<T>): T {
  return typeof value === "function" ? (value as (current: T) => T)(current) : value;
}

export function useEstimateRowHandlers({
  canEditEstimate,
  canMoveRowItems = true,
  projectId,
  estimateId,
  activeTabId,
  estimateTree,
  editableRows,
  getEditableRows = () => editableRows,
  saveState,
  rowMutationStatuses,
  insertTargetNodeId,
  expressInsertDrafts,
  bulkSelectedRowIds,
  rowComponentPicker,
  projectSpecificRowItem,
  markRowDirtyNow,
  markRowCleanNow,
  insertRow,
  replaceRow,
  moveRows,
  moveRowItem: persistMoveRowItem,
  hasPendingRowMutation,
  promoteRow,
  deleteRow,
  deleteRows,
  restoreDeletedRows,
  updateRow,
  setEstimateTree,
  setEditableRows,
  setExpressInsertDrafts: setExpressInsertDraftsState,
  setBulkSelectedRowIds,
  setProjectSpecificRowId,
  setPromotingRowId,
  skipEditableRowsSyncRef,
  getEstimateTreeRevision,
  restoreEstimateState,
  closeRowComponentPicker,
  handleLibraryDataChanged,
  recordReadOnlyLibraryMutationAttempt,
  toast,
}: UseEstimateRowHandlersInput) {
  const expressInsertDraftsRef = useRef<Record<string, ExpressInsertDraft>>(expressInsertDrafts);
  const saveStateRef = useRef(saveState);
  const pendingFocusRowIdRef = useRef("");
  const pendingFocusTargetRef = useRef<"name" | "quantity">("name");
  const pendingFocusFrameIdRef = useRef(0);
  const duplicateRowIntentRef = useRef(new Map<string, {
    rowId: string;
    mutationId: string;
    status: "pending" | "failed";
  }>());

  useEffect(() => {
    saveStateRef.current = saveState;
  }, [saveState]);

  useEffect(() => {
    expressInsertDraftsRef.current = expressInsertDrafts;
  }, [expressInsertDrafts]);

  const setExpressInsertDrafts = useStableCallback((value: SetStateAction<Record<string, ExpressInsertDraft>>) => {
    const next = resolveSetStateAction(expressInsertDraftsRef.current, value);
    expressInsertDraftsRef.current = next;
    setExpressInsertDraftsState(next);
  });

  const markRowDirty = useStableCallback(() => {
    saveStateRef.current = "dirty";
    markRowDirtyNow();
  });
  const reconcileRowDirty = useStableCallback(() => {
    queueMicrotask(() => {
      if (saveStateRef.current === "saving") return;
      if (Object.keys(expressInsertDraftsRef.current).length > 0) return;
      const baselineRows = collectEditableRows(estimateTree);
      const currentRows = getEditableRows();
      const currentRowIds = Object.keys(currentRows);
      const isClean = currentRowIds.length === Object.keys(baselineRows).length
        && currentRowIds.every((rowId) => baselineRows[rowId] && editableRowsEqual(currentRows[rowId], baselineRows[rowId]));
      if (!isClean) return;
      saveStateRef.current = "idle";
      markRowCleanNow();
    });
  });

  useEffect(() => {
    if (saveState === "dirty" || saveState === "saving") return;
    if (skipEditableRowsSyncRef.current > 0) {
      skipEditableRowsSyncRef.current -= 1;
      return;
    }
    queueMicrotask(() => {
      if (saveStateRef.current === "dirty" || saveStateRef.current === "saving") return;
      const nextRows = collectEditableRows(estimateTree);
      const activeExpressRowId = getActiveExpressEditorRowId();
      setEditableRows((currentRows) => {
        return mergeSyncedEditableRows(currentRows, nextRows, rowMutationStatuses, activeExpressRowId);
      });
    });
  }, [estimateTree, rowMutationStatuses, saveState, setEditableRows, skipEditableRowsSyncRef]);

  const requestPendingRowFocus = useStableCallback((rowId: string, target: "name" | "quantity" = "name") => {
    pendingFocusRowIdRef.current = rowId;
    pendingFocusTargetRef.current = target;
    if (pendingFocusFrameIdRef.current) window.cancelAnimationFrame(pendingFocusFrameIdRef.current);
    let attempts = 0;

    function tryFocus() {
      const pendingFocusRowId = pendingFocusRowIdRef.current;
      if (!pendingFocusRowId) {
        pendingFocusFrameIdRef.current = 0;
        return;
      }
      const quantityInput = document.querySelector<HTMLInputElement>(
        `[data-estimate-row-id="${pendingFocusRowId}"][data-estimate-cell-index="0"]`,
      );
      const focusTarget = pendingFocusTargetRef.current === "quantity"
        ? quantityInput
        : document.querySelector<HTMLInputElement>(`[data-estimate-row-id="${pendingFocusRowId}"] [data-express-field="name"]`) ?? quantityInput;
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

  const commitRowItemUpdate = useStableCallback((
    rowItemId: string,
    values: Partial<EditableRowValue>,
    options: CommitRowItemUpdateOptions = {},
  ) => {
    if (!projectId || !estimateId) return;
    const previousTree = estimateTree;
    const previousRows = collectEditableRows(estimateTree);
    const rollbackRevision = getEstimateTreeRevision();
    const currentRowLocation = findEstimateRowItemLocation(estimateTree, rowItemId);
    const currentRowItem = currentRowLocation?.item ?? null;
    const currentEditableRow = getEditableRows()[rowItemId] ?? previousRows[rowItemId];
    const nextEditableRow: EditableRowValue = {
      name: values.name ?? currentEditableRow?.name ?? "",
      description: values.description ?? currentEditableRow?.description ?? "",
      brand: values.brand ?? currentEditableRow?.brand ?? "",
      supplier: values.supplier ?? currentEditableRow?.supplier ?? "",
      unit: values.unit ?? currentEditableRow?.unit ?? "unit",
      unitCost: values.unitCost ?? currentEditableRow?.unitCost ?? "0",
      priceOptionLabel: values.priceOptionLabel ?? currentEditableRow?.priceOptionLabel ?? null,
      imageUrl: values.imageUrl ?? currentEditableRow?.imageUrl ?? "",
      sourceUrl: values.sourceUrl ?? currentEditableRow?.sourceUrl ?? "",
      quantity: values.quantity ?? currentEditableRow?.quantity ?? "0",
      quantityExpression: values.quantityExpression ?? currentEditableRow?.quantityExpression ?? "",
      quantityBase: values.quantityBase ?? currentEditableRow?.quantityBase ?? "",
      quantityContingencyAmount: values.quantityContingencyAmount ?? currentEditableRow?.quantityContingencyAmount ?? "",
      contingencyMode: values.contingencyMode ?? currentEditableRow?.contingencyMode ?? "contingency",
      contingencyPercentage: values.contingencyPercentage ?? currentEditableRow?.contingencyPercentage ?? "0",
      adjustmentPercentage: values.adjustmentPercentage ?? currentEditableRow?.adjustmentPercentage ?? "0",
      miscCost: values.miscCost ?? currentEditableRow?.miscCost ?? "0",
    };
    const expressFieldNames = ["name", "description", "brand", "supplier", "unit", "unitCost", "priceOptionLabel", "imageUrl", "sourceUrl"].filter((fieldName) => values[fieldName as keyof EditableRowValue] !== undefined);
    if (expressFieldNames.length > 0) {
      recordExpressComponentEvent("save_requested", { projectId, estimateId, rowId: rowItemId, fieldNames: expressFieldNames });
    }
    const projectSpecificPriceOptionCopy = options.makeProjectSpecific
      ? omitEstimateRowPriceOptionAttachments(values.priceOptions ?? currentRowItem?.priceOptions)
      : { priceOptions: values.priceOptions, omittedAttachmentCount: 0 };
    const priceOptionsForPersistence = projectSpecificPriceOptionCopy.priceOptions;
    const priceOptionsSnapshot = priceOptionsForPersistence !== undefined
      ? sanitizeEstimateRowPriceOptionsSnapshot(priceOptionsForPersistence)
      : undefined;
    let sourceSnapshotPatch: Record<string, Json | undefined> | undefined = values.name !== undefined
      || values.description !== undefined
      || values.supplier !== undefined
      || values.unit !== undefined
      || values.unitCost !== undefined
      || values.brand !== undefined
      || values.imageUrl !== undefined
      || values.sourceUrl !== undefined
      || values.imageAsset !== undefined
      || values.category !== undefined
      || values.categoryNodeId !== undefined
      || values.brandId !== undefined
      || values.supplierId !== undefined
      || values.sku !== undefined
      || values.priceOptionId !== undefined
      || values.priceOptionLabel !== undefined
      || priceOptionsForPersistence !== undefined
      || values.pricingDate !== undefined
      || values.pricingSource !== undefined
      || values.lifecycleState !== undefined
      || values.lifecycleStateChangedAt !== undefined
      || values.notes !== undefined
      ? {
          ...(values.name !== undefined ? { material: nullableTrimmedText(values.name) } : {}),
          ...(values.description !== undefined ? { description: nullableTrimmedText(values.description) } : {}),
          ...(values.supplier !== undefined ? { supplier: nullableTrimmedText(values.supplier) } : {}),
          ...(values.unit !== undefined ? { unit: nullableTrimmedText(values.unit) } : {}),
          ...(values.unitCost !== undefined ? { unit_cost: parseNonNegativeEditableNumber(values.unitCost) } : {}),
          ...(values.brand !== undefined ? { brand: nullableTrimmedText(values.brand) } : {}),
          ...(values.imageUrl !== undefined ? { imageUrl: nullableTrimmedText(values.imageUrl) } : {}),
          ...(values.imageAsset !== undefined ? { imageAsset: values.imageAsset ?? null } : {}),
          ...(values.sourceUrl !== undefined ? { sourceUrl: nullableTrimmedText(values.sourceUrl) } : {}),
          ...(values.category !== undefined ? { category: nullableTrimmedText(values.category) } : {}),
          ...(values.categoryNodeId !== undefined ? { categoryNodeId: values.categoryNodeId ?? null } : {}),
          ...(values.brandId !== undefined ? { brandId: values.brandId ?? null } : {}),
          ...(values.supplierId !== undefined ? { supplierId: values.supplierId ?? null } : {}),
          ...(values.sku !== undefined ? { sku: nullableTrimmedText(values.sku) } : {}),
          ...(values.priceOptionId !== undefined ? { priceOptionId: nullableTrimmedText(values.priceOptionId) } : {}),
          ...(values.priceOptionLabel !== undefined ? { priceOptionLabel: nullableTrimmedText(values.priceOptionLabel) } : {}),
          ...(priceOptionsForPersistence !== undefined ? { priceOptions: priceOptionsSnapshot ?? [] } : {}),
          ...(values.pricingDate !== undefined ? { pricingDate: nullableTrimmedText(values.pricingDate) } : {}),
          ...(values.pricingSource !== undefined ? { pricingSource: nullableTrimmedText(values.pricingSource) } : {}),
          ...(values.lifecycleState !== undefined ? { lifecycleState: values.lifecycleState ?? null } : {}),
          ...(values.lifecycleStateChangedAt !== undefined ? { sourceUpdatedAt: values.lifecycleStateChangedAt ?? null } : {}),
          ...(values.notes !== undefined ? { notes: values.notes ?? null } : {}),
        }
      : undefined;
    const shouldPatchMetadata = Boolean(currentRowItem && (
      values.categoryNodeId !== undefined
      || values.brandId !== undefined
      || values.supplierId !== undefined
      || values.priceOptionId !== undefined
      || values.lifecycleState !== undefined
      || values.lifecycleStateChangedAt !== undefined
    ));
    let metadataPatch: Record<string, Json | undefined> | undefined = shouldPatchMetadata && currentRowItem
      ? ({
          ...readEstimateRowMetadata(currentRowItem.metadata),
          ...(values.categoryNodeId !== undefined ? { categoryNodeId: values.categoryNodeId ?? null } : {}),
          ...(values.brandId !== undefined ? { brandId: values.brandId ?? null } : {}),
          ...(values.supplierId !== undefined ? { supplierId: values.supplierId ?? null } : {}),
          ...(values.priceOptionId !== undefined ? { priceOptionId: values.priceOptionId ?? null } : {}),
          ...(values.lifecycleState !== undefined ? { lifecycleState: values.lifecycleState ?? null } : {}),
          ...(values.lifecycleStateChangedAt !== undefined ? { lifecycleStateChangedAt: values.lifecycleStateChangedAt ?? null } : {}),
        } satisfies Record<string, Json | undefined>)
      : undefined;
    if (options.makeProjectSpecific && currentRowItem) {
      const projectComponentId = createEstimateRowItemId();
      const currentSourceSnapshot = readJsonObject(
        (currentRowItem as EstimateRowItem & { sourceSnapshot?: Json | null }).sourceSnapshot,
      );
      sourceSnapshotPatch = {
        ...currentSourceSnapshot,
        ...sourceSnapshotPatch,
        sourceComponentId: projectComponentId,
        sourceEstimateRowId: rowItemId,
        sourceLibraryItemId: null,
        sourceProjectId: projectId,
        sourceType: "project_component",
      };
      metadataPatch = withProjectComponentProjectionMetadata({
        ...readEstimateRowMetadata(currentRowItem.metadata),
        sourceComponentId: projectComponentId,
      }, {
        ...(readProjectComponentProjectionMetadata(currentRowItem.metadata) ?? {}),
        componentId: projectComponentId,
        projectId,
        estimateId,
        nodeId: currentRowLocation?.nodeId ?? null,
        sourceRowId: rowItemId,
        instanceRowIds: [rowItemId],
        instanceCount: 1,
        classification: "detached-library",
      });
    }
    const shouldPromoteLegacyBlankToExpress = Boolean(currentRowItem && isBlankEstimateRowItem(currentRowItem));
    const nextAmounts = currentRowItem ? getEditableRowAmounts(currentRowItem, nextEditableRow) : null;
    const shouldPatchQuantity = values.quantity !== undefined
      || values.quantityExpression !== undefined
      || values.quantityBase !== undefined
      || values.quantityContingencyAmount !== undefined;
    const shouldPatchContingency = values.contingencyPercentage !== undefined || values.contingencyMode !== undefined || shouldPatchQuantity;
    const shouldPatchAdjustment = values.adjustmentPercentage !== undefined;

    updateRow({
      projectId,
      estimateId,
      rowId: rowItemId,
      ...(values.name !== undefined ? { material: values.name } : {}),
      ...(values.description !== undefined ? { description: values.description } : {}),
      ...(values.supplier !== undefined ? { supplier: values.supplier } : {}),
      ...(values.unit !== undefined ? { unit: values.unit } : {}),
      ...(values.unitCost !== undefined ? { unitCost: parseNonNegativeEditableNumber(values.unitCost) } : {}),
      ...(values.priceOptionLabel !== undefined ? { priceOptionLabel: values.priceOptionLabel ?? "" } : {}),
      ...(values.categoryNodeId !== undefined ? { categoryNodeId: values.categoryNodeId } : {}),
      ...(values.supplierId !== undefined ? { supplierId: values.supplierId } : {}),
      ...(sourceSnapshotPatch !== undefined ? { sourceSnapshot: sourceSnapshotPatch } : {}),
      ...(metadataPatch !== undefined ? { metadata: metadataPatch } : {}),
      ...(shouldPatchQuantity && nextAmounts ? {
        quantity: nextAmounts.quantity,
        quantityBase: nextAmounts.quantityBase,
        quantityContingencyAmount: nextAmounts.quantityContingencyAmount,
      } : {}),
      ...(shouldPatchContingency && nextAmounts ? { contingencyPercentage: nextAmounts.contingencyPercentage } : {}),
      ...(shouldPatchAdjustment && nextAmounts ? { adjustmentPercentage: nextAmounts.adjustmentPercentage } : {}),
      ...(values.miscCost !== undefined ? { miscCost: parseNonNegativeEditableNumber(values.miscCost) } : {}),
      ...(options.makeProjectSpecific ? { sourceLibraryItemId: null, linkState: "unlinked" as const } : {}),
      ...(options.componentMutationIntent !== undefined
        ? { componentMutationIntent: options.componentMutationIntent }
        : {}),
      ...(options.expectedComponentImpactFingerprint !== undefined
        ? { expectedComponentImpactFingerprint: options.expectedComponentImpactFingerprint }
        : {}),
      ...(options.removedPriceOptionReplacements !== undefined
        ? { removedPriceOptionReplacements: options.removedPriceOptionReplacements }
        : {}),
      ...(shouldPromoteLegacyBlankToExpress ? {
        metadata: withExpressComponentMetadata(currentRowItem?.metadata, {
          id: rowItemId,
          createdFrom: "legacy-blank-row-inline-edit",
          sourceLabel: "Express component",
          createdAt: new Date().toISOString(),
        }),
      } : {}),
      onSuccess: (result) => {
        const serverPatch = estimateRowMutationResultToPatch(result);
        if (priceOptionsForPersistence !== undefined) serverPatch.priceOptions = priceOptionsForPersistence;
        const variantScopedComponentUpdate = options.componentMutationIntent === "variant-selection"
          || values.description !== undefined
          || values.unit !== undefined
          || values.unitCost !== undefined
          || values.priceOptionLabel !== undefined
          || values.priceOptions !== undefined
          || options.removedPriceOptionReplacements !== undefined;
        let patchedTree = estimateTree;
        setEstimateTree((current) => {
          patchedTree = options.makeProjectSpecific || variantScopedComponentUpdate
            ? patchEstimateRowItemInTree(current, result.rowId, serverPatch)
            : patchComponentInstanceRowsInTree(current, result.rowId, serverPatch);
          return patchedTree;
        });
        const nextRows = collectEditableRows(patchedTree);
        const activeExpressRowId = getActiveExpressEditorRowId();
        setEditableRows((currentRows) => mergeSyncedEditableRows(currentRows, nextRows, rowMutationStatuses, activeExpressRowId, previousRows));
        if (options.makeProjectSpecific) {
          const omittedAttachmentCount = projectSpecificPriceOptionCopy.omittedAttachmentCount;
          toast({
            tone: "success",
            message: omittedAttachmentCount > 0
              ? `Project component created. ${omittedAttachmentCount} Library attachment${omittedAttachmentCount === 1 ? " was" : "s were"} left with the Library component.`
              : "Project component created and updated for this estimate.",
          });
        }
        options.onPersisted?.();
      },
      onError: (error) => {
        options.onPersistenceError?.(error);
        if (/offline/i.test(error.message)) return;
        setEditableRows((currentRows) => {
          const currentRow = currentRows[rowItemId];
          const previousRow = previousRows[rowItemId];
          if (!currentRow || !previousRow || !editableRowsEqual(currentRow, nextEditableRow)) return currentRows;
          return { ...currentRows, [rowItemId]: previousRow };
        });
        if (options.expectedComponentImpactFingerprint !== undefined) {
          toast({ tone: "error", message: error.message || "Could not save the shared component edit." });
        }
      },
      rollback: () => restoreEstimateState(previousTree, previousRows, rollbackRevision),
    });
  });

  const updateRowItem = useStableCallback((
    rowItemId: string,
    values: Partial<EditableRowValue>,
    options: CommitRowItemUpdateOptions = {},
  ) => {
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

    commitRowItemUpdate(rowItemId, values, options);
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
      activeTabId,
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
    const previousRows = getEditableRows();
    const duplicateSourceRowId = readDuplicateEstimateRowSourceId(libraryItem);
    const retainedDuplicateIntent = duplicateSourceRowId
      ? duplicateRowIntentRef.current.get(duplicateSourceRowId)
      : undefined;
    if (retainedDuplicateIntent?.status === "pending") return true;
    const clonedItem = cloneLibraryItemForEstimate(libraryItem);
    const newItem = retainedDuplicateIntent
      ? { ...clonedItem, id: retainedDuplicateIntent.rowId }
      : clonedItem;
    const isExpressInsert = isExpressComponentRow(newItem);
    const mutationId = duplicateSourceRowId
      ? retainedDuplicateIntent?.mutationId ?? createEstimateRowItemId()
      : isExpressInsert
        ? createEstimateRowItemId()
        : undefined;
    if (duplicateSourceRowId && mutationId) {
      duplicateRowIntentRef.current.set(duplicateSourceRowId, {
        rowId: newItem.id,
        mutationId,
        status: "pending",
      });
    }
    requestPendingRowFocus(
      newItem.id,
      readProjectComponentProjectionMetadata(newItem.metadata) ? "quantity" : "name",
    );
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
        activeTabId,
        rowId: newItem.id,
        libraryItem,
        ...(mutationId ? { mutationId } : {}),
        rollback: isExpressInsert ? () => undefined : () => restoreEstimateState(previousTree, previousRows, rollbackRevision),
        onSuccess: isExpressInsert
          ? () => handleExpressInsertSuccess(newItem.id)
          : duplicateSourceRowId
            ? () => {
                const retained = duplicateRowIntentRef.current.get(duplicateSourceRowId);
                if (retained?.mutationId === mutationId) duplicateRowIntentRef.current.delete(duplicateSourceRowId);
              }
            : undefined,
        onError: isExpressInsert
          ? (error) => handleExpressInsertError(newItem.id, error)
          : duplicateSourceRowId
            ? (error) => {
              const retained = duplicateRowIntentRef.current.get(duplicateSourceRowId);
                if (!retained || retained.mutationId !== mutationId) return;
                if (isAmbiguousDuplicateRowFailure(error)) {
                  duplicateRowIntentRef.current.set(duplicateSourceRowId, { ...retained, status: "failed" });
                } else {
                  duplicateRowIntentRef.current.delete(duplicateSourceRowId);
                }
              }
            : undefined,
      });
    }
    return true;
  });

  const insertLibraryItem = useStableCallback((targetNodeId: string, libraryItem: EstimateRowItem) => {
    if (!canEditEstimate) {
      recordReadOnlyLibraryMutationAttempt("insert_row");
      return false;
    }
    return commitLibraryItemInsert(targetNodeId, libraryItem);
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
    const previousRows = getEditableRows();
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
    return commitReplaceRowItem(rowItemId, libraryItem);
  });

  const clearRowComponent = useStableCallback((rowItemId: string) => {
    const currentRowItem = findEstimateRowItem(estimateTree, rowItemId);
    if (!currentRowItem || !isExpressComponentRow(currentRowItem)) {
      replaceRowItem(rowItemId, createBlankEstimateRowTemplate());
      return;
    }

    const previousTree = estimateTree;
    const previousRows = getEditableRows();
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
        quantityBase: replacementItem.quantityBase ?? null,
        quantityContingencyAmount: replacementItem.quantityContingencyAmount ?? null,
        contingencyPercentage: replacementItem.contingencyPercentage ?? 0,
        adjustmentPercentage: replacementItem.adjustmentPercentage ?? 0,
        miscCost: replacementItem.miscCost,
        sourceSnapshot: null,
        metadata: getClearedEstimateRowMetadata(currentRowItem.metadata),
        rollback: () => restoreEstimateState(previousTree, previousRows, rollbackRevision),
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
    if (hasPendingRowMutation([rowItemId])) {
      toast({ tone: "error", message: "Finish saving row edits before promoting this component." });
      return;
    }

    const previousTree = estimateTree;
    const previousRows = getEditableRows();
    const rollbackRevision = getEstimateTreeRevision();
    setPromotingRowId(rowItemId);
    promoteRow({
      projectId,
      estimateId,
      expectedRowRevision: rowItem.rowRevision ?? 1,
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
    const currentEditableRow = getEditableRows()[rowItemId] ?? getInitialEditableRow(projectSpecificRowItem);
    setProjectSpecificRowId("");
    updateRowItem(rowItemId, {
      name: currentEditableRow.name,
      description: currentEditableRow.description,
      brand: currentEditableRow.brand,
      supplier: currentEditableRow.supplier,
      unit: currentEditableRow.unit,
      unitCost: currentEditableRow.unitCost,
      imageUrl: currentEditableRow.imageUrl,
      sourceUrl: currentEditableRow.sourceUrl,
    }, {
      makeProjectSpecific: true,
    });
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
    const previousRows = getEditableRows();
    const rollbackRevision = getEstimateTreeRevision();
    const currentEditableRows = getEditableRows();
    const previousSourceEditableRow = currentEditableRows[sourceRowItemId] ?? getInitialEditableRow(sourceLocation.item);
    const previousTargetEditableRow = currentEditableRows[targetRowItemId] ?? getInitialEditableRow(targetLocation.item);
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
        },
        onError: () => toast({ tone: "error", message: "Couldn't move the component. Try again." }),
      });
    }
  });

  const moveRowItemToNode = useStableCallback((
    rowItemId: string,
    targetNodeId: string,
    targetIndex: number,
    options?: { targetPlacement?: "index" | "end" },
  ) => {
    if (!canEditEstimate) {
      recordReadOnlyLibraryMutationAttempt("move_row_item");
      return false;
    }
    if (!canMoveRowItems) {
      toast({ tone: "error", message: "Load the full estimate before moving rows." });
      return false;
    }
    const sourceLocation = findEstimateRowItemLocation(estimateTree, rowItemId);
    if (!sourceLocation) {
      return false;
    }
    const targetNode = findEstimateNode(estimateTree, targetNodeId);
    const resolvedTargetIndex = options?.targetPlacement === "end"
      ? targetNode?.estimateRowItems?.length ?? 0
      : targetIndex;

    const moveResult = moveEstimateRowItemInTree({
      tree: estimateTree,
      rowItemId,
      sourceNodeId: sourceLocation.nodeId,
      targetNodeId,
      targetIndex: resolvedTargetIndex,
    });

    if (moveResult.status === "noop") {
      return true;
    }
    if (moveResult.status !== "moved" || !moveResult.sourceNodeId || !moveResult.targetNodeId || moveResult.affectedRowUpdates.length === 0) {
      toast({ tone: "error", message: "Couldn't move the row to that location." });
      return false;
    }
    const movedSourceNodeId = moveResult.sourceNodeId;
    const movedTargetNodeId = moveResult.targetNodeId;
    if (hasPendingRowMutation(moveResult.affectedRowUpdates.map((update) => update.rowId))) {
      toast({ tone: "error", message: "Finish saving affected rows before moving rows." });
      return false;
    }

    const previousTree = estimateTree;
    const previousRows = getEditableRows();
    const rollbackRevision = getEstimateTreeRevision();
    let nextRevision = rollbackRevision;
    flushSync(() => {
      nextRevision = setEstimateTree(() => moveResult.tree);
    });
    requestPendingRowFocus(rowItemId);

    if (projectId && estimateId) {
      const persistMove = () => persistMoveRowItem({
        projectId,
        estimateId,
        activeTabId: activeTabId ?? null,
        movedRowId: rowItemId,
        sourceNodeId: movedSourceNodeId,
        targetNodeId: movedTargetNodeId,
        updates: moveResult.affectedRowUpdates,
        rollback: () => restoreEstimateState(previousTree, previousRows, nextRevision ?? rollbackRevision),
        onSuccess: (result) => {
          setEstimateTree((current) => applyEstimateRowItemMoveResultToTree(current, result.rows));
        },
        onError: () => {
          toast({ tone: "error", message: "Couldn't move the row. Try again." });
        },
      });
      if (typeof window === "undefined") persistMove();
      else window.requestAnimationFrame(persistMove);
    }

    return true;
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
    const previousEditableRow = getEditableRows()[rowItemId];
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
        expectedRowRevision: previousRowLocation?.item.rowRevision,
        rollback: () => {
          if (previousRowLocation) {
            setEstimateTree((current) => restoreEstimateRowItemAtLocation(current, previousRowLocation));
            setEditableRows((current) => ({ ...current, [rowItemId]: previousEditableRow ?? getInitialEditableRow(previousRowLocation.item) }));
          }
        },
        onSuccess: (result) => {
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
    const previousRows = getEditableRows();
    const previousLocations = selectedRowIds
      .map((rowId) => findEstimateRowItemLocation(estimateTree, rowId))
      .filter((location): location is EstimateRowItemLocation => Boolean(location));
    const expectedRowRevisions = Object.fromEntries(previousLocations.flatMap(({ item }) =>
      typeof item.rowRevision === "number" ? [[item.id, item.rowRevision]] : [],
    ));
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
      rollback: () => {
        restoreEstimateState(previousTree, previousRows, rollbackRevision);
        setBulkSelectedRowIds(new Set(selectedRowIds));
      },
      onSuccess: (result) => {
        setBulkSelectedRowIds(new Set());
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
    clearRowComponent,
    confirmProjectSpecific,
    deleteExpressDraft,
    deleteRowItem,
    deleteSelectedRows,
    insertBlankRow,
    insertIntoSelectedNode,
    insertLibraryItem,
    markRowDirty,
    reconcileRowDirty,
    moveFromComponentPicker,
    moveRowComponent,
    moveRowItemToNode,
    promoteRowToLibrary,
    replaceFromComponentPicker,
    replaceRowItem,
    requestProjectSpecific,
    retryExpressDraft,
    updateRowItem,
  };
}
