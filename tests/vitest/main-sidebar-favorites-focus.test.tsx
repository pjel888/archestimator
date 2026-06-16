import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ReactElement } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { MainSidebarFavoriteProject } from "@/components/sidebar/sidebar-types";
import { MainSidebar } from "@/components/sidebar/MainSidebar";
import { favoritesQueryKeys } from "@/lib/favorites/query-keys";
import { fetchSidebarFavoriteProjects } from "@/lib/favorites/sidebar-favorites-actions";

vi.mock("next/navigation", () => ({
  usePathname: () => "/workshop/projects/project-1",
  useRouter: () => ({ prefetch: vi.fn() }),
}));
vi.mock("@/lib/favorites/sidebar-favorites-actions", () => ({
  fetchSidebarFavoriteProjects: vi.fn(async () => [] as MainSidebarFavoriteProject[]),
}));

const fetchSidebarFavoriteProjectsMock = vi.mocked(fetchSidebarFavoriteProjects);
const scope = { workspaceId: "ws-1", userId: "user-1" };

function project(id: string, name: string): MainSidebarFavoriteProject {
  return {
    favoriteCreatedAt: "2026-06-16T00:00:00.000Z",
    favoriteEstimateSheets: [],
    href: `/workshop/projects/${id}`,
    id,
    name,
    projectCode: null,
  };
}

const lewis = project("project-1", "Lewis Residence");
const second = project("project-2", "Second Project");

function renderWithClient(ui: ReactElement) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const result = render(<QueryClientProvider client={client}>{ui}</QueryClientProvider>);
  return { client, ...result };
}

beforeEach(() => {
  fetchSidebarFavoriteProjectsMock.mockReset();
});

describe("MainSidebar focus rescue on favorite removal (QA-18 / QA-21)", () => {
  it("moves focus to a remaining favorite link when the focused one is removed, then to the header when the list empties", async () => {
    const initial = [lewis, second];
    fetchSidebarFavoriteProjectsMock.mockResolvedValue(initial);

    const { client } = renderWithClient(
      <MainSidebar favoritesScope={scope} favoriteProjects={initial} user={{ displayName: "Philip Lewis" }} />,
    );

    await userEvent.click(screen.getByRole("button", { name: "Expand sidebar" }));
    const nav = screen.getByRole("navigation", { name: "Main navigation" });

    const p2 = within(nav).getByRole("link", { name: "Second Project" });
    p2.focus();
    expect(document.activeElement).toBe(p2);

    // Drive the unfavorite: drop project-2 from the sidebar cache (optimistic removal).
    act(() => {
      client.setQueryData(favoritesQueryKeys.sidebar(scope), [lewis]);
    });

    await waitFor(() => {
      expect(document.activeElement).not.toBe(document.body);
      expect(document.activeElement).toBe(within(nav).getByRole("link", { name: "Lewis Residence" }));
    });

    // Empty case: remove the last project; focus should land on the favorites header.
    act(() => {
      client.setQueryData(favoritesQueryKeys.sidebar(scope), []);
    });

    await waitFor(() => {
      expect(document.activeElement).toBe(nav.querySelector("[data-sidebar-favorites-header]"));
    });
  });

  it("falls forward to the nearest-below favorite when the first link holding focus is removed", async () => {
    const initial = [lewis, second];
    fetchSidebarFavoriteProjectsMock.mockResolvedValue(initial);

    const { client } = renderWithClient(
      <MainSidebar favoritesScope={scope} favoriteProjects={initial} user={{ displayName: "Philip Lewis" }} />,
    );

    await userEvent.click(screen.getByRole("button", { name: "Expand sidebar" }));
    const nav = screen.getByRole("navigation", { name: "Main navigation" });

    const p1 = within(nav).getByRole("link", { name: "Lewis Residence" });
    p1.focus();
    expect(document.activeElement).toBe(p1);

    act(() => {
      client.setQueryData(favoritesQueryKeys.sidebar(scope), [second]);
    });

    await waitFor(() => {
      expect(document.activeElement).toBe(within(nav).getByRole("link", { name: "Second Project" }));
    });
  });
});
