import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { workspaceComponentRowsLibraryQueryKey } from "@/lib/component-library/query-keys";
import type {
  ComponentRowsLibraryDataset,
  ComponentRowsLibraryPage,
} from "@/lib/repositories/component-library-repository";

// Spy server action — the queryFn. Must NOT be called when the cache is warm.
const loadRowsSpy = vi.fn();
const loadProjectRowsSpy = vi.fn();
const loadProjectOnlyRowsSpy = vi.fn();
vi.mock("@/lib/component-library/actions", () => ({
  loadCurrentWorkspaceComponentRowsLibrary: (...args: unknown[]) => loadRowsSpy(...args),
  loadProjectComponentRowsLibrary: (...args: unknown[]) => loadProjectRowsSpy(...args),
  loadProjectOnlyComponentRowsLibrary: (...args: unknown[]) => loadProjectOnlyRowsSpy(...args),
}));

// Light stub for the heavy dynamic manager so the test stays fast and focused on
// the cache behavior. It reports how many library items it received and exposes the
// T4 mutation callback so we can prove it patches the shell's cache.
vi.mock("@/components/workshop/component-library-manager/ComponentLibraryManager", () => ({
  ComponentLibraryManager: (props: {
    libraryItems?: unknown[];
    componentRowsLoadState?: {
      isPartial: boolean;
      loadedComponentCount: number;
      totalComponentCount?: number;
      isLoading: boolean;
      onLoadMore: () => void;
    };
    promotionEnabled?: boolean;
    onProjectPromotionSucceeded?: () => void;
    onLibraryItemsMutated?: (
      updater: (items: unknown[]) => unknown[],
      options?: { totalComponentCountDelta?: number },
    ) => void;
  }) => (
    <div data-testid="manager">
      items:{props.libraryItems?.length ?? 0}
      <span data-testid="count-state">
        loaded:{props.componentRowsLoadState?.loadedComponentCount ?? props.libraryItems?.length ?? 0}/total:{props.componentRowsLoadState?.totalComponentCount ?? "unknown"}
      </span>
      {props.componentRowsLoadState?.isPartial ? (
        <>
          <span data-testid="partial-state">
            loaded:{props.componentRowsLoadState.loadedComponentCount}/total:{props.componentRowsLoadState.totalComponentCount ?? "unknown"}
          </span>
          <button type="button" data-testid="load-more" onClick={props.componentRowsLoadState.onLoadMore}>
            load more
          </button>
        </>
      ) : null}
      <button
        type="button"
        data-testid="add-via-cache"
        onClick={() => props.onLibraryItemsMutated?.(
          (items) => [...items, { id: "added" }],
          { totalComponentCountDelta: 1 },
        )}
      >
        add
      </button>
      {props.promotionEnabled ? (
        <button type="button" data-testid="promotion-succeeded" onClick={props.onProjectPromotionSucceeded}>
          promotion succeeded
        </button>
      ) : null}
    </div>
  ),
}));

import { LibraryPageClient } from "@/components/workshop/LibraryPageClient";

function makeFixture(itemCount: number, workspaceId = "workspace-a"): ComponentRowsLibraryDataset {
  return {
    workspaceId,
    categoryTree: [],
    suppliers: [],
    brands: [],
    libraryFolders: [],
    libraryItems: Array.from({ length: itemCount }, (_, i) => ({ id: `item-${i}` })),
  } as unknown as ComponentRowsLibraryDataset;
}

function makeProjectPage({
  folderId,
  itemStart,
  itemCount,
  hasMore,
  nextCursor,
}: {
  folderId: string;
  itemStart: number;
  itemCount: number;
  hasMore: boolean;
  nextCursor: ComponentRowsLibraryPage["nextCursor"];
}): ComponentRowsLibraryPage {
  return {
    ...makeFixture(0),
    libraryFolders: [{ id: folderId }],
    libraryItems: Array.from({ length: itemCount }, (_, index) => ({
      id: `project-item-${itemStart + index}`,
    })),
    isPartial: hasMore,
    loadedComponentCount: itemCount,
    totalComponentCount: 130,
    hasMore,
    nextCursor,
  } as unknown as ComponentRowsLibraryPage;
}

afterEach(() => {
  loadRowsSpy.mockReset();
  loadProjectRowsSpy.mockReset();
  loadProjectOnlyRowsSpy.mockReset();
});

describe("Components tab TanStack Query cache (P0 T3)", () => {
  it("renders from initialData on first mount without calling the server loader", async () => {
    const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    render(
      <QueryClientProvider client={qc}>
        <LibraryPageClient initialLibrary={makeFixture(3)} />
      </QueryClientProvider>,
    );
    expect(await screen.findByTestId("manager")).toHaveTextContent("items:3");
    // initialData + 5-min staleTime ⇒ fresh ⇒ no fetch.
    expect(loadRowsSpy).toHaveBeenCalledTimes(0);
  });

  it("renders a partial first-paint seed and appends the next cursor page on demand", async () => {
    let resolveFullDataset: (value: ComponentRowsLibraryDataset) => void = () => {};
    loadRowsSpy.mockReturnValue(new Promise<ComponentRowsLibraryDataset>((resolve) => {
      resolveFullDataset = resolve;
    }));
    const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    render(
      <QueryClientProvider client={qc}>
        <LibraryPageClient
          initialLibrary={{
            ...makeFixture(2),
            libraryItems: [
              { id: "item-0" },
              {
                id: "item-1",
                name: "Detailed row",
                notes: "Hydrated component note",
                priceOptions: [{
                  id: "price-1",
                  label: "Retail",
                  unitCost: 10,
                  attachments: [{ id: "attachment-1", fileName: "quote.pdf" }],
                }],
                history: [{ id: "history-1", type: "price" }],
              },
            ],
            isPartial: true,
            loadedComponentCount: 2,
            totalComponentCount: 5,
            hasMore: true,
            nextCursor: {
              createdAt: "2026-07-15T00:00:00.000Z",
              id: "00000000-0000-4000-8000-000000000002",
              snapshotAt: "2026-07-15T01:00:00.000Z",
              snapshotTotalCount: 5,
            },
          }}
        />
      </QueryClientProvider>,
    );

    expect(await screen.findByTestId("manager")).toHaveTextContent("items:2");
    expect(screen.getByTestId("partial-state")).toHaveTextContent("loaded:2/total:5");
    expect(loadRowsSpy).toHaveBeenCalledTimes(0);

    fireEvent.click(screen.getByTestId("load-more"));
    expect(loadRowsSpy).toHaveBeenCalledTimes(1);
    expect(loadRowsSpy).toHaveBeenCalledWith({
      createdAt: "2026-07-15T00:00:00.000Z",
      id: "00000000-0000-4000-8000-000000000002",
      snapshotAt: "2026-07-15T01:00:00.000Z",
      snapshotTotalCount: 5,
    });
    resolveFullDataset({
      ...makeFixture(3),
      libraryItems: [
        {
          id: "item-1",
          name: "Updated browse row",
          priceOptions: [{ id: "price-1", label: "Retail updated", unitCost: 25 }],
        },
        { id: "item-2" },
        { id: "item-3" },
        { id: "item-4" },
      ],
      isPartial: false,
      loadedComponentCount: 3,
      totalComponentCount: 5,
      hasMore: false,
      nextCursor: null,
    } as unknown as ComponentRowsLibraryDataset);
    await waitFor(() => expect(screen.getByTestId("manager")).toHaveTextContent("items:5"));
    const cached = qc.getQueryData<ComponentRowsLibraryDataset>(["workspace-component-rows-library", "workspace", "workspace-a"]);
    const mergedDetail = cached?.libraryItems.find((item) => item.id === "item-1");
    expect(mergedDetail).toMatchObject({
      name: "Updated browse row",
      priceOptions: [{
        id: "price-1",
        label: "Retail updated",
        unitCost: 25,
        attachments: [{ id: "attachment-1", fileName: "quote.pdf" }],
      }],
      history: [{ id: "history-1", type: "price" }],
      notes: "Hydrated component note",
    });
  });

  it("renders the second mount for the same workspace from the warm scoped cache (no refetch)", async () => {
    const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const fixture = makeFixture(5);
    const first = render(
      <QueryClientProvider client={qc}>
        <LibraryPageClient initialLibrary={fixture} />
      </QueryClientProvider>,
    );
    expect(await screen.findByTestId("manager")).toHaveTextContent("items:5");
    first.unmount();

    // Second mount shares the same QueryClient — the entry is warm.
    render(
      <QueryClientProvider client={qc}>
        <LibraryPageClient initialLibrary={fixture} />
      </QueryClientProvider>,
    );
    expect(await screen.findByTestId("manager")).toHaveTextContent("items:5");
    expect(loadRowsSpy).toHaveBeenCalledTimes(0);
  });

  it("does not reuse a warm cache entry across workspace scopes", async () => {
    const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const first = render(
      <QueryClientProvider client={qc}>
        <LibraryPageClient initialLibrary={makeFixture(5, "workspace-a")} />
      </QueryClientProvider>,
    );
    expect(await screen.findByTestId("manager")).toHaveTextContent("items:5");
    first.unmount();

    render(
      <QueryClientProvider client={qc}>
        <LibraryPageClient initialLibrary={makeFixture(2, "workspace-b")} />
      </QueryClientProvider>,
    );
    expect(await screen.findByTestId("manager")).toHaveTextContent("items:2");
    expect(
      qc.getQueryData<ComponentRowsLibraryDataset>(["workspace-component-rows-library", "workspace", "workspace-a"])
        ?.libraryItems,
    ).toHaveLength(5);
    expect(
      qc.getQueryData<ComponentRowsLibraryDataset>(["workspace-component-rows-library", "workspace", "workspace-b"])
        ?.libraryItems,
    ).toHaveLength(2);
    expect(loadRowsSpy).toHaveBeenCalledTimes(0);
  });

  it("patches the warm cache on mutation (T4) so a re-read reflects it without a refetch", async () => {
    const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    render(
      <QueryClientProvider client={qc}>
        <LibraryPageClient initialLibrary={makeFixture(2)} />
      </QueryClientProvider>,
    );
    expect(await screen.findByTestId("manager")).toHaveTextContent("items:2");
    // Manager calls onLibraryItemsMutated -> LibraryPageClient patches the cache.
    fireEvent.click(screen.getByTestId("add-via-cache"));
    await waitFor(() => expect(screen.getByTestId("manager")).toHaveTextContent("items:3"));
    // The cache entry itself was updated (durable across remounts), not router.refresh.
    const cached = qc.getQueryData<ComponentRowsLibraryDataset>(["workspace-component-rows-library", "workspace", "workspace-a"]);
    expect(cached?.libraryItems).toHaveLength(3);
    expect(loadRowsSpy).toHaveBeenCalledTimes(0);
  });

  it("keeps the exact total coherent when a cardinality-changing mutation patches the cache", async () => {
    const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    render(
      <QueryClientProvider client={qc}>
        <LibraryPageClient
          initialLibrary={{
            ...makeFixture(2),
            isPartial: false,
            loadedComponentCount: 2,
            totalComponentCount: 2,
            hasMore: false,
            nextCursor: null,
          }}
        />
      </QueryClientProvider>,
    );

    expect(await screen.findByTestId("count-state")).toHaveTextContent("loaded:2/total:2");
    fireEvent.click(screen.getByTestId("add-via-cache"));
    await waitFor(() => expect(screen.getByTestId("count-state")).toHaveTextContent("loaded:3/total:3"));
  });

  it("preserves a local count delta when a later snapshot page is appended", async () => {
    loadRowsSpy.mockResolvedValue({
      ...makeFixture(3),
      libraryItems: [{ id: "item-2" }, { id: "item-3" }, { id: "item-4" }],
      isPartial: false,
      loadedComponentCount: 3,
      totalComponentCount: 5,
      hasMore: false,
      nextCursor: null,
    });
    const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    render(
      <QueryClientProvider client={qc}>
        <LibraryPageClient
          initialLibrary={{
            ...makeFixture(2),
            isPartial: true,
            loadedComponentCount: 2,
            totalComponentCount: 5,
            hasMore: true,
            nextCursor: {
              createdAt: "2026-07-15T00:00:00.000Z",
              id: "00000000-0000-4000-8000-000000000002",
              snapshotAt: "2026-07-15T01:00:00.000Z",
              snapshotTotalCount: 5,
            },
          }}
        />
      </QueryClientProvider>,
    );

    fireEvent.click(await screen.findByTestId("add-via-cache"));
    await waitFor(() => expect(screen.getByTestId("count-state")).toHaveTextContent("loaded:3/total:6"));
    fireEvent.click(screen.getByTestId("load-more"));
    await waitFor(() => expect(screen.getByTestId("count-state")).toHaveTextContent("loaded:6/total:6"));
  });

  it("falls back to the server loader only when the cache is cold and unseeded", async () => {
    loadRowsSpy.mockResolvedValue(makeFixture(2));
    const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    render(
      <QueryClientProvider client={qc}>
        <LibraryPageClient />
      </QueryClientProvider>,
    );
    await waitFor(() => expect(screen.getByTestId("manager")).toHaveTextContent("items:2"));
    expect(loadRowsSpy).toHaveBeenCalledTimes(1);
  });

  it("pages the project-only catalogue past 100 rows without losing prior items, folders, or cursor totals", async () => {
    const firstCursor = {
      createdAt: "2026-07-15T00:00:50.000Z",
      id: "00000000-0000-4000-8000-000000000050",
      snapshotAt: "2026-07-15T01:00:00.000Z",
      snapshotTotalCount: 130,
    };
    const secondCursor = {
      createdAt: "2026-07-15T00:01:40.000Z",
      id: "00000000-0000-4000-8000-000000000100",
      snapshotAt: "2026-07-15T01:00:00.000Z",
      snapshotTotalCount: 130,
    };
    const initialPage = makeProjectPage({
      folderId: "project-folder-page-1",
      itemStart: 0,
      itemCount: 50,
      hasMore: true,
      nextCursor: firstCursor,
    });
    loadProjectOnlyRowsSpy
      .mockResolvedValueOnce(makeProjectPage({
        folderId: "project-folder-page-2",
        itemStart: 50,
        itemCount: 50,
        hasMore: true,
        nextCursor: secondCursor,
      }))
      .mockResolvedValueOnce(makeProjectPage({
        folderId: "project-folder-page-3",
        itemStart: 100,
        itemCount: 30,
        hasMore: false,
        nextCursor: null,
      }));
    const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    render(
      <QueryClientProvider client={qc}>
        <LibraryPageClient
          initialLibrary={initialPage}
          projectId="project-1"
          projectOnly
        />
      </QueryClientProvider>,
    );

    expect(await screen.findByTestId("partial-state")).toHaveTextContent("loaded:50/total:130");
    fireEvent.click(screen.getByTestId("load-more"));
    await waitFor(() => expect(screen.getByTestId("partial-state")).toHaveTextContent("loaded:100/total:130"));
    expect(loadProjectOnlyRowsSpy).toHaveBeenNthCalledWith(1, "project-1", firstCursor);

    fireEvent.click(screen.getByTestId("load-more"));
    await waitFor(() => expect(screen.getByTestId("manager")).toHaveTextContent("items:130"));
    expect(screen.queryByTestId("partial-state")).not.toBeInTheDocument();
    expect(loadProjectOnlyRowsSpy).toHaveBeenNthCalledWith(2, "project-1", secondCursor);
    expect(loadRowsSpy).not.toHaveBeenCalled();
    expect(loadProjectRowsSpy).not.toHaveBeenCalled();

    const projectOnlyKey = [
      ...workspaceComponentRowsLibraryQueryKey("workspace-a", "project-1"),
      "project-only",
    ] as const;
    const cached = qc.getQueryData<ComponentRowsLibraryPage>(projectOnlyKey);
    expect(cached).toMatchObject({
      hasMore: false,
      nextCursor: null,
      loadedComponentCount: 130,
      totalComponentCount: 130,
    });
    expect(cached?.libraryItems.map((item) => item.id)).toEqual(
      Array.from({ length: 130 }, (_, index) => `project-item-${index}`),
    );
    expect(cached?.libraryFolders.map((folder) => folder.id)).toEqual([
      "project-folder-page-1",
      "project-folder-page-2",
      "project-folder-page-3",
    ]);
  });

  it("invalidates the canonical workspace rows cache after a successful project promotion", async () => {
    const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const workspaceRowsKey = workspaceComponentRowsLibraryQueryKey("workspace-a");
    const projectPage = makeProjectPage({
      folderId: "project-folder",
      itemStart: 0,
      itemCount: 1,
      hasMore: false,
      nextCursor: null,
    });
    loadProjectOnlyRowsSpy.mockResolvedValue(projectPage);
    qc.setQueryData(workspaceRowsKey, makeFixture(1));

    render(
      <QueryClientProvider client={qc}>
        <LibraryPageClient
          initialLibrary={projectPage}
          projectId="project-1"
          projectOnly
          promotionEnabled
        />
      </QueryClientProvider>,
    );

    fireEvent.click(await screen.findByTestId("promotion-succeeded"));
    await waitFor(() => expect(qc.getQueryState(workspaceRowsKey)?.isInvalidated).toBe(true));
  });
});
