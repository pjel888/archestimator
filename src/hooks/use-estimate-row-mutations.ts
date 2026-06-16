"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useMemo, useRef, useState } from "react";

import type { EstimateRowItem, EstimateTreeNode } from "@/components/workshop/estimate-tree-data";
import { WORKSPACE_COMPONENT_LIBRARY_QUERY_KEY, WORKSPACE_COMPONENT_ROWS_LIBRARY_QUERY_KEY } from "@/lib/component-library/query-keys";
import type { Json } from "@/lib/supabase/types";
import { deleteEstimateRowItem, detachEstimateRowItemFromLibrary, fetchEstimateTree, insertEstimateRowItemFromLibrary, replaceEstimateRowItemWithLibrary, updateEstimateRowItem, type UpdateEstimateRowItemResult } from "@/lib/estimates/actions";
import { promoteEstimateRowToLibraryComponent, type PromoteEstimateRowToLibraryComponentResult } from "@/lib/estimates/express-promotion-actions";
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
  onSuccess?: (result: UpdateEstimateRowItemResult | undefined) => void;
  onError?: (error: Error) => void;
};

type ReplaceEstimateRowInput = SharedMutationInput & {
  rowId: string;
  libraryItem: EstimateRowItem;
  mutationId?: string;
  expectedRowRevision?: number;
  rollback?: () => void;
  onSuccess?: () => void;
};

type DeleteEstimateRowInput = SharedMutationInput & {
  rowId: string;
  mutationId?: string;
  expectedRowRevision?: number;
  rollback?: () => void;
  onSuccess?: () => void;
};

type DetachEstimateRowInput = SharedMutationInput & {
  rowId: string;
  mutationId?: string;
  expectedRowRevision?: number;
  reason?: string;
  rollback?: () => void;
  onSuccess?: (result: UpdateEstimateRowItemResult) => void;
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
  contingencyPercentage?: number;
  miscCost?: number;
  sourceSnapshot?: Json | null;
  metadata?: EstimateRowItem["metadata"];
  mutationId?: string;
  expectedRowRevision?: number;
  rollback?: () => void;
  onSuccess?: (result: UpdateEstimateRowItemResult) => void;
};

type RollbackInput = {
  estimateId: string;
  rowId: string;
  rollback?: () => void;
  onSuccess?: () => void;
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
    ...(input.contingencyPercentage !== undefined ? { contingencyPercentage: input.contingencyPercentage } : {}),
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
    ...(input.contingencyPercentage !== undefined ? { contingencyPercentage: result.contingencyPercentage } : {}),
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

function withoutClientCallbacks<T extends { onError?: unknown; onSuccess?: unknown; rollback?: () => void }>(input: T): Omit<T, "onError" | "onSuccess" | "rollback"> {
  const next = { ...input };
  delete next.onError;
  delete next.onSuccess;
  delete next.rollback;
  return next;
}

export function useEstimateRowMutations(estimateId?: string, estimateTabId?: string) {
  const queryClient = useQueryClient();
  const { saveState, markRowDirty, markSaving, markSaved, markFailed } = useSaveState();
  const rowOperationIdsRef = useRef<Record<string, number>>({});
  const rowUpdateQueuesRef = useRef<Record<string, Promise<unknown>>>({});
  const detailQueryKey = estimateId ? estimateQueryKeys.detail(estimateId) : undefined;
  const treeQueryKey = estimateId ? (estimateTabId ? estimateQueryKeys.tabTree(estimateId, estimateTabId) : estimateQueryKeys.areaTree(estimateId)) : undefined;

  const mutationOptions = useMemo(
    () => ({
      onMutate: () => markSaving(),
      onSuccess: (_result: unknown, input: RollbackInput) => {
        markSaved();
        input.onSuccess?.();
        void queryClient.invalidateQueries({ queryKey: estimateTabId ? estimateQueryKeys.tabTree(input.estimateId, estimateTabId) : estimateQueryKeys.areaTree(input.estimateId), refetchType: "none" });
        if (detailQueryKey) void queryClient.invalidateQueries({ queryKey: detailQueryKey, refetchType: "none" });
      },
      onError: (_error: Error, input: RollbackInput) => {
        input.rollback?.();
        markFailed();
        if (treeQueryKey) void queryClient.invalidateQueries({ queryKey: treeQueryKey, refetchType: "none" });
      },
    }),
    [detailQueryKey, estimateTabId, markFailed, markSaved, markSaving, queryClient, treeQueryKey],
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
      markFailed();
      if (treeQueryKey) void queryClient.invalidateQueries({ queryKey: treeQueryKey, refetchType: "none" });
    },
  });

  const replaceMutation = useMutation({
    mutationFn: (input: ReplaceEstimateRowInput) => replaceEstimateRowItemWithLibrary(withoutClientCallbacks(input)),
    ...mutationOptions,
  });

  const deleteMutation = useMutation({
    mutationFn: (input: DeleteEstimateRowInput) => deleteEstimateRowItem(withoutClientCallbacks(input)),
    ...mutationOptions,
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
      input.onSuccess?.(result);
    },
    onError: (_error: Error, input, context) => {
      const queryKey = estimateTabId ? estimateQueryKeys.tabTree(input.estimateId, estimateTabId) : estimateQueryKeys.areaTree(input.estimateId);
      if (context?.previousPatch) {
        queryClient.setQueryData<EstimateTreeNode[]>(queryKey, (currentTree) =>
          currentTree ? patchEstimateRowItemInTree(currentTree, input.rowId, context.previousPatch ?? {}) : currentTree,
        );
      } else input.rollback?.();
      markFailed();
      void queryClient.invalidateQueries({ queryKey, refetchType: "none" });
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
      void queryClient.invalidateQueries({ queryKey: WORKSPACE_COMPONENT_LIBRARY_QUERY_KEY, refetchType: "active" });
      void queryClient.invalidateQueries({ queryKey: WORKSPACE_COMPONENT_ROWS_LIBRARY_QUERY_KEY, refetchType: "active" });
      input.onSuccess?.(result);
    },
    onError: (error: Error, input) => {
      input.rollback?.();
      input.onError?.(error);
      markFailed();
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
            ...(input.contingencyPercentage !== undefined ? { contingencyPercentage: previousRow.contingencyPercentage ?? 0 } : {}),
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
      markFailed();
      void queryClient.invalidateQueries({ queryKey, refetchType: "none" });
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
    promoteRow: (input: PromoteEstimateRowInput) => promoteMutation.mutate({
      ...input,
      mutationId: input.mutationId ?? createMutationId(),
    }),
    deleteRow: (input: DeleteEstimateRowInput) => deleteMutation.mutate(withMutationIdentity(input)),
    updateRow: enqueueRowUpdate,
  };
}
