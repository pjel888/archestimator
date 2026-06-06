import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createElement } from "react";
import type { ImgHTMLAttributes } from "react";
import { afterEach, describe, expect, test, vi } from "vitest";

import { WorkshopHomebaseClient } from "@/components/workshop/WorkshopHomebaseClient";
import { WorkshopPageShell } from "@/components/workshop/WorkshopPageShell";

const mocks = vi.hoisted(() => ({
  routerReplace: vi.fn(),
  routerRefresh: vi.fn(),
  setProjectFavorite: vi.fn(async () => {}),
  setEstimateFavorite: vi.fn(async () => {}),
}));

vi.mock("@/lib/auth/session", () => ({
  getCurrentUserContext: vi.fn(async () => null),
}));

vi.mock("next/headers", () => ({
  cookies: vi.fn(async () => ({ get: vi.fn(() => undefined) })),
}));

vi.mock("next/navigation", () => ({
  usePathname: () => "/workshop",
  useRouter: () => ({
    replace: mocks.routerReplace,
    refresh: mocks.routerRefresh,
  }),
}));

vi.mock("next/image", () => ({
  default: (props: ImgHTMLAttributes<HTMLImageElement> & { fill?: boolean; priority?: boolean; sizes?: string }) => {
    const { alt, fill, priority, sizes, ...imageProps } = props;
    void fill;
    void priority;
    void sizes;

    return createElement("img", { alt: alt ?? "", ...imageProps });
  },
}));

vi.mock("@/lib/workshop/actions", () => ({
  setProjectFavorite: mocks.setProjectFavorite,
  setEstimateFavorite: mocks.setEstimateFavorite,
}));

const workshopHomebase = {
  workspace: {
    id: "workspace-1",
    name: "Test Workspace",
    slug: null,
    created_by: "user-1",
    created_at: "2026-05-01T00:00:00.000Z",
    updated_at: "2026-05-01T00:00:00.000Z",
  },
  projects: [
    {
      id: "22222222-2222-4222-8222-222222222222",
      name: "Lewis Residence",
      client_name: "M Family",
      project_code: "AE-LR-001",
      location: "Quezon City",
      updated_at: "2026-05-22T00:00:00.000Z",
      isFavorite: true,
      favoriteCreatedAt: "2026-05-23T00:00:00.000Z",
      accessKind: "project-member",
      currentUserRole: "viewer",
      ownerWorkspaceName: "Studio Partner",
      sharedEstimateCount: 1,
      pendingInviteCount: 2,
      publicationSummary: {
        status: "published",
        clientLinkPath: "/share/client-token",
        openCount: 4,
        latestOpenedAt: "2026-05-27T01:00:00.000Z",
        passwordRequired: true,
      },
    },
    {
      id: "33333333-3333-4333-8333-333333333333",
      name: "Makati Office",
      client_name: "North Studio",
      project_code: "AE-MO-002",
      location: "Makati",
      updated_at: "2026-05-20T00:00:00.000Z",
      isFavorite: false,
      favoriteCreatedAt: null,
      accessKind: "owned",
      currentUserRole: "owner",
      ownerWorkspaceName: null,
      sharedEstimateCount: 0,
      pendingInviteCount: 0,
    },
  ],
  estimates: [
    {
      id: "77777777-7777-4777-8777-777777777720",
      project_id: "22222222-2222-4222-8222-222222222222",
      name: "Lewis Residence - 001",
      sheet_code: "ES-001",
      updated_at: "2026-05-24T00:00:00.000Z",
      projectName: "Lewis Residence",
      projectCode: "AE-LR-001",
      firstNodeId: "88888888-8888-4888-8888-888888888888",
      isFavorite: true,
      favoriteCreatedAt: "2026-05-24T00:00:00.000Z",
    },
    {
      id: "99999999-9999-4999-8999-999999999999",
      project_id: "33333333-3333-4333-8333-333333333333",
      name: "Makati Office - Tender",
      sheet_code: "ES-002",
      updated_at: "2026-05-21T00:00:00.000Z",
      projectName: "Makati Office",
      projectCode: "AE-MO-002",
      firstNodeId: null,
      isFavorite: false,
      favoriteCreatedAt: null,
    },
  ],
  pendingInvites: [],
  removedProjectFavorites: [],
  receivedPendingInviteCount: 3,
};

const emptyWorkshopHomebase = {
  ...workshopHomebase,
  projects: [],
  estimates: [],
  pendingInvites: [],
  removedProjectFavorites: [],
  receivedPendingInviteCount: 0,
};

afterEach(() => {
  mocks.routerReplace.mockClear();
  mocks.routerRefresh.mockClear();
  mocks.setProjectFavorite.mockClear();
  mocks.setEstimateFavorite.mockClear();
});

describe("workshop sidebar baseline", () => {
  test("renders the workshop shell with an overlay sidebar and blank canvas", async () => {
    const user = userEvent.setup();

    render(
      await WorkshopPageShell({
        title: "Workshop",
        eyebrow: "Workspace",
        showEyebrow: false,
        breadcrumbs: ["Workshop"],
        contentClassName: "",
        sidebarStatus: { projectsBadgeCount: 3 },
        children: <div className="h-full bg-white" aria-label="Workshop empty canvas" />,
      }),
    );

    expect(screen.getByRole("main", { name: "Workshop" })).toBeTruthy();
    expect(screen.queryByText("Workshop shell")).toBeNull();
    expect(screen.queryByText("Select Projects or Components from the sidebar")).toBeNull();
    const navigation = screen.getByRole("navigation", { name: "Main navigation" });
    expect(navigation).toBeTruthy();
    expect(screen.getByRole("button", { name: "Expand sidebar" }).getAttribute("aria-expanded")).toBe("false");
    expect(screen.getByRole("link", { name: "Projects, 3 pending invites" })).toBeTruthy();
    expect(within(navigation).queryByRole("link", { name: "Settings" })).toBeNull();
    expect(navigation.querySelector('span[class*="bg-white/[0.10]"]')).toBeTruthy();
    expect(navigation.querySelector('span[class*="backdrop-blur-[1px]"]')).toBeTruthy();
    expect(screen.getByLabelText("Workshop empty canvas").childElementCount).toBe(0);
    expect(screen.queryByRole("button", { name: "Open Ask Flip" })).toBeNull();
    const settingsButton = screen.getByRole("button", { name: "Open settings" });
    expect(settingsButton).toBeTruthy();
    await user.click(settingsButton);
    const settingsDialog = screen.getByRole("dialog", { name: "Settings" });
    const settingsNav = within(settingsDialog).getByRole("navigation", { name: "Settings sections" });
    expect(within(settingsNav).getByRole("link", { name: "Show Account settings" })).toHaveAttribute(
      "href",
      "#settings-account",
    );
    expect(within(settingsDialog).getByRole("region", { name: "Account" })).toBeTruthy();
    expect(within(settingsDialog).getByRole("link", { name: "Open Profile settings" })).toHaveAttribute(
      "href",
      "/workshop/settings/profile",
    );
    expect(within(settingsDialog).getByRole("link", { name: "Open Workspace settings" })).toHaveAttribute(
      "href",
      "/workshop/settings/workspace",
    );
    expect(within(settingsDialog).getByRole("button", { name: "Sign out" })).toBeTruthy();
    expect(within(settingsDialog).queryByRole("link", { name: "Open Beta users" })).toBeNull();
    expect(screen.getByRole("link", { name: "Send beta feedback" })).toHaveAttribute(
      "href",
      "/workshop/feedback",
    );
  });

  test("renders a bento homebase without search chrome and with persisted favorite targets", async () => {
    const user = userEvent.setup();
    const { container } = render(<WorkshopHomebaseClient homebase={workshopHomebase} />);

    expect(container.querySelector("div.h-full.min-h-0.bg-white.p-2")).toBeTruthy();
    expect(screen.queryByLabelText("Search Workshop")).toBeNull();
    expect(screen.queryByLabelText("Workshop tools")).toBeNull();
    expect(screen.queryByRole("button", { name: "Filter workshop" })).toBeNull();
    expect(screen.queryByRole("button", { name: "Group workshop" })).toBeNull();
    expect(screen.queryByRole("button", { name: "Expand all workshop" })).toBeNull();
    expect(screen.queryByRole("button", { name: "Collapse all workshop" })).toBeNull();
    expect(screen.getAllByRole("link", { name: /Open Projects/ })[0]).toHaveAttribute("href", "/workshop/projects");
    expect(screen.getByRole("link", { name: /Open Components/ })).toHaveAttribute("href", "/workshop/library");
    expect(screen.getByRole("link", { name: /Open Templates/ })).toHaveAttribute("href", "/workshop/templates");
    expect(screen.getAllByRole("link", { name: /Open Projects/ })[0]).toHaveClass("aspect-square");
    expect(screen.getByRole("link", { name: /Open Components/ })).toHaveClass("aspect-square");
    expect(screen.getByRole("link", { name: /Open Templates/ })).toHaveClass("aspect-square");
    expect(container.querySelector('img[src="/Cards/Projects-Card.jpg"]')).toBeTruthy();
    expect(container.querySelector('img[src="/Cards/Components-Card.jpg"]')).toBeTruthy();
    expect(container.querySelector('img[src="/Cards/Templates-Card.jpg"]')).toBeTruthy();
    expect(container.querySelector('img[class*="mix-blend-soft-light"]')).toBeTruthy();
    expect(screen.queryByText("Workshop routes")).toBeNull();
    expect(screen.queryByText("Start")).toBeNull();
    expect(screen.queryByText("Reuse")).toBeNull();
    const routePanel = screen.getByRole("region", { name: "Workshop routes" });
    expect(routePanel).toHaveClass("bg-transparent");
    expect(routePanel).toHaveClass("p-0");
    expect(routePanel).toHaveClass("border-0");
    expect(routePanel).not.toHaveClass("bg-white");
    const favorites = screen.getByRole("region", { name: "Favorites" });
    expect(within(favorites).queryByText("Starred")).toBeNull();
    const favoriteTabs = within(favorites).getByRole("tablist", { name: "Favorite views" });
    expect(within(favoriteTabs).getAllByRole("tab").map((tab) => tab.textContent)).toEqual(["Projects", "Estimate Sheets"]);
    expect(within(favoriteTabs).getByRole("tab", { name: "Projects" })).toHaveAttribute("aria-selected", "true");
    expect(within(favorites).getByRole("tabpanel", { name: "Favorite projects" })).toBeTruthy();
    expect(within(favorites).getByRole("link", { name: /Lewis Residence/ })).toHaveAttribute(
      "href",
      "/workshop/projects/22222222-2222-4222-8222-222222222222",
    );
    expect(within(favorites).getByText("Shared link")).toBeInTheDocument();
    expect(within(favorites).getByText("4 opens")).toBeInTheDocument();
    expect(within(favorites).getByText("Shared project")).toBeInTheDocument();
    expect(within(favorites).getByText("Viewer")).toBeInTheDocument();
    expect(within(favorites).getByText("Shared by Studio Partner")).toBeInTheDocument();
    expect(within(favorites).getByText("2 pending invites")).toBeInTheDocument();
    expect(screen.getAllByRole("button", { name: "Remove Lewis Residence from favorite projects" })[0]).toHaveAttribute(
      "aria-pressed",
      "true",
    );

    await user.click(screen.getAllByRole("button", { name: "Remove Lewis Residence from favorite projects" })[0]);
    expect(mocks.setProjectFavorite).toHaveBeenCalledWith({
      projectId: "22222222-2222-4222-8222-222222222222",
      favorite: false,
    });

    await user.click(within(favoriteTabs).getByRole("tab", { name: "Estimate Sheets" }));
    expect(within(favoriteTabs).getByRole("tab", { name: "Estimate Sheets" })).toHaveAttribute("aria-selected", "true");
    expect(within(favorites).getByRole("tabpanel", { name: "Favorite estimate sheets" })).toBeTruthy();
    expect(within(favorites).getByRole("link", { name: /Lewis Residence - 001/ })).toHaveAttribute(
      "href",
      "/workshop/projects/22222222-2222-4222-8222-222222222222/estimates/88888888-8888-4888-8888-888888888888",
    );
    expect(screen.queryByText("Project shortcuts")).toBeNull();
    expect(screen.queryByText("Estimate sheet shortcuts")).toBeNull();
    expect(screen.queryByText("First move")).toBeNull();
    expect(screen.queryByText("Recommended")).toBeNull();

    expect(screen.queryByText("Recent Projects")).toBeNull();
    expect(screen.queryByText("Sample Projects")).toBeNull();
    expect(screen.queryByText("View all")).toBeNull();
  });

  test("keeps a first-run workshop homebase actionable without projects or favorites", async () => {
    const user = userEvent.setup();
    render(<WorkshopHomebaseClient homebase={emptyWorkshopHomebase} />);

    const routePanel = screen.getByRole("region", { name: "Workshop routes" });
    expect(routePanel).toBeTruthy();
    expect(within(routePanel).getByRole("link", { name: /Open Projects/ })).toHaveAttribute(
      "href",
      "/workshop/projects",
    );
    expect(within(routePanel).getByRole("link", { name: /Open Components/ })).toHaveAttribute(
      "href",
      "/workshop/library",
    );
    expect(within(routePanel).getByRole("link", { name: /Open Templates/ })).toHaveAttribute(
      "href",
      "/workshop/templates",
    );

    const favorites = screen.getByRole("region", { name: "Favorites" });
    expect(within(favorites).getByText("No favorite projects yet")).toBeInTheDocument();
    expect(within(favorites).getByText("Star a project below to keep it pinned here.")).toBeInTheDocument();
    expect(screen.queryByText("Recent Projects")).toBeNull();
    expect(screen.queryByText("Sample Projects")).toBeNull();
    expect(screen.queryByRole("button", { name: "Open Ask Flip" })).toBeNull();

    await user.click(within(favorites).getByRole("tab", { name: "Estimate Sheets" }));
    expect(within(favorites).getByRole("tabpanel", { name: "Favorite estimate sheets" })).toBeTruthy();
    expect(within(favorites).getByText("No favorite estimate sheets yet")).toBeInTheDocument();
    expect(within(favorites).getByText("Star a sheet below for direct access from Workshop.")).toBeInTheDocument();
  });

  test("renders removed favorite project banner and lets the user clear the stale favorite", async () => {
    const user = userEvent.setup();
    render(
      <WorkshopHomebaseClient
        homebase={{
          ...workshopHomebase,
          removedProjectFavorites: [
            {
              id: "44444444-4444-4444-8444-444444444444",
              name: "Shared Clinic Fit-Out",
              projectCode: "AE-SC-101",
              favoriteCreatedAt: "2026-05-30T00:00:00.000Z",
            },
          ],
        }}
      />,
    );

    const banner = screen.getByRole("region", { name: "Project access removed" });
    expect(within(banner).getByText("Project access removed")).toBeInTheDocument();
    expect(within(banner).getByText("You no longer have access to Shared Clinic Fit-Out. The project owner may have changed your access.")).toBeInTheDocument();

    await user.click(within(banner).getByRole("button", { name: "Remove from favorites" }));
    expect(mocks.setProjectFavorite).toHaveBeenCalledWith({
      projectId: "44444444-4444-4444-8444-444444444444",
      favorite: false,
    });
    expect(mocks.routerReplace).toHaveBeenCalledWith("/workshop", { scroll: false });
  });
});
