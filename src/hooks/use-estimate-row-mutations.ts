"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";

import type { EstimateRowItem } from "@/components/workshop/estimate-tree-data";
import { deleteEstimateRowItem, fetchEstimateTree, insertEstimateRowItemFromLibrary, replaceEstimateRowItemWithLibrary, updateEstimateRowItem } from "@/lib/estimates/actions";
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
  supplementaryCosts?: number;
  laborCost?: number;
  discipline?: string;
  designation?: string;
  rollback?: () => void;
};

type RollbackInput = {
  estimateId: string;
  rowId: string;
  rollback?: () => void;
};

function useSaveState() {
  const [saveState, setSaveState] = useState<EstimateSaveState>("idle");
  const [rowSaveStates, setRowSaveStates] = useState<Record<string, EstimateSaveState>>({});

  function markRow(rowId: string, state: EstimateSaveState) {
    setRowSaveStates((current) => ({ ...current, [rowId]: state }));
  }

  function markRowDirty(rowId: string) {
    markRow(rowId, "dirty");
  }

  function markSaving(rowId?: string) {
    setSaveState("saving");
    if (rowId) markRow(rowId, "saving");
  }

  function markSaved(rowId?: string) {
    setSaveState("saved");
    if (rowId) markRow(rowId, "saved");
  }

  function markFailed(rowId?: string) {
    setSaveState("failed");
    if (rowId) markRow(rowId, "failed");
  }

  return { saveState, rowSaveStates, markRowDirty, markSaving, markSaved, markFailed };
}

function withoutRollback<T extends { rollback?: () => void }>(input: T): Omit<T, "rollback"> {
  const next = { ...input };
  delete next.rollback;
  return next;
}

export function useEstimateRowMutations(estimateId?: string) {
  const queryClient = useQueryClient();
  const { saveState, rowSaveStates, markRowDirty, markSaving, markSaved, markFailed } = useSaveState();
  const detailQueryKey = estimateId ? estimateQueryKeys.detail(estimateId) : undefined;
  const areaTreeQueryKey = estimateId ? estimateQueryKeys.areaTree(estimateId) : undefined;

  const mutationOptions = useMemo(
    () => ({
      onMutate: (input: RollbackInput) => markSaving(input.rowId),
      onSuccess: (_result: void, input: RollbackInput) => {
        markSaved(input.rowId);
        void queryClient.invalidateQueries({ queryKey: estimateQueryKeys.areaTree(input.estimateId), refetchType: "active" });
        if (detailQueryKey) void queryClient.invalidateQueries({ queryKey: detailQueryKey });
      },
      onError: (_error: Error, input: RollbackInput) => {
        input.rollback?.();
        markFailed(input.rowId);
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
    ...mutationOptions,
  });

  return {
    saveState,
    rowSaveStates,
    markRowDirty,
    fetchTree: fetchEstimateTree,
    insertRow: insertMutation.mutate,
    replaceRow: replaceMutation.mutate,
    deleteRow: deleteMutation.mutate,
    updateRow: updateMutation.mutate,
  };
}
