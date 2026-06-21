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

  it("keeps one h1 and exposes the comparison ledger as the primary table", () => {
    render(<ProjectDataClient summary={summary()} />);

    expect(screen.getAllByRole("heading", { level: 1 })).toHaveLength(1);
    expect(screen.getByRole("heading", { level: 1, name: "Cost comparison" })).toBeInTheDocument();

    expect(screen.getByRole("combobox", { name: "Baseline estimate sheet" })).toBeInTheDocument();
    expect(screen.getByRole("combobox", { name: "Add sheet to compare" })).toBeInTheDocument();
    expect(screen.getByRole("table", { name: "Cost comparison by category" })).toHaveAttribute(
      "id",
      "project-data-cost-comparison-table",
    );
  });

  it("surfaces per-sheet totals and composition in aligned columns", () => {
    render(<ProjectDataClient summary={summary()} />);

    const table = screen.getByRole("table", { name: "Cost comparison by category" });
    expect(table).toHaveTextContent("Original Estimate");
    expect(table).toHaveTextContent("Tender Estimate");
    expect(table).toHaveTextContent("Materials");
    expect(screen.getAllByText(/^Direct /)).toHaveLength(2);
    expect(screen.getAllByText(/^Misc /)).toHaveLength(2);
    expect(screen.getAllByText(/^Adj /)).toHaveLength(2);
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

    await user.click(screen.getByRole("combobox", { name: "Baseline estimate sheet" }));
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

    await user.click(screen.getByRole("combobox", { name: "Baseline estimate sheet" }));
    await user.click(screen.getByRole("option", { name: "Tender Estimate (EST-002)" }));

    expect(navigationMocks.replace).toHaveBeenCalledWith(
      "/workshop/projects/project-1/data?sheet=estimate-b&compare=estimate-a",
      { scroll: false },
    );
  });

  it("adds and removes comparison sheets through the board controls", async () => {
    const user = userEvent.setup();
    render(<ProjectDataClient summary={summary()} />);

    await user.click(screen.getByRole("combobox", { name: "Add sheet to compare" }));
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

  it("keeps the largest driver from the second comparison sheet visible", () => {
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

  it("uses the same hidden bucket set for Other totals and line counts", () => {
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

    const otherRow = screen.getByRole("row", { name: /Other/ });
    expect(within(otherRow).getAllByText("5 lines")).toHaveLength(2);
    expect(within(otherRow).queryByText("77 lines")).not.toBeInTheDocument();
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
