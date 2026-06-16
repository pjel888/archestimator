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
});

function renderWithQueryClient(ui: ReactNode) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(<QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>);
}

describe("workshop sidebar baseline", () => {
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
    expect(screen.queryByText("Workshop shell")).toBeNull();
    expect(screen.queryByText("Select Projects or Components from the sidebar")).toBeNull();
    const navigation = screen.getByRole("navigation", { name: "Main navigation" });
    expect(navigation).toBeTruthy();
    expect(screen.getByRole("button", { name: "Expand sidebar" }).getAttribute("aria-expanded")).toBe("false");
    expect(screen.getByRole("link", { name: "Projects, 3 pending invites" })).toBeTruthy();
    expect(navigation.querySelector('div[class*="bg-surface-muted"]')).toBeTruthy();
    expect(navigation.querySelector('div[style*="color-mix(in srgb, var(--brand-orange) 25%, white)"]')).toBeTruthy();
    const headerFrame = navigation.querySelector("[data-sidebar-header-frame]");
    expect(headerFrame).toBeTruthy();
    expect(headerFrame?.getAttribute("style")).toContain("height: 86px");
    const brandRow = navigation.querySelector("[data-sidebar-header-brand-row]");
    expect(brandRow).toBeTruthy();
    expect(brandRow).toHaveClass("h-10", "items-center", "border-b");
    expect(brandRow?.getAttribute("style")).toContain("color-mix(in srgb, var(--brand-orange) 25%, white)");
    const logoLock = navigation.querySelector("[data-sidebar-header-logo-lock]");
    expect(logoLock).toBeTruthy();
    expect(logoLock?.getAttribute("style")).toContain("width: 148px");
    expect(within(logoLock as HTMLElement).getByText("archestimator")).toHaveClass("text-[12px]", "text-brand-orange");
    expect(navigation.querySelector("[data-sidebar-workspace-shell]")).toBeNull();
    expect(navigation.querySelector('span[class*="text-brand-orange"]')).toBeTruthy();
    expect(navigation.querySelector('[class*="backdrop-blur"]')).toBeNull();
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

  test("renders a sparse dynamic greeting without search chrome, route cards, or favorites", async () => {
    const { container } = renderWithQueryClient(
      <WorkshopHomebaseClient
        homebase={workshopHomebase}
        favoritesScope={{ workspaceId: "workspace-1", userId: "user-1" }}
        userDisplayName="Philip Lewis"
      />,
    );

    expect(container.querySelector("div.h-full.min-h-0.bg-white.p-2")).toBeTruthy();
    expect(screen.queryByLabelText("Search Workshop")).toBeNull();
    expect(screen.queryByLabelText("Workshop tools")).toBeNull();
    expect(screen.queryByRole("button", { name: "Filter workshop" })).toBeNull();
    expect(screen.queryByRole("button", { name: "Group workshop" })).toBeNull();
    expect(screen.queryByRole("button", { name: "Expand all workshop" })).toBeNull();
    expect(screen.queryByRole("button", { name: "Collapse all workshop" })).toBeNull();

    const greeting = screen.getByRole("region", { name: "Workshop greeting" });
    expect(within(greeting).getByText(/Good (morning|afternoon|evening)/)).toBeInTheDocument();
    const periodIcon = within(greeting).getByRole("img", { name: /^(Morning|Afternoon|Night)$/ });
    expect(periodIcon).toBeInTheDocument();
    const iconShell = periodIcon.closest("div");
    expect(iconShell).toBeTruthy();
    expect(iconShell).not.toHaveClass("border");
    expect(iconShell).not.toHaveClass("bg-surfaceMuted/50");
    expect(iconShell).not.toHaveAttribute("aria-label");
    expect(within(greeting).getByText("Philip Lewis")).toBeInTheDocument();
    expect(greeting.querySelector("svg")).toBeTruthy();
    expect(screen.queryByRole("region", { name: "Workshop routes" })).toBeNull();
    expect(screen.queryByRole("region", { name: "Favorites" })).toBeNull();
    expect(screen.queryByRole("link", { name: /Open Projects/ })).toBeNull();
    expect(screen.queryByRole("link", { name: /Open Components/ })).toBeNull();
    expect(screen.queryByRole("link", { name: /Open Templates/ })).toBeNull();
    expect(container.querySelector('img[src="/Cards/Projects-Card.jpg"]')).toBeNull();
    expect(screen.queryByText("Project shortcuts")).toBeNull();
    expect(screen.queryByText("Estimate shortcuts")).toBeNull();
    expect(screen.queryByText("First move")).toBeNull();
    expect(screen.queryByText("Recommended")).toBeNull();

    expect(screen.queryByText("Recent Projects")).toBeNull();
    expect(screen.queryByText("Sample Projects")).toBeNull();
    expect(screen.queryByText("View all")).toBeNull();
  });

  test("keeps a first-run workshop homebase sparse without projects or favorites", async () => {
    renderWithQueryClient(
      <WorkshopHomebaseClient
        homebase={emptyWorkshopHomebase}
        favoritesScope={{ workspaceId: "workspace-1", userId: "user-1" }}
      />,
    );

    const greeting = screen.getByRole("region", { name: "Workshop greeting" });
    expect(within(greeting).getByText(/Good (morning|afternoon|evening)/)).toBeInTheDocument();
    expect(within(greeting).getByText("there")).toBeInTheDocument();
    expect(screen.queryByRole("region", { name: "Workshop routes" })).toBeNull();
    expect(screen.queryByRole("region", { name: "Favorites" })).toBeNull();
    expect(screen.queryByText("No favorite projects yet")).toBeNull();
    expect(screen.queryByText("No favorite estimates yet")).toBeNull();
    expect(screen.queryByText("Recent Projects")).toBeNull();
    expect(screen.queryByText("Sample Projects")).toBeNull();
    expect(screen.queryByRole("button", { name: "Open Ask Flip" })).toBeNull();
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
