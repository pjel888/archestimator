import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { ProjectEstimatesTable, type ProjectEstimateTableRow } from "@/components/workshop/ProjectEstimatesTable";
import { favoritesQueryKeys } from "@/lib/favorites/query-keys";
import type { MainSidebarFavoriteProject } from "@/components/sidebar/sidebar-types";

const routerMock = vi.hoisted(() => ({
  prefetch: vi.fn(),
  refresh: vi.fn(),
}));

const actionMocks = vi.hoisted(() => ({
  duplicateEstimateSheet: vi.fn(),
  executeBulkDeleteEstimateSheets: vi.fn(),
  fetchEstimateTree: vi.fn(),
  previewBulkDeleteEstimateSheets: vi.fn(),
  regenerateEstimateSheetCode: vi.fn(),
  updateEstimateDetails: vi.fn(),
}));

const repositoryMocks = vi.hoisted(() => ({
  getEstimateTree: vi.fn(),
}));

const workshopActionMocks = vi.hoisted(() => ({
  setEstimateFavorite: vi.fn(),
}));

const componentLibraryActionMocks = vi.hoisted(() => ({
  loadProjectComponentLibraryLite: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => routerMock,
}));

vi.mock("@/lib/estimates/actions", () => actionMocks);
vi.mock("@/lib/component-library/actions", () => componentLibraryActionMocks);
vi.mock("@/lib/workshop/actions", () => workshopActionMocks);
vi.mock("@/lib/repositories/estimate-repository", () => ({
  estimateRepository: repositoryMocks,
}));

const originalLocalStorage = window.localStorage;

function makeEstimate(overrides: Partial<ProjectEstimateTableRow> = {}): ProjectEstimateTableRow {
  return {
    created_at: "2026-05-19T10:00:00.000Z",
    currency_code: "PHP",
    firstNodeId: "node-1",
    id: "estimate-1",
    name: "Original Estimate",
    nodeCount: 1,
    notes: "Original notes",
    project_budget: 5000,
    project_id: "project-1",
    rowItemCount: 1,
    sheet_code: "EST-001",
    totalProjectCost: 1250,
    isFavorite: false,
    favoriteCreatedAt: null,
    updated_at: "2026-05-19T10:00:00.000Z",
    ...overrides,
  };
}

function renderTable(
  estimate = makeEstimate(),
  options: {
    canEditEstimateById?: Record<string, boolean>;
    parentProject?: {
      id: string;
      name: string;
      projectCode: string | null;
      href: string;
      isSidebarFavorite: boolean;
    };
    scope?: { workspaceId: string; userId: string };
    seedSidebar?: unknown;
  } = {},
) {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });
  if (options.scope && options.seedSidebar !== undefined) {
    queryClient.setQueryData(
      favoritesQueryKeys.sidebar(options.scope),
      options.seedSidebar,
    );
  }
  render(
    <QueryClientProvider client={queryClient}>
      <ProjectEstimatesTable
        estimates={[estimate]}
        projectId="project-1"
        canEditEstimateById={options.canEditEstimateById}
        parentProject={options.parentProject}
        scope={options.scope}
      />
    </QueryClientProvider>,
  );
  return queryClient;
}

describe("project estimates table inline editing", () => {
  beforeEach(() => {
    actionMocks.duplicateEstimateSheet.mockReset();
    actionMocks.executeBulkDeleteEstimateSheets.mockReset();
    actionMocks.fetchEstimateTree.mockReset();
    actionMocks.previewBulkDeleteEstimateSheets.mockReset();
    actionMocks.regenerateEstimateSheetCode.mockReset();
    actionMocks.updateEstimateDetails.mockReset();
    componentLibraryActionMocks.loadProjectComponentLibraryLite.mockReset();
    componentLibraryActionMocks.loadProjectComponentLibraryLite.mockResolvedValue({
      libraryItems: [],
      templates: [],
      categoryTree: [],
      suppliers: [],
      brands: [],
      libraryFolders: [],
    });
    repositoryMocks.getEstimateTree.mockReset();
    workshopActionMocks.setEstimateFavorite.mockReset();
    workshopActionMocks.setEstimateFavorite.mockResolvedValue(undefined);
    actionMocks.fetchEstimateTree.mockResolvedValue([]);
    actionMocks.previewBulkDeleteEstimateSheets.mockResolvedValue({
      ok: true,
      targetType: "estimate_sheet",
      ids: ["estimate-1"],
      eligibleIds: ["estimate-1"],
      previewHash: "preview-hash",
      summary: { requestedCount: 1, eligibleCount: 1, blockedCount: 0 },
      issues: [],
      blocked: [],
      storageTargets: [],
    });
    actionMocks.executeBulkDeleteEstimateSheets.mockResolvedValue({
      ok: true,
      targetType: "estimate_sheet",
      ids: ["estimate-1"],
      deletedIds: ["estimate-1"],
      summary: { requestedCount: 1, eligibleCount: 1, blockedCount: 0 },
      issues: [],
      blocked: [],
      storageTargets: [],
    });
    repositoryMocks.getEstimateTree.mockResolvedValue(null);
    routerMock.prefetch.mockReset();
    routerMock.refresh.mockReset();
    window.localStorage.clear();
  });

  afterEach(() => {
    vi.clearAllTimers();
    vi.useRealTimers();
    Object.defineProperty(window, "localStorage", {
      configurable: true,
      value: originalLocalStorage,
    });
    vi.restoreAllMocks();
  });

  it("prefetches only the estimate route from the open link", async () => {
    vi.useFakeTimers();

    renderTable();

    const openLink = screen.getByLabelText("Open Original Estimate");
    fireEvent.mouseEnter(openLink);
    expect(routerMock.prefetch).not.toHaveBeenCalled();

    await act(async () => {
      await vi.advanceTimersByTimeAsync(150);
      await Promise.resolve();
    });

    expect(routerMock.prefetch).toHaveBeenCalledWith("/workshop/projects/project-1/estimates/node-1");
    expect(repositoryMocks.getEstimateTree).not.toHaveBeenCalled();
    expect(actionMocks.fetchEstimateTree).not.toHaveBeenCalled();
    expect(componentLibraryActionMocks.loadProjectComponentLibraryLite).not.toHaveBeenCalled();
  });

  it("places selection, open, favorite, duplicate, and delete controls in tight action columns", async () => {
    const user = userEvent.setup();

    renderTable();

    const favoriteButton = screen.getByRole("button", { name: "Add Original Estimate to favorite estimate sheets" });
    const selectInput = screen.getByRole("checkbox", { name: "Select Original Estimate" });
    const deleteButton = screen.getByRole("button", { name: "Delete Original Estimate" });
    const duplicateButton = screen.getByRole("button", { name: "Duplicate Original Estimate" });
    const openLink = screen.getByRole("link", { name: "Open Original Estimate" });
    const dataRow = screen.getByDisplayValue("Original Estimate").closest("tr");
    const dataCells = Array.from(dataRow?.querySelectorAll("td") ?? []);
    const tableColumns = Array.from(dataRow?.closest("table")?.querySelectorAll("col") ?? []);
    const selectCell = selectInput.closest("td");
    const openCell = openLink.closest("td");
    const favoriteCell = favoriteButton.closest("td");
    const duplicateCell = duplicateButton.closest("td");
    const deleteCell = deleteButton.closest("td");

    expect(selectCell).toBe(dataCells.at(0));
    expect(openCell).toBe(dataCells.at(1));
    expect(favoriteCell).toBe(dataCells.at(2));
    expect(duplicateCell).toBe(dataCells.at(3));
    expect(deleteCell).toBe(dataCells.at(-1));
    expect(favoriteCell).toHaveClass("px-1");
    expect(duplicateCell).toHaveClass("px-1");
    expect(tableColumns.at(2)).toHaveStyle({ width: "34px" });
    expect(tableColumns.at(3)).toHaveStyle({ width: "34px" });
    expect(screen.queryByLabelText("View version history for Original Estimate")).not.toBeInTheDocument();
    expect(selectInput).toHaveClass("cursor-pointer");
    expect(favoriteButton).toHaveClass("cursor-pointer");
    expect(deleteButton).toHaveClass("cursor-pointer");
    expect(duplicateButton).toHaveClass("cursor-pointer");
    expect(openLink).toHaveClass("cursor-pointer");

    await user.click(favoriteButton);

    expect(favoriteButton).toHaveAttribute("aria-pressed", "true");
    expect(favoriteButton).toHaveClass("text-brand-orange");
    expect(favoriteButton).not.toHaveClass("bg-surface-muted", "hover:bg-surface-muted");
    await waitFor(() => expect(workshopActionMocks.setEstimateFavorite).toHaveBeenCalledTimes(1));
    expect(workshopActionMocks.setEstimateFavorite).toHaveBeenCalledWith({
      estimateId: "estimate-1",
      favorite: true,
    });
  });

  it("keeps editable cells borderless on hover and tints read-only cells", () => {
    renderTable();

    const codeInput = screen.getByLabelText("Estimate code for Original Estimate");
    const nameInput = screen.getByLabelText("Estimate name for Original Estimate");
    const notesInput = screen.getByLabelText("Notes for Original Estimate");
    const budgetInput = screen.getByLabelText("Project budget for Original Estimate");
    const dataRow = nameInput.closest("tr");
    const dataCells = Array.from(dataRow?.querySelectorAll("td") ?? []);

    expect(codeInput).not.toHaveClass("hover:border-hairline");
    expect(nameInput).not.toHaveClass("hover:border-hairline");
    expect(notesInput).not.toHaveClass("hover:border-hairline");
    expect(budgetInput).not.toHaveClass("hover:border-hairline");

    expect(dataCells.at(8)).toHaveClass("hover:bg-dangerSoft/30");
    expect(dataCells.at(9)).toHaveClass("hover:bg-dangerSoft/30");
    expect(dataCells.at(10)).toHaveClass("hover:bg-dangerSoft/30");
    expect(dataCells.at(11)).toHaveClass("hover:bg-dangerSoft/30");
    expect(codeInput.closest("td")).not.toHaveClass("hover:bg-dangerSoft/30");
    expect(nameInput.closest("td")).not.toHaveClass("hover:bg-dangerSoft/30");
    expect(notesInput.closest("td")).not.toHaveClass("hover:bg-dangerSoft/30");
    expect(budgetInput.closest("td")).not.toHaveClass("hover:bg-dangerSoft/30");
  });

  it("does not queue duplicate favorite mutations when the star is double-clicked", async () => {
    let resolveFavorite: (() => void) | undefined;
    workshopActionMocks.setEstimateFavorite.mockImplementationOnce(
      () => new Promise<void>((resolve) => { resolveFavorite = resolve; }),
    );
    const user = userEvent.setup();

    renderTable();

    const favoriteButton = screen.getByRole("button", { name: "Add Original Estimate to favorite estimate sheets" });
    await user.dblClick(favoriteButton);

    expect(workshopActionMocks.setEstimateFavorite).toHaveBeenCalledTimes(1);
    expect(favoriteButton).toBeDisabled();

    resolveFavorite?.();
    await waitFor(() => expect(favoriteButton).not.toBeDisabled());
  });

  it("rolls back an estimate favorite toggle when persistence fails", async () => {
    workshopActionMocks.setEstimateFavorite.mockRejectedValueOnce(new Error("Favorite write failed."));
    const user = userEvent.setup();

    renderTable();

    const favoriteButton = screen.getByRole("button", { name: "Add Original Estimate to favorite estimate sheets" });
    await user.click(favoriteButton);

    await waitFor(() => expect(favoriteButton).toHaveAttribute("aria-pressed", "false"));
    expect(screen.getByRole("button", { name: "Add Original Estimate to favorite estimate sheets" })).toHaveAttribute(
      "title",
      "Favorite write failed.",
    );
  });

  it("drives the shared toggle hook: favoriting inserts the sheet into the seeded sidebar cache", async () => {
    const scope = { workspaceId: "ws-1", userId: "user-1" };
    const parentProject = {
      id: "project-1",
      name: "Lewis Residence",
      projectCode: "AE-LR-001",
      href: "/workshop/projects/project-1",
      isSidebarFavorite: true,
    };
    const seededParent: MainSidebarFavoriteProject = {
      id: "project-1",
      name: "Lewis Residence",
      projectCode: "AE-LR-001",
      href: "/workshop/projects/project-1",
      favoriteCreatedAt: "2026-06-05T00:00:00.000Z",
      favoriteEstimateSheets: [],
    };
    const user = userEvent.setup();

    const queryClient = renderTable(makeEstimate(), {
      scope,
      parentProject,
      seedSidebar: [seededParent],
    });

    const favoriteButton = screen.getByRole("button", { name: "Add Original Estimate to favorite estimate sheets" });
    await user.click(favoriteButton);

    expect(favoriteButton).toHaveAttribute("aria-pressed", "true");
    await waitFor(() => expect(workshopActionMocks.setEstimateFavorite).toHaveBeenCalledWith({
      estimateId: "estimate-1",
      favorite: true,
    }));
    const cache = queryClient.getQueryData<MainSidebarFavoriteProject[]>(favoritesQueryKeys.sidebar(scope));
    expect(cache?.[0].favoriteEstimateSheets.map((sheet) => sheet.id)).toContain("estimate-1");
  });

  it("saves an inline estimate name edit once when Enter blurs the field", async () => {
    const updatedEstimate = makeEstimate({ name: "Updated Estimate" });
    actionMocks.updateEstimateDetails.mockResolvedValue({ estimate: updatedEstimate });
    const user = userEvent.setup();

    renderTable();

    const nameInput = screen.getByLabelText("Estimate name for Original Estimate");
    await user.clear(nameInput);
    await user.type(nameInput, "Updated Estimate{Enter}");

    await waitFor(() => expect(actionMocks.updateEstimateDetails).toHaveBeenCalledTimes(1));
    expect(actionMocks.updateEstimateDetails).toHaveBeenCalledWith({
      projectId: "project-1",
      estimateId: "estimate-1",
      name: "Updated Estimate",
    });
    // P0: inline edits reconcile optimistically — no full-screen overlay refresh.
    expect(routerMock.refresh).not.toHaveBeenCalled();
  });

  it("cancels an inline estimate name edit with Escape without saving on blur", async () => {
    const user = userEvent.setup();

    renderTable();

    const nameInput = screen.getByLabelText("Estimate name for Original Estimate");
    await user.clear(nameInput);
    await user.type(nameInput, "Should Not Save{Escape}");

    await waitFor(() => expect(nameInput).toHaveValue("Original Estimate"));
    expect(actionMocks.updateEstimateDetails).not.toHaveBeenCalled();
    expect(routerMock.refresh).not.toHaveBeenCalled();
  });

  it("saves an inline project budget edit per estimate sheet", async () => {
    const updatedEstimate = makeEstimate({ project_budget: 6500 });
    actionMocks.updateEstimateDetails.mockResolvedValue({ estimate: updatedEstimate });
    const user = userEvent.setup();

    renderTable();

    const budgetInput = screen.getByLabelText("Project budget for Original Estimate");
    await user.clear(budgetInput);
    await user.type(budgetInput, "6,500.00{Enter}");

    await waitFor(() => expect(actionMocks.updateEstimateDetails).toHaveBeenCalledTimes(1));
    expect(actionMocks.updateEstimateDetails).toHaveBeenCalledWith({
      projectId: "project-1",
      estimateId: "estimate-1",
      projectBudget: 6500,
    });
    // P0: inline edits reconcile optimistically — no full-screen overlay refresh.
    expect(routerMock.refresh).not.toHaveBeenCalled();
  });

  it("saves an inline notes edit per estimate sheet", async () => {
    const updatedEstimate = makeEstimate({ notes: "Client requested alternate finish" });
    actionMocks.updateEstimateDetails.mockResolvedValue({ estimate: updatedEstimate });
    const user = userEvent.setup();

    renderTable();

    const notesInput = screen.getByLabelText("Notes for Original Estimate");
    await user.clear(notesInput);
    await user.type(notesInput, "Client requested alternate finish{Enter}");

    await waitFor(() => expect(actionMocks.updateEstimateDetails).toHaveBeenCalledTimes(1));
    expect(actionMocks.updateEstimateDetails).toHaveBeenCalledWith({
      projectId: "project-1",
      estimateId: "estimate-1",
      notes: "Client requested alternate finish",
    });
    // P0: inline edits reconcile optimistically — no full-screen overlay refresh.
    expect(routerMock.refresh).not.toHaveBeenCalled();
  });

  it("disables metadata and destructive controls for view-only estimate rows", async () => {
    const user = userEvent.setup();

    renderTable(makeEstimate(), { canEditEstimateById: { "estimate-1": false } });

    expect(screen.getByRole("checkbox", { name: "Select Original Estimate" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Delete Original Estimate" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Duplicate Original Estimate" })).toBeDisabled();
    const autoCodeButton = screen.getByRole("button", { name: "Auto-generate estimate code for Original Estimate" });
    expect(autoCodeButton).toBeDisabled();
    expect(autoCodeButton).not.toHaveTextContent("Auto");
    expect(autoCodeButton.querySelector("svg")).not.toBeNull();
    expect(autoCodeButton).toHaveClass("opacity-0", "group-hover/sheet-code:opacity-100");
    expect(screen.getByLabelText("Estimate code for Original Estimate")).toBeDisabled();
    expect(screen.getByLabelText("Estimate name for Original Estimate")).toBeDisabled();
    expect(screen.getByLabelText("Notes for Original Estimate")).toBeDisabled();
    expect(screen.getByLabelText("Project budget for Original Estimate")).toBeDisabled();

    await user.click(screen.getByRole("button", { name: "Duplicate Original Estimate" }));

    expect(actionMocks.duplicateEstimateSheet).not.toHaveBeenCalled();
    expect(actionMocks.updateEstimateDetails).not.toHaveBeenCalled();
    expect(actionMocks.regenerateEstimateSheetCode).not.toHaveBeenCalled();
    expect(actionMocks.previewBulkDeleteEstimateSheets).not.toHaveBeenCalled();
  });

  it("removes selected rows from the visible bulk selection when edit permission is revoked", async () => {
    const user = userEvent.setup();
    const queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false },
      },
    });
    const estimate = makeEstimate();
    const { rerender } = render(
      <QueryClientProvider client={queryClient}>
        <ProjectEstimatesTable
          estimates={[estimate]}
          projectId="project-1"
          canEditEstimateById={{ "estimate-1": true }}
        />
      </QueryClientProvider>,
    );

    const selectInput = screen.getByRole("checkbox", { name: "Select Original Estimate" });
    await user.click(selectInput);

    expect(selectInput).toBeChecked();
    expect(screen.getByLabelText("Bulk action toolbar")).toHaveTextContent("1 selected");

    rerender(
      <QueryClientProvider client={queryClient}>
        <ProjectEstimatesTable
          estimates={[estimate]}
          projectId="project-1"
          canEditEstimateById={{ "estimate-1": false }}
        />
      </QueryClientProvider>,
    );

    const viewOnlySelectInput = screen.getByRole("checkbox", { name: "Select Original Estimate" });
    expect(viewOnlySelectInput).toBeDisabled();
    expect(viewOnlySelectInput).not.toBeChecked();
    expect(screen.queryByLabelText("Bulk action toolbar")).not.toBeInTheDocument();
  });

  it("does not crash when persisted column width storage is blocked", () => {
    const throwingLocalStorage: Storage = {
      get length() {
        return 0;
      },
      clear: vi.fn(),
      getItem: vi.fn(() => {
        throw new DOMException("Storage is blocked", "SecurityError");
      }),
      key: vi.fn(() => null),
      removeItem: vi.fn(() => {
        throw new DOMException("Storage is blocked", "SecurityError");
      }),
      setItem: vi.fn(() => {
        throw new DOMException("Storage is blocked", "SecurityError");
      }),
    };
    Object.defineProperty(window, "localStorage", {
      configurable: true,
      value: throwingLocalStorage,
    });

    expect(() => renderTable()).not.toThrow();
    expect(screen.getByLabelText("Estimate name for Original Estimate")).toBeInTheDocument();
  });

  it("loads column widths from the current project storage key during rerender", () => {
    window.localStorage.setItem(
      "archestimator:project-estimates-column-widths:project-2",
      JSON.stringify({ name: 420 }),
    );
    const queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false },
      },
    });
    const estimate = makeEstimate();
    const { rerender } = render(
      <QueryClientProvider client={queryClient}>
        <ProjectEstimatesTable estimates={[estimate]} projectId="project-1" />
      </QueryClientProvider>,
    );

    const getEstimateNameHeader = () => screen.getByRole("separator", { name: "Resize Estimate Name" }).closest("th");
    expect(getEstimateNameHeader()).toHaveStyle({ width: "340px" });

    rerender(
      <QueryClientProvider client={queryClient}>
        <ProjectEstimatesTable estimates={[estimate]} projectId="project-2" />
      </QueryClientProvider>,
    );

    expect(getEstimateNameHeader()).toHaveStyle({ width: "420px" });
  });

  it("flushes the latest column width preference when the table unmounts during the debounce window", () => {
    const queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false },
      },
    });
    const { unmount } = render(
      <QueryClientProvider client={queryClient}>
        <ProjectEstimatesTable estimates={[makeEstimate()]} projectId="project-1" />
      </QueryClientProvider>,
    );

    fireEvent.keyDown(screen.getByRole("separator", { name: "Resize Estimate Name" }), { key: "ArrowRight" });
    unmount();

    expect(JSON.parse(window.localStorage.getItem("archestimator:project-estimates-column-widths:project-1") ?? "{}")).toMatchObject({
      name: 356,
    });
  });

  it("duplicates an estimate sheet from the row actions once and refreshes the table", async () => {
    let resolveDuplicate: ((value: { row: ProjectEstimateTableRow }) => void) | undefined;
    actionMocks.duplicateEstimateSheet.mockImplementation(
      () =>
        new Promise((resolve) => {
          resolveDuplicate = resolve;
        }),
    );
    const user = userEvent.setup();

    renderTable();

    const duplicateButton = screen.getByRole("button", { name: "Duplicate Original Estimate" });
    await user.dblClick(duplicateButton);

    expect(actionMocks.duplicateEstimateSheet).toHaveBeenCalledTimes(1);
    expect(actionMocks.duplicateEstimateSheet).toHaveBeenCalledWith({
      projectId: "project-1",
      estimateId: "estimate-1",
    });
    await waitFor(() => expect(duplicateButton).toBeDisabled());

    resolveDuplicate?.({ row: makeEstimate({ id: "estimate-2", name: "Original Estimate Copy", sheet_code: "ES-002", firstNodeId: "node-2" }) });
    // P0: duplicate reconciles its optimistic placeholder — no overlay refresh.
    await waitFor(() => expect(duplicateButton).not.toBeDisabled());
    expect(routerMock.refresh).not.toHaveBeenCalled();
  });
});
