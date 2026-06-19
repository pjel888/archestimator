import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { favoritesQueryKeys } from "@/lib/favorites/query-keys";
import type { MainSidebarFavoriteProject } from "@/components/sidebar/sidebar-types";
import { useSidebarFavoritesQuery } from "@/hooks/use-sidebar-favorites-query";
import { fetchSidebarFavoriteProjects } from "@/lib/favorites/sidebar-favorites-actions";

vi.mock("@/lib/favorites/sidebar-favorites-actions", () => ({
  fetchSidebarFavoriteProjects: vi.fn(async () => [] as MainSidebarFavoriteProject[]),
}));
const fetchSidebarFavoriteProjectsMock = vi.mocked(fetchSidebarFavoriteProjects);
const project = (id: string): MainSidebarFavoriteProject => ({
  id, name: `Project ${id}`, projectCode: null, href: `/workshop/projects/${id}`,
  favoriteCreatedAt: "2026-06-16T00:00:00.000Z", favoriteEstimateSheets: [],
});
const wrap = (client: QueryClient) => {
  function QueryClientWrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
  }
  return QueryClientWrapper;
};

beforeEach(() => {
  fetchSidebarFavoriteProjectsMock.mockReset();
  fetchSidebarFavoriteProjectsMock.mockResolvedValue([]);
});

describe("useSidebarFavoritesQuery", () => {
  it("paints initialData synchronously", () => {
    const client = new QueryClient();
    const initialData = [project("p1")];
    const { result } = renderHook(
      () => useSidebarFavoritesQuery({ scope: { workspaceId: "ws-1", userId: "u-1" }, initialData }),
      { wrapper: wrap(client) });
    expect(result.current.data).toEqual(initialData);
  });
  it("does NOT refetch on mount — SSR initialData is treated as fresh within staleTime", async () => {
    // The SSR seed (initialData) is already server-truth for this navigation, so a mount refetch
    // would just re-do the work SSR did. A non-zero staleTime suppresses it (perf: one server
    // action round-trip saved per workshop navigation).
    const client = new QueryClient();
    fetchSidebarFavoriteProjectsMock.mockResolvedValue([project("p1"), project("p2")]);
    const { result } = renderHook(
      () => useSidebarFavoritesQuery({ scope: { workspaceId: "ws-1", userId: "u-1" }, initialData: [project("p1")] }),
      { wrapper: wrap(client) });
    expect(result.current.data?.map((entry) => entry.id)).toEqual(["p1"]); // initialData paints
    await Promise.resolve(); // flush a microtask — a mount refetch would have fired here
    expect(fetchSidebarFavoriteProjectsMock).not.toHaveBeenCalled();
  });
  it("reconciles to server truth when explicitly invalidated (the favorite-toggle path bypasses staleTime)", async () => {
    // Favorite/unfavorite reflection survives the staleTime bump: the toggle's onSettled
    // invalidateQueries ignores staleTime and forces a refetch. Simulate that here.
    const client = new QueryClient();
    const serverTruth = [project("p1"), project("p2")];
    fetchSidebarFavoriteProjectsMock.mockResolvedValue(serverTruth);
    const scope = { workspaceId: "ws-1", userId: "u-1" };
    const { result } = renderHook(
      () => useSidebarFavoritesQuery({ scope, initialData: [project("p1")] }),
      { wrapper: wrap(client) });
    expect(result.current.data?.map((entry) => entry.id)).toEqual(["p1"]); // initialData paints first
    await client.invalidateQueries({ queryKey: favoritesQueryKeys.sidebar(scope) });
    await waitFor(() => expect(fetchSidebarFavoriteProjectsMock).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(result.current.data?.map((entry) => entry.id)).toEqual(["p1", "p2"]));
  });
  it("does not refetch when disabled (null-scope loading shell reads initialData only)", async () => {
    const client = new QueryClient();
    const { result } = renderHook(
      () => useSidebarFavoritesQuery({ scope: { workspaceId: "none", userId: "none" }, initialData: [project("p1")], enabled: false }),
      { wrapper: wrap(client) });
    expect(result.current.data?.map((entry) => entry.id)).toEqual(["p1"]); // paints initialData
    await Promise.resolve(); // flush a microtask — a junk-key refetch would have fired here
    expect(fetchSidebarFavoriteProjectsMock).not.toHaveBeenCalled();
  });
  it("evicts the previous scope's cache entry on scope change", async () => {
    // Never-resolving reconcile so a late refetch can't repopulate either key — assert the
    // eviction OUTCOME (entry gone), not merely that removeQueries was called.
    fetchSidebarFavoriteProjectsMock.mockReturnValue(new Promise<MainSidebarFavoriteProject[]>(() => {}));
    const client = new QueryClient();
    const removeSpy = vi.spyOn(client, "removeQueries");
    const previousKey = favoritesQueryKeys.sidebar({ workspaceId: "ws-1", userId: "u-1" });
    const { rerender } = renderHook(
      ({ workspaceId, userId }: { workspaceId: string; userId: string }) =>
        useSidebarFavoritesQuery({ scope: { workspaceId, userId }, initialData: [project("p1")] }),
      { wrapper: wrap(client), initialProps: { workspaceId: "ws-1", userId: "u-1" } });
    expect(client.getQueryData(previousKey)).toEqual([project("p1")]); // seeded before the switch
    rerender({ workspaceId: "ws-2", userId: "u-1" });
    // Outcome: the previous scope's entry is gone (does not linger for gcTime).
    await waitFor(() => expect(client.getQueryData(previousKey)).toBeUndefined());
    expect(removeSpy).toHaveBeenCalledWith({ queryKey: previousKey }); // secondary: evicted via prev key
  });
});
