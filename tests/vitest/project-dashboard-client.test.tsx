import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { ProjectDashboardClient } from "@/components/workshop/ProjectDashboardClient";
import type { Tables } from "@/lib/supabase/types";

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
    expect(within(nextSteps).getByRole("link", { name: "View charts" })).toHaveAttribute(
      "href",
      `/workshop/projects/${PROJECT_FIXTURE.id}/charts`,
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
});
