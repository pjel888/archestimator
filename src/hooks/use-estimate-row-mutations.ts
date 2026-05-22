"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useMemo, useRef, useState } from "react";

import type { EstimateRowItem, EstimateTreeNode } from "@/components/workshop/estimate-tree-data";
import { deleteEstimateRowItem, fetchEstimateTree, insertEstimateRowItemFromLibrary, replaceEstimateRowItemWithLibrary, updateEstimateRowItem, type UpdateEstimateRowItemResult } from "@/lib/estimates/actions";
import { findEstimateRowItemInTree, patchEstimateRowItemInTree, type EstimateRowItemPatch } from "@/lib/estimates/estimate-row-tree-patch";
import { estimateQueryKeys } from "./use-estimate-query";

export type EstimateSaveState = "idle" | "dirty" | "saving" | "saved" | "failed";

type SharedMutationInput = {
  projectId: string;
  estimateId: string;
};

type InsertEstimateRowInput = SharedMutationInput & {
  targetNodeId: string;
  rowId: string;
  libraryItem: EstimateRowItem;
  rollback?: () => void;
};

type ReplaceEstimateRowInput = SharedMutationInput & {
  rowId: string;
  libraryItem: EstimateRowItem;
  rollback?: () => void;
};

type DeleteEstimateRowInput = SharedMutationInput & {
  rowId: string;
  rollback?: () => void;
};

type UpdateEstimateRowInput = SharedMutationInput & {
  rowId: string;
  quantity?: number;
  miscCost?: number;
  rollback?: () => void;
};

type RollbackInput = {
  estimateId: string;
  rowId: string;
  rollback?: () => void;
};

type UpdateMutationContext = {
  operationId: number;
  previousPatch?: EstimateRowItemPatch;
};

function toOptimisticRowPatch(input: UpdateEstimateRowInput): EstimateRowItemPatch {
  return {
    ...(input.quantity !== undefined ? { quantity: input.quantity } : {}),
    ...(input.miscCost !== undefined ? { miscCost: input.miscCost } : {}),
  };
}

function toServerRowPatch(result: UpdateEstimateRowItemResult, input: UpdateEstimateRowInput): EstimateRowItemPatch {
  return {
    itemCost: result.itemCost,
    ...(input.quantity !== undefined ? { quantity: result.quantity } : {}),
    ...(input.miscCost !== undefined ? { miscCost: result.miscCost } : {}),
  };
}

function useSaveState() {
  const [saveState, setSaveState] = useState<EstimateSaveState>("idle");

  function markRowDirty() {
    setSaveState("dirty");
  }

  function markSaving() {
    setSaveState("saving");
  }

  function markSaved() {
    setSaveState("saved");
  }

  function markFailed() {
    setSaveState("failed");
  }

  return { saveState, markRowDirty, markSaving, markSaved, markFailed };
}

function withoutRollback<T extends { rollback?: () => void }>(input: T): Omit<T, "rollback"> {
  const next = { ...input };
  delete next.rollback;
  return next;
}

export function useEstimateRowMutations(estimateId?: string) {
  const queryClient = useQueryClient();
  const { saveState, markRowDirty, markSaving, markSaved, markFailed } = useSaveState();
  const rowOperationIdsRef = useRef<Record<string, number>>({});
  const detailQueryKey = estimateId ? estimateQueryKeys.detail(estimateId) : undefined;
  const areaTreeQueryKey = estimateId ? estimateQueryKeys.areaTree(estimateId) : undefined;

  const mutationOptions = useMemo(
    () => ({
      onMutate: () => markSaving(),
      onSuccess: (_result: void, input: RollbackInput) => {
        markSaved();
        void queryClient.invalidateQueries({ queryKey: estimateQueryKeys.areaTree(input.estimateId), refetchType: "none" });
        if (detailQueryKey) void queryClient.invalidateQueries({ queryKey: detailQueryKey, refetchType: "none" });
      },
      onError: (_error: Error, input: RollbackInput) => {
        input.rollback?.();
        markFailed();
        if (areaTreeQueryKey) void queryClient.invalidateQueries({ queryKey: areaTreeQueryKey, refetchType: "none" });
      },
    }),
    [areaTreeQueryKey, detailQueryKey, markFailed, markSaved, markSaving, queryClient],
  );

  const insertMutation = useMutation({
    mutationFn: (input: InsertEstimateRowInput) => insertEstimateRowItemFromLibrary(withoutRollback(input)),
    ...mutationOptions,
  });

  const replaceMutation = useMutation({
    mutationFn: (input: ReplaceEstimateRowInput) => replaceEstimateRowItemWithLibrary(withoutRollback(input)),
    ...mutationOptions,
  });

  const deleteMutation = useMutation({
    mutationFn: (input: DeleteEstimateRowInput) => deleteEstimateRowItem(withoutRollback(input)),
    ...mutationOptions,
  });

  const updateMutation = useMutation({
    mutationFn: (input: UpdateEstimateRowInput) => updateEstimateRowItem(withoutRollback(input)),
    onMutate: async (input): Promise<UpdateMutationContext> => {
      markSaving();
      const operationId = (rowOperationIdsRef.current[input.rowId] ?? 0) + 1;
      rowOperationIdsRef.current[input.rowId] = operationId;
      const queryKey = estimateQueryKeys.areaTree(input.estimateId);
      await queryClient.cancelQueries({ queryKey });
      const previousTree = queryClient.getQueryData<EstimateTreeNode[]>(queryKey);
      const previousRow = previousTree ? findEstimateRowItemInTree(previousTree, input.rowId) : null;
      const previousPatch = previousRow
        ? {
            itemCost: previousRow.itemCost,
            ...(input.quantity !== undefined ? { quantity: previousRow.quantity } : {}),
            ...(input.miscCost !== undefined ? { miscCost: previousRow.miscCost } : {}),
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
      const queryKey = estimateQueryKeys.areaTree(input.estimateId);
      queryClient.setQueryData<EstimateTreeNode[]>(queryKey, (currentTree) =>
        currentTree ? patchEstimateRowItemInTree(currentTree, result.rowId, toServerRowPatch(result, input)) : currentTree,
      );
      markSaved();
      void queryClient.invalidateQueries({ queryKey, refetchType: "none" });
      if (detailQueryKey) void queryClient.invalidateQueries({ queryKey: detailQueryKey, refetchType: "none" });
    },
    onError: (_error: Error, input, context) => {
      if (!context || rowOperationIdsRef.current[input.rowId] !== context.operationId) return;
      const queryKey = estimateQueryKeys.areaTree(input.estimateId);
      if (context.previousPatch) {
        queryClient.setQueryData<EstimateTreeNode[]>(queryKey, (currentTree) =>
          currentTree ? patchEstimateRowItemInTree(currentTree, input.rowId, context.previousPatch ?? {}) : currentTree,
        );
      } else input.rollback?.();
      markFailed();
      void queryClient.invalidateQueries({ queryKey, refetchType: "none" });
    },
  });

  return {
    saveState,
    markRowDirty,
    fetchTree: fetchEstimateTree,
    insertRow: insertMutation.mutate,
    replaceRow: replaceMutation.mutate,
    deleteRow: deleteMutation.mutate,
    updateRow: updateMutation.mutate,
  };
}
