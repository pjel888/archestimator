import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";
import { favoritesQueryKeys } from "@/lib/favorites/query-keys";
import type { MainSidebarFavoriteProject } from "@/components/sidebar/sidebar-types";
import { useSidebarFavoritesQuery } from "@/hooks/use-sidebar-favorites-query";

vi.mock("@/lib/favorites/sidebar-favorites-actions", () => ({
  fetchSidebarFavoriteProjects: vi.fn(async () => [] as MainSidebarFavoriteProject[]),
}));
const project = (id: string): MainSidebarFavoriteProject => ({
  id, name: `Project ${id}`, projectCode: null, href: `/workshop/projects/${id}`,
  favoriteCreatedAt: "2026-06-16T00:00:00.000Z", favoriteEstimateSheets: [],
});
const wrap = (client: QueryClient) => ({ children }: { children: ReactNode }) => (
  <QueryClientProvider client={client}>{children}</QueryClientProvider>
);

describe("useSidebarFavoritesQuery", () => {
  it("paints initialData synchronously", () => {
    const client = new QueryClient();
    const initialData = [project("p1")];
    const { result } = renderHook(
      () => useSidebarFavoritesQuery({ scope: { workspaceId: "ws-1", userId: "u-1" }, initialData }),
      { wrapper: wrap(client) });
    expect(result.current.data).toEqual(initialData);
  });
  it("removeQueries-evicts the previous scope on scope change", async () => {
    const client = new QueryClient();
    const removeSpy = vi.spyOn(client, "removeQueries");
    const { rerender } = renderHook(
      ({ workspaceId, userId }: { workspaceId: string; userId: string }) =>
        useSidebarFavoritesQuery({ scope: { workspaceId, userId }, initialData: [project("p1")] }),
      { wrapper: wrap(client), initialProps: { workspaceId: "ws-1", userId: "u-1" } });
    rerender({ workspaceId: "ws-2", userId: "u-1" });
    await waitFor(() => expect(removeSpy).toHaveBeenCalledWith({
      queryKey: favoritesQueryKeys.sidebar({ workspaceId: "ws-1", userId: "u-1" }),
    }));
  });
});
