import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

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

function renderClient() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(
    <QueryClientProvider client={queryClient}>
      <ProjectEstimatesClient projectId="p" projectName="Proj" estimates={[]} canCreateEstimates canEditEstimateById={{}} />
    </QueryClientProvider>,
  );
}

const canonicalRow = {
  id: "real-1",
  project_id: "p",
  name: "EST-002 Estimate",
  sheet_code: "EST-002",
  currency_code: "PHP",
  notes: null,
  project_budget: null,
  created_at: "2026-01-01T00:00:00Z",
  updated_at: "2026-01-01T00:00:00Z",
  firstNodeId: "node-1",
  nodeCount: 6,
  rowItemCount: 0,
  totalProjectCost: 0,
  isFavorite: false,
  favoriteCreatedAt: null,
};

describe("ProjectEstimatesClient optimistic create", () => {
  beforeEach(() => {
    Object.values(actionMocks).forEach((m) => m.mockReset());
    workshopActionMocks.setEstimateFavorite.mockReset();
    workshopActionMocks.setEstimateFavorite.mockResolvedValue(undefined);
    routerMock.refresh.mockReset();
    show.mockReset();
    actionMocks.fetchEstimateTree.mockResolvedValue([]);
  });

  afterEach(() => vi.restoreAllMocks());

  it("renders the estimate filter as an icon-only toolbar control", () => {
    renderClient();

    const filterControl = screen.getByRole("combobox", { name: "Filter estimates" });
    expect(filterControl).toHaveAttribute("title", "All estimates");
    expect(filterControl).toHaveClass("border-0", "gap-1.5", "px-1.5");
    expect(screen.queryByText("All estimates")).not.toBeInTheDocument();
  });

  it("shows an optimistic row immediately and never triggers the overlay", async () => {
    let resolveCreate: ((value: { row: typeof canonicalRow }) => void) | undefined;
    actionMocks.createEstimateSheetDraft.mockImplementation(
      () => new Promise((resolve) => { resolveCreate = resolve; }),
    );

    renderClient();
    fireEvent.click(screen.getByRole("button", { name: /create estimate/i }));

    // Synchronous optimistic placeholder, before the action resolves.
    expect(screen.getByText(/creating/i)).toBeInTheDocument();
    expect(show).not.toHaveBeenCalled();
    expect(actionMocks.createEstimateSheetDraft).toHaveBeenCalledWith("p");

    resolveCreate?.({ row: canonicalRow });
    await waitFor(() => expect(screen.getByDisplayValue("EST-002 Estimate")).toBeInTheDocument());
    expect(routerMock.refresh).not.toHaveBeenCalled();
    expect(show).not.toHaveBeenCalled();
  });

  it("rolls back the optimistic row and surfaces an error when create fails", async () => {
    actionMocks.createEstimateSheetDraft.mockRejectedValue(new Error("nope"));

    renderClient();
    fireEvent.click(screen.getByRole("button", { name: /create estimate/i }));

    await waitFor(() => expect(screen.getByRole("alert")).toHaveTextContent("nope"));
    expect(screen.queryByText(/creating/i)).not.toBeInTheDocument();
    expect(routerMock.refresh).not.toHaveBeenCalled();
  });
});
