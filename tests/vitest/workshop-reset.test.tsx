import { cleanup, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";
import { afterEach, describe, expect, test, vi } from "vitest";

import { WorkshopHomebaseClient } from "@/components/workshop/WorkshopHomebaseClient";
import { WorkshopRouteHeader } from "@/components/workshop/WorkshopRouteHeader";
import { WorkshopShell } from "@/components/workshop/WorkshopShell";
import { WorkshopDashboard } from "@/components/workshop/dashboard/WorkshopDashboard";

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

vi.mock("@/components/onboarding/AuthenticatedOnboardingHost", () => ({
  AuthenticatedOnboardingHost: () => null,
}));

vi.mock("@/components/workshop/WorkshopFeedbackModal", () => ({
  WorkshopFeedbackModal: () => (
    <button type="button" aria-haspopup="dialog">Send feedback</button>
  ),
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
      currentUserRole: "admin",
      canManagePublication: true,
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
      canManagePublication: true,
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
  recentTemplates: [
    {
      id: "tmpl-1",
      name: "Two-Storey Residential",
      category: "Residential",
      rowCount: 240,
    },
  ],
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
  cleanup();
  mocks.routerReplace.mockClear();
  mocks.routerRefresh.mockClear();
  mocks.setProjectFavorite.mockClear();
});

function renderWithQueryClient(ui: ReactNode) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>,
  );
}

function renderWorkshopDashboard({
  homebase = workshopHomebase,
  favoriteProjects = favoriteProjectsFixture,
  librarySpotlight = librarySpotlightFixture,
}: {
  homebase?: typeof workshopHomebase;
  favoriteProjects?: typeof favoriteProjectsFixture;
  librarySpotlight?: typeof librarySpotlightFixture | null;
} = {}) {
  return renderWithQueryClient(
    <WorkshopHomebaseClient
      homebase={homebase}
      favoritesScope={{ workspaceId: "workspace-1", userId: "user-1" }}
    >
      <WorkshopDashboard
        homebase={homebase}
        favoriteProjects={favoriteProjects}
        librarySpotlight={librarySpotlight}
        favoritesScope={{ workspaceId: "workspace-1", userId: "user-1" }}
      />
    </WorkshopHomebaseClient>,
  );
}

describe("workshop sidebar shell", () => {
  test("renders the workshop shell with an overlay sidebar and blank canvas", async () => {
    renderWithQueryClient(
      await WorkshopShell({
        sidebarStatus: { projectsBadgeCount: 3 },
        children: await WorkshopRouteHeader({
          title: "Workshop",
          eyebrow: "Workspace",
          showEyebrow: false,
          breadcrumbs: ["Workshop"],
          contentClassName: "",
          children: (
            <div className="h-full bg-white" aria-label="Workshop empty canvas" />
          ),
        }),
      }),
    );

    expect(screen.getByRole("main", { name: "Workshop" })).toBeTruthy();
    const navigation = screen.getByRole("navigation", {
      name: "Main navigation",
    });
    expect(navigation).toBeTruthy();
    expect(
      screen
        .getByRole("button", { name: "Expand sidebar" })
        .getAttribute("aria-expanded"),
    ).toBe("false");
    expect(
      screen.getByRole("link", { name: "Projects, 3 pending invites" }),
    ).toBeTruthy();
    const headerFrame = navigation.querySelector("[data-sidebar-header-frame]");
    expect(headerFrame).toBeTruthy();
    expect(headerFrame).toHaveClass("sidebar-logo-frame");
    const primaryNavGroup = navigation.querySelector(
      "[data-sidebar-primary-nav-group]",
    );
    expect(primaryNavGroup).toBeTruthy();
    const sectionDividers = navigation.querySelectorAll(
      "[data-sidebar-section-divider]",
    );
    expect(sectionDividers).toHaveLength(3);
    expect(
      screen.getByLabelText("Workshop empty canvas").childElementCount,
    ).toBe(0);
    expect(screen.queryByRole("button", { name: "Open Ask Flip" })).toBeNull();
    expect(
      screen.getByRole("button", { name: "Send feedback" }),
    ).toHaveAttribute("aria-haspopup", "dialog");
  });

  test("keeps project-aligned chrome padding symmetrical", async () => {
    const { container } = renderWithQueryClient(
      await WorkshopShell({
        children: await WorkshopRouteHeader({
          title: "Lewis Residence",
          eyebrow: "Workshop",
          breadcrumbs: ["Workshop", "Projects", "Lewis Residence"],
          alignChromeToProjectSidebar: true,
          contentClassName: "",
          children: (
            <div className="h-full bg-white" aria-label="Project canvas" />
          ),
        }),
      }),
    );

    const header = container.querySelector("header");
    expect(header).toHaveClass("p-2", "lg:py-2", "lg:px-2");
    expect(header?.className).not.toContain("lg:pl-[25px]");
  });
});

describe("workshop dashboard homebase", () => {
  test("renders the command-center dashboard: greeting hero, quick links, recents, favorites, and the continue CTA", () => {
    renderWorkshopDashboard();

    // Command-center destination field — the populated dashboard starts with
    // the actual surfaces, not an empty greeting shell.
    expect(screen.getByText("Projects Shown")).toBeInTheDocument();
    expect(screen.getByText("Sheets Shown")).toBeInTheDocument();

    // Quick links into the primary surfaces.
    expect(
      screen.getByRole("link", { name: "Open Projects" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: "Open Templates" }),
    ).toBeInTheDocument();

    // Recent ledgers wired to real homebase data ("Makati Office" appears as both a
    // project and the parent of a recent sheet, so assert at least one).
    expect(
      screen.getByRole("heading", { name: "Projects" }),
    ).toBeInTheDocument();
    expect(screen.getAllByText("Makati Office").length).toBeGreaterThan(0);
    expect(
      screen.getByRole("heading", { name: "Estimate Sheets" }),
    ).toBeInTheDocument();
    expect(screen.getByText("Makati Office - Tender")).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: "Components" }),
    ).toBeInTheDocument();

    // Favorites tree (per-sheet favoriting → real nested tree).
    const favoritesTree = screen.getByRole("tree", {
      name: "Favorite projects and estimate sheets",
    });
    expect(
      within(favoritesTree).getByText("Lewis Residence"),
    ).toBeInTheDocument();

    // Continue-where-you-left-off deep link into the most recent sheet's editor.
    const continueLink = screen.getByRole("link", {
      name: /Continue editing Lewis Residence - 001/,
    });
    expect(continueLink).toHaveAttribute(
      "href",
      "/workshop/projects/22222222-2222-4222-8222-222222222222/estimates/88888888-8888-4888-8888-888888888888",
    );

    // Primary creation entry point.
    expect(
      screen.getByRole("button", { name: "New project" }),
    ).toBeInTheDocument();
  });

  test("uses the dashboard cards for projects, estimate sheets, and components", () => {
    renderWorkshopDashboard();

    expect(screen.getByRole("list", { name: "Projects" })).toBeInTheDocument();
    expect(
      screen.getByRole("list", { name: "Estimate sheets" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("list", { name: "Recent components" }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("list", {
        name: "Recent published project shared links",
      }),
    ).toBeNull();
  });

  test("zero-data homebase keeps the normal bento dashboard with empty ledgers", () => {
    renderWorkshopDashboard({
      homebase: emptyWorkshopHomebase,
      favoriteProjects: [],
      librarySpotlight: null,
    });

    // The full bento stays visible even when project/sheet lists are empty.
    expect(screen.getByText("Projects Shown")).toBeInTheDocument();
    expect(screen.getByText("Sheets Shown")).toBeInTheDocument();
    expect(
      screen.getAllByRole("link", { name: "Open Projects" }).length,
    ).toBeGreaterThan(0);
    expect(
      screen.getByRole("link", { name: "Open Templates" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: "Open Library" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "New project" }),
    ).toBeInTheDocument();

    // Lists remain in place as blank ledgers with zero rows.
    expect(
      screen.getByRole("list", { name: "Projects" }).childElementCount,
    ).toBe(0);
    expect(
      screen.getByRole("list", { name: "Estimate sheets" })
        .childElementCount,
    ).toBe(0);
    expect(
      screen.getByRole("tree", { name: "Favorite projects and estimate sheets" }).childElementCount,
    ).toBe(0);
    expect(screen.getByRole("heading", { name: "Projects" })).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: "Estimate Sheets" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Components" })).toBeInTheDocument();
    expect(
      screen.getByRole("list", { name: "Recent components" }).childElementCount,
    ).toBe(0);
    expect(screen.queryByText("No shared links yet")).toBeNull();
    expect(screen.queryByText("No recent components yet")).toBeNull();
    expect(screen.queryByText("Star a project or estimate sheet to pin it here.")).toBeNull();
    expect(screen.queryByText("No recent projects yet")).toBeNull();
    expect(screen.queryByText("No recent estimate sheets yet")).toBeNull();
    expect(screen.queryByRole("region", { name: "Get started" })).toBeNull();
    expect(screen.queryByText("First run")).toBeNull();
  });

  test("renders removed favorite project banner and lets the user clear the stale favorite", async () => {
    const user = userEvent.setup();
    renderWithQueryClient(
      <WorkshopHomebaseClient
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
      >
        <div aria-label="Dashboard placeholder" />
      </WorkshopHomebaseClient>,
    );

    const banner = screen.getByRole("region", {
      name: "Project access removed",
    });
    expect(
      within(banner).getByText("Project access removed"),
    ).toBeInTheDocument();
    expect(
      within(banner).getByText(
        "You no longer have access to Shared Clinic Fit-Out. The project owner may have changed your access.",
      ),
    ).toBeInTheDocument();

    await user.click(
      within(banner).getByRole("button", { name: "Remove from favorites" }),
    );
    expect(mocks.setProjectFavorite).toHaveBeenCalledWith({
      projectId: "44444444-4444-4444-8444-444444444444",
      favorite: false,
    });
    expect(mocks.routerReplace).toHaveBeenCalledWith("/workshop", {
      scroll: false,
    });
  });
});
