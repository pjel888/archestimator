import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { ProjectDashboardClient } from "@/components/workshop/ProjectDashboardClient";
import type { Tables } from "@/lib/supabase/types";

vi.mock("next/navigation", () => ({
  usePathname: () => "/workshop/projects/11111111-1111-4111-8111-111111111111",
  useRouter: () => ({ replace: vi.fn() }),
  useSearchParams: () => new URLSearchParams(),
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
  it("keeps editable project details inside the glass dashboard", () => {
    render(<ProjectDashboardClient project={PROJECT_FIXTURE} fallback={FALLBACK} />);

    expect(screen.getByLabelText("Lewis Residence project information")).toBeInTheDocument();
    expect(screen.getByLabelText("Editable project details")).toBeInTheDocument();
    expect(screen.getByDisplayValue("Lewis Residence")).toBeInTheDocument();
    expect(screen.getByDisplayValue("Lewis Family")).toBeInTheDocument();

    expect(screen.getByLabelText("Project dashboard")).toBeInTheDocument();
    expect(screen.getByLabelText("Project overview")).toBeInTheDocument();
    expect(screen.getByLabelText("Project dashboard actions")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /estimates/i })).toHaveAttribute(
      "href",
      "/workshop/projects/11111111-1111-4111-8111-111111111111/estimates",
    );
  });

  it("keeps sample project details editable with dashboard navigation", () => {
    render(<ProjectDashboardClient project={null} fallback={FALLBACK} />);

    expect(screen.getByLabelText("Modern Bungalow project information")).toBeInTheDocument();
    expect(screen.getByDisplayValue("Modern Bungalow")).toBeInTheDocument();
    expect(screen.getByDisplayValue("Sample client")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /data/i })).toHaveAttribute(
      "href",
      "/workshop/projects/sample-modern-bungalow/data",
    );
    expect(screen.getByRole("link", { name: /projects/i })).toHaveAttribute("href", "/workshop/projects");
    expect(screen.queryByRole("link", { name: /publish/i })).not.toBeInTheDocument();
  });
});
