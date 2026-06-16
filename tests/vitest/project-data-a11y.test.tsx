import { render, screen } from "@testing-library/react";
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

  it("keeps one h1 and links the donut image to the breakdown table", () => {
    render(<ProjectDataClient summary={summary()} />);

    expect(screen.getAllByRole("heading", { level: 1 })).toHaveLength(1);
    expect(screen.getByRole("heading", { level: 1, name: "Cost breakdown" })).toBeInTheDocument();

    const donut = screen.getByRole("img", { name: "Total estimate" });
    expect(donut).toHaveAttribute("aria-describedby", "project-data-cost-breakdown-table");
    expect(screen.getByRole("table", { name: "Original Estimate cost groups by category" })).toHaveAttribute(
      "id",
      "project-data-cost-breakdown-table",
    );
  });

  it("canonicalizes legacy left/right params when grouping changes", async () => {
    const user = userEvent.setup();
    render(<ProjectDataClient summary={summary()} />);

    await user.click(screen.getByRole("button", { name: "Supplier" }));

    expect(navigationMocks.replace).toHaveBeenCalledWith(
      "/workshop/projects/project-1/data?sheet=estimate-a&mode=supplier",
      { scroll: false },
    );
  });

  it("overwrites stale sheet params with the selected fallback when grouping changes", async () => {
    const user = userEvent.setup();
    navigationMocks.searchParams = new URLSearchParams("sheet=deleted-estimate&left=legacy-a&right=legacy-b");
    render(<ProjectDataClient summary={summary()} />);

    await user.click(screen.getByRole("button", { name: "Supplier" }));

    expect(navigationMocks.replace).toHaveBeenCalledWith(
      "/workshop/projects/project-1/data?sheet=estimate-a&mode=supplier",
      { scroll: false },
    );
  });

  it("canonicalizes to the selected sheet when changing estimate sheets", async () => {
    const user = userEvent.setup();
    render(<ProjectDataClient summary={summary()} />);

    await user.click(screen.getByRole("combobox", { name: "Estimate sheet" }));
    await user.click(screen.getByRole("option", { name: "Tender Estimate (EST-002)" }));

    expect(navigationMocks.replace).toHaveBeenCalledWith(
      "/workshop/projects/project-1/data?sheet=estimate-b",
      { scroll: false },
    );
  });
});

function summary(): ProjectDataRouteSummary {
  const estimateSheets = [
    estimateSheet("estimate-a", "Original Estimate", 1800, "EST-001"),
    estimateSheet("estimate-b", "Tender Estimate", 1200, "EST-002"),
  ];
  return {
    projectId: "project-1",
    projectName: "Lewis Residence",
    estimateSheets,
    selectedEstimateId: "estimate-a",
    selectedGroupingMode: "category",
    rollup: { kind: "single", currencyCode: "PHP", totalCost: 3000 },
    seriesByEstimateId: {
      "estimate-a": seriesForEstimate(1800),
      "estimate-b": seriesForEstimate(1200),
    },
    costAcrossSheetsMode: "stacked",
    didTruncate: false,
    rowLimit: 5000,
  };
}

function estimateSheet(id: string, name: string, totalCost: number, sheetCode: string): ProjectDataEstimateSheet {
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

function seriesForEstimate(totalCost: number): ProjectChartEstimateSeries {
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
