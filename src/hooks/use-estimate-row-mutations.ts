"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import type { EstimateRowItem, EstimateTreeNode } from "@/components/workshop/estimate-tree-data";
import { WORKSPACE_COMPONENT_ROWS_LIBRARY_QUERY_KEY, workspaceComponentLibraryQueryKey, workspaceComponentRowsLibraryQueryKey } from "@/lib/component-library/query-keys";
import type { Json } from "@/lib/supabase/types";
import {
  deleteEstimateRowItem,
  deleteEstimateRowItemsBulk,
  detachEstimateRowItemFromLibrary,
  fetchEstimateTree,
  insertEstimateRowItemFromLibrary,
  moveEstimateRowComponentWithHistory,
  moveEstimateRowItemWithHistory,
  replaceEstimateRowItemWithLibrary,
  restoreDeletedEstimateRows,
  updateEstimateRowItem,
  type DeleteEstimateRowItemResult,
  type DeleteEstimateRowItemsBulkResult,
  type MoveEstimateRowComponentResult,
  type MoveEstimateRowItemUpdateInput,
  type MoveEstimateRowItemWithHistoryResult,
  type RestoreDeletedEstimateRowsResult,
  type UpdateEstimateRowItemResult,
} from "@/lib/estimates/actions";
import { applyEstimateRowItemMoveResultToTree } from "@/lib/estimates/estimate-row-tree-move";
import { promoteEstimateRowToLibraryComponent, type PromoteEstimateRowToLibraryComponentResult } from "@/lib/estimates/express-promotion-actions";
import { estimateRowMutationResultToPatch, findEstimateRowItemInTree, patchEstimateRowItemInTree, type EstimateRowItemPatch } from "@/lib/estimates/estimate-row-tree-patch";
import { ESTIMATE_ROW_REVISION_CONFLICT_CODE } from "@/lib/estimates/row-revision-conflict";
import type { EstimateRowUpdateBroadcastFields } from "./use-estimate-row-update-broadcast";
import { estimateQueryKeys } from "./use-estimate-query";

export type EstimateSaveState = "idle" | "dirty" | "saving" | "saved" | "failed";

export type EstimateRowMutationError = {
  rowId?: string;
  message: string;
  code?: string;
  retryable: boolean;
};

const ESTIMATE_ROW_REVISION_CONFLICT_MESSAGE = "This row changed elsewhere. The sheet has been refreshed; review the latest row before saving again.";

function readMutationErrorCode(error: Error) {
  const code = (error as Error & { code?: unknown }).code;
  if (typeof code === "string") return code;
  return error.message.includes(ESTIMATE_ROW_REVISION_CONFLICT_CODE) ? ESTIMATE_ROW_REVISION_CONFLICT_CODE : undefined;
}

function isRowRevisionConflictError(error: Error) {
  return readMutationErrorCode(error) === ESTIMATE_ROW_REVISION_CONFLICT_CODE;
}

function toEstimateRowMutationError(error: Error, input?: { rowId?: string }): EstimateRowMutationError {
  const code = readMutationErrorCode(error);
  const staleDataConflict = code === ESTIMATE_ROW_REVISION_CONFLICT_CODE;
  return {
    rowId: input?.rowId,
    message: staleDataConflict ? ESTIMATE_ROW_REVISION_CONFLICT_MESSAGE : error.message || "Could not save the row change.",
    code,
    retryable: true,
  };
}

type SharedMutationInput = {
  projectId: string;
  estimateId: string;
};

type InsertEstimateRowInput = SharedMutationInput & {
  targetNodeId: string;
  rowId: string;
  libraryItem: EstimateRowItem;
  mutationId?: string;
  rollback?: () => void;
  onSuccess?: (result: UpdateEstimateRowItemResult | undefined) => void;
  onError?: (error: Error) => void;
};

type ReplaceEstimateRowInput = SharedMutationInput & {
  rowId: string;
  libraryItem: EstimateRowItem;
  mutationId?: string;
  expectedRowRevision?: number;
  rollback?: () => void;
  onSuccess?: (result: UpdateEstimateRowItemResult) => void;
  onError?: (error: Error) => void;
};

type DeleteEstimateRowInput = SharedMutationInput & {
  rowId: string;
  mutationId?: string;
  expectedRowRevision?: number;
  rollback?: () => void;
  onSuccess?: (result: DeleteEstimateRowItemResult) => void;
  onError?: (error: Error) => void;
};

type DeleteEstimateRowsInput = SharedMutationInput & {
  rowIds: string[];
  mutationId?: string;
  expectedRowRevisions?: Record<string, number>;
  rollback?: () => void;
  onSuccess?: (result: DeleteEstimateRowItemsBulkResult) => void;
  onError?: (error: Error) => void;
};

type RestoreDeletedRowsInput = SharedMutationInput & {
  sourceEventId: string;
  rowIds?: string[];
  mutationId?: string;
  onSuccess?: (result: RestoreDeletedEstimateRowsResult) => void;
  onError?: (error: Error) => void;
};

type MoveEstimateRowsInput = SharedMutationInput & {
  sourceRowId: string;
  targetRowId: string;
  sourceLibraryItem: EstimateRowItem;
  targetLibraryItem: EstimateRowItem;
  mutationId?: string;
  expectedSourceRowRevision?: number;
  expectedTargetRowRevision?: number;
  rollback?: () => void;
  onSuccess?: (result: MoveEstimateRowComponentResult) => void;
  onError?: (error: Error) => void;
};

type MoveEstimateRowItemInput = SharedMutationInput & {
  activeTabId?: string | null;
  movedRowId: string;
  sourceNodeId: string;
  targetNodeId: string;
  updates: MoveEstimateRowItemUpdateInput[];
  mutationId?: string;
  rollback?: () => void;
  onSuccess?: (result: MoveEstimateRowItemWithHistoryResult) => void;
  onError?: (error: Error) => void;
};

type DetachEstimateRowInput = SharedMutationInput & {
  rowId: string;
  mutationId?: string;
  expectedRowRevision?: number;
  reason?: string;
  rollback?: () => void;
  onSuccess?: (result: UpdateEstimateRowItemResult) => void;
  onError?: (error: Error) => void;
};

type PromoteEstimateRowInput = SharedMutationInput & {
  rowId: string;
  libraryFolderId?: string | null;
  mutationId?: string;
  rollback?: () => void;
  onSuccess?: (result: PromoteEstimateRowToLibraryComponentResult) => void;
  onError?: (error: Error) => void;
};

type UpdateEstimateRowInput = SharedMutationInput & {
  rowId: string;
  material?: string;
  description?: string;
  supplier?: string;
  unit?: string;
  unitCost?: number;
  quantity?: number;
  quantityBase?: number | null;
  quantityContingencyAmount?: number | null;
  contingencyPercentage?: number;
  adjustmentPercentage?: number;
  miscCost?: number;
  sourceSnapshot?: Json | null;
  metadata?: EstimateRowItem["metadata"];
  mutationId?: string;
  expectedRowRevision?: number;
  rollback?: () => void;
  onSuccess?: (result: UpdateEstimateRowItemResult) => void;
  onError?: (error: Error) => void;
};

type RollbackInput = {
  estimateId: string;
  rowId: string;
  rollback?: () => void;
  onSuccess?: (result?: unknown) => void;
  onError?: (error: Error) => void;
};

type UpdateMutationContext = {
  operationId: number;
  previousPatch?: EstimateRowItemPatch;
};

function readSnapshotRecord(value: Json | null | undefined): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};
}

function snapshotStringPatch(value: Json | null | undefined, key: "imageUrl" | "sourceUrl") {
  const candidate = readSnapshotRecord(value)[key];
  if (candidate === null) return null;
  return typeof candidate === "string" ? candidate : undefined;
}

function toOptimisticRowPatch(input: UpdateEstimateRowInput): EstimateRowItemPatch {
  return {
    ...(input.material !== undefined ? { material: input.material } : {}),
    ...(input.description !== undefined ? { description: input.description } : {}),
    ...(input.supplier !== undefined ? { supplier: input.supplier } : {}),
    ...(input.unit !== undefined ? { unit: input.unit } : {}),
    ...(input.unitCost !== undefined ? { itemCost: input.unitCost } : {}),
    ...(input.quantity !== undefined ? { quantity: input.quantity } : {}),
    ...(input.quantityBase !== undefined ? { quantityBase: input.quantityBase } : {}),
    ...(input.quantityContingencyAmount !== undefined ? { quantityContingencyAmount: input.quantityContingencyAmount } : {}),
    ...(input.contingencyPercentage !== undefined ? { contingencyPercentage: input.contingencyPercentage } : {}),
    ...(input.adjustmentPercentage !== undefined ? { adjustmentPercentage: input.adjustmentPercentage } : {}),
    ...(input.miscCost !== undefined ? { miscCost: input.miscCost } : {}),
    ...(input.sourceSnapshot !== undefined ? {
      sourceSnapshot: input.sourceSnapshot,
      imageUrl: snapshotStringPatch(input.sourceSnapshot, "imageUrl"),
      sourceUrl: snapshotStringPatch(input.sourceSnapshot, "sourceUrl"),
    } : {}),
    ...(input.metadata !== undefined ? { metadata: input.metadata as EstimateRowItem["metadata"] } : {}),
  };
}

function toServerRowPatch(result: UpdateEstimateRowItemResult, input: UpdateEstimateRowInput): EstimateRowItemPatch {
  return {
    material: result.material,
    description: result.description,
    supplier: result.supplier,
    unit: result.unit,
    itemCost: result.itemCost,
    rowRevision: result.rowRevision,
    ...(input.quantity !== undefined ? { quantity: result.quantity } : {}),
    ...(input.quantityBase !== undefined ? { quantityBase: result.quantityBase } : {}),
    ...(input.quantityContingencyAmount !== undefined ? { quantityContingencyAmount: result.quantityContingencyAmount } : {}),
    ...(input.contingencyPercentage !== undefined ? { contingencyPercentage: result.contingencyPercentage } : {}),
    ...(input.adjustmentPercentage !== undefined ? { adjustmentPercentage: result.adjustmentPercentage } : {}),
    ...(input.miscCost !== undefined ? { miscCost: result.miscCost } : {}),
    ...(input.sourceSnapshot !== undefined ? {
      sourceSnapshot: result.sourceSnapshot,
      imageUrl: snapshotStringPatch(result.sourceSnapshot, "imageUrl"),
      sourceUrl: snapshotStringPatch(result.sourceSnapshot, "sourceUrl"),
    } : {}),
    ...(input.metadata !== undefined ? { metadata: result.metadata as EstimateRowItem["metadata"] } : {}),
  };
}

function toDetachedRowPatch(result: UpdateEstimateRowItemResult): EstimateRowItemPatch {
  return {
    source: "project",
    sourceLibraryItemId: null,
    linkState: result.linkState,
    rowRevision: result.rowRevision,
  };
}

function toPromotedRowPatch(result: PromoteEstimateRowToLibraryComponentResult): EstimateRowItemPatch {
  return {
    source: "library",
    sourceLibraryItemId: result.itemId,
    linkState: "linked-clean",
  };
}

function createMutationId() {
  if (typeof globalThis.crypto?.randomUUID === "function") return globalThis.crypto.randomUUID();
  const suffix = `${Date.now().toString(16)}${Math.random().toString(16).slice(2)}`.slice(0, 12).padEnd(12, "0");
  return `00000000-0000-4000-8000-${suffix}`;
}

function deferSaveStateTransition(callback: () => void) {
  if (typeof queueMicrotask === "function") {
    queueMicrotask(callback);
    return;
  }
  setTimeout(callback, 0);
}

function useSaveState(onSaveStateChange?: (state: EstimateSaveState, error: EstimateRowMutationError | null) => void) {
  const [saveState, setSaveState] = useState<EstimateSaveState>("idle");
  const [activeMutationCount, setActiveMutationCount] = useState(0);
  const [rowMutationError, setRowMutationError] = useState<EstimateRowMutationError | null>(null);
  // Keep the latest change-listener without re-creating the transition setters
  // (which are dependencies of every React Query mutation options below).
  const onSaveStateChangeRef = useRef(onSaveStateChange);
  useEffect(() => {
    onSaveStateChangeRef.current = onSaveStateChange;
  }, [onSaveStateChange]);
  const transitionTo = useCallback((next: EstimateSaveState, error: EstimateRowMutationError | null) => {
    setSaveState(next);
    onSaveStateChangeRef.current?.(next, error);
  }, []);

  const markRowDirty = useCallback(() => {
    transitionTo("dirty", rowMutationError);
  }, [rowMutationError, transitionTo]);

  const markSaving = useCallback(() => {
    setActiveMutationCount((count) => count + 1);
    setRowMutationError(null);
    transitionTo("saving", null);
  }, [transitionTo]);

  const markSaved = useCallback(() => {
    setActiveMutationCount((count) => {
      const nextCount = Math.max(0, count - 1);
      if (nextCount > 0) return nextCount;
      deferSaveStateTransition(() => transitionTo("saved", null));
      return nextCount;
    });
  }, [transitionTo]);

  const markFailed = useCallback((error?: Error, input?: { rowId?: string }) => {
    setActiveMutationCount((count) => {
      const nextCount = Math.max(0, count - 1);
      if (nextCount === 0) {
        const nextError = error ? toEstimateRowMutationError(error, input) : rowMutationError;
        deferSaveStateTransition(() => {
          setRowMutationError(nextError);
          transitionTo("failed", nextError);
        });
      }
      return nextCount;
    });
  }, [rowMutationError, transitionTo]);

  const clearRowMutationError = useCallback(() => setRowMutationError(null), []);

  return { saveState, activeMutationCount, rowMutationError, markRowDirty, markSaving, markSaved, markFailed, clearRowMutationError };
}

function withoutClientCallbacks<T extends { onError?: unknown; onSuccess?: unknown; rollback?: () => void }>(input: T): Omit<T, "onError" | "onSuccess" | "rollback"> {
  const next = { ...input };
  delete next.onError;
  delete next.onSuccess;
  delete next.rollback;
  return next;
}

export function useEstimateRowMutations(
  estimateId?: string,
  estimateTabId?: string,
  workspaceId?: string,
  projectId?: string,
  onSaveStateChange?: (state: EstimateSaveState, error: EstimateRowMutationError | null) => void,
  broadcastRowUpdate?: (fields: EstimateRowUpdateBroadcastFields) => void,
) {
  const queryClient = useQueryClient();
  const { saveState, activeMutationCount, rowMutationError, markRowDirty, markSaving, markSaved, markFailed, clearRowMutationError } = useSaveState(onSaveStateChange);
  const rowOperationIdsRef = useRef<Record<string, number>>({});
  const rowUpdateQueuesRef = useRef<Record<string, Promise<unknown>>>({});
  const detailQueryKey = estimateId ? estimateQueryKeys.detail(estimateId) : undefined;
  const treeQueryKey = estimateId ? (estimateTabId ? estimateQueryKeys.tabTree(estimateId, estimateTabId) : estimateQueryKeys.areaTree(estimateId)) : undefined;
  const invalidateTreeAfterMutationError = useCallback((error: Error) => {
    if (!treeQueryKey) return;
    void queryClient.invalidateQueries({
      queryKey: treeQueryKey,
      refetchType: isRowRevisionConflictError(error) ? "active" : "none",
    });
  }, [queryClient, treeQueryKey]);

  const mutationOptions = useMemo(
    () => ({
      onMutate: () => markSaving(),
      onSuccess: (result: unknown, input: RollbackInput) => {
        markSaved();
        input.onSuccess?.(result);
        void queryClient.invalidateQueries({ queryKey: estimateTabId ? estimateQueryKeys.tabTree(input.estimateId, estimateTabId) : estimateQueryKeys.areaTree(input.estimateId), refetchType: "none" });
        if (detailQueryKey) void queryClient.invalidateQueries({ queryKey: detailQueryKey, refetchType: "none" });
      },
      onError: (error: Error, input: RollbackInput) => {
        input.rollback?.();
        input.onError?.(error);
        markFailed(error, input);
        invalidateTreeAfterMutationError(error);
      },
    }),
    [detailQueryKey, estimateTabId, invalidateTreeAfterMutationError, markFailed, markSaved, markSaving, queryClient],
  );

  const insertMutation = useMutation({
    mutationFn: (input: InsertEstimateRowInput) => insertEstimateRowItemFromLibrary(withoutClientCallbacks(input)),
    onMutate: () => markSaving(),
    onSuccess: (result: UpdateEstimateRowItemResult | undefined, input) => {
      markSaved();
      const queryKey = estimateTabId ? estimateQueryKeys.tabTree(input.estimateId, estimateTabId) : estimateQueryKeys.areaTree(input.estimateId);
      if (result) {
        queryClient.setQueryData<EstimateTreeNode[]>(queryKey, (currentTree) =>
          currentTree
            ? patchEstimateRowItemInTree(currentTree, input.rowId, {
                material: result.material,
                description: result.description,
                supplier: result.supplier,
                unit: result.unit,
                quantity: result.quantity,
                quantityBase: result.quantityBase,
                quantityContingencyAmount: result.quantityContingencyAmount,
                itemCost: result.itemCost,
                contingencyPercentage: result.contingencyPercentage,
                miscCost: result.miscCost,
                sourceSnapshot: result.sourceSnapshot,
                imageUrl: snapshotStringPatch(result.sourceSnapshot, "imageUrl"),
                sourceUrl: snapshotStringPatch(result.sourceSnapshot, "sourceUrl"),
                metadata: result.metadata as EstimateRowItem["metadata"],
                linkState: result.linkState,
                rowRevision: result.rowRevision,
              })
            : currentTree,
        );
      }
      input.onSuccess?.(result);
      void queryClient.invalidateQueries({ queryKey, refetchType: "none" });
      if (detailQueryKey) void queryClient.invalidateQueries({ queryKey: detailQueryKey, refetchType: "none" });
    },
    onError: (error: Error, input) => {
      input.rollback?.();
      input.onError?.(error);
      markFailed(error, input);
      invalidateTreeAfterMutationError(error);
    },
  });

  const replaceMutation = useMutation({
    mutationFn: (input: ReplaceEstimateRowInput) => replaceEstimateRowItemWithLibrary(withoutClientCallbacks(input)),
    onMutate: () => markSaving(),
    onSuccess: (result: UpdateEstimateRowItemResult, input) => {
      const queryKey = estimateTabId ? estimateQueryKeys.tabTree(input.estimateId, estimateTabId) : estimateQueryKeys.areaTree(input.estimateId);
      queryClient.setQueryData<EstimateTreeNode[]>(queryKey, (currentTree) =>
        currentTree ? patchEstimateRowItemInTree(currentTree, result.rowId, estimateRowMutationResultToPatch(result)) : currentTree,
      );
      markSaved();
      input.onSuccess?.(result);
      void queryClient.invalidateQueries({ queryKey, refetchType: "none" });
      if (detailQueryKey) void queryClient.invalidateQueries({ queryKey: detailQueryKey, refetchType: "none" });
    },
    onError: (error: Error, input) => {
      input.rollback?.();
      input.onError?.(error);
      markFailed(error, input);
      invalidateTreeAfterMutationError(error);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (input: DeleteEstimateRowInput) => deleteEstimateRowItem(withoutClientCallbacks(input)),
    onMutate: () => markSaving(),
    onSuccess: (result: DeleteEstimateRowItemResult, input) => {
      markSaved();
      input.onSuccess?.(result);
      const queryKey = estimateTabId ? estimateQueryKeys.tabTree(input.estimateId, estimateTabId) : estimateQueryKeys.areaTree(input.estimateId);
      void queryClient.invalidateQueries({ queryKey, refetchType: "none" });
      if (detailQueryKey) void queryClient.invalidateQueries({ queryKey: detailQueryKey, refetchType: "none" });
    },
    onError: (error: Error, input) => {
      input.rollback?.();
      input.onError?.(error);
      markFailed(error, input);
      invalidateTreeAfterMutationError(error);
    },
  });

  const moveMutation = useMutation({
    mutationFn: (input: MoveEstimateRowsInput) => moveEstimateRowComponentWithHistory(withoutClientCallbacks(input)),
    onMutate: () => markSaving(),
    onSuccess: (result: MoveEstimateRowComponentResult, input) => {
      const queryKey = estimateTabId ? estimateQueryKeys.tabTree(input.estimateId, estimateTabId) : estimateQueryKeys.areaTree(input.estimateId);
      queryClient.setQueryData<EstimateTreeNode[]>(queryKey, (currentTree) => {
        if (!currentTree) return currentTree;
        const sourcePatchedTree = patchEstimateRowItemInTree(currentTree, result.sourceRow.rowId, estimateRowMutationResultToPatch(result.sourceRow));
        return patchEstimateRowItemInTree(sourcePatchedTree, result.targetRow.rowId, estimateRowMutationResultToPatch(result.targetRow));
      });
      markSaved();
      input.onSuccess?.(result);
      void queryClient.invalidateQueries({ queryKey, refetchType: "none" });
      if (detailQueryKey) void queryClient.invalidateQueries({ queryKey: detailQueryKey, refetchType: "none" });
    },
    onError: (error: Error, input) => {
      input.rollback?.();
      input.onError?.(error);
      markFailed(error);
      invalidateTreeAfterMutationError(error);
    },
  });

  const moveRowItemMutation = useMutation({
    mutationFn: (input: MoveEstimateRowItemInput) => moveEstimateRowItemWithHistory(withoutClientCallbacks(input)),
    onMutate: () => markSaving(),
    onSuccess: (result: MoveEstimateRowItemWithHistoryResult, input) => {
      const queryKey = estimateTabId ? estimateQueryKeys.tabTree(input.estimateId, estimateTabId) : estimateQueryKeys.areaTree(input.estimateId);
      queryClient.setQueryData<EstimateTreeNode[]>(queryKey, (currentTree) =>
        currentTree ? applyEstimateRowItemMoveResultToTree(currentTree, result.rows) : currentTree,
      );
      markSaved();
      input.onSuccess?.(result);
      void queryClient.invalidateQueries({ queryKey, refetchType: "none" });
      if (detailQueryKey) void queryClient.invalidateQueries({ queryKey: detailQueryKey, refetchType: "none" });
    },
    onError: (error: Error, input) => {
      input.rollback?.();
      input.onError?.(error);
      markFailed(error, { rowId: input.movedRowId });
      invalidateTreeAfterMutationError(error);
    },
  });

  const deleteRowsMutation = useMutation({
    mutationFn: (input: DeleteEstimateRowsInput) => deleteEstimateRowItemsBulk(withoutClientCallbacks(input)),
    onMutate: () => markSaving(),
    onSuccess: (result: DeleteEstimateRowItemsBulkResult, input) => {
      markSaved();
      input.onSuccess?.(result);
      const queryKey = estimateTabId ? estimateQueryKeys.tabTree(input.estimateId, estimateTabId) : estimateQueryKeys.areaTree(input.estimateId);
      void queryClient.invalidateQueries({ queryKey, refetchType: "none" });
      if (detailQueryKey) void queryClient.invalidateQueries({ queryKey: detailQueryKey, refetchType: "none" });
    },
    onError: (error: Error, input) => {
      input.rollback?.();
      input.onError?.(error);
      markFailed(error);
      invalidateTreeAfterMutationError(error);
    },
  });

  const restoreDeletedRowsMutation = useMutation({
    mutationFn: (input: RestoreDeletedRowsInput) => restoreDeletedEstimateRows(withoutClientCallbacks(input)),
    onMutate: () => markSaving(),
    onSuccess: (result: RestoreDeletedEstimateRowsResult, input) => {
      markSaved();
      input.onSuccess?.(result);
      const queryKey = estimateTabId ? estimateQueryKeys.tabTree(input.estimateId, estimateTabId) : estimateQueryKeys.areaTree(input.estimateId);
      void queryClient.invalidateQueries({ queryKey, refetchType: "none" });
      if (detailQueryKey) void queryClient.invalidateQueries({ queryKey: detailQueryKey, refetchType: "none" });
    },
    onError: (error: Error, input) => {
      input.onError?.(error);
      markFailed(error);
      invalidateTreeAfterMutationError(error);
    },
  });

  const detachMutation = useMutation({
    mutationFn: (input: DetachEstimateRowInput) => detachEstimateRowItemFromLibrary(withoutClientCallbacks(input)),
    onMutate: async (input): Promise<{ previousPatch?: EstimateRowItemPatch }> => {
      markSaving();
      const queryKey = estimateTabId ? estimateQueryKeys.tabTree(input.estimateId, estimateTabId) : estimateQueryKeys.areaTree(input.estimateId);
      await queryClient.cancelQueries({ queryKey });
      const previousTree = queryClient.getQueryData<EstimateTreeNode[]>(queryKey);
      const previousRow = previousTree ? findEstimateRowItemInTree(previousTree, input.rowId) : null;
      const previousPatch = previousRow
        ? {
            source: previousRow.source,
            sourceLibraryItemId: previousRow.sourceLibraryItemId,
            linkState: previousRow.linkState,
            rowRevision: previousRow.rowRevision,
          }
        : undefined;
      if (previousTree) {
        queryClient.setQueryData<EstimateTreeNode[]>(
          queryKey,
          patchEstimateRowItemInTree(previousTree, input.rowId, {
            source: "project",
            sourceLibraryItemId: null,
            linkState: "detached",
          }),
        );
      }
      return { previousPatch };
    },
    onSuccess: (result: UpdateEstimateRowItemResult, input) => {
      const queryKey = estimateTabId ? estimateQueryKeys.tabTree(input.estimateId, estimateTabId) : estimateQueryKeys.areaTree(input.estimateId);
      queryClient.setQueryData<EstimateTreeNode[]>(queryKey, (currentTree) =>
        currentTree ? patchEstimateRowItemInTree(currentTree, result.rowId, toDetachedRowPatch(result)) : currentTree,
      );
      markSaved();
      void queryClient.invalidateQueries({ queryKey, refetchType: "none" });
      if (detailQueryKey) void queryClient.invalidateQueries({ queryKey: detailQueryKey, refetchType: "none" });
      broadcastRowUpdate?.({
        rowId: result.rowId,
        rowRevision: result.rowRevision,
        quantity: result.quantity,
        quantityBase: result.quantityBase ?? null,
        quantityContingencyAmount: result.quantityBase === null || result.quantityBase === undefined ? null : result.quantityContingencyAmount ?? 0,
        contingencyPercentage: result.contingencyPercentage,
      });
      input.onSuccess?.(result);
    },
    onError: (_error: Error, input, context) => {
      const queryKey = estimateTabId ? estimateQueryKeys.tabTree(input.estimateId, estimateTabId) : estimateQueryKeys.areaTree(input.estimateId);
      if (context?.previousPatch) {
        queryClient.setQueryData<EstimateTreeNode[]>(queryKey, (currentTree) =>
          currentTree ? patchEstimateRowItemInTree(currentTree, input.rowId, context.previousPatch ?? {}) : currentTree,
        );
      } else input.rollback?.();
      input.onError?.(_error);
      markFailed(_error, input);
      void queryClient.invalidateQueries({ queryKey, refetchType: isRowRevisionConflictError(_error) ? "active" : "none" });
    },
  });

  const promoteMutation = useMutation({
    mutationFn: (input: PromoteEstimateRowInput) => promoteEstimateRowToLibraryComponent(withoutClientCallbacks(input)),
    onMutate: () => markSaving(),
    onSuccess: (result, input) => {
      const queryKey = estimateTabId ? estimateQueryKeys.tabTree(input.estimateId, estimateTabId) : estimateQueryKeys.areaTree(input.estimateId);
      queryClient.setQueryData<EstimateTreeNode[]>(queryKey, (currentTree) =>
        currentTree ? patchEstimateRowItemInTree(currentTree, result.rowId, toPromotedRowPatch(result)) : currentTree,
      );
      markSaved();
      void queryClient.invalidateQueries({ queryKey, refetchType: "active" });
      if (detailQueryKey) void queryClient.invalidateQueries({ queryKey: detailQueryKey, refetchType: "active" });
      if (workspaceId) void queryClient.invalidateQueries({ queryKey: workspaceComponentLibraryQueryKey(workspaceId), refetchType: "active" });
      if (workspaceId && (input.projectId || projectId)) {
        void queryClient.invalidateQueries({
          queryKey: workspaceComponentRowsLibraryQueryKey(workspaceId, input.projectId || projectId),
          refetchType: "active",
        });
      } else {
        void queryClient.invalidateQueries({ queryKey: WORKSPACE_COMPONENT_ROWS_LIBRARY_QUERY_KEY, refetchType: "active" });
      }
      input.onSuccess?.(result);
    },
    onError: (error: Error, input) => {
      input.rollback?.();
      input.onError?.(error);
      markFailed(error, input);
      if (treeQueryKey) void queryClient.invalidateQueries({ queryKey: treeQueryKey, refetchType: "active" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: (input: UpdateEstimateRowInput) => updateEstimateRowItem(withoutClientCallbacks(input)),
    onMutate: async (input): Promise<UpdateMutationContext> => {
      markSaving();
      const operationId = (rowOperationIdsRef.current[input.rowId] ?? 0) + 1;
      rowOperationIdsRef.current[input.rowId] = operationId;
      const queryKey = estimateTabId ? estimateQueryKeys.tabTree(input.estimateId, estimateTabId) : estimateQueryKeys.areaTree(input.estimateId);
      await queryClient.cancelQueries({ queryKey });
      const previousTree = queryClient.getQueryData<EstimateTreeNode[]>(queryKey);
      const previousRow = previousTree ? findEstimateRowItemInTree(previousTree, input.rowId) : null;
      const previousRowJson = previousRow as (EstimateRowItem & { sourceSnapshot?: Json | null }) | null;
      const previousPatch = previousRow
        ? {
            itemCost: previousRow.itemCost,
            rowRevision: previousRow.rowRevision,
            ...(input.material !== undefined ? { material: previousRow.material } : {}),
            ...(input.description !== undefined ? { description: previousRow.description } : {}),
            ...(input.supplier !== undefined ? { supplier: previousRow.supplier } : {}),
            ...(input.unit !== undefined ? { unit: previousRow.unit } : {}),
            ...(input.quantity !== undefined ? { quantity: previousRow.quantity } : {}),
            ...(input.quantityBase !== undefined ? { quantityBase: previousRow.quantityBase ?? null } : {}),
            ...(input.quantityContingencyAmount !== undefined ? { quantityContingencyAmount: previousRow.quantityContingencyAmount ?? null } : {}),
            ...(input.contingencyPercentage !== undefined ? { contingencyPercentage: previousRow.contingencyPercentage ?? 0 } : {}),
            ...(input.adjustmentPercentage !== undefined ? { adjustmentPercentage: previousRow.adjustmentPercentage ?? 0 } : {}),
            ...(input.miscCost !== undefined ? { miscCost: previousRow.miscCost } : {}),
            ...(input.sourceSnapshot !== undefined ? { sourceSnapshot: previousRowJson?.sourceSnapshot ?? null } : {}),
            ...(input.metadata !== undefined ? { metadata: previousRowJson?.metadata ?? {} } : {}),
          }
        : undefined;
      if (previousTree) {
        queryClient.setQueryData<EstimateTreeNode[]>(
          queryKey,
          patchEstimateRowItemInTree(previousTree, input.rowId, toOptimisticRowPatch(input)),
        );
      }
      return { operationId, previousPatch };
    },
    onSuccess: (result: UpdateEstimateRowItemResult, input, context) => {
      if (rowOperationIdsRef.current[input.rowId] !== context.operationId) return;
      const queryKey = estimateTabId ? estimateQueryKeys.tabTree(input.estimateId, estimateTabId) : estimateQueryKeys.areaTree(input.estimateId);
      queryClient.setQueryData<EstimateTreeNode[]>(queryKey, (currentTree) =>
        currentTree ? patchEstimateRowItemInTree(currentTree, result.rowId, toServerRowPatch(result, input)) : currentTree,
      );
      markSaved();
      void queryClient.invalidateQueries({ queryKey, refetchType: "none" });
      if (detailQueryKey) void queryClient.invalidateQueries({ queryKey: detailQueryKey, refetchType: "none" });
      input.onSuccess?.(result);
    },
    onError: (_error: Error, input, context) => {
      if (!context || rowOperationIdsRef.current[input.rowId] !== context.operationId) return;
      const queryKey = estimateTabId ? estimateQueryKeys.tabTree(input.estimateId, estimateTabId) : estimateQueryKeys.areaTree(input.estimateId);
      if (context.previousPatch) {
        queryClient.setQueryData<EstimateTreeNode[]>(queryKey, (currentTree) =>
          currentTree ? patchEstimateRowItemInTree(currentTree, input.rowId, context.previousPatch ?? {}) : currentTree,
        );
      } else input.rollback?.();
      input.onError?.(_error);
      markFailed(_error, input);
      void queryClient.invalidateQueries({ queryKey, refetchType: isRowRevisionConflictError(_error) ? "active" : "none" });
    },
  });

  function getCachedRowRevision(rowId: string) {
    if (!treeQueryKey) return undefined;
    const currentTree = queryClient.getQueryData<EstimateTreeNode[]>(treeQueryKey);
    return currentTree ? findEstimateRowItemInTree(currentTree, rowId)?.rowRevision : undefined;
  }

  function withMutationIdentity<T extends { rowId: string; mutationId?: string; expectedRowRevision?: number }>(input: T): T {
    return {
      ...input,
      mutationId: input.mutationId ?? createMutationId(),
      expectedRowRevision: input.expectedRowRevision ?? getCachedRowRevision(input.rowId),
    };
  }

  function withInsertMutationIdentity(input: InsertEstimateRowInput): InsertEstimateRowInput {
    return {
      ...input,
      mutationId: input.mutationId ?? createMutationId(),
    };
  }

  function withMoveMutationIdentity(input: MoveEstimateRowsInput): MoveEstimateRowsInput {
    return {
      ...input,
      mutationId: input.mutationId ?? createMutationId(),
      expectedSourceRowRevision: input.expectedSourceRowRevision ?? getCachedRowRevision(input.sourceRowId),
      expectedTargetRowRevision: input.expectedTargetRowRevision ?? getCachedRowRevision(input.targetRowId),
    };
  }

  function withMoveRowItemMutationIdentity(input: MoveEstimateRowItemInput): MoveEstimateRowItemInput {
    return {
      ...input,
      activeTabId: input.activeTabId ?? estimateTabId ?? null,
      mutationId: input.mutationId ?? createMutationId(),
    };
  }

  function withDeleteRowsMutationIdentity(input: DeleteEstimateRowsInput): DeleteEstimateRowsInput {
    return {
      ...input,
      mutationId: input.mutationId ?? createMutationId(),
      expectedRowRevisions: input.expectedRowRevisions ?? Object.fromEntries(
        input.rowIds
          .map((rowId) => [rowId, getCachedRowRevision(rowId)] as const)
          .filter((entry): entry is readonly [string, number] => typeof entry[1] === "number"),
      ),
    };
  }

  function enqueueRowMutation<T extends { rowId: string }>(rowId: string, run: () => Promise<T | unknown>) {
    const previousUpdate = rowUpdateQueuesRef.current[rowId] ?? Promise.resolve();
    const nextUpdate = previousUpdate
      .catch(() => undefined)
      .then(run);
    rowUpdateQueuesRef.current[rowId] = nextUpdate;
    void nextUpdate.catch(() => undefined).then(() => {
      if (rowUpdateQueuesRef.current[rowId] === nextUpdate) delete rowUpdateQueuesRef.current[rowId];
    });
  }

  function enqueueRowUpdate(input: UpdateEstimateRowInput) {
    enqueueRowMutation(input.rowId, () => updateMutation.mutateAsync(withMutationIdentity(input)));
  }

  return {
    saveState,
    activeMutationCount,
    rowMutationError,
    clearRowMutationError,
    markRowDirty,
    fetchTree: fetchEstimateTree,
    insertRow: (input: InsertEstimateRowInput) => insertMutation.mutate(withInsertMutationIdentity(input)),
    replaceRow: (input: ReplaceEstimateRowInput) => enqueueRowMutation(input.rowId, () => replaceMutation.mutateAsync(withMutationIdentity(input))),
    moveRows: (input: MoveEstimateRowsInput) => moveMutation.mutate(withMoveMutationIdentity(input)),
    moveRowItem: (input: MoveEstimateRowItemInput) => moveRowItemMutation.mutate(withMoveRowItemMutationIdentity(input)),
    detachRow: (input: DetachEstimateRowInput) => enqueueRowMutation(input.rowId, () => detachMutation.mutateAsync(withMutationIdentity(input))),
    promoteRow: (input: PromoteEstimateRowInput) => enqueueRowMutation(input.rowId, () => promoteMutation.mutateAsync({
      ...input,
      mutationId: input.mutationId ?? createMutationId(),
    })),
    deleteRow: (input: DeleteEstimateRowInput) => enqueueRowMutation(input.rowId, () => deleteMutation.mutateAsync(withMutationIdentity(input))),
    deleteRows: (input: DeleteEstimateRowsInput) => deleteRowsMutation.mutate(withDeleteRowsMutationIdentity(input)),
    restoreDeletedRows: (input: RestoreDeletedRowsInput) => restoreDeletedRowsMutation.mutate({
      ...input,
      mutationId: input.mutationId ?? createMutationId(),
    }),
    updateRow: enqueueRowUpdate,
  };
}
