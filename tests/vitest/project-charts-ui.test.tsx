import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";

import { ProjectChartsClient } from "@/components/workshop/project-charts/ProjectChartsClient";
import type { ProjectChartsData } from "@/lib/project-charts/types";

describe("ProjectChartsClient", () => {
  it("renders an empty state when a project has no estimates", () => {
    render(
      <ProjectChartsClient
        data={baseData({ estimateOptions: [] })}
        initialGroupingMode="space"
        initialLeftEstimateId={null}
        initialRightEstimateId={null}
      />,
    );

    expect(screen.getByText("No estimates yet")).toBeInTheDocument();
  });

  it("renders a single chart when only one estimate exists", () => {
    render(
      <ProjectChartsClient
        data={baseData({
          estimateOptions: [
            {
              id: "estimate-a",
              name: "Baseline",
              sheetCode: "EST-001",
              currencyCode: "PHP",
              updatedAt: null,
              rowCount: 0,
              totalCost: 0,
            },
          ],
        })}
        initialGroupingMode="space"
        initialLeftEstimateId="estimate-a"
        initialRightEstimateId="estimate-a"
      />,
    );

    expect(screen.getByLabelText("Chart 1 estimate")).toBeInTheDocument();
    expect(screen.getAllByTestId("project-chart-column")).toHaveLength(1);
  });

  it("starts with one chart column and no combined comparison table", async () => {
    render(<ProjectChartsClient data={chartData()} initialGroupingMode="space" initialLeftEstimateId="estimate-a" initialRightEstimateId="estimate-b" />);

    expect(screen.getByLabelText("Chart 1 estimate")).toBeInTheDocument();
    expect(screen.getByRole("group", { name: "Group chart costs by" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Space" })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByRole("button", { name: "Category" })).toHaveAttribute("aria-pressed", "false");
    expect(screen.getByRole("button", { name: "Suppliers" })).toHaveAttribute("aria-pressed", "false");
    expect(screen.getByRole("group", { name: "Chart visualization type" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Donut Chart" })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByRole("button", { name: "Bubble Chart" })).toHaveAttribute("aria-pressed", "false");
    expect(screen.queryByRole("button", { name: "Filter chart" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Group chart" })).not.toBeInTheDocument();
    expect(screen.getAllByTestId("project-chart-column")).toHaveLength(1);
    expect(await screen.findAllByTestId("d3-donut-chart")).toHaveLength(1);
    expect(screen.queryByTestId("d3-bubble-chart")).not.toBeInTheDocument();
    expect(screen.getByDisplayValue("Baseline")).toBeInTheDocument();
    expect(screen.queryByText("EST-001 · Baseline")).not.toBeInTheDocument();
    expect(screen.getByTestId("chart-1-total")).toHaveTextContent("₱225");
    expect(screen.getByRole("columnheader", { name: "Space" })).toBeInTheDocument();
    expect(screen.queryByRole("columnheader", { name: "Bucket" })).not.toBeInTheDocument();
    expect(screen.getByText("House")).toBeInTheDocument();
    expect(screen.getByText("Level 1")).toBeInTheDocument();
    expect(screen.getByTestId("donut-center-empty")).toBeInTheDocument();
    expect(screen.getAllByTestId("donut-callout").length).toBeGreaterThan(0);
    expect(document.querySelector('[data-testid="donut-callout"] path')?.getAttribute("d")).toMatch(/^M\s/);
    expect(screen.queryByTestId("donut-center-detail")).not.toBeInTheDocument();
    expect(screen.queryByText("Cost bucket deltas")).not.toBeInTheDocument();
    expect(screen.getAllByText("Ground Floor").length).toBeGreaterThan(0);
  });

  it("adds chart columns up to the available estimates and gives every column its own table", async () => {
    const user = userEvent.setup();
    render(<ProjectChartsClient data={chartData()} initialGroupingMode="space" initialLeftEstimateId="estimate-a" initialRightEstimateId="estimate-b" />);

    await user.click(screen.getByRole("button", { name: "Add chart" }));

    expect(screen.getAllByTestId("project-chart-column")).toHaveLength(2);
    expect(await screen.findAllByTestId("d3-donut-chart")).toHaveLength(2);
    expect(screen.getAllByRole("table", { name: /bucket table/i })).toHaveLength(2);
    expect(screen.getByRole("button", { name: "Add chart" })).toBeDisabled();
  });

  it("limits chart columns to three even when more estimates exist", async () => {
    const user = userEvent.setup();
    render(
      <ProjectChartsClient
        data={chartData({
          estimateOptions: [
            ...chartData().estimateOptions,
            { id: "estimate-c", name: "Option C", sheetCode: "EST-003", currencyCode: "PHP", updatedAt: null, rowCount: 0, totalCost: 0 },
            { id: "estimate-d", name: "Option D", sheetCode: "EST-004", currencyCode: "PHP", updatedAt: null, rowCount: 0, totalCost: 0 },
          ],
        })}
        initialGroupingMode="space"
        initialLeftEstimateId="estimate-a"
        initialRightEstimateId="estimate-b"
      />,
    );

    await user.click(screen.getByRole("button", { name: "Add chart" }));
    await user.click(screen.getByRole("button", { name: "Add chart" }));

    expect(screen.getAllByTestId("project-chart-column")).toHaveLength(3);
    expect(screen.getByRole("button", { name: "Add chart" })).toBeDisabled();
  });

  it("changes the comparison buckets when the grouping mode changes", async () => {
    const user = userEvent.setup();
    render(<ProjectChartsClient data={chartData()} initialGroupingMode="space" initialLeftEstimateId="estimate-a" initialRightEstimateId="estimate-b" />);

    await user.click(screen.getByRole("button", { name: "Suppliers" }));

    expect(screen.getByRole("button", { name: "Suppliers" })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getAllByText("BuildMart").length).toBeGreaterThan(0);
  });

  it("switches the chart visualization from donut to bubble chart", async () => {
    const user = userEvent.setup();
    render(<ProjectChartsClient data={chartData()} initialGroupingMode="space" initialLeftEstimateId="estimate-a" initialRightEstimateId="estimate-b" />);

    await user.click(screen.getByRole("button", { name: "Bubble Chart" }));

    expect(screen.getByRole("button", { name: "Bubble Chart" })).toHaveAttribute("aria-pressed", "true");
    expect(screen.queryByTestId("d3-donut-chart")).not.toBeInTheDocument();
    expect(await screen.findByTestId("d3-bubble-chart")).toBeInTheDocument();
    expect((await screen.findAllByTestId("bubble-node")).length).toBeGreaterThan(0);
  });
});

function chartData(overrides: Partial<ProjectChartsData> = {}): ProjectChartsData {
  return baseData({
    estimateOptions: [
      {
        id: "estimate-a",
        name: "Baseline",
        sheetCode: "EST-001",
        currencyCode: "PHP",
        updatedAt: null,
        rowCount: 1,
        totalCost: 225,
      },
      {
        id: "estimate-b",
        name: "Revision",
        sheetCode: "EST-002",
        currencyCode: "PHP",
        updatedAt: null,
        rowCount: 1,
        totalCost: 300,
      },
    ],
    rowFacts: [
      {
        id: "row-a",
        estimateId: "estimate-a",
        nodeId: "area-1",
        categoryNodeId: "subcategory-1",
        supplierId: "supplier-1",
        supplierName: null,
        sourceSupplierId: null,
        sourceSupplierName: null,
        quantity: 2,
        unitCost: 100,
        miscCost: 25,
      },
      {
        id: "row-b",
        estimateId: "estimate-b",
        nodeId: "area-2",
        categoryNodeId: "subcategory-1",
        supplierId: null,
        supplierName: null,
        sourceSupplierId: null,
        sourceSupplierName: null,
        quantity: 3,
        unitCost: 100,
        miscCost: 0,
      },
    ],
    nodeFacts: [
      { id: "group-house-a", estimateId: "estimate-a", parentId: null, kind: "Group", name: "House", sortOrder: 1 },
      { id: "group-level-a", estimateId: "estimate-a", parentId: "group-house-a", kind: "Group", name: "Level 1", sortOrder: 1 },
      { id: "area-1", estimateId: "estimate-a", parentId: "group-level-a", kind: "Area", name: "Ground Floor", sortOrder: 1 },
      { id: "group-house-b", estimateId: "estimate-b", parentId: null, kind: "Group", name: "House", sortOrder: 1 },
      { id: "group-level-b", estimateId: "estimate-b", parentId: "group-house-b", kind: "Group", name: "Level 2", sortOrder: 1 },
      { id: "area-2", estimateId: "estimate-b", parentId: "group-level-b", kind: "Area", name: "Second Floor", sortOrder: 1 },
    ],
    categoryNodeFacts: [
      { id: "category-1", parentId: null, nodeType: "category", label: "Masonry", sortOrder: 1 },
      { id: "subcategory-1", parentId: "category-1", nodeType: "subcategory", label: "CHB", sortOrder: 2 },
    ],
    supplierFacts: [{ id: "supplier-1", name: "BuildMart", normalizedName: "buildmart", sortOrder: 1 }],
    ...overrides,
  });
}

function baseData(overrides: Partial<ProjectChartsData>): ProjectChartsData {
  return {
    projectId: "project-1",
    projectName: "Sample Project",
    estimateOptions: [],
    rowFacts: [],
    nodeFacts: [],
    categoryNodeFacts: [],
    supplierFacts: [],
    loadMode: "all-estimates",
    requiresSelectedPair: false,
    rowLimit: 5000,
    estimateLimit: 20,
    ...overrides,
  };
}
