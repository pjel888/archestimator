import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { EstimateColumn } from "@/components/workshop/project-data/EstimateColumn";
import type { ProjectChartBucket } from "@/lib/project-charts/types";
import type { ProjectDataEstimateSheet } from "@/lib/repositories/project-data-repository";

describe("EstimateColumn", () => {
  it("renders a donut described by its own breakdown list", () => {
    render(<EstimateColumn {...columnProps()} />);

    const chart = screen.getByTestId("d3-donut-chart");
    expect(chart).toHaveAttribute("aria-describedby", "estimate-estimate-a-breakdown");
    expect(screen.getByRole("list", { name: "Original Estimate cost breakdown by category" })).toHaveAttribute(
      "id",
      "estimate-estimate-a-breakdown",
    );
  });

  it("activates a bucket when its breakdown row receives focus", () => {
    const onActiveBucketChange = vi.fn();
    render(<EstimateColumn {...columnProps({ onActiveBucketChange })} />);

    fireEvent.focus(screen.getByText("Materials").closest("li")!);

    expect(onActiveBucketChange).toHaveBeenCalledWith("materials");
  });

  it("does not render a remove button for the baseline column", () => {
    render(<EstimateColumn {...columnProps({ baseline: true, onRemove: undefined })} />);

    expect(screen.queryByRole("button", { name: /remove original estimate/i })).not.toBeInTheDocument();
  });

  it("calls onRemove from a non-baseline column remove button", async () => {
    const user = userEvent.setup();
    const onRemove = vi.fn();
    render(<EstimateColumn {...columnProps({ baseline: false, onRemove })} />);

    await user.click(screen.getByRole("button", { name: "Remove Original Estimate from comparison" }));

    expect(onRemove).toHaveBeenCalledOnce();
  });

  it("calls onSwapEstimate with the selected estimate id", async () => {
    const user = userEvent.setup();
    const onSwapEstimate = vi.fn();
    render(<EstimateColumn {...columnProps({ onSwapEstimate })} />);

    await user.click(screen.getByRole("combobox", { name: "Change Original Estimate sheet" }));
    await user.click(screen.getByRole("option", { name: "Tender Estimate (EST-002)" }));

    expect(onSwapEstimate).toHaveBeenCalledWith("estimate-b");
  });
});

function columnProps(overrides: Partial<Parameters<typeof EstimateColumn>[0]> = {}): Parameters<typeof EstimateColumn>[0] {
  return {
    estimate: estimateSheet("estimate-a", "Original Estimate", 1800, "EST-001"),
    baseline: false,
    groupingMode: "category",
    buckets: buckets(),
    total: 1800,
    currencyCode: "PHP",
    delta: -200,
    baselineTotal: 2000,
    activeBucketId: null,
    swapOptions: [{ value: "estimate-b", label: "Tender Estimate (EST-002)" }],
    canSwap: true,
    onActiveBucketChange: vi.fn(),
    onSwapEstimate: vi.fn(),
    onRemove: vi.fn(),
    ...overrides,
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

function buckets(): ProjectChartBucket[] {
  return [
    bucket("materials", "Materials", 1200, 1800),
    bucket("labor", "Labor", 600, 1800),
  ];
}

function bucket(id: string, label: string, total: number, baseTotal: number): ProjectChartBucket {
  return {
    id,
    label,
    total,
    share: total / baseTotal,
    rowCount: 1,
    color: id === "materials" ? "#38586F" : "#C9894B",
    sourceNodeId: null,
  };
}
