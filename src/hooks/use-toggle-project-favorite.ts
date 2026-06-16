"use client";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { favoritesQueryKeys } from "@/lib/favorites/query-keys";
import { patchSidebarFavoritesCache } from "@/lib/favorites/sidebar-favorites-cache";
import { setProjectFavorite } from "@/lib/workshop/actions";
import type { MainSidebarFavoriteProject } from "@/components/sidebar/sidebar-types";

export type ToggleProjectFavoriteInput = {
  project: { id: string; name: string; projectCode: string | null; href: string; favoriteCreatedAt: string | null };
  favorite: boolean;
};
type Scope = { workspaceId: string; userId: string };
type Snapshot = { previousSidebar: MainSidebarFavoriteProject[] | undefined };
type ToggleCallbacks = { onSuccess?: () => void; onError?: (error: unknown) => void; onSettled?: () => void };

export function useToggleProjectFavorite(scope: Scope) {
  const queryClient = useQueryClient();
  const key = favoritesQueryKeys.sidebar(scope);
  const mutation = useMutation<void, unknown, ToggleProjectFavoriteInput, Snapshot>({
    mutationFn: ({ project, favorite }) => setProjectFavorite({ projectId: project.id, favorite }),
    onMutate: ({ project, favorite }) => {
      // Fire cancellation to abort any in-flight refetch (race-safety, latest-intent-wins).
      // onMutate stays synchronous so the optimistic surface updates in the same tick as the
      // intent (no stale frame) and the mutationFn is not deferred behind an extra microtask.
      void queryClient.cancelQueries({ queryKey: key });
      const previousSidebar = queryClient.getQueryData<MainSidebarFavoriteProject[]>(key);
      queryClient.setQueryData<MainSidebarFavoriteProject[]>(key, (prev) =>
        patchSidebarFavoritesCache(prev, favorite
          ? { kind: "project-insert", project: {
              id: project.id, name: project.name, projectCode: project.projectCode, href: project.href,
              favoriteCreatedAt: project.favoriteCreatedAt ?? new Date().toISOString() } } // D11
          : { kind: "project-remove", projectId: project.id }));
      return { previousSidebar };
    },
    onError: (_e, _input, ctx) => { if (ctx) queryClient.setQueryData(key, ctx.previousSidebar); }, // 11 §4.3 (sidebar half)
    onSettled: () => { void queryClient.invalidateQueries({ queryKey: key }); },
  });
  return { toggle: (input: ToggleProjectFavoriteInput, options?: ToggleCallbacks) => mutation.mutate(input, options), isPending: mutation.isPending };
}
