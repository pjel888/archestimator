import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { CostBreakdownSection } from "@/components/workshop/project-data/CostBreakdownSection";
import type { ProjectChartBucket } from "@/lib/project-charts/types";
import type { ProjectDataEstimateSheet } from "@/lib/repositories/project-data-repository";

const BUCKETS: ProjectChartBucket[] = [
  { id: "materials", label: "Materials", total: 1200, share: 2 / 3, rowCount: 2, color: "#38586F" },
  { id: "labor", label: "Labor", total: 600, share: 1 / 3, rowCount: 1, color: "#C9894B" },
];

describe("CostBreakdownSection", () => {
  it("renders the ranked ledger and accessible label-free donut for the selected sheet", () => {
    render(
      <CostBreakdownSection
        projectId="project-1"
        selectedEstimate={estimateSheet("estimate-a", "Original Estimate", 1800, "EST-001")}
        groupingMode="category"
        buckets={BUCKETS}
        activeBucketId={null}
        otherGroupCount={0}
        onActiveBucketChange={vi.fn()}
      />,
    );

    expect(screen.getByRole("heading", { level: 1, name: "Cost breakdown" })).toBeInTheDocument();
    expect(screen.getByText("Total estimate")).toBeInTheDocument();

    const table = screen.getByRole("table", { name: "Original Estimate cost groups by category" });
    expect(table).toHaveAttribute("id", "project-data-cost-breakdown-table");
    expect(within(table).getByRole("columnheader", { name: "Label" })).toBeInTheDocument();
    expect(within(table).getByRole("columnheader", { name: "Share of total" })).toBeInTheDocument();
    expect(within(table).getByRole("columnheader", { name: "Lines" })).toBeInTheDocument();
    expect(within(table).getByText("Materials")).toBeInTheDocument();
    expect(within(table).getByText("Labor")).toBeInTheDocument();
    expect(within(table).getByText("Total")).toBeInTheDocument();
  });

  it("marks the active bucket and forwards bucket focus to the chart state owner", async () => {
    const user = userEvent.setup();
    const onActiveBucketChange = vi.fn();

    render(
      <CostBreakdownSection
        projectId="project-1"
        selectedEstimate={estimateSheet("estimate-a", "Original Estimate", 1800, "EST-001")}
        groupingMode="category"
        buckets={BUCKETS}
        activeBucketId="materials"
        otherGroupCount={0}
        onActiveBucketChange={onActiveBucketChange}
      />,
    );

    const table = screen.getByRole("table", { name: "Original Estimate cost groups by category" });
    const materialsRow = within(table).getByText("Materials").closest("tr");
    expect(materialsRow).toHaveClass("bg-surfaceMuted");
    expect(materialsRow).not.toHaveAttribute("aria-pressed");

    await user.hover(within(table).getByText("Labor"));
    expect(onActiveBucketChange).toHaveBeenCalledWith("labor");
  });

  it("labels the row where displayed groups cross 80 percent of sheet cost", () => {
    render(
      <CostBreakdownSection
        projectId="project-1"
        selectedEstimate={estimateSheet("estimate-a", "Original Estimate", 1800, "EST-001")}
        groupingMode="category"
        buckets={[
          { id: "materials", label: "Materials", total: 900, share: 0.5, rowCount: 2, color: "#38586F" },
          { id: "labor", label: "Labor", total: 600, share: 1 / 3, rowCount: 1, color: "#C9894B" },
          { id: "equipment", label: "Equipment", total: 300, share: 1 / 6, rowCount: 1, color: "#5F8F63" },
        ]}
        activeBucketId={null}
        otherGroupCount={0}
        onActiveBucketChange={vi.fn()}
      />,
    );

    const table = screen.getByRole("table", { name: "Original Estimate cost groups by category" });
    expect(within(table).getByText("80% of cost reached here")).toBeInTheDocument();
  });

  it("shows an estimate creation empty state when the project has no estimate sheets", () => {
    render(
      <CostBreakdownSection
        projectId="project-1"
        selectedEstimate={null}
        groupingMode="category"
        buckets={[]}
        activeBucketId={null}
        otherGroupCount={0}
        onActiveBucketChange={vi.fn()}
      />,
    );

    expect(screen.getByText("No estimate sheets yet.")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /create estimate sheet/i })).toHaveAttribute(
      "href",
      "/workshop/projects/project-1/estimates",
    );
  });
});

function estimateSheet(
  id: string,
  name: string,
  totalCost: number,
  sheetCode: string | null = null,
): ProjectDataEstimateSheet {
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
