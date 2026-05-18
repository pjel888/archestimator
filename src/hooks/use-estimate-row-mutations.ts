"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";

import type { EstimateRowItem } from "@/components/workshop/estimate-tree-data";
import { deleteEstimateRowItem, insertEstimateRowItemFromLibrary, replaceEstimateRowItemWithLibrary, updateEstimateRowItem } from "@/lib/estimates/actions";
import { estimateQueryKeys } from "./use-estimate-query";

export type EstimateSaveState = "idle" | "saving" | "saved" | "failed";

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
  rollback?: () => void;
};

function useSaveState() {
  const [saveState, setSaveState] = useState<EstimateSaveState>("idle");

  function markSaving() {
    setSaveState("saving");
  }

  function markSaved() {
    setSaveState("saved");
  }

  function markFailed() {
    setSaveState("failed");
  }

  return { saveState, markSaving, markSaved, markFailed };
}

function withoutRollback<T extends { rollback?: () => void }>(input: T): Omit<T, "rollback"> {
  const next = { ...input };
  delete next.rollback;
  return next;
}

export function useEstimateRowMutations(estimateId?: string) {
  const queryClient = useQueryClient();
  const { saveState, markSaving, markSaved, markFailed } = useSaveState();
  const detailQueryKey = estimateId ? estimateQueryKeys.detail(estimateId) : undefined;
  const areaTreeQueryKey = estimateId ? estimateQueryKeys.areaTree(estimateId) : undefined;

  const mutationOptions = useMemo(
    () => ({
      onMutate: markSaving,
      onSuccess: (_result: void, input: RollbackInput) => {
        markSaved();
        void queryClient.invalidateQueries({ queryKey: estimateQueryKeys.areaTree(input.estimateId), refetchType: "none" });
        if (detailQueryKey) void queryClient.invalidateQueries({ queryKey: detailQueryKey });
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
    ...mutationOptions,
  });

  return {
    saveState,
    insertRow: insertMutation.mutate,
    replaceRow: replaceMutation.mutate,
    deleteRow: deleteMutation.mutate,
    updateRow: updateMutation.mutate,
  };
}
