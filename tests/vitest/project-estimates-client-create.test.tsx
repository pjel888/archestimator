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
      projectBudget={5000}
      projectId="project-1"
      projectName="Lewis Residence"
    />,
  );
}

describe("project estimates create flow", () => {
  beforeEach(() => {
    actionMocks.createEstimateSheetDraft.mockReset();
    routerMock.refresh.mockReset();
  });

  it("guards the create estimate sheet action against rapid double-submit", async () => {
    let resolveCreate: ((value: { estimateId: string; areaNodeId: string; sheetCode: string }) => void) | undefined;
    actionMocks.createEstimateSheetDraft.mockImplementation(
      () =>
        new Promise((resolve) => {
          resolveCreate = resolve;
        }),
    );
    const user = userEvent.setup();

    renderClient();

    const createButton = screen.getByRole("button", { name: "Create Estimate Sheet" });
    await user.dblClick(createButton);

    expect(actionMocks.createEstimateSheetDraft).toHaveBeenCalledTimes(1);
    expect(actionMocks.createEstimateSheetDraft).toHaveBeenCalledWith("project-1");
    expect(screen.getByRole("button", { name: "Creating..." })).toBeDisabled();

    resolveCreate?.({ estimateId: "estimate-1", areaNodeId: "node-1", sheetCode: "ES-001" });
    await waitFor(() => expect(routerMock.refresh).toHaveBeenCalledTimes(1));
  });
});
