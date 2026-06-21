import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { CostAcrossSheetsSection } from "@/components/workshop/project-data/CostAcrossSheetsSection";
import type { ProjectChartBucket, ProjectChartEstimateSeries } from "@/lib/project-charts/types";
import type { ProjectDataEstimateSheet, ProjectDataRouteSummary } from "@/lib/repositories/project-data-repository";

describe("CostAcrossSheetsSection", () => {
  it("renders stacked cost mix rows ordered by total cost", () => {
    render(<CostAcrossSheetsSection summary={summary()} groupingMode="category" />);

    expect(screen.getByRole("heading", { level: 2, name: "Cost across sheets" })).toBeInTheDocument();
    expect(screen.getByRole("img", { name: "Cost across estimate sheets" })).toHaveAttribute(
      "aria-describedby",
      "project-data-across-sheets-table",
    );

    const table = screen.getByRole("table", { name: "Cost across sheets data" });
    expect(table).toHaveAttribute("id", "project-data-across-sheets-table");
    const rows = within(table).getAllByRole("row");
    expect(rows[1]).toHaveTextContent("Original Estimate");
    expect(rows[2]).toHaveTextContent("Tender Estimate");
    expect(within(table).getByRole("columnheader", { name: "Materials" })).toBeInTheDocument();
    expect(screen.getByLabelText("Cost group legend")).toHaveTextContent("Materials");
    expect(screen.getByText("Sheets are ordered by total cost, highest first.")).toBeInTheDocument();
  });

  it("switches to totals-only bars when a project has more than 20 sheets", () => {
    const manySheets = Array.from({ length: 21 }, (_, index) => estimateSheet(`estimate-${index}`, `Sheet ${index}`, 1000 - index));

    render(
      <CostAcrossSheetsSection
        summary={{
          ...summary({ estimateSheets: manySheets }),
          costAcrossSheetsMode: "totals-only",
          estimateSheets: manySheets,
          seriesByEstimateId: {},
        }}
        groupingMode="category"
      />,
    );

    expect(screen.getByText("This project has more than 20 estimate sheets, so the page shows totals-only bars.")).toBeInTheDocument();
    expect(screen.getByLabelText("Cost group legend")).toHaveTextContent("Total");
    expect(screen.getByRole("table", { name: "Cost across sheets data" })).toHaveTextContent("Sheet 0");
  });

  it("blocks cross-sheet comparison when sheets use mixed currencies", () => {
    render(
      <CostAcrossSheetsSection
        summary={{
          ...summary(),
          rollup: { kind: "mixed", currencyCodes: ["PHP", "USD"] },
        }}
        groupingMode="category"
      />,
    );

    expect(screen.getByText("Mixed currencies")).toBeInTheDocument();
    expect(screen.getByText("Sheets use different currencies, so cross-sheet cost comparison is unavailable.")).toBeInTheDocument();
    expect(screen.queryByRole("table", { name: "Cost across sheets data" })).not.toBeInTheDocument();
  });

  it("does not render when there is only one estimate sheet", () => {
    const { container } = render(
      <CostAcrossSheetsSection
        summary={summary({ estimateSheets: [estimateSheet("estimate-a", "Solo Estimate", 900)] })}
        groupingMode="category"
      />,
    );

    expect(container).toBeEmptyDOMElement();
  });
});

function summary(overrides: Partial<ProjectDataRouteSummary> = {}): ProjectDataRouteSummary {
  const estimateSheets = overrides.estimateSheets ?? [
    estimateSheet("estimate-a", "Original Estimate", 1800, "EST-001"),
    estimateSheet("estimate-b", "Tender Estimate", 1200, "EST-002"),
  ];
  return {
    projectId: "project-1",
    projectName: "Lewis Residence",
    estimateSheets,
    selectedEstimateId: estimateSheets[0]?.id ?? null,
    compareEstimateIds: estimateSheets.slice(1, 2).map((estimate) => estimate.id),
    selectedGroupingMode: "category",
    rollup: { kind: "single", currencyCode: "PHP", totalCost: estimateSheets.reduce((sum, estimate) => sum + estimate.totalCost, 0) },
    seriesByEstimateId: Object.fromEntries(
      estimateSheets.map((estimate) => [estimate.id, seriesForEstimate(estimate.id, estimate.totalCost)]),
    ),
    costAcrossSheetsMode: "stacked",
    didTruncate: false,
    rowLimit: 5000,
    ...overrides,
  };
}

function estimateSheet(id: string, name: string, totalCost: number, sheetCode: string | null = null): ProjectDataEstimateSheet {
  return {
    id,
    name,
    sheetCode,
    currencyCode: "PHP",
    updatedAt: null,
    rowCount: 2,
    totalCost,
  };
}

function seriesForEstimate(estimateId: string, totalCost: number): ProjectChartEstimateSeries {
  const material = bucket("materials", "Materials", Math.round(totalCost * 0.6), totalCost);
  const labor = bucket("labor", "Labor", totalCost - material.total, totalCost);
  const buckets = [material, labor];
  return {
    category: { total: totalCost, allBuckets: buckets },
    supplier: { total: totalCost, allBuckets: buckets },
    space: { total: totalCost, allBuckets: buckets },
  };
}

function bucket(id: string, label: string, total: number, baseTotal: number): ProjectChartBucket {
  return {
    id,
    label,
    total,
    share: baseTotal > 0 ? total / baseTotal : 0,
    rowCount: 1,
    color: id === "materials" ? "#38586F" : "#C9894B",
    sourceNodeId: null,
  };
}
