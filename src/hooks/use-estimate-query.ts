import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useCallback, useMemo } from "react";
import type { EstimateTreeNode } from "@/components/workshop/estimate-tree-data";
import { moveEstimateRowItem, type MoveEstimateRowItemInput } from "@/lib/domain/estimate-mutations";
import type { EstimateTree } from "@/lib/domain/estimate-tree";
import { fetchEstimateTabTree, fetchEstimateTree } from "@/lib/estimates/actions";
import { estimateRepository } from "@/lib/repositories/estimate-repository";

export const estimateQueryKeys = {
  detail: (estimateId: string) => ["estimate", estimateId] as const,
  tabs: (estimateId: string) => ["estimate", estimateId, "tabs"] as const,
  tabTree: (estimateId: string, tabId: string) => ["estimate", estimateId, "tab", tabId, "area-tree"] as const,
  areaTree: (estimateId: string) => ["estimate", estimateId, "area-tree"] as const,
};

export function useEstimateQuery(estimateId: string) {
  return useQuery({
    queryKey: estimateQueryKeys.detail(estimateId),
    queryFn: () => estimateRepository.getEstimateTree(estimateId),
  });
}

export function useEstimateAreaTreeQuery({
  projectId,
  estimateId,
  initialNodes,
  refetchOnWindowFocus = false,
}: {
  projectId?: string;
  estimateId?: string;
  initialNodes: EstimateTreeNode[];
  refetchOnWindowFocus?: boolean;
}) {
  const queryClient = useQueryClient();
  const queryKey = useMemo(() => estimateQueryKeys.areaTree(estimateId ?? "local-estimate"), [estimateId]);
  const revisionKey = useMemo(() => [...queryKey, "revision"] as const, [queryKey]);
  const query = useQuery({
    queryKey,
    queryFn: () => (projectId && estimateId ? fetchEstimateTree({ projectId, estimateId }) : Promise.resolve(initialNodes)),
    initialData: initialNodes,
    enabled: Boolean(projectId && estimateId),
    refetchOnWindowFocus,
    staleTime: 5 * 60_000,
  });
  const tree = query.data ?? initialNodes;
  const getTreeRevision = useCallback(() => queryClient.getQueryData<number>(revisionKey) ?? 0, [queryClient, revisionKey]);
  const bumpTreeRevision = useCallback(() => {
    let nextRevision = 0;
    queryClient.setQueryData<number>(revisionKey, (currentRevision = 0) => {
      nextRevision = currentRevision + 1;
      return nextRevision;
    });
    return nextRevision;
  }, [queryClient, revisionKey]);
  const setTree = useCallback((nextTree: EstimateTreeNode[] | ((currentTree: EstimateTreeNode[]) => EstimateTreeNode[])) => {
    let didChange = false;
    queryClient.setQueryData<EstimateTreeNode[]>(queryKey, (currentTree) => {
      const baseTree = currentTree ?? tree;
      const resolvedTree = typeof nextTree === "function" ? nextTree(baseTree) : nextTree;
      didChange = resolvedTree !== baseTree;
      return resolvedTree;
    });
    return didChange ? bumpTreeRevision() : getTreeRevision();
  }, [bumpTreeRevision, getTreeRevision, queryClient, queryKey, tree]);
  const snapshot = useCallback(() => queryClient.getQueryData<EstimateTreeNode[]>(queryKey) ?? tree, [queryClient, queryKey, tree]);
  const restore = useCallback((previousTree: EstimateTreeNode[], expectedRevision?: number) => {
    if (expectedRevision !== undefined && getTreeRevision() !== expectedRevision) return false;
    queryClient.setQueryData(queryKey, previousTree);
    bumpTreeRevision();
    return true;
  }, [bumpTreeRevision, getTreeRevision, queryClient, queryKey]);
  const prepareOptimisticUpdate = useCallback(async () => {
    await queryClient.cancelQueries({ queryKey });
    return queryClient.getQueryData<EstimateTreeNode[]>(queryKey) ?? tree;
  }, [queryClient, queryKey, tree]);

  return { ...query, data: tree, tree, queryKey, setTree, snapshot, restore, getTreeRevision, prepareOptimisticUpdate };
}

export function useEstimateTabTreeQuery({
  projectId,
  estimateId,
  tabId,
  initialNodes,
  refetchOnWindowFocus = false,
}: {
  projectId?: string;
  estimateId?: string;
  tabId?: string;
  initialNodes: EstimateTreeNode[];
  refetchOnWindowFocus?: boolean;
}) {
  const queryClient = useQueryClient();
  const queryKey = useMemo(() => estimateQueryKeys.tabTree(estimateId ?? "local-estimate", tabId ?? "local-tab"), [estimateId, tabId]);
  const revisionKey = useMemo(() => [...queryKey, "revision"] as const, [queryKey]);
  const query = useQuery({
    queryKey,
    queryFn: () => (projectId && estimateId && tabId ? fetchEstimateTabTree({ projectId, estimateId, tabId }) : Promise.resolve(initialNodes)),
    initialData: initialNodes,
    enabled: Boolean(projectId && estimateId && tabId),
    refetchOnWindowFocus,
    staleTime: 5 * 60_000,
  });
  const tree = query.data ?? initialNodes;
  const getTreeRevision = useCallback(() => queryClient.getQueryData<number>(revisionKey) ?? 0, [queryClient, revisionKey]);
  const bumpTreeRevision = useCallback(() => {
    let nextRevision = 0;
    queryClient.setQueryData<number>(revisionKey, (currentRevision = 0) => {
      nextRevision = currentRevision + 1;
      return nextRevision;
    });
    return nextRevision;
  }, [queryClient, revisionKey]);
  const setTree = useCallback((nextTree: EstimateTreeNode[] | ((currentTree: EstimateTreeNode[]) => EstimateTreeNode[])) => {
    let didChange = false;
    queryClient.setQueryData<EstimateTreeNode[]>(queryKey, (currentTree) => {
      const baseTree = currentTree ?? tree;
      const resolvedTree = typeof nextTree === "function" ? nextTree(baseTree) : nextTree;
      didChange = resolvedTree !== baseTree;
      return resolvedTree;
    });
    return didChange ? bumpTreeRevision() : getTreeRevision();
  }, [bumpTreeRevision, getTreeRevision, queryClient, queryKey, tree]);
  const snapshot = useCallback(() => queryClient.getQueryData<EstimateTreeNode[]>(queryKey) ?? tree, [queryClient, queryKey, tree]);
  const restore = useCallback((previousTree: EstimateTreeNode[], expectedRevision?: number) => {
    if (expectedRevision !== undefined && getTreeRevision() !== expectedRevision) return false;
    queryClient.setQueryData(queryKey, previousTree);
    bumpTreeRevision();
    return true;
  }, [bumpTreeRevision, getTreeRevision, queryClient, queryKey]);
  const prepareOptimisticUpdate = useCallback(async () => {
    await queryClient.cancelQueries({ queryKey });
    return queryClient.getQueryData<EstimateTreeNode[]>(queryKey) ?? tree;
  }, [queryClient, queryKey, tree]);

  return { ...query, data: tree, tree, queryKey, setTree, snapshot, restore, getTreeRevision, prepareOptimisticUpdate };
}

export function useMoveEstimateRowItem(estimateId: string) {
  const queryClient = useQueryClient();
  const queryKey = estimateQueryKeys.detail(estimateId);

  return useMutation({
    mutationFn: (input: MoveEstimateRowItemInput) => estimateRepository.moveEstimateRowItem(estimateId, input),
    onMutate: async (input) => {
      await queryClient.cancelQueries({ queryKey });
      const previous = queryClient.getQueryData<EstimateTree>(queryKey);
      if (previous) queryClient.setQueryData(queryKey, moveEstimateRowItem(previous, input));
      return { previous };
    },
    onError: (_error, _input, context) => {
      if (context?.previous) queryClient.setQueryData(queryKey, context.previous);
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey }),
  });
}
