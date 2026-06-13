import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { ProjectEstimatesClient } from "@/components/workshop/ProjectEstimatesClient";
import type { ProjectEstimateTableRow } from "@/components/workshop/ProjectEstimatesTable";

const routerMock = vi.hoisted(() => ({
  refresh: vi.fn(),
}));

const actionMocks = vi.hoisted(() => ({
  createEstimateSheetDraft: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => routerMock,
}));

vi.mock("@/lib/estimates/actions", () => actionMocks);

vi.mock("@/components/workshop/ProjectEstimatesTable", () => ({
  ProjectEstimatesTable: () => <div data-testid="project-estimates-table" />,
}));

function renderClient(estimates: ProjectEstimateTableRow[] = []) {
  render(
    <ProjectEstimatesClient
      estimates={estimates}
      projectId="project-1"
      projectName="Lewis Residence"
    />,
  );
}

function makeEstimate(overrides: Partial<ProjectEstimateTableRow> = {}): ProjectEstimateTableRow {
  return {
    created_at: "2026-05-19T10:00:00.000Z",
    currency_code: "PHP",
    firstNodeId: "node-1",
    id: "estimate-1",
    name: "Ground Floor Fit-Out",
    nodeCount: 1,
    notes: null,
    project_budget: null,
    project_id: "project-1",
    rowItemCount: 0,
    sheet_code: "EST-001",
    totalProjectCost: 0,
    updated_at: "2026-05-19T10:00:00.000Z",
    ...overrides,
  };
}

describe("project estimates create flow", () => {
  beforeEach(() => {
    actionMocks.createEstimateSheetDraft.mockReset();
    routerMock.refresh.mockReset();
  });

  it("guards the create estimate action against rapid double-submit", async () => {
    let resolveCreate: ((value: { estimateId: string; areaNodeId: string; sheetCode: string }) => void) | undefined;
    actionMocks.createEstimateSheetDraft.mockImplementation(
      () =>
        new Promise((resolve) => {
          resolveCreate = resolve;
        }),
    );
    const user = userEvent.setup();

    renderClient();

    const createButton = screen.getByRole("button", { name: "Create Estimate" });
    expect(createButton).not.toHaveTextContent("Create Estimate");
    await user.dblClick(createButton);

    expect(actionMocks.createEstimateSheetDraft).toHaveBeenCalledTimes(1);
    expect(actionMocks.createEstimateSheetDraft).toHaveBeenCalledWith("project-1");
    expect(screen.getByRole("button", { name: "Creating estimate" })).toBeDisabled();

    resolveCreate?.({ estimateId: "estimate-1", areaNodeId: "node-1", sheetCode: "ES-001" });
    await waitFor(() => expect(routerMock.refresh).toHaveBeenCalledTimes(1));
  });

  it("guides first-run users to create the first estimate sheet", async () => {
    actionMocks.createEstimateSheetDraft.mockResolvedValue({
      estimateId: "estimate-1",
      areaNodeId: "node-1",
      sheetCode: "ES-001",
    });
    const user = userEvent.setup();

    renderClient();

    expect(screen.getByText("Create the first estimate")).toBeInTheDocument();
    expect(screen.getByText(/Start an estimate before adding groups/)).toBeInTheDocument();
    expect(screen.queryByTestId("project-estimates-table")).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Create first estimate" }));

    expect(actionMocks.createEstimateSheetDraft).toHaveBeenCalledWith("project-1");
    await waitFor(() => expect(routerMock.refresh).toHaveBeenCalledTimes(1));
  });

  it("shows searchable no-match copy without creating duplicate estimate actions", async () => {
    const user = userEvent.setup();

    renderClient([makeEstimate()]);

    expect(screen.getByTestId("project-estimates-table")).toBeInTheDocument();

    await user.type(screen.getByRole("searchbox", { name: "Search Estimates" }), "zzzz-estimate");

    expect(screen.getByText("No matching estimates")).toBeInTheDocument();
    expect(screen.getByText("Try an estimate code, estimate name, or clear search to return to all estimates.")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Create first estimate" })).not.toBeInTheDocument();
    expect(screen.queryByTestId("project-estimates-table")).not.toBeInTheDocument();
  });
});
