import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { ProjectEstimateListRow } from "@/lib/estimates/project-estimate-list-row";

const routerMock = vi.hoisted(() => ({ prefetch: vi.fn(), refresh: vi.fn(), push: vi.fn(), replace: vi.fn() }));
const show = vi.hoisted(() => vi.fn());
const actionMocks = vi.hoisted(() => ({
  createEstimateSheetDraft: vi.fn(),
  duplicateEstimateSheet: vi.fn(),
  executeBulkDeleteEstimateSheets: vi.fn(),
  fetchEstimateTree: vi.fn(),
  restoreDeletedEstimateRows: vi.fn(),
  previewBulkDeleteEstimateSheets: vi.fn(),
  regenerateEstimateSheetCode: vi.fn(),
  updateEstimateDetails: vi.fn(),
}));
const workshopActionMocks = vi.hoisted(() => ({
  setEstimateFavorite: vi.fn(),
}));

vi.mock("next/navigation", () => ({ useRouter: () => routerMock }));
vi.mock("@/stores/navigation-ui-store", () => ({
  useNavigationUiStore: (selector: (state: { show: typeof show }) => unknown) => selector({ show }),
}));
vi.mock("@/lib/estimates/actions", () => actionMocks);
vi.mock("@/lib/workshop/actions", () => workshopActionMocks);
vi.mock("@/lib/repositories/estimate-repository", () => ({ estimateRepository: { getEstimateTree: vi.fn() } }));

import { ProjectEstimatesClient } from "@/components/workshop/ProjectEstimatesClient";

function makeRow(overrides: Partial<ProjectEstimateListRow> = {}): ProjectEstimateListRow {
  return {
    id: "estimate-1",
    project_id: "project-1",
    name: "Original Estimate",
    sheet_code: "EST-001",
    currency_code: "PHP",
    notes: null,
    project_budget: null,
    created_at: "2026-05-19T10:00:00.000Z",
    updated_at: "2026-05-19T10:00:00.000Z",
    firstNodeId: "node-1",
    nodeCount: 1,
    rowItemCount: 0,
    totalProjectCost: 0,
    isFavorite: false,
    favoriteCreatedAt: null,
    ...overrides,
  };
}

function renderClient(rows: ProjectEstimateListRow[]) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const view = render(
    <QueryClientProvider client={queryClient}>
      <ProjectEstimatesClient projectId="project-1" projectName="Proj" estimates={rows} />
    </QueryClientProvider>,
  );

  return {
    ...view,
    rerenderRows: (nextRows: ProjectEstimateListRow[]) => {
      view.rerender(
        <QueryClientProvider client={queryClient}>
          <ProjectEstimatesClient projectId="project-1" projectName="Proj" estimates={nextRows} />
        </QueryClientProvider>,
      );
    },
  };
}

describe("ProjectEstimatesClient optimistic delete / duplicate / reset", () => {
  beforeEach(() => {
    Object.values(actionMocks).forEach((m) => m.mockReset());
    workshopActionMocks.setEstimateFavorite.mockReset();
    workshopActionMocks.setEstimateFavorite.mockResolvedValue(undefined);
    routerMock.refresh.mockReset();
    show.mockReset();
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
  });

  afterEach(() => vi.restoreAllMocks());

  it("shows a duplicate placeholder immediately, reconciles it, and never refreshes", async () => {
    let resolveDuplicate: ((value: { row: ProjectEstimateListRow }) => void) | undefined;
    actionMocks.duplicateEstimateSheet.mockImplementation(
      () => new Promise((resolve) => { resolveDuplicate = resolve; }),
    );
    const user = userEvent.setup();
    renderClient([makeRow()]);

    await user.click(screen.getByRole("button", { name: "Duplicate Original Estimate" }));

    // Synchronous "Original Estimate Copy" placeholder rendered as pending text.
    expect(screen.getByText("Original Estimate Copy")).toBeInTheDocument();
    expect(show).not.toHaveBeenCalled();

    resolveDuplicate?.({ row: makeRow({ id: "dup-1", name: "Original Estimate Copy", sheet_code: "EST-002", firstNodeId: "node-2" }) });

    // Reconciled to a settled, editable row (input value, not pending text).
    await waitFor(() => expect(screen.getByDisplayValue("Original Estimate Copy")).toBeInTheDocument());
    expect(routerMock.refresh).not.toHaveBeenCalled();
  });

  it("rolls back a duplicate placeholder when persistence fails and never refreshes", async () => {
    let rejectDuplicate: ((error: Error) => void) | undefined;
    actionMocks.duplicateEstimateSheet.mockImplementationOnce(
      () => new Promise((_resolve, reject) => { rejectDuplicate = reject; }),
    );
    const user = userEvent.setup();
    renderClient([makeRow()]);

    await user.click(screen.getByRole("button", { name: "Duplicate Original Estimate" }));

    expect(screen.getByText("Original Estimate Copy")).toBeInTheDocument();
    rejectDuplicate?.(new Error("Could not copy estimate."));
    await waitFor(() => expect(screen.queryByText("Original Estimate Copy")).not.toBeInTheDocument());
    expect(screen.getByRole("alert")).toHaveTextContent("Could not copy estimate.");
    expect(routerMock.refresh).not.toHaveBeenCalled();
    expect(show).not.toHaveBeenCalled();
  });

  it("updates the visible remaining budget immediately while an inline budget save is pending", async () => {
    let resolveUpdate: ((value: { estimate: ProjectEstimateListRow }) => void) | undefined;
    actionMocks.updateEstimateDetails.mockImplementation(
      () => new Promise((resolve) => { resolveUpdate = resolve; }),
    );
    const user = userEvent.setup();
    renderClient([makeRow({ project_budget: 5000, totalProjectCost: 1250 })]);

    expect(screen.getByText("+₱ 3,750.00")).toBeInTheDocument();

    const budgetInput = screen.getByLabelText("Project budget for Original Estimate");
    await user.clear(budgetInput);
    await user.type(budgetInput, "6,500.00{Enter}");

    expect(actionMocks.updateEstimateDetails).toHaveBeenCalledWith({
      projectId: "project-1",
      estimateId: "estimate-1",
      projectBudget: 6500,
    });
    await waitFor(() => expect(screen.getByText("+₱ 5,250.00")).toBeInTheDocument());
    expect(screen.getByText("Saving")).toBeInTheDocument();
    expect(screen.getByLabelText("Project budget for Original Estimate")).toBeDisabled();
    expect(routerMock.refresh).not.toHaveBeenCalled();
    expect(show).not.toHaveBeenCalled();

    resolveUpdate?.({ estimate: makeRow({ project_budget: 6500, totalProjectCost: 1250 }) });
    await waitFor(() => expect(screen.getByText("Saved")).toBeInTheDocument());
  });

  it("disables row actions while an optimistic rename is pending", async () => {
    let rejectUpdate: ((error: Error) => void) | undefined;
    actionMocks.updateEstimateDetails.mockImplementationOnce(
      () => new Promise((_resolve, reject) => { rejectUpdate = reject; }),
    );
    const user = userEvent.setup();
    renderClient([makeRow()]);

    const nameInput = screen.getByLabelText("Estimate name for Original Estimate");
    await user.clear(nameInput);
    await user.type(nameInput, "Draft Rename{Enter}");

    const favoriteButton = await screen.findByRole("button", { name: /favorite estimate sheets/i });
    expect(favoriteButton).toBeDisabled();
    await user.click(favoriteButton);
    expect(workshopActionMocks.setEstimateFavorite).not.toHaveBeenCalled();

    rejectUpdate?.(new Error("Rename failed."));
    await waitFor(() => expect(screen.getByDisplayValue("Original Estimate")).toBeInTheDocument());
    expect(screen.getByRole("button", { name: "Add Original Estimate to favorite estimate sheets" })).not.toBeDisabled();
    expect(routerMock.refresh).not.toHaveBeenCalled();
    expect(show).not.toHaveBeenCalled();
  });

  it("keeps a fresher reseeded name when an older optimistic rename fails", async () => {
    let rejectUpdate: ((error: Error) => void) | undefined;
    actionMocks.updateEstimateDetails.mockImplementationOnce(
      () => new Promise((_resolve, reject) => { rejectUpdate = reject; }),
    );
    const user = userEvent.setup();
    const { rerenderRows } = renderClient([makeRow()]);

    const nameInput = screen.getByLabelText("Estimate name for Original Estimate");
    await user.clear(nameInput);
    await user.type(nameInput, "Draft Rename{Enter}");

    await waitFor(() => expect(screen.getByDisplayValue("Draft Rename")).toBeInTheDocument());

    rerenderRows([makeRow({ name: "Server Renamed Estimate" })]);
    await waitFor(() => expect(screen.getByDisplayValue("Server Renamed Estimate")).toBeInTheDocument());

    rejectUpdate?.(new Error("Rename failed."));

    await waitFor(() => expect(screen.getByDisplayValue("Server Renamed Estimate")).toBeInTheDocument());
    expect(screen.queryByDisplayValue("Original Estimate")).not.toBeInTheDocument();
    expect(screen.queryByDisplayValue("Draft Rename")).not.toBeInTheDocument();
    expect(screen.getByTitle("Rename failed.")).toBeInTheDocument();
    expect(routerMock.refresh).not.toHaveBeenCalled();
    expect(show).not.toHaveBeenCalled();
  });

  it("disables code auto-generation while a manual sheet-code save is pending", async () => {
    let resolveUpdate: ((value: { estimate: ProjectEstimateListRow }) => void) | undefined;
    actionMocks.updateEstimateDetails.mockImplementationOnce(
      () => new Promise((resolve) => { resolveUpdate = resolve; }),
    );
    const user = userEvent.setup();
    renderClient([makeRow()]);

    const codeInput = screen.getByLabelText("Estimate code for Original Estimate");
    await user.clear(codeInput);
    await user.type(codeInput, "LR-009{Enter}");

    const autoButton = await screen.findByRole("button", { name: "Auto-generate estimate code for Original Estimate" });
    expect(autoButton).toBeDisabled();
    await user.click(autoButton);
    expect(actionMocks.regenerateEstimateSheetCode).not.toHaveBeenCalled();

    resolveUpdate?.({ estimate: makeRow({ sheet_code: "LR-009" }) });
    await waitFor(() => expect(autoButton).not.toBeDisabled());
    expect(routerMock.refresh).not.toHaveBeenCalled();
    expect(show).not.toHaveBeenCalled();
  });

  it("rolls an inline budget edit back on failure without showing a saved state or refreshing", async () => {
    let rejectUpdate: ((error: Error) => void) | undefined;
    actionMocks.updateEstimateDetails.mockImplementationOnce(
      () => new Promise((_resolve, reject) => { rejectUpdate = reject; }),
    );
    const user = userEvent.setup();
    renderClient([makeRow({ project_budget: 5000, totalProjectCost: 1250 })]);

    const budgetInput = screen.getByLabelText("Project budget for Original Estimate");
    await user.clear(budgetInput);
    await user.type(budgetInput, "6,500.00{Enter}");

    await waitFor(() => expect(screen.getByText("+₱ 5,250.00")).toBeInTheDocument());
    rejectUpdate?.(new Error("Budget write failed."));
    await waitFor(() => expect(screen.getByText("+₱ 3,750.00")).toBeInTheDocument());
    expect(screen.queryByText("+₱ 5,250.00")).not.toBeInTheDocument();
    expect(screen.queryByText("Saved")).not.toBeInTheDocument();
    expect(screen.getByTitle("Budget write failed.")).toBeInTheDocument();
    expect(routerMock.refresh).not.toHaveBeenCalled();
    expect(show).not.toHaveBeenCalled();
  });

  it("removes a row optimistically on confirmed delete and never refreshes", async () => {
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
    const user = userEvent.setup();
    renderClient([makeRow(), makeRow({ id: "estimate-2", name: "Second Estimate" })]);

    await user.click(screen.getByRole("button", { name: "Delete Original Estimate" }));
    const dialog = await screen.findByRole("dialog");
    await user.type(within(dialog).getByLabelText(/Type DELETE ESTIMATE to confirm/i), "DELETE ESTIMATE");
    await user.click(within(dialog).getByRole("button", { name: "Delete estimates" }));

    await waitFor(() => expect(screen.queryByDisplayValue("Original Estimate")).not.toBeInTheDocument());
    expect(screen.getByDisplayValue("Second Estimate")).toBeInTheDocument();
    expect(routerMock.refresh).not.toHaveBeenCalled();
  });

  it("does not execute confirmed delete twice when the confirm action is double-clicked", async () => {
    let resolveDelete: ((value: unknown) => void) | undefined;
    actionMocks.executeBulkDeleteEstimateSheets.mockImplementation(
      () => new Promise((resolve) => { resolveDelete = resolve; }),
    );
    const user = userEvent.setup();
    renderClient([makeRow(), makeRow({ id: "estimate-2", name: "Second Estimate" })]);

    await user.click(screen.getByRole("button", { name: "Delete Original Estimate" }));
    const dialog = await screen.findByRole("dialog");
    await user.type(within(dialog).getByLabelText(/Type DELETE ESTIMATE to confirm/i), "DELETE ESTIMATE");
    await user.dblClick(within(dialog).getByRole("button", { name: "Delete estimates" }));

    expect(actionMocks.executeBulkDeleteEstimateSheets).toHaveBeenCalledTimes(1);
    await waitFor(() => expect(within(dialog).getByRole("button", { name: "Executing…" })).toBeDisabled());
    resolveDelete?.({
      ok: true,
      targetType: "estimate_sheet",
      ids: ["estimate-1"],
      deletedIds: ["estimate-1"],
      summary: { requestedCount: 1, eligibleCount: 1, blockedCount: 0 },
      issues: [],
      blocked: [],
      storageTargets: [],
    });

    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    expect(routerMock.refresh).not.toHaveBeenCalled();
    expect(show).not.toHaveBeenCalled();
  });

  it("restores rows when a confirmed delete is rejected", async () => {
    actionMocks.executeBulkDeleteEstimateSheets.mockResolvedValue({
      ok: false,
      targetType: "estimate_sheet",
      ids: ["estimate-1"],
      issues: [{ message: "Estimate is locked." }],
      blocked: [],
      summary: { requestedCount: 1, eligibleCount: 0, blockedCount: 1 },
      storageTargets: [],
    });
    const user = userEvent.setup();
    renderClient([makeRow()]);

    await user.click(screen.getByRole("button", { name: "Delete Original Estimate" }));
    const dialog = await screen.findByRole("dialog");
    await user.type(within(dialog).getByLabelText(/Type DELETE ESTIMATE to confirm/i), "DELETE ESTIMATE");
    await user.click(within(dialog).getByRole("button", { name: "Delete estimates" }));

    // Row restored after rejection; no overlay refresh.
    await waitFor(() => expect(screen.getByDisplayValue("Original Estimate")).toBeInTheDocument());
    expect(routerMock.refresh).not.toHaveBeenCalled();
  });

  it("resets column widths without any network refresh", async () => {
    const user = userEvent.setup();
    renderClient([makeRow()]);

    await user.click(screen.getByRole("button", { name: "Reset Column Widths" }));

    expect(routerMock.refresh).not.toHaveBeenCalled();
    expect(show).not.toHaveBeenCalled();
  });
});
