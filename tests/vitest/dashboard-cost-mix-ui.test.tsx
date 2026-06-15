import { fireEvent, render, screen, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { DashboardCostMix } from "@/components/workshop/dashboard/DashboardCostMix";
import { colorForBucket } from "@/lib/project-charts/bucket-color";
import type { ProjectChartBucket, ProjectChartEstimateSeries } from "@/lib/project-charts/types";
import type { DashboardEstimateSheet } from "@/lib/workshop/dashboard-types";

const routerReplaceMock = vi.hoisted(() => vi.fn());

vi.mock("next/navigation", () => ({
  usePathname: () => "/workshop/projects/proj-1",
  useRouter: () => ({ replace: routerReplaceMock }),
  useSearchParams: () => new URLSearchParams("estimate=est-1&mode=category"),
}));

function bucket(
  id: string,
  label: string,
  total: number,
  seriesTotal: number,
  overrides: Partial<ProjectChartBucket> = {},
): ProjectChartBucket {
  return { id, label, total, share: total / seriesTotal, rowCount: 1, color: colorForBucket(id), ...overrides };
}

function seriesFixture(): ProjectChartEstimateSeries {
  // Category: 6 segments so collapse to top-5 + Other can be exercised.
  const categoryTotal = 600;
  const category = {
    total: categoryTotal,
    allBuckets: [
      bucket("c1", "Concrete", 200, categoryTotal),
      bucket("c2", "Steel", 120, categoryTotal),
      bucket("c3", "Finishes", 100, categoryTotal),
      bucket("c4", "MEP", 80, categoryTotal),
      bucket("c5", "Labour", 60, categoryTotal),
      bucket("c6", "Permits", 40, categoryTotal),
    ],
  };
  const supplierTotal = 600;
  const supplier = {
    total: supplierTotal,
    allBuckets: [
      bucket("s1", "Acme Supply", 350, supplierTotal),
      bucket("s2", "Beta Trading", 250, supplierTotal),
    ],
  };
  const space = {
    total: 600,
    allBuckets: [bucket("sp1", "Ground floor", 600, 600, { sourceNodeId: "node-ground" })],
  };
  return { space, category, supplier };
}

const SELECTED_ESTIMATE: DashboardEstimateSheet = {
  id: "est-1",
  name: "Revised scope",
  sheetCode: "EST-001",
  total: 600,
  currencyCode: "PHP",
  updatedAt: "2026-06-10T00:00:00.000Z",
  rowCount: 6,
  nodeCount: 1,
  firstNodeId: "node-est-1",
  budget: null,
  variance: null,
  isSelected: true,
  isIncludedInProposal: false,
};

function renderCostMix(series: ProjectChartEstimateSeries = seriesFixture()) {
  return render(
    <DashboardCostMix
      projectId="proj-1"
      selectedEstimate={SELECTED_ESTIMATE}
      estimateSheets={[SELECTED_ESTIMATE, { ...SELECTED_ESTIMATE, id: "est-2", name: "Initial estimate", isSelected: false }]}
      selectedGroupingMode="category"
      series={series}
      currencyCode="PHP"
    />,
  );
}

describe("DashboardCostMix (Zone B)", () => {
  beforeEach(() => {
    routerReplaceMock.mockClear();
  });

  it("collapses to top 5 named segments plus a neutral Other in the breakdown table (R5)", () => {
    renderCostMix();

    const table = screen.getByRole("table");
    const rows = within(table).getAllByRole("row");
    // header + 5 named + Other = 7
    expect(rows).toHaveLength(7);
    expect(within(table).getByText("Concrete")).toBeInTheDocument();
    expect(within(table).getByText("Other")).toBeInTheDocument();
    expect(within(table).queryByText("Permits")).not.toBeInTheDocument();
  });

  it("renders every segment with amount + share and wires the donut to the table via aria-describedby (R6)", () => {
    renderCostMix();

    const table = screen.getByRole("table");
    expect(within(table).getByText("₱200")).toBeInTheDocument();
    expect(within(table).getByText("33.3%")).toBeInTheDocument();

    const donut = screen.getByTestId("d3-donut-chart");
    const describedBy = donut.getAttribute("aria-describedby");
    expect(describedBy).toBeTruthy();
    expect(document.getElementById(describedBy as string)).toBe(table);
  });

  it("re-renders the table from the same series and syncs the grouping mode into the URL (R7)", () => {
    renderCostMix();

    // Default is Category.
    expect(screen.getByRole("button", { name: "Category" })).toHaveAttribute("aria-pressed", "true");
    expect(within(screen.getByRole("table")).getByText("Concrete")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Supplier" }));

    const table = screen.getByRole("table");
    expect(within(table).getByText("Acme Supply")).toBeInTheDocument();
    expect(within(table).queryByText("Concrete")).not.toBeInTheDocument();
    expect(routerReplaceMock).toHaveBeenCalledWith("/workshop/projects/proj-1?estimate=est-1&mode=supplier", {
      scroll: false,
    });
  });

  it("renders a single full-ring segment with no Other for a one-category estimate", () => {
    renderCostMix();
    fireEvent.click(screen.getByRole("button", { name: "Space" }));

    const table = screen.getByRole("table");
    expect(within(table).getAllByRole("row")).toHaveLength(2); // header + one segment
    expect(within(table).queryByText("Other")).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Open space" })).toHaveAttribute(
      "href",
      "/workshop/projects/proj-1/estimates/node-ground",
    );
  });

  it("degrades to a hyphen with no NaN shares for a zero-cost estimate", () => {
    const empty: ProjectChartEstimateSeries = {
      space: { total: 0, allBuckets: [] },
      category: { total: 0, allBuckets: [] },
      supplier: { total: 0, allBuckets: [] },
    };
    renderCostMix(empty);

    const table = screen.getByRole("table");
    expect(within(table).getByText("-")).toBeInTheDocument();
    expect(table.textContent).not.toContain("NaN");
  });

  it("renders selected bucket detail without exposing unsupported matching-row navigation", () => {
    renderCostMix();

    expect(screen.getByText("Selected category")).toBeInTheDocument();
    expect(screen.getAllByText("Concrete").length).toBeGreaterThan(1);
    expect(screen.getByRole("link", { name: "Open estimate" })).toHaveAttribute(
      "href",
      "/workshop/projects/proj-1/estimates/node-est-1",
    );
    expect(screen.getByRole("link", { name: "Compare breakdown" })).toHaveAttribute(
      "href",
      "/workshop/projects/proj-1/data?left=est-1&mode=category",
    );
    expect(screen.queryByText(/Open matching rows/i)).not.toBeInTheDocument();
  });
});
