import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ReactElement } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { MainSidebarFavoriteProject } from "@/components/sidebar/sidebar-types";
import { MainSidebar } from "@/components/sidebar/MainSidebar";
import { fetchSidebarFavoriteProjects } from "@/lib/favorites/sidebar-favorites-actions";

vi.mock("next/navigation", () => ({
  usePathname: () => "/workshop/projects/project-1/estimates/sheet-1",
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
const scope = { workspaceId: "ws-1", userId: "user-1" };

beforeEach(() => {
  fetchSidebarFavoriteProjectsMock.mockReset();
  fetchSidebarFavoriteProjectsMock.mockResolvedValue([]);
});

describe("MainSidebar favorites", () => {
  it("renders favorite projects with favorite estimate sheets indented underneath", async () => {
    const favoriteProjects: MainSidebarFavoriteProject[] = [
      {
        favoriteCreatedAt: "2026-06-16T00:00:00.000Z",
        favoriteEstimateSheets: [
          {
            href: "/workshop/projects/project-1/estimates/sheet-1",
            id: "sheet-1",
            name: "Concept Budget",
            projectId: "project-1",
            sheetCode: "ES-001",
            favoriteCreatedAt: "2026-06-16T00:00:00.000Z",
          },
        ],
        href: "/workshop/projects/project-1",
        id: "project-1",
        name: "Lewis Residence",
        projectCode: "AE-LR-001",
      },
    ];
    // staleTime:0 reconcile returns server truth; here it matches the seeded SSR data
    // (no flash to empty during normal reconcile — 08 §State table).
    fetchSidebarFavoriteProjectsMock.mockResolvedValue(favoriteProjects);

    renderWithClient(
      <MainSidebar
        favoritesScope={scope}
        favoriteProjects={favoriteProjects}
        user={{ displayName: "Philip Lewis", email: "philip@example.com" }}
      />,
    );

    const collapsedNavigation = screen.getByRole("navigation", { name: "Main navigation" });
    const collapsedLogo = collapsedNavigation.querySelector("[data-sidebar-header-logo-lock]");
    expect(collapsedLogo).toBeTruthy();
    expect(collapsedLogo?.getAttribute("style")).toContain("width: 148px");
    expect(within(collapsedLogo as HTMLElement).getByText("archestimator")).toHaveClass("text-[12px]");

    await userEvent.click(screen.getByRole("button", { name: "Expand sidebar" }));

    const navigation = screen.getByRole("navigation", { name: "Main navigation" });
    const expandedLogo = navigation.querySelector("[data-sidebar-header-logo-lock]");
    expect(expandedLogo).toBeTruthy();
    expect(expandedLogo?.getAttribute("style")).toContain("width: 148px");
    expect(within(expandedLogo as HTMLElement).getByText("archestimator")).toHaveClass("text-[12px]");
    expect(within(navigation).getByText("Favorites")).toBeInTheDocument();

    expect(within(navigation).getByRole("link", { name: "Lewis Residence" })).toHaveAttribute(
      "href",
      "/workshop/projects/project-1",
    );

    const favoriteSheet = within(navigation).getByRole("link", { name: "Concept Budget" });
    expect(favoriteSheet).toHaveAttribute("href", "/workshop/projects/project-1/estimates/sheet-1");
    expect(favoriteSheet).toHaveClass("pl-[52px]");
    expect(favoriteSheet).toHaveAttribute("aria-current", "page");
  });

  it("shows the empty hint once the query settles with zero favorites", async () => {
    renderWithClient(
      <MainSidebar
        favoritesScope={scope}
        favoriteProjects={[]}
        user={{ displayName: "Philip Lewis", email: "philip@example.com" }}
      />,
    );
    await userEvent.click(screen.getByRole("button", { name: "Expand sidebar" }));
    const nav = screen.getByRole("navigation", { name: "Main navigation" });
    expect(await within(nav).findByText("Star a project to pin it here.")).toBeInTheDocument();
  });
});
