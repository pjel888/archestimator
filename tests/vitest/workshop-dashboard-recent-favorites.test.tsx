import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { RecentProjectsList } from "@/components/workshop/dashboard/RecentProjectsList";
import { RecentSheetsList } from "@/components/workshop/dashboard/RecentSheetsList";
import { FavoritesTree } from "@/components/workshop/dashboard/FavoritesTree";
import type { MainSidebarFavoriteProject } from "@/components/sidebar/sidebar-types";
import { favoritesQueryKeys } from "@/lib/favorites/query-keys";
import type { WorkshopEstimateSummary, WorkshopProjectSummary } from "@/lib/repositories/workspace-repository";

const workshopActions = vi.hoisted(() => ({
  setEstimateFavorite: vi.fn(),
  setProjectFavorite: vi.fn(),
}));

vi.mock("@/lib/workshop/actions", () => workshopActions);

const scope = { workspaceId: "workspace-1", userId: "user-1" };

function createTestQueryClient() {
  return new QueryClient({
    defaultOptions: { mutations: { retry: false }, queries: { retry: false } },
  });
}

function renderWithQueryClient(ui: ReactNode, queryClient = createTestQueryClient()) {

  return render(<QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>);
}

function project(overrides: Partial<WorkshopProjectSummary> = {}): WorkshopProjectSummary {
  return {
    id: "project-1",
    name: "Lewis Residence",
    client_name: "Lewis Family",
    project_code: "AE-LR-001",
    location: "Quezon City",
    updated_at: "2026-06-01T00:00:00.000Z",
    accessKind: "owned",
    currentUserRole: "owner",
    isFavorite: false,
    favoriteCreatedAt: null,
    ownerWorkspaceName: null,
    pendingInviteCount: 0,
    publicationSummary: null,
    sharedEstimateCount: 0,
    ...overrides,
  };
}

function estimate(overrides: Partial<WorkshopEstimateSummary> = {}): WorkshopEstimateSummary {
  return {
    id: "estimate-1",
    project_id: "project-1",
    name: "Concept Budget",
    sheet_code: "ES-001",
    updated_at: "2026-06-02T00:00:00.000Z",
    projectName: "Lewis Residence",
    projectCode: "AE-LR-001",
    firstNodeId: "node-1",
    isFavorite: false,
    favoriteCreatedAt: null,
    ...overrides,
  };
}

function favoriteProject(overrides: Partial<MainSidebarFavoriteProject> = {}): MainSidebarFavoriteProject {
  return {
    id: "project-1",
    name: "Lewis Residence",
    projectCode: "AE-LR-001",
    href: "/workshop/projects/project-1",
    favoriteCreatedAt: "2026-06-01T00:00:00.000Z",
    favoriteEstimateSheets: [],
    ...overrides,
  };
}

function deferred<T>() {
  let resolve!: (value: T | PromiseLike<T>) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((promiseResolve, promiseReject) => {
    resolve = promiseResolve;
    reject = promiseReject;
  });
  return { promise, resolve, reject };
}

beforeEach(() => {
  vi.clearAllMocks();
  workshopActions.setEstimateFavorite.mockResolvedValue(undefined);
  workshopActions.setProjectFavorite.mockResolvedValue(undefined);
});

describe("workshop dashboard recent favorite controls", () => {
  it("renders project row icon above an outline star and favorites from the right-side control", async () => {
    const user = userEvent.setup();
    renderWithQueryClient(<RecentProjectsList projects={[project()]} favoritesScope={scope} />);

    const favoriteButton = screen.getByRole("button", { name: "Add Lewis Residence to favorites" });
    const actionStack = favoriteButton.parentElement;
    const projectLink = screen.getByRole("link", { name: /Lewis Residence/i });

    expect(favoriteButton).toHaveAttribute("aria-pressed", "false");
    expect(projectLink.contains(favoriteButton)).toBe(false);
    const row = actionStack?.parentElement;

    expect(actionStack?.children[0]?.tagName.toLowerCase()).toBe("svg");
    expect(actionStack?.children[1]).toBe(favoriteButton);
    expect(row?.children[0]).toBe(actionStack);
    expect(row?.children[1]?.tagName.toLowerCase()).toBe("a");

    await user.click(favoriteButton);

    expect(favoriteButton).toHaveAttribute("aria-pressed", "true");
    await waitFor(() =>
      expect(workshopActions.setProjectFavorite).toHaveBeenCalledWith({ projectId: "project-1", favorite: true }),
    );
  });

  it("unfavorites a project from a filled star", async () => {
    const user = userEvent.setup();
    renderWithQueryClient(
      <RecentProjectsList
        projects={[project({ isFavorite: true, favoriteCreatedAt: "2026-06-01T00:00:00.000Z" })]}
        favoritesScope={scope}
      />,
    );

    const favoriteButton = screen.getByRole("button", { name: "Remove Lewis Residence from favorites" });

    expect(favoriteButton).toHaveAttribute("aria-pressed", "true");

    await user.click(favoriteButton);

    expect(favoriteButton).toHaveAttribute("aria-pressed", "false");
    await waitFor(() =>
      expect(workshopActions.setProjectFavorite).toHaveBeenCalledWith({ projectId: "project-1", favorite: false }),
    );
  });

  it("renders sheet row icon above an outline star and favorites from the right-side control", async () => {
    const user = userEvent.setup();
    renderWithQueryClient(
      <RecentSheetsList estimates={[estimate()]} favoriteProjects={[favoriteProject()]} favoritesScope={scope} />,
    );

    const favoriteButton = screen.getByRole("button", { name: "Add Concept Budget to favorite estimate sheets" });
    const actionStack = favoriteButton.parentElement;
    const sheetLink = screen.getByRole("link", { name: /Concept Budget/i });

    expect(favoriteButton).toHaveAttribute("aria-pressed", "false");
    expect(sheetLink.contains(favoriteButton)).toBe(false);
    const row = actionStack?.parentElement;

    expect(actionStack?.children[0]?.tagName.toLowerCase()).toBe("svg");
    expect(actionStack?.children[1]).toBe(favoriteButton);
    expect(row?.children[0]).toBe(actionStack);
    expect(row?.children[1]?.tagName.toLowerCase()).toBe("a");

    await user.click(favoriteButton);

    expect(favoriteButton).toHaveAttribute("aria-pressed", "true");
    await waitFor(() =>
      expect(workshopActions.setEstimateFavorite).toHaveBeenCalledWith({ estimateId: "estimate-1", favorite: true }),
    );
  });

  it("unfavorites a sheet from a filled star", async () => {
    const user = userEvent.setup();
    renderWithQueryClient(
      <RecentSheetsList
        estimates={[estimate({ isFavorite: true, favoriteCreatedAt: "2026-06-02T00:00:00.000Z" })]}
        favoriteProjects={[favoriteProject()]}
        favoritesScope={scope}
      />,
    );

    const favoriteButton = screen.getByRole("button", { name: "Remove Concept Budget from favorite estimate sheets" });

    expect(favoriteButton).toHaveAttribute("aria-pressed", "true");

    await user.click(favoriteButton);

    expect(favoriteButton).toHaveAttribute("aria-pressed", "false");
    await waitFor(() =>
      expect(workshopActions.setEstimateFavorite).toHaveBeenCalledWith({ estimateId: "estimate-1", favorite: false }),
    );
  });

  it("rolls the visible project star back when persistence fails", async () => {
    const user = userEvent.setup();
    workshopActions.setProjectFavorite.mockRejectedValueOnce(new Error("Favorite write failed."));
    renderWithQueryClient(<RecentProjectsList projects={[project()]} favoritesScope={scope} />);

    const favoriteButton = screen.getByRole("button", { name: "Add Lewis Residence to favorites" });
    await user.click(favoriteButton);

    await waitFor(() => expect(favoriteButton).toHaveAttribute("aria-pressed", "false"));
    expect(screen.getByText("Favorite write failed.")).toBeInTheDocument();
  });

  it("keeps project row rollbacks independent when multiple rows are toggled quickly", async () => {
    const user = userEvent.setup();
    const firstWrite = deferred<void>();
    const secondWrite = deferred<void>();
    workshopActions.setProjectFavorite.mockImplementation(({ projectId }: { projectId: string }) =>
      projectId === "project-1" ? firstWrite.promise : secondWrite.promise,
    );

    renderWithQueryClient(
      <RecentProjectsList
        projects={[
          project(),
          project({ id: "project-2", name: "Harper Renovation", project_code: "AE-HR-002" }),
        ]}
        favoritesScope={scope}
      />,
    );

    const firstButton = screen.getByRole("button", { name: "Add Lewis Residence to favorites" });
    const secondButton = screen.getByRole("button", { name: "Add Harper Renovation to favorites" });

    await user.click(firstButton);
    await user.click(secondButton);

    expect(firstButton).toHaveAttribute("aria-pressed", "true");
    expect(secondButton).toHaveAttribute("aria-pressed", "true");
    await waitFor(() => expect(workshopActions.setProjectFavorite).toHaveBeenCalledTimes(2));

    firstWrite.reject(new Error("First project write failed."));

    await waitFor(() => expect(firstButton).toHaveAttribute("aria-pressed", "false"));
    expect(secondButton).toHaveAttribute("aria-pressed", "true");
    secondWrite.resolve(undefined);
  });

  it("rolls the visible sheet star back when persistence fails", async () => {
    const user = userEvent.setup();
    workshopActions.setEstimateFavorite.mockRejectedValueOnce(new Error("Favorite sheet write failed."));
    renderWithQueryClient(
      <RecentSheetsList estimates={[estimate()]} favoriteProjects={[favoriteProject()]} favoritesScope={scope} />,
    );

    const favoriteButton = screen.getByRole("button", { name: "Add Concept Budget to favorite estimate sheets" });
    await user.click(favoriteButton);

    await waitFor(() => expect(favoriteButton).toHaveAttribute("aria-pressed", "false"));
    expect(screen.getByText("Favorite sheet write failed.")).toBeInTheDocument();
  });

  it("keeps sheet row rollbacks independent when multiple rows are toggled quickly", async () => {
    const user = userEvent.setup();
    const firstWrite = deferred<void>();
    const secondWrite = deferred<void>();
    workshopActions.setEstimateFavorite.mockImplementation(({ estimateId }: { estimateId: string }) =>
      estimateId === "estimate-1" ? firstWrite.promise : secondWrite.promise,
    );

    renderWithQueryClient(
      <RecentSheetsList
        estimates={[
          estimate(),
          estimate({ id: "estimate-2", name: "Permit Budget", sheet_code: "ES-002" }),
        ]}
        favoriteProjects={[favoriteProject()]}
        favoritesScope={scope}
      />,
    );

    const firstButton = screen.getByRole("button", { name: "Add Concept Budget to favorite estimate sheets" });
    const secondButton = screen.getByRole("button", { name: "Add Permit Budget to favorite estimate sheets" });

    await user.click(firstButton);
    await user.click(secondButton);

    expect(firstButton).toHaveAttribute("aria-pressed", "true");
    expect(secondButton).toHaveAttribute("aria-pressed", "true");
    await waitFor(() => expect(workshopActions.setEstimateFavorite).toHaveBeenCalledTimes(2));

    firstWrite.reject(new Error("First sheet write failed."));

    await waitFor(() => expect(firstButton).toHaveAttribute("aria-pressed", "false"));
    expect(secondButton).toHaveAttribute("aria-pressed", "true");
    secondWrite.resolve(undefined);
  });

  it("updates the upper favorites tree immediately when a project is favorited", async () => {
    const user = userEvent.setup();
    const write = deferred<void>();
    workshopActions.setProjectFavorite.mockReturnValueOnce(write.promise);

    renderWithQueryClient(
      <>
        <FavoritesTree favoriteProjects={[]} favoritesScope={scope} />
        <RecentProjectsList projects={[project()]} favoritesScope={scope} />
      </>,
    );

    expect(screen.getByText("Star a project to pin it here.")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Add Lewis Residence to favorites" }));

    expect(screen.getByRole("tree", { name: "Favorite projects" })).toBeInTheDocument();
    expect(screen.getByRole("treeitem", { name: "Lewis Residence" })).toBeInTheDocument();
    expect(workshopActions.setProjectFavorite).toHaveBeenCalledWith({ projectId: "project-1", favorite: true });

    write.resolve(undefined);
  });

  it("updates the upper favorites tree immediately when a sheet is favorited under a pinned project", async () => {
    const user = userEvent.setup();
    const write = deferred<void>();
    workshopActions.setEstimateFavorite.mockReturnValueOnce(write.promise);

    renderWithQueryClient(
      <>
        <FavoritesTree favoriteProjects={[favoriteProject()]} favoritesScope={scope} />
        <RecentSheetsList estimates={[estimate()]} favoriteProjects={[favoriteProject()]} favoritesScope={scope} />
      </>,
    );

    expect(screen.queryByRole("treeitem", { name: "Concept Budget" })).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Add Concept Budget to favorite estimate sheets" }));

    expect(screen.getByRole("treeitem", { name: "Concept Budget" })).toBeInTheDocument();
    expect(workshopActions.setEstimateFavorite).toHaveBeenCalledWith({ estimateId: "estimate-1", favorite: true });

    write.resolve(undefined);
  });

  it("opens sheet-bearing favorites immediately when the favorites cache is warm on mount", () => {
    const queryClient = createTestQueryClient();
    queryClient.setQueryData<MainSidebarFavoriteProject[]>(favoritesQueryKeys.sidebar(scope), [
      favoriteProject({
        favoriteEstimateSheets: [
          {
            id: "estimate-1",
            projectId: "project-1",
            name: "Concept Budget",
            sheetCode: "ES-001",
            href: "/workshop/projects/project-1/estimates/node-1",
            favoriteCreatedAt: "2026-06-02T00:00:00.000Z",
          },
        ],
      }),
    ]);

    renderWithQueryClient(<FavoritesTree favoriteProjects={[favoriteProject()]} favoritesScope={scope} />, queryClient);

    expect(screen.getByRole("treeitem", { name: "Concept Budget" })).toBeInTheDocument();
  });

  it("keeps a keyboard tab stop after the active favorite project is removed", async () => {
    const user = userEvent.setup();
    const write = deferred<void>();
    workshopActions.setProjectFavorite.mockReturnValueOnce(write.promise);
    const harperProject = project({
      id: "project-2",
      name: "Harper Renovation",
      project_code: "AE-HR-002",
      isFavorite: true,
      favoriteCreatedAt: "2026-06-02T00:00:00.000Z",
    });

    renderWithQueryClient(
      <>
        <FavoritesTree
          favoriteProjects={[
            favoriteProject(),
            favoriteProject({
              id: "project-2",
              name: "Harper Renovation",
              projectCode: "AE-HR-002",
              href: "/workshop/projects/project-2",
              favoriteCreatedAt: "2026-06-02T00:00:00.000Z",
            }),
          ]}
          favoritesScope={scope}
        />
        <RecentProjectsList projects={[harperProject]} favoritesScope={scope} />
      </>,
    );

    const favoritesTree = screen.getByRole("tree", { name: "Favorite projects" });
    const lewisTreeLink = within(favoritesTree).getByRole("link", { name: /Lewis Residence/ });
    const harperTreeLink = within(favoritesTree).getByRole("link", { name: /Harper Renovation/ });

    await user.tab();
    expect(lewisTreeLink).toHaveAttribute("tabindex", "0");
    await user.keyboard("{ArrowDown}");
    await waitFor(() => expect(document.activeElement).toBe(harperTreeLink));
    expect(harperTreeLink).toHaveAttribute("tabindex", "0");

    await user.click(screen.getByRole("button", { name: "Remove Harper Renovation from favorites" }));

    expect(within(favoritesTree).queryByRole("treeitem", { name: "Harper Renovation" })).not.toBeInTheDocument();
    expect(lewisTreeLink).toHaveAttribute("tabindex", "0");
    expect(workshopActions.setProjectFavorite).toHaveBeenCalledWith({ projectId: "project-2", favorite: false });

    write.resolve(undefined);
  });
});
