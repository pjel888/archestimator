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
  previewBulkDeleteEstimateSheets: vi.fn(),
  regenerateEstimateSheetCode: vi.fn(),
  updateEstimateDetails: vi.fn(),
}));

vi.mock("next/navigation", () => ({ useRouter: () => routerMock }));
vi.mock("@/stores/navigation-ui-store", () => ({
  useNavigationUiStore: (selector: (state: { show: typeof show }) => unknown) => selector({ show }),
}));
vi.mock("@/lib/estimates/actions", () => actionMocks);
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
    ...overrides,
  };
}

function renderClient(rows: ProjectEstimateListRow[]) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(
    <QueryClientProvider client={queryClient}>
      <ProjectEstimatesClient projectId="project-1" projectName="Proj" estimates={rows} />
    </QueryClientProvider>,
  );
}

describe("ProjectEstimatesClient optimistic delete / duplicate / reset", () => {
  beforeEach(() => {
    Object.values(actionMocks).forEach((m) => m.mockReset());
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
