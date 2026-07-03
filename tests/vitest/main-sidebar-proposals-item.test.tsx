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
    expect(within(nav).getByRole("link", { name: "Publisher" })).toHaveAttribute("href", "/workshop/publisher");
  });

  it("keeps the planned shortcut order in the source config", () => {
    const source = readFileSync("src/components/sidebar/MainSidebar.tsx", "utf8");

    expect(source).toContain("Presentation");
    expect(source).toContain('{ id: "proposals", href: "/workshop/proposals", label: "Proposals", icon: Presentation, shortcut: "⌘4" }');
    expect(source).toContain('{ id: "publisher", href: "/workshop/publisher", label: "Publisher", icon: NewspaperClipping, shortcut: "⌘5" }');
  });
});
