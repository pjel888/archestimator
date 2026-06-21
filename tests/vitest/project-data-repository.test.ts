import { beforeEach, describe, expect, it, vi } from "vitest";

import type { ProjectChartEstimateSeries } from "@/lib/project-charts/types";

const repositoryMocks = vi.hoisted(() => ({
  listProjectEstimates: vi.fn(),
  getProjectChartsData: vi.fn(),
}));

vi.mock("@/lib/repositories/workspace-repository", () => ({
  listProjectEstimates: repositoryMocks.listProjectEstimates,
}));

vi.mock("@/lib/repositories/project-charts-repository", () => ({
  getProjectChartsData: repositoryMocks.getProjectChartsData,
}));

describe("getProjectDataRouteSummary", () => {
  beforeEach(() => {
    repositoryMocks.listProjectEstimates.mockReset();
    repositoryMocks.getProjectChartsData.mockReset().mockResolvedValue({
      seriesByEstimateId: {},
      didTruncate: false,
      rowLimit: 5000,
    });
  });

  it("returns null when the project is not found", async () => {
    repositoryMocks.listProjectEstimates.mockResolvedValue({
      project: null,
      estimates: [],
      rowCountByEstimateId: new Map(),
      totalCostByEstimateId: new Map(),
    });

    const { getProjectDataRouteSummary } = await import("@/lib/repositories/project-data-repository");

    await expect(getProjectDataRouteSummary("missing-project")).resolves.toBeNull();
    expect(repositoryMocks.getProjectChartsData).not.toHaveBeenCalled();
  });

  it("falls back from a foreign selected estimate to the first project sheet", async () => {
    repositoryMocks.listProjectEstimates.mockResolvedValue(summaryResult([
      estimate("estimate-a", "Original Estimate"),
      estimate("estimate-b", "Tender Estimate"),
    ]));

    const { getProjectDataRouteSummary } = await import("@/lib/repositories/project-data-repository");
    const summary = await getProjectDataRouteSummary("project-1", { selectedEstimateId: "foreign-estimate" });

    expect(summary?.selectedEstimateId).toBe("estimate-a");
    expect(summary?.compareEstimateIds).toEqual(["estimate-b"]);
    expect(repositoryMocks.getProjectChartsData).toHaveBeenCalledWith("project-1", {
      selectedEstimateIds: ["estimate-a", "estimate-b"],
    });
  });

  it("honors an explicit no-compare route preference", async () => {
    repositoryMocks.listProjectEstimates.mockResolvedValue(summaryResult([
      estimate("estimate-a", "Original Estimate"),
      estimate("estimate-b", "Tender Estimate"),
    ]));

    const { getProjectDataRouteSummary } = await import("@/lib/repositories/project-data-repository");
    const summary = await getProjectDataRouteSummary("project-1", { selectedEstimateId: "estimate-a", compareEstimateIds: [] });

    expect(summary?.compareEstimateIds).toEqual([]);
    expect(repositoryMocks.getProjectChartsData).toHaveBeenCalledWith("project-1", {
      selectedEstimateIds: ["estimate-a"],
    });
  });

  it("loads at most two requested comparison sheets for the selected board", async () => {
    repositoryMocks.listProjectEstimates.mockResolvedValue(summaryResult([
      estimate("estimate-a", "Original Estimate"),
      estimate("estimate-b", "Tender Estimate"),
      estimate("estimate-c", "Value Engineering"),
      estimate("estimate-d", "Foreign Sheet"),
    ]));

    const { getProjectDataRouteSummary } = await import("@/lib/repositories/project-data-repository");
    const summary = await getProjectDataRouteSummary("project-1", {
      selectedEstimateId: "estimate-a",
      compareEstimateIds: ["estimate-b", "estimate-c", "estimate-d"],
    });

    expect(summary?.compareEstimateIds).toEqual(["estimate-b", "estimate-c"]);
    expect(repositoryMocks.getProjectChartsData).toHaveBeenCalledWith("project-1", {
      selectedEstimateIds: ["estimate-a", "estimate-b", "estimate-c"],
    });
  });

  it("computes mixed-currency rollups and totals-only mode at the repository boundary", async () => {
    const estimates = Array.from({ length: 21 }, (_, index) =>
      estimate(`estimate-${index}`, `Sheet ${index}`, index === 20 ? "USD" : "PHP"),
    );
    repositoryMocks.listProjectEstimates.mockResolvedValue(summaryResult(estimates));

    const { getProjectDataRouteSummary } = await import("@/lib/repositories/project-data-repository");
    const summary = await getProjectDataRouteSummary("project-1", { selectedEstimateId: "estimate-20", groupingMode: "supplier" });

    expect(summary?.selectedEstimateId).toBe("estimate-20");
    expect(summary?.compareEstimateIds).toEqual(["estimate-0"]);
    expect(summary?.selectedGroupingMode).toBe("supplier");
    expect(summary?.costAcrossSheetsMode).toBe("totals-only");
    expect(summary?.rollup).toEqual({ kind: "mixed", currencyCodes: ["PHP", "USD"] });
  });

  it("returns single-currency rollups and the pre-bucketed series without raw row facts", async () => {
    repositoryMocks.listProjectEstimates.mockResolvedValue(summaryResult([
      estimate("estimate-a", "Original Estimate"),
      estimate("estimate-b", "Tender Estimate"),
    ]));
    repositoryMocks.getProjectChartsData.mockResolvedValue({
      seriesByEstimateId: { "estimate-a": series(1800) },
      didTruncate: true,
      rowLimit: 12,
    });

    const { getProjectDataRouteSummary } = await import("@/lib/repositories/project-data-repository");
    const summary = await getProjectDataRouteSummary("project-1", { selectedEstimateId: "estimate-a" });

    expect(summary).toMatchObject({
      selectedEstimateId: "estimate-a",
      compareEstimateIds: ["estimate-b"],
      costAcrossSheetsMode: "stacked",
      didTruncate: true,
      rowLimit: 12,
      rollup: { kind: "single", currencyCode: "PHP", totalCost: 3000 },
    });
    expect(summary).not.toHaveProperty("rows");
    expect(summary?.seriesByEstimateId["estimate-a"]?.category.allBuckets[0]?.label).toBe("Materials");
  });
});

function summaryResult(estimates: ReturnType<typeof estimate>[]) {
  return {
    project: {
      id: "project-1",
      name: "Lewis Residence",
      currency_code: "PHP",
    },
    estimates,
    rowCountByEstimateId: new Map(estimates.map((item) => [item.id, 2])),
    totalCostByEstimateId: new Map(estimates.map((item, index) => [item.id, index === 0 ? 1800 : 1200])),
  };
}

function estimate(id: string, name: string, currencyCode = "PHP") {
  return {
    id,
    name,
    sheet_code: id.toUpperCase(),
    currency_code: currencyCode,
    updated_at: null,
  };
}

function series(total: number): ProjectChartEstimateSeries {
  return {
    category: { total, allBuckets: [{ id: "materials", label: "Materials", total, share: 1, rowCount: 2, color: "#38586F" }] },
    supplier: { total, allBuckets: [{ id: "supplier", label: "Supplier", total, share: 1, rowCount: 2, color: "#C9894B" }] },
    space: { total, allBuckets: [{ id: "space", label: "Space", total, share: 1, rowCount: 2, color: "#66895A" }] },
  };
}
