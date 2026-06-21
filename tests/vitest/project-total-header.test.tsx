import { act, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import {
  dispatchProjectBudgetChange,
  dispatchProjectTotalChange,
  ProjectTotalHeader,
} from "@/components/workshop/ProjectTotalHeader";
import { ProjectEstimateMetadataPublisher } from "@/components/workshop/ProjectEstimateMetadataStrip";

const estimatePath = "/workshop/projects/project-1/estimates/node-1";
const pathnameMock = { current: estimatePath };

vi.mock("next/navigation", () => ({
  usePathname: () => pathnameMock.current,
}));

function renderProjectTotalHeader(plannedBudget = 1_000_000) {
  return render(
    <div className="h-14 w-[640px]">
      <ProjectTotalHeader projectId="project-1" plannedBudget={plannedBudget} />
    </div>,
  );
}

describe("ProjectTotalHeader", () => {
  afterEach(() => {
    pathnameMock.current = estimatePath;
    delete (window as Window & { __archestimatorProjectBudget?: number }).__archestimatorProjectBudget;
    delete (
      window as Window & {
        __archestimatorProjectEstimateMetadata?: { projectBudget?: unknown } | null;
      }
    ).__archestimatorProjectEstimateMetadata;
  });

  it("shows an empty budget health meter before estimate rows contribute cost", () => {
    renderProjectTotalHeader();

    const header = screen.getByLabelText("Estimate running totals");
    const health = header.querySelector("[data-budget-health-state]");
    const meter = within(header).getByRole("meter", { name: "Budget health" });

    expect(health).toHaveAttribute("data-budget-health-state", "empty");
    expect(within(header).getByText("No estimate cost yet")).toBeInTheDocument();
    expect(meter).toHaveAttribute("aria-valuenow", "0");
    expect(meter).toHaveAttribute("aria-valuetext", "No estimate cost yet");
    expect(header.querySelectorAll("[data-budget-health-segment]")).toHaveLength(144);
    expect(header.querySelector("[data-budget-health-segment]")).toHaveClass("aspect-square", "h-1.5", "w-1.5", "shrink-0");
    expect(header.querySelectorAll('[data-budget-health-segment-active="true"]')).toHaveLength(0);
  });

  it("keeps total values stronger than compact labels and budget health metadata", () => {
    renderProjectTotalHeader();

    const header = screen.getByLabelText("Estimate running totals");

    expect(within(header).getByText("₱ 1,000,000.00")).toHaveClass("text-[12px]");
    expect(within(header).getByText("Project budget")).toHaveClass("text-[8px]");
    expect(within(header).getByText("Ongoing project cost")).toHaveClass("text-[8px]");
    expect(within(header).getByText("Budget health").parentElement).toHaveClass("text-[8px]");
  });

  it("renders remaining budget and usage percentage while under budget", () => {
    renderProjectTotalHeader();

    act(() => dispatchProjectTotalChange(750_000));

    const header = screen.getByLabelText("Estimate running totals");
    const health = header.querySelector("[data-budget-health-state]");
    const meter = within(header).getByRole("meter", { name: "Budget health" });
    const activeSegments = header.querySelectorAll('[data-budget-health-segment-active="true"]');
    const lastActiveSegment = activeSegments[activeSegments.length - 1];

    expect(health).toHaveAttribute("data-budget-health-state", "success");
    expect(within(header).getByText("₱ 1,000,000.00")).toHaveClass("text-[#3F7FBF]");
    expect(within(header).getByText("₱ 250K remaining · 75% used")).toHaveClass("text-[#3F7FBF]");
    expect(meter).toHaveAttribute("aria-valuenow", "75");
    expect(meter).toHaveAttribute("aria-valuetext", "₱ 250,000.00 remaining · 75% used");
    expect(activeSegments).toHaveLength(108);
    expect(lastActiveSegment).toHaveAttribute("data-budget-health-segment-tone", "amber");
  });

  it("turns over-budget cost red and fills the heatmap through the red zone", () => {
    renderProjectTotalHeader();

    act(() => dispatchProjectTotalChange(1_250_000));

    const header = screen.getByLabelText("Estimate running totals");
    const health = header.querySelector("[data-budget-health-state]");
    const meter = within(header).getByRole("meter", { name: "Budget health" });
    const activeSegments = header.querySelectorAll('[data-budget-health-segment-active="true"]');
    const lastActiveSegment = activeSegments[activeSegments.length - 1];

    expect(health).toHaveAttribute("data-budget-health-state", "danger");
    expect(within(header).getByText("₱ 250K over · 125% used")).toHaveClass("text-[#C86161]");
    expect(within(header).getByText("₱ 1,250,000.00")).toHaveClass("text-[#C86161]");
    expect(meter).toHaveAttribute("aria-valuenow", "125");
    expect(meter).toHaveAttribute("aria-valuemax", "125");
    expect(meter).toHaveAttribute("aria-valuetext", "₱ 250,000.00 over · 125% used");
    expect(activeSegments).toHaveLength(144);
    expect(lastActiveSegment).toHaveAttribute("data-budget-health-segment-tone", "red");
  });

  it("shows a missing-budget state instead of fake variance when no planned budget exists", () => {
    renderProjectTotalHeader(0);

    act(() => dispatchProjectTotalChange(450_000));

    const header = screen.getByLabelText("Estimate running totals");
    const meter = within(header).getByRole("meter", { name: "Budget health" });

    expect(header.querySelector("[data-budget-health-state]")).toHaveAttribute("data-budget-health-state", "missing");
    expect(within(header).getByText("Add planned budget to track variance")).toBeInTheDocument();
    expect(within(header).getByText("No budget")).toBeInTheDocument();
    expect(meter).toHaveAttribute("aria-valuetext", "Add planned budget to track variance");
    expect(header.querySelectorAll("[data-budget-health-segment]")).toHaveLength(144);
    expect(header.querySelectorAll('[data-budget-health-segment-active="true"]')).toHaveLength(0);
  });

  it("does not render on non-estimate project routes", () => {
    pathnameMock.current = "/workshop/projects/project-1";

    renderProjectTotalHeader();

    expect(screen.queryByLabelText("Estimate running totals")).not.toBeInTheDocument();
  });

  it("reacts to active estimate budget changes", () => {
    renderProjectTotalHeader(1_000_000);

    act(() => dispatchProjectTotalChange(900_000));
    act(() => dispatchProjectBudgetChange(800_000));

    const header = screen.getByLabelText("Estimate running totals");

    expect(header.querySelector("[data-budget-health-state]")).toHaveAttribute("data-budget-health-state", "danger");
    expect(within(header).getByText("₱ 100K over · 113% used")).toBeInTheDocument();
    expect(within(header).getByText("₱ 800,000.00")).toBeInTheDocument();
  });

  it("hydrates the active estimate budget when metadata publishes during layout", () => {
    render(
      <div className="h-14 w-[640px]">
        <ProjectTotalHeader projectId="project-1" plannedBudget={0} />
        <ProjectEstimateMetadataPublisher
          metadata={{
            projectName: "Lewis Residence",
            estimateName: "Lewis Residence - 002",
            estimateSheetCode: "ES-002",
            projectBudget: 2_000_000,
          }}
        />
      </div>,
    );

    const header = screen.getByLabelText("Estimate running totals");

    expect(within(header).getByText("₱ 2,000,000.00")).toBeInTheDocument();
    expect(header.querySelector("[data-budget-health-state]")).toHaveAttribute("data-budget-health-state", "empty");
  });
});
