import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ReactElement } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { MainSidebarFavoriteProject } from "@/components/sidebar/sidebar-types";
import { MainSidebar } from "@/components/sidebar/MainSidebar";
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

function renderWithClient(ui: ReactElement) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(<QueryClientProvider client={client}>{ui}</QueryClientProvider>);
}

beforeEach(() => {
  fetchSidebarFavoriteProjectsMock.mockReset();
  fetchSidebarFavoriteProjectsMock.mockResolvedValue(favoriteProjects);
});

describe("MainSidebar favorites insert/remove fade (R12)", () => {
  it("applies an opacity transition that respects prefers-reduced-motion and keeps h-7 pre-allocated", async () => {
    renderWithClient(
      <MainSidebar favoritesScope={scope} favoriteProjects={favoriteProjects} user={{ displayName: "Philip Lewis" }} />,
    );

    await userEvent.click(screen.getByRole("button", { name: "Expand sidebar" }));
    const nav = screen.getByRole("navigation", { name: "Main navigation" });

    const projectRow = nav.querySelector("[data-sidebar-favorite-project]");
    expect(projectRow?.className).toContain("motion-reduce:transition-none");
    expect(projectRow?.className).toMatch(/transition-\[opacity\]|transition-opacity/);

    const sheetRow = nav.querySelector("[data-sidebar-favorite-sheet]");
    expect(sheetRow?.className).toContain("motion-reduce:transition-none");
    expect(sheetRow?.className).toMatch(/transition-\[opacity\]|transition-opacity/);

    // No layout shift: the project link keeps its pre-allocated row height.
    expect(within(nav).getByRole("link", { name: /Lewis Residence/ })).toHaveClass("h-7");
    expect(within(nav).getByRole("link", { name: /Concept Budget/ })).toHaveClass("h-7");
  });
});
