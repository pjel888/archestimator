import { act, renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { favoritesQueryKeys } from "@/lib/favorites/query-keys";
import { useToggleEstimateFavorite } from "@/hooks/use-toggle-estimate-favorite";
import { createProjectEstimatesStore } from "@/stores/project-estimates-store";
import type { MainSidebarFavoriteProject } from "@/components/sidebar/sidebar-types";

const actions = vi.hoisted(() => ({ setEstimateFavorite: vi.fn() }));
vi.mock("@/lib/workshop/actions", () => actions);
const SCOPE = { workspaceId: "ws-1", userId: "user-1" };
const makeRow = (o = {}) => ({ id: "est-1", project_id: "p1", name: "Concept Budget", sheet_code: "ES-001",
  currency_code: "PHP", notes: null, project_budget: null, created_at: "2026-06-01T00:00:00.000Z",
  updated_at: "2026-06-01T00:00:00.000Z", firstNodeId: null, nodeCount: 0, rowItemCount: 0,
  totalProjectCost: 0, isFavorite: false, favoriteCreatedAt: null, ...o });
const favoritedParent = (): MainSidebarFavoriteProject => ({ id: "p1", name: "Lewis Residence", projectCode: "AE-LR-001",
  href: "/workshop/projects/p1", favoriteCreatedAt: "2026-06-05T00:00:00.000Z", favoriteEstimateSheets: [] });
const wrap = (qc: QueryClient) => {
  function QueryClientWrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={qc}>{children}</QueryClientProvider>;
  }
  return QueryClientWrapper;
};
const baseInput = {
  estimate: { id: "est-1", projectId: "p1", name: "Concept Budget", sheetCode: "ES-001", href: "/workshop/projects/p1/estimates/est-1", favoriteCreatedAt: null },
  project: { id: "p1", name: "Lewis Residence", projectCode: "AE-LR-001", href: "/workshop/projects/p1", isSidebarFavorite: true },
  favorite: true,
};
let qc: QueryClient;
beforeEach(() => { vi.clearAllMocks(); qc = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } }); });

describe("useToggleEstimateFavorite", () => {
  it("optimistically inserts the sheet under a visible favorited parent AND patches the row store", async () => {
    actions.setEstimateFavorite.mockResolvedValue(undefined);
    qc.setQueryData(favoritesQueryKeys.sidebar(SCOPE), [favoritedParent()]);
    const store = createProjectEstimatesStore([makeRow()]);
    const { result } = renderHook(() => useToggleEstimateFavorite(SCOPE), { wrapper: wrap(qc) });
    act(() => result.current.toggle({ ...baseInput, store }));
    const cache = qc.getQueryData<MainSidebarFavoriteProject[]>(favoritesQueryKeys.sidebar(SCOPE))!;
    expect(cache[0].favoriteEstimateSheets[0].id).toBe("est-1");
    expect(cache[0].favoriteEstimateSheets[0].favoriteCreatedAt).toBeTypeOf("string");
    expect(store.getState().estimates.find((e) => e.id === "est-1")!.isFavorite).toBe(true);
    await waitFor(() => expect(actions.setEstimateFavorite).toHaveBeenCalledWith({ estimateId: "est-1", favorite: true }));
  });
  it("does NOT touch the sidebar when the parent is not a favorite, but patches the row", async () => {
    actions.setEstimateFavorite.mockResolvedValue(undefined);
    qc.setQueryData(favoritesQueryKeys.sidebar(SCOPE), []);
    const store = createProjectEstimatesStore([makeRow()]);
    const { result } = renderHook(() => useToggleEstimateFavorite(SCOPE), { wrapper: wrap(qc) });
    act(() => result.current.toggle({ ...baseInput, store, project: { ...baseInput.project, isSidebarFavorite: false } }));
    expect(qc.getQueryData(favoritesQueryKeys.sidebar(SCOPE))).toEqual([]);
    expect(store.getState().estimates[0].isFavorite).toBe(true);
  });
  it("rolls back BOTH surfaces from one snapshot on error", async () => {
    actions.setEstimateFavorite.mockRejectedValue(new Error("nope"));
    qc.setQueryData(favoritesQueryKeys.sidebar(SCOPE), [favoritedParent()]);
    const store = createProjectEstimatesStore([makeRow()]);
    const { result } = renderHook(() => useToggleEstimateFavorite(SCOPE), { wrapper: wrap(qc) });
    act(() => result.current.toggle({ ...baseInput, store }));
    await waitFor(() => {
      expect(qc.getQueryData<MainSidebarFavoriteProject[]>(favoritesQueryKeys.sidebar(SCOPE))![0].favoriteEstimateSheets).toHaveLength(0);
      expect(store.getState().estimates[0].isFavorite).toBe(false);
    });
  });
  it("is race-safe: a stale settle from M1 cannot clobber M2's newer state (cancelQueries)", async () => {
    let resolveM1!: () => void;
    actions.setEstimateFavorite
      .mockImplementationOnce(() => new Promise<void>((r) => { resolveM1 = () => r(); }))
      .mockResolvedValueOnce(undefined);
    qc.setQueryData(favoritesQueryKeys.sidebar(SCOPE), [favoritedParent()]);
    const store = createProjectEstimatesStore([makeRow()]);
    const { result } = renderHook(() => useToggleEstimateFavorite(SCOPE), { wrapper: wrap(qc) });
    act(() => result.current.toggle({ ...baseInput, store }));
    act(() => result.current.toggle({ ...baseInput, store, favorite: false, estimate: { ...baseInput.estimate, favoriteCreatedAt: new Date().toISOString() } }));
    // M1's mutationFn runs on a microtask after the synchronous toggles; wait until it is
    // in-flight (its resolver is captured) before settling it late to clobber M2's newer state.
    await waitFor(() => expect(resolveM1).toBeTypeOf("function"));
    await act(async () => { resolveM1(); });
    await waitFor(() => expect(qc.getQueryData<MainSidebarFavoriteProject[]>(favoritesQueryKeys.sidebar(SCOPE))![0].favoriteEstimateSheets).toHaveLength(0));
  });
});
