import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, type ReactElement } from "react";
import { hydrateRoot, type Root } from "react-dom/client";
import { renderToString } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { MainSidebar } from "@/components/sidebar/MainSidebar";
import type { MainSidebarFavoriteProject } from "@/components/sidebar/sidebar-types";
import { FavoritesTree } from "@/components/workshop/dashboard/FavoritesTree";
import { favoritesQueryKeys } from "@/lib/favorites/query-keys";
import { fetchSidebarFavoriteProjects } from "@/lib/favorites/sidebar-favorites-actions";

vi.mock("next/navigation", () => ({
  usePathname: () => "/workshop",
  useRouter: () => ({ prefetch: vi.fn() }),
}));

vi.mock("@/lib/favorites/sidebar-favorites-actions", () => ({
  fetchSidebarFavoriteProjects: vi.fn(async () => []),
}));

const scope = { workspaceId: "workspace-1", userId: "user-1" };
const cachedFavorites: MainSidebarFavoriteProject[] = [{
  favoriteCreatedAt: "2026-07-24T00:00:00.000Z",
  favoriteEstimateSheets: [],
  href: "/workshop/projects/project-1",
  id: "project-1",
  name: "Lewis Residence",
  projectCode: "AE-LR-001",
}];

function createQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        staleTime: Number.POSITIVE_INFINITY,
      },
    },
  });
}

async function hydrateAgainstWarmFavoritesCache(
  element: ReactElement,
) {
  const serverClient = createQueryClient();
  const container = document.createElement("div");
  container.innerHTML = renderToString(
    <QueryClientProvider client={serverClient}>
      {element}
    </QueryClientProvider>,
  );
  document.body.append(container);

  const browserClient = createQueryClient();
  browserClient.setQueryData(
    favoritesQueryKeys.sidebar(scope),
    cachedFavorites,
  );
  const recoverableErrors: unknown[] = [];
  let root: Root | null = null;

  await act(async () => {
    root = hydrateRoot(
      container,
      <QueryClientProvider client={browserClient}>
        {element}
      </QueryClientProvider>,
      {
        onRecoverableError: (error) => recoverableErrors.push(error),
      },
    );
    await Promise.resolve();
  });

  return {
    container,
    recoverableErrors,
    unmount: async () => {
      await act(async () => {
        root?.unmount();
      });
      container.remove();
    },
  };
}

beforeEach(() => {
  vi.mocked(fetchSidebarFavoriteProjects).mockClear();
});

describe("sidebar favorites hydration", () => {
  it("hydrates MainSidebar from its server snapshot before adopting a warm cache", async () => {
    const result = await hydrateAgainstWarmFavoritesCache(
      <MainSidebar
        favoriteProjects={[]}
        favoriteProjectsFresh={false}
        favoritesScope={scope}
      />,
    );

    expect(result.recoverableErrors).toEqual([]);
    expect(result.container).toHaveTextContent("Lewis Residence");
    await result.unmount();
  });

  it("hydrates FavoritesTree from its server snapshot before adopting a warm cache", async () => {
    const result = await hydrateAgainstWarmFavoritesCache(
      <FavoritesTree
        favoriteProjects={[]}
        favoritesScope={scope}
      />,
    );

    expect(result.recoverableErrors).toEqual([]);
    expect(result.container).toHaveTextContent("Lewis Residence");
    await result.unmount();
  });
});
