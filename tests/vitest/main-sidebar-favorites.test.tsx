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

function favoriteProject(overrides: Partial<MainSidebarFavoriteProject> = {}): MainSidebarFavoriteProject {
  return {
    favoriteCreatedAt: "2026-06-16T00:00:00.000Z",
    favoriteEstimateSheets: [],
    href: "/workshop/projects/project-1",
    id: "project-1",
    name: "Lewis Residence",
    projectCode: "AE-LR-001",
    ...overrides,
  };
}

function createDeferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((nextResolve) => {
    resolve = nextResolve;
  });
  return { promise, resolve };
}

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
    expect(within(collapsedNavigation).queryByText("Favorites")).toHaveClass("opacity-0");

    await userEvent.click(screen.getByRole("button", { name: "Expand sidebar" }));

    const navigation = screen.getByRole("navigation", { name: "Main navigation" });
    expect(within(navigation).getByText("Favorites")).toBeInTheDocument();

    const favoriteProject = within(navigation).getByRole("link", { name: "Lewis Residence" });
    expect(favoriteProject).toHaveAttribute("href", "/workshop/projects/project-1");
    expect(favoriteProject).toHaveClass("pl-[52px]");

    const favoriteSheet = within(navigation).getByRole("link", { name: "Concept Budget" });
    expect(favoriteSheet).toHaveAttribute("href", "/workshop/projects/project-1/estimates/sheet-1");
    expect(favoriteSheet).toHaveClass("pl-[72px]");
    expect(favoriteSheet).toHaveAttribute("aria-current", "page");

    // The SSR-seeded list is treated as fresh within staleTime, so NO mount refetch fires
    // (one server-action round-trip saved per workshop navigation) and the seeded list paints
    // with no flash to empty (08 §State table / §214). Favorite/unfavorite still reflect via the
    // toggle's onSettled invalidateQueries, which bypasses staleTime (covered elsewhere).
    await Promise.resolve(); // flush a microtask — a mount refetch would have fired here
    expect(fetchSidebarFavoriteProjectsMock).not.toHaveBeenCalled();
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

  it("defers stale sidebar favorites until the collapsed rail is hovered", async () => {
    fetchSidebarFavoriteProjectsMock.mockResolvedValue([
      favoriteProject({ id: "project-hover", href: "/workshop/projects/project-hover", name: "Hover Project" }),
    ]);

    renderWithClient(
      <MainSidebar
        favoritesScope={scope}
        favoriteProjects={[]}
        favoriteProjectsFresh={false}
        user={{ displayName: "Philip Lewis", email: "philip@example.com" }}
      />,
    );

    await act(async () => { await Promise.resolve(); });
    expect(fetchSidebarFavoriteProjectsMock).not.toHaveBeenCalled();

    const nav = screen.getByRole("navigation", { name: "Main navigation" });
    await userEvent.hover(nav);
    await waitFor(() => expect(fetchSidebarFavoriteProjectsMock).toHaveBeenCalledTimes(1));

    await userEvent.click(screen.getByRole("button", { name: "Expand sidebar" }));
    expect(within(nav).getByRole("link", { name: "Hover Project" })).toHaveAttribute("href", "/workshop/projects/project-hover");
  });

  it("hydrates deferred favorites on expand without showing the empty hint while loading", async () => {
    const deferred = createDeferred<MainSidebarFavoriteProject[]>();
    fetchSidebarFavoriteProjectsMock.mockReturnValue(deferred.promise);

    renderWithClient(
      <MainSidebar
        favoritesScope={scope}
        favoriteProjects={[]}
        favoriteProjectsFresh={false}
        user={{ displayName: "Philip Lewis", email: "philip@example.com" }}
      />,
    );

    await act(async () => { await Promise.resolve(); });
    expect(fetchSidebarFavoriteProjectsMock).not.toHaveBeenCalled();

    await userEvent.click(screen.getByRole("button", { name: "Expand sidebar" }));
    const nav = screen.getByRole("navigation", { name: "Main navigation" });
    expect(fetchSidebarFavoriteProjectsMock).toHaveBeenCalledTimes(1);
    expect(within(nav).queryByText("Star a project to pin it here.")).not.toBeInTheDocument();

    await act(async () => {
      deferred.resolve([]);
      await deferred.promise;
    });
    expect(await within(nav).findByText("Star a project to pin it here.")).toBeInTheDocument();
  });

  it("does not flash to empty on a workshop navigation — the SSR-seeded list is authoritative, no mount reconcile", async () => {
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
    // A mount refetch — if one fired — would resolve to [] (the beforeEach default) and could
    // flash the seeded favorite away. Prove no such reconcile fires: the seeded list stays.
    fetchSidebarFavoriteProjectsMock.mockResolvedValue([]);

    renderWithClient(
      <MainSidebar
        favoritesScope={scope}
        favoriteProjects={seeded}
        user={{ displayName: "Philip Lewis", email: "philip@example.com" }}
      />,
    );
    await userEvent.click(screen.getByRole("button", { name: "Expand sidebar" }));
    const nav = screen.getByRole("navigation", { name: "Main navigation" });

    // No mount refetch (staleTime treats the SSR seed as fresh), so the seeded favorite is
    // painted and stays — the empty hint must NOT flash in (08 §30 — no flash to empty).
    await Promise.resolve(); // flush a microtask — a mount refetch would have fired here
    expect(fetchSidebarFavoriteProjectsMock).not.toHaveBeenCalled();
    // Settle a few async turns to be sure the seeded list is not clobbered by a late reconcile.
    await act(async () => { await Promise.resolve(); });
    expect(within(nav).getByRole("link", { name: "Lewis Residence" })).toBeInTheDocument();
    expect(within(nav).queryByText("Star a project to pin it here.")).not.toBeInTheDocument();
  });

  it("mounts two sr-only live regions with the correct ARIA wiring, always present", () => {
    const { container } = renderWithClient(
      <MainSidebar favoritesScope={scope} favoriteProjects={[]} user={{ displayName: "Philip Lewis" }} />,
    );

    const politeRegion = container.querySelector("[data-sidebar-favorites-status]");
    const alertRegion = container.querySelector("[data-sidebar-favorites-alert]");

    expect(politeRegion).not.toBeNull();
    expect(politeRegion?.tagName.toLowerCase()).toBe("output");
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
