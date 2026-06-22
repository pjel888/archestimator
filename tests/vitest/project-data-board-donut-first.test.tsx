import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { CostComparisonBoard } from "@/components/workshop/project-data/CostComparisonBoard";
import type { ProjectChartBucket, ProjectChartEstimateSeries } from "@/lib/project-charts/types";
import type { ProjectDataEstimateSheet, ProjectDataRouteSummary } from "@/lib/repositories/project-data-repository";

describe("CostComparisonBoard donut-first layout", () => {
  it("renders one donut and one breakdown list for each displayed estimate", () => {
    render(<CostComparisonBoard {...boardProps()} />);

    expect(screen.getAllByTestId("d3-donut-chart")).toHaveLength(2);
    expect(screen.getByRole("list", { name: "Original Estimate cost breakdown by category" })).toBeInTheDocument();
    expect(screen.getByRole("list", { name: "Tender Estimate cost breakdown by category" })).toBeInTheDocument();
  });

  it("does not render the legacy shared comparison table", () => {
    render(<CostComparisonBoard {...boardProps()} />);

    expect(screen.queryByRole("table", { name: /cost comparison/i })).not.toBeInTheDocument();
    expect(document.querySelector("#project-data-cost-comparison-table")).not.toBeInTheDocument();
  });

  it("appends a comparison column from the plus tile", async () => {
    const user = userEvent.setup();
    const onCompareEstimateIdsChange = vi.fn();
    render(<CostComparisonBoard {...boardProps({ onCompareEstimateIdsChange })} />);

    await user.click(screen.getByRole("combobox", { name: "Add estimate to compare" }));
    await user.click(screen.getByRole("option", { name: "Value Engineering (EST-003)" }));

    expect(onCompareEstimateIdsChange).toHaveBeenCalledWith(["estimate-b", "estimate-c"]);
  });

  it("removes a non-baseline estimate column through the column control", async () => {
    const user = userEvent.setup();
    const onCompareEstimateIdsChange = vi.fn();
    render(<CostComparisonBoard {...boardProps({ onCompareEstimateIdsChange })} />);

    await user.click(screen.getByRole("button", { name: "Remove Tender Estimate from comparison" }));

    expect(onCompareEstimateIdsChange).toHaveBeenCalledWith([]);
  });

  it("shares active bucket changes across columns", () => {
    const onActiveBucketChange = vi.fn();
    render(<CostComparisonBoard {...boardProps({ onActiveBucketChange })} />);

    fireEvent.focus(screen.getAllByText("Materials")[0].closest("li")!);

    expect(onActiveBucketChange).toHaveBeenCalledWith("materials");
  });
});

function boardProps(overrides: Partial<Parameters<typeof CostComparisonBoard>[0]> = {}): Parameters<typeof CostComparisonBoard>[0] {
  return {
    summary: summary(),
    baselineEstimateId: "estimate-a",
    compareEstimateIds: ["estimate-b"],
    groupingMode: "category",
    activeBucketId: null,
    onBaselineChange: vi.fn(),
    onCompareEstimateIdsChange: vi.fn(),
    onGroupingModeChange: vi.fn(),
    onActiveBucketChange: vi.fn(),
    ...overrides,
  };
}

function summary(overrides: Partial<ProjectDataRouteSummary> = {}): ProjectDataRouteSummary {
  const estimateSheets = overrides.estimateSheets ?? [
    estimateSheet("estimate-a", "Original Estimate", 1800, "EST-001"),
    estimateSheet("estimate-b", "Tender Estimate", 1200, "EST-002"),
    estimateSheet("estimate-c", "Value Engineering", 900, "EST-003"),
  ];
  const seriesByEstimateId =
    overrides.seriesByEstimateId ??
    Object.fromEntries(estimateSheets.map((estimate) => [estimate.id, seriesForEstimate(estimate.totalCost)]));
  return {
    projectId: "project-1",
    projectName: "Lewis Residence",
    estimateSheets,
    selectedEstimateId: "estimate-a",
    compareEstimateIds: ["estimate-b"],
    selectedGroupingMode: "category",
    rollup: { kind: "single", currencyCode: "PHP", totalCost: estimateSheets.reduce((sum, estimate) => sum + estimate.totalCost, 0) },
    seriesByEstimateId,
    costAcrossSheetsMode: "stacked",
    didTruncate: false,
    rowLimit: 5000,
    ...overrides,
    estimateSheets,
    seriesByEstimateId,
  };
}

function estimateSheet(
  id: string,
  name: string,
  totalCost: number,
  sheetCode: string,
  currencyCode = "PHP",
): ProjectDataEstimateSheet {
  return {
    id,
    name,
    sheetCode,
    currencyCode,
    updatedAt: null,
    rowCount: 2,
    totalCost,
  };
}

function seriesForEstimate(totalCost: number): ProjectChartEstimateSeries {
  const material = bucket("materials", "Materials", Math.round(totalCost * 0.6), totalCost);
  const labor = bucket("labor", "Labor", totalCost - material.total, totalCost);
  const buckets = [material, labor];
  return {
    composition: {
      baseTotal: totalCost * (8 / 9),
      miscTotal: totalCost * (1 / 18),
      adjustmentTotal: totalCost * (1 / 18),
      grandTotal: totalCost,
    },
    category: { total: totalCost, allBuckets: buckets },
    supplier: { total: totalCost, allBuckets: buckets },
    space: { total: totalCost, allBuckets: buckets },
  } as ProjectChartEstimateSeries;
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
