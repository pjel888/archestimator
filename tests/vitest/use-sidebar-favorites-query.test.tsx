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
const wrap = (client: QueryClient) => ({ children }: { children: ReactNode }) => (
  <QueryClientProvider client={client}>{children}</QueryClientProvider>
);

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
  it("reconciles to server truth on mount because staleTime is 0", async () => {
    const client = new QueryClient();
    const serverTruth = [project("p1"), project("p2")];
    fetchSidebarFavoriteProjectsMock.mockResolvedValue(serverTruth);
    const { result } = renderHook(
      () => useSidebarFavoritesQuery({ scope: { workspaceId: "ws-1", userId: "u-1" }, initialData: [project("p1")] }),
      { wrapper: wrap(client) });
    expect(result.current.data?.map((entry) => entry.id)).toEqual(["p1"]); // initialData paints first
    await waitFor(() => expect(fetchSidebarFavoriteProjectsMock).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(result.current.data?.map((entry) => entry.id)).toEqual(["p1", "p2"]));
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
