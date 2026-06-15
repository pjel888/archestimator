import { render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { ProjectDashboardClient } from "@/components/workshop/ProjectDashboardClient";
import { colorForBucket } from "@/lib/project-charts/bucket-color";
import type { ProjectChartEstimateSeries } from "@/lib/project-charts/types";
import type { Tables } from "@/lib/supabase/types";
import type { ProjectDashboardSummary } from "@/lib/workshop/dashboard-types";

const routerReplaceMock = vi.hoisted(() => vi.fn());

vi.mock("next/navigation", () => ({
  usePathname: () => "/workshop/projects/11111111-1111-4111-8111-111111111111",
  useRouter: () => ({ replace: routerReplaceMock }),
  useSearchParams: () => new URLSearchParams("estimate=est-1&mode=category"),
}));

const PROJECT_FIXTURE = {
  id: "11111111-1111-4111-8111-111111111111",
  workspace_id: "22222222-2222-4222-8222-222222222222",
  name: "Lewis Residence",
  client_name: "Lewis Family",
  location: "Quezon City, Metro Manila, Philippines",
  project_code: "AE-LR-001",
  currency_code: "PHP",
  metadata: {},
  created_at: "2026-05-20T00:00:00.000Z",
  updated_at: "2026-05-26T00:00:00.000Z",
  created_by: null,
} satisfies Tables<"projects">;

const FALLBACK = {
  id: "sample-modern-bungalow",
  name: "Modern Bungalow",
  client: "Sample client",
  location: "Sample location",
  projectCode: "SAMPLE-001",
  currencyCode: "PHP",
};

describe("ProjectDashboardClient", () => {
  it("renders editable project details with a first-run next-step panel", () => {
    render(<ProjectDashboardClient project={PROJECT_FIXTURE} fallback={FALLBACK} />);

    expect(screen.getByLabelText("Lewis Residence project information")).toBeInTheDocument();
    expect(screen.getByLabelText("Editable project details")).toBeInTheDocument();
    expect(screen.getByDisplayValue("Lewis Residence")).toBeInTheDocument();
    expect(screen.getByDisplayValue("Lewis Family")).toBeInTheDocument();

    const nextSteps = screen.getByLabelText("Project dashboard next steps");
    expect(within(nextSteps).getByText("Build this project from estimates")).toBeInTheDocument();
    expect(within(nextSteps).getByText(/create your first sheet/)).toBeInTheDocument();
    expect(within(nextSteps).getByRole("link", { name: "Open estimates" })).toHaveAttribute(
      "href",
      `/workshop/projects/${PROJECT_FIXTURE.id}/estimates`,
    );
    expect(within(nextSteps).getByRole("link", { name: "View data" })).toHaveAttribute(
      "href",
      `/workshop/projects/${PROJECT_FIXTURE.id}/data`,
    );
    expect(within(nextSteps).getByRole("link", { name: "All projects" })).toHaveAttribute(
      "href",
      "/workshop/projects",
    );
  });

  it("keeps sample project dashboards clearly navigable without live data", () => {
    render(<ProjectDashboardClient project={null} fallback={FALLBACK} />);

    expect(screen.getByLabelText("Modern Bungalow project information")).toBeInTheDocument();
    expect(screen.getByDisplayValue("Modern Bungalow")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Open estimates" })).toHaveAttribute(
      "href",
      "/workshop/projects/sample-modern-bungalow/estimates",
    );
  });

  it("renders the first-run panel when the summary has no estimates (R12)", () => {
    const emptySummary: ProjectDashboardSummary = {
      projectId: PROJECT_FIXTURE.id,
      estimateCount: 0,
      selectedEstimateId: null,
      selectedGroupingMode: "category",
      selectedEstimate: null,
      estimateSheets: [],
      headline: null,
      costMix: null,
      otherEstimates: [],
      readiness: null,
      risks: [],
      rollup: { kind: "single-currency", total: 0, currencyCode: "PHP" },
    };
    render(<ProjectDashboardClient project={PROJECT_FIXTURE} fallback={FALLBACK} summary={emptySummary} />);

    expect(screen.getByLabelText("Project dashboard next steps")).toBeInTheDocument();
    expect(screen.queryByLabelText("Project cockpit")).not.toBeInTheDocument();
  });

  it("replaces the main area with cockpit zones while keeping the details aside (U3/U4/U5/U7)", () => {
    const categoryTotal = 1_000_000;
    const series: ProjectChartEstimateSeries = {
      space: { total: categoryTotal, allBuckets: [bucket("sp1", "Ground floor", categoryTotal, categoryTotal)] },
      category: {
        total: categoryTotal,
        allBuckets: [
          bucket("c1", "Concrete", 600_000, categoryTotal),
          bucket("c2", "Steel", 400_000, categoryTotal),
        ],
      },
      supplier: { total: categoryTotal, allBuckets: [bucket("s1", "Acme", categoryTotal, categoryTotal)] },
    };
    const summary: ProjectDashboardSummary = {
      projectId: PROJECT_FIXTURE.id,
      estimateCount: 2,
      selectedEstimateId: "est-1",
      selectedGroupingMode: "category",
      selectedEstimate: {
        id: "est-1",
        name: "Revised scope",
        sheetCode: "EST-001",
        total: categoryTotal,
        currencyCode: "PHP",
        updatedAt: "2026-06-12T00:00:00.000Z",
        rowCount: 8,
        nodeCount: 2,
        firstNodeId: "node-1",
        budget: null,
        variance: null,
        isSelected: true,
        isIncludedInProposal: true,
      },
      estimateSheets: [
        {
          id: "est-1",
          name: "Revised scope",
          sheetCode: "EST-001",
          total: categoryTotal,
          currencyCode: "PHP",
          updatedAt: "2026-06-12T00:00:00.000Z",
          rowCount: 8,
          nodeCount: 2,
          firstNodeId: "node-1",
          budget: null,
          variance: null,
          isSelected: true,
          isIncludedInProposal: true,
        },
        {
          id: "est-2",
          name: "Initial estimate",
          sheetCode: "EST-002",
          total: 800_000,
          currencyCode: "PHP",
          updatedAt: "2026-05-01T00:00:00.000Z",
          rowCount: 5,
          nodeCount: 1,
          firstNodeId: "node-2",
          budget: null,
          variance: null,
          isSelected: false,
          isIncludedInProposal: false,
        },
      ],
      headline: {
        id: "est-1",
        name: "Revised scope",
        total: categoryTotal,
        currencyCode: "PHP",
        updatedAt: "2026-06-12T00:00:00.000Z",
        budget: null,
        variance: null,
      },
      costMix: { series, currencyCode: "PHP", truncated: false },
      otherEstimates: [
        {
          id: "est-2",
          name: "Initial estimate",
          total: 800_000,
          currencyCode: "PHP",
          updatedAt: "2026-05-01T00:00:00.000Z",
          firstNodeId: "node-2",
          overBudget: false,
        },
      ],
      readiness: {
        status: "ready",
        primaryAction: { label: "Review share settings", href: `/workshop/projects/${PROJECT_FIXTURE.id}` },
        exportItems: [
          { id: "estimate-selected", label: "Estimate selected", detail: "EST-001 - Revised scope", status: "ready" },
        ],
        shareItems: [{ id: "shared-link", label: "Shared link", detail: "1 selected, link live.", status: "live" }],
      },
      risks: [{ id: "missing-budget", label: "No budget set", detail: "Set a budget.", severity: "warning" }],
      rollup: { kind: "single-currency", total: 1_800_000, currencyCode: "PHP" },
    };

    render(<ProjectDashboardClient project={PROJECT_FIXTURE} fallback={FALLBACK} summary={summary} />);

    // Details aside is untouched.
    expect(screen.getByLabelText("Editable project details")).toBeInTheDocument();
    expect(screen.getByDisplayValue("Lewis Residence")).toBeInTheDocument();

    // Main is now the cockpit, not the first-run panel.
    const main = screen.getByLabelText("Project cockpit");
    expect(within(main).getByLabelText("Project work summary")).toHaveTextContent("₱1,000,000");
    expect(within(main).getByLabelText("Cost composition")).toBeInTheDocument();
    expect(within(main).getByLabelText("Recent estimate sheets")).toBeInTheDocument();
    expect(within(main).getByLabelText("Proposal readiness")).toBeInTheDocument();
    expect(within(main).getByRole("table")).toBeInTheDocument();
    expect(within(main).getByText("Initial estimate")).toBeInTheDocument();
    expect(within(main).getAllByText("No budget set").length).toBeGreaterThan(1);
    expect(screen.queryByText("Build this project from estimates")).not.toBeInTheDocument();
  });
});

function bucket(id: string, label: string, total: number, seriesTotal: number) {
  return { id, label, total, share: total / seriesTotal, rowCount: 1, color: colorForBucket(id) };
}
