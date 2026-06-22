import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { ProjectDataClient } from "@/components/workshop/project-data/ProjectDataClient";
import type { ProjectChartBucket, ProjectChartEstimateSeries } from "@/lib/project-charts/types";
import type { ProjectDataEstimateSheet, ProjectDataRouteSummary } from "@/lib/repositories/project-data-repository";

const navigationMocks = vi.hoisted(() => ({
  replace: vi.fn(),
  searchParams: new URLSearchParams("left=legacy-a&right=legacy-b"),
}));

vi.mock("next/navigation", () => ({
  usePathname: () => "/workshop/projects/project-1/data",
  useRouter: () => ({ replace: navigationMocks.replace }),
  useSearchParams: () => navigationMocks.searchParams,
}));

describe("ProjectDataClient accessibility and URL state", () => {
  beforeEach(() => {
    navigationMocks.replace.mockClear();
    navigationMocks.searchParams = new URLSearchParams("left=legacy-a&right=legacy-b");
  });

  it("keeps one h1 named Cost breakdown", () => {
    render(<ProjectDataClient summary={summary()} />);

    expect(screen.getAllByRole("heading", { level: 1 })).toHaveLength(1);
    expect(screen.getByRole("heading", { level: 1, name: "Cost breakdown" })).toBeInTheDocument();
  });

  it("removes the shared cost comparison table", () => {
    render(<ProjectDataClient summary={summary()} />);

    expect(screen.queryByRole("table", { name: /cost comparison/i })).not.toBeInTheDocument();
    expect(document.querySelector("#project-data-cost-comparison-table")).not.toBeInTheDocument();
  });

  it("renders one donut chart per selected estimate column", () => {
    render(<ProjectDataClient summary={summary()} />);

    expect(screen.getAllByTestId("d3-donut-chart")).toHaveLength(2);
  });

  it("describes each donut by its own in-column breakdown list", () => {
    render(<ProjectDataClient summary={summary()} />);

    const charts = screen.getAllByTestId("d3-donut-chart");
    expect(charts.map((chart) => chart.getAttribute("aria-describedby"))).toEqual([
      "estimate-estimate-a-breakdown",
      "estimate-estimate-b-breakdown",
    ]);
    expect(document.getElementById("estimate-estimate-a-breakdown")).toBeInTheDocument();
    expect(document.getElementById("estimate-estimate-b-breakdown")).toBeInTheDocument();
  });

  it("exposes a plus tile for adding the next estimate column", () => {
    render(<ProjectDataClient summary={summary()} />);

    expect(screen.getByRole("combobox", { name: "Add estimate to compare" })).toBeInTheDocument();
    expect(screen.queryByRole("combobox", { name: "Add sheet to compare" })).not.toBeInTheDocument();
  });

  it("exposes per-column sheet swap controls instead of a global baseline picker", () => {
    render(<ProjectDataClient summary={summary()} />);

    expect(screen.queryByRole("combobox", { name: "Baseline estimate sheet" })).not.toBeInTheDocument();
    expect(screen.getByRole("combobox", { name: "Change Original Estimate sheet" })).toBeInTheDocument();
  });

  it("canonicalizes legacy left/right params when grouping changes", async () => {
    const user = userEvent.setup();
    render(<ProjectDataClient summary={summary()} />);

    await user.click(screen.getByRole("button", { name: "Supplier" }));

    expect(navigationMocks.replace).toHaveBeenCalledWith(
      "/workshop/projects/project-1/data?sheet=estimate-a&compare=estimate-b&mode=supplier",
      { scroll: false },
    );
  });

  it("overwrites stale sheet params with the selected fallback when grouping changes", async () => {
    const user = userEvent.setup();
    navigationMocks.searchParams = new URLSearchParams("sheet=deleted-estimate&left=legacy-a&right=legacy-b");
    render(<ProjectDataClient summary={summary()} />);

    await user.click(screen.getByRole("button", { name: "Supplier" }));

    expect(navigationMocks.replace).toHaveBeenCalledWith(
      "/workshop/projects/project-1/data?sheet=estimate-a&compare=estimate-b&mode=supplier",
      { scroll: false },
    );
  });

  it("keeps the prior baseline as the first comparand when changing baseline sheets", async () => {
    const user = userEvent.setup();
    render(<ProjectDataClient summary={summary()} />);

    await user.click(screen.getByRole("combobox", { name: "Change Original Estimate sheet" }));
    await user.click(screen.getByRole("option", { name: "Tender Estimate (EST-002)" }));

    expect(navigationMocks.replace).toHaveBeenCalledWith(
      "/workshop/projects/project-1/data?sheet=estimate-b&compare=estimate-a",
      { scroll: false },
    );
  });

  it("drops invalid stale grouping params when estimate interaction rewrites the URL", async () => {
    const user = userEvent.setup();
    navigationMocks.searchParams = new URLSearchParams("sheet=estimate-a&compare=estimate-b&mode=timeline");
    render(<ProjectDataClient summary={summary()} />);

    await user.click(screen.getByRole("combobox", { name: "Change Original Estimate sheet" }));
    await user.click(screen.getByRole("option", { name: "Tender Estimate (EST-002)" }));

    expect(navigationMocks.replace).toHaveBeenCalledWith(
      "/workshop/projects/project-1/data?sheet=estimate-b&compare=estimate-a",
      { scroll: false },
    );
  });

  it("adds and removes comparison sheets through the board controls", async () => {
    const user = userEvent.setup();
    render(<ProjectDataClient summary={summary()} />);

    await user.click(screen.getByRole("combobox", { name: "Add estimate to compare" }));
    await user.click(screen.getByRole("option", { name: "Value Engineering (EST-003)" }));

    expect(navigationMocks.replace).toHaveBeenLastCalledWith(
      "/workshop/projects/project-1/data?sheet=estimate-a&compare=estimate-b%2Cestimate-c",
      { scroll: false },
    );

    await user.click(screen.getByRole("button", { name: "Remove Tender Estimate from comparison" }));

    expect(navigationMocks.replace).toHaveBeenLastCalledWith(
      "/workshop/projects/project-1/data?sheet=estimate-a&compare=estimate-c",
      { scroll: false },
    );
  });

  it("only suppresses deltas when the selected board sheets use mixed currencies", () => {
    const estimateSheets = [
      estimateSheet("estimate-a", "Original Estimate", 1800, "EST-001"),
      estimateSheet("estimate-b", "Tender Estimate", 1200, "EST-002"),
      estimateSheet("estimate-c", "Imported USD Sheet", 900, "EST-003", "USD"),
    ];

    render(
      <ProjectDataClient
        summary={summary({
          estimateSheets,
          rollup: { kind: "mixed", currencyCodes: ["PHP", "USD"] },
        })}
      />,
    );

    expect(screen.queryByText("Mixed currencies")).not.toBeInTheDocument();
    expect(screen.getAllByLabelText(/versus baseline/).length).toBeGreaterThan(0);
  });

  it("warns and suppresses deltas when a selected comparison sheet uses another currency", () => {
    const estimateSheets = [
      estimateSheet("estimate-a", "Original Estimate", 1800, "EST-001"),
      estimateSheet("estimate-b", "Tender Estimate", 1200, "EST-002"),
      estimateSheet("estimate-c", "Imported USD Sheet", 900, "EST-003", "USD"),
    ];

    render(
      <ProjectDataClient
        summary={summary({
          estimateSheets,
          compareEstimateIds: ["estimate-c"],
          rollup: { kind: "mixed", currencyCodes: ["PHP", "USD"] },
        })}
      />,
    );

    expect(screen.getByText("Mixed currencies")).toBeInTheDocument();
    expect(screen.queryByLabelText(/versus baseline/)).not.toBeInTheDocument();
  });

  it("keeps the largest driver from the second comparison sheet visible in its breakdown list", () => {
    const estimateSheets = [
      estimateSheet("estimate-a", "Original Estimate", 1000, "EST-001"),
      estimateSheet("estimate-b", "Tender Estimate", 1000, "EST-002"),
      estimateSheet("estimate-c", "Value Engineering", 2000, "EST-003"),
    ];
    const seriesByEstimateId = {
      "estimate-a": seriesFromBuckets(1000, comparisonRankingBuckets("estimate-a")),
      "estimate-b": seriesFromBuckets(1000, comparisonRankingBuckets("estimate-b")),
      "estimate-c": seriesFromBuckets(2000, comparisonRankingBuckets("estimate-c")),
    };

    render(
      <ProjectDataClient
        summary={summary({
          estimateSheets,
          compareEstimateIds: ["estimate-b", "estimate-c"],
          seriesByEstimateId,
        })}
      />,
    );

    expect(screen.getByText("Major C Delta")).toBeInTheDocument();
  });

  it("uses the same hidden bucket set for Other list totals and line counts", () => {
    const estimateSheets = [
      estimateSheet("estimate-a", "Original Estimate", 901, "EST-001"),
      estimateSheet("estimate-b", "Tender Estimate", 1901, "EST-002"),
    ];
    const seriesByEstimateId = {
      "estimate-a": seriesFromBuckets(901, otherLineCountBuckets("estimate-a")),
      "estimate-b": seriesFromBuckets(1901, otherLineCountBuckets("estimate-b")),
    };

    render(
      <ProjectDataClient
        summary={summary({
          estimateSheets,
          seriesByEstimateId,
        })}
      />,
    );

    const otherItems = screen.getAllByText("Other").map((label) => label.closest("li")!);
    expect(otherItems).toHaveLength(2);
    for (const item of otherItems) {
      expect(within(item).getByText("6 lines")).toBeInTheDocument();
      expect(within(item).queryByText("77 lines")).not.toBeInTheDocument();
    }
  });
});

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

function seriesFromBuckets(totalCost: number, buckets: ProjectChartBucket[]): ProjectChartEstimateSeries {
  return {
    composition: {
      baseTotal: totalCost,
      miscTotal: 0,
      adjustmentTotal: 0,
      grandTotal: totalCost,
    },
    category: { total: totalCost, allBuckets: buckets },
    supplier: { total: totalCost, allBuckets: buckets },
    space: { total: totalCost, allBuckets: buckets },
  } as ProjectChartEstimateSeries;
}

function comparisonRankingBuckets(estimateId: string): ProjectChartBucket[] {
  const majorTotal = estimateId === "estimate-c" ? 1000 : 0;
  return [
    ...Array.from({ length: 9 }, (_, index) =>
      bucketWithRows(`stable-${index}`, `Stable ${index + 1}`, 100 - index, 1000, 1),
    ),
    bucketWithRows("major-c", "Major C Delta", majorTotal, estimateId === "estimate-c" ? 2000 : 1000, 1),
  ];
}

function otherLineCountBuckets(estimateId: string): ProjectChartBucket[] {
  const highDeltaTotal = estimateId === "estimate-b" ? 1000 : 0;
  return [
    bucketWithRows("low-tail", "Z Low Tail", 1, estimateId === "estimate-b" ? 1901 : 901, 5),
    ...Array.from({ length: 8 }, (_, index) =>
      bucketWithRows(`stable-${index}`, `Stable ${index + 1}`, 100 - index, estimateId === "estimate-b" ? 1901 : 901, 1),
    ),
    bucketWithRows("high-delta", "High Delta", highDeltaTotal, estimateId === "estimate-b" ? 1901 : 901, 77),
  ];
}

function bucketWithRows(id: string, label: string, total: number, baseTotal: number, rowCount: number): ProjectChartBucket {
  return {
    ...bucket(id, label, total, baseTotal),
    rowCount,
  };
}
