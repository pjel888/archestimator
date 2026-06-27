import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useCallback, useMemo } from "react";
import type { EstimateTreeNode } from "@/components/workshop/estimate-tree-data";
import { fetchEstimateEditCapability, fetchEstimateTabs, fetchEstimateTabTree, fetchEstimateTree } from "@/lib/estimates/actions";
import type { EstimateTabSummary } from "@/lib/estimates/types";

export const estimateQueryKeys = {
  detail: (estimateId: string) => ["estimate", estimateId] as const,
  tabs: (estimateId: string) => ["estimate", estimateId, "tabs"] as const,
  editCapability: (estimateId: string) => ["estimate", estimateId, "edit-capability"] as const,
  tabTree: (estimateId: string, tabId: string) => ["estimate", estimateId, "tab", tabId, "area-tree"] as const,
  // legacy areaTree key kept for compatibility; see plan 2026-06-12 §01-17
  areaTree: (estimateId: string) => ["estimate", estimateId, "area-tree"] as const,
};

export function useEstimateAreaTreeQuery({
  projectId,
  estimateId,
  initialNodes,
  refetchOnWindowFocus = false,
  enabled = true,
}: {
  projectId?: string;
  estimateId?: string;
  initialNodes: EstimateTreeNode[];
  refetchOnWindowFocus?: boolean;
  enabled?: boolean;
}) {
  const queryClient = useQueryClient();
  const queryKey = useMemo(() => estimateQueryKeys.areaTree(estimateId ?? "local-estimate"), [estimateId]);
  const revisionKey = useMemo(() => [...queryKey, "revision"] as const, [queryKey]);
  const { data, ...query } = useQuery({
    queryKey,
    queryFn: () => (projectId && estimateId ? fetchEstimateTree({ projectId, estimateId }) : Promise.resolve(initialNodes)),
    initialData: initialNodes,
    enabled: enabled && Boolean(projectId && estimateId),
    refetchOnMount: false,
    refetchOnWindowFocus,
    staleTime: 5 * 60_000,
  });
  const tree = data ?? initialNodes;
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
  enabled = true,
}: {
  projectId?: string;
  estimateId?: string;
  tabId?: string;
  initialNodes?: EstimateTreeNode[];
  refetchOnWindowFocus?: boolean;
  enabled?: boolean;
}) {
  const queryClient = useQueryClient();
  const queryKey = useMemo(() => estimateQueryKeys.tabTree(estimateId ?? "local-estimate", tabId ?? "local-tab"), [estimateId, tabId]);
  const revisionKey = useMemo(() => [...queryKey, "revision"] as const, [queryKey]);
  const fallbackInitialNodes = initialNodes ?? [];
  const { data, ...query } = useQuery({
    queryKey,
    queryFn: () => (projectId && estimateId && tabId ? fetchEstimateTabTree({ projectId, estimateId, tabId }) : Promise.resolve(fallbackInitialNodes)),
    initialData: initialNodes,
    enabled: enabled && Boolean(projectId && estimateId && tabId),
    refetchOnMount: false,
    refetchOnWindowFocus,
    staleTime: 5 * 60_000,
  });
  const tree = data ?? fallbackInitialNodes;
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

export function useEstimateTabsQuery({
  projectId,
  estimateId,
  initialTabs = [],
  enabled = true,
}: {
  projectId?: string;
  estimateId?: string;
  initialTabs?: EstimateTabSummary[];
  enabled?: boolean;
}) {
  const { data, ...query } = useQuery({
    queryKey: estimateQueryKeys.tabs(estimateId ?? "local-estimate"),
    queryFn: () => (projectId && estimateId ? fetchEstimateTabs({ projectId, estimateId }) : Promise.resolve(initialTabs)),
    initialData: initialTabs,
    enabled: enabled && Boolean(projectId && estimateId),
    // Tabs are server-seeded via initialData; matches the tree hooks above to
    // skip a wasted mount refetch (5-min staleTime keeps seeded data fresh).
    refetchOnMount: false,
    staleTime: 5 * 60_000,
  });

  return { ...query, data, tabs: data ?? initialTabs };
}

export function useEstimateEditCapabilityQuery({
  projectId,
  estimateId,
  initialCanEdit,
  enabled = true,
}: {
  projectId?: string;
  estimateId?: string;
  initialCanEdit?: boolean;
  enabled?: boolean;
}) {
  const { data, ...query } = useQuery({
    queryKey: estimateQueryKeys.editCapability(estimateId ?? "local-estimate"),
    queryFn: () => (projectId && estimateId ? fetchEstimateEditCapability({ projectId, estimateId }) : Promise.resolve(initialCanEdit === true)),
    initialData: initialCanEdit === true ? true : undefined,
    enabled: enabled && Boolean(projectId && estimateId),
    refetchOnMount: false,
    staleTime: 5 * 60_000,
  });

  return { ...query, data, canEditEstimate: data === true };
}
