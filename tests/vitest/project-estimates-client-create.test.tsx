import { fireEvent, render, screen, waitFor } from "@testing-library/react";
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
const projectEstimatesTableMock = vi.hoisted(() => vi.fn());

vi.mock("next/navigation", () => ({
  useRouter: () => routerMock,
}));

vi.mock("@/lib/estimates/actions", () => actionMocks);

vi.mock("@/components/workshop/ProjectEstimatesTable", () => ({
  ProjectEstimatesTable: (props: { estimates: ProjectEstimateTableRow[] }) => {
    projectEstimatesTableMock(props);
    return <div data-testid="project-estimates-table" data-estimate-ids={props.estimates.map((estimate) => estimate.id).join(",")} />;
  },
}));

function renderClient(
  estimates: ProjectEstimateTableRow[] = [],
  options: {
    canCreateEstimates?: boolean;
    canEditEstimateById?: Record<string, boolean>;
  } = {},
) {
  const canEditEstimateById = options.canEditEstimateById ?? Object.fromEntries(estimates.map((estimate) => [estimate.id, true]));
  render(
    <ProjectEstimatesClient
      canCreateEstimates={options.canCreateEstimates ?? true}
      canEditEstimateById={canEditEstimateById}
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
    firstNodeId: null,
    id: "estimate-1",
    name: "Ground Floor Fit-Out",
    nodeCount: 0,
    notes: null,
    project_budget: null,
    project_id: "project-1",
    rowItemCount: 0,
    sheet_code: "EST-001",
    totalProjectCost: 0,
    isFavorite: false,
    favoriteCreatedAt: null,
    updated_at: "2026-05-19T10:00:00.000Z",
    ...overrides,
  };
}

function latestRenderedEstimateIds() {
  const calls = projectEstimatesTableMock.mock.calls;
  const latestCall = calls[calls.length - 1];
  const latestProps = latestCall?.[0] as { estimates: ProjectEstimateTableRow[] } | undefined;
  return latestProps?.estimates.map((estimate) => estimate.id) ?? [];
}

async function selectToolbarOption(user: ReturnType<typeof userEvent.setup>, controlName: string, optionName: string) {
  await user.click(screen.getByRole("combobox", { name: controlName }));
  await user.click(screen.getByRole("option", { name: optionName }));
}

describe("project estimates create flow", () => {
  beforeEach(() => {
    actionMocks.createEstimateSheetDraft.mockReset();
    projectEstimatesTableMock.mockClear();
    routerMock.refresh.mockReset();
  });

  it("guards the create estimate action against rapid double-submit", async () => {
    let resolveCreate: ((value: { row: ProjectEstimateTableRow }) => void) | undefined;
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

    resolveCreate?.({ row: makeEstimate({ id: "estimate-1" }) });
    // P0: optimistic reconciliation, never a full-screen-overlay router.refresh().
    await waitFor(() => expect(screen.getByRole("button", { name: "Create Estimate" })).not.toBeDisabled());
    expect(routerMock.refresh).not.toHaveBeenCalled();
  });

  it("keeps first-run users in the estimate table shell", async () => {
    actionMocks.createEstimateSheetDraft.mockResolvedValue({ row: makeEstimate({ id: "estimate-1" }) });
    const user = userEvent.setup();

    renderClient();

    expect(screen.queryByText("Create the first estimate")).not.toBeInTheDocument();
    expect(screen.queryByText(/Start an estimate before adding groups/)).not.toBeInTheDocument();
    expect(screen.getByTestId("project-estimates-table")).toHaveAttribute("data-estimate-ids", "");

    await user.click(screen.getByRole("button", { name: "Create Estimate" }));

    expect(actionMocks.createEstimateSheetDraft).toHaveBeenCalledWith("project-1");
    await waitFor(() => expect(actionMocks.createEstimateSheetDraft).toHaveBeenCalledTimes(1));
    expect(routerMock.refresh).not.toHaveBeenCalled();
  });

  it("disables estimate creation for project viewers", async () => {
    const user = userEvent.setup();

    renderClient([], { canCreateEstimates: false });

    const createButton = screen.getByRole("button", { name: "Create Estimate" });
    expect(createButton).toBeDisabled();

    await user.click(createButton);

    expect(actionMocks.createEstimateSheetDraft).not.toHaveBeenCalled();
    expect(routerMock.refresh).not.toHaveBeenCalled();
  });

  it("keeps searchable no-match results in the estimate table shell", async () => {
    const user = userEvent.setup();

    renderClient([makeEstimate()]);

    expect(screen.getByTestId("project-estimates-table")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Show estimates search" }));
    fireEvent.change(screen.getByRole("searchbox", { name: "Search Estimates" }), { target: { value: "zzzz-estimate" } });

    expect(screen.queryByText("No matching estimates")).not.toBeInTheDocument();
    expect(screen.queryByText("Adjust filters or clear search to return to more estimates.")).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Create first estimate" })).not.toBeInTheDocument();
    expect(screen.getByTestId("project-estimates-table")).toHaveAttribute("data-estimate-ids", "");
  });

  it("filters favorite estimates and searches within the active filter", async () => {
    const user = userEvent.setup();

    renderClient([
      makeEstimate({
        id: "favorite",
        name: "Favorite Finish Package",
        sheet_code: "FAV-001",
        isFavorite: true,
        updated_at: "2026-06-10T10:00:00.000Z",
      }),
      makeEstimate({
        id: "ordinary",
        name: "Ordinary Foundation",
        sheet_code: "ORD-001",
        updated_at: "2026-06-11T10:00:00.000Z",
      }),
    ]);

    await selectToolbarOption(user, "Filter estimates", "Favorites");

    expect(screen.getByRole("combobox", { name: "Filter estimates" })).toHaveAttribute("title", "Favorites");
    expect(latestRenderedEstimateIds()).toEqual(["favorite"]);

    await user.click(screen.getByRole("button", { name: "Show estimates search" }));
    fireEvent.change(screen.getByRole("searchbox", { name: "Search Estimates" }), { target: { value: "ORD-001" } });

    expect(screen.getByTestId("project-estimates-table")).toHaveAttribute("data-estimate-ids", "");
    expect(screen.queryByText("No matching estimates")).not.toBeInTheDocument();

    fireEvent.change(screen.getByRole("searchbox", { name: "Search Estimates" }), { target: { value: "FAV-001" } });

    expect(screen.getByTestId("project-estimates-table")).toBeInTheDocument();
    expect(latestRenderedEstimateIds()).toEqual(["favorite"]);
    expect(routerMock.refresh).not.toHaveBeenCalled();
  });

  it("filters recent estimates by updated date", async () => {
    const dateNowSpy = vi.spyOn(Date, "now").mockReturnValue(new Date("2026-06-16T12:00:00.000Z").getTime());
    const user = userEvent.setup();

    try {
      renderClient([
        makeEstimate({ id: "recent", name: "Recent Estimate", updated_at: "2026-06-10T10:00:00.000Z" }),
        makeEstimate({ id: "stale", name: "Stale Estimate", updated_at: "2026-04-01T10:00:00.000Z" }),
      ]);

      await selectToolbarOption(user, "Filter estimates", "Recent");

      expect(screen.getByRole("combobox", { name: "Filter estimates" })).toHaveAttribute("title", "Recent");
      expect(latestRenderedEstimateIds()).toEqual(["recent"]);
    } finally {
      dateNowSpy.mockRestore();
    }
  });

  it("sorts estimates by toolbar field and direction", async () => {
    const user = userEvent.setup();

    renderClient([
      makeEstimate({
        id: "older-charlie",
        name: "Charlie Estimate",
        created_at: "2026-01-01T10:00:00.000Z",
        updated_at: "2026-01-03T10:00:00.000Z",
      }),
      makeEstimate({
        id: "newer-alpha",
        name: "Alpha Estimate",
        created_at: "2026-03-01T10:00:00.000Z",
        updated_at: "2026-03-03T10:00:00.000Z",
      }),
      makeEstimate({
        id: "middle-bravo",
        name: "bravo Estimate",
        created_at: "2026-02-01T10:00:00.000Z",
        updated_at: "2026-02-03T10:00:00.000Z",
      }),
    ]);

    expect(latestRenderedEstimateIds()).toEqual(["newer-alpha", "middle-bravo", "older-charlie"]);

    await selectToolbarOption(user, "Sort field", "Estimate name");
    expect(screen.getByRole("combobox", { name: "Sort direction" })).toHaveAttribute("title", "A to Z");
    expect(latestRenderedEstimateIds()).toEqual(["newer-alpha", "middle-bravo", "older-charlie"]);

    await selectToolbarOption(user, "Sort direction", "Z to A");
    expect(latestRenderedEstimateIds()).toEqual(["older-charlie", "middle-bravo", "newer-alpha"]);

    await selectToolbarOption(user, "Sort field", "Date created");
    expect(screen.getByRole("combobox", { name: "Sort direction" })).toHaveAttribute("title", "Newest first");
    expect(latestRenderedEstimateIds()).toEqual(["newer-alpha", "middle-bravo", "older-charlie"]);

    await selectToolbarOption(user, "Sort direction", "Oldest first");
    expect(latestRenderedEstimateIds()).toEqual(["older-charlie", "middle-bravo", "newer-alpha"]);
  });
});
