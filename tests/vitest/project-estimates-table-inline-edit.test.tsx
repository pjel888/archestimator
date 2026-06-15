import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { ProjectEstimatesTable, type ProjectEstimateTableRow } from "@/components/workshop/ProjectEstimatesTable";

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
const componentLibraryActionMocks = vi.hoisted(() => ({
  loadProjectComponentLibraryLite: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => routerMock,
}));

vi.mock("@/lib/estimates/actions", () => actionMocks);
vi.mock("@/lib/repositories/estimate-repository", () => ({
  estimateRepository: repositoryMocks,
}));
vi.mock("@/lib/component-library/actions", () => componentLibraryActionMocks);

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
    updated_at: "2026-05-19T10:00:00.000Z",
    ...overrides,
  };
}

function renderTable(estimate = makeEstimate()) {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
    },
  });
  render(
    <QueryClientProvider client={queryClient}>
      <ProjectEstimatesTable estimates={[estimate]} projectId="project-1" />
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
    repositoryMocks.getEstimateTree.mockReset();
    componentLibraryActionMocks.loadProjectComponentLibraryLite.mockReset();
    componentLibraryActionMocks.loadProjectComponentLibraryLite.mockResolvedValue({
      libraryItems: [],
      templates: [],
      categoryTree: [],
      suppliers: [],
      brands: [],
      libraryFolders: [],
    });
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

  it("prefetches estimate route and real estimate query data from the open link", async () => {
    vi.useFakeTimers();
    actionMocks.fetchEstimateTree.mockResolvedValue([]);
    repositoryMocks.getEstimateTree.mockResolvedValue({ id: "estimate-1" });

    const queryClient = renderTable();

    const openLink = screen.getByLabelText("Open Original Estimate");
    fireEvent.mouseEnter(openLink);
    expect(routerMock.prefetch).not.toHaveBeenCalled();

    await act(async () => {
      await vi.advanceTimersByTimeAsync(150);
      await Promise.resolve();
    });

    expect(routerMock.prefetch).toHaveBeenCalledWith("/workshop/projects/project-1/estimates/node-1");
    expect(repositoryMocks.getEstimateTree).toHaveBeenCalledWith("estimate-1");
    expect(actionMocks.fetchEstimateTree).toHaveBeenCalledWith({
      projectId: "project-1",
      estimateId: "estimate-1",
    });
    expect(componentLibraryActionMocks.loadProjectComponentLibraryLite).toHaveBeenCalledWith("project-1");
    expect(
      queryClient.getQueryData(["workspace-component-library", "lite", "project", "project-1"]),
    ).toBeDefined();
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
