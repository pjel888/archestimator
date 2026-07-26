import { readFileSync } from "node:fs";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ReactElement } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { MainSidebar } from "@/components/sidebar/MainSidebar";
import type { MainSidebarFavoriteProject } from "@/components/sidebar/sidebar-types";
import { fetchSidebarFavoriteProjects } from "@/lib/favorites/sidebar-favorites-actions";

vi.mock("next/navigation", () => ({
  usePathname: () => "/workshop/proposals",
  useRouter: () => ({ prefetch: vi.fn() }),
}));
vi.mock("@/lib/favorites/sidebar-favorites-actions", () => ({
  fetchSidebarFavoriteProjects: vi.fn(async () => [] as MainSidebarFavoriteProject[]),
}));

const fetchSidebarFavoriteProjectsMock = vi.mocked(fetchSidebarFavoriteProjects);

function renderWithClient(ui: ReactElement) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(<QueryClientProvider client={client}>{ui}</QueryClientProvider>);
}

beforeEach(() => {
  fetchSidebarFavoriteProjectsMock.mockReset();
  fetchSidebarFavoriteProjectsMock.mockResolvedValue([]);
});

describe("MainSidebar proposals item", () => {
  it("renders Proposals as the active workshop nav item", async () => {
    renderWithClient(
      <MainSidebar
        favoritesScope={{ workspaceId: "workspace-1", userId: "user-1" }}
        favoriteProjects={[]}
        user={{ displayName: "Philip Lewis", email: "philip@example.com" }}
      />,
    );

    const nav = screen.getByRole("navigation", { name: "Main navigation" });
    const collapsedLink = within(nav).getByRole("link", { name: "Proposals" });
    expect(collapsedLink).toHaveAttribute("href", "/workshop/proposals");
    expect(collapsedLink).toHaveAttribute("aria-current", "page");

    await userEvent.click(screen.getByRole("button", { name: "Expand sidebar" }));

    expect(within(nav).getByText("Proposals")).toBeInTheDocument();
    expect(within(nav).getByRole("link", { name: "Share" })).toHaveAttribute("href", "/workshop/publisher");
  });

  it("keeps the planned shortcut order in the source config", () => {
    const source = readFileSync("src/components/workshop/navigation/workshop-navigation.ts", "utf8");
    const proposalsIndex = source.indexOf('id: "proposals"');
    const publisherIndex = source.indexOf('id: "publisher"');
    const proposalsBlock = source.slice(proposalsIndex, publisherIndex);
    const publisherBlock = source.slice(publisherIndex, source.indexOf("\n  },", publisherIndex) + 5);

    expect(proposalsIndex).toBeGreaterThanOrEqual(0);
    expect(publisherIndex).toBeGreaterThan(proposalsIndex);
    expect(proposalsBlock).toContain('href: "/workshop/proposals"');
    expect(proposalsBlock).toContain('label: "Proposals"');
    expect(proposalsBlock).toContain("icon: Presentation");
    expect(proposalsBlock).toContain('shortcut: "⌘4"');
    expect(publisherBlock).toContain('href: "/workshop/publisher"');
    expect(publisherBlock).toContain('label: "Share"');
    expect(publisherBlock).toContain("icon: ShareNetwork");
    expect(publisherBlock).toContain('shortcut: "⌘5"');
  });
});
