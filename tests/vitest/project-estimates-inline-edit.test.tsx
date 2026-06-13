import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { createProjectEstimatesStore } from "@/stores/project-estimates-store";
import type { ProjectEstimateListRow } from "@/lib/estimates/project-estimate-list-row";

const routerMock = vi.hoisted(() => ({ prefetch: vi.fn(), refresh: vi.fn(), push: vi.fn(), replace: vi.fn() }));
const show = vi.hoisted(() => vi.fn());
const actionMocks = vi.hoisted(() => ({
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

import { ProjectEstimatesTable } from "@/components/workshop/ProjectEstimatesTable";

function makeRow(overrides: Partial<ProjectEstimateListRow> = {}): ProjectEstimateListRow {
  return {
    id: "estimate-1",
    project_id: "project-1",
    name: "Original Estimate",
    sheet_code: "EST-001",
    currency_code: "PHP",
    notes: "Original notes",
    project_budget: 5000,
    created_at: "2026-05-19T10:00:00.000Z",
    updated_at: "2026-05-19T10:00:00.000Z",
    firstNodeId: "node-1",
    nodeCount: 1,
    rowItemCount: 1,
    totalProjectCost: 1250,
    ...overrides,
  };
}

function renderWithStore() {
  const store = createProjectEstimatesStore([makeRow()]);
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(
    <QueryClientProvider client={queryClient}>
      <ProjectEstimatesTable estimates={store.getState().estimates} projectId="project-1" store={store} optimistic />
    </QueryClientProvider>,
  );
  return store;
}

describe("ProjectEstimatesTable optimistic inline edit", () => {
  beforeEach(() => {
    Object.values(actionMocks).forEach((m) => m.mockReset());
    routerMock.refresh.mockReset();
    show.mockReset();
    actionMocks.fetchEstimateTree.mockResolvedValue([]);
  });

  afterEach(() => vi.restoreAllMocks());

  it("reconciles a rename into the store without an overlay refresh", async () => {
    actionMocks.updateEstimateDetails.mockResolvedValue({ estimate: makeRow({ name: "Renamed Estimate" }) });
    const user = userEvent.setup();
    const store = renderWithStore();

    const nameInput = screen.getByLabelText("Estimate name for Original Estimate");
    await user.clear(nameInput);
    await user.type(nameInput, "Renamed Estimate{Enter}");

    await waitFor(() => expect(actionMocks.updateEstimateDetails).toHaveBeenCalledTimes(1));
    expect(actionMocks.updateEstimateDetails).toHaveBeenCalledWith({
      projectId: "project-1",
      estimateId: "estimate-1",
      name: "Renamed Estimate",
    });
    await waitFor(() => expect(store.getState().estimates[0].name).toBe("Renamed Estimate"));
    expect(routerMock.refresh).not.toHaveBeenCalled();
    expect(show).not.toHaveBeenCalled();
  });

  it("auto-generates a sheet code into the store without an overlay refresh", async () => {
    actionMocks.regenerateEstimateSheetCode.mockResolvedValue({ estimate: makeRow({ sheet_code: "EST-042" }) });
    const user = userEvent.setup();
    const store = renderWithStore();

    await user.click(screen.getByRole("button", { name: "Auto-generate estimate code for Original Estimate" }));

    await waitFor(() => expect(store.getState().estimates[0].sheet_code).toBe("EST-042"));
    expect(routerMock.refresh).not.toHaveBeenCalled();
    expect(show).not.toHaveBeenCalled();
  });
});
