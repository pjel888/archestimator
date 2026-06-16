import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { CostBreakdownSection } from "@/components/workshop/project-data/CostBreakdownSection";
import type { ProjectChartBucket } from "@/lib/project-charts/types";
import type { ProjectDataEstimateSheet } from "@/lib/repositories/project-data-repository";

const ESTIMATE_SHEETS: ProjectDataEstimateSheet[] = [
  {
    id: "estimate-a",
    name: "Original Estimate",
    sheetCode: "EST-001",
    currencyCode: "PHP",
    updatedAt: null,
    rowCount: 2,
    totalCost: 1800,
  },
  {
    id: "estimate-b",
    name: "Tender Estimate",
    sheetCode: "EST-002",
    currencyCode: "PHP",
    updatedAt: null,
    rowCount: 1,
    totalCost: 1200,
  },
];

const BUCKETS: ProjectChartBucket[] = [
  { id: "materials", label: "Materials", total: 1200, share: 2 / 3, rowCount: 2, color: "#38586F" },
  { id: "labor", label: "Labor", total: 600, share: 1 / 3, rowCount: 1, color: "#C9894B" },
];

describe("CostBreakdownSection", () => {
  it("renders the selected sheet controls, donut, and accessible detail table", () => {
    render(
      <CostBreakdownSection
        projectId="project-1"
        estimateSheets={ESTIMATE_SHEETS}
        selectedEstimate={ESTIMATE_SHEETS[0] ?? null}
        groupingMode="category"
        buckets={BUCKETS}
        activeBucketId={null}
        didTruncate={false}
        onActiveBucketChange={vi.fn()}
        onEstimateChange={vi.fn()}
        onGroupingModeChange={vi.fn()}
      />,
    );

    expect(screen.getByRole("heading", { level: 1, name: "Cost breakdown" })).toBeInTheDocument();
    expect(screen.getByRole("combobox", { name: "Estimate sheet" })).toHaveTextContent("Original Estimate (EST-001)");
    expect(screen.getByRole("group", { name: "Group cost by" })).toBeInTheDocument();
    expect(screen.getByText("Total estimate")).toBeInTheDocument();

    const table = screen.getByRole("table", { name: "Original Estimate cost groups by category" });
    expect(table).toHaveAttribute("id", "project-data-cost-breakdown-table");
    expect(within(table).getByRole("columnheader", { name: "Label" })).toBeInTheDocument();
    expect(within(table).getByText("Materials")).toBeInTheDocument();
    expect(within(table).getByText("Labor")).toBeInTheDocument();
  });

  it("announces capped reads and forwards bucket focus to the chart state owner", async () => {
    const user = userEvent.setup();
    const onActiveBucketChange = vi.fn();

    render(
      <CostBreakdownSection
        projectId="project-1"
        estimateSheets={ESTIMATE_SHEETS}
        selectedEstimate={ESTIMATE_SHEETS[0] ?? null}
        groupingMode="category"
        buckets={BUCKETS}
        activeBucketId="materials"
        didTruncate
        onActiveBucketChange={onActiveBucketChange}
        onEstimateChange={vi.fn()}
        onGroupingModeChange={vi.fn()}
      />,
    );

    expect(screen.getByText("Partial totals")).toBeInTheDocument();
    const table = screen.getByRole("table", { name: "Original Estimate cost groups by category" });
    const materialsRow = within(table).getByText("Materials").closest("tr");
    expect(materialsRow).toHaveClass("bg-surfaceMuted");
    expect(materialsRow).not.toHaveAttribute("aria-pressed");

    await user.hover(within(table).getByText("Labor"));
    expect(onActiveBucketChange).toHaveBeenCalledWith("labor");
  });

  it("shows an estimate creation empty state when the project has no estimate sheets", () => {
    render(
      <CostBreakdownSection
        projectId="project-1"
        estimateSheets={[]}
        selectedEstimate={null}
        groupingMode="category"
        buckets={[]}
        activeBucketId={null}
        didTruncate={false}
        onActiveBucketChange={vi.fn()}
        onEstimateChange={vi.fn()}
        onGroupingModeChange={vi.fn()}
      />,
    );

    expect(screen.getByText("No estimate sheets yet.")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /create estimate sheet/i })).toHaveAttribute(
      "href",
      "/workshop/projects/project-1/estimates",
    );
  });
});
