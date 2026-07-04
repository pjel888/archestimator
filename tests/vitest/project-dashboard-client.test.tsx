import { render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import type { ProjectRow } from "@/lib/types/database";

vi.mock("@/lib/projects/actions", () => ({
  updateProjectDetails: vi.fn(async () => undefined),
}));

vi.mock("@/lib/projects/location-actions", () => ({
  saveProjectLocation: vi.fn(async () => ({ status: "success", message: "Project pin saved." })),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ prefetch: vi.fn() }),
}));

const PROJECT_FIXTURE = {
  id: "11111111-1111-4111-8111-111111111111",
  workspace_id: "22222222-2222-4222-8222-222222222222",
  name: "Lewis Residence",
  client_name: "Lewis Family",
  location: "Quezon City, Metro Manila, Philippines",
  project_code: "AE-LR-001",
  currency_code: "PHP",
  metadata: { projectImageUrl: "https://cdn.example.test/project.jpg" },
  created_at: "2026-05-20T00:00:00.000Z",
  updated_at: "2026-05-26T00:00:00.000Z",
  created_by: null,
} satisfies ProjectRow;

const PROJECT_LOCATION_FIXTURE = {
  id: "location-1",
  projectId: PROJECT_FIXTURE.id,
  latitude: 14.599512,
  longitude: 120.984222,
  accuracyMeters: null,
  source: "geocoded",
  displayLabel: "Quezon City",
  addressText: "Quezon City, Metro Manila, Philippines",
  geocoderName: "google",
  providerPlaceId: "google-place-1",
  updatedAt: "2026-05-26T00:00:00.000Z",
} as const;

const RECENT_ESTIMATE_SHEETS_FIXTURE = [
  {
    id: "estimate-1",
    projectId: PROJECT_FIXTURE.id,
    name: "Original Estimate",
    sheetCode: "EST-001",
    updatedAt: "2026-05-27T00:00:00.000Z",
    firstNodeId: "node-1",
    totalCost: 125000,
    projectBudget: 200000,
  },
  {
    id: "estimate-2",
    projectId: PROJECT_FIXTURE.id,
    name: "Permit Budget",
    sheetCode: "EST-002",
    updatedAt: "2026-05-22T00:00:00.000Z",
    firstNodeId: null,
    totalCost: 88000,
    projectBudget: 80000,
  },
  {
    id: "estimate-3",
    projectId: PROJECT_FIXTURE.id,
    name: "Construction Set",
    sheetCode: "EST-003",
    updatedAt: "2026-05-20T00:00:00.000Z",
    firstNodeId: "node-3",
    totalCost: 32000,
    projectBudget: null,
  },
] as const;

const PROJECT_ACTIVITY_PAGE_FIXTURE = {
  items: [],
  nextCursor: null,
};

const FALLBACK = {
  id: "sample-modern-bungalow",
  name: "Modern Bungalow",
  client: "Sample client",
  location: "Sample location",
  projectCode: "SAMPLE-001",
  currencyCode: "PHP",
};

describe("ProjectDashboardClient", () => {
  it("renders the project identity rail and the Google map command surface", async () => {
    const { ProjectDashboardClient } = await import("@/components/workshop/ProjectDashboardClient");

    const { container } = render(
      <ProjectDashboardClient
        project={PROJECT_FIXTURE}
        fallback={FALLBACK}
        estimateCount={RECENT_ESTIMATE_SHEETS_FIXTURE.length}
        recentEstimateSheets={RECENT_ESTIMATE_SHEETS_FIXTURE}
        canEditProject
        projectLocation={PROJECT_LOCATION_FIXTURE}
        projectActivityPage={PROJECT_ACTIVITY_PAGE_FIXTURE}
        googleMapsApiKey="test-google-browser-key"
      />,
    );

    expect(screen.getByLabelText("Lewis Residence project information")).toBeInTheDocument();
    expect(screen.getByRole("complementary", { name: "Project identity" })).toBeInTheDocument();
    expect(screen.getByDisplayValue("Lewis Residence")).toBeInTheDocument();
    expect(screen.getByDisplayValue("Lewis Family")).toBeInTheDocument();
    expect(screen.getByDisplayValue("Lewis Residence")).toHaveClass("bg-transparent", "hover:bg-white/35", "focus:bg-white/85");
    expect(screen.getByDisplayValue("Lewis Family")).toHaveClass("bg-transparent", "hover:bg-white/35", "focus:bg-white/85");
    expect(screen.getByDisplayValue("Quezon City, Metro Manila, Philippines")).toHaveClass(
      "bg-transparent",
      "hover:bg-white/35",
      "focus:bg-white/85",
    );
    expect(container.querySelector("form")).toBeInTheDocument();
    expect(container.querySelector('input[name="projectId"]')).toHaveAttribute("value", PROJECT_FIXTURE.id);
    expect(container.querySelector('input[name="projectImageUrl"]')).toHaveAttribute(
      "value",
      "https://cdn.example.test/project.jpg",
    );
    expect(container.querySelector('input[name="currencyCode"]')).toHaveAttribute("value", "PHP");
    expect(container.querySelector('input[name="projectCode"]')).toHaveAttribute("value", "AE-LR-001");

    const regions = within(screen.getByRole("main", { name: "Project dashboard" }))
      .getAllByRole("region")
      .map((region) => region.getAttribute("aria-label"));
    expect(regions).toEqual([
      "Project command surface",
      "Project estimates summary",
      "Project activity feed",
      "Recent estimate running costs",
      "Recent estimate budget health",
    ]);

    const commandSurface = screen.getByRole("region", { name: "Project command surface" });
    expect(commandSurface).toHaveClass("h-full");
    expect(within(commandSurface).getByTestId("project-location-google-map")).toBeInTheDocument();
    expect(within(commandSurface).getByRole("application", { name: /google map pin at/i })).toBeInTheDocument();
    const estimateSummary = within(commandSurface).getByRole("region", { name: "Project estimates summary" });
    expect(within(estimateSummary).getByText("Estimate Count")).toBeInTheDocument();
    expect(within(estimateSummary).getByText(String(RECENT_ESTIMATE_SHEETS_FIXTURE.length))).toBeInTheDocument();
    expect(within(estimateSummary).getByText("Recent Estimate Sheets")).toBeInTheDocument();
    expect(within(estimateSummary).getByRole("link", { name: /Original Estimate/i })).toHaveAttribute(
      "href",
      `/workshop/projects/${PROJECT_FIXTURE.id}/estimates/node-1`,
    );
    expect(within(estimateSummary).getByRole("link", { name: /Permit Budget/i })).toHaveAttribute(
      "href",
      `/workshop/projects/${PROJECT_FIXTURE.id}/estimates`,
    );
    expect(within(estimateSummary).queryByText("01")).not.toBeInTheDocument();
    expect(within(estimateSummary).queryByRole("link", { name: "Open Projects" })).not.toBeInTheDocument();
    const runningCosts = within(commandSurface).getByRole("region", { name: "Recent estimate running costs" });
    const costCells = within(runningCosts).getAllByTestId("project-location-estimate-cost-cell");
    expect(costCells).toHaveLength(3);
    expect(costCells[0]).toHaveClass("border-r");
    expect(costCells[1]).toHaveClass("border-r");
    expect(costCells[2]).not.toHaveClass("border-r");
    costCells.forEach((cell) => expect(cell).toHaveClass("p-1"));
    expect(within(runningCosts).getByText("Original Estimate")).toHaveClass("block", "border-b", "-mx-1", "px-1");
    expect(within(runningCosts).getByText("Permit Budget")).toBeInTheDocument();
    expect(within(runningCosts).getByText("Construction Set")).toBeInTheDocument();
    expect(within(runningCosts).getByText("₱125,000")).toBeInTheDocument();
    expect(within(runningCosts).getByText("₱88,000")).toBeInTheDocument();
    expect(within(runningCosts).getByText("₱32,000")).toBeInTheDocument();
    const budgetHealth = within(commandSurface).getByRole("region", { name: "Recent estimate budget health" });
    const budgetHeaders = within(budgetHealth).getAllByTestId("project-location-budget-health-header-cell");
    const budgetFooters = within(budgetHealth).getAllByTestId("project-location-budget-health-footer-cell");
    expect(budgetHeaders).toHaveLength(3);
    expect(budgetHeaders[0]).toHaveClass("border-r");
    expect(budgetHeaders[1]).toHaveClass("border-r");
    expect(budgetHeaders[2]).not.toHaveClass("border-r");
    expect(within(budgetHeaders[0]).getByText("Budget")).toBeInTheDocument();
    expect(within(budgetHeaders[1]).queryByText("Budget")).not.toBeInTheDocument();
    expect(within(budgetHeaders[2]).getByText("Budget")).toBeInTheDocument();
    expect(budgetFooters).toHaveLength(3);
    expect(budgetFooters[0]).toHaveClass("border-r");
    expect(budgetFooters[1]).toHaveClass("border-r");
    expect(budgetFooters[2]).not.toHaveClass("border-r");
    const budgetCells = within(budgetHealth).getAllByTestId("project-location-budget-health-cell");
    expect(budgetCells).toHaveLength(3);
    expect(budgetCells[0]).toHaveClass("border-r");
    expect(budgetCells[1]).toHaveClass("border-r");
    expect(budgetCells[2]).not.toHaveClass("border-r");
    expect(within(budgetHealth).getByRole("meter", { name: "Original Estimate budget health" })).toHaveAttribute("aria-valuenow", "63");
    expect(within(budgetHealth).getByText("63% used")).toBeInTheDocument();
    expect(within(budgetHealth).getByRole("meter", { name: "Permit Budget budget health" })).toHaveAttribute("aria-valuenow", "110");
    expect(within(budgetHealth).getByText("110% overbudget")).toBeInTheDocument();
    expect(within(budgetHealth).getByRole("meter", { name: "Construction Set budget health" })).toHaveAttribute("aria-valuenow", "0");
    expect(within(budgetHealth).getAllByText("No budget").length).toBeGreaterThan(0);
    expect(budgetHealth.querySelectorAll("[data-project-location-budget-overflow]")).toHaveLength(1);
    expect(screen.queryByRole("region", { name: "Recent sheets" })).not.toBeInTheDocument();
    expect(screen.queryByRole("region", { name: "Published link" })).not.toBeInTheDocument();
    expect(screen.queryByRole("region", { name: "Estimate activity" })).not.toBeInTheDocument();
    expect(screen.queryByRole("region", { name: "Location" })).not.toBeInTheDocument();
    expect(screen.queryByText(/recipient/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/lewis@example/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/rawSecret/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/correlation/i)).not.toBeInTheDocument();
  });

  it("keeps persisted read-only projects from rendering edit controls or exact coordinates", async () => {
    const { ProjectDashboardClient } = await import("@/components/workshop/ProjectDashboardClient");

    const { container } = render(
      <ProjectDashboardClient
        project={PROJECT_FIXTURE}
        fallback={FALLBACK}
        estimateCount={0}
        recentEstimateSheets={[]}
        canEditProject={false}
        projectLocation={null}
        projectActivityPage={PROJECT_ACTIVITY_PAGE_FIXTURE}
        googleMapsApiKey=""
      />,
    );

    expect(container.querySelector("form")).not.toBeInTheDocument();
    expect(screen.getByDisplayValue("Lewis Residence")).toHaveAttribute("readonly");
    expect(screen.getByDisplayValue("Lewis Family")).toHaveAttribute("readonly");
    const commandSurface = screen.getByRole("region", { name: "Project command surface" });
    expect(within(commandSurface).getByText("Google Maps API key missing")).toBeInTheDocument();
    expect(screen.queryByText("No exact pin saved.")).not.toBeInTheDocument();
    expect(screen.queryByText("14.599512")).not.toBeInTheDocument();
    expect(screen.queryByText("120.984222")).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Save pin" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Clear pin" })).not.toBeInTheDocument();
  });

  it("keeps sample projects honest with empty recent sheets and no publication shortcut", async () => {
    const { ProjectDashboardClient } = await import("@/components/workshop/ProjectDashboardClient");

    const { container } = render(
      <ProjectDashboardClient
        project={null}
        fallback={FALLBACK}
        estimateCount={0}
        recentEstimateSheets={[]}
        canEditProject={false}
        projectLocation={null}
        googleMapsApiKey=""
      />,
    );

    expect(screen.getByLabelText("Modern Bungalow project information")).toBeInTheDocument();
    expect(container.querySelector("form")).not.toBeInTheDocument();
    expect(container.querySelector('input[name="projectId"]')).not.toBeInTheDocument();
    expect(screen.getByDisplayValue("Modern Bungalow")).toHaveAttribute("readonly");
    expect(screen.getByDisplayValue("Sample client")).toHaveAttribute("readonly");
    expect(screen.getByDisplayValue("Sample location")).toHaveAttribute("readonly");

    expect(within(screen.getByRole("region", { name: "Project command surface" })).getByText("Google Maps API key missing")).toBeInTheDocument();
    expect(screen.queryByText("No estimate sheets yet.")).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Open estimates" })).not.toBeInTheDocument();
    expect(screen.queryByText("Unpublished")).not.toBeInTheDocument();
    expect(screen.queryByText("Use Share in the header to publish or manage a client link.")).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Copy published client link" })).not.toBeInTheDocument();
    expect(screen.queryByText("No estimate activity yet.")).not.toBeInTheDocument();
    expect(screen.queryByText("No exact pin saved.")).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Save pin" })).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: /data/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: /projects/i })).not.toBeInTheDocument();
  });
});
