import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";
import { afterEach, describe, expect, test, vi } from "vitest";

import { WorkshopHomebaseClient } from "@/components/workshop/WorkshopHomebaseClient";
import { WorkshopPageShell } from "@/components/workshop/WorkshopPageShell";

const mocks = vi.hoisted(() => ({
  routerReplace: vi.fn(),
  routerRefresh: vi.fn(),
  setProjectFavorite: vi.fn(async () => {}),
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

vi.mock("@/lib/workshop/actions", () => ({
  setProjectFavorite: mocks.setProjectFavorite,
}));

// The create-project modal pulls in server actions + the full form graph. The
// dashboard tests only care that the trigger renders, so stub the modal.
vi.mock("@/components/workshop/NewProjectModal", () => ({
  NewProjectModal: () => null,
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

const favoriteProjectsFixture = [
  {
    id: "22222222-2222-4222-8222-222222222222",
    name: "Lewis Residence",
    projectCode: "AE-LR-001",
    href: "/workshop/projects/22222222-2222-4222-8222-222222222222",
    favoriteCreatedAt: "2026-05-23T00:00:00.000Z",
    favoriteEstimateSheets: [
      {
        id: "77777777-7777-4777-8777-777777777720",
        name: "Lewis Residence - 001",
        projectId: "22222222-2222-4222-8222-222222222222",
        sheetCode: "ES-001",
        href: "/workshop/projects/22222222-2222-4222-8222-222222222222/estimates/77777777-7777-4777-8777-777777777720",
        favoriteCreatedAt: "2026-05-24T00:00:00.000Z",
      },
    ],
  },
];

const librarySpotlightFixture = {
  componentCount: 128,
  templateCount: 7,
  recentTemplates: [{ id: "tmpl-1", name: "Two-Storey Residential", category: "Residential", rowCount: 240 }],
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
});

function renderWithQueryClient(ui: ReactNode) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(<QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>);
}

describe("workshop sidebar shell", () => {
  test("renders the workshop shell with an overlay sidebar and blank canvas", async () => {
    renderWithQueryClient(
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
    const navigation = screen.getByRole("navigation", { name: "Main navigation" });
    expect(navigation).toBeTruthy();
    expect(screen.getByRole("button", { name: "Expand sidebar" }).getAttribute("aria-expanded")).toBe("false");
    expect(screen.getByRole("link", { name: "Projects, 3 pending invites" })).toBeTruthy();
    const headerFrame = navigation.querySelector("[data-sidebar-header-frame]");
    expect(headerFrame).toBeTruthy();
    expect(headerFrame).toHaveClass("sidebar-logo-frame");
    const primaryNavGroup = navigation.querySelector("[data-sidebar-primary-nav-group]");
    expect(primaryNavGroup).toBeTruthy();
    const sectionDividers = navigation.querySelectorAll("[data-sidebar-section-divider]");
    expect(sectionDividers).toHaveLength(3);
    expect(screen.getByLabelText("Workshop empty canvas").childElementCount).toBe(0);
    expect(screen.queryByRole("button", { name: "Open Ask Flip" })).toBeNull();
    expect(screen.getByRole("button", { name: "Send beta feedback" })).toHaveAttribute("aria-haspopup", "dialog");
  });

  test("keeps project-aligned chrome padding symmetrical", async () => {
    const { container } = renderWithQueryClient(
      await WorkshopPageShell({
        title: "Lewis Residence",
        eyebrow: "Workshop",
        breadcrumbs: ["Workshop", "Projects", "Lewis Residence"],
        alignChromeToProjectSidebar: true,
        contentClassName: "",
        children: <div className="h-full bg-white" aria-label="Project canvas" />,
      }),
    );

    const header = container.querySelector("header");
    expect(header).toHaveClass("p-2", "lg:py-2", "lg:px-2");
    expect(header?.className).not.toContain("lg:pl-[25px]");
  });
});

describe("workshop dashboard homebase", () => {
  test("renders the command-center dashboard: greeting hero, quick links, recents, favorites, and the continue CTA", () => {
    renderWithQueryClient(
      <WorkshopHomebaseClient
        homebase={workshopHomebase}
        favoriteProjects={favoriteProjectsFixture}
        librarySpotlight={librarySpotlightFixture}
        favoritesScope={{ workspaceId: "workspace-1", userId: "user-1" }}
        userDisplayName="Philip Lewis"
      />,
    );

    // Greeting hero — a11y hooks preserved (region, tone text, name, period icon).
    const greeting = screen.getByRole("region", { name: "Workshop greeting" });
    expect(within(greeting).getByText(/Good (morning|afternoon|evening)/)).toBeInTheDocument();
    expect(within(greeting).getByRole("img", { name: /^(Morning|Afternoon|Night)$/ })).toBeInTheDocument();
    expect(within(greeting).getByText("Philip Lewis")).toBeInTheDocument();

    // Quick links into the primary surfaces.
    expect(screen.getByRole("link", { name: "Open Projects" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Open Templates" })).toBeInTheDocument();

    // Recent lists wired to real homebase data ("Makati Office" appears as both a
    // recent project and the parent of a recent sheet, so assert at least one).
    expect(screen.getByText("Recent projects")).toBeInTheDocument();
    expect(screen.getAllByText("Makati Office").length).toBeGreaterThan(0);
    expect(screen.getByText("Recent estimate sheets")).toBeInTheDocument();
    expect(screen.getByText("Makati Office - Tender")).toBeInTheDocument();

    // Favorites tree (per-sheet favoriting → real nested tree).
    const favoritesTree = screen.getByRole("tree", { name: "Favorite projects" });
    expect(within(favoritesTree).getByText("Lewis Residence")).toBeInTheDocument();

    // Continue-where-you-left-off deep link into the most recent sheet's editor.
    const continueLink = screen.getByRole("link", { name: /Continue editing Lewis Residence - 001/ });
    expect(continueLink).toHaveAttribute(
      "href",
      "/workshop/projects/22222222-2222-4222-8222-222222222222/estimates/88888888-8888-4888-8888-888888888888",
    );

    // Primary creation entry point.
    expect(screen.getByText("Start something new")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "New project" })).toBeInTheDocument();
  });

  test("first-run homebase shows a purposeful empty state, not a blank canvas", () => {
    renderWithQueryClient(
      <WorkshopHomebaseClient
        homebase={emptyWorkshopHomebase}
        favoriteProjects={[]}
        librarySpotlight={null}
        favoritesScope={{ workspaceId: "workspace-1", userId: "user-1" }}
      />,
    );

    const greeting = screen.getByRole("region", { name: "Workshop greeting" });
    expect(within(greeting).getByText(/Good (morning|afternoon|evening)/)).toBeInTheDocument();
    expect(within(greeting).getByText("there")).toBeInTheDocument();

    // The first-run state drives the first project, and the full grid is hidden.
    expect(screen.getByText(/build your first estimate/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "New project" })).toBeInTheDocument();
    expect(screen.queryByText("Recent projects")).toBeNull();
    expect(screen.queryByRole("tree", { name: "Favorite projects" })).toBeNull();
  });

  test("renders removed favorite project banner and lets the user clear the stale favorite", async () => {
    const user = userEvent.setup();
    renderWithQueryClient(
      <WorkshopHomebaseClient
        favoriteProjects={[]}
        librarySpotlight={null}
        favoritesScope={{ workspaceId: "workspace-1", userId: "user-1" }}
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
    expect(
      within(banner).getByText(
        "You no longer have access to Shared Clinic Fit-Out. The project owner may have changed your access.",
      ),
    ).toBeInTheDocument();

    await user.click(within(banner).getByRole("button", { name: "Remove from favorites" }));
    expect(mocks.setProjectFavorite).toHaveBeenCalledWith({
      projectId: "44444444-4444-4444-8444-444444444444",
      favorite: false,
    });
    expect(mocks.routerReplace).toHaveBeenCalledWith("/workshop", { scroll: false });
  });
});
