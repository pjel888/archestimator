import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { ProjectDataInsightHeader } from "@/components/workshop/project-data/ProjectDataInsightHeader";
import type { CostConcentration } from "@/lib/project-charts/build-concentration-sentence";
import type { ProjectDataEstimateSheet } from "@/lib/repositories/project-data-repository";

describe("ProjectDataInsightHeader", () => {
  it("leads with sheet controls, concentration figures, and partial-coverage status", () => {
    render(
      <ProjectDataInsightHeader
        estimateSheets={[estimateSheet("estimate-a", "Original Estimate", 1800, "EST-001")]}
        selectedEstimate={estimateSheet("estimate-a", "Original Estimate", 1800, "EST-001")}
        groupingMode="category"
        concentration={concentration()}
        sheetCount={1}
        didTruncate
        rowLimit={5000}
        onEstimateChange={vi.fn()}
        onGroupingModeChange={vi.fn()}
      />,
    );

    expect(screen.getByText("Cost data")).toBeInTheDocument();
    expect(screen.getByRole("combobox", { name: "Estimate sheet" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Category" })).toBeInTheDocument();
    expect(screen.getByText("Materials dominates this sheet.")).toBeInTheDocument();
    expect(screen.getByText("Top-2 share")).toBeInTheDocument();
    expect(screen.getByText("88.9%")).toBeInTheDocument();
    expect(screen.getByText("Categories to 80%")).toBeInTheDocument();
    expect(screen.getByText("Line items")).toBeInTheDocument();
    expect(screen.getByRole("status")).toHaveTextContent(
      "Partial coverage: capped at 5,000 rows; totals and mix may be incomplete.",
    );
  });

  it("forwards grouping changes to the route state owner", async () => {
    const user = userEvent.setup();
    const onGroupingModeChange = vi.fn();

    render(
      <ProjectDataInsightHeader
        estimateSheets={[estimateSheet("estimate-a", "Original Estimate", 1800, "EST-001")]}
        selectedEstimate={estimateSheet("estimate-a", "Original Estimate", 1800, "EST-001")}
        groupingMode="category"
        concentration={concentration()}
        sheetCount={1}
        didTruncate={false}
        rowLimit={5000}
        onEstimateChange={vi.fn()}
        onGroupingModeChange={onGroupingModeChange}
      />,
    );

    await user.click(screen.getByRole("button", { name: "Supplier" }));

    expect(onGroupingModeChange).toHaveBeenCalledWith("supplier");
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
    rowCount: 4,
    totalCost,
  };
}

function concentration(): CostConcentration {
  return {
    sentence: "Materials dominates this sheet.",
    topShare: 2 / 3,
    topTwoShare: 0.889,
    groupsCarrying80: 2,
    lineCount: 4,
    topLabel: "Materials",
  };
}
