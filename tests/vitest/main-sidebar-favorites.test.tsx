import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ReactElement } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { MainSidebarFavoriteProject } from "@/components/sidebar/sidebar-types";
import { MainSidebar } from "@/components/sidebar/MainSidebar";
import { fetchSidebarFavoriteProjects } from "@/lib/favorites/sidebar-favorites-actions";
import {
  announceSidebarFavoriteAssertive,
  announceSidebarFavoritePolite,
} from "@/hooks/use-sidebar-favorites-announcer";

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
    // Redesign: the mark is locked into the 48px column (w-12) so it stays put on
    // toggle; the wordmark lives beside it and fades, hidden when collapsed.
    const collapsedLogo = collapsedNavigation.querySelector("[data-sidebar-header-logo-lock]");
    expect(collapsedLogo).toBeTruthy();
    expect(collapsedLogo).toHaveClass("w-12");
    expect((collapsedLogo as HTMLElement).querySelector("img")?.getAttribute("src")).toContain("archestimator_logo_white");
    expect(within(collapsedLogo as HTMLElement).queryByText("archestimator")).toBeNull();

    await userEvent.click(screen.getByRole("button", { name: "Expand sidebar" }));

    const navigation = screen.getByRole("navigation", { name: "Main navigation" });
    const expandedLogo = navigation.querySelector("[data-sidebar-header-logo-lock]");
    expect(expandedLogo).toBeTruthy();
    expect(expandedLogo).toHaveClass("w-12");
    expect(within(navigation).getByText("archestimator")).toHaveClass("text-[12px]", "text-white");
    expect(within(navigation).getByText("Favorites")).toBeInTheDocument();

    const favoriteProject = within(navigation).getByRole("link", { name: "Lewis Residence" });
    expect(favoriteProject).toHaveAttribute("href", "/workshop/projects/project-1");
    expect(favoriteProject).toHaveClass("pl-[52px]");

    const favoriteSheet = within(navigation).getByRole("link", { name: "Concept Budget" });
    expect(favoriteSheet).toHaveAttribute("href", "/workshop/projects/project-1/estimates/sheet-1");
    expect(favoriteSheet).toHaveClass("pl-[72px]");
    expect(favoriteSheet).toHaveAttribute("aria-current", "page");

    // The staleTime:0 reconcile actually runs on mount; the seeded SSR list must SURVIVE it
    // with no flash to empty (08 §State table / §214). Prove the queryFn ran and the list
    // persisted — without this the seeded-mock could pass as a pure initialData render test.
    await waitFor(() => expect(fetchSidebarFavoriteProjectsMock).toHaveBeenCalled());
    expect(within(navigation).getByRole("link", { name: "Lewis Residence" })).toBeInTheDocument();
    expect(within(navigation).queryByText("Star a project to pin it here.")).not.toBeInTheDocument();
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

  it("does not flash to empty while an in-flight reconcile is pending, then shows the hint after it settles empty", async () => {
    const seeded: MainSidebarFavoriteProject[] = [
      {
        favoriteCreatedAt: "2026-06-16T00:00:00.000Z",
        favoriteEstimateSheets: [],
        href: "/workshop/projects/project-1",
        id: "project-1",
        name: "Lewis Residence",
        projectCode: "AE-LR-001",
      },
    ];
    // Hold the reconcile in-flight so we can observe the window between first paint and settle.
    let resolveReconcile!: (value: MainSidebarFavoriteProject[]) => void;
    fetchSidebarFavoriteProjectsMock.mockReturnValue(
      new Promise<MainSidebarFavoriteProject[]>((resolve) => {
        resolveReconcile = resolve;
      }),
    );

    renderWithClient(
      <MainSidebar
        favoritesScope={scope}
        favoriteProjects={seeded}
        user={{ displayName: "Philip Lewis", email: "philip@example.com" }}
      />,
    );
    await userEvent.click(screen.getByRole("button", { name: "Expand sidebar" }));
    const nav = screen.getByRole("navigation", { name: "Main navigation" });

    // In-flight: the queryFn has fired (staleTime:0) but the seeded favorite is still painted
    // and the empty hint must NOT flash in (08 §30 — no flash to empty during reconcile).
    expect(fetchSidebarFavoriteProjectsMock).toHaveBeenCalled();
    expect(within(nav).getByRole("link", { name: "Lewis Residence" })).toBeInTheDocument();
    expect(within(nav).queryByText("Star a project to pin it here.")).not.toBeInTheDocument();

    // Only once the reconcile settles to zero favorites may the hint appear and the link leave.
    await act(async () => {
      resolveReconcile([]);
    });
    expect(await within(nav).findByText("Star a project to pin it here.")).toBeInTheDocument();
    expect(within(nav).queryByRole("link", { name: "Lewis Residence" })).not.toBeInTheDocument();
  });

  it("mounts two sr-only live regions with the correct ARIA wiring, always present", () => {
    const { container } = renderWithClient(
      <MainSidebar favoritesScope={scope} favoriteProjects={[]} user={{ displayName: "Philip Lewis" }} />,
    );

    const politeRegion = container.querySelector("[data-sidebar-favorites-status]");
    const alertRegion = container.querySelector("[data-sidebar-favorites-alert]");

    expect(politeRegion).not.toBeNull();
    expect(politeRegion).toHaveAttribute("role", "status");
    expect(politeRegion).toHaveAttribute("aria-live", "polite");
    expect(politeRegion).toHaveAttribute("aria-atomic", "true");
    expect(politeRegion).toHaveClass("sr-only");

    expect(alertRegion).not.toBeNull();
    expect(alertRegion).toHaveAttribute("role", "alert");
    expect(alertRegion).toHaveAttribute("aria-live", "assertive");
    expect(alertRegion).toHaveAttribute("aria-atomic", "true");
    expect(alertRegion).toHaveClass("sr-only");
  });

  it("routes the polite cue into the status live region when a non-favorited parent is toggled", async () => {
    const { container } = renderWithClient(
      <MainSidebar favoritesScope={scope} favoriteProjects={[]} user={{ displayName: "Philip Lewis" }} />,
    );
    const politeRegion = () => container.querySelector("[data-sidebar-favorites-status]");

    act(() => {
      announceSidebarFavoritePolite("Estimate favorited. Favorite the project to pin it in the sidebar.");
    });

    await waitFor(() =>
      expect(politeRegion()).toHaveTextContent(
        "Estimate favorited. Favorite the project to pin it in the sidebar.",
      ),
    );
  });

  it("clears the prior polite text before writing the next cue on a rapid second toggle (no stacking)", async () => {
    const { container } = renderWithClient(
      <MainSidebar favoritesScope={scope} favoriteProjects={[]} user={{ displayName: "Philip Lewis" }} />,
    );
    const politeRegion = () => container.querySelector("[data-sidebar-favorites-status]");

    act(() => {
      announceSidebarFavoritePolite("First cue.");
    });
    await waitFor(() => expect(politeRegion()).toHaveTextContent("First cue."));

    act(() => {
      announceSidebarFavoritePolite("Second cue.");
    });
    await waitFor(() => expect(politeRegion()).toHaveTextContent("Second cue."));
    // The first cue must not still be present (cleared before the second write, QA-20).
    expect(politeRegion()).not.toHaveTextContent("First cue.");
  });

  it("routes failure copy into the assertive alert region", async () => {
    const { container } = renderWithClient(
      <MainSidebar favoritesScope={scope} favoriteProjects={[]} user={{ displayName: "Philip Lewis" }} />,
    );
    const alertRegion = () => container.querySelector("[data-sidebar-favorites-alert]");

    act(() => {
      announceSidebarFavoriteAssertive("Could not update favorite. Try again.");
    });

    await waitFor(() => expect(alertRegion()).toHaveTextContent("Could not update favorite. Try again."));
  });

  it("homebase keeps router.replace but stops calling setProjectFavorite directly", async () => {
    const { readFileSync } = await import("node:fs");
    const src = readFileSync("src/components/workshop/WorkshopHomebaseClient.tsx", "utf8");
    expect(src).toContain('router.replace("/workshop", { scroll: false })'); // D8 navigation preserved
    expect(src).not.toContain("router.refresh");
    expect(src).toContain("useToggleProjectFavorite");
  });
});
