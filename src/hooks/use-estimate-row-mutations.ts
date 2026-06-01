"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useMemo, useRef, useState } from "react";

import type { EstimateRowItem, EstimateTreeNode } from "@/components/workshop/estimate-tree-data";
import { deleteEstimateRowItem, detachEstimateRowItemFromLibrary, fetchEstimateTree, insertEstimateRowItemFromLibrary, replaceEstimateRowItemWithLibrary, updateEstimateRowItem, type UpdateEstimateRowItemResult } from "@/lib/estimates/actions";
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
  mutationId?: string;
  rollback?: () => void;
};

type ReplaceEstimateRowInput = SharedMutationInput & {
  rowId: string;
  libraryItem: EstimateRowItem;
  mutationId?: string;
  expectedRowRevision?: number;
  rollback?: () => void;
};

type DeleteEstimateRowInput = SharedMutationInput & {
  rowId: string;
  mutationId?: string;
  expectedRowRevision?: number;
  rollback?: () => void;
};

type DetachEstimateRowInput = SharedMutationInput & {
  rowId: string;
  mutationId?: string;
  expectedRowRevision?: number;
  reason?: string;
  rollback?: () => void;
};

type UpdateEstimateRowInput = SharedMutationInput & {
  rowId: string;
  quantity?: number;
  contingencyPercentage?: number;
  miscCost?: number;
  mutationId?: string;
  expectedRowRevision?: number;
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
    ...(input.contingencyPercentage !== undefined ? { contingencyPercentage: input.contingencyPercentage } : {}),
    ...(input.miscCost !== undefined ? { miscCost: input.miscCost } : {}),
  };
}

function toServerRowPatch(result: UpdateEstimateRowItemResult, input: UpdateEstimateRowInput): EstimateRowItemPatch {
  return {
    itemCost: result.itemCost,
    rowRevision: result.rowRevision,
    ...(input.quantity !== undefined ? { quantity: result.quantity } : {}),
    ...(input.contingencyPercentage !== undefined ? { contingencyPercentage: result.contingencyPercentage } : {}),
    ...(input.miscCost !== undefined ? { miscCost: result.miscCost } : {}),
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

function createMutationId() {
  if (typeof globalThis.crypto?.randomUUID === "function") return globalThis.crypto.randomUUID();
  const suffix = `${Date.now().toString(16)}${Math.random().toString(16).slice(2)}`.slice(0, 12).padEnd(12, "0");
  return `00000000-0000-4000-8000-${suffix}`;
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
  const rowUpdateQueuesRef = useRef<Record<string, Promise<unknown>>>({});
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

  const detachMutation = useMutation({
    mutationFn: (input: DetachEstimateRowInput) => detachEstimateRowItemFromLibrary(withoutRollback(input)),
    onMutate: async (input): Promise<{ previousPatch?: EstimateRowItemPatch }> => {
      markSaving();
      const queryKey = estimateQueryKeys.areaTree(input.estimateId);
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
      const queryKey = estimateQueryKeys.areaTree(input.estimateId);
      queryClient.setQueryData<EstimateTreeNode[]>(queryKey, (currentTree) =>
        currentTree ? patchEstimateRowItemInTree(currentTree, result.rowId, toDetachedRowPatch(result)) : currentTree,
      );
      markSaved();
      void queryClient.invalidateQueries({ queryKey, refetchType: "none" });
      if (detailQueryKey) void queryClient.invalidateQueries({ queryKey: detailQueryKey, refetchType: "none" });
    },
    onError: (_error: Error, input, context) => {
      const queryKey = estimateQueryKeys.areaTree(input.estimateId);
      if (context?.previousPatch) {
        queryClient.setQueryData<EstimateTreeNode[]>(queryKey, (currentTree) =>
          currentTree ? patchEstimateRowItemInTree(currentTree, input.rowId, context.previousPatch ?? {}) : currentTree,
        );
      } else input.rollback?.();
      markFailed();
      void queryClient.invalidateQueries({ queryKey, refetchType: "none" });
    },
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
            rowRevision: previousRow.rowRevision,
            ...(input.quantity !== undefined ? { quantity: previousRow.quantity } : {}),
            ...(input.contingencyPercentage !== undefined ? { contingencyPercentage: previousRow.contingencyPercentage ?? 0 } : {}),
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

  function getCachedRowRevision(rowId: string) {
    if (!areaTreeQueryKey) return undefined;
    const currentTree = queryClient.getQueryData<EstimateTreeNode[]>(areaTreeQueryKey);
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

  function enqueueRowUpdate(input: UpdateEstimateRowInput) {
    markSaving();
    const previousUpdate = rowUpdateQueuesRef.current[input.rowId] ?? Promise.resolve();
    const nextUpdate = previousUpdate
      .catch(() => undefined)
      .then(() => updateMutation.mutateAsync(withMutationIdentity(input)));
    rowUpdateQueuesRef.current[input.rowId] = nextUpdate;
    void nextUpdate.catch(() => undefined).then(() => {
      if (rowUpdateQueuesRef.current[input.rowId] === nextUpdate) delete rowUpdateQueuesRef.current[input.rowId];
    });
  }

  return {
    saveState,
    markRowDirty,
    fetchTree: fetchEstimateTree,
    insertRow: (input: InsertEstimateRowInput) => insertMutation.mutate(withInsertMutationIdentity(input)),
    replaceRow: (input: ReplaceEstimateRowInput) => replaceMutation.mutate(withMutationIdentity(input)),
    detachRow: (input: DetachEstimateRowInput) => detachMutation.mutate(withMutationIdentity(input)),
    deleteRow: (input: DeleteEstimateRowInput) => deleteMutation.mutate(withMutationIdentity(input)),
    updateRow: enqueueRowUpdate,
  };
}
