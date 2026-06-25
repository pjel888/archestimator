import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { ComponentRowsLibraryDataset } from "@/lib/repositories/component-library-repository";

// Spy server action — the queryFn. Must NOT be called when the cache is warm.
const loadRowsSpy = vi.fn();
vi.mock("@/lib/component-library/actions", () => ({
  loadCurrentWorkspaceComponentRowsLibrary: (...args: unknown[]) => loadRowsSpy(...args),
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
      onLoadAll: () => void;
    };
    onLibraryItemsMutated?: (updater: (items: unknown[]) => unknown[]) => void;
  }) => (
    <div data-testid="manager">
      items:{props.libraryItems?.length ?? 0}
      {props.componentRowsLoadState?.isPartial ? (
        <>
          <span data-testid="partial-state">
            loaded:{props.componentRowsLoadState.loadedComponentCount}/total:{props.componentRowsLoadState.totalComponentCount ?? "unknown"}
          </span>
          <button type="button" data-testid="load-all" onClick={props.componentRowsLoadState.onLoadAll}>
            load all
          </button>
        </>
      ) : null}
      <button
        type="button"
        data-testid="add-via-cache"
        onClick={() => props.onLibraryItemsMutated?.((items) => [...items, { id: "added" }])}
      >
        add
      </button>
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

afterEach(() => {
  loadRowsSpy.mockReset();
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

  it("renders a partial first-paint seed without refetching the full dataset on mount", async () => {
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
            isPartial: true,
            loadedComponentCount: 2,
            totalComponentCount: 5,
          }}
        />
      </QueryClientProvider>,
    );

    expect(await screen.findByTestId("manager")).toHaveTextContent("items:2");
    expect(screen.getByTestId("partial-state")).toHaveTextContent("loaded:2/total:5");
    expect(loadRowsSpy).toHaveBeenCalledTimes(0);

    const { fireEvent } = await import("@testing-library/react");
    fireEvent.click(screen.getByTestId("load-all"));
    expect(loadRowsSpy).toHaveBeenCalledTimes(1);
    resolveFullDataset(makeFixture(5));
    await waitFor(() => expect(screen.getByTestId("manager")).toHaveTextContent("items:5"));
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
    const { fireEvent } = await import("@testing-library/react");
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
});
