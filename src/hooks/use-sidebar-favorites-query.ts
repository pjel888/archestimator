"use client";
import { useEffect, useRef } from "react";
import { useQuery, useQueryClient, type UseQueryResult } from "@tanstack/react-query";
import type { MainSidebarFavoriteProject } from "@/components/sidebar/sidebar-types";
import { favoritesQueryKeys } from "@/lib/favorites/query-keys";
import { fetchSidebarFavoriteProjects } from "@/lib/favorites/sidebar-favorites-actions";

type SidebarFavoritesScope = { workspaceId: string; userId: string };

export function useSidebarFavoritesQuery(args: {
  scope: SidebarFavoritesScope; initialData: MainSidebarFavoriteProject[]; enabled?: boolean;
}): UseQueryResult<MainSidebarFavoriteProject[]> {
  const { scope, initialData, enabled = true } = args;
  const queryClient = useQueryClient();

  // D12 / C4: a key change alone does NOT evict the old entry (lingers gcTime, 5 min).
  const previousScopeRef = useRef(scope);
  useEffect(() => {
    const previous = previousScopeRef.current;
    if (previous.workspaceId !== scope.workspaceId || previous.userId !== scope.userId) {
      queryClient.removeQueries({ queryKey: favoritesQueryKeys.sidebar(previous) });
      previousScopeRef.current = scope;
    }
  }, [queryClient, scope.workspaceId, scope.userId, scope]);

  return useQuery({
    queryKey: favoritesQueryKeys.sidebar(scope),
    queryFn: fetchSidebarFavoriteProjects,
    initialData,
    staleTime: 0, // D4: override global 5-min so remount + onSettled invalidation refetch
    enabled, // null-scope loading shells/unauth read initialData without a junk-key refetch
  });
}
