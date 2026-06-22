import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";

import { ProjectChartsClient } from "@/components/workshop/project-charts/ProjectChartsClient";
import { buildSeriesByEstimate } from "@/lib/project-charts/project-comparison-view";
import type {
  ProjectChartCategoryNodeFact,
  ProjectChartEstimateOption,
  ProjectChartNodeFact,
  ProjectChartRowFact,
  ProjectChartSupplierFact,
  ProjectChartsData,
} from "@/lib/project-charts/types";

type RawFacts = {
  estimateOptions?: ProjectChartEstimateOption[];
  rowFacts?: ProjectChartRowFact[];
  nodeFacts?: ProjectChartNodeFact[];
  categoryNodeFacts?: ProjectChartCategoryNodeFact[];
  supplierFacts?: ProjectChartSupplierFact[];
  requiresSelectedPair?: boolean;
  didTruncate?: boolean;
};

// These tests were inverted in the charts redesign (`09` P-1.5/P-1.6). The old
// assertions (one independent donut, no combined deltas, a bubble toggle) are
// gone; the page is now a comparison surface driven by the comparison view-model.

describe("ProjectChartsClient — cost comparison", () => {
  it("renders the comparison shell when a project has no estimates", () => {
    render(
      <ProjectChartsClient
        data={baseData({ estimateOptions: [] })}
        initialGroupingMode="space"
        initialLeftEstimateId={null}
        initialRightEstimateId={null}
      />,
    );

    expect(screen.queryByText("No estimates yet")).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: /create estimate/i })).not.toBeInTheDocument();
    expect(screen.getByTestId("project-charts-controls")).toBeInTheDocument();
    expect(screen.getByRole("table", { name: "Cost comparison detail" })).toBeInTheDocument();
    expect(screen.getByText("No cost rows yet.")).toBeInTheDocument();
  });

  it("shows a cost-comparison header, the auto insight sentence, and the variance spine by default", () => {
    render(
      <ProjectChartsClient
        data={chartData()}
        initialGroupingMode="space"
        initialLeftEstimateId="estimate-a"
        initialRightEstimateId="estimate-b"
      />,
    );

    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("Cost comparison");
    expect(screen.getByTestId("project-charts-insight")).toBeInTheDocument();
    // Insight names the comparand vs baseline and the direction.
    expect(screen.getByTestId("project-charts-insight")).toHaveTextContent(/Revision is .* than Baseline/);

    // Variance spine is the default primary view, with one row per bucket.
    expect(screen.getByTestId("project-variance-spine")).toBeInTheDocument();
    expect(screen.getAllByTestId("variance-row").length).toBeGreaterThan(0);

    // Comparison detail table carries Δ columns and is the chart's described-by target.
    const table = screen.getByRole("table", { name: "Cost comparison detail" });
    expect(table).toHaveAttribute("id", "project-charts-comparison-table");
    expect(screen.getByTestId("project-variance-spine")).toHaveAttribute(
      "aria-describedby",
      "project-charts-comparison-table",
    );
    expect(screen.getByRole("columnheader", { name: "Δ" })).toBeInTheDocument();

    // No legacy independent donut on first paint and no bubble chart at all.
    expect(screen.queryByTestId("d3-donut-chart")).not.toBeInTheDocument();
    expect(screen.queryByTestId("d3-bubble-chart")).not.toBeInTheDocument();
  });

  it("re-buckets when the Break down by control changes", async () => {
    const user = userEvent.setup();
    render(
      <ProjectChartsClient
        data={chartData()}
        initialGroupingMode="space"
        initialLeftEstimateId="estimate-a"
        initialRightEstimateId="estimate-b"
      />,
    );

    expect(screen.getByRole("button", { name: "Space" })).toHaveAttribute("aria-pressed", "true");
    await user.click(screen.getByRole("button", { name: "Supplier" }));
    expect(screen.getByRole("button", { name: "Supplier" })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getAllByText("BuildMart").length).toBeGreaterThan(0);
  });

  it("adds a comparand estimate up to three and exposes a baseline selector", async () => {
    const user = userEvent.setup();
    render(
      <ProjectChartsClient
        data={chartData({
          estimateOptions: [
            ...chartData().estimateOptions,
            { id: "estimate-c", name: "Option C", sheetCode: "EST-003", currencyCode: "PHP", updatedAt: null, rowCount: 0, totalCost: 0 },
          ],
        })}
        initialGroupingMode="space"
        initialLeftEstimateId="estimate-a"
        initialRightEstimateId="estimate-b"
      />,
    );

    expect(screen.getByLabelText("Baseline estimate")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: /add estimate/i }));
    // Three estimates selected → "Add estimate" gone (max reached) and three estimate columns in the table.
    expect(screen.queryByRole("button", { name: /add estimate/i })).not.toBeInTheDocument();
  });

  it("switches to the Share view and lazy-loads the demoted donut", async () => {
    const user = userEvent.setup();
    render(
      <ProjectChartsClient
        data={chartData()}
        initialGroupingMode="space"
        initialLeftEstimateId="estimate-a"
        initialRightEstimateId="estimate-b"
      />,
    );

    await user.click(screen.getByRole("button", { name: "Share" }));
    expect(await screen.findByTestId("d3-donut-chart")).toBeInTheDocument();
    expect(screen.getByTestId("project-share-view")).toBeInTheDocument();
  });

  it("hides comparison controls for a single estimate and prompts to add a second", () => {
    render(
      <ProjectChartsClient
        data={chartData({
          estimateOptions: [
            { id: "estimate-a", name: "Baseline", sheetCode: "EST-001", currencyCode: "PHP", updatedAt: null, rowCount: 1, totalCost: 225 },
          ],
          rowFacts: [
            { id: "row-a", estimateId: "estimate-a", nodeId: "area-1", categoryNodeId: "subcategory-1", supplierId: "supplier-1", supplierName: null, sourceSupplierId: null, sourceSupplierName: null, quantity: 2, unitCost: 100, miscCost: 25 },
          ],
        })}
        initialGroupingMode="space"
        initialLeftEstimateId="estimate-a"
        initialRightEstimateId="estimate-a"
      />,
    );

    expect(screen.queryByLabelText("Baseline estimate")).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Variance" })).not.toBeInTheDocument();
    expect(screen.getByText("Add a second estimate to compare costs")).toBeInTheDocument();
    expect(screen.getByTestId("project-composition-bars")).toBeInTheDocument();
  });
});

function chartData(overrides: RawFacts = {}): ProjectChartsData {
  return baseData({
    estimateOptions: [
      { id: "estimate-a", name: "Baseline", sheetCode: "EST-001", currencyCode: "PHP", updatedAt: null, rowCount: 1, totalCost: 225 },
      { id: "estimate-b", name: "Revision", sheetCode: "EST-002", currencyCode: "PHP", updatedAt: null, rowCount: 1, totalCost: 300 },
    ],
    rowFacts: [
      { id: "row-a", estimateId: "estimate-a", nodeId: "area-1", categoryNodeId: "subcategory-1", supplierId: "supplier-1", supplierName: null, sourceSupplierId: null, sourceSupplierName: null, quantity: 2, unitCost: 100, miscCost: 25 },
      { id: "row-b", estimateId: "estimate-b", nodeId: "area-2", categoryNodeId: "subcategory-1", supplierId: null, supplierName: null, sourceSupplierId: null, sourceSupplierName: null, quantity: 3, unitCost: 100, miscCost: 0 },
    ],
    nodeFacts: [
      { id: "area-1", estimateId: "estimate-a", parentId: null, kind: "Area", name: "Ground Floor", sortOrder: 1 },
      { id: "area-2", estimateId: "estimate-b", parentId: null, kind: "Area", name: "Second Floor", sortOrder: 1 },
    ],
    categoryNodeFacts: [
      { id: "category-1", parentId: null, nodeType: "category", label: "Masonry", sortOrder: 1 },
      { id: "subcategory-1", parentId: "category-1", nodeType: "subcategory", label: "CHB", sortOrder: 2 },
    ],
    supplierFacts: [{ id: "supplier-1", name: "BuildMart", normalizedName: "buildmart", sortOrder: 1 }],
    ...overrides,
  });
}

// Build the new pre-bucketed payload from authored raw facts (mirrors what the
// repository now does server-side).
function baseData(raw: RawFacts): ProjectChartsData {
  const estimateOptions = raw.estimateOptions ?? [];
  const seriesByEstimateId = buildSeriesByEstimate(
    {
      estimates: estimateOptions,
      rows: raw.rowFacts ?? [],
      nodes: raw.nodeFacts ?? [],
      categoryNodes: raw.categoryNodeFacts ?? [],
      suppliers: raw.supplierFacts ?? [],
    },
    estimateOptions.map((estimate) => estimate.id),
  );
  return {
    projectId: "project-1",
    projectName: "Lewis Residence",
    estimateOptions,
    seriesByEstimateId,
    loadMode: "all-estimates",
    requiresSelectedPair: raw.requiresSelectedPair ?? false,
    didTruncate: raw.didTruncate ?? false,
    rowLimit: 5000,
    estimateLimit: 20,
  };
}
