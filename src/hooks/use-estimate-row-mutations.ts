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
};

type ReplaceEstimateRowInput = SharedMutationInput & {
  rowId: string;
  libraryItem: EstimateRowItem;
};

type DeleteEstimateRowInput = SharedMutationInput & {
  rowId: string;
};

type UpdateEstimateRowInput = SharedMutationInput & {
  rowId: string;
  quantity?: number;
  supplementaryCosts?: number;
  laborCost?: number;
  discipline?: string;
  designation?: string;
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

export function useEstimateRowMutations(estimateId?: string) {
  const queryClient = useQueryClient();
  const { saveState, markSaving, markSaved, markFailed } = useSaveState();
  const queryKey = estimateId ? estimateQueryKeys.detail(estimateId) : undefined;

  const mutationOptions = useMemo(
    () => ({
      onMutate: markSaving,
      onSuccess: () => {
        markSaved();
        if (queryKey) void queryClient.invalidateQueries({ queryKey });
      },
      onError: markFailed,
    }),
    [queryClient, queryKey, markSaving, markSaved, markFailed],
  );

  const insertMutation = useMutation({
    mutationFn: (input: InsertEstimateRowInput) => insertEstimateRowItemFromLibrary(input),
    ...mutationOptions,
  });

  const replaceMutation = useMutation({
    mutationFn: (input: ReplaceEstimateRowInput) => replaceEstimateRowItemWithLibrary(input),
    ...mutationOptions,
  });

  const deleteMutation = useMutation({
    mutationFn: (input: DeleteEstimateRowInput) => deleteEstimateRowItem(input),
    ...mutationOptions,
  });

  const updateMutation = useMutation({
    mutationFn: (input: UpdateEstimateRowInput) => updateEstimateRowItem(input),
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
