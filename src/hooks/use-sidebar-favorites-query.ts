"use client";
import { useEffect, useRef } from "react";
import { useQuery, useQueryClient, type UseQueryResult } from "@tanstack/react-query";
import type { MainSidebarFavoriteProject } from "@/components/sidebar/sidebar-types";
import { favoritesQueryKeys } from "@/lib/favorites/query-keys";
import { fetchSidebarFavoriteProjects } from "@/lib/favorites/sidebar-favorites-actions";

type SidebarFavoritesScope = { workspaceId: string; userId: string };

export function useSidebarFavoritesQuery(args: {
  scope: SidebarFavoritesScope;
  initialData: MainSidebarFavoriteProject[];
  enabled?: boolean;
  initialDataFresh?: boolean;
}): UseQueryResult<MainSidebarFavoriteProject[]> {
  const { scope, initialData, enabled = true, initialDataFresh = true } = args;
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
    initialDataUpdatedAt: initialDataFresh ? undefined : 0,
    // D4 (revised): SSR-seeded callers pass fresh `initialData`, so a `staleTime: 0`
    // mount refetch just re-does the work SSR already did on every workshop navigation.
    // With no `initialDataUpdatedAt`, React Query ages initialData from mount, so a non-zero
    // staleTime treats the SSR seed as fresh and suppresses that redundant mount refetch.
    // Deferred shell callers pass `initialDataFresh: false` and control `enabled` separately
    // so the stale seed hydrates only after sidebar hover/focus/expand.
    // Favorite/unfavorite STILL reflect instantly: the toggle's onSettled invalidateQueries
    // (use-toggle-project-favorite.ts) bypasses staleTime and always refetches. Cross-tab /
    // cross-route changes reconcile within this window (acceptable, low-stakes).
    staleTime: 30_000,
    enabled, // null-scope loading shells/unauth read initialData without a junk-key refetch
  });
}
