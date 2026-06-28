"use client";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { setEstimateFavorite } from "@/lib/workshop/actions";
import { favoritesQueryKeys } from "@/lib/favorites/query-keys";
import { patchSidebarFavoritesCache } from "@/lib/favorites/sidebar-favorites-cache";
import type { MainSidebarFavoriteProject } from "@/components/sidebar/sidebar-types";
import type { ProjectEstimatesStore } from "@/stores/project-estimates-store";

export type ToggleEstimateFavoriteInput = {
  estimate: { id: string; projectId: string; name: string; sheetCode: string | null; href: string; favoriteCreatedAt: string | null };
  project: {
    id: string;
    name: string;
    projectCode: string | null;
    href: string;
    isSidebarFavorite: boolean;
    projectFavoriteCreatedAt?: string | null;
  };
  favorite: boolean;
  store?: ProjectEstimatesStore;
};
type Scope = { workspaceId: string; userId: string };
type Ctx = { previousSidebar: MainSidebarFavoriteProject[] | undefined; previousRow: { isFavorite: boolean; favoriteCreatedAt: string | null } | null };
type ToggleCallbacks = { onSuccess?: () => void; onError?: (error: unknown) => void; onSettled?: () => void };

export function useToggleEstimateFavorite(scope: Scope, announceCue?: () => void) {
  const queryClient = useQueryClient();
  const key = favoritesQueryKeys.sidebar(scope);
  const mutation = useMutation<void, unknown, ToggleEstimateFavoriteInput, Ctx>({
    mutationFn: (input) => setEstimateFavorite({ estimateId: input.estimate.id, favorite: input.favorite }),
    onMutate: (input) => {
      // Fire cancellation to abort any in-flight refetch (race-safety, latest-intent-wins).
      // onMutate stays synchronous: the optimistic surfaces update in the same tick as the
      // intent (no stale frame), and the mutationFn is not deferred behind an extra microtask.
      void queryClient.cancelQueries({ queryKey: key });
      const previousSidebar = queryClient.getQueryData<MainSidebarFavoriteProject[]>(key);
      const row = input.store?.getState().estimates.find((e) => e.id === input.estimate.id);
      const previousRow = row ? { isFavorite: row.isFavorite, favoriteCreatedAt: row.favoriteCreatedAt } : null;
      const synthesizedAt = new Date().toISOString(); // D11
      if (previousSidebar) {
        queryClient.setQueryData<MainSidebarFavoriteProject[]>(key, patchSidebarFavoritesCache(previousSidebar,
          input.favorite
            ? { kind: "estimate-insert", parent: {
                id: input.project.id,
                name: input.project.name,
                projectCode: input.project.projectCode,
                href: input.project.href,
                projectFavoriteCreatedAt: input.project.projectFavoriteCreatedAt ?? (input.project.isSidebarFavorite ? synthesizedAt : null),
              },
                sheet: { id: input.estimate.id, projectId: input.estimate.projectId, name: input.estimate.name, sheetCode: input.estimate.sheetCode, href: input.estimate.href },
                createdAt: synthesizedAt }
            : { kind: "estimate-remove", parentId: input.project.id, sheetId: input.estimate.id }));
      }
      // Cue only when the parent project itself is not favorited; the sidebar now
      // still creates a project grouping for the favorite sheet.
      if (!input.project.isSidebarFavorite) announceCue?.();
      input.store?.getState().patch(input.estimate.id, { isFavorite: input.favorite, favoriteCreatedAt: input.favorite ? synthesizedAt : null });
      return { previousSidebar, previousRow };
    },
    onError: (_e, input, ctx) => {
      if (ctx?.previousSidebar !== undefined) queryClient.setQueryData(key, ctx.previousSidebar);
      if (ctx?.previousRow) input.store?.getState().patch(input.estimate.id, { isFavorite: ctx.previousRow.isFavorite, favoriteCreatedAt: ctx.previousRow.favoriteCreatedAt });
    },
    onSettled: () => { void queryClient.invalidateQueries({ queryKey: key }); },
  });
  return { toggle: (input: ToggleEstimateFavoriteInput, options?: ToggleCallbacks) => mutation.mutate(input, options), isPending: mutation.isPending };
}
