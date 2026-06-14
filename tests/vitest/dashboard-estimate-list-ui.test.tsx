import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { DashboardEstimateList } from "@/components/workshop/dashboard/DashboardEstimateList";
import type { DashboardEstimateSheet } from "@/lib/workshop/dashboard-types";

const PROJECT_ID = "proj-1";
const SELECTED_ID = "selected";

function sheet(overrides: Partial<DashboardEstimateSheet> & { id: string }): DashboardEstimateSheet {
  return {
    name: `Estimate ${overrides.id}`,
    sheetCode: `EST-${overrides.id}`,
    total: 1000,
    currencyCode: "PHP",
    updatedAt: "2026-06-01T00:00:00.000Z",
    rowCount: 4,
    nodeCount: 2,
    firstNodeId: `node-${overrides.id}`,
    budget: null,
    variance: null,
    isSelected: false,
    isIncludedInProposal: false,
    ...overrides,
  };
}

describe("DashboardEstimateList (Zone C)", () => {
  it("shows at most 6 rows and a 'View all' link when there are more (R8)", () => {
    const estimateSheets = Array.from({ length: 7 }, (_unused, index) => sheet({ id: `e${index}` }));
    render(
      <DashboardEstimateList
        projectId={PROJECT_ID}
        selectedEstimateId={SELECTED_ID}
        selectedGroupingMode="category"
        estimateSheets={estimateSheets}
        totalEstimateCount={7}
      />,
    );

    expect(screen.getAllByRole("listitem")).toHaveLength(6);
    expect(screen.getByRole("link", { name: /View all 7/ })).toHaveAttribute(
      "href",
      `/workshop/projects/${PROJECT_ID}/estimates`,
    );
  });

  it("does not render a 'View all' link at six or fewer estimates", () => {
    render(
      <DashboardEstimateList
        projectId={PROJECT_ID}
        selectedEstimateId={SELECTED_ID}
        selectedGroupingMode="category"
        estimateSheets={[sheet({ id: "a" }), sheet({ id: "b" })]}
        totalEstimateCount={2}
      />,
    );
    expect(screen.queryByRole("link", { name: /View all/ })).not.toBeInTheDocument();
  });

  it("shows selected, proposal, and over-budget row markers", () => {
    render(
      <DashboardEstimateList
        projectId={PROJECT_ID}
        selectedEstimateId={SELECTED_ID}
        selectedGroupingMode="category"
        estimateSheets={[
          sheet({ id: SELECTED_ID, name: "Selected one", isSelected: true, isIncludedInProposal: true }),
          sheet({
            id: "over",
            name: "Over one",
            variance: { budget: 500, delta: 500, percent: 1, isOver: true },
          }),
          sheet({ id: "ok", name: "Fine one" }),
        ]}
        totalEstimateCount={3}
      />,
    );

    const selectedRow = screen.getByText("Selected one").closest("li") as HTMLElement;
    const overRow = screen.getByText("Over one").closest("li") as HTMLElement;
    const okRow = screen.getByText("Fine one").closest("li") as HTMLElement;
    expect(within(selectedRow).getByText("Selected")).toBeInTheDocument();
    expect(within(selectedRow).getByText("Proposal")).toBeInTheDocument();
    expect(within(overRow).getByText("Over")).toBeInTheDocument();
    expect(within(okRow).queryByText("Over")).not.toBeInTheDocument();
  });

  it("links each row into the sheet and into Compare pre-selected with the selected estimate and mode (R8)", () => {
    render(
      <DashboardEstimateList
        projectId={PROJECT_ID}
        selectedEstimateId={SELECTED_ID}
        selectedGroupingMode="supplier"
        estimateSheets={[sheet({ id: SELECTED_ID, name: "Selected estimate" }), sheet({ id: "row-1", firstNodeId: "node-row-1" })]}
        totalEstimateCount={2}
      />,
    );

    expect(screen.getByRole("link", { name: "Open Estimate row-1" })).toHaveAttribute(
      "href",
      `/workshop/projects/${PROJECT_ID}/estimates/node-row-1`,
    );
    expect(screen.getByRole("link", { name: "Compare Estimate row-1" })).toHaveAttribute(
      "href",
      `/workshop/projects/${PROJECT_ID}/charts?left=${SELECTED_ID}&right=row-1&mode=supplier`,
    );
    expect(screen.getByRole("link", { name: "Compare Selected estimate" })).toHaveAttribute(
      "href",
      `/workshop/projects/${PROJECT_ID}/charts?left=${SELECTED_ID}&mode=supplier`,
    );
  });

  it("renders each row in its own currency without summing across rows (R9)", () => {
    render(
      <DashboardEstimateList
        projectId={PROJECT_ID}
        selectedEstimateId={SELECTED_ID}
        selectedGroupingMode="category"
        estimateSheets={[
          sheet({ id: "php", name: "Peso est", total: 1000, currencyCode: "PHP" }),
          sheet({ id: "usd", name: "Dollar est", total: 2000, currencyCode: "USD" }),
        ]}
        totalEstimateCount={2}
      />,
    );

    const phpRow = screen.getByText("Peso est").closest("li") as HTMLElement;
    const usdRow = screen.getByText("Dollar est").closest("li") as HTMLElement;
    expect(within(phpRow).getByText("₱1,000")).toBeInTheDocument();
    expect(within(usdRow).getByText(/\$.*2,000/)).toBeInTheDocument();
  });

  it("renders a useful row for a one-estimate project", () => {
    render(
      <DashboardEstimateList
        projectId={PROJECT_ID}
        selectedEstimateId={SELECTED_ID}
        selectedGroupingMode="category"
        estimateSheets={[sheet({ id: SELECTED_ID, name: "Only estimate", isSelected: true })]}
        totalEstimateCount={1}
      />,
    );

    expect(screen.getByLabelText("Recent estimate sheets")).toBeInTheDocument();
    expect(screen.getByText("Only estimate")).toBeInTheDocument();
    expect(screen.getByText("Selected")).toBeInTheDocument();
  });

  it("renders nothing when there are no estimate sheets", () => {
    const { container } = render(
      <DashboardEstimateList
        projectId={PROJECT_ID}
        selectedEstimateId={SELECTED_ID}
        selectedGroupingMode="category"
        estimateSheets={[]}
        totalEstimateCount={0}
      />,
    );
    expect(container).toBeEmptyDOMElement();
  });
});
