import { fireEvent, render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import type { ProjectPublicationDashboardStatus } from "@/components/workshop/ProjectDashboardClient";
import type { ProjectActivityPage } from "@/lib/repositories/project-activity-repository";
import type { ProjectRecentEstimateSheetSummary } from "@/lib/repositories/project-estimate-sheets-repository";
import type { ProjectLocationSummary } from "@/lib/repositories/project-location-repository";
import type { Tables } from "@/lib/supabase/types";

vi.mock("@/lib/projects/actions", () => ({
  updateProjectDetails: vi.fn(async () => undefined),
}));

vi.mock("@/lib/projects/location-actions", () => ({
  saveProjectLocation: vi.fn(async () => ({ status: "success", message: "Project pin saved." })),
  clearProjectLocation: vi.fn(async () => ({ status: "success", message: "Project pin cleared." })),
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

const ACTIVITY_PAGE: ProjectActivityPage = {
  items: [
    {
      id: "activity-1",
      createdAt: "2026-06-19T08:00:00.000Z",
      actorLabel: "Philip Lewis",
      title: "Philip Lewis changed quantity for Porcelain tile.",
      summary: "Updated quantity.",
      targetLabel: "Porcelain tile",
      targetKind: "row",
      estimateId: "estimate-1",
      estimateName: "Shell Estimate",
      sheetCode: "EST-001",
      href: `/workshop/projects/${PROJECT_FIXTURE.id}/estimates`,
    },
    {
      id: "activity-2",
      createdAt: "2026-06-18T08:00:00.000Z",
      actorLabel: "Unknown user",
      title: "Activity recorded.",
      summary: null,
      targetLabel: "Item",
      targetKind: "sheet",
      estimateId: "estimate-deleted",
      estimateName: "Deleted estimate",
      sheetCode: null,
      href: `/workshop/projects/${PROJECT_FIXTURE.id}/estimates`,
    },
  ],
  nextCursor: { createdAt: "2026-06-18T08:00:00.000Z", id: "activity-2" },
};

const EMPTY_ACTIVITY_PAGE: ProjectActivityPage = {
  items: [],
  nextCursor: null,
};

const PROJECT_LOCATION: ProjectLocationSummary = {
  id: "location-1",
  projectId: PROJECT_FIXTURE.id,
  latitude: 14.599512,
  longitude: 120.984222,
  accuracyMeters: 8.25,
  source: "manual",
  displayLabel: "Site gate",
  addressText: PROJECT_FIXTURE.location,
  updatedAt: "2026-06-19T08:00:00.000Z",
};

describe("ProjectDashboardClient", () => {
  it("renders the Phase 1 command surface with real recent sheets and redacted publication status", async () => {
    const { ProjectDashboardClient } = await import("@/components/workshop/ProjectDashboardClient");
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
        activity={ACTIVITY_PAGE}
        projectLocation={PROJECT_LOCATION}
        canEditProject
      />,
    );

    expect(screen.getByLabelText("Lewis Residence project information")).toBeInTheDocument();
    expect(screen.getByRole("complementary", { name: "Project identity" })).toBeInTheDocument();
    expect(screen.getByDisplayValue("Lewis Residence")).toBeInTheDocument();
    expect(screen.getByDisplayValue("Lewis Family")).toBeInTheDocument();
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

    const estimateActivity = screen.getByRole("region", { name: "Estimate activity" });
    expect(within(estimateActivity).getByText("Philip Lewis changed quantity for Porcelain tile.")).toBeInTheDocument();
    expect(within(estimateActivity).getByText(/Shell Estimate/)).toBeInTheDocument();
    expect(within(estimateActivity).getByText(/Deleted estimate/)).toBeInTheDocument();
    expect(within(estimateActivity).getByText("Older activity is available from estimate history.")).toBeInTheDocument();
    expect(screen.queryByText(/rawSecret/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/correlation/i)).not.toBeInTheDocument();

    const location = screen.getByRole("region", { name: "Location" });
    expect(within(location).getByText("Exact pin saved at 14.599512, 120.984222.")).toBeInTheDocument();
    expect(within(location).getByText("Map provider disabled")).toBeInTheDocument();
    expect(within(location).getByText("Text coordinates remain available at 14.599512, 120.984222. Exact coordinates stay private to project editors.")).toBeInTheDocument();
    expect(within(location).queryByTestId("project-location-map")).not.toBeInTheDocument();
    expect(within(location).queryByRole("application", { name: /project map pin/i })).not.toBeInTheDocument();
    expect(within(location).getByDisplayValue("Site gate")).toBeInTheDocument();
    expect(within(location).getByDisplayValue("14.599512")).toBeInTheDocument();
    expect(within(location).getByDisplayValue("120.984222")).toBeInTheDocument();
    expect(within(location).getByDisplayValue("8.25")).toBeInTheDocument();
    expect(within(location).getByRole("button", { name: "Save pin" })).toBeInTheDocument();
    expect(within(location).getByRole("button", { name: "Clear pin" })).toBeInTheDocument();
  });

  it("keeps persisted read-only projects from rendering edit controls or exact coordinates", async () => {
    const { ProjectDashboardClient } = await import("@/components/workshop/ProjectDashboardClient");

    const { container } = render(
      <ProjectDashboardClient
        project={PROJECT_FIXTURE}
        fallback={FALLBACK}
        recentSheets={RECENT_SHEETS}
        publicationStatus={PUBLISHED_STATUS}
        activity={EMPTY_ACTIVITY_PAGE}
        projectLocation={PROJECT_LOCATION}
        canEditProject={false}
      />,
    );

    expect(container.querySelector("form")).not.toBeInTheDocument();
    expect(screen.getByDisplayValue("Lewis Residence")).toHaveAttribute("readonly");
    expect(screen.getByDisplayValue("Lewis Family")).toHaveAttribute("readonly");
    const location = screen.getByRole("region", { name: "Location" });
    expect(location).toHaveTextContent("No exact pin saved.");
    expect(location).not.toHaveTextContent("14.599512");
    expect(location).not.toHaveTextContent("120.984222");
    expect(within(location).queryByRole("button", { name: "Save pin" })).not.toBeInTheDocument();
    expect(within(location).queryByRole("button", { name: "Clear pin" })).not.toBeInTheDocument();
  });

  it("keeps sample projects honest with empty recent sheets and no publication shortcut", async () => {
    const { ProjectDashboardClient } = await import("@/components/workshop/ProjectDashboardClient");

    const { container } = render(
      <ProjectDashboardClient
        project={null}
        fallback={FALLBACK}
        recentSheets={[]}
        publicationStatus={UNPUBLISHED_STATUS}
        activity={EMPTY_ACTIVITY_PAGE}
        projectLocation={null}
        canEditProject={false}
      />,
    );

    expect(screen.getByLabelText("Modern Bungalow project information")).toBeInTheDocument();
    expect(container.querySelector("form")).not.toBeInTheDocument();
    expect(container.querySelector('input[name="projectId"]')).not.toBeInTheDocument();
    expect(screen.getByDisplayValue("Modern Bungalow")).toHaveAttribute("readonly");
    expect(screen.getByDisplayValue("Sample client")).toHaveAttribute("readonly");
    expect(screen.getByDisplayValue("Sample location")).toHaveAttribute("readonly");

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
    expect(screen.getByRole("region", { name: "Estimate activity" })).toHaveTextContent("No estimate activity yet.");
    expect(screen.getByRole("region", { name: "Location" })).toHaveTextContent("No exact pin saved.");
    expect(within(screen.getByRole("region", { name: "Location" })).queryByRole("button", { name: "Save pin" })).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: /data/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: /projects/i })).not.toBeInTheDocument();
  });
});
