import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { favoritesQueryKeys } from "@/lib/favorites/query-keys";
import type { MainSidebarFavoriteProject } from "@/components/sidebar/sidebar-types";

const actions = vi.hoisted(() => ({ setProjectFavorite: vi.fn() }));
vi.mock("@/lib/workshop/actions", () => actions);
const scope = { workspaceId: "ws-1", userId: "user-1" };
const qcFactory = () => new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
const wrap = (qc: QueryClient) => ({ children }: { children: ReactNode }) => (<QueryClientProvider client={qc}>{children}</QueryClientProvider>);
const existing = (): MainSidebarFavoriteProject => ({ id: "p-existing", name: "Existing", projectCode: "EX-1",
  href: "/workshop/projects/p-existing/estimates", favoriteCreatedAt: "2026-06-01T00:00:00.000Z", favoriteEstimateSheets: [] });
const newInput = { project: { id: "p-new", name: "Harbor Tower", projectCode: "HT-9", href: "/workshop/projects/p-new/estimates", favoriteCreatedAt: null }, favorite: true } as const;
beforeEach(() => { vi.clearAllMocks(); actions.setProjectFavorite.mockResolvedValue(undefined); });

describe("useToggleProjectFavorite", () => {
  it("optimistically inserts into the scoped cache with a synthesized timestamp (sorts to top)", async () => {
    const qc = qcFactory(); qc.setQueryData(favoritesQueryKeys.sidebar(scope), [existing()]);
    const { useToggleProjectFavorite } = await import("@/hooks/use-toggle-project-favorite");
    const { result } = renderHook(() => useToggleProjectFavorite(scope), { wrapper: wrap(qc) });
    result.current.toggle(newInput);
    await waitFor(() => {
      const data = qc.getQueryData<MainSidebarFavoriteProject[]>(favoritesQueryKeys.sidebar(scope));
      expect(data?.[0]?.id).toBe("p-new");
      expect(data?.[0]?.favoriteCreatedAt).toEqual(expect.any(String));
    });
    expect(actions.setProjectFavorite).toHaveBeenCalledWith({ projectId: "p-new", favorite: true });
  });
  it("cancels in-flight refetches in onMutate", async () => {
    const qc = qcFactory(); qc.setQueryData(favoritesQueryKeys.sidebar(scope), [existing()]);
    const cancelSpy = vi.spyOn(qc, "cancelQueries");
    const { useToggleProjectFavorite } = await import("@/hooks/use-toggle-project-favorite");
    const { result } = renderHook(() => useToggleProjectFavorite(scope), { wrapper: wrap(qc) });
    result.current.toggle(newInput);
    await waitFor(() => expect(cancelSpy).toHaveBeenCalledWith({ queryKey: favoritesQueryKeys.sidebar(scope) }));
  });
  it("rolls the cache back to the snapshot on error", async () => {
    const qc = qcFactory(); qc.setQueryData(favoritesQueryKeys.sidebar(scope), [existing()]);
    actions.setProjectFavorite.mockRejectedValueOnce(new Error("boom"));
    const { useToggleProjectFavorite } = await import("@/hooks/use-toggle-project-favorite");
    const { result } = renderHook(() => useToggleProjectFavorite(scope), { wrapper: wrap(qc) });
    result.current.toggle(newInput);
    await waitFor(() => {
      const data = qc.getQueryData<MainSidebarFavoriteProject[]>(favoritesQueryKeys.sidebar(scope));
      expect(data).toHaveLength(1); expect(data?.[0]?.id).toBe("p-existing");
    });
  });
  it("invalidates the scoped key on settle", async () => {
    const qc = qcFactory(); qc.setQueryData(favoritesQueryKeys.sidebar(scope), [existing()]);
    const invSpy = vi.spyOn(qc, "invalidateQueries");
    const { useToggleProjectFavorite } = await import("@/hooks/use-toggle-project-favorite");
    const { result } = renderHook(() => useToggleProjectFavorite(scope), { wrapper: wrap(qc) });
    result.current.toggle(newInput);
    await waitFor(() => expect(invSpy).toHaveBeenCalledWith({ queryKey: favoritesQueryKeys.sidebar(scope) }));
  });
  it("never references router.refresh", async () => {
    const { readFileSync } = await import("node:fs");
    expect(readFileSync("src/hooks/use-toggle-project-favorite.ts", "utf8")).not.toContain("router.refresh");
  });
  it("projects-page-client toggleProjectFavorite no longer calls router.refresh (delete path preserved)", async () => {
    const { readFileSync } = await import("node:fs");
    const src = readFileSync("src/components/workshop/projects-page-client.tsx", "utf8");
    // Slice ONLY the favorite-toggle function body: from its declaration to the next
    // top-level `function ` declaration. This intentionally excludes the unrelated
    // delete path (executeProjectDeletePreview), which legitimately keeps router.refresh.
    const start = src.indexOf("function toggleProjectFavorite");
    expect(start).toBeGreaterThan(-1);
    const nextFn = src.indexOf("\n  function ", start + 1);
    expect(nextFn).toBeGreaterThan(start);
    const favoriteBody = src.slice(start, nextFn);
    expect(favoriteBody).not.toContain("router.refresh");
    // The delete path's router.refresh must survive elsewhere in the file (unrelated work).
    expect(src).toContain("router.refresh");
    // The favorite toggle is now routed through the shared optimistic hook.
    expect(src).toContain("useToggleProjectFavorite");
  });
});
