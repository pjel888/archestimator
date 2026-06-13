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
    onLibraryItemsMutated?: (updater: (items: unknown[]) => unknown[]) => void;
  }) => (
    <div data-testid="manager">
      items:{props.libraryItems?.length ?? 0}
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

function makeFixture(itemCount: number): ComponentRowsLibraryDataset {
  return {
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

  it("renders the second mount from the warm shared cache (no refetch)", async () => {
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
        <LibraryPageClient />
      </QueryClientProvider>,
    );
    expect(await screen.findByTestId("manager")).toHaveTextContent("items:5");
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
    const cached = qc.getQueryData<ComponentRowsLibraryDataset>(["workspace-component-rows-library"]);
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
