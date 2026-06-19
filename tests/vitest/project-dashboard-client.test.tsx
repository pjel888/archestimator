import { fireEvent, render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import {
  ProjectDashboardClient,
  type ProjectPublicationDashboardStatus,
} from "@/components/workshop/ProjectDashboardClient";
import type { ProjectRecentEstimateSheetSummary } from "@/lib/repositories/project-estimate-sheets-repository";
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
  metadata: { projectImageUrl: "https://cdn.example.test/project.jpg" },
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

const RECENT_SHEETS: ProjectRecentEstimateSheetSummary[] = [
  {
    id: "estimate-1",
    projectId: PROJECT_FIXTURE.id,
    name: "Shell Estimate",
    sheetCode: "EST-002",
    updatedAt: "2026-06-12T08:00:00.000Z",
    firstNodeId: "node-1",
  },
  {
    id: "estimate-2",
    projectId: PROJECT_FIXTURE.id,
    name: "Site Works",
    sheetCode: null,
    updatedAt: "2026-06-10T08:00:00.000Z",
    firstNodeId: null,
  },
];

const PUBLISHED_STATUS: ProjectPublicationDashboardStatus = {
  status: "published",
  clientLinkPath: "/share/publication-token",
  selectedEstimateCount: 2,
  passwordRequired: true,
  latestOpenedAt: "2026-06-13T08:00:00.000Z",
  openCount: 3,
  isStale: true,
  canCopy: true,
  canOpen: true,
};

const UNPUBLISHED_STATUS: ProjectPublicationDashboardStatus = {
  status: "unpublished",
  clientLinkPath: null,
  selectedEstimateCount: 0,
  passwordRequired: false,
  latestOpenedAt: null,
  openCount: 0,
  isStale: false,
  canCopy: false,
  canOpen: false,
};

describe("ProjectDashboardClient", () => {
  it("renders the Phase 1 command surface with real recent sheets and redacted publication status", async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(window.navigator, "clipboard", {
      configurable: true,
      value: { writeText },
    });

    const { container } = render(
      <ProjectDashboardClient
        project={PROJECT_FIXTURE}
        fallback={FALLBACK}
        recentSheets={RECENT_SHEETS}
        publicationStatus={PUBLISHED_STATUS}
      />,
    );

    expect(screen.getByLabelText("Lewis Residence project information")).toBeInTheDocument();
    expect(screen.getByRole("complementary", { name: "Project identity" })).toBeInTheDocument();
    expect(screen.getByDisplayValue("Lewis Residence")).toBeInTheDocument();
    expect(screen.getByDisplayValue("Lewis Family")).toBeInTheDocument();
    expect(container.querySelector('input[name="projectImageUrl"]')).toHaveAttribute(
      "value",
      "https://cdn.example.test/project.jpg",
    );
    expect(container.querySelector('input[name="currencyCode"]')).toHaveAttribute("value", "PHP");
    expect(container.querySelector('input[name="projectCode"]')).toHaveAttribute("value", "AE-LR-001");

    const regions = screen.getAllByRole("region").map((region) => region.getAttribute("aria-label"));
    expect(regions).toEqual(["Project command surface", "Recent sheets", "Published link", "Estimate activity", "Location"]);

    const recentSheets = screen.getByRole("region", { name: "Recent sheets" });
    expect(within(recentSheets).getByRole("link", { name: "Open Shell Estimate, updated Jun 12" })).toHaveAttribute(
      "href",
      `/workshop/projects/${PROJECT_FIXTURE.id}/estimates/node-1`,
    );
    expect(within(recentSheets).getByRole("link", { name: "Open Site Works, updated Jun 10" })).toHaveAttribute(
      "href",
      `/workshop/projects/${PROJECT_FIXTURE.id}/estimates`,
    );
    expect(within(recentSheets).getByText("No sheet code · Updated Jun 10")).toBeInTheDocument();

    const publishedLink = screen.getByRole("region", { name: "Published link" });
    expect(within(publishedLink).getByText("Published")).toBeInTheDocument();
    expect(within(publishedLink).getByText("Password protected")).toBeInTheDocument();
    expect(within(publishedLink).getByText("Snapshot stale")).toBeInTheDocument();
    expect(within(publishedLink).getByText("Latest open: Jun 13, 2026")).toBeInTheDocument();
    expect(screen.queryByText(/recipient/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/lewis@example/i)).not.toBeInTheDocument();

    fireEvent.click(within(publishedLink).getByRole("button", { name: "Copy published client link" }));
    expect(writeText).toHaveBeenCalledWith("http://localhost:3000/share/publication-token");
    expect(await screen.findByText("Client link copied")).toBeInTheDocument();
    expect(within(publishedLink).getByRole("link", { name: "Open link" })).toHaveAttribute(
      "href",
      "/share/publication-token",
    );

    expect(screen.getByRole("region", { name: "Estimate activity" })).toHaveTextContent("deferred");
    expect(screen.getByRole("region", { name: "Location" })).toHaveTextContent("No exact pin saved");
  });

  it("keeps sample projects honest with empty recent sheets and no publication shortcut", () => {
    render(
      <ProjectDashboardClient
        project={null}
        fallback={FALLBACK}
        recentSheets={[]}
        publicationStatus={UNPUBLISHED_STATUS}
      />,
    );

    expect(screen.getByLabelText("Modern Bungalow project information")).toBeInTheDocument();
    expect(screen.getByDisplayValue("Modern Bungalow")).toBeInTheDocument();
    expect(screen.getByDisplayValue("Sample client")).toBeInTheDocument();

    const recentSheets = screen.getByRole("region", { name: "Recent sheets" });
    expect(within(recentSheets).getByText("No estimate sheets yet.")).toBeInTheDocument();
    expect(within(recentSheets).getByRole("link", { name: "Open estimates" })).toHaveAttribute(
      "href",
      "/workshop/projects/sample-modern-bungalow/estimates",
    );

    const publishedLink = screen.getByRole("region", { name: "Published link" });
    expect(within(publishedLink).getByText("Unpublished")).toBeInTheDocument();
    expect(within(publishedLink).getByText("Use Share in the header to publish or manage a client link.")).toBeInTheDocument();
    expect(within(publishedLink).queryByRole("button", { name: "Copy published client link" })).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: /data/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: /projects/i })).not.toBeInTheDocument();
  });
});
